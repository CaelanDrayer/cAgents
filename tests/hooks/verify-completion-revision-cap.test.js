/**
 * REC-11 (P-5, HIGH) regression: revision-cycle cap enforcement in
 * verify-completion.cjs (the Stop hook).
 *
 * Background:
 *   `revision_cycles` was removed from status.yaml in v12.6.0, so nothing
 *   persisted the pipeline's revision count and nothing capped it at the Stop
 *   gate. A session that kept failing validation would be BLOCKED by the Stop
 *   hook on every turn (issues.length > 0 -> decision: block), which — combined
 *   with /run routing FAIL/REVISE back to PLANNED — is the "re-plan forever"
 *   defect. REC-11 re-adds a persisted `revision_cycles` counter (incremented by
 *   the /run loop on each route-back to PLANNED) and has verify-completion.cjs
 *   FINALIZE (escalate to user + mark incomplete) instead of blocking once
 *   `revision_cycles >= max_cycles` (pipeline_config.yaml revision.max_cycles = 3).
 *
 * FAILING-BEFORE / PASSING-AFTER:
 *   Pre-REC-11, the Stop hook has no knowledge of the cap, so the mid-COORDINATED
 *   stall below (coordination_log missing while plan.yaml exists, stale heartbeat,
 *   no running child) pushes a blocking issue and returns `decision: 'block'` —
 *   Test 1's `expect(result.decision).not.toBe('block')` FAILS.
 *   Post-REC-11, `revision_cycles: 3 >= max_cycles: 3` overrides the block with an
 *   allow-stop + escalation systemMessage — Test 1 PASSES.
 *
 * The status.yaml resolving to `incomplete` (never a fabricated PASS/complete)
 * is the Phase-2 (REC-02) honesty guarantee; this suite additionally asserts the
 * capped-out session is NOT laundered.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const PROJECT_ROOT = process.cwd();
const HOOK = join(PROJECT_ROOT, '.claude', 'hooks', 'verify-completion.cjs');
const SESSIONS_DIR = join(PROJECT_ROOT, 'cagents-memory', 'sessions');

const NOW = Date.now();
const MIN = 60 * 1000;
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();

const TS = Date.now().toString(36);
const created = [];

/**
 * Fabricate a mid-COORDINATED `run_` session that has exhausted (or not) its
 * revision budget. plan.yaml present + coordination_log.yaml ABSENT + stale
 * heartbeat + stopped child => a genuine mid-COORDINATED stall that BLOCKS
 * pre-REC-11 (Path A: no validator next-stage agent; Path B: coord-log missing).
 *
 * @param {string} slug             unique slug
 * @param {number} revisionCycles   value written as status.yaml revision_cycles
 */
function makeStalledSession(slug, revisionCycles) {
  const sid = `act_rev-cap-${slug}_${TS}`;
  const dir = join(SESSIONS_DIR, sid);
  created.push(dir);
  mkdirSync(join(dir, 'workflow'), { recursive: true });

  const hb = iso(2 * MIN);   // stale (> 60s liveness) but < 24h
  const tx = iso(2 * MIN);

  writeFileSync(
    join(dir, 'status.yaml'),
    [
      `session_id: ${sid}`,
      `pipeline_state: COORDINATED`,
      `phase: coordinating`,
      `created_at: "${tx}"`,
      `last_updated_at: "${hb}"`,
      `started_at: "${tx}"`,
      `revision_cycles: ${revisionCycles}`,
      `state_history:`,
      `  - state: COORDINATED`,
      `    entered_at: "${tx}"`,
      `    duration_ms: null`,
      ``,
    ].join('\n')
  );

  // root + ONE STOPPED child controller (no running child, no validator) =>
  // sessionActivelyWorking() false and checkNextStageAgentSpawned() false.
  writeFileSync(
    join(dir, 'workflow', 'agent_tree.yaml'),
    [
      `schema_version: '1'`,
      `root:`,
      `  agent: run`,
      `  agent_type: cagents:run`,
      `  depth: 0`,
      `  spawned_at: "${tx}"`,
      `  stopped_at: null`,
      `agents:`,
      `  - id: tl-1`,
      `    type: cagents:tech-lead`,
      `    depth: 1`,
      `    spawned_at: "${tx}"`,
      `    stopped_at: "${hb}"`,
      ``,
    ].join('\n')
  );

  // plan.yaml present so Path B (coordination_log enforcement) is reachable.
  writeFileSync(
    join(dir, 'workflow', 'plan.yaml'),
    [
      `plan_id: ${sid}`,
      `tier: 3`,
      `domain: engineering`,
      `mission: "Reproduce a revision-budget-exhausted stall."`,
      `objectives:`,
      `  - id: OBJ-1`,
      `    description: "Placeholder objective."`,
      `controller_assignment:`,
      `  primary: cagents:tech-lead`,
      `success_criteria:`,
      `  - "coordination_log.yaml written"`,
      ``,
    ].join('\n')
  );

  // A REAL (non-safety-net) validator verdict of REVISE — the session was sent
  // back to PLANNED and never reached PASS. NOT genuinely validated.
  writeFileSync(
    join(dir, 'workflow', 'validation_report.yaml'),
    [
      `schema_version: "1"`,
      `overall_status: REVISE`,
      `classification: REVISE`,
      `generated_by: cagents:validator`,
      `generated_at: "${hb}"`,
      ``,
    ].join('\n')
  );

  // coordination_log.yaml DELIBERATELY ABSENT (the stall).
  return { sid, dir };
}

