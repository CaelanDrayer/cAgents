/**
 * WI-2 regression test: verify-completion.cjs staleness skip via last_updated_at.
 *
 * Background (run_verify-completion-staleness-field_260603_001):
 *   verify-completion.cjs:922 read status.yaml via
 *     extractYamlValue(s, 'updated_at') || extractYamlValue(s, 'created_at')
 *   but /act writes `last_updated_at` + `started_at`. The lookup chain
 *   never matched on real cAgents sessions, `updatedAt` was always undefined,
 *   and the 24h staleness branch was therefore skipped — so the Stop hook
 *   proceeded to verifyCompletion() against orphaned-at-INIT sessions
 *   surfaced by findMostRecentSessionDir({includeTerminal: true}), pinning
 *   "Pipeline stopped in 'INIT' state" block decisions onto unrelated turns.
 *
 *   The fix (WI-1) extended the chain to:
 *     extractYamlValue(s, 'last_updated_at')
 *       || extractYamlValue(s, 'updated_at')
 *       || extractYamlValue(s, 'started_at')
 *       || extractYamlValue(s, 'created_at')
 *
 * Failing-before contract:
 *   Test 1 fails on pre-patch HEAD because `last_updated_at` is not in the
 *   chain, `updatedAt` remains undefined, the 24h branch is skipped, and
 *   the hook returns a block decision instead of null. Verified via
 *   `git stash && npx vitest run tests/hooks/verify-completion-staleness-skip.test.js`
 *   (Test 1 FAIL); `git stash pop && npx vitest run ...` (Test 1 PASS).
 *
 * Passing-after contract:
 *   Tests 1, 2, 3 all pass on the WI-1 patch.
 *
 * Test pattern:
 *   spawnSync the hook .cjs directly with synthetic Stop input, pointing
 *   the hook at a freshly-created synthetic session via input.session_id
 *   (findActiveSession resolves a cAgents-shaped hint when the dir exists
 *   and is in a non-terminal pipeline_state). Mirrors
 *   tests/hooks/session-init-gate-uuid-payload.test.js.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const PROJECT_ROOT = process.cwd();
const HOOKS_DIR = join(PROJECT_ROOT, '.claude', 'hooks');
const SESSIONS_DIR = join(PROJECT_ROOT, 'cagents-memory', 'sessions');
const HOOK = join(HOOKS_DIR, 'verify-completion.cjs');

const TS = Date.now().toString(36);
const SID = `act_staleness-skip-test_${TS}`;
const DIR = join(SESSIONS_DIR, SID);

const TWENTY_FIVE_HOURS_AGO = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
const ONE_HOUR_AGO = new Date(Date.now() - 60 * 60 * 1000).toISOString();

/**
 * Create a synthetic session dir with the given status.yaml content.
 * pipeline_state must be non-terminal (e.g., INIT, COORDINATING) so
 * findActiveSession resolves the hint instead of falling through.
 */
function makeSession(dir, statusYaml) {
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeFileSync(join(dir, 'status.yaml'), statusYaml);
}

/**
 * Invoke the verify-completion hook with a Stop event payload pointing at
 * the synthetic session. Returns the parsed stdout JSON (or null if hook
 * returned `null` — represented as `{continue: true}` by createHook).
 */
function runHook(sessionId) {
  const payload = JSON.stringify({
    session_id: sessionId,
    stop_hook_active: false,
    hook_event_name: 'Stop',
  });
  const result = spawnSync('node', [HOOK], {
    input: payload,
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, CAGENTS_ACTIVE_SESSION: '' },
  });
  if (result.status !== 0 && result.status !== null) {
    throw new Error(
      `Hook exited non-zero: status=${result.status}\nstdout=${result.stdout}\nstderr=${result.stderr}`
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (e) {
    throw new Error(
      `Hook stdout not valid JSON: "${result.stdout}"\nstderr: ${result.stderr}`
    );
  }
  return { parsed, stderr: result.stderr };
}

describe('verify-completion.cjs staleness skip (WI-2)', () => {
  beforeEach(() => {
    if (existsSync(DIR)) rmSync(DIR, { recursive: true, force: true });
  });

  afterEach(() => {
    if (existsSync(DIR)) rmSync(DIR, { recursive: true, force: true });
  });

  it('Test 1 (FAIL-before, PASS-after) — session with only last_updated_at > 24h old is skipped as stale (no block decision)', () => {
    // Synthetic session with the field-name shape that /act actually writes:
    // last_updated_at (no updated_at, no created_at). pipeline_state=INIT
    // means findActiveSession will resolve this hint (non-terminal).
    makeSession(
      DIR,
      [
        `session_id: ${SID}`,
        `pipeline_state: INIT`,
        `phase: initializing`,
        `last_updated_at: "${TWENTY_FIVE_HOURS_AGO}"`,
        `started_at: "${TWENTY_FIVE_HOURS_AGO}"`,
        ``,
      ].join('\n')
    );

    const { parsed, stderr } = runHook(SID);

    // Post-patch: updatedAt resolves via last_updated_at, sessionAge > 24h,
    // staleness branch returns null → createHook outputs {continue: true}
    // with NO decision field.
    // Pre-patch: updatedAt is undefined (chain doesn't know last_updated_at),
    // staleness branch is skipped, verifyCompletion runs and emits
    // decision="block" with reason citing "Pipeline stopped in 'INIT' state".
    expect(parsed?.decision).not.toBe('block');

    // Belt-and-suspenders: post-patch the hook logs the skip to stderr.
    // (Stderr check is informational; the decision check above is the load-bearing assertion.)
    // We don't hard-assert the stderr text to avoid coupling to log wording.
  });

  it('Test 2 — session with last_updated_at < 24h old is NOT skipped (staleness gate is not over-eager)', () => {
    // Fresh session: < 24h old, pipeline_state=INIT with no agents spawned.
    // The hook should NOT skip; it should proceed to verifyCompletion and
    // emit a block decision (or at least NOT return a clean null/pass).
    makeSession(
      DIR,
      [
        `session_id: ${SID}`,
        `pipeline_state: INIT`,
        `phase: initializing`,
        `last_updated_at: "${ONE_HOUR_AGO}"`,
        `started_at: "${ONE_HOUR_AGO}"`,
        ``,
      ].join('\n')
    );

    const { parsed } = runHook(SID);

    // Post-patch: updatedAt resolves but sessionAge < 24h → staleness branch
    // not taken → verifyCompletion runs → emits decision=block for stuck-INIT.
    // (Pre-patch: same outcome — pre-patch always reached verifyCompletion
    // regardless of staleness, so this test passes pre-patch too. Its role
    // is to pin that the staleness gate isn't over-eager post-patch.)
    expect(parsed?.decision).toBe('block');
  });

  it('Test 3 — back-compat: session with ONLY legacy updated_at field > 24h old is still skipped', () => {
    // Legacy session shape: only `updated_at` is set (no last_updated_at,
    // no started_at). The fallback chain must still recognize updated_at.
    makeSession(
      DIR,
      [
        `session_id: ${SID}`,
        `pipeline_state: INIT`,
        `phase: initializing`,
        `updated_at: "${TWENTY_FIVE_HOURS_AGO}"`,
        ``,
      ].join('\n')
    );

    const { parsed } = runHook(SID);

    // Both pre-patch AND post-patch should skip this case — pre-patch's chain
    // started with updated_at, so legacy sessions were the ONLY shape it handled.
    // Post-patch preserves this back-compat behavior via the fallback.
    expect(parsed?.decision).not.toBe('block');
  });
});
