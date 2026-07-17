/**
 * SAFETY-NET regression suite — Phase 0 scaffold (audit team_plugin-full-audit_260717_001).
 *
 * UN-SKIPPED BY: Phase 2 (REC-02 verify-completion honesty + REC-03 team-stop
 * execution_summary honesty). Landing REC-02/03 flips `describe.skip` →
 * `describe` and these assertions must go GREEN.
 *
 * WHAT THE UN-SKIPPED ASSERTIONS MUST PROVE:
 *   The Stop-hook / SessionEnd-hook safety net can NO LONGER launder an
 *   INIT/0-agent stall or a fabricated PASS into `complete` / `PASS` /
 *   `completed`. Specifically, after REC-02/03:
 *     - A non-genuinely-validated session's status.yaml is force-terminal-patched
 *       to `incomplete`, NOT `complete` (verify-completion.cjs:1422).
 *     - The auto-created validation_report stub carries `overall_status: UNKNOWN`,
 *       NOT `PASS` (:450).
 *     - The auto-created execution_summary stub carries `status: incomplete` for a
 *       non-genuine session (:430); team-stop.cjs:242 does the same (REC-03).
 *     - A genuinely-validated session (real validator report + completed
 *       coordination_log) is UNAFFECTED — still `complete` / PASS.
 *
 * WHY IT'S SKIPPED NOW (fail-if-run):
 *   On pre-REC-02 HEAD, verify-completion.cjs:1422 stamps `pipeline_state:
 *   complete` whenever `result.issues.length === 0`, and an INIT/0-agent session
 *   with a fresh heartbeat produces zero issues (sessionActivelyWorking rescues
 *   it — the REC-04 bug), so Test A would observe `complete` and FAIL its
 *   `toBe('incomplete')`. The stub writers at :450/:430 emit `PASS`/`completed`,
 *   so Tests B/C/D would FAIL. Skipping keeps `npm test` GREEN until the fix lands.
 *
 * FIXTURES: tests/hooks/fixtures/safety-net/ (materialize.mjs builders).
 *   Fixture (a) — materializeInitZeroAgent — backs Tests A and D (and is ALSO
 *   consumed by the Phase-3 active-wait suite: INIT/0-child → BLOCK).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import {
  materializeInitZeroAgent,
  materializeCoordinatedStaleChild,
  materializeGenuineValidated,
  cleanup,
} from './fixtures/safety-net/materialize.mjs';

const PROJECT_ROOT = process.cwd();
const VERIFY_HOOK = join(PROJECT_ROOT, '.claude', 'hooks', 'verify-completion.cjs');
const TEAM_STOP_HOOK = join(PROJECT_ROOT, '.claude', 'hooks', 'team-stop.cjs');

/** spawnSync the Stop hook (verify-completion.cjs) over stdin; returns parsed stdout. */
function runStopHook(sid) {
  const payload = JSON.stringify({ session_id: sid, stop_hook_active: false, hook_event_name: 'Stop' });
  const r = spawnSync('node', [VERIFY_HOOK], {
    input: payload,
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, CAGENTS_ACTIVE_SESSION: '' },
  });
  return { json: safeJson(r.stdout), status: r.status };
}

/** spawnSync the SessionEnd hook (team-stop.cjs) over stdin. */
function runSessionEnd(sid) {
  const payload = JSON.stringify({ session_id: sid, hook_event_name: 'SessionEnd', reason: 'other' });
  const r = spawnSync('node', [TEAM_STOP_HOOK], {
    input: payload,
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, CAGENTS_ACTIVE_SESSION: '' },
  });
  return { status: r.status };
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return {}; }
}

function readYaml(dir, rel) {
  try { return readFileSync(join(dir, rel), 'utf8'); } catch { return ''; }
}

describe.skip('verify-completion honesty — never launder to complete/PASS (REC-02/03; Phase 2 un-skips)', () => {
  const dirs = [];
  afterEach(() => cleanup(dirs));

  it('Test A (REC-02 force-terminal) — INIT/0-agent + fresh heartbeat resolves status.yaml to incomplete, not complete', () => {
    const { sid, dir } = materializeInitZeroAgent({ heartbeatMsAgo: 0 });
    dirs.push(dir);
    runStopHook(sid);
    const status = readYaml(dir, 'status.yaml');
    // Pre-REC-02: force-terminal patch stamps `complete` (issues.length === 0).
    // Post-REC-02: sessionGenuinelyValidated() false -> `incomplete`.
    expect(status).toMatch(/pipeline_state:\s*incomplete/);
    expect(status).not.toMatch(/pipeline_state:\s*complete\b/);
  });

  it('Test B (REC-02 stub report) — a non-genuine COORDINATED session gets an UNKNOWN validation stub, not PASS', () => {
    const { sid, dir } = materializeCoordinatedStaleChild();
    dirs.push(dir);
    runStopHook(sid);
    // autoResolveWarnings() creates the missing validation_report.yaml stub.
    const report = readYaml(dir, 'workflow/validation_report.yaml');
    expect(report).toMatch(/overall_status:\s*UNKNOWN/);
    expect(report).not.toMatch(/overall_status:\s*PASS/);
  });

  it('Test C (REC-02 exec-summary) — the auto-created execution_summary stub is status: incomplete for a non-genuine session', () => {
    const { sid, dir } = materializeCoordinatedStaleChild();
    dirs.push(dir);
    runStopHook(sid);
    const summary = readYaml(dir, 'workflow/execution_summary.yaml');
    expect(summary).toMatch(/status:\s*"?incomplete"?/);
    expect(summary).not.toMatch(/status:\s*"?completed"?/);
  });

  it('Test D (REC-03 team-stop) — SessionEnd on an INIT/0-agent stall generates execution_summary status: incomplete', () => {
    // No pre-fabricated summary: team-stop.cjs generateExecutionSummary writes it.
    const { sid, dir } = materializeInitZeroAgent({ heartbeatMsAgo: 0 });
    dirs.push(dir);
    runSessionEnd(sid);
    const summary = readYaml(dir, 'workflow/execution_summary.yaml');
    // Pre-REC-03: `let status = 'completed'` with no success check -> `completed`.
    // Post-REC-03: 0-agent / non-genuine -> `incomplete`.
    expect(summary).toMatch(/final_state:\s*INIT/);
    expect(summary).toMatch(/status:\s*incomplete/);
    expect(summary).not.toMatch(/status:\s*completed/);
  });

  it('Test E (positive control) — a genuinely-validated session is UNAFFECTED (still complete/PASS)', () => {
    const { sid, dir } = materializeGenuineValidated();
    dirs.push(dir);
    runStopHook(sid);
    const status = readYaml(dir, 'status.yaml');
    const report = readYaml(dir, 'workflow/validation_report.yaml');
    // Must NOT be relabeled incomplete; the real validator PASS must survive.
    expect(status).not.toMatch(/pipeline_state:\s*incomplete/);
    expect(report).toMatch(/overall_status:\s*PASS/);
    expect(report).toMatch(/generated_by:\s*cagents:validator/);
  });
});
