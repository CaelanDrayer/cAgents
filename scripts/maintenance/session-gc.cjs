#!/usr/bin/env node
/**
 * scripts/maintenance/session-gc.cjs — Session garbage-collection sweep (REC-19, v12.52.0)
 *
 * Age-based sweep of cagents-memory/sessions/ that keeps the discovery cost of
 * SubagentStart/SessionStart bounded. Every hook that scans sessions/ pays
 * O(dirs); with 200+ terminal dirs lingering for months, that cost grows without
 * bound. This sweep archives old terminal sessions and eventually deletes the
 * archived ones — while NEVER touching a live or mid-flight session.
 *
 * Usage:
 *   node scripts/maintenance/session-gc.cjs [--archive-age 30] [--delete-age 120] [--dry-run] [--yes]
 *
 * Safety model:
 *   - --dry-run is the DEFAULT (prints the plan, writes nothing).
 *   - --yes is required to actually archive/delete. If both --dry-run and --yes
 *     are passed, --dry-run wins (safety-first).
 *   - Per-dir try/catch; a single bad dir never aborts the sweep. Idempotent.
 *
 * GC policy (conservative — archive, don't delete; protect live/recent/mid-flight):
 *   | Class      | Rule                                                                       | Action                       |
 *   |------------|----------------------------------------------------------------------------|------------------------------|
 *   | Protected  | LIVE, OR non-terminal, OR mtime < archive_age_days (default 30), OR fixture | keep in sessions/            |
 *   | Archive    | terminal AND NOT live AND mtime >= archive_age_days                         | mv -> _archive/sessions/     |
 *   | Delete     | in _archive/sessions/ AND mtime >= delete_age_days (default 120)            | rm -rf                       |
 *   | Always-skip| id matches /(^|[_-])(test|fixture)s?([_-]|$)/i                              | never auto-archived/deleted  |
 *
 * Terminal classification consumes the canonical Phase-1 (REC-01) vocabulary
 * from hook-utils.cjs — isTerminalState() / TERMINAL_STATES — so the GC and the
 * pipeline can never disagree on what "terminal" means. It is NOT re-spelled here.
 *
 * Liveness mirrors session-catchup.cjs isSessionLive() exactly (session.pid
 * kill -0, status.yaml mtime, last_updated_at heartbeat within
 * CAGENTS_SESSION_LIVENESS_MS, default 60s).
 *
 * Sandboxing: honors CAGENTS_TEST_ROOT so the vitest suite can drive the sweep
 * against a temp fixture tree without touching the real cagents-memory/.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Canonical terminal vocabulary + read helpers — consumed from hook-utils
// (REC-01/Phase-1). Hard require: this script's correctness depends on the
// single-source terminal enum, and hardcoding it here is explicitly forbidden.
// hook-utils.cjs is a pure utility module (no createHook/registration at load),
// so requiring it has no side effects.
const {
  isTerminalState,
  TERMINAL_STATES,
  safeRead,
  extractYamlValue,
} = require(path.join(__dirname, '..', '..', '.claude', 'hooks', 'hook-utils.cjs'));

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_ARCHIVE_AGE_DAYS = 30;
const DEFAULT_DELETE_AGE_DAYS = 120;

// Session directory prefixes this sweep considers (mirrors hook-utils.cjs
// SESSION_PREFIXES). `act_` is the go-forward /act prefix; `run_` is retained as a
// legacy reader so pre-v12.66 session dirs (which are NOT renamed on disk) stay
// sweepable. Omitting `act_` here would leak every new session past the GC forever.
const SESSION_PREFIXES = ['act_', 'run_', 'team_', 'designer_', 'org_', 'review_', 'optimize_'];

// Fixture/test session marker — identical to session-catchup.cjs FIXTURE_SESSION_RE.
// Matches a `test`/`fixture` token delimited by `_`/`-`/start/end but NOT an
// incidental substring inside a real slug (latest, contest, fastest).
const FIXTURE_SESSION_RE = /(^|[_-])(test|fixture)s?([_-]|$)/i;

/** Non-VALIDATED/complete result strings that still mean "session is over". */
const NON_ENUM_TERMINAL_RESULTS = new Set(['success', 'failed', 'partial']);

