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

const SID_A = 'act_findactivesession-a_001';
const SID_B = 'act_findactivesession-b_002'; // sorts newest (002 > 001) for the legacy-heuristic pass

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

/**
 * findTeamSession deterministic chain (flake/bug fix: team-task-complete.cjs
 * resolving the WRONG session under concurrency).
 *
 * Contract (mirrors findActiveSession):
 *   1. team_* session_id pin → that dir wins, never a newer sibling.
 *   2. SDK-UUID session_id → falls through (not a cAgents dir name).
 *   3. CAGENTS_ACTIVE_SESSION (team_*) → wins when no usable hint.
 *   4. team_* pin whose dir is absent → null (refuses to leak to a sibling).
 *   5. No pin + no env → newest-team heuristic (back-compat last resort).
 *
 * Same temp-dir isolation as the suite above so the heuristic last-resort scan
 * can never see the real shared cagents-memory/sessions and out-sort fixtures.
 */
describe('findTeamSession deterministic chain (concurrency fix)', () => {
  let utils;
  let tmpRoot;
  let sessionsDir;
  let prevProjectDir;

  const TEAM_OWN = 'team_own-session_260317_001';
  const TEAM_SIBLING = 'team_sibling-newer_260901_999'; // sorts newest by name

  function makeTeamSession(sid, { terminal = false } = {}) {
    const dir = join(sessionsDir, sid);
    mkdirSync(join(dir, 'team', 'metrics'), { recursive: true });
    writeFileSync(
      join(dir, 'status.yaml'),
      `session_id: ${sid}\nphase: ${terminal ? 'completed' : 'executing'}\n`
    );
    return dir;
  }

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'cagents-findteam-'));
    sessionsDir = join(tmpRoot, 'cagents-memory', 'sessions');
    mkdirSync(sessionsDir, { recursive: true });
    prevProjectDir = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = tmpRoot;
    delete process.env.CAGENTS_ACTIVE_SESSION;
    utils = freshHookUtils();
  });

  afterEach(() => {
    delete process.env.CAGENTS_ACTIVE_SESSION;
    if (prevProjectDir === undefined) {
      delete process.env.CLAUDE_PROJECT_DIR;
    } else {
      process.env.CLAUDE_PROJECT_DIR = prevProjectDir;
    }
    if (tmpRoot && existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('session_id pin (non-terminal OR terminal) wins over a newer sibling — no heuristic leak', () => {
    // Non-terminal pin: own session wins despite TEAM_SIBLING sorting newest.
    const own = makeTeamSession(TEAM_OWN);
    makeTeamSession(TEAM_SIBLING); // newer by name — the OLD heuristic would pick this
    expect(utils.findTeamSession({ session_id: TEAM_OWN })).toBe(own);
    // Terminal pin still resolves (preserves team-stop SessionEnd finalization,
    // which must find an already-terminal team session by its session_id).
    rmSync(own, { recursive: true, force: true });
    const ownTerminal = makeTeamSession(TEAM_OWN, { terminal: true });
    expect(utils.findTeamSession({ session_id: TEAM_OWN })).toBe(ownTerminal);
  });

  it('UUID→env; absent team_ pin→null; non-team pin→null (no sibling leak — the leak source)', () => {
    // These assertions are the bug-proving core: under the OLD code each fell
    // through to the newest-team heuristic and resolved TEAM_SIBLING (the WRONG
    // session) instead of honoring the deterministic chain.
    const own = makeTeamSession(TEAM_OWN);
    makeTeamSession(TEAM_SIBLING);
    // (a) SDK transcript UUID is not a cAgents dir name → fall through to env var.
    process.env.CAGENTS_ACTIVE_SESSION = TEAM_OWN;
    expect(utils.findTeamSession({ session_id: '28d9d944-e2f5-4e03-b06b-d367625f1fdd' })).toBe(own);
    delete process.env.CAGENTS_ACTIVE_SESSION;
    // (b) cAgents-shaped team_ pin whose dir is absent → null, NOT a sibling.
    expect(utils.findTeamSession({ session_id: 'team_does-not-exist_260317_777' })).toBeNull();
    // (c) Non-team concrete session_id (a /act or synthetic-test session) → null.
    //     This is the leak SOURCE the flake came from: a Stop/TaskCompleted hook
    //     firing for a non-team session must NOT heuristic-resolve & mutate a
    //     sibling team session. (Production team hooks fire with a UUID → case a.)
    expect(utils.findTeamSession({ session_id: 'act_some-other-session_260317_001' })).toBeNull();
    expect(utils.findTeamSession({ session_id: 'cagents-thinking-400-test-xyz' })).toBeNull();
  });

  it('no pin + no env → newest-team heuristic (back-compat last resort)', () => {
    makeTeamSession(TEAM_OWN);
    const sibling = makeTeamSession(TEAM_SIBLING); // newest non-terminal wins
    expect(utils.findTeamSession({})).toBe(sibling);
  });
});
