/**
 * FIX-1 (OBJ-1 / WI-7) regression tests — SDK-UUID -> cAgents-session persisted map.
 *
 * Covers the WI-1/WI-2/WI-5 primitives added to .claude/hooks/hook-utils.cjs:
 *   - upsertSdkSessionMap(uuid, sessionDir)  (writer: pointer + marker, idempotent, guarded)
 *   - resolveSdkUuidToSession(uuid)          (reader: live->dir; terminal-but-present->preserve+null; missing-dir->reap+null)
 *   - findActiveSession(uuid)                (map-first: UUID hint -> map hit deterministic)
 *   - removeSdkPointer(uuid) / _pruneSdkMap() (GC / registry size bound)
 *
 * ---------------------------------------------------------------------------
 * FAILING-BEFORE / PASSING-AFTER (Bug-Driven Testing mandate)
 * ---------------------------------------------------------------------------
 * On pre-change HEAD (before WI-1/WI-2/WI-5), the SDK-UUID map does not exist:
 *
 *   1. upsertSdkSessionMap, resolveSdkUuidToSession, removeSdkPointer, _pruneSdkMap,
 *      _sdkMapDir and _sdkPointerPath are NOT exported from hook-utils.cjs, so every
 *      `utils.<fn>(...)` call in these tests throws
 *      `TypeError: utils.<fn> is not a function` -> the test ERRORS (fails).
 *
 *   2. Even if the helpers existed as no-ops, findActiveSession(uuid) on pre-change
 *      HEAD treats a UUID-shaped hint via the v12.16.0 fall-through: it SKIPS step 1
 *      (no map to consult), then env-var/promptHint are unset, so it returns null.
 *      The deterministic-map-hit assertions (`expect(findActiveSession(UUID)).toBe(DIR)`)
 *      therefore get `null` and FAIL. The map-hit is the positive discriminator.
 *
 *   3. The lazy-reap and GC assertions depend on pointer files under
 *      cagents-memory/_system/sdk_session_map/ which pre-change HEAD never creates,
 *      so `existsSync(pointerPath)` is false where the test expects true -> FAIL.
 *
 * After WI-1/WI-2/WI-5 land, the helpers exist, the pointer registry is written,
 * findActiveSession consults the map first for UUID hints, and every assertion passes.
 * (Proven by reasoning, not `git stash` — the shared working tree carries multiple
 * in-flight changes, so a stash-based before/after would be unsafe here.)
 *
 * ---------------------------------------------------------------------------
 * Isolation (matches tests/hooks/find-active-session-deterministic.test.js):
 * hook-utils resolves AGENT_MEMORY_DIR = (CLAUDE_PROJECT_DIR || PLUGIN_ROOT)/cagents-memory
 * at module load. We set CLAUDE_PROJECT_DIR to a per-test mkdtemp dir BEFORE loading
 * hook-utils (via freshHookUtils), so both the sessions dir AND the pointer registry
 * (_system/sdk_session_map/) live under an ISOLATED temp root — no pollution of the
 * real cagents-memory, and no real concurrent session can interfere. Cache is reset
 * between cases via _resetActiveSessionCache().
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();
const HOOKS_DIR = join(PROJECT_ROOT, '.claude', 'hooks');

// Canonical SDK transcript UUID shape (8-4-4-4-12 lowercase hex).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const UUID_A = '28d9d944-e2f5-4e03-b06b-d367625f1fdd';
const UUID_B = '11111111-2222-3333-4444-555555555555';
const UUID_UNMAPPED = '99999999-8888-7777-6666-555544443333';

const SID_A = 'run_sdkmap-a_001';
const SID_B = 'run_sdkmap-b_002';

function makeNonTerminalSession(sessionsDir, sid) {
  const dir = join(sessionsDir, sid);
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeFileSync(
    join(dir, 'status.yaml'),
    `session_id: ${sid}\nphase: coordinating\npipeline_state: COORDINATING\n`
  );
  return dir;
}

function makeTerminalSession(sessionsDir, sid) {
  const dir = join(sessionsDir, sid);
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeFileSync(
    join(dir, 'status.yaml'),
    `session_id: ${sid}\nphase: completed\npipeline_state: VALIDATED\n`
  );
  return dir;
}

function finalizeSession(sessionsDir, sid) {
  // Overwrite an existing session's status.yaml to a terminal state in place.
  writeFileSync(
    join(sessionsDir, sid, 'status.yaml'),
    `session_id: ${sid}\nphase: completed\npipeline_state: VALIDATED\n`
  );
}

function freshHookUtils() {
  // Reload hook-utils to re-resolve AGENT_MEMORY_DIR against the temp
  // CLAUDE_PROJECT_DIR and to start from a clean module-level cache.
  delete require.cache[require.resolve(join(HOOKS_DIR, 'hook-utils.cjs'))];
  return require(join(HOOKS_DIR, 'hook-utils.cjs'));
}

function livePointerCount(mapDir) {
  // Count only real UUID-shaped pointer files (ignore any transient *.lock dirs).
  if (!existsSync(mapDir)) return 0;
  return readdirSync(mapDir).filter((n) => UUID_RE.test(n)).length;
}

describe('SDK-UUID map resolution (FIX-1 / WI-7 / OBJ-1)', () => {
  let utils;
  let tmpRoot;
  let sessionsDir;
  let mapDir;
  let DIR_A;
  let DIR_B;
  let prevProjectDir;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'cagents-sdkmap-'));
    sessionsDir = join(tmpRoot, 'cagents-memory', 'sessions');
    mkdirSync(sessionsDir, { recursive: true });
    prevProjectDir = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = tmpRoot;
    delete process.env.CAGENTS_ACTIVE_SESSION;

    DIR_A = join(sessionsDir, SID_A);
    DIR_B = join(sessionsDir, SID_B);

    utils = freshHookUtils();
    utils._resetActiveSessionCache();
    mapDir = utils._sdkMapDir(); // {tmpRoot}/cagents-memory/_system/sdk_session_map
  });

  afterEach(() => {
    delete process.env.CAGENTS_ACTIVE_SESSION;
    if (prevProjectDir === undefined) {
      delete process.env.CLAUDE_PROJECT_DIR;
    } else {
      process.env.CLAUDE_PROJECT_DIR = prevProjectDir;
    }
    try { utils._resetActiveSessionCache(); } catch { /* ignore */ }
    if (tmpRoot && existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('upsert then findActiveSession(uuid) returns the correct session dir (deterministic map hit)', () => {
    makeNonTerminalSession(sessionsDir, SID_A);
    utils.upsertSdkSessionMap(UUID_A, DIR_A);
    utils._resetActiveSessionCache();

    // UUID-shaped hint resolves via the persisted map — deterministically, no heuristic.
    expect(utils.findActiveSession(UUID_A)).toBe(DIR_A);

    // Pointer content is the owning session basename; marker records the UUID.
    expect(readFileSync(utils._sdkPointerPath(UUID_A), 'utf8').trim()).toBe(SID_A);
    expect(readFileSync(join(DIR_A, 'session.sdk_id'), 'utf8').trim()).toBe(UUID_A);
  });

  it('a UUID with NO pointer -> findActiveSession returns null and never resolves to a sibling', () => {
    // Two concurrent same-dir sessions; only UUID_A is mapped.
    makeNonTerminalSession(sessionsDir, SID_A);
    makeNonTerminalSession(sessionsDir, SID_B);
    utils.upsertSdkSessionMap(UUID_A, DIR_A);
    // Explicitly ensure no env fallback can leak a sibling.
    delete process.env.CAGENTS_ACTIVE_SESSION;
    utils._resetActiveSessionCache();

    // The mapped UUID still resolves to its OWN session (positive discriminator).
    expect(utils.findActiveSession(UUID_A)).toBe(DIR_A);

    utils._resetActiveSessionCache();
    // The unmapped UUID resolves to NOTHING — not A, not B.
    const unmapped = utils.findActiveSession(UUID_UNMAPPED);
    expect(unmapped).toBeNull();
    expect(unmapped).not.toBe(DIR_A);
    expect(unmapped).not.toBe(DIR_B);
  });

  it('resolveSdkUuidToSession returns the dir for a live/non-terminal target', () => {
    makeNonTerminalSession(sessionsDir, SID_A);
    utils.upsertSdkSessionMap(UUID_A, DIR_A);

    expect(utils.resolveSdkUuidToSession(UUID_A)).toBe(DIR_A);
    // Pointer intact (live target is not reaped).
    expect(existsSync(utils._sdkPointerPath(UUID_A))).toBe(true);
  });

  it('resolveSdkUuidToSession returns null but PRESERVES the pointer for a present-but-terminal target', () => {
    // Upsert while the target is LIVE so the pointer survives upsert-time prune.
    makeNonTerminalSession(sessionsDir, SID_A);
    utils.upsertSdkSessionMap(UUID_A, DIR_A);
    const pointerPath = utils._sdkPointerPath(UUID_A);
    expect(existsSync(pointerPath)).toBe(true);

    // The owning session reads terminal (pipeline_state: VALIDATED) but its DIRECTORY
    // is still present — a transient revision-cycle / mid-rewrite window.
    finalizeSession(sessionsDir, SID_A);

    const resolved = utils.resolveSdkUuidToSession(UUID_A);
    expect(resolved).toBeNull();                       // resolution GATE unchanged: terminal -> miss
    // WI-2 (run_session-init-gate-flake_260723_001): a present-but-terminal pointer is
    // NOT reaped — reaping a LIVE pointer on a transient terminal read is the root cause
    // of the session-init-gate false-DENY. Only a genuinely-MISSING dir is reaped (next
    // test). removeSdkPointer (SessionEnd) still explicitly unlinks it on finalization.
    expect(existsSync(pointerPath)).toBe(true);        // PRESERVED across the terminal window
  });

  it('resolveSdkUuidToSession returns null AND lazy-reaps the pointer for a MISSING target dir', () => {
    makeNonTerminalSession(sessionsDir, SID_A);
    utils.upsertSdkSessionMap(UUID_A, DIR_A);
    const pointerPath = utils._sdkPointerPath(UUID_A);
    expect(existsSync(pointerPath)).toBe(true);

    // Session directory disappears entirely (finalized + archived/removed).
    rmSync(DIR_A, { recursive: true, force: true });

    const resolved = utils.resolveSdkUuidToSession(UUID_A);
    expect(resolved).toBeNull();
    expect(existsSync(pointerPath)).toBe(false);       // LAZY REAP on missing target
  });

  it('GC: _pruneSdkMap reaps missing-dir + preserves present-but-terminal; removeSdkPointer clears the rest', () => {
    const U1 = '11111111-1111-1111-1111-111111111111';
    const U2 = '22222222-2222-2222-2222-222222222222';
    const U3 = '33333333-3333-3333-3333-333333333333';
    const S1 = 'run_gc-one_001';
    const S2 = 'run_gc-two_002';
    const S3 = 'run_gc-three_003';
    const D1 = makeNonTerminalSession(sessionsDir, S1);
    const D2 = makeNonTerminalSession(sessionsDir, S2);
    const D3 = makeNonTerminalSession(sessionsDir, S3);

    utils.upsertSdkSessionMap(U1, D1);
    utils.upsertSdkSessionMap(U2, D2);
    utils.upsertSdkSessionMap(U3, D3);
    // Three live sessions -> three pointers.
    expect(livePointerCount(mapDir)).toBe(3);

    // S1 goes terminal-but-PRESENT (transient window); S2's dir is removed (missing);
    // S3 stays live.
    finalizeSession(sessionsDir, S1);
    rmSync(D2, { recursive: true, force: true });

    utils._pruneSdkMap();
    // WI-2 (run_session-init-gate-flake_260723_001): _pruneSdkMap reaps ONLY
    // genuinely-MISSING-dir pointers. A present-but-terminal pointer is PRESERVED so a
    // concurrent upsert-time prune cannot destroy a sibling's LIVE pointer (the reap
    // that caused the session-init-gate false-DENY).
    expect(existsSync(utils._sdkPointerPath(U1))).toBe(true);  // terminal-but-present -> kept
    expect(existsSync(utils._sdkPointerPath(U2))).toBe(false); // missing  -> pruned
    expect(existsSync(utils._sdkPointerPath(U3))).toBe(true);  // live     -> kept
    expect(livePointerCount(mapDir)).toBe(2);

    // Explicit finalization unlink (removeSdkPointer, the SessionEnd GC layer) clears a
    // pointer regardless of terminal state; idempotent.
    utils.removeSdkPointer(U1);   // terminal-but-present -> explicitly removed at SessionEnd
    utils.removeSdkPointer(U3);   // live -> explicitly removed at its SessionEnd
    expect(existsSync(utils._sdkPointerPath(U1))).toBe(false);
    expect(existsSync(utils._sdkPointerPath(U3))).toBe(false);
    expect(livePointerCount(mapDir)).toBe(0);
    expect(() => utils.removeSdkPointer(U3)).not.toThrow(); // repeat = no-op
  });

  it('idempotency: repeat upsert of the same pair leaves exactly one pointer with correct content', () => {
    makeNonTerminalSession(sessionsDir, SID_A);
    utils.upsertSdkSessionMap(UUID_A, DIR_A);
    utils.upsertSdkSessionMap(UUID_A, DIR_A);
    utils.upsertSdkSessionMap(UUID_A, DIR_A);

    // Exactly one pointer file, content = owning session basename.
    expect(livePointerCount(mapDir)).toBe(1);
    expect(readFileSync(utils._sdkPointerPath(UUID_A), 'utf8').trim()).toBe(SID_A);
    // Marker written once with the UUID.
    expect(readFileSync(join(DIR_A, 'session.sdk_id'), 'utf8').trim()).toBe(UUID_A);
  });

  it('SDK_UUID_RE guard: a non-UUID sdkUuid is a no-op (no pointer, no marker)', () => {
    makeNonTerminalSession(sessionsDir, SID_A);
    utils.upsertSdkSessionMap('not-a-valid-uuid', DIR_A);

    expect(livePointerCount(mapDir)).toBe(0);
    expect(existsSync(join(DIR_A, 'session.sdk_id'))).toBe(false);
    // Reader guard mirrors it: a non-UUID never resolves.
    expect(utils.resolveSdkUuidToSession('not-a-valid-uuid')).toBeNull();
  });
});
