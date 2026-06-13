/**
 * WI-2 unit tests for findActiveSession deterministic resolution chain.
 *
 * Contract:
 *   1. Hint pass: sessionHint → existing non-terminal dir wins regardless of mtime.
 *   2. With no hint and no env, default returns null (NOT the newest non-terminal).
 *   3. fallbackHeuristic:true restores the pre-v12.15.0 status+grace behavior.
 *   4. Cache is composite-keyed: unhinted call doesn't reuse a hinted result.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, utimesSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();
const HOOKS_DIR = join(PROJECT_ROOT, '.claude', 'hooks');
const SESSIONS_DIR = join(PROJECT_ROOT, 'cagents-memory', 'sessions');

const TS = Date.now().toString(36);
const SID_A = `run_findactivesession-a_${TS}`;
const SID_B = `run_findactivesession-b_${TS}`;
const DIR_A = join(SESSIONS_DIR, SID_A);
const DIR_B = join(SESSIONS_DIR, SID_B);

function makeNonTerminalSession(dir, sid, mtimeOffsetMs = 0) {
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
}

function freshHookUtils() {
  // Always reload hook-utils to get a fresh cache.
  delete require.cache[require.resolve(join(HOOKS_DIR, 'hook-utils.cjs'))];
  return require(join(HOOKS_DIR, 'hook-utils.cjs'));
}

describe('findActiveSession deterministic chain (WI-2)', () => {
  let utils;

  beforeEach(() => {
    if (existsSync(DIR_A)) rmSync(DIR_A, { recursive: true, force: true });
    if (existsSync(DIR_B)) rmSync(DIR_B, { recursive: true, force: true });
    delete process.env.CAGENTS_ACTIVE_SESSION;
    utils = freshHookUtils();
    // Reset the module-level _cachedActiveSessions Map so a prior test's
    // resolution can never leak into this one (cross-test + cross-file safety).
    utils._resetActiveSessionCache();
  });

  afterEach(() => {
    if (existsSync(DIR_A)) rmSync(DIR_A, { recursive: true, force: true });
    if (existsSync(DIR_B)) rmSync(DIR_B, { recursive: true, force: true });
    delete process.env.CAGENTS_ACTIVE_SESSION;
    // Leave no populated cache behind for the next file's hook-utils instance.
    try { utils._resetActiveSessionCache(); } catch {}
  });

  it('returns hinted session regardless of B mtime', () => {
    makeNonTerminalSession(DIR_A, SID_A, -60_000); // A is OLDER
    makeNonTerminalSession(DIR_B, SID_B); // B is newest
    utils._resetActiveSessionCache();
    const result = utils.findActiveSession(SID_A);
    expect(result).toBe(DIR_A);
  });

  it('without hint or env var, default returns null (not newest)', () => {
    makeNonTerminalSession(DIR_A, SID_A);
    makeNonTerminalSession(DIR_B, SID_B);
    utils._resetActiveSessionCache();
    const result = utils.findActiveSession();
    expect(result).toBeNull();
  });

  it('with fallbackHeuristic:true, falls back to newest-first status-pass', () => {
    makeNonTerminalSession(DIR_A, SID_A, -60_000);
    makeNonTerminalSession(DIR_B, SID_B);
    utils._resetActiveSessionCache();
    const result = utils.findActiveSession({ fallbackHeuristic: true });
    // B should win (newer)
    expect(result).toBe(DIR_B);
  });

  it('env-var (CAGENTS_ACTIVE_SESSION) wins when no hint provided', () => {
    makeNonTerminalSession(DIR_A, SID_A);
    makeNonTerminalSession(DIR_B, SID_B);
    process.env.CAGENTS_ACTIVE_SESSION = SID_A;
    utils._resetActiveSessionCache();
    const result = utils.findActiveSession();
    expect(result).toBe(DIR_A);
  });

  it('hint wins over env-var (H1 fix)', () => {
    makeNonTerminalSession(DIR_A, SID_A);
    makeNonTerminalSession(DIR_B, SID_B);
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
    makeNonTerminalSession(DIR_B, SID_B);
    utils._resetActiveSessionCache();
    const result = utils.findActiveSession(SID_A);
    expect(result).toBeNull();
  });

  it('composite cache key: hint result does NOT contaminate unhinted call (H6 fix)', () => {
    makeNonTerminalSession(DIR_A, SID_A);
    utils._resetActiveSessionCache();
    const hinted = utils.findActiveSession(SID_A);
    expect(hinted).toBe(DIR_A);
    // Now call WITHOUT hint — must return null, not the cached hinted result.
    const unhinted = utils.findActiveSession();
    expect(unhinted).toBeNull();
  });
});
