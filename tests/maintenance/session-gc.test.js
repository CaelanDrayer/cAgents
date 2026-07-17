/**
 * REC-19 (v12.52.0) regression test: scripts/maintenance/session-gc.cjs
 *
 * Covers:
 *   (unit) runGc archive / delete / skip-live / skip-recent / skip-nonterminal /
 *          skip-fixture classification, and the --dry-run (default) no-write contract.
 *   (unit) the script CONSUMES the canonical Phase-1 (REC-01) terminal vocabulary
 *          from hook-utils.cjs — it does NOT re-spell isTerminalState/TERMINAL_STATES.
 *   (wiring) team-stop.cjs Phase-4 fires session-gc via a 24h-throttled sentinel
 *          (`_system/.last-gc`) and honors CAGENTS_SESSION_GC_OVERRIDE; fail-open.
 *
 * Bug-driven testing mandate (CLAUDE.md): failing-before / passing-after.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const GC_MODULE = path.join(REPO_ROOT, 'scripts/maintenance/session-gc.cjs');
const HOOK_UTILS = path.join(REPO_ROOT, '.claude/hooks/hook-utils.cjs');
const TEAM_STOP = path.join(REPO_ROOT, '.claude/hooks/team-stop.cjs');

const gc = require(GC_MODULE);
const hookUtils = require(HOOK_UTILS);

const DAY = 24 * 60 * 60 * 1000;

// -----------------------------------------------------------------------------
// Fixture helpers
// -----------------------------------------------------------------------------

function makeSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cagents-rec19-'));
  fs.mkdirSync(path.join(dir, 'cagents-memory/sessions'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'cagents-memory/_system'), { recursive: true });
  return dir;
}

function setMtimeDaysAgo(target, days) {
  const t = (Date.now() - days * DAY) / 1000;
  try { fs.utimesSync(target, t, t); } catch {}
}

/**
 * Create a session dir under `parent`.
 *   terminal:true  -> pipeline_state/phase VALIDATED (terminal)
 *   terminal:false -> INIT (non-terminal, mid-flight)
 *   live:true      -> fresh last_updated_at heartbeat (protected by liveness)
 * The dir + status.yaml mtimes are aged to `ageDays` so age-based rules fire.
 */
function mkSession(parent, name, { ageDays = 0, terminal = true, live = false } = {}) {
  const dir = path.join(parent, name);
  fs.mkdirSync(path.join(dir, 'workflow'), { recursive: true });
  const state = terminal ? 'VALIDATED' : 'INIT';
  let status = `session_id: "${name}"\npipeline_state: ${state}\nphase: ${state}\n`;
  if (live) status += `last_updated_at: "${new Date().toISOString()}"\n`;
  fs.writeFileSync(path.join(dir, 'status.yaml'), status);
  // Age both the status.yaml file and the dir. (For a live session the fresh
  // heartbeat in the CONTENT still wins via isSessionLive Check 3.)
  setMtimeDaysAgo(path.join(dir, 'status.yaml'), ageDays);
  setMtimeDaysAgo(dir, ageDays);
  return dir;
}

// -----------------------------------------------------------------------------
// Unit: runGc classification
// -----------------------------------------------------------------------------

