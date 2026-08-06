#!/usr/bin/env node
/**
 * Shared Hook Utilities - Common functions for cAgents hooks
 * cAgents V9.13 - Self-contained plugin via __dirname + ${CLAUDE_PLUGIN_ROOT}
 *
 * Provides:
 * - createHook(handler) - Factory that eliminates per-hook boilerplate
 * - readStdin() - Parse JSON from stdin
 * - findActiveSession(sessionHintOrOptions?) - Resolve the active session via the
 *   deterministic chain: sessionHint -> persisted SDK-UUID map -> CAGENTS_ACTIVE_SESSION
 *   -> promptHint -> null. The legacy newest-session heuristic is opt-in only
 *   ({fallbackHeuristic: true}); see the findActiveSession JSDoc below.
 * - extractYamlValue() - Extract a value from simple YAML content
 * - safeRead() - Read a file with graceful fallback
 * - countPattern() - Count regex matches in content
 *
 * 100% Self-Contained: Uses only built-in Node.js modules.
 *
 * Path Resolution:
 * - PLUGIN_ROOT: Where cAgents is installed. Uses __dirname resolution as primary
 *   (verified via CLAUDE.md existence), CLAUDE_PLUGIN_ROOT as fallback, cwd as last resort.
 * - PROJECT_ROOT: Where the user's project lives (where cagents-memory/ is created).
 *   Uses CLAUDE_PROJECT_DIR when running as a cross-project plugin, falls back to
 *   PLUGIN_ROOT for local dev (plugin IS the project).
 */

const fs = require('fs');
const path = require('path');

// Resolve plugin root: where cAgents is installed (for finding plugin resources).
// __dirname is .claude/hooks/ -- two levels up is the plugin root.
// Verify each candidate actually contains CLAUDE.md (proving it's the cAgents root).
const _dirnameRoot = path.resolve(__dirname, '../..');
const _envRoot = process.env.CLAUDE_PLUGIN_ROOT || '';
const PLUGIN_ROOT = (fs.existsSync(path.join(_dirnameRoot, 'CLAUDE.md')) && _dirnameRoot)
  || (_envRoot && fs.existsSync(path.join(_envRoot, 'CLAUDE.md')) && _envRoot)
  || process.cwd();

// Resolve project root: the user's project directory (where cagents-memory/ lives).
// When loaded as a cross-project plugin, CLAUDE_PROJECT_DIR points to the user's project.
// When running locally (plugin IS the project), fall back to PLUGIN_ROOT.
const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR
  || PLUGIN_ROOT;

const AGENT_MEMORY_DIR = path.join(PROJECT_ROOT, 'cagents-memory');

const SESSION_PREFIXES = ['run_', 'optimize_', 'review_', 'designer_', 'team_', 'org_'];

// Canonical terminal pipeline/phase vocabulary (single source of truth, REC-01).
// TERMINAL_STATES holds ONLY canonical forms. Raw variants seen in the wild
// (older status.yaml writes, uppercase, FINALIZED, `completed` with a trailing
// 'd') resolve to a canonical form via TERMINAL_ALIASES + normalizeTerminalState().
// Readers MUST test membership through isTerminalState(), never
// `TERMINAL_STATES.includes(rawValue)` directly, so legacy on-disk values keep
// resolving. `TEAM_CREATED` is deliberately NOT terminal (a bare TEAM_CREATED is
// a stall, not a completion).
const TERMINAL_STATES = ['VALIDATED', 'complete', 'failed', 'aborted', 'incomplete'];

// Raw -> canonical aliases. Exact (case-sensitive) matches are tried first;
// normalizeTerminalState() additionally does a case-insensitive pass so arbitrary
// casing (e.g. `Completed`, `finalized`) also folds. `completed` is the
// historically-most-common status.yaml value and MUST keep resolving terminal.
const TERMINAL_ALIASES = {
  completed: 'complete',
  COMPLETE: 'complete',
  FINALIZED: 'complete',
};

/**
 * Fold a raw pipeline_state/phase value to its canonical terminal form.
 * Non-terminal / transient values (INIT, TEAM_CREATED, validating, …) and
 * non-strings are returned effectively unchanged (trimmed if a string), so
 * isTerminalState() reports them as non-terminal.
 */
function normalizeTerminalState(s) {
  if (typeof s !== 'string') return s;
  const trimmed = s.trim();
  if (!trimmed) return trimmed;
  // 1. Exact alias (fast path for the known raw variants).
  if (Object.prototype.hasOwnProperty.call(TERMINAL_ALIASES, trimmed)) {
    return TERMINAL_ALIASES[trimmed];
  }
  const lower = trimmed.toLowerCase();
  // 2. Case-insensitive match against a canonical terminal state.
  for (const canon of TERMINAL_STATES) {
    if (canon.toLowerCase() === lower) return canon;
  }
  // 3. Case-insensitive alias match (e.g. `Completed`, `finalized`).
  for (const raw in TERMINAL_ALIASES) {
    if (raw.toLowerCase() === lower) return TERMINAL_ALIASES[raw];
  }
  // 4. No mapping — transient / unknown. Return the trimmed original.
  return trimmed;
}

/**
 * True iff the (normalized) value is a canonical terminal state.
 * isTerminalState('completed') === true (alias), ('FINALIZED') === true,
 * ('TEAM_CREATED') === false, ('INIT') === false, (null) === false.
 */
function isTerminalState(s) {
  return TERMINAL_STATES.includes(normalizeTerminalState(s));
}

// SUCCESS terminal states (post-normalize): the subset of TERMINAL_STATES that
// represent a genuinely SUCCESSFUL completion. `VALIDATED` and `complete` (plus
// the aliases completed/COMPLETE/FINALIZED, which normalize to `complete`) are
// success terminals; `failed` / `aborted` / `incomplete` are terminal-but-NOT
// -success. Used by the REC-02/03/06 honesty discriminator so a stall relabelled
// `incomplete` (a terminal state) is never mistaken for a success.
const SUCCESS_TERMINAL_STATES = ['VALIDATED', 'complete'];

/**
 * True iff the (normalized) value is a SUCCESS terminal state
 * (VALIDATED / complete / completed / COMPLETE / FINALIZED). Returns false for
 * failed / aborted / incomplete and for every non-terminal / unknown / null value.
 */
function isSuccessTerminalState(s) {
  return SUCCESS_TERMINAL_STATES.includes(normalizeTerminalState(s));
}

// Grace period for accepting sessions without status.yaml (handles the race condition where
// the trigger agent hasn't written status.yaml yet). 5 minutes covers typical pipeline init time.
// Design intent: long enough to bridge session dir creation → first status write gap,
// short enough not to surface truly abandoned sessions as "active".
const SESSION_DISCOVERY_GRACE_PERIOD_MS = 5 * 60 * 1000;

// Character budgets for context injection (v10.6.0)
// These constants prevent hooks from injecting unbounded context into the model's window.
const MAX_SESSION_START_CHARS = 1500;  // Max chars for SessionStart additionalContext
const MAX_ATTENTION_CHARS = 500;       // Max chars for attention-injection systemMessage

// Fallback deadline for readStdin() when stdin never emits 'end'.
//
// INVARIANT: this MUST stay strictly below the SMALLEST `timeout` (in seconds)
// registered for any hook in `.claude/settings.json`, with enough margin for
// node cold start + the handler's own work. Pinned by
// `tests/hooks/stdin-fallback-below-hook-timeout.test.js`.
//
// BUG (fixed here): this was 3000 ms while `PreToolUse[Agent]` and
// `UserPromptSubmit` are both registered with `timeout: 3` (= 3000 ms). Equal
// deadlines are a guaranteed race, and the harness won it: over a 14-day
// transcript window, 68 `PreToolUse:Agent` and 13 `UserPromptSubmit` runs were
// cancelled at 3010-3063 ms, so those hooks produced NO verdict at all. The
// bimodal signature was unmistakable — 369 `PreToolUse:Write|Edit` runs under
// 500 ms and 36 at >=3 s, with nothing in between.
//
// Dropping to 2000 ms lets the slow path finish and emit its verdict inside
// every registered budget. It is not a semantic change: a timed-out stdin read
// resolves to `{}`, and every dispatcher returns `{"continue": true}` for an
// empty payload — the same effective outcome as being cancelled, but delivered
// cleanly and ~1 s sooner.
const STDIN_FALLBACK_MS = 2000;

