/**
 * Shared fixture builders for the Phase-0 "safety net" regression suite
 * (audit session team_plugin-full-audit_260717_001).
 *
 * These builders MATERIALIZE the three systemic-defect session shapes as live
 * session directories under cagents-memory/sessions/ so the (currently skipped)
 * regression tests can spawn verify-completion.cjs / team-stop.cjs against them.
 * Timestamps (heartbeat, spawned_at) are PARAMETERIZED because the stall
 * assertions are timestamp-sensitive (fresh-heartbeat, stale-child freshness),
 * and a committed static file cannot carry a "now" timestamp.
 *
 * The committed static reference fixtures under this same directory
 * (init-zero-agent/, coordinated-stale-child/, fabricated-pass/,
 * genuine-validated/) document the canonical on-disk SHAPE of each defect for a
 * human reader; the builders here reproduce that shape with controllable time.
 *
 * Nothing in this module has import-time side effects (no fs writes, no dir
 * creation) — it only defines constants + functions — so importing it from a
 * `describe.skip(...)` file at collection time is inert. All fs writes happen
 * inside the builder functions, which the skipped `it(...)` bodies never call
 * until a later phase un-skips them.
 *
 * Un-skip map (which phase consumes which builder):
 *   Phase 2 (REC-02/03/06 honesty + learning): materializeInitZeroAgent,
 *     materializeFabricatedPass, materializeGenuineValidated.
 *   Phase 3 (REC-04/05/13 stalls): materializeInitZeroAgent (active-wait),
 *     materializeCoordinatedStaleChild.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Committed static reference fixtures live alongside this module. */
export const FIXTURES_DIR = __dirname;

/**
 * Live-session root. Mirrors verify-completion.cjs's PROJECT_ROOT resolution
 * (cwd-based when vitest runs from the repo root, matching the sibling
 * verify-completion-active-wait.test.js).
 */
export const SESSIONS_DIR = join(process.cwd(), 'cagents-memory', 'sessions');