describe('REC-19 session-gc runGc classification', () => {
  let sandbox;
  let sessionsDir;
  let archiveDir;

  beforeEach(() => {
    sandbox = makeSandbox();
    sessionsDir = path.join(sandbox, 'cagents-memory/sessions');
    archiveDir = path.join(sandbox, 'cagents-memory/_archive/sessions');
  });

  afterEach(() => {
    try { fs.rmSync(sandbox, { recursive: true, force: true }); } catch {}
  });

  it('archives a 40-day terminal session', () => {
    mkSession(sessionsDir, 'run_archive-me_260101_001', { ageDays: 40, terminal: true });
    const res = gc.runGc({ memoryRoot: path.join(sandbox, 'cagents-memory'), dryRun: false });

    expect(res.archived).toContain('run_archive-me_260101_001');
    expect(fs.existsSync(path.join(sessionsDir, 'run_archive-me_260101_001'))).toBe(false);
    expect(fs.existsSync(path.join(archiveDir, 'run_archive-me_260101_001'))).toBe(true);
  });

  it('never archives a LIVE session (fresh heartbeat) even when old + terminal', () => {
    mkSession(sessionsDir, 'run_live-one_260101_002', { ageDays: 40, terminal: true, live: true });
    const res = gc.runGc({ memoryRoot: path.join(sandbox, 'cagents-memory'), dryRun: false });

    expect(res.skipped.live).toContain('run_live-one_260101_002');
    expect(res.archived).not.toContain('run_live-one_260101_002');
    expect(fs.existsSync(path.join(sessionsDir, 'run_live-one_260101_002'))).toBe(true);
  });

  it('never archives a non-terminal (mid-flight) session even when old', () => {
    mkSession(sessionsDir, 'run_midflight_260101_003', { ageDays: 40, terminal: false });
    const res = gc.runGc({ memoryRoot: path.join(sandbox, 'cagents-memory'), dryRun: false });

    expect(res.skipped.nonterminal).toContain('run_midflight_260101_003');
    expect(fs.existsSync(path.join(sessionsDir, 'run_midflight_260101_003'))).toBe(true);
  });

  it('never archives a recent terminal session (< archive age)', () => {
    mkSession(sessionsDir, 'run_recent_260716_004', { ageDays: 5, terminal: true });
    const res = gc.runGc({ memoryRoot: path.join(sandbox, 'cagents-memory'), dryRun: false });

    expect(res.skipped.recent).toContain('run_recent_260716_004');
    expect(fs.existsSync(path.join(sessionsDir, 'run_recent_260716_004'))).toBe(true);
  });

  it('never archives a fixture/test session even when old + terminal', () => {
    mkSession(sessionsDir, 'team_test-stop_260101_999', { ageDays: 40, terminal: true });
    const res = gc.runGc({ memoryRoot: path.join(sandbox, 'cagents-memory'), dryRun: false });

    expect(res.skipped.fixture).toContain('team_test-stop_260101_999');
    expect(fs.existsSync(path.join(sessionsDir, 'team_test-stop_260101_999'))).toBe(true);
  });

  it('deletes an archived session older than delete age; keeps a recently-archived one', () => {
    fs.mkdirSync(archiveDir, { recursive: true });
    mkSession(archiveDir, 'run_old-archived_251201_005', { ageDays: 130, terminal: true });
    mkSession(archiveDir, 'run_fresh-archived_260601_006', { ageDays: 90, terminal: true });

    const res = gc.runGc({ memoryRoot: path.join(sandbox, 'cagents-memory'), dryRun: false });

    expect(res.deleted).toContain('run_old-archived_251201_005');
    expect(fs.existsSync(path.join(archiveDir, 'run_old-archived_251201_005'))).toBe(false);
    // 90 < 120 -> kept
    expect(res.deleted).not.toContain('run_fresh-archived_260601_006');
    expect(fs.existsSync(path.join(archiveDir, 'run_fresh-archived_260601_006'))).toBe(true);
  });

  it('--dry-run (default) writes NOTHING to disk', () => {
    mkSession(sessionsDir, 'run_dry-archive_260101_007', { ageDays: 40, terminal: true });
    fs.mkdirSync(archiveDir, { recursive: true });
    mkSession(archiveDir, 'run_dry-delete_251201_008', { ageDays: 130, terminal: true });

    // dryRun defaults to true when unspecified.
    const res = gc.runGc({ memoryRoot: path.join(sandbox, 'cagents-memory') });

    expect(res.dryRun).toBe(true);
    // The plan lists them, but disk is untouched.
    expect(res.archived).toContain('run_dry-archive_260101_007');
    expect(res.deleted).toContain('run_dry-delete_251201_008');
    expect(fs.existsSync(path.join(sessionsDir, 'run_dry-archive_260101_007'))).toBe(true);
    expect(fs.existsSync(path.join(archiveDir, 'run_dry-delete_251201_008'))).toBe(true);
  });

  it('is idempotent (a second sweep archives nothing new)', () => {
    mkSession(sessionsDir, 'run_once_260101_009', { ageDays: 40, terminal: true });
    const memoryRoot = path.join(sandbox, 'cagents-memory');
    gc.runGc({ memoryRoot, dryRun: false });
    const res2 = gc.runGc({ memoryRoot, dryRun: false });
    expect(res2.archived).toHaveLength(0);
  });
});

// -----------------------------------------------------------------------------
// Unit: consumes the canonical terminal vocabulary (REC-01)
// -----------------------------------------------------------------------------

