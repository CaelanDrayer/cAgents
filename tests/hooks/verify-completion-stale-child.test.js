/**
 * SAFETY-NET regression suite — Phase 0 scaffold (audit team_plugin-full-audit_260717_001).
 *
 * UN-SKIPPED BY: Phase 3 (REC-05 — controller synchronous-spawn rule + stale-child
 * freshness gate; closes H-9's leaked-null hole). Landing REC-05 flips
 * `describe.skip` → `describe` and these assertions must go GREEN.
 *
 * WHAT THE UN-SKIPPED ASSERTIONS MUST PROVE:
 *   A `stopped_at: null` child only counts as "actively working" if its
 *   `spawned_at` is within CAGENTS_SESSION_LIVENESS_MS (default 60s). After
 *   REC-05, a 16h/2h backgrounded child no longer masks a stall:
 *     - COORDINATED + a 2h-old null-stop child + missing coordination_log.yaml
 *       (plan.yaml present) → the coord-log-missing block (:714) FIRES → BLOCK.
 *     - The SAME shape with a child spawned 10s ago → still counts as working →
 *       warn (not block).
 *
 * WHY IT'S SKIPPED NOW (fail-if-run):
 *   On pre-REC-05 HEAD, sessionActivelyWorking()'s runningChild scan (:138-144)
 *   only checks `stopped_at: null` — it ignores `spawned_at` age — so the 2h-old
 *   leaked-null child makes the session look "working", the :714 block is
 *   downgraded to a warning, and Test 1 would observe no block and FAIL its
 *   `toBe('block')`. Skipping keeps `npm test` GREEN until REC-05 lands.
 *
 * Interaction note (per REC-05): validate against
 * verify-completion-team-artifacts.test.js when un-skipping — the freshness gate
 * must not regress the concurrent-Agent-wave (running-teammate) path.
 *
 * FIXTURES: tests/hooks/fixtures/safety-net/coordinated-stale-child/ (fixture (b)),
 *   built with a controllable child spawned_at via materializeCoordinatedStaleChild.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { materializeCoordinatedStaleChild, cleanup } from './fixtures/safety-net/materialize.mjs';

const PROJECT_ROOT = process.cwd();
const VERIFY_HOOK = join(PROJECT_ROOT, '.claude', 'hooks', 'verify-completion.cjs');
const LIVENESS_MS = 60000; // 60s window — 2h child is stale, 10s child is fresh.

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;

function runStopHook(sid) {
  const payload = JSON.stringify({ session_id: sid, stop_hook_active: false, hook_event_name: 'Stop' });
  const r = spawnSync('node', [VERIFY_HOOK], {
    input: payload,
    encoding: 'utf8',
    timeout: 10000,
    env: {
      ...process.env,
      CAGENTS_ACTIVE_SESSION: '',
      CAGENTS_SESSION_LIVENESS_MS: String(LIVENESS_MS),
    },
  });
  try { return JSON.parse(r.stdout); } catch { return {}; }
}

describe.skip('verify-completion stale-child freshness gate (REC-05; Phase 3 un-skips)', () => {
  const dirs = [];
  afterEach(() => cleanup(dirs));

  it('Test 1 (FAIL-before, PASS-after) — COORDINATED + 2h-old null-stop child + missing coordination_log → BLOCK', () => {
    // Heartbeat stale (2 min) so the ONLY masking signal is the leaked-null child.
    const { sid, dir } = materializeCoordinatedStaleChild({
      childSpawnedMsAgo: 2 * HOUR,
      heartbeatMsAgo: 2 * MIN,
    });
    dirs.push(dir);
    const result = runStopHook(sid);
    expect(result.decision).toBe('block');
    expect(result.reason).toMatch(/coordination_log/i);
  });

  it('Test 2 (freshness control) — the SAME shape with a child spawned 10s ago → warn (not block)', () => {
    const { sid, dir } = materializeCoordinatedStaleChild({
      childSpawnedMsAgo: 10 * SEC,
      heartbeatMsAgo: 2 * MIN,
    });
    dirs.push(dir);
    const result = runStopHook(sid);
    expect(result.decision).not.toBe('block');
    expect(result.continue).toBe(true);
  });
});
