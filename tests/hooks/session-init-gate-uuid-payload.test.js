/**
 * WI-2/WI-3 regression test: UUID-shaped input.session_id payload handling.
 *
 * Background (H1 from run_sessions-hung-single-dir_260602_001):
 *   Claude Code's hook payload `input.session_id` field carries SDK transcript
 *   UUIDs (e.g. "28d9d944-e2f5-4e03-b06b-d367625f1fdd"), NOT cAgents session
 *   directory names (e.g. "act_fix-auth_260317_001"). v12.15.0's deterministic
 *   chain refused to fall through when a sessionHint was unresolvable. Result:
 *   findActiveSession(UUID) always returned null, session-init-gate.cjs:340
 *   HARD-DENIED every Agent spawn, and dependent hooks silently skipped.
 *
 * Failing-before contract (this test was authored at commit a2b19cc0):
 *   Test 1 fails on HEAD (pre-WI-3 patch).
 *
 * Passing-after contract (after WI-3 patch lands):
 *   Test 1, 2, 3, 4 all pass. The patch recognizes UUID-shaped hints as
 *   "not a cAgents dir name" and skips chain step 1, falling through to
 *   env-var / promptHint / null. When env-var resolves, the spawn proceeds.
 *
 * Cross-write invariant preservation:
 *   The fix MUST NOT introduce a blanket newest-active fallback. UUID hints
 *   alone never resolve to a session — only env-var / promptHint can resolve
 *   a session when a UUID hint is present. This keeps the H1/H3 cross-session
 *   leak closed for cAgents-shaped hints (which still terminate at null per
 *   the original v12.15.0 contract).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
// Isolation (see materialize.mjs): SESSIONS_DIR points at a per-process temp
// project root, NOT the real <repo>/cagents-memory/sessions/. DIR_REAL is a
// non-terminal COORDINATING session — exactly what a sibling test's
// findActiveSession({fallbackHeuristic}) binds to.
//
// This file resolves sessions BOTH in-process (freshHookUtils) and via a
// spawned hook (Test 5), so hookEnv() alone is NOT sufficient: hook-utils.cjs
// computes AGENT_MEMORY_DIR from CLAUDE_PROJECT_DIR at MODULE LOAD time
// (hook-utils.cjs:42), so the env var must be set on this process's own
// process.env BEFORE the fresh require — see beforeEach below.
import { hookEnv, SESSIONS_DIR } from './fixtures/safety-net/materialize.mjs';

const PROJECT_ROOT = process.cwd();
const HOOKS_DIR = join(PROJECT_ROOT, '.claude', 'hooks');

// Realistic Claude Code SDK UUID (from run_sessions-hung-single-dir_260602_001
// agent_spawns.log line 228 — empirical production payload shape).
const UUID_HINT = '28d9d944-e2f5-4e03-b06b-d367625f1fdd';

const TS = Date.now().toString(36);
const SID_REAL = `act_uuid-payload-test_${TS}`;
const DIR_REAL = join(SESSIONS_DIR, SID_REAL);

function makeNonTerminalSession(dir, sid) {
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeFileSync(
    join(dir, 'status.yaml'),
    `session_id: ${sid}\nphase: coordinating\npipeline_state: COORDINATING\n`
  );
}

function freshHookUtils() {
  delete require.cache[require.resolve(join(HOOKS_DIR, 'hook-utils.cjs'))];
  return require(join(HOOKS_DIR, 'hook-utils.cjs'));
}

describe('UUID-shaped input.session_id payload (WI-2)', () => {
  let utils;
  let prevProjectDir;

  beforeEach(() => {
    prevProjectDir = process.env.CLAUDE_PROJECT_DIR;
    // MUST precede freshHookUtils(): hook-utils.cjs snapshots
    // AGENT_MEMORY_DIR from CLAUDE_PROJECT_DIR at module load, so setting it
    // after the require would leave the in-process assertions reading the REAL
    // sessions dir.
    Object.assign(process.env, hookEnv());
    if (existsSync(DIR_REAL)) rmSync(DIR_REAL, { recursive: true, force: true });
    delete process.env.CAGENTS_ACTIVE_SESSION;
    utils = freshHookUtils();
  });

  afterEach(() => {
    if (existsSync(DIR_REAL)) rmSync(DIR_REAL, { recursive: true, force: true });
    delete process.env.CAGENTS_ACTIVE_SESSION;
    if (prevProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = prevProjectDir;
  });

  it('Test 1 — UUID hint alone resolves to null on HEAD (FAIL-before, PASS-after with env-var); pre-WI-3 it returns null because chain step 1 fails', () => {
    // Setup: real cAgents session exists on disk
    makeNonTerminalSession(DIR_REAL, SID_REAL);

    // No env-var, no promptHint — only the UUID hint.
    const result = utils.findActiveSession(UUID_HINT);

    // Contract: UUID hint alone cannot resolve a session (no env-var, no promptHint).
    // BOTH pre-patch AND post-patch produce null here — what differs is the REASON:
    //   - pre-patch: chain step 1 returns null AND the no-fallback gate terminates immediately
    //   - post-patch: chain step 1 detects UUID format, skips, falls through to step 2 (no env),
    //     step 3 (no prompt), step 4 (null)
    // So this assertion holds in both states. It pins the invariant that UUID alone never
    // resolves to a session (cross-write safety).
    expect(result).toBeNull();
  });

  it('Test 2 — UUID hint + CAGENTS_ACTIVE_SESSION env-var: pre-patch returns null, post-patch returns the env-var session', () => {
    makeNonTerminalSession(DIR_REAL, SID_REAL);
    process.env.CAGENTS_ACTIVE_SESSION = SID_REAL;

    const result = utils.findActiveSession(UUID_HINT);

    // POST-PATCH expectation: UUID hint is recognized as non-cAgents-shaped → skip step 1 →
    //   step 2 (env-var) resolves SID_REAL → return DIR_REAL.
    // PRE-PATCH behavior: UUID hint terminates chain at step 1 → returns null → this assertion FAILS.
    expect(result).toBe(DIR_REAL);
  });

  it('Test 3 — UUID hint + promptHint: pre-patch returns null, post-patch returns the promptHint session', () => {
    makeNonTerminalSession(DIR_REAL, SID_REAL);

    const result = utils.findActiveSession({
      sessionHint: UUID_HINT,
      promptHint: SID_REAL,
    });

    // POST-PATCH expectation: UUID hint skipped → no env-var → step 3 (promptHint) resolves SID_REAL.
    // PRE-PATCH: step 1 terminates → null. This assertion FAILS pre-patch.
    expect(result).toBe(DIR_REAL);
  });

  it('Test 4 — cross-write invariant preserved: cAgents-shaped hint that is unresolvable still returns null (no blanket fallback)', () => {
    // Set up a DIFFERENT real session on disk that the UNRELATED cAgents-shaped
    // hint should NOT resolve to.
    makeNonTerminalSession(DIR_REAL, SID_REAL);

    // Hint is a cAgents-shaped name for a DIFFERENT session that does not exist.
    const orphanHint = `act_does-not-exist_${TS}`;

    const result = utils.findActiveSession(orphanHint);

    // Both pre-patch AND post-patch MUST return null. The fix must NOT silently
    // resolve cAgents-shaped-but-missing hints to "newest active" — that would
    // reopen the H1/H3 cross-session leak v12.15.0 closed.
    expect(result).toBeNull();
  });

  it('Test 5 — session-init-gate.cjs end-to-end: UUID payload + valid env-var produces ALLOW (not DENY)', () => {
    makeNonTerminalSession(DIR_REAL, SID_REAL);

    const payload = JSON.stringify({
      tool_name: 'Agent',
      tool_input: { subagent_type: 'cagents:backend-developer' },
      session_id: UUID_HINT,
    });

    const result = spawnSync('node', [join(HOOKS_DIR, 'session-init-gate.cjs')], {
      input: payload,
      env: { ...process.env, ...hookEnv(), CAGENTS_ACTIVE_SESSION: SID_REAL },
      encoding: 'utf8',
      timeout: 5000,
    });

    expect(result.status).toBe(0);

    let parsed;
    try {
      parsed = JSON.parse(result.stdout);
    } catch (e) {
      throw new Error(`Hook stdout not valid JSON: ${result.stdout}\nstderr: ${result.stderr}`);
    }

    const decision = parsed?.hookSpecificOutput?.permissionDecision;

    // POST-PATCH expectation: not deny. Either "allow" (advisory passthrough) or undefined
    // (no decision => default allow). PRE-PATCH: decision === "deny" with reason "no active session".
    expect(decision).not.toBe('deny');
  });
});
