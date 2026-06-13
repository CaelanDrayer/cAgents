/**
 * WI-2 unit tests for findActiveSession deterministic resolution chain.
 *
 * Contract:
 *   1. Hint pass: sessionHint → existing non-terminal dir wins regardless of mtime.
 *   2. With no hint and no env, default returns null (NOT the newest non-terminal).
 *   3. fallbackHeuristic:true restores the pre-v12.15.0 status+grace behavior.
 *   4. Cache is composite-keyed: unhinted call doesn't reuse a hinted result.
 *
 * Isolation (test-only): hook-utils resolves its sessions dir from
 * AGENT_MEMORY_DIR = (CLAUDE_PROJECT_DIR || PLUGIN_ROOT)/cagents-memory. We set
 * CLAUDE_PROJECT_DIR to a per-test mkdtemp dir BEFORE loading hook-utils so the
 * fallbackHeuristic (legacy newest-first) scan walks an ISOLATED sessions dir.
 * Otherwise it would scan the real shared cagents-memory/sessions/ and a
 * concurrent live run/team session could out-sort the fixtures (the flake).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, utimesSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();
const HOOKS_DIR = join(PROJECT_ROOT, '.claude', 'hooks');

const SID_A = 'run_findactivesession-a_001';
const SID_B = 'run_findactivesession-b_002'; // sorts newest (002 > 001) for the legacy-heuristic pass

function makeNonTerminalSession(sessionsDir, sid, mtimeOffsetMs = 0) {
  const dir = join(sessionsDir, sid);
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeFileSync(
    join(dir, 'status.yaml'),
    `session_id: ${sid}\nphase: coordinating\npipeline_state: COORDINATING\n`
  );
  if (mtimeOffsetMs) {
    const t = (Date.now() + mtimeOffsetMs) / 1000;
    utimesSync(dir, t, t);
    utimesSync(join(dir, 'status.yaml'), t, t);
  }
  return dir;
}

function freshHookUtils() {
  // Always reload hook-utils to get a fresh cache AND re-resolve AGENT_MEMORY_DIR
  // against the current CLAUDE_PROJECT_DIR (set in beforeEach to the temp dir).
  delete require.cache[require.resolve(join(HOOKS_DIR, 'hook-utils.cjs'))];
  return require(join(HOOKS_DIR, 'hook-utils.cjs'));
}

describe('findActiveSession deterministic chain (WI-2)', () => {
  let utils;
  let tmpRoot;
  let sessionsDir;
  let DIR_A;
  let DIR_B;
  let prevProjectDir;

  beforeEach(() => {
    // Isolated project root → isolated cagents-memory/sessions, so the legacy
    // fallbackHeuristic scan can never see the real shared sessions directory.
    tmpRoot = mkdtempSync(join(tmpdir(), 'cagents-findactive-'));
    sessionsDir = join(tmpRoot, 'cagents-memory', 'sessions');
    mkdirSync(sessionsDir, { recursive: true });
    // hook-utils only treats a dir as PLUGIN_ROOT/PROJECT_ROOT-valid via
    // CLAUDE_PROJECT_DIR (no CLAUDE.md probe on that branch), so just point it here.
    prevProjectDir = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = tmpRoot;

    DIR_A = join(sessionsDir, SID_A);
    DIR_B = join(sessionsDir, SID_B);

    delete process.env.CAGENTS_ACTIVE_SESSION;
    utils = freshHookUtils();
    // Reset the module-level _cachedActiveSessions Map so a prior test's
    // resolution can never leak into this one (cross-test + cross-file safety).
    utils._resetActiveSessionCache();
  });

  afterEach(() => {
    delete process.env.CAGENTS_ACTIVE_SESSION;
    if (prevProjectDir === undefined) {
      delete process.env.CLAUDE_PROJECT_DIR;
    } else {
      process.env.CLAUDE_PROJECT_DIR = prevProjectDir;
    }
    // Leave no populated cache behind for the next file's hook-utils instance.
    try { utils._resetActiveSessionCache(); } catch {}
    if (tmpRoot && existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('returns hinted session regardless of B mtime', () => {
    makeNonTerminalSession(sessionsDir, SID_A, -60_000); // A is OLDER
    makeNonTerminalSession(sessionsDir, SID_B); // B is newest
    utils._resetActiveSessionCache();
    const result = utils.findActiveSession(SID_A);
    expect(result).toBe(DIR_A);
  });

  it('without hint or env var, default returns null (not newest)', () => {
    makeNonTerminalSession(sessionsDir, SID_A);
    makeNonTerminalSession(sessionsDir, SID_B);
    utils._resetActiveSessionCache();
    const result = utils.findActiveSession();
    expect(result).toBeNull();
  });

  it('with fallbackHeuristic:true, falls back to newest-first status-pass', () => {
    makeNonTerminalSession(sessionsDir, SID_A, -60_000);
    makeNonTerminalSession(sessionsDir, SID_B);
    utils._resetActiveSessionCache();
    const result = utils.findActiveSession({ fallbackHeuristic: true });
    // B should win (newest by name: 002 > 001) — and the isolated sessions dir
    // guarantees no real concurrent session can out-sort the fixtures.
    expect(result).toBe(DIR_B);
  });

  it('env-var (CAGENTS_ACTIVE_SESSION) wins when no hint provided', () => {
    makeNonTerminalSession(sessionsDir, SID_A);
    makeNonTerminalSession(sessionsDir, SID_B);
    process.env.CAGENTS_ACTIVE_SESSION = SID_A;
    utils._resetActiveSessionCache();
    const result = utils.findActiveSession();
    expect(result).toBe(DIR_A);
  });

  it('hint wins over env-var (H1 fix)', () => {
    makeNonTerminalSession(sessionsDir, SID_A);
    makeNonTerminalSession(sessionsDir, SID_B);
    process.env.CAGENTS_ACTIVE_SESSION = SID_B;
    utils._resetActiveSessionCache();
    const result = utils.findActiveSession(SID_A);
    expect(result).toBe(DIR_A);
  });

  it('returns null when hint points at terminal session (refuses to fall through)', () => {
    mkdirSync(join(DIR_A, 'workflow'), { recursive: true });
    writeFileSync(
      join(DIR_A, 'status.yaml'),
      `session_id: ${SID_A}\nphase: completed\npipeline_state: VALIDATED\n`
    );
    makeNonTerminalSession(sessionsDir, SID_B);
    utils._resetActiveSessionCache();
    const result = utils.findActiveSession(SID_A);
    expect(result).toBeNull();
  });

  it('composite cache key: hint result does NOT contaminate unhinted call (H6 fix)', () => {
    makeNonTerminalSession(sessionsDir, SID_A);
    utils._resetActiveSessionCache();
    const hinted = utils.findActiveSession(SID_A);
    expect(hinted).toBe(DIR_A);
    // Now call WITHOUT hint — must return null, not the cached hinted result.
    const unhinted = utils.findActiveSession();
    expect(unhinted).toBeNull();
  });
});