describe('REC-19 session-gc consumes canonical isTerminalState (not a re-spelling)', () => {
  it('re-exports the SAME isTerminalState function object as hook-utils.cjs', () => {
    // Reference identity proves the vocabulary is CONSUMED, not hardcoded.
    expect(gc.isTerminalState).toBe(hookUtils.isTerminalState);
    expect(gc.TERMINAL_STATES).toBe(hookUtils.TERMINAL_STATES);
  });

  it('classifies terminal states via the canonical enum + aliases', () => {
    expect(gc.isTerminalState('VALIDATED')).toBe(true);
    expect(gc.isTerminalState('completed')).toBe(true); // alias -> complete
    expect(gc.isTerminalState('incomplete')).toBe(true);
    expect(gc.isTerminalState('INIT')).toBe(false);
    expect(gc.isTerminalState('COORDINATED')).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// Wiring: team-stop.cjs Phase-4 24h-throttled GC spawn
// -----------------------------------------------------------------------------

function createGcStub(sandboxRoot, { exitCode = 0 } = {}) {
  const stubPath = path.join(sandboxRoot, 'gc-stub.cjs');
  const logPath = path.join(sandboxRoot, 'gc-invocations.log');
  const script = `#!/usr/bin/env node
const fs = require('fs');
fs.appendFileSync(${JSON.stringify(logPath)}, JSON.stringify({ argv: process.argv.slice(2), ts: Date.now() }) + '\\n');
process.exit(${exitCode});
`;
  fs.writeFileSync(stubPath, script);
  fs.chmodSync(stubPath, 0o755);
  return { stubPath, logPath };
}

function readLog(logPath) {
  if (!fs.existsSync(logPath)) return [];
  return fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function setupRunSession(sandboxRoot, sessionId = 'run_rec19-wiring_260717_001') {
  const sessionDir = path.join(sandboxRoot, 'cagents-memory/sessions', sessionId);
  fs.mkdirSync(path.join(sessionDir, 'workflow'), { recursive: true });
  fs.writeFileSync(
    path.join(sessionDir, 'status.yaml'),
    `session_id: "${sessionId}"\npipeline_state: VALIDATED\nphase: completed\ncreated_at: "2026-07-17T08:00:00Z"\n`
  );
  return sessionDir;
}

function runTeamStop({ sessionDir, sandboxRoot, gcStubPath }) {
  const result = spawnSync('node', [TEAM_STOP], {
    input: JSON.stringify({ session_id: path.basename(sessionDir) }),
    env: {
      ...process.env,
      CAGENTS_TEST_ROOT: sandboxRoot,
      CLAUDE_PROJECT_DIR: sandboxRoot,
      CAGENTS_SESSION_GC_OVERRIDE: gcStubPath,
    },
    encoding: 'utf8',
    timeout: 10000,
  });
  return { stdout: result.stdout || '', stderr: result.stderr || '', exitCode: result.status };
}

describe('REC-19 session-gc wiring into team-stop.cjs (24h throttle)', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = makeSandbox();
  });

  afterEach(() => {
    try { fs.rmSync(sandbox, { recursive: true, force: true }); } catch {}
  });

  it('fires session-gc with --yes when no sentinel exists, and touches _system/.last-gc', () => {
    const sessionDir = setupRunSession(sandbox);
    const { stubPath, logPath } = createGcStub(sandbox);

    const res = runTeamStop({ sessionDir, sandboxRoot: sandbox, gcStubPath: stubPath });
    expect(res.exitCode).toBe(0);

    // Spawn is detached; give it a moment to write.
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline && !fs.existsSync(logPath)) { execSync('sleep 0.1'); }

    const entries = readLog(logPath);
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].argv).toContain('--yes');

    const sentinel = path.join(sandbox, 'cagents-memory/_system/.last-gc');
    expect(fs.existsSync(sentinel)).toBe(true);
  });

  it('throttles when _system/.last-gc is <24h old (no spawn)', () => {
    const sessionDir = setupRunSession(sandbox);
    const { stubPath, logPath } = createGcStub(sandbox);

    const sentinel = path.join(sandbox, 'cagents-memory/_system/.last-gc');
    fs.writeFileSync(sentinel, new Date().toISOString());

    const res = runTeamStop({ sessionDir, sandboxRoot: sandbox, gcStubPath: stubPath });
    expect(res.exitCode).toBe(0);

    execSync('sleep 0.5');
    expect(readLog(logPath).length).toBe(0);
    expect(res.stderr + res.stdout).toMatch(/throttl/i);
  });

  it('fires again when the sentinel is >24h old', () => {
    const sessionDir = setupRunSession(sandbox);
    const { stubPath, logPath } = createGcStub(sandbox);

    const sentinel = path.join(sandbox, 'cagents-memory/_system/.last-gc');
    fs.writeFileSync(sentinel, 'old');
    const past = Date.now() / 1000 - 25 * 3600;
    fs.utimesSync(sentinel, past, past);

    const res = runTeamStop({ sessionDir, sandboxRoot: sandbox, gcStubPath: stubPath });
    expect(res.exitCode).toBe(0);

    const deadline = Date.now() + 3000;
    while (Date.now() < deadline && !fs.existsSync(logPath)) { execSync('sleep 0.1'); }
    expect(readLog(logPath).length).toBeGreaterThanOrEqual(1);
  });

  it('GC failure never blocks team-stop (always exit 0, valid JSON stdout)', () => {
    const sessionDir = setupRunSession(sandbox);
    const { stubPath } = createGcStub(sandbox, { exitCode: 1 });

    const res = runTeamStop({ sessionDir, sandboxRoot: sandbox, gcStubPath: stubPath });
    expect(res.exitCode).toBe(0);
    expect(() => JSON.parse(res.stdout)).not.toThrow();
  });
});