/**
 * Resolve the cagents-memory root, honoring CAGENTS_TEST_ROOT for sandboxed
 * tests. Production path is repo-root/cagents-memory; this file lives at
 * scripts/maintenance/session-gc.cjs, so repo-root = ../../
 */
function resolveMemoryRoot() {
  if (process.env.CAGENTS_TEST_ROOT) {
    return path.join(process.env.CAGENTS_TEST_ROOT, 'cagents-memory');
  }
  return path.join(__dirname, '..', '..', 'cagents-memory');
}

function getLivenessThresholdMs() {
  const v = parseInt(process.env.CAGENTS_SESSION_LIVENESS_MS || '60000', 10);
  return Number.isFinite(v) && v >= 0 ? v : 60000;
}

/**
 * A session is LIVE (and never GC'd) when ANY of:
 *   1. session.pid points to a still-running PID (kill -0)
 *   2. status.yaml mtime is within CAGENTS_SESSION_LIVENESS_MS
 *   3. last_updated_at heartbeat is within the threshold
 * Mirror of session-catchup.cjs isSessionLive() (kept in sync intentionally).
 */
function isSessionLive(sessionDir) {
  const threshold = getLivenessThresholdMs();
  const now = Date.now();

  // Check 1: session.pid -> kill -0.
  try {
    const pidPath = path.join(sessionDir, 'session.pid');
    if (fs.existsSync(pidPath)) {
      const pid = parseInt(fs.readFileSync(pidPath, 'utf8').trim(), 10);
      if (Number.isFinite(pid) && pid > 0) {
        try {
          process.kill(pid, 0);
          return true;
        } catch (e) {
          if (e.code === 'EPERM') return true; // process exists, foreign owner
          // ESRCH -> dead; fall through
        }
      }
    }
  } catch { /* fall through */ }

  // Check 2: status.yaml mtime within threshold.
  try {
    const statusFile = path.join(sessionDir, 'status.yaml');
    if (fs.existsSync(statusFile)) {
      if (now - fs.statSync(statusFile).mtimeMs < threshold) return true;
    }
  } catch { /* fall through */ }

  // Check 3: last_updated_at heartbeat within threshold.
  try {
    const statusContent = safeRead(path.join(sessionDir, 'status.yaml'));
    if (statusContent) {
      const heartbeat = extractYamlValue(statusContent, 'last_updated_at');
      if (heartbeat) {
        const parsed = Date.parse(heartbeat);
        if (!isNaN(parsed) && now - parsed < threshold) return true;
      }
    }
  } catch { /* fall through */ }

  return false;
}

function isFixtureSession(name) {
  return FIXTURE_SESSION_RE.test(name);
}

/**
 * Terminal iff any of status.yaml {pipeline_state, phase, status, result} or
 * execution_summary.yaml {final_state, status} resolves terminal. Uses the
 * canonical isTerminalState() for the enum vocabulary; adds the non-enum result
 * strings (success/failed/partial) that still mean the session is over.
 */
function isSessionTerminal(sessionDir) {
  const status = safeRead(path.join(sessionDir, 'status.yaml'));
  if (status) {
    for (const key of ['pipeline_state', 'phase', 'status']) {
      const v = extractYamlValue(status, key);
      if (v && isTerminalState(v)) return true;
    }
    const result = extractYamlValue(status, 'result');
    if (result) {
      if (isTerminalState(result)) return true;
      if (NON_ENUM_TERMINAL_RESULTS.has(String(result).trim().toLowerCase())) return true;
    }
  }

  const summary = safeRead(path.join(sessionDir, 'workflow', 'execution_summary.yaml'));
  if (summary) {
    for (const key of ['final_state', 'status']) {
      const v = extractYamlValue(summary, key);
      if (v && isTerminalState(v)) return true;
    }
  }

  return false;
}