/** spawnSync the Stop hook; returns parsed stdout JSON. */
function runHook(sid) {
  const payload = JSON.stringify({ session_id: sid, stop_hook_active: false, hook_event_name: 'Stop' });
  const r = spawnSync('node', [HOOK], {
    input: payload,
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, CAGENTS_ACTIVE_SESSION: '', CAGENTS_SESSION_LIVENESS_MS: '60000' },
  });
  if (r.status !== 0 && r.status !== null) {
    throw new Error(`Hook exited non-zero: status=${r.status}\nstdout=${r.stdout}\nstderr=${r.stderr}`);
  }
  try { return JSON.parse(r.stdout); }
  catch { throw new Error(`Hook stdout not valid JSON: "${r.stdout}"\nstderr: ${r.stderr}`); }
}

const readStatus = (dir) => { try { return readFileSync(join(dir, 'status.yaml'), 'utf8'); } catch { return ''; } };

describe('verify-completion.cjs revision-cycle cap (REC-11)', () => {
  afterEach(() => {
    while (created.length) {
      const d = created.pop();
      try { if (existsSync(d)) rmSync(d, { recursive: true, force: true }); } catch {}
    }
  });

  it('Test 1 (FAIL-before, PASS-after) — revision_cycles at cap (3/3) FINALIZES instead of blocking into another re-plan cycle', () => {
    const { sid, dir } = makeStalledSession('at-cap', 3);
    const result = runHook(sid);

    // Post-REC-11: cap reached -> allow-stop (NOT a block that forces re-plan).
    expect(result.decision).not.toBe('block');
    expect(result.continue).toBe(true);
    // The user is escalated to (revision.escalation: user_hitl), not silently looped.
    expect(String(result.systemMessage || '')).toMatch(/revision budget|revision cycles|INCOMPLETE|max_revision_cycles/i);
  });

  it('Test 2 (honesty) — a capped-out session resolves to `incomplete`, never a fabricated PASS/complete', () => {
    const { sid, dir } = makeStalledSession('honesty', 3);
    runHook(sid);
    const status = readStatus(dir);
    expect(status).toMatch(/pipeline_state:\s*incomplete/);
    expect(status).not.toMatch(/pipeline_state:\s*complete\b/);
    expect(status).not.toMatch(/pipeline_state:\s*VALIDATED/);
  });

  it('Test 3 (negative control — cap NOT reached still blocks) — revision_cycles 1/3 keeps the normal block (the cap gate is specific)', () => {
    const { sid, dir } = makeStalledSession('under-cap', 1);
    const result = runHook(sid);
    // Below the cap, the stall is a genuine incompletion that MUST still block —
    // the cap override must not prematurely finalize a session with budget left.
    expect(result.decision).toBe('block');
  });
});