/**
 * Read JSON from stdin with timeout.
 * Returns parsed object or {} on any failure.
 */
function readStdin(hookName) {
  return new Promise((resolve) => {
    let data = '';
    let resolved = false;
    process.stdin.setEncoding('utf8');

    if (process.stdin.isTTY) {
      resolve({});
      return;
    }

    function done(result) {
      if (resolved) return;
      resolved = true;
      resolve(result);
    }

    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try { done(data ? JSON.parse(data) : {}); }
      catch { done({}); }
    });
    process.stdin.on('error', () => done({}));

    // Safety-only fallback timer. .unref() so it does NOT keep the Node event
    // loop alive: once stdin ends normally and the hook's work completes, the
    // process must exit immediately instead of lingering for this timer.
    // If stdin never ends, the open stdin stream keeps the loop alive and this
    // timer still fires — correctness is preserved, keep-alive is dropped.
    // See STDIN_FALLBACK_MS above for why this must stay under every registered
    // hook `timeout` in .claude/settings.json.
    const stdinFallbackTimer = setTimeout(() => {
      if (!resolved) console.error(hookName ? `[Hook] stdin reading timed out for hook: ${hookName}` : `[hook-utils] readStdin timeout after ${STDIN_FALLBACK_MS}ms`);
      done({});
    }, STDIN_FALLBACK_MS);
    stdinFallbackTimer.unref();
  });
}

/**
 * Read a file safely, returning null on any error.
 */
function safeRead(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  } catch {
    return null;
  }
}

/**
 * Extract a simple key: value from YAML content.
 */