/**
 * Classify a candidate in sessions/ for the ARCHIVE phase.
 * @returns 'skip-fixture' | 'skip-live' | 'skip-error' | 'skip-recent' | 'skip-nonterminal' | 'archive'
 */
function classifyForArchive(sessionDir, name, { archiveAgeMs, now }) {
  if (isFixtureSession(name)) return 'skip-fixture';
  if (isSessionLive(sessionDir)) return 'skip-live';
  let mtime;
  try { mtime = fs.statSync(sessionDir).mtimeMs; } catch { return 'skip-error'; }
  if (now - mtime < archiveAgeMs) return 'skip-recent';
  if (!isSessionTerminal(sessionDir)) return 'skip-nonterminal';
  return 'archive';
}

/**
 * Classify a candidate in _archive/sessions/ for the DELETE phase.
 * @returns 'skip-fixture' | 'skip-live' | 'skip-error' | 'skip-recent' | 'delete'
 */
function classifyForDelete(dir, name, { deleteAgeMs, now }) {
  if (isFixtureSession(name)) return 'skip-fixture';
  if (isSessionLive(dir)) return 'skip-live'; // paranoia — archived should not be live
  let mtime;
  try { mtime = fs.statSync(dir).mtimeMs; } catch { return 'skip-error'; }
  if (now - mtime < deleteAgeMs) return 'skip-recent';
  return 'delete';
}

function listSessionDirs(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((n) => SESSION_PREFIXES.some((p) => n.startsWith(p)));
}

/**
 * Run the GC sweep. Pure/idempotent; returns a plan+result object. Writes
 * nothing when dryRun is true.
 *
 * @param {object} opts
 * @param {string} [opts.memoryRoot]      cagents-memory root (defaults to resolveMemoryRoot()).
 * @param {number} [opts.archiveAgeDays]  default 30.
 * @param {number} [opts.deleteAgeDays]   default 120.
 * @param {boolean} [opts.dryRun]         default true.
 * @param {number} [opts.now]             override "now" for tests.
 */
function runGc(opts = {}) {
  const memoryRoot = opts.memoryRoot || resolveMemoryRoot();
  const archiveAgeDays = Number.isFinite(opts.archiveAgeDays) ? opts.archiveAgeDays : DEFAULT_ARCHIVE_AGE_DAYS;
  const deleteAgeDays = Number.isFinite(opts.deleteAgeDays) ? opts.deleteAgeDays : DEFAULT_DELETE_AGE_DAYS;
  const dryRun = opts.dryRun !== false; // default-on
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();

  const archiveAgeMs = archiveAgeDays * DAY_MS;
  const deleteAgeMs = deleteAgeDays * DAY_MS;

  const sessionsDir = path.join(memoryRoot, 'sessions');
  const archiveDir = path.join(memoryRoot, '_archive', 'sessions');

  const result = {
    dryRun,
    archiveAgeDays,
    deleteAgeDays,
    memoryRoot,
    archived: [],
    deleted: [],
    skipped: { live: [], recent: [], nonterminal: [], fixture: [], error: [] },
  };

  const skipBucket = (cls) => ({
    'skip-live': result.skipped.live,
    'skip-recent': result.skipped.recent,
    'skip-nonterminal': result.skipped.nonterminal,
    'skip-fixture': result.skipped.fixture,
    'skip-error': result.skipped.error,
  }[cls]);

  // --- ARCHIVE phase: sessions/ -> _archive/sessions/ ---
  for (const name of listSessionDirs(sessionsDir)) {
    const src = path.join(sessionsDir, name);
    let cls;
    try {
      cls = classifyForArchive(src, name, { archiveAgeMs, now });
    } catch { cls = 'skip-error'; }
    if (cls === 'archive') {
      const dst = path.join(archiveDir, name);
      if (dryRun) {
        result.archived.push(name);
      } else {
        try {
          fs.mkdirSync(archiveDir, { recursive: true });
          // If a same-name dir already sits in archive, disambiguate rather than clobber.
          let finalDst = dst;
          if (fs.existsSync(finalDst)) finalDst = `${dst}__gc-${now}`;
          fs.renameSync(src, finalDst);
          result.archived.push(name);
        } catch (e) {
          result.skipped.error.push(name);
          console.error(`[session-gc] archive failed for ${name}: ${e.message}`);
        }
      }
    } else {
      const b = skipBucket(cls);
      if (b) b.push(name);
    }
  }

  // --- DELETE phase: _archive/sessions/ (>= delete age) ---
  for (const name of listSessionDirs(archiveDir)) {
    const dir = path.join(archiveDir, name);
    let cls;
    try {
      cls = classifyForDelete(dir, name, { deleteAgeMs, now });
    } catch { cls = 'skip-error'; }
    if (cls === 'delete') {
      if (dryRun) {
        result.deleted.push(name);
      } else {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
          result.deleted.push(name);
        } catch (e) {
          result.skipped.error.push(name);
          console.error(`[session-gc] delete failed for ${name}: ${e.message}`);
        }
      }
    } else {
      const b = skipBucket(cls);
      if (b) b.push(name);
    }
  }

  return result;
}

