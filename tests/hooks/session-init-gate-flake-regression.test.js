/**
 * WI-3 regression test — session-init-gate intermittent false-DENY (the "sticky reap").
 *
 * Pins the PRODUCTION trigger characterized in WI-1
 * (cagents-memory/sessions/run_session-init-gate-flake_260723_001/outputs/wi1-characterization.md):
 *
 *   The Phase-1 session-presence HARD-DENY (session-init-gate.cjs:271-277) fires
 *   because the LAZY-REAP in resolveSdkUuidToSession (hook-utils.cjs) DESTRUCTIVELY
 *   UNLINKS a LIVE SDK-UUID map pointer whenever _tryResolveCandidate reads the
 *   target session's status.yaml as TERMINAL — even when that terminal read is
 *   TRANSIENT (a revision-cycle VALIDATED/failed window, or a mid-rewrite read) and
 *   the session dir still exists on disk. Destroying the pointer collapses the
 *   session off the deterministic v12.32.0 SDK-UUID map onto the unreliable env-var
 *   + legacy-heuristic path, so a later terminal/empty-status window with the env
 *   var absent produces the "random" Phase-1 false-DENY. The SAME destructive
 *   on-terminal logic exists in _pruneSdkMap (called by upsertSdkSessionMap on every
 *   confident seed), so a concurrent session's upsert can also prune a
 *   momentarily-terminal-but-PRESENT session's pointer.
 *
 * THE FIX (hook-utils.cjs): both reap sites unlink a pointer ONLY when the target
 * session DIRECTORY is genuinely MISSING from disk, NOT merely present-but-terminal.
 * The resolution GATE is unchanged (a terminal target still resolves to null — a
 * reused/dead UUID never mis-resolves); only the destructive UNLINK side-effect for
 * a present-but-terminal target is removed.
 *
 * ---------------------------------------------------------------------------
 * FAILING-BEFORE / PASSING-AFTER (Bug-Driven Testing mandate)
 * ---------------------------------------------------------------------------
 * On pre-fix HEAD (b0232815), resolveSdkUuidToSession unlinks the pointer for ANY
 * null resolution (terminal OR missing), and _pruneSdkMap keeps ONLY non-terminal
 * targets:
 *   - Case 1 "pointer survives a transient terminal read": existsSync(pointerPath)
 *     is FALSE after the terminal read (reaped) — the assertion expects TRUE -> FAIL.
 *   - Case 2 "deterministic recovery": with the pointer reaped, findActiveSession(uuid)
 *     (no env, no fallback) MISSES the map and returns null — expects DIR_A -> FAIL.
 *   - Case 5 "_pruneSdkMap keeps present-but-terminal": the present-but-terminal
 *     pointer is pruned, existsSync is FALSE — expects TRUE -> FAIL.
 * Cases 3 and 4 pin the INVARIANTS that must survive the fix (genuine absence still
 * DENIES; a genuinely-MISSING-dir pointer is STILL reaped) — they pass both before
 * and after, guarding against an over-correction to "always allow" / "never reap".
 *
 * ---------------------------------------------------------------------------
 * Isolation (matches tests/hooks/sdk-uuid-map-resolution.test.js +
 * outputs/repro-session-init-gate-flake.cjs):
 * hook-utils resolves AGENT_MEMORY_DIR = (CLAUDE_PROJECT_DIR || PLUGIN_ROOT)/cagents-memory
 * at module load. We set CLAUDE_PROJECT_DIR to a per-test mkdtemp dir BEFORE loading
 * hook-utils (freshHookUtils) AND session-init-gate (freshGate — required AFTER
 * hook-utils so it binds to the temp-rooted instance), so the sessions dir + the
 * SDK-UUID pointer registry live under an ISOLATED temp root. Cache is reset between
 * cases via _resetActiveSessionCache(). CAGENTS_DISPATCH_IMPORT suppresses the gate's
 * standalone createHook() stdin registration so we can call handler() directly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();
const HOOKS_DIR = join(PROJECT_ROOT, '.claude', 'hooks');

// Realistic production SDK transcript UUIDs (8-4-4-4-12 lowercase hex).
const UUID = '28d9d944-e2f5-4e03-b06b-d367625f1fdd';
const UUID_B = '11111111-2222-3333-4444-555555555555';
const SID = 'run_flake-regress_260723_001';
const SID_B = 'run_flake-regress-b_260723_002';

function freshHookUtils() {
  delete require.cache[require.resolve(join(HOOKS_DIR, 'hook-utils.cjs'))];
  return require(join(HOOKS_DIR, 'hook-utils.cjs'));
}

function freshGate() {
  // Re-require the gate AFTER hook-utils so it binds to the fresh (temp-rooted) utils.
  // CAGENTS_DISPATCH_IMPORT suppresses the standalone createHook() registration.
  delete require.cache[require.resolve(join(HOOKS_DIR, 'session-init-gate.cjs'))];
  process.env.CAGENTS_DISPATCH_IMPORT = '1';
  const mod = require(join(HOOKS_DIR, 'session-init-gate.cjs'));
  delete process.env.CAGENTS_DISPATCH_IMPORT;
  return mod;
}

function statusFor(sid, phaseLine) {
  return `session_id: ${sid}\n${phaseLine}\n`;
}
function makeNonTerminal(sessionsDir, sid) {
  const dir = join(sessionsDir, sid);
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeFileSync(join(dir, 'status.yaml'), statusFor(sid, 'phase: coordinating\npipeline_state: COORDINATING'));
  return dir;
}
function makeTerminalInPlace(sessionsDir, sid) {
  // Overwrite an existing session's status.yaml to a terminal state (dir stays present).
  writeFileSync(join(sessionsDir, sid, 'status.yaml'), statusFor(sid, 'phase: completed\npipeline_state: VALIDATED'));
}
function reopenNonTerminal(sessionsDir, sid) {
  // Revision routed back to a non-terminal phase (dir was never removed).
  writeFileSync(join(sessionsDir, sid, 'status.yaml'), statusFor(sid, 'phase: coordinating\npipeline_state: COORDINATING'));
}

function gateInput(uuid) {
  return {
    tool_name: 'Agent',
    tool_input: { subagent_type: 'cagents:backend-developer' },
    session_id: uuid,
  };
}
function isDenyVerdict(v) {
  if (!v) return false;
  if (v.deny === true) return true;
  return !!(v.hookSpecificOutput && v.hookSpecificOutput.permissionDecision === 'deny');
}
function denyReason(v) {
  if (!v) return '';
  return v.reason || (v.hookSpecificOutput && v.hookSpecificOutput.permissionDecisionReason) || '';
}

describe('session-init-gate flake regression — sticky lazy-reap of a LIVE pointer (WI-2/WI-3)', () => {
  let utils;
  let gate;
  let tmpRoot;
  let sessionsDir;
  let DIR;
  let DIR_B;
  let prevProjectDir;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'cagents-gateflake-'));
    sessionsDir = join(tmpRoot, 'cagents-memory', 'sessions');
    mkdirSync(sessionsDir, { recursive: true });
    prevProjectDir = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = tmpRoot;
    delete process.env.CAGENTS_ACTIVE_SESSION;
    delete process.env.CAGENTS_SESSION_ID;

    DIR = join(sessionsDir, SID);
    DIR_B = join(sessionsDir, SID_B);

    utils = freshHookUtils();
    utils._resetActiveSessionCache();
    gate = freshGate();
  });

  afterEach(() => {
    delete process.env.CAGENTS_ACTIVE_SESSION;
    delete process.env.CAGENTS_SESSION_ID;
    if (prevProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = prevProjectDir;
    try { utils._resetActiveSessionCache(); } catch { /* ignore */ }
    if (tmpRoot && existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
  });

  // ------------------------------------------------------------------
  // Case 1 — CORE RED->GREEN: a LIVE pointer SURVIVES a transient terminal read.
  //   The resolution gate is unchanged (terminal -> null miss), but the pointer
  //   file must NOT be unlinked when the target dir is present-but-terminal.
  // ------------------------------------------------------------------
  it('preserves a LIVE pointer across a transient terminal read (resolution still misses)', () => {
    makeNonTerminal(sessionsDir, SID);
    utils.upsertSdkSessionMap(UUID, DIR);
    utils._resetActiveSessionCache();

    const pointerPath = utils._sdkPointerPath(UUID);
    expect(existsSync(pointerPath)).toBe(true);                 // sanity: pointer seeded while live
    expect(utils.findActiveSession(UUID)).toBe(DIR);           // sanity: deterministic map HIT

    // Session transiently reads TERMINAL (revision-cycle VALIDATED window / mid-rewrite).
    makeTerminalInPlace(sessionsDir, SID);
    utils._resetActiveSessionCache();

    // Resolution GATE unchanged: a terminal target still resolves to a MISS (null).
    expect(utils.resolveSdkUuidToSession(UUID)).toBeNull();

    // THE FIX: the LIVE pointer is PRESERVED (dir present, only status transiently terminal).
    // Pre-fix HEAD reaps it here -> existsSync false -> FAIL.
    expect(existsSync(pointerPath)).toBe(true);
  });

  // ------------------------------------------------------------------
  // Case 2 — DETERMINISTIC RECOVERY after the status flips back to non-terminal.
  //   Because the pointer survived the terminal window (case 1), the session is
  //   still resolvable by UUID via the deterministic map — no env, no heuristic.
  // ------------------------------------------------------------------
  it('recovers deterministically after status flips back (map HIT, no env, no fallback)', async () => {
    makeNonTerminal(sessionsDir, SID);
    utils.upsertSdkSessionMap(UUID, DIR);
    utils._resetActiveSessionCache();

    const pointerPath = utils._sdkPointerPath(UUID);

    // Transient terminal read drives the reap site (pre-fix: unlinks; post-fix: preserves).
    makeTerminalInPlace(sessionsDir, SID);
    utils._resetActiveSessionCache();
    expect(utils.resolveSdkUuidToSession(UUID)).toBeNull();     // still gated during terminal window

    // Revision routes back to a non-terminal phase (dir never removed).
    reopenNonTerminal(sessionsDir, SID);
    utils._resetActiveSessionCache();

    // Deterministic map recovery: findActiveSession(uuid) with NO env + NO fallback
    // resolves via the surviving pointer. Pre-fix HEAD: pointer reaped -> null -> FAIL.
    expect(existsSync(pointerPath)).toBe(true);
    expect(utils.findActiveSession(UUID)).toBe(DIR);

    // End-to-end: the gate ALLOWS (non-deny) the now-active session.
    utils._resetActiveSessionCache();
    const v = await gate.handler(gateInput(UUID));
    expect(isDenyVerdict(v)).toBe(false);
  });

  // ------------------------------------------------------------------
  // Case 3 — INVARIANT: genuine absence STILL DENIES (guards against an
  //   over-correction to "always allow"). No pointer, no session dir, no env.
  // ------------------------------------------------------------------
  it('still DENIES a genuine orphan spawn — no pointer, no session dir, no env', async () => {
    // sessionsDir exists but is EMPTY; no pointer seeded; env vars unset.
    utils._resetActiveSessionCache();
    const v = await gate.handler(gateInput(UUID));
    expect(isDenyVerdict(v)).toBe(true);
    expect(denyReason(v)).toMatch(/no active session directory found/);
  });

  // ------------------------------------------------------------------
  // Case 4 — INVARIANT: a genuinely-MISSING-dir pointer is STILL reaped
  //   (guards against an over-correction to "never reap" — GC preserved).
  // ------------------------------------------------------------------
  it('still reaps a pointer whose target session DIRECTORY is genuinely missing', () => {
    makeNonTerminal(sessionsDir, SID);
    utils.upsertSdkSessionMap(UUID, DIR);
    const pointerPath = utils._sdkPointerPath(UUID);
    expect(existsSync(pointerPath)).toBe(true);

    // Session directory disappears entirely (finalized + archived/removed).
    rmSync(DIR, { recursive: true, force: true });
    utils._resetActiveSessionCache();

    expect(utils.resolveSdkUuidToSession(UUID)).toBeNull();
    expect(existsSync(pointerPath)).toBe(false);               // GC intact: missing-dir -> reaped
  });

  // ------------------------------------------------------------------
  // Case 5 — _pruneSdkMap: KEEPS a present-but-terminal pointer, REAPS a
  //   missing-dir pointer. A concurrent session's upsert-time prune must not
  //   destroy a sibling that is momentarily terminal-but-PRESENT.
  // ------------------------------------------------------------------
  it('_pruneSdkMap keeps a present-but-terminal pointer but reaps a missing-dir pointer', () => {
    makeNonTerminal(sessionsDir, SID);
    utils.upsertSdkSessionMap(UUID, DIR);       // seeded while live
    makeNonTerminal(sessionsDir, SID_B);
    utils.upsertSdkSessionMap(UUID_B, DIR_B);   // seeded while live

    const pA = utils._sdkPointerPath(UUID);
    const pB = utils._sdkPointerPath(UUID_B);
    expect(existsSync(pA)).toBe(true);
    expect(existsSync(pB)).toBe(true);

    // A goes terminal-but-PRESENT; B's directory disappears entirely.
    makeTerminalInPlace(sessionsDir, SID);
    rmSync(DIR_B, { recursive: true, force: true });
    utils._resetActiveSessionCache();

    utils._pruneSdkMap();

    // Pre-fix HEAD prunes A (terminal) -> existsSync(pA) false -> FAIL.
    expect(existsSync(pA)).toBe(true);          // present-but-terminal -> PRESERVED
    expect(existsSync(pB)).toBe(false);         // missing-dir -> reaped (GC intact)
  });
});