function extractYamlValue(content, key) {
  if (!content) return null; // WI-8: callers pass safeRead() output, which is null when the file is absent
  const regex = new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?`, 'm');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Count regex pattern matches in content.
 */
function countPattern(content, pattern) {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * REC-02/03/06 (v12.47.0) — the honesty discriminator.
 *
 * True ONLY when a session is GENUINELY validated, as opposed to a stall that a
 * Stop/SessionEnd safety net laundered into `complete`/`PASS`/`completed`. This
 * is the single source of truth consumed by BOTH verify-completion.cjs (Stop) and
 * team-stop.cjs (SessionEnd), so the two hooks can never drift apart.
 *
 * ALL THREE conditions must hold:
 *   (1) the resolved pipeline_state/phase is a SUCCESS terminal
 *       (VALIDATED / complete / completed / FINALIZED) — never failed / aborted /
 *       incomplete / any non-terminal state; AND
 *   (2) a REAL validation_report.yaml exists with a PASS / PARTIAL_PASS
 *       classification that was NOT written by a hook safety net. The stub writer
 *       (autoResolveWarnings) always stamps
 *       `generated_by: verify-completion-hook-safety-net`, so any report whose
 *       `generated_by` names a hook/safety-net stub is rejected. A MISSING report
 *       is rejected too (no verdict ⇒ not genuine); AND
 *   (3) for plan-bearing sessions (workflow/plan.yaml exists), a
 *       coordination_log.yaml with a `completed`/terminal status exists. Sessions
 *       with no plan.yaml skip this requirement.
 *
 * On ANY read/parse error this returns false — fail toward "not genuine", the
 * safe direction (a broken discriminator never launders a stall into a success).
 *
 * Provenance note: the hook-fabricated PASS stub is the ONLY code path that emits
 * a PASS report without a validator agent, and it always carries the safety-net
 * marker, so rejecting that marker reliably separates fabricated from genuine. A
 * genuine validator report carries a real `generated_by` (e.g. `cagents:validator`)
 * OR — for legacy/older reports — no marker at all; a marker-less non-stub PASS is
 * therefore accepted, preserving the pre-existing clean-session contract (a real
 * verdict that simply omits a provenance line).
 *
 * @param {string} sessionDir - absolute session directory path
 * @param {string|null} [statusContent] - status.yaml content, if already read
 * @returns {boolean}
 */
function sessionGenuinelyValidated(sessionDir, statusContent) {
  try {
    if (!sessionDir) return false;
    let status = statusContent;
    if (!status) status = safeRead(path.join(sessionDir, 'status.yaml'));
    if (!status) return false;

    // (1) SUCCESS terminal (VALIDATED / complete / …) — never a stall label.
    const state = extractYamlValue(status, 'pipeline_state')
      || extractYamlValue(status, 'phase')
      || extractYamlValue(status, 'current_phase');
    if (!isSuccessTerminalState(state)) return false;

    // (2) A REAL, non-safety-net PASS/PARTIAL_PASS validation_report.
    const valRaw = safeRead(path.join(sessionDir, 'workflow', 'validation_report.yaml'));
    if (!valRaw) return false; // no validator verdict ⇒ not genuine
    const generatedBy = (extractYamlValue(valRaw, 'generated_by') || '').toLowerCase();
    if (generatedBy.includes('safety-net') || generatedBy.includes('verify-completion-hook')) {
      return false; // hook-fabricated stub ⇒ not genuine
    }
    const classification = extractYamlValue(valRaw, 'classification')
      || extractYamlValue(valRaw, 'overall_status')
      || extractYamlValue(valRaw, 'status');
    if (classification !== 'PASS' && classification !== 'PARTIAL_PASS') return false;

    // (3) Plan-bearing sessions require a SUCCESSFULLY-completed coordination_log.
    // The coordination_log must have reached success (`completed`, or a
    // success-terminal per the enum) — a `failed`/`aborted` coordination_log is
    // terminal but NOT a success and must not count toward "genuinely validated"
    // (honesty precision; `isSuccessTerminalState('completed') === true` via the
    // `completed → complete` alias, so it covers the canonical value).
    const hasPlan = fs.existsSync(path.join(sessionDir, 'workflow', 'plan.yaml'));
    if (hasPlan) {
      const coordRaw = safeRead(path.join(sessionDir, 'workflow', 'coordination_log.yaml'));
      if (!coordRaw) return false;
      const coordStatus = extractYamlValue(coordRaw, 'status');
      if (!coordStatus) return false;
      if (!isSuccessTerminalState(coordStatus)) return false;
    }

    return true;
  } catch {
    return false; // fail toward "not genuine"
  }
}

/**
 * Find the active cAgents session directory.
 *
 * v12.15.0 — Deterministic resolution chain (concurrency contract):
 *   1. `input.session_id` (passed as `sessionHint` — string or `options.sessionHint`)
 *   2. `process.env.CAGENTS_ACTIVE_SESSION`
 *   3. `options.promptHint` (string extracted from prompt text by callers like
 *      subagent-tracker.cjs Pass-3)
 *   4. `null`
 *
 * Each candidate is accepted only if:
 *   - The session directory exists, AND
 *   - Its status.yaml (or session.yaml fallback) is missing (race window) OR
 *     in a non-terminal phase.
 *
 * The legacy newest-first status pass + 5-minute grace pass + nested-org
 * subdir scan are gated behind `{fallbackHeuristic: true}` for the
 * single-session diagnostic case. This eliminates cross-session resolution
 * under two concurrent same-directory sessions (hazards H1, H2, H3, H6 per
 * session run_concurrent-session-hooks_260602_001 enriched_context.yaml).
 *
 * Cache: `_cachedActiveSessions` is a Map keyed by the stable composite key
 * `sessionHint|envSession|promptHint|fallback`. Distinct inputs do NOT share
 * cache entries (H6 fix).
 *
 * @param {string|object} [hintOrOptions] - Either a session-hint string (legacy
 *   shape, kept for back-compat with v12.14.0 callers) or an options object.
 * @param {string} [hintOrOptions.sessionHint] - Same as the string-shape arg.
 * @param {string} [hintOrOptions.promptHint] - Hint extracted from prompt
 *   text by subagent-tracker Pass-3. Consumed AFTER env var.
 * @param {boolean} [hintOrOptions.fallbackHeuristic] - When true, restores
 *   the pre-v12.15.0 status-newest-first + grace + nested-org behavior.
 *   ONLY for single-session diagnostic tooling.
 * @returns {string|null} Absolute path to session directory, or null.
 */
let _cachedActiveSessions = new Map();

function _makeCacheKey(sessionHint, envSession, promptHint, fallback) {
  return `${sessionHint || ''}|${envSession || ''}|${promptHint || ''}|${fallback ? '1' : '0'}`;
}

/**
 * cAgents session ID format:
 *   `{command}_{slug}_{timestamp_suffix}` where command is one of
 *   run|team|designer|review|optimize|debug|org and the trailing segments
 *   carry a timestamp / counter. Canonical production form is
 *   `{command}_{slug}_{YYMMDD}_{NNN}` (e.g. `run_fix-auth_260317_001`); test
 *   fixtures often use a shorter base36 timestamp tail (e.g.
 *   `run_findactivesession-a_mpx7w1mu`). Both are valid cAgents shapes.
 *
 * Claude Code SDK transcript UUIDs (`8-4-4-4-12` lowercase hex, e.g.
 * `28d9d944-e2f5-4e03-b06b-d367625f1fdd`) arrive in hook payloads as
 * `input.session_id` but are NOT cAgents session directory names. When such
 * a hint is supplied to `findActiveSession`, chain step 1 must skip the
 * candidate-resolution attempt (it would always fail) and fall through to
 * step 2 (env-var) / step 3 (promptHint) / step 4 (null).
 *
 * Detection strategy: positively identify the SDK UUID shape and exclude it.
 * Everything else is treated as potentially-cAgents-shaped — even if the dir
 * does not exist on disk, the cross-write invariant is preserved by the
 * `_tryResolveCandidate` check that follows (the dir-exists + non-terminal
 * gate). The H1 fix is narrowly scoped: only UUID-shaped hints bypass step 1.
 *
 * Per H1 (session run_sessions-hung-single-dir_260602_001).
 */
const SDK_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function _isSdkUuidShape(s) {
  return typeof s === 'string' && SDK_UUID_RE.test(s);
}

function _tryResolveCandidate(sessionsDir, candidate) {
  // Returns the session dir if candidate exists with non-terminal status, else null.
  const dir = path.join(sessionsDir, candidate);
  if (!fs.existsSync(dir)) return null;
  const statusFile = path.join(dir, 'status.yaml');
  const content = safeRead(statusFile) || safeRead(path.join(dir, 'session.yaml'));
  if (!content) {
    // Race window: dir exists but no status yet — trust the explicit hint.
    return dir;
  }
  const phase = extractYamlValue(content, 'pipeline_state')
    || extractYamlValue(content, 'phase')
    || extractYamlValue(content, 'current_phase');
  if (phase && isTerminalState(phase)) {
    return null; // Terminal — refuse to resolve.
  }
  return dir;
}

// ============================================================
// SDK-UUID -> cAgents-session persisted map (OBJ-1, WI-1)
// ============================================================
// Claude Code hook payloads carry an SDK transcript UUID in `input.session_id`,
// NOT a cAgents session directory name. To resolve a UUID deterministically to
// its owning cAgents session (instead of the fragile CAGENTS_ACTIVE_SESSION env
// var or a newest-active heuristic) we persist a reverse map:
//
//   (a) per-session marker  sessions/{id}/session.sdk_id  = the SDK UUID
//       (local ownership, self-cleaning — dies with the session dir).
//   (b) global reverse registry as a DIRECTORY OF POINTER FILES
//       _system/sdk_session_map/{sdk_uuid}  whose content is the owning
//       session_id (the session dir basename).
//
// Per-UUID atomic files give O(1) reverse lookup AND per-UUID lock isolation:
// distinct concurrent sessions never contend on a shared read-modify-write —
// the whole point of OBJ-1. A single shared YAML was rejected because concurrent
// upserts would serialize on one lock and risk the cross-session write hazard
// this map exists to eliminate. GC is a trivial per-file unlink.

function _sdkMapDir() {
  return path.join(AGENT_MEMORY_DIR, '_system', 'sdk_session_map');
}

function _sdkPointerPath(uuid) {
  return path.join(_sdkMapDir(), uuid);
}

/**
 * Opportunistic prune (WI-5 part 3): unlink any pointer whose target session no
 * longer exists or is terminal. Reuses `_tryResolveCandidate` (dir-exists +
 * non-terminal gate). Best-effort — every unlink is lock-protected and the whole
 * scan is caller-wrapped so it can NEVER throw out of upsert (fail-open).
 */
function _pruneSdkMap() {
  const dir = _sdkMapDir();
  if (!fs.existsSync(dir)) return;
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  let entries;
  try { entries = fs.readdirSync(dir); } catch { return; }
  for (const uuid of entries) {
    // Only real pointer files match the UUID shape (skips stray *.lock dirs).
    if (!_isSdkUuidShape(uuid)) continue;
    const pointerPath = _sdkPointerPath(uuid);
    const target = safeRead(pointerPath);
    if (!target) continue;
    const sessionId = target.trim();
    if (sessionId && _tryResolveCandidate(sessionsDir, sessionId)) continue; // still live (present + non-terminal)
    // ponytail (WI-2, session run_session-init-gate-flake_260723_001): ALSO keep a
    // present-but-terminal pointer. A concurrent session's upsert-time prune must not
    // reap a sibling that is momentarily terminal-but-PRESENT (revision-cycle /
    // mid-rewrite window) — that is the same destructive reap that causes the
    // session-init-gate false-DENY (WI-1). Prune ONLY genuinely-MISSING-dir pointers.
    if (sessionId && fs.existsSync(path.join(sessionsDir, sessionId))) continue; // present-but-terminal — preserve
    // Genuinely-dead (missing-dir) pointer — unlink under lock.
    try {
      withFileLock(pointerPath, () => {
        try { fs.unlinkSync(pointerPath); } catch { /* already gone */ }
      });
    } catch { /* best effort */ }
  }
}

/**
 * Persist a bidirectional SDK-UUID <-> session mapping. Writes both the global
 * pointer file and the per-session marker under per-file locks. Guarded by the
 * SDK-UUID shape (a non-UUID sdkUuid is a no-op) and idempotent (repeat upsert
 * of the same pair overwrites — never duplicates). Fail-open: a map-write
 * failure must NEVER throw to the caller (WI-3 hook writers stay non-blocking).
 *
 * @param {string} sdkUuid   - SDK transcript UUID (input.session_id).
 * @param {string} sessionDir - Absolute path to the owning cAgents session dir.
 */
function upsertSdkSessionMap(sdkUuid, sessionDir) {
  try {
    if (!_isSdkUuidShape(sdkUuid)) return; // guard: non-UUID → no-op
    if (!sessionDir) return;
    const sessionId = path.basename(sessionDir);

    const mapDir = _sdkMapDir();
    try { fs.mkdirSync(mapDir, { recursive: true }); } catch { /* race-safe */ }

    // (b) global reverse pointer.
    const pointerPath = _sdkPointerPath(sdkUuid);
    withFileLock(pointerPath, () => {
      fs.writeFileSync(pointerPath, sessionId);
    });

    // (a) per-session marker.
    const markerPath = path.join(sessionDir, 'session.sdk_id');
    withFileLock(markerPath, () => {
      fs.writeFileSync(markerPath, sdkUuid);
    });

    // (WI-5 part 3) opportunistic prune — bound the registry to live + recent.
    try { _pruneSdkMap(); } catch { /* fail-open */ }
  } catch (err) {
    // Fail-open (WI-3): never throw a map-write failure back to the spawn path.
    console.error(`[upsertSdkSessionMap] non-fatal: ${err && err.message}`);
  }
}

/**
 * Resolve an SDK UUID to its owning cAgents session dir via the persisted map.
 * Returns the session dir for a live/non-terminal target, or null on a miss
 * (no pointer) OR a dead target. LAZY REAP (WI-5 part 1; narrowed WI-2,
 * run_session-init-gate-flake_260723_001): a terminal target still resolves to a
 * MISS (null) so a reused/dead UUID never mis-resolves — but the pointer is only
 * unlinked when the target session DIRECTORY is genuinely MISSING from disk. A
 * present-but-terminal target (transient revision-cycle / mid-rewrite window) keeps
 * its LIVE pointer so the deterministic map survives the transient terminal read.
 *
 * @param {string} sdkUuid - SDK transcript UUID.
 * @returns {string|null} Owning session dir, or null.
 */
function resolveSdkUuidToSession(sdkUuid) {
  if (!_isSdkUuidShape(sdkUuid)) return null; // guard
  const pointerPath = _sdkPointerPath(sdkUuid);
  const content = safeRead(pointerPath);
  if (!content) return null; // miss — no pointer
  const sessionId = content.trim();
  if (!sessionId) return null;
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  const dir = _tryResolveCandidate(sessionsDir, sessionId);
  if (dir) return dir; // live / non-terminal hit
  // Resolution GATE unchanged: a terminal target still returns a MISS (null) below,
  // so a reused/dead UUID can never mis-resolve to a stale session.
  //
  // ponytail (WI-2, session run_session-init-gate-flake_260723_001): LAZY REAP only
  // a pointer whose target session DIRECTORY is genuinely MISSING from disk — NOT one
  // that is merely present-but-terminal. A TRANSIENT terminal read (a revision-cycle
  // VALIDATED/failed window, or a mid-rewrite status.yaml) must NOT destroy the LIVE
  // pointer: doing so collapses the session off the deterministic v12.32.0 SDK-UUID
  // map onto the unreliable env-var + legacy-heuristic path and produces the
  // intermittent session-init-gate false-DENY (WI-1). Present-but-terminal => preserve
  // the pointer + return a miss; missing-dir => reap (GC / bounded-registry invariant).
  if (!fs.existsSync(path.join(sessionsDir, sessionId))) {
    try {
      withFileLock(pointerPath, () => {
        try { fs.unlinkSync(pointerPath); } catch { /* already gone */ }
      });
    } catch { /* fail-open */ }
  }
  return null;
}

/**
 * Remove the pointer for an SDK UUID (WI-5 part 2 — explicit unlink at session
 * finalization callers such as team-stop / verify-completion terminal finalize).
 * Guarded by the SDK-UUID shape, idempotent (missing pointer → no-op), and never
 * throws.
 *
 * @param {string} sdkUuid - SDK transcript UUID whose pointer to remove.
 */
function removeSdkPointer(sdkUuid) {
  try {
    if (!_isSdkUuidShape(sdkUuid)) return; // guard
    const pointerPath = _sdkPointerPath(sdkUuid);
    if (!fs.existsSync(pointerPath)) return; // idempotent no-op
    withFileLock(pointerPath, () => {
      try { fs.unlinkSync(pointerPath); } catch { /* already gone */ }
    });
  } catch { /* never throw */ }
}

function findActiveSession(hintOrOptions) {
  // Normalize args: accept legacy string OR options object.
  let sessionHint;
  let promptHint;
  let fallbackHeuristic = false;
  if (typeof hintOrOptions === 'string') {
    sessionHint = hintOrOptions;
  } else if (hintOrOptions && typeof hintOrOptions === 'object') {
    sessionHint = hintOrOptions.sessionHint;
    promptHint = hintOrOptions.promptHint;
    fallbackHeuristic = !!hintOrOptions.fallbackHeuristic;
  }
  const envSession = process.env.CAGENTS_ACTIVE_SESSION || undefined;
  const cacheKey = _makeCacheKey(sessionHint, envSession, promptHint, fallbackHeuristic);
  if (_cachedActiveSessions.has(cacheKey)) return _cachedActiveSessions.get(cacheKey);

  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    _cachedActiveSessions.set(cacheKey, null);
    return null;
  }

  // Deterministic chain step 1: explicit sessionHint (from input.session_id).
  //
  // H1 fix (v12.16.0): Claude Code's `input.session_id` carries SDK transcript
  // UUIDs (8-4-4-4-12 hex), NOT cAgents session directory names. When the
  // hint matches the SDK UUID shape, skip the candidate-resolution attempt
  // (it would always fail) and fall through to step 2 (env-var). This is a
  // narrow escape hatch — the cross-write invariant is preserved because:
  //   (a) UUID hints alone never resolve to a session (only env-var/promptHint can),
  //   (b) cAgents-shaped-but-unresolvable hints still terminate at null below.
  if (sessionHint) {
    if (_isSdkUuidShape(sessionHint)) {
      // WI-2 (OBJ-1): SDK UUID — consult the persisted SDK-UUID -> session map
      // FIRST. A live hit is a DETERMINISTIC resolution (no heuristic); cache it
      // under the existing composite cacheKey.
      const mapped = resolveSdkUuidToSession(sessionHint);
      if (mapped) {
        _cachedActiveSessions.set(cacheKey, mapped);
        return mapped;
      }
      // Map MISS: SDK UUID is not a cAgents directory name and the map holds no
      // live pointer. Skip step 1. Do NOT cache null here — let env-var /
      // promptHint determine the outcome (preserves the v12.16.0 UUID-fallthrough
      // invariant so a sibling session is never resolved).
      console.error(`[findActiveSession] sessionHint="${sessionHint}" is an SDK UUID with no live map pointer; falling through to env-var/promptHint chain.`);
    } else {
      const dir = _tryResolveCandidate(sessionsDir, sessionHint);
      if (dir) {
        _cachedActiveSessions.set(cacheKey, dir);
        return dir;
      }
      // cAgents-shaped hint provided but unresolvable. Refuse to fall through
      // to other instances' sessions — that is the H1/H3 cross-session leak we
      // are closing.
      if (!fallbackHeuristic) {
        console.error(`[findActiveSession] sessionHint="${sessionHint}" provided but not resolvable; returning null (no heuristic fallback). Set fallbackHeuristic:true to override.`);
        _cachedActiveSessions.set(cacheKey, null);
        return null;
      }
    }
  }

  // Step 2: env-var.
  if (envSession) {
    const dir = _tryResolveCandidate(sessionsDir, envSession);
    if (dir) {
      _cachedActiveSessions.set(cacheKey, dir);
      return dir;
    }
    if (!fallbackHeuristic) {
      console.error(`[findActiveSession] CAGENTS_ACTIVE_SESSION="${envSession}" unresolvable (missing or terminal); returning null.`);
      _cachedActiveSessions.set(cacheKey, null);
      return null;
    }
  }

  // Step 3: promptHint (for subagent-tracker Pass-3 substitute).
  if (promptHint) {
    const dir = _tryResolveCandidate(sessionsDir, promptHint);
    if (dir) {
      _cachedActiveSessions.set(cacheKey, dir);
      return dir;
    }
    if (!fallbackHeuristic) {
      _cachedActiveSessions.set(cacheKey, null);
      return null;
    }
  }

  // Step 4 (default): null — refuse to silently resolve to "newest active" session.
  if (!fallbackHeuristic) {
    _cachedActiveSessions.set(cacheKey, null);
    return null;
  }

  // -------- LEGACY HEURISTIC PASSES (opt-in only) --------
  const sessions = fs.readdirSync(sessionsDir)
    .filter(d => SESSION_PREFIXES.some(p => d.startsWith(p)))
    .sort((a, b) => {
      // GAP-3 fix: team_* sessions sort BEFORE org_* flat sessions.
      // When a legacy org_* session spawns /team concurrently, the flat team_* session must be
      // discovered by the status pass before the org_* session is considered.
      // This prevents the nested org scan from overriding an active team session.
      const aIsTeam = a.startsWith('team_');
      const bIsTeam = b.startsWith('team_');
      if (aIsTeam && !bIsTeam) return -1;
      if (!aIsTeam && bIsTeam) return 1;
      // Within same prefix group: sort newest-first by last 2 underscore-separated segments
      // Works for both old format (run_20260317_040624 -> 20260317_040624)
      // and new format (run_fix-auth_260317_001 -> 260317_001)
      const partsA = a.split('_');
      const tsA = partsA.slice(-2).join('_');
      const partsB = b.split('_');
      const tsB = partsB.slice(-2).join('_');
      return tsB.localeCompare(tsA);
    });

  // First pass: look for sessions with status.yaml (or session.yaml fallback) in a non-terminal phase
  for (const session of sessions) {
    const statusFile = path.join(sessionsDir, session, 'status.yaml');
    let content = safeRead(statusFile);
    // Fallback: legacy designer sessions use session.yaml instead of status.yaml
    if (!content) {
      content = safeRead(path.join(sessionsDir, session, 'session.yaml'));
    }
    if (!content) continue;

    const phase = extractYamlValue(content, 'phase') || extractYamlValue(content, 'current_phase') || extractYamlValue(content, 'pipeline_state');
    if (phase && !isTerminalState(phase)) {
      const result = path.join(sessionsDir, session);
      _cachedActiveSessions.set(cacheKey, result);
      return result;
    }
  }

  // Second pass: look for recently-created sessions without status.yaml
  // (handles the race condition where trigger agent hasn't written status.yaml yet,
  //  AND legacy org_* sessions that wrote strategic_brief.yaml before instruction.yaml/status.yaml)
  const graceCutoff = Date.now() - SESSION_DISCOVERY_GRACE_PERIOD_MS;
  for (const session of sessions) {
    const sessionPath = path.join(sessionsDir, session);
    const statusFile = path.join(sessionPath, 'status.yaml');
    if (safeRead(statusFile)) continue; // Already checked in first pass

    try {
      // Check for any recognizable session file: instruction.yaml, strategic_brief.yaml,
      // or workflow/agent_tree.yaml — any of these indicate a valid active session
      const hasInstruction = fs.existsSync(path.join(sessionPath, 'instruction.yaml'));
      const hasBrief = fs.existsSync(path.join(sessionPath, 'strategic_brief.yaml'));
      const hasAgentTree = fs.existsSync(path.join(sessionPath, 'workflow', 'agent_tree.yaml'));

      if (hasInstruction || hasBrief || hasAgentTree) {
        const stat = fs.statSync(sessionPath);
        if (stat.mtimeMs > graceCutoff) {
          console.error(`[findActiveSession] Found recent session without status.yaml: ${session} (has: ${hasInstruction ? 'instruction' : hasBrief ? 'brief' : 'agent_tree'})`);
          _cachedActiveSessions.set(cacheKey, sessionPath);
          return sessionPath;
        }
      }
    } catch { /* skip */ }
  }

  // (A2-05, v12.x) The legacy "third pass: scan org_* session subdirectories for
  // nested team/domain sessions" was removed. `/org` was removed in v12.2.0 (folded
  // into `/team` strategic mode), so no new session is ever created with an `org_`
  // prefix and the nested-subdir scan only ever matched archived dirs — dead code
  // for all live sessions. The status-pass and grace-pass above remain the active
  // fallbackHeuristic behavior.

  _cachedActiveSessions.set(cacheKey, null);
  return null;
}

/**
 * Clear the findActiveSession cache. Exposed for tests; production code rarely
 * needs this since cache entries are keyed by full resolution input.
 */
function _resetActiveSessionCache() {
  _cachedActiveSessions = new Map();
}

/**
 * Resolve the team session for a hook via a deterministic chain that mirrors
 * findActiveSession (H1/WI-2 concurrency contract):
 *   1. input.session_id pin:
 *        - team_* id  → that dir (terminal-tolerant) or null if absent.
 *        - non-team concrete id (run_/designer_/test) → null (this hook is in a
 *          NON-team session; do not heuristic-resolve a sibling team session).
 *        - SDK UUID   → falls through (not a cAgents dir name).
 *   2. CAGENTS_ACTIVE_SESSION env var (team_* only).
 *   3. Newest-team heuristic — LAST RESORT, only when session_id is absent/UUID
 *      and no env pin (the production "Claude Code gave us a UUID" case).
 * A provided (non-UUID) hint never falls through to the heuristic — it returns
 * its own team dir or null. This closes the cross-session bug where two
 * concurrent team_* sessions, or an unpinned non-team caller, caused a hook to
 * resolve and mutate the WRONG session's task_list.yaml.
 * @param {object} input - Hook input (may contain session_id)
 * @returns {string|null} Session directory path or null
 */
function findTeamSession(input = {}) {
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');

  // Deterministic resolution chain — mirrors findActiveSession's H1/WI-2 contract
  // so that, under two concurrent same-directory team_* sessions, each hook binds
  // to ITS OWN session instead of the newest-team heuristic resolving the WRONG
  // session's task_list.yaml. Steps 1-2 are pinned/deterministic; step 3 (the
  // legacy newest-team heuristic) survives ONLY as a last resort for genuinely
  // unpinned calls (back-compat).

  // Step 1: explicit session_id pin. SDK transcript UUIDs (8-4-4-4-12 lowercase
  // hex) arrive in hook payloads as input.session_id but are NOT cAgents session
  // directory names — when the hint matches the SDK UUID shape, skip this step
  // (it would always fail) and fall through to env-var / heuristic, exactly like
  // findActiveSession chain-step-1.
  const hint = input.session_id;
  if (hint && !_isSdkUuidShape(hint)) {
    // Concrete (non-UUID) session_id pin.
    if (hint.startsWith('team_')) {
      const dir = path.join(sessionsDir, hint);
      // Terminal-tolerant existsSync (not the non-terminal _tryResolveCandidate
      // gate): team-stop.cjs resolves its team session here at SessionEnd, when
      // the session may already be terminal, and still needs to finalize metrics.
      if (fs.existsSync(dir)) return dir;
      // A cAgents-shaped team_ hint was provided but its dir is absent: refuse to
      // resolve to a SIBLING team session (the cross-session leak this fix closes).
      // Return null instead of falling through to the newest-team heuristic.
      return null;
    }
    // Non-team concrete session_id (run_/designer_/synthetic test id): the hook is
    // firing for a NON-team session, so there is no team session to resolve. Return
    // null rather than heuristic-resolving — and writing into — a SIBLING team
    // session. This was the cross-session leak's source: an unpinned non-team
    // caller (e.g. a Stop/TaskCompleted hook for a /run or test session) was
    // resolving the newest non-terminal team_ session and mutating its task_list.
    // Production team hooks fire with an SDK UUID, which is excluded above and
    // falls through to the map / env-var / heuristic. Mirrors findActiveSession's
    // contract: a provided, non-UUID, unresolvable hint returns null (no
    // heuristic fallthrough).
    return null;
  }

  // Step 1b (WI-2 / OBJ-1): SDK-UUID map step. A production team hook fires with
  // an SDK transcript UUID in input.session_id (excluded from the concrete-id
  // block above). Consult the persisted map FIRST — a resolution to a team_
  // session is the deterministic bind. A non-team resolution means this hook is
  // NOT in a team session (mirror the non-team concrete-id contract → null). A
  // miss falls through to env-var / heuristic exactly as today.
  if (hint && _isSdkUuidShape(hint)) {
    const mapped = resolveSdkUuidToSession(hint);
    if (mapped) {
      if (path.basename(mapped).startsWith('team_')) return mapped;
      return null; // resolved to a non-team session → not a team hook
    }
    // miss → fall through to env-var / heuristic.
  }

  // Step 2: CAGENTS_ACTIVE_SESSION env var (team_ sessions only). Same rules.
  const envSession = process.env.CAGENTS_ACTIVE_SESSION;
  if (envSession && !_isSdkUuidShape(envSession) && envSession.startsWith('team_')) {
    const dir = path.join(sessionsDir, envSession);
    if (fs.existsSync(dir)) return dir;
    return null;
  }

  // Step 3 (last resort, back-compat for genuinely unpinned calls): newest-team
  // heuristic. Reached only when neither a team_ session_id nor a team_
  // CAGENTS_ACTIVE_SESSION env var is present (e.g. an SDK-UUID-only payload with
  // no env pin). This is the historic behavior and is intentionally preserved.
  if (!fs.existsSync(sessionsDir)) return null;

  const teamSessions = fs.readdirSync(sessionsDir)
    .filter(d => d.startsWith('team_'))
    .sort((a, b) => {
      // Extract last 2 underscore-separated segments as sort key
      // Works for both old format (team_20260317_040624 -> 20260317_040624)
      // and new format (team_fix-auth_260317_001 -> 260317_001)
      const partsA = a.split('_');
      const tsA = partsA.slice(-2).join('_');
      const partsB = b.split('_');
      const tsB = partsB.slice(-2).join('_');
      return tsB.localeCompare(tsA);
    });

  for (const session of teamSessions) {
    const statusFile = path.join(sessionsDir, session, 'status.yaml');
    const content = safeRead(statusFile);
    if (!content) continue;

    const phase = extractYamlValue(content, 'phase') || extractYamlValue(content, 'pipeline_state');
    if (phase && !isTerminalState(phase)) {
      return path.join(sessionsDir, session);
    }
  }

  // (A2-05, v12.x) The legacy "H-11: scan org_* session subdirectories for nested
  // team sessions" pass was removed. `/org` was removed in v12.2.0, so no live
  // session is ever created with an `org_` prefix; the nested-subdir scan only
  // matched archived dirs. The top-level team_* status scan above is the active path.

  return null;
}

/**
 * Find the most recently modified active session directory as a fallback
 * when findActiveSession() returns null. This handles the race condition
 * where a session dir exists but status.yaml hasn't been written yet.
 *
 * Includes nested org subdir scanning (e.g., org_xxx/engineering/ when
 * /team ran inside a legacy org_* session). Used by both subagent-tracker.cjs and
 * subagent-stop-tracker.cjs for consistent session discovery on fallback.
 *
 * GAP-4 fix: exported from hook-utils.cjs so start and stop trackers share
 * the same implementation, guaranteeing events land in the same agent_tree.yaml.
 */
function findMostRecentSessionDir(options) {
  const includeTerminal = options && options.includeTerminal;
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) return null;

  let bestDir = null;
  let bestMtime = 0;
  let entries = [];

  try {
    entries = fs.readdirSync(sessionsDir)
      .filter(d => SESSION_PREFIXES.some(p => d.startsWith(p)));

    for (const entry of entries) {
      const fullPath = path.join(sessionsDir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && stat.mtimeMs > bestMtime) {
          // Skip sessions that are clearly completed/aborted
          const statusFile = path.join(fullPath, 'status.yaml');
          const statusContent = safeRead(statusFile);
          if (statusContent && !includeTerminal) {
            const phaseMatch = statusContent.match(/(?:phase|pipeline_state):\s*(\S+)/);
            if (phaseMatch) {
              const phase = phaseMatch[1];
              if (isTerminalState(phase)) {
                continue; // Skip finished sessions
              }
            }
          }
          // No status.yaml or non-terminal phase (or includeTerminal): eligible
          bestMtime = stat.mtimeMs;
          bestDir = fullPath;
        }
      } catch { /* skip unreadable entries */ }
    }
  } catch { /* sessions dir unreadable */ }

  // Also scan org session subdirectories for nested team/domain sessions.
  // (e.g., org_xxx/engineering/ when /team ran inside a legacy org_* session)
  // Only scan org subdirs if no flat session was found (bestDir is null),
  // to prevent an org_*/subdir/ from overriding a flat active team session.
  if (!bestDir) {
    const orgDirs = entries.filter(d => d.startsWith('org_'));
    for (const orgDir of orgDirs) {
      const orgPath = path.join(sessionsDir, orgDir);
      try {
        const subdirs = fs.readdirSync(orgPath).filter(d => {
          try { return fs.statSync(path.join(orgPath, d)).isDirectory(); } catch { return false; }
        });
        for (const subdir of subdirs) {
          const nestedPath = path.join(orgPath, subdir);
          try {
            const stat = fs.statSync(nestedPath);
            if (stat.mtimeMs > bestMtime) {
              if (!includeTerminal) {
                const statusContent = safeRead(path.join(nestedPath, 'status.yaml'));
                if (statusContent) {
                  const phaseMatch = statusContent.match(/(?:phase|pipeline_state):\s*(\S+)/);
                  if (phaseMatch) {
                    const phase = phaseMatch[1];
                    if (isTerminalState(phase)) continue;
                  }
                }
              }
              bestMtime = stat.mtimeMs;
              bestDir = nestedPath;
            }
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }
  }

  return bestDir;
}

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

/**
 * Append one lifecycle event to a session's structured event stream
 * (`workflow/events.jsonl`, one JSON object per line). REC-16 (v12.51.0).
 *
 * Restores the per-session structured timeline that `workflow/events/` provided
 * before it was removed in v12.6.0 — but written by DETERMINISTIC hooks (spawn /
 * stop / gate / outcome), not model-dependent skill prose, so it is useful even
 * when a skill omits optional lines (the failure mode that killed the old EVT
 * files). An operator reconstructs a failed run from three greppable stores:
 * this JSONL (ordered lifecycle timeline), `agent_spawns.log` (cross-session
 * spawn context), and `status.yaml` state_history.
 *
 * Contract:
 *   - SESSION-SCOPED: the caller passes the session dir it already resolved via
 *     the deterministic chain (never the newest-active heuristic); a null/absent
 *     sessionDir is a silent no-op so an unresolved hook never cross-writes.
 *   - LOCK-PROTECTED: the append is wrapped in withFileLock (keyed on the file
 *     path) so concurrent writers in the same session never truncate each other,
 *     matching the agent_tree.yaml concurrency contract.
 *   - FAIL-OPEN: every failure is swallowed to stderr — emitting an event must
 *     NEVER break the hook that called it. Per-session + append-only ⇒ no
 *     rotation is needed (the stream dies with the session dir).
 *
 * @param {string} sessionDir - absolute session directory (resolved by caller).
 * @param {object} evt - event payload; a `ts` ISO timestamp is stamped
 *   automatically and `type` should be one of spawn|stop|gate|outcome.
 */
function appendSessionEvent(sessionDir, evt) {
  try {
    if (!sessionDir) return; // unresolved session ⇒ never cross-write
    const f = path.join(sessionDir, 'workflow', 'events.jsonl');
    ensureDir(path.dirname(f));
    const line = JSON.stringify({ ts: new Date().toISOString(), ...(evt || {}) }) + '\n';
    withFileLock(f, () => fs.appendFileSync(f, line));
  } catch (e) {
    console.error('[appendSessionEvent] non-fatal: ' + (e && e.message));
  }
}

/**
 * Generate a filesystem-safe timestamp slug.
 * Example: "2026-02-05_09-46-24"
 */
function getTimestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

/**
 * Get a waypoint file path in a session's waypoints directory.
 */
function getWaypointPath(sessionDir, type, date = new Date()) {
  const waypointsDir = ensureDir(path.join(sessionDir, 'waypoints'));
  const slug = getTimestampSlug(date);
  return path.join(waypointsDir, `wp-${type}-${slug}.yaml`);
}

/**
 * Assign a grade based on score and thresholds.
 */
function assignGrade(score, thresholds = { excellent: 85, pass: 65 }) {
  if (score >= thresholds.excellent) return 'EXCELLENT';
  if (score >= thresholds.pass) return 'PASS';
  return 'FAIL';
}

/**
 * Calculate total score from a breakdown object, floored at 0.
 */
function calculateScore(breakdown) {
  return Math.max(0, Object.values(breakdown).reduce((a, b) => a + b, 0));
}

/**
 * Parse a simple YAML task list file and return items array.
 * Handles the team/task_list.yaml format with id, name, status,
 * claimed_by, and dependencies fields.
 *
 * @param {string} filePath - Path to the task_list.yaml file
 * @returns {Array<{id: string, name?: string, status?: string, claimed_by?: string|null, dependencies: string[]}>}
 */
function parseTaskList(filePath) {
  const content = safeRead(filePath);
  if (!content) return [];

  const items = [];
  const itemBlocks = content.split(/\n\s*- id:\s*/);

  for (let i = 1; i < itemBlocks.length; i++) {
    const block = '- id: ' + itemBlocks[i];
    const item = {};

    const idMatch = block.match(/id:\s*["']?([^"'\n]+)["']?/);
    if (idMatch) item.id = idMatch[1].trim();

    const nameMatch = block.match(/name:\s*["']?([^"'\n]+)["']?/);
    if (nameMatch) item.name = nameMatch[1].trim();

    const statusMatch = block.match(/status:\s*["']?([^"'\n]+)["']?/);
    if (statusMatch) item.status = statusMatch[1].trim();

    const claimedMatch = block.match(/claimed_by:\s*["']?([^"'\n]+)["']?/);
    if (claimedMatch) {
      const val = claimedMatch[1].trim();
      item.claimed_by = (val === 'null' || val === '~') ? null : val;
    }

    const depsMatch = block.match(/dependencies:\s*\[([^\]]*)\]/);
    if (depsMatch) {
      item.dependencies = depsMatch[1]
        .split(',')
        .map(d => d.trim().replace(/["']/g, ''))
        .filter(Boolean);
    } else {
      item.dependencies = [];
    }

    if (item.id) items.push(item);
  }

  return items;
}

/**
 * Check if a work item's dependencies are all completed.
 *
 * @param {object} item - Work item to check
 * @param {Array<object>} allItems - All work items for dependency resolution
 * @returns {boolean} True if all dependencies have status 'completed'
 */
function areDependenciesMet(item, allItems) {
  if (!item.dependencies || item.dependencies.length === 0) return true;
  return item.dependencies.every(depId => {
    const dep = allItems.find(i => i.id === depId);
    return dep && dep.status === 'completed';
  });
}

/**
 * Find available (unclaimed, unblocked) work items from a task list file.
 *
 * @param {string} taskListPath - Path to the task_list.yaml file
 * @returns {Array<object>} Work items with status 'available' or 'pending', no claimed_by, and all dependencies met
 */
function findAvailableWork(taskListPath) {
  const items = parseTaskList(taskListPath);
  if (items.length === 0) return [];
  return items.filter(item =>
    (item.status === 'available' || item.status === 'pending') &&
    !item.claimed_by &&
    areDependenciesMet(item, items)
  );
}

// ============================================================
// File Locking (mkdir-based atomic mutex)
// ============================================================
// Hooks run as separate Node.js processes. When multiple agents spawn
// concurrently, their SubagentStart/SubagentStop hooks race on
// agent_tree.yaml (read-modify-write). mkdirSync is atomic on POSIX,
// so we use a .lock directory as a mutex.
// ============================================================

/**
 * Execute a function while holding a file lock.
 * Uses mkdirSync as an atomic POSIX mutex (EEXIST = lock held).
 * Falls back to running without lock after max retries.
 *
 * @param {string} filePath - Path to the file being protected
 * @param {function} fn - Function to execute while holding the lock
 * @returns {*} Return value of fn
 */
function withFileLock(filePath, fn) {
  const lockDir = filePath + '.lock';
  const maxRetries = 100;
  const retryDelayMs = 20;
  const staleLockMs = 10000; // 10s mtime-based fallback stale threshold

  for (let i = 0; i < maxRetries; i++) {
    try {
      fs.mkdirSync(lockDir);
      // Lock acquired - write PID for liveness detection (REQ-014)
      try { fs.writeFileSync(path.join(lockDir, 'pid'), String(process.pid)); } catch { /* best effort */ }
      try {
        return fn();
      } finally {
        // Remove lock dir and PID file atomically
        try { fs.rmSync(lockDir, { recursive: true, force: true }); } catch { /* best effort */ }
      }
    } catch (err) {
      if (err.code === 'EEXIST') {
        // Lock held by another process - PID-based liveness check (REQ-014)
        let lockIsStale = false;
        try {
          const pidContent = safeRead(path.join(lockDir, 'pid'));
          if (pidContent) {
            const pid = parseInt(pidContent.trim(), 10);
            if (!isNaN(pid)) {
              try {
                process.kill(pid, 0); // Signal 0: check liveness without sending a signal
                // Process alive — lock is live, don't remove
              } catch (killErr) {
                if (killErr.code === 'ESRCH') {
                  // Process dead — stale lock
                  lockIsStale = true;
                }
                // EPERM: process exists but owned by different user — treat as live
              }
            }
          } else {
            // No PID file — fall back to mtime-based stale check
            const stat = fs.statSync(lockDir);
            if (Date.now() - stat.mtimeMs > staleLockMs) {
              lockIsStale = true;
            }
          }
        } catch { /* lock dir gone, retry */ continue; }

        if (lockIsStale) {
          try { fs.rmSync(lockDir, { recursive: true, force: true }); } catch { /* another process may have cleared it */ }
          continue; // Retry immediately after clearing stale lock
        }
        // True synchronous sleep (0% CPU) — Atomics.wait blocks this thread for
        // retryDelayMs without spinning (stdlib; minimal-solution ladder rung 2)
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, retryDelayMs);
        continue;
      }
      // Unexpected error - run without lock rather than failing
      console.error(`[withFileLock] Unexpected error: ${err.message}, proceeding without lock`);
      return fn();
    }
  }

  // Exhausted retries - proceed without lock (better than failing)
  console.error(`[withFileLock] Could not acquire lock after ${maxRetries} retries, proceeding without lock`);
  return fn();
}

// ============================================================
// Structured Error Format (What / Why / Fix)
// ============================================================
// Provides consistent, actionable error messages across all hooks.
// Every error message answers three questions:
//   1. WHAT happened (the observable problem)
//   2. WHY it happened (root cause or context)
//   3. FIX: how to resolve it (concrete action)
// ============================================================

/**
 * Format a structured error message with What/Why/Fix sections.
 *
 * @param {object} opts - Error details
 * @param {string} opts.what - What happened (the problem)
 * @param {string} opts.why - Why it happened (root cause)
 * @param {string} opts.fix - How to fix it (concrete action)
 * @param {string} [opts.hook] - Hook name for attribution
 * @returns {string} Formatted error message
 */
function formatError({ what, why, fix, hook }) {
  const parts = [];
  if (hook) parts.push(`[${hook}]`);
  parts.push(`WHAT: ${what}`);
  parts.push(`WHY: ${why}`);
  parts.push(`FIX: ${fix}`);
  return parts.join('\n');
}

/**
 * Create a structured deny response for PreToolUse hooks.
 *
 * @param {object} opts - Error details (same as formatError)
 * @returns {object} Hook deny response with formatted reason
 */
function denyWithReason({ what, why, fix, hook }) {
  return { deny: true, reason: formatError({ what, why, fix, hook }) };
}

/**
 * Create a structured warning (continue with systemMessage).
 *
 * @param {object} opts - Warning details (same as formatError)
 * @returns {object} Hook continue response with formatted systemMessage
 */
function warnWithReason({ what, why, fix, hook }) {
  return { continue: true, systemMessage: formatError({ what, why, fix, hook }) };
}

// ============================================================
// createHook() Factory
// ============================================================
// Eliminates per-hook boilerplate: try-catch wrapping, stdin reading,
// JSON output, error handling. Each hook only needs to provide a handler
// function: async (input) => result.
//
// Result can be:
//   - null/undefined: outputs {"continue": true}
//   - { continue: true, systemMessage: "..." }
//   - { decision: "block", reason: "..." }
//   - { deny: true, reason: "..." } (for PreToolUse hooks)
//   - Any valid hook response object
// ============================================================

/**
 * Create and run a hook with standard boilerplate.
 *
 * @param {string} name - Hook name for logging (e.g., "SessionCatchup")
 * @param {function} handler - async (input) => result object
 */
/**
 * Atomic dedup guard for plugin + project double-load scenarios.
 * When cAgents is both the active project AND an installed marketplace plugin,
 * Claude Code loads hooks from both paths, causing every hook to fire twice.
 * This guard uses fs.openSync('wx') (exclusive create) on a temp file keyed by
 * hook name + input content hash. First caller wins; second caller no-ops.
 * Temp files auto-clean after 2 seconds.
 */
function dedupGuard(hookName, input) {
  // Test-mode bypass: vitest sets VITEST=true; CI runners may also set it explicitly.
  // The dedup guard exists to prevent plugin+project double-load in production. Tests
  // intentionally invoke the same hook multiple times with deterministic fixtures
  // (e.g., the same session_id), so dedup must not fire and short-circuit the side
  // effects under test. If a stale /tmp/cagents-dedup-* file leaks from a prior crash
  // or cancelled run, it would cause spurious test failures — the bypass also makes
  // the test suite robust to that condition. NODE_ENV=test and CAGENTS_HOOK_DEDUP_DISABLE
  // are also honored as escape hatches.
  if (process.env.VITEST === 'true'
      || process.env.NODE_ENV === 'test'
      || process.env.CAGENTS_HOOK_DEDUP_DISABLE === '1') {
    return false;
  }
  try {
    const crypto = require('crypto');
    const os = require('os');
    // H6 (v12.20.0): key on a hash of the FULL stringified input, not a 200-char
    // prefix. The previous `JSON.stringify(input).slice(0, 200)` collided two
    // genuinely-different invocations whose first ~200 chars matched — e.g. two
    // Writes to the same long file_path that differ only in their (later)
    // `content` field, or two payloads sharing a long leading session_id/path.
    // On collision the SECOND invocation was treated as a duplicate and skipped,
    // bypassing the security gates (secret-detection, controller-delegation). A
    // full-input SHA-1 dedups ONLY truly-identical payloads, which is the intended
    // plugin+project double-load case. The 2s window and double-load intent are
    // unchanged.
    const fullInput = JSON.stringify(input);
    const hash = crypto.createHash('sha1').update(hookName + ' ' + fullInput).digest('hex').slice(0, 16);
    const dedupFile = path.join(os.tmpdir(), `cagents-dedup-${hookName}-${hash}`);

    // Exclusive create: fails with EEXIST if another invocation already created it
    const fd = fs.openSync(dedupFile, 'wx');
    fs.closeSync(fd);

    // Schedule cleanup: both on process exit (for short-lived subprocess invocations
    // where process exits before the timer fires) and via timeout fallback.
    // Without process.on('exit'), tests that run the hook via execSync would leave
    // stale dedup files that cause the next identical invocation to be skipped.
    process.on('exit', () => { try { fs.unlinkSync(dedupFile); } catch {} });
    // Fallback cleanup timer ONLY — process.on('exit') above is the primary
    // cleanup path for short-lived subprocess invocations. .unref() so this 2s
    // timer never keeps a finished hook process alive (the linger we eliminate).
    // If the loop stays alive for other reasons, the timer still fires and
    // cleans up. Dedup correctness (plugin+project double-load) relies on the
    // file existing during the concurrent invocations' overlap, not on this
    // timer's keep-alive.
    const dedupCleanupTimer = setTimeout(() => { try { fs.unlinkSync(dedupFile); } catch {} }, 2000);
    dedupCleanupTimer.unref();
    return false; // Not a duplicate — proceed
  } catch (e) {
    if (e.code === 'EEXIST') return true; // Duplicate invocation — skip
    return false; // On any other error, proceed (don't block hooks on dedup failure)
  }
}

function createHook(name, handler) {
  async function run() {
    try {
      const input = await readStdin(name);

      // Dedup guard: skip if another invocation of the same hook with the same input is already running
      if (dedupGuard(name, input)) {
        console.log(JSON.stringify({ continue: true }));
        return;
      }

      try {
        const result = await handler(input);

        if (!result) {
          console.log(JSON.stringify({ continue: true }));
          return;
        }

        // Shorthand: { deny: true, reason: "..." } -> full PreToolUse deny response
        if (result.deny) {
          console.log(JSON.stringify({
            hookSpecificOutput: {
              hookEventName: 'PreToolUse',
              permissionDecision: 'deny',
              permissionDecisionReason: result.reason || 'Blocked by hook'
            }
          }));
          return;
        }

        // Shorthand: { allow: true, reason: "..." } -> full allow response
        // Supports both PreToolUse (permissionDecision) and PermissionRequest (decision.behavior)
        if (result.allow) {
          const hookEvent = result.hookEvent || 'PreToolUse';
          if (hookEvent === 'PermissionRequest') {
            console.log(JSON.stringify({
              hookSpecificOutput: {
                hookEventName: 'PermissionRequest',
                decision: {
                  behavior: 'allow'
                }
              }
            }));
          } else {
            console.log(JSON.stringify({
              hookSpecificOutput: {
                hookEventName: hookEvent,
                permissionDecision: 'allow',
                permissionDecisionReason: result.reason || 'Allowed by hook'
              }
            }));
          }
          return;
        }

        // V11.0.5: Auto-inject `continue: true` when the hook returns a
        // shape that legitimately wants the run to keep going but forgot to
        // declare it. The Claude Code hook protocol expects responses to
        // carry an explicit signal — without one, downstream consumers get
        // an `undefined` field and assertions like `result.continue === true`
        // fail spuriously (see V11.0.4 tool-failure-tracker bug). We do NOT
        // override hooks that explicitly set `continue: false`, return a
        // `decision` (Stop hook block), or carry a deny `permissionDecision`
        // — those have intentional semantics. The deny/allow shorthands
        // above already returned, so by the time we reach this branch the
        // result is some other shape.
        if (typeof result === 'object'
            && result !== null
            && result.continue === undefined
            && result.decision === undefined
            && !(result.hookSpecificOutput && result.hookSpecificOutput.permissionDecision === 'deny')) {
          result.continue = true;
        }

        console.log(JSON.stringify(result));

      } catch (error) {
        console.error(`[${name}] Error: ${error.message}`);
        console.log(JSON.stringify({ continue: true }));
      }

    } catch (e) {
      // Fatal error (e.g., stdin read failure)
      console.log(JSON.stringify({ continue: true }));
    }
  }

  run();
}

/**
 * Update last_updated_at heartbeat in a session's status.yaml.
 * Called by hooks that write/modify status.yaml to enable stuck session detection.
 *
 * @param {string} sessionDir - Path to the session directory
 */
function updateStatusHeartbeat(sessionDir) {
  const statusFile = path.join(sessionDir, 'status.yaml');
  const content = safeRead(statusFile);
  if (!content) return;

  const now = new Date().toISOString();

  withFileLock(statusFile, () => {
    // Re-read inside lock for safety
    let current = safeRead(statusFile);
    if (!current) return;

    if (current.includes('last_updated_at:')) {
      // Replace existing value
      current = current.replace(/^last_updated_at:.*$/m, `last_updated_at: "${now}"`);
    } else {
      // Append at the end
      current = current.trimEnd() + `\nlast_updated_at: "${now}"\n`;
    }

    fs.writeFileSync(statusFile, current);
  });
}

module.exports = {
  PROJECT_ROOT,
  PLUGIN_ROOT,
  AGENT_MEMORY_DIR,
  SESSION_PREFIXES,
  TERMINAL_STATES,
  TERMINAL_ALIASES,
  SUCCESS_TERMINAL_STATES,
  normalizeTerminalState,
  isTerminalState,
  isSuccessTerminalState,
  sessionGenuinelyValidated,
  SESSION_DISCOVERY_GRACE_PERIOD_MS,
  MAX_SESSION_START_CHARS,
  MAX_ATTENTION_CHARS,
  STDIN_FALLBACK_MS,
  createHook,
  dedupGuard,
  readStdin,
  safeRead,
  extractYamlValue,
  countPattern,
  findActiveSession,
  _resetActiveSessionCache,
  findMostRecentSessionDir,
  findTeamSession,
  // SDK-UUID -> session persisted map (OBJ-1, WI-1/WI-2/WI-5)
  _sdkMapDir,
  _sdkPointerPath,
  _pruneSdkMap,
  upsertSdkSessionMap,
  resolveSdkUuidToSession,
  removeSdkPointer,
  ensureDir,
  appendSessionEvent,
  getTimestampSlug,
  getWaypointPath,
  assignGrade,
  calculateScore,
  parseTaskList,
  areDependenciesMet,
  findAvailableWork,
  withFileLock,
  formatError,
  denyWithReason,
  warnWithReason,
  updateStatusHeartbeat
};