function parseArgs(argv) {
  const args = { dryRun: true, yes: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--no-dry-run') args.dryRun = false;
    else if (a === '--yes') args.yes = true;
    else if (a === '--archive-age') args.archiveAgeDays = parseInt(argv[++i], 10);
    else if (a === '--delete-age') args.deleteAgeDays = parseInt(argv[++i], 10);
    else if (a.startsWith('--archive-age=')) args.archiveAgeDays = parseInt(a.split('=')[1], 10);
    else if (a.startsWith('--delete-age=')) args.deleteAgeDays = parseInt(a.split('=')[1], 10);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  // --dry-run wins over --yes (safety-first). Act only when --yes AND not --dry-run.
  const explicitDryRun = process.argv.slice(2).includes('--dry-run');
  const dryRun = explicitDryRun ? true : !args.yes;

  const result = runGc({
    archiveAgeDays: args.archiveAgeDays,
    deleteAgeDays: args.deleteAgeDays,
    dryRun,
  });

  const mode = result.dryRun ? 'DRY-RUN (no changes; pass --yes to act)' : 'APPLIED';
  console.log(`[session-gc] ${mode} | archive-age=${result.archiveAgeDays}d delete-age=${result.deleteAgeDays}d`);
  console.log(`[session-gc]   archive: ${result.archived.length} | delete: ${result.deleted.length} | ` +
    `skip(live=${result.skipped.live.length}, recent=${result.skipped.recent.length}, ` +
    `nonterminal=${result.skipped.nonterminal.length}, fixture=${result.skipped.fixture.length}, ` +
    `error=${result.skipped.error.length})`);
  if (result.archived.length) console.log(`[session-gc]   archived: ${result.archived.join(', ')}`);
  if (result.deleted.length) console.log(`[session-gc]   deleted: ${result.deleted.join(', ')}`);
  return 0;
}

// Run the CLI only when invoked directly; export the internals for testing.
if (require.main === module) {
  try {
    process.exit(main());
  } catch (e) {
    console.error(`[session-gc] fatal: ${e && e.message}`);
    process.exit(1);
  }
}

module.exports = {
  runGc,
  classifyForArchive,
  classifyForDelete,
  isSessionLive,
  isSessionTerminal,
  isFixtureSession,
  resolveMemoryRoot,
  parseArgs,
  SESSION_PREFIXES,
  FIXTURE_SESSION_RE,
  DEFAULT_ARCHIVE_AGE_DAYS,
  DEFAULT_DELETE_AGE_DAYS,
  // Re-exported so tests can assert the script consumes the canonical enum.
  TERMINAL_STATES,
  isTerminalState,
};