/** ISO timestamp `msAgo` milliseconds before now. */
export function iso(msAgo = 0) {
  return new Date(Date.now() - msAgo).toISOString();
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/** Unique suffix so parallel tests never collide on a session dir. */
function uniq(slug) {
  return `${slug}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function write(dir, relPath, content) {
  const full = join(dir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

/**
 * Remove any session dirs a test created. Pass the array the builders pushed to.
 */
export function cleanup(dirs) {
  while (dirs && dirs.length) {
    const d = dirs.pop();
    try {
      if (existsSync(d)) rmSync(d, { recursive: true, force: true });
    } catch { /* best-effort */ }
  }
}

/**
 * FIXTURE (a) — INIT / 0-agent session (the `run_repo-refactor-review_260527_001`
 * shape). The pipeline wrote status.yaml (its own init heartbeat) and yielded
 * WITHOUT ever spawning the orchestrator, so agent_tree.yaml has ZERO `- id:`
 * child entries. Its last_updated_at heartbeat is FRESH by default (the init
 * write IS the heartbeat) — which is exactly why the pre-REC-04
 * sessionActivelyWorking() wrongly rescued it and the pre-REC-02 force-terminal
 * patch stamped it `complete`.
 *
 * Backs BOTH:
 *   - Phase-3 active-wait: INIT + fresh heartbeat + 0 children -> BLOCK
 *     (REC-04 makes a fresh heartbeat NOT rescue a 0-child session).
 *   - Phase-2 honesty: sessionGenuinelyValidated() is false (no SUCCESS terminal,
 *     no real PASS report, no coordination_log) -> the force-terminal patch
 *     writes `incomplete`, not `complete`.
 *
 * @param {object} opts
 * @param {number} [opts.heartbeatMsAgo=0]     age of last_updated_at (0 = fresh)
 * @param {boolean} [opts.fabricateArtifacts=false] also drop the fabricated
 *        execution_summary smoking-gun (final_state: INIT, status: completed).
 * @param {boolean} [opts.withRunningChild=false] add ONE `stopped_at: null` child
 *        so agent_tree has a running child (the REC-04 warn-case control: a fresh
 *        heartbeat WITH a running child must still warn, not block).
 * @param {number} [opts.childSpawnedMsAgo=0] age of the running child's spawned_at
 *        (only used when withRunningChild is true).
 * @returns {{sid: string, dir: string}}
 */
export function materializeInitZeroAgent({
  heartbeatMsAgo = 0,
  fabricateArtifacts = false,
  withRunningChild = false,
  childSpawnedMsAgo = 0,
} = {}) {
  const sid = `act_safety-init-zero-${uniq('a')}`;
  const dir = join(SESSIONS_DIR, sid);
  const hb = iso(heartbeatMsAgo);
  const start = iso(heartbeatMsAgo);

  write(dir, 'status.yaml', [
    `session_id: ${sid}`,
    `pipeline_state: INIT`,
    `phase: init`,
    `created_at: "${start}"`,
    `last_updated_at: "${hb}"`,
    `started_at: "${start}"`,
    `state_history:`,
    `  - state: INIT`,
    `    entered_at: "${start}"`,
    `    duration_ms: null`,
    ``,
  ].join('\n'));

  // agent_tree.yaml with a `root:` block. By default the `agents:` list is EMPTY
  // (0 `- id:` child entries) — the load-bearing signal for REC-04. When
  // withRunningChild is set, one `stopped_at: null` child is added (the warn-case
  // control: a running child means the session IS working, so it must warn).
  const childLines = withRunningChild
    ? [
        `agents:`,
        `  - id: orch-1`,
        `    type: cagents:orchestrator`,
        `    depth: 1`,
        `    spawned_at: "${iso(childSpawnedMsAgo)}"`,
        `    stopped_at: null`,
      ]
    : [`agents: []`];
  write(dir, 'workflow/agent_tree.yaml', [
    `schema_version: '1'`,
    `root:`,
    `  agent: run`,
    `  agent_type: cagents:run`,
    `  depth: 0`,
    `  spawned_at: "${start}"`,
    `  stopped_at: null`,
    ...childLines,
    ``,
  ].join('\n'));

  if (fabricateArtifacts) {
    // The post-fabrication smoking-gun team-stop.cjs:242 produces for this shape.
    write(dir, 'workflow/execution_summary.yaml', [
      `session_id: "${sid}"`,
      `final_state: INIT`,
      `status: completed`,
      `agent_count: 0`,
      `duration_seconds: 0`,
      `started_at: "${start}"`,
      `completed_at: "${iso(0)}"`,
      `generated_by: session-stop-hook`,
      ``,
    ].join('\n'));
  }

  return { sid, dir };
}

/**
 * FIXTURE (b) — controller-background-yield stall (the
 * `run_bash-guard-evaluator_260708_001` shape). The session reached COORDINATED
 * with plan.yaml present but NO coordination_log.yaml; a controller spawned a
 * child in the BACKGROUND and yielded, leaving a `stopped_at: null` child in
 * agent_tree.yaml. The heartbeat is stale by default, so the ONLY thing masking
 * the stall is the leaked null-stop child.
 *
 * Backs Phase-3 stale-child: with `childSpawnedMsAgo` = 2h the freshness-gated
 * runningChild (REC-05) no longer counts -> the coordination_log-missing block
 * (:714) fires -> BLOCK. With `childSpawnedMsAgo` = 10s the child is fresh ->
 * still counts -> warn.
 *
 * @param {object} opts
 * @param {number} [opts.childSpawnedMsAgo=2h]  age of the null-stop child's spawned_at
 * @param {number} [opts.heartbeatMsAgo=2min]   age of last_updated_at (stale by default)
 * @returns {{sid: string, dir: string}}
 */
export function materializeCoordinatedStaleChild({
  childSpawnedMsAgo = 2 * HOUR,
  heartbeatMsAgo = 2 * MIN,
} = {}) {
  const sid = `act_safety-stale-child-${uniq('b')}`;
  const dir = join(SESSIONS_DIR, sid);
  const hb = iso(heartbeatMsAgo);
  const childSpawn = iso(childSpawnedMsAgo);
  const tx = iso(heartbeatMsAgo);

  write(dir, 'status.yaml', [
    `session_id: ${sid}`,
    `pipeline_state: COORDINATED`,
    `phase: coordinating`,
    `created_at: "${childSpawn}"`,
    `last_updated_at: "${hb}"`,
    `started_at: "${tx}"`,
    `state_history:`,
    `  - state: COORDINATED`,
    `    entered_at: "${tx}"`,
    `    duration_ms: null`,
    ``,
  ].join('\n'));

  // A single child controller left with stopped_at: null (the leaked-null hole).
  write(dir, 'workflow/agent_tree.yaml', [
    `schema_version: '1'`,
    `root:`,
    `  agent: run`,
    `  agent_type: cagents:run`,
    `  depth: 0`,
    `  spawned_at: "${childSpawn}"`,
    `  stopped_at: null`,
    `agents:`,
    `  - id: tl-bg-1`,
    `    type: cagents:tech-lead`,
    `    depth: 1`,
    `    spawned_at: "${childSpawn}"`,
    `    stopped_at: null`,
    ``,
  ].join('\n'));

  // plan.yaml present so hasPlan is true (the coordination_log-enforcement block
  // at :688 is reachable). coordination_log.yaml deliberately ABSENT.
  write(dir, 'workflow/plan.yaml', [
    `plan_id: ${sid}`,
    `tier: 3`,
    `domain: engineering`,
    `mission: "Reproduce the controller-background-yield stall shape."`,
    `objectives:`,
    `  - id: OBJ-1`,
    `    description: "Placeholder objective for the stall fixture."`,
    `controller_assignment:`,
    `  primary: cagents:tech-lead`,
    `success_criteria:`,
    `  - "coordination_log.yaml written"`,
    ``,
  ].join('\n'));

  return { sid, dir };
}

/**
 * FIXTURE (c) — hook-fabricated PASS (the safety-net laundering artifact). The
 * validation_report.yaml + execution_summary.yaml both carry
 * `generated_by: verify-completion-hook-safety-net` — i.e. no validator agent
 * ever ran; the Stop-hook safety net stubbed a PASS. 0 child agents.
 *
 * Backs Phase-2 honesty (a fabricated PASS must NOT be read as a genuine PASS)
 * and Phase-3 learning-store (REC-06: no `successes:` written; pass_fail =
 * incomplete; genuinely_validated = false).
 *
 * @param {object} opts
 * @param {string} [opts.pipelineState='VALIDATED']
 * @param {number} [opts.heartbeatMsAgo=2min]  stale by default
 * @returns {{sid: string, dir: string}}
 */
export function materializeFabricatedPass({ pipelineState = 'VALIDATED', heartbeatMsAgo = 2 * MIN } = {}) {
  const sid = `act_safety-fabricated-pass-${uniq('c')}`;
  const dir = join(SESSIONS_DIR, sid);
  const hb = iso(heartbeatMsAgo);
  const now = iso(0);

  write(dir, 'status.yaml', [
    `session_id: ${sid}`,
    `pipeline_state: ${pipelineState}`,
    `phase: validating`,
    `created_at: "${hb}"`,
    `last_updated_at: "${hb}"`,
    `started_at: "${hb}"`,
    ``,
  ].join('\n'));

  write(dir, 'workflow/agent_tree.yaml', [
    `schema_version: '1'`,
    `root:`,
    `  agent: run`,
    `  agent_type: cagents:run`,
    `  depth: 0`,
    `  spawned_at: "${hb}"`,
    `  stopped_at: null`,
    `agents: []`,
    ``,
  ].join('\n'));

  write(dir, 'workflow/validation_report.yaml', [
    `# Auto-generated by autoResolveWarnings() safety net`,
    `overall_status: PASS`,
    `status: PASS`,
    `generated_by: verify-completion-hook-safety-net`,
    `generated_at: "${now}"`,
    `note: "Auto-generated stub — no validator agent ran for this session."`,
    ``,
  ].join('\n'));

  write(dir, 'workflow/execution_summary.yaml', [
    `session_id: "${sid}"`,
    `final_state: "${pipelineState}"`,
    `status: "completed"`,
    `generated_by: verify-completion-hook-safety-net`,
    `generated_at: "${now}"`,
    ``,
  ].join('\n'));

  return { sid, dir };
}

