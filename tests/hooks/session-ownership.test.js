/**
 * Strict session ownership (act_concurrent-session-hooks_260927_001, WI-1).
 *
 * Two transcripts share one project dir. A hook that holds an SDK UUID must
 * act only on a session that the UUID owns. These tests pin the new
 * primitives in hook-utils.cjs and the ownership filter on the heuristics:
 *   - getSessionOwner / isOwnedBy / resolveOwnedSession / claimSession
 *   - findMostRecentSessionDir and findActiveSession({fallbackHeuristic})
 *   - findTeamSession step 3 (newest-team heuristic)
 *   - resolveSdkUuidOwner
 *
 * Isolation: CLAUDE_PROJECT_DIR points at a per-test temp dir before
 * hook-utils loads, so the sessions dir and the map live under that dir.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, utimesSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();
const HOOKS_DIR = join(PROJECT_ROOT, '.claude', 'hooks');

const UUID_A = 'aaaaaaaa-1111-2222-3333-444444444444';
const UUID_B = 'bbbbbbbb-1111-2222-3333-444444444444';

function freshHookUtils() {
  delete require.cache[require.resolve(join(HOOKS_DIR, 'hook-utils.cjs'))];
  return require(join(HOOKS_DIR, 'hook-utils.cjs'));
}

function makeSession(sessionsDir, sid, { terminal = false, owner, mtimeOffsetSec = 0 } = {}) {
  const dir = join(sessionsDir, sid);
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeFileSync(
    join(dir, 'status.yaml'),
    terminal
      ? `session_id: ${sid}\nphase: completed\npipeline_state: VALIDATED\n`
      : `session_id: ${sid}\nphase: coordinating\npipeline_state: COORDINATED\n`
  );
  if (owner) writeFileSync(join(dir, 'session.sdk_id'), owner);
  if (mtimeOffsetSec) {
    const t = Date.now() / 1000 + mtimeOffsetSec;
    utimesSync(dir, t, t);
  }
  return dir;
}

describe('strict session ownership (WI-1)', () => {
  let utils;
  let tmpRoot;
  let sessionsDir;
  let mapDir;
  let prevProjectDir;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'cagents-ownership-'));
    sessionsDir = join(tmpRoot, 'cagents-memory', 'sessions');
    mkdirSync(sessionsDir, { recursive: true });
    prevProjectDir = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = tmpRoot;
    delete process.env.CAGENTS_ACTIVE_SESSION;
    utils = freshHookUtils();
    utils._resetActiveSessionCache();
    mapDir = utils._sdkMapDir();
  });

  afterEach(() => {
    delete process.env.CAGENTS_ACTIVE_SESSION;
    if (prevProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = prevProjectDir;
    try { utils._resetActiveSessionCache(); } catch { /* ignore */ }
    if (tmpRoot && existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
  });

  function writePointer(uuid, sid) {
    mkdirSync(mapDir, { recursive: true });
    writeFileSync(join(mapDir, uuid), sid);
  }

  it('exports the four ownership functions', () => {
    for (const f of ['getSessionOwner', 'isOwnedBy', 'resolveOwnedSession', 'claimSession']) {
      expect(typeof utils[f]).toBe('function');
    }
  });

  it('owned via map pointer: resolveOwnedSession returns the mapped dir', () => {
    const dir = makeSession(sessionsDir, 'act_own-map_260927_001');
    writePointer(UUID_A, 'act_own-map_260927_001');
    expect(utils.isOwnedBy(dir, UUID_A)).toBe(true);
    expect(utils.resolveOwnedSession(UUID_A)).toBe(dir);
  });

  it('owned via marker: resolveOwnedSession finds it by scan and re-seeds the map', () => {
    const dir = makeSession(sessionsDir, 'act_own-marker_260927_001', { owner: UUID_A });
    expect(existsSync(join(mapDir, UUID_A))).toBe(false);
    expect(utils.getSessionOwner(dir)).toBe(UUID_A);
    expect(utils.isOwnedBy(dir, UUID_A)).toBe(true);
    expect(utils.resolveOwnedSession(UUID_A)).toBe(dir);
    expect(readFileSync(join(mapDir, UUID_A), 'utf8')).toBe('act_own-marker_260927_001');
  });

  it('foreign: a session owned by another UUID is never owned or resolved', () => {
    const dir = makeSession(sessionsDir, 'act_foreign_260927_001', { owner: UUID_B });
    expect(utils.isOwnedBy(dir, UUID_A)).toBe(false);
    expect(utils.resolveOwnedSession(UUID_A)).toBeNull();
    // A stale pointer of A to the B-owned dir does not override the marker.
    writePointer(UUID_A, 'act_foreign_260927_001');
    expect(utils.isOwnedBy(dir, UUID_A)).toBe(false);
    expect(utils.resolveOwnedSession(UUID_A)).toBeNull();
    expect(utils.resolveSdkUuidOwner(UUID_A)).toBeNull();
  });

  it('unclaimed: resolveOwnedSession returns null; getSessionOwner returns null', () => {
    const dir = makeSession(sessionsDir, 'act_unclaimed_260927_001');
    expect(utils.getSessionOwner(dir)).toBeNull();
    expect(utils.isOwnedBy(dir, UUID_A)).toBe(false);
    expect(utils.resolveOwnedSession(UUID_A)).toBeNull();
  });

  it('falsy uuid: isOwnedBy false, resolveOwnedSession null', () => {
    const dir = makeSession(sessionsDir, 'act_falsy_260927_001', { owner: UUID_A });
    expect(utils.isOwnedBy(dir, '')).toBe(false);
    expect(utils.isOwnedBy(dir, undefined)).toBe(false);
    expect(utils.resolveOwnedSession('')).toBeNull();
    expect(utils.resolveOwnedSession(null)).toBeNull();
  });

  it('terminal owned session: excluded by default, included with includeTerminal', () => {
    const dir = makeSession(sessionsDir, 'act_terminal_260927_001', { owner: UUID_A, terminal: true });
    expect(utils.resolveOwnedSession(UUID_A)).toBeNull();
    expect(utils.resolveOwnedSession(UUID_A, { includeTerminal: true })).toBe(dir);
    // Same through the map pointer path.
    writePointer(UUID_A, 'act_terminal_260927_001');
    expect(utils.resolveOwnedSession(UUID_A)).toBeNull();
    expect(utils.resolveOwnedSession(UUID_A, { includeTerminal: true })).toBe(dir);
  });

  it('claim race: first claimant wins, a different UUID is refused, marker unchanged', () => {
    const dir = makeSession(sessionsDir, 'act_claim_260927_001');
    expect(utils.claimSession(dir, UUID_A)).toBe(true);
    expect(readFileSync(join(dir, 'session.sdk_id'), 'utf8')).toBe(UUID_A);
    expect(readFileSync(join(mapDir, UUID_A), 'utf8')).toBe('act_claim_260927_001');

    expect(utils.claimSession(dir, UUID_B)).toBe(false);
    expect(readFileSync(join(dir, 'session.sdk_id'), 'utf8')).toBe(UUID_A);
    expect(existsSync(join(mapDir, UUID_B))).toBe(false);

    // Re-claim by the owner is idempotent and restores a missing pointer.
    rmSync(join(mapDir, UUID_A));
    expect(utils.claimSession(dir, UUID_A)).toBe(true);
    expect(readFileSync(join(mapDir, UUID_A), 'utf8')).toBe('act_claim_260927_001');
  });

  it('claim race in parallel child processes: exactly one UUID wins', async () => {
    const dir = makeSession(sessionsDir, 'act_claim-par_260927_001');
    const { spawn } = await import('child_process');
    const uuids = Array.from({ length: 6 }, (_, i) => `cccccccc-0000-0000-0000-00000000000${i}`);
    const script = `const u=require(${JSON.stringify(join(HOOKS_DIR, 'hook-utils.cjs'))});` +
      `process.stdout.write(String(u.claimSession(process.argv[1], process.argv[2])));`;
    const results = await Promise.all(uuids.map((uuid) => new Promise((resolve) => {
      const child = spawn(process.execPath, ['-e', script, dir, uuid], {
        env: { ...process.env, CLAUDE_PROJECT_DIR: tmpRoot },
      });
      let out = '';
      child.stdout.on('data', (d) => { out += d; });
      child.on('close', () => resolve({ uuid, won: out.trim() === 'true' }));
    })));
    const winners = results.filter((r) => r.won);
    expect(winners).toHaveLength(1);
    expect(readFileSync(join(dir, 'session.sdk_id'), 'utf8')).toBe(winners[0].uuid);
  }, 60000);

  it('claimSession refuses a bad uuid and a missing dir without writing', () => {
    const dir = makeSession(sessionsDir, 'act_claim-bad_260927_001');
    expect(utils.claimSession(dir, 'not-a-uuid')).toBe(false);
    expect(utils.claimSession(join(sessionsDir, 'act_missing_260927_001'), UUID_A)).toBe(false);
    expect(existsSync(join(dir, 'session.sdk_id'))).toBe(false);
  });

  it('findMostRecentSessionDir never returns a foreign session when a UUID is supplied', () => {
    const own = makeSession(sessionsDir, 'act_mine_260927_001', { owner: UUID_A, mtimeOffsetSec: -100 });
    makeSession(sessionsDir, 'act_theirs_260927_002', { owner: UUID_B, mtimeOffsetSec: 0 });
    makeSession(sessionsDir, 'act_nobody_260927_003', { mtimeOffsetSec: 50 });
    expect(utils.findMostRecentSessionDir({ sdkUuid: UUID_A })).toBe(own);
    expect(utils.findMostRecentSessionDir({ sdkUuid: UUID_A, includeTerminal: true })).toBe(own);
    // No UUID: legacy behavior, the newest dir wins.
    expect(utils.findMostRecentSessionDir()).toBe(join(sessionsDir, 'act_nobody_260927_003'));
  });

  it('findMostRecentSessionDir returns null when the UUID owns nothing', () => {
    makeSession(sessionsDir, 'act_theirs_260927_002', { owner: UUID_B });
    makeSession(sessionsDir, 'act_nobody_260927_003');
    expect(utils.findMostRecentSessionDir({ sdkUuid: UUID_A })).toBeNull();
  });

  it('findActiveSession fallbackHeuristic never returns a foreign or unclaimed session for a UUID', () => {
    // Newest-by-name sort puts _003 first. It is foreign; _002 is unclaimed.
    makeSession(sessionsDir, 'act_theirs_260927_003', { owner: UUID_B });
    makeSession(sessionsDir, 'act_nobody_260927_002');
    const own = makeSession(sessionsDir, 'act_mine_260927_001', { owner: UUID_A });
    expect(utils.findActiveSession({ sessionHint: UUID_A, fallbackHeuristic: true })).toBe(own);
    utils._resetActiveSessionCache();
    expect(utils.findActiveSession({ sdkUuid: UUID_A, fallbackHeuristic: true })).toBe(own);
    utils._resetActiveSessionCache();
    rmSync(own, { recursive: true, force: true });
    expect(utils.findActiveSession({ sessionHint: UUID_A, fallbackHeuristic: true })).toBeNull();
  });

  it('findActiveSession grace pass skips a foreign session without status.yaml', () => {
    const foreign = join(sessionsDir, 'act_theirs-grace_260927_001');
    mkdirSync(foreign, { recursive: true });
    writeFileSync(join(foreign, 'instruction.yaml'), 'request: x\n');
    writeFileSync(join(foreign, 'session.sdk_id'), UUID_B);
    expect(utils.findActiveSession({ sessionHint: UUID_A, fallbackHeuristic: true })).toBeNull();
    utils._resetActiveSessionCache();
    expect(utils.findActiveSession({ sessionHint: UUID_B, fallbackHeuristic: true })).toBe(foreign);
  });

  it('findTeamSession step 3 skips a team session owned by another UUID', () => {
    makeSession(sessionsDir, 'team_theirs_260927_002', { owner: UUID_B });
    makeSession(sessionsDir, 'team_nobody_260927_003');
    expect(utils.findTeamSession({ session_id: UUID_A })).toBeNull();
    const own = makeSession(sessionsDir, 'team_mine_260927_001', { owner: UUID_A });
    expect(utils.findTeamSession({ session_id: UUID_A })).toBe(own);
    // No hint: legacy newest-team behavior.
    expect(utils.findTeamSession({})).toBe(join(sessionsDir, 'team_nobody_260927_003'));
  });

  it('findActiveSession env step skips a foreign-owned session when a UUID is known', () => {
    const foreign = makeSession(sessionsDir, 'act_theirs-env_260927_001', { owner: UUID_B });
    process.env.CAGENTS_ACTIVE_SESSION = 'act_theirs-env_260927_001';
    expect(utils.findActiveSession({ sessionHint: UUID_A })).toBeNull();
    utils._resetActiveSessionCache();
    expect(utils.findActiveSession({ sdkUuid: UUID_A })).toBeNull();
    utils._resetActiveSessionCache();
    // No UUID: legacy behavior returns the env session.
    expect(utils.findActiveSession({})).toBe(foreign);
    utils._resetActiveSessionCache();
    // The owner UUID still gets it.
    expect(utils.findActiveSession({ sessionHint: UUID_B })).toBe(foreign);
  });

  it('findActiveSession env step keeps an unclaimed session for a UUID caller', () => {
    const unclaimed = makeSession(sessionsDir, 'act_nobody-env_260927_001');
    process.env.CAGENTS_ACTIVE_SESSION = 'act_nobody-env_260927_001';
    expect(utils.findActiveSession({ sessionHint: UUID_A })).toBe(unclaimed);
  });

  it('findActiveSession map step rejects a pointer to a foreign-marked session', () => {
    makeSession(sessionsDir, 'act_theirs-map_260927_001', { owner: UUID_B });
    writePointer(UUID_A, 'act_theirs-map_260927_001');
    expect(utils.findActiveSession({ sessionHint: UUID_A })).toBeNull();
  });

  it('findTeamSession map step rejects a pointer to a foreign-marked team session', () => {
    makeSession(sessionsDir, 'team_theirs-map_260927_001', { owner: UUID_B });
    writePointer(UUID_A, 'team_theirs-map_260927_001');
    expect(utils.findTeamSession({ session_id: UUID_A })).toBeNull();
    const own = makeSession(sessionsDir, 'team_mine-map_260927_000', { owner: UUID_A });
    expect(utils.findTeamSession({ session_id: UUID_A })).toBe(own);
  });

  it('findTeamSession env step skips a foreign-owned team session when a UUID is known', () => {
    const foreign = makeSession(sessionsDir, 'team_theirs-env_260927_001', { owner: UUID_B });
    process.env.CAGENTS_ACTIVE_SESSION = 'team_theirs-env_260927_001';
    expect(utils.findTeamSession({ session_id: UUID_A })).toBeNull();
    // No UUID: legacy behavior returns the env team session.
    expect(utils.findTeamSession({})).toBe(foreign);
  });

  it('no-UUID callers still get an unclaimed session (legacy behavior pinned)', () => {
    const unclaimed = makeSession(sessionsDir, 'act_nobody-legacy_260927_001');
    expect(utils.findMostRecentSessionDir()).toBe(unclaimed);
    expect(utils.findActiveSession({ fallbackHeuristic: true })).toBe(unclaimed);
  });
});
