/**
 * SAFETY-NET regression suite — Phase 0 scaffold (audit team_plugin-full-audit_260717_001).
 *
 * UN-SKIPPED BY: Phase 2 (REC-06 — learning-store integrity: gate
 * success-capture on genuine validation). Landing REC-06 flips `describe.skip`
 * → `describe` and these assertions must go GREEN.
 *
 * WHAT THE UN-SKIPPED ASSERTIONS MUST PROVE:
 *   The learning store stops ingesting FABRICATED success. After REC-06:
 *     - A fabricated-PASS session (validation_report generated_by
 *       verify-completion-hook-safety-net) writes NO `successes:` block to
 *       workflow/learnings.yaml (the LP-24 emission at :1548 is gated on
 *       sessionGenuinelyValidated + a safety-net filter).
 *     - Its session_outcomes.jsonl row records `pass_fail: incomplete` and
 *       `genuinely_validated: false` (:1698), not a fake `pass`.
 *     - A genuinely-validated session STILL writes `successes:` + `pass_fail:
 *       pass` + `genuinely_validated: true`.
 *
 * WHY IT'S SKIPPED NOW (fail-if-run):
 *   On pre-REC-06 HEAD, LP-24 emits `successes:` for ANY validation_report whose
 *   verdict reads `PASS` — including the fabricated safety-net stub — so Test 1
 *   would find a `successes:` block and FAIL. `session_outcomes.jsonl` has no
 *   `genuinely_validated` field and records `pass_fail: pass` for a zero-issue
 *   run, so Test 2 would FAIL. Skipping keeps `npm test` GREEN until REC-06 lands.
 *
 * FIXTURES: tests/hooks/fixtures/safety-net/ — materializeFabricatedPass (fixture
 *   (c)) and materializeGenuineValidated (positive control).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import {
  materializeFabricatedPass,
  materializeGenuineValidated,
  cleanup,
  hookEnv,
  OUTCOMES_JSONL,
} from './fixtures/safety-net/materialize.mjs';

const PROJECT_ROOT = process.cwd();
const VERIFY_HOOK = join(PROJECT_ROOT, '.claude', 'hooks', 'verify-completion.cjs');
// OUTCOMES_JSONL is imported from materialize.mjs: the fixtures live in an
// isolated temp project root, so the learning store the hook appends to lives
// there too (it used to be appended to the REAL repo's store).

function runStopHook(sid) {
  const payload = JSON.stringify({ session_id: sid, stop_hook_active: false, hook_event_name: 'Stop' });
  const r = spawnSync('node', [VERIFY_HOOK], {
    input: payload,
    encoding: 'utf8',
    // 60000 (was 10000): spawnSync does NOT throw on timeout, and this helper's
    // result was DISCARDED — so a killed (timed-out) hook that never wrote
    // learnings.yaml made Test 1's `expect(learnings).not.toMatch(/successes:/)`
    // SPURIOUSLY PASS (the worst flake form — a false green hiding that the hook
    // never ran). Capture the result, raise the budget, and FAIL LOUD so a
    // timeout can never satisfy that absence assertion.
    timeout: 60000,
    env: { ...process.env, ...hookEnv(), CAGENTS_ACTIVE_SESSION: '' },
  });
  // verify-completion.cjs (Stop via createHook) ALWAYS exits 0 with one JSON line
  // on stdout, so any abnormal termination is a spawn misfire, not a verdict.
  const diag = () => `status=${r.status} signal=${r.signal} error=${r.error ? r.error.message : 'none'} stdout=${JSON.stringify((r.stdout || '').slice(0, 200))} stderr=${JSON.stringify((r.stderr || '').slice(0, 500))}`;
  if (r.error) throw new Error(`runStopHook: spawnSync errored for ${sid} — ${diag()}`);
  if (r.status === null) throw new Error(`runStopHook: hook killed (timeout/signal) for ${sid} — ${diag()}`);
  if (r.status !== 0) throw new Error(`runStopHook: hook exited non-zero for ${sid} — ${diag()}`);
  if (!r.stdout || !r.stdout.trim()) throw new Error(`runStopHook: empty stdout for ${sid} — ${diag()}`);
}

function readIf(p) {
  try { return readFileSync(p, 'utf8'); } catch { return ''; }
}

/** Return the last session_outcomes.jsonl object whose session_id === sid, or null. */
function outcomeFor(sid) {
  if (!existsSync(OUTCOMES_JSONL)) return null;
  const lines = readIf(OUTCOMES_JSONL).trim().split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const o = JSON.parse(lines[i]);
      if (o.session_id === sid) return o;
    } catch { /* skip malformed line */ }
  }
  return null;
}

describe('learning-store integrity — gate success-capture on genuine validation (REC-06; Phase 2 un-skips)', () => {
  const dirs = [];
  afterEach(() => cleanup(dirs));

  it('Test 1 — a fabricated-PASS session writes NO successes: to workflow/learnings.yaml', () => {
    const { sid, dir } = materializeFabricatedPass();
    dirs.push(dir);
    runStopHook(sid);
    const learnings = readIf(join(dir, 'workflow', 'learnings.yaml'));
    // Pre-REC-06: LP-24 harvests the fabricated PASS -> `successes:` present.
    // Post-REC-06: gated on sessionGenuinelyValidated -> no successes emitted.
    expect(learnings).not.toMatch(/successes:/);
  });

  it('Test 2 — the fabricated session outcome records pass_fail: incomplete + genuinely_validated: false', () => {
    const { sid, dir } = materializeFabricatedPass();
    dirs.push(dir);
    runStopHook(sid);
    const outcome = outcomeFor(sid);
    expect(outcome).not.toBeNull();
    expect(outcome.pass_fail).toBe('incomplete');
    expect(outcome.genuinely_validated).toBe(false);
  });

  it('Test 3 (positive control) — a genuinely-validated session STILL writes successes: and pass', () => {
    const { sid, dir } = materializeGenuineValidated();
    dirs.push(dir);
    runStopHook(sid);
    const learnings = readIf(join(dir, 'workflow', 'learnings.yaml'));
    expect(learnings).toMatch(/successes:/);
    const outcome = outcomeFor(sid);
    expect(outcome).not.toBeNull();
    expect(outcome.pass_fail).toBe('pass');
    expect(outcome.genuinely_validated).toBe(true);
  });
});