/**
 * POSITIVE CONTROL — a genuinely-validated session that MUST still resolve to
 * complete/PASS and MUST still write `successes:`. VALIDATED terminal + a REAL
 * validation_report (generated_by: cagents:validator, no safety-net marker) +
 * a completed coordination_log + a stopped child. This is the "do not
 * over-correct" guard: the honesty/learning fixes must not suppress genuine
 * success.
 *
 * @param {object} opts
 * @param {number} [opts.heartbeatMsAgo=2min]
 * @returns {{sid: string, dir: string}}
 */
export function materializeGenuineValidated({ heartbeatMsAgo = 2 * MIN } = {}) {
  const sid = `act_safety-genuine-validated-${uniq('d')}`;
  const dir = join(SESSIONS_DIR, sid);
  const hb = iso(heartbeatMsAgo);
  const start = iso(heartbeatMsAgo + 5 * MIN);

  write(dir, 'status.yaml', [
    `session_id: ${sid}`,
    `pipeline_state: VALIDATED`,
    `phase: complete`,
    `result: success`,
    `created_at: "${start}"`,
    `last_updated_at: "${hb}"`,
    `started_at: "${start}"`,
    ``,
  ].join('\n'));

  write(dir, 'workflow/agent_tree.yaml', [
    `schema_version: '1'`,
    `root:`,
    `  agent: run`,
    `  agent_type: cagents:run`,
    `  depth: 0`,
    `  spawned_at: "${start}"`,
    `  stopped_at: "${hb}"`,
    `agents:`,
    `  - id: tl-done-1`,
    `    type: cagents:tech-lead`,
    `    depth: 1`,
    `    spawned_at: "${start}"`,
    `    stopped_at: "${hb}"`,
    ``,
  ].join('\n'));

  write(dir, 'workflow/plan.yaml', [
    `plan_id: ${sid}`,
    `tier: 2`,
    `domain: engineering`,
    `mission: "A genuinely-validated positive-control session."`,
    `objectives:`,
    `  - id: OBJ-1`,
    `    description: "Ship the change."`,
    `controller_assignment:`,
    `  primary: cagents:tech-lead`,
    `success_criteria:`,
    `  - "All acceptance criteria met."`,
    ``,
  ].join('\n'));

  // A REAL validator verdict — NO safety-net marker.
  write(dir, 'workflow/validation_report.yaml', [
    `schema_version: "1"`,
    `overall_status: PASS`,
    `classification: PASS`,
    `generated_by: cagents:validator`,
    `generated_at: "${hb}"`,
    `criteria:`,
    `  - criterion: "All acceptance criteria met."`,
    `    verdict: MET`,
    `    evidence: "src/foo.ts:15 - implemented"`,
    ``,
  ].join('\n'));

  write(dir, 'workflow/coordination_log.yaml', [
    `schema_version: "1"`,
    `controller: cagents:tech-lead`,
    `status: completed`,
    `objectives:`,
    `  - id: OBJ-1`,
    `    description: "Ship the change."`,
    `implementation_tasks:`,
    `  - task_id: WI-1`,
    `    assigned_to: cagents:backend-developer`,
    `    status: completed`,
    `    review_result: PASS`,
    `    self_validation:`,
    `      checks_passed: 5`,
    ``,
  ].join('\n'));

  return { sid, dir };
}
