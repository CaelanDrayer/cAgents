/**
 * FIX-2 (OBJ-2, WI-8) regression test: verify-completion.cjs Stop-hook
 * "actively-working vs abandoned" discriminator (sessionActivelyWorking).
 *
 * Background (run_hook-session-id_260701_001, OBJ-2 / WI-6):
 *   Claude Code fires a Stop event between response turns whenever a synchronous
 *   cAgents pipeline yields for a background/async wait (a running child agent,
 *   an awaited spawn). The pre-change verify-completion.cjs had NO way to tell a
 *   mid-flight session apart from an abandoned one, so it BLOCKED both. Blocking
 *   a mid-flight session deadlocks it: block -> the model responds -> Stop fires
 *   again -> block again, forever. WI-6 added a shared discriminator,
 *   `sessionActivelyWorking(sessionDir, statusContent)`, applied at all three
 *   block paths (A: active-state / next-stage-agent; B: coordination_log
 *   enforcement; C: enrichment-artifacts phase branch). It returns true when
 *   EITHER (i) a still-running spawned CHILD agent exists (an `agents:`-list
 *   entry in agent_tree.yaml with `stopped_at: null` — the top-level `root:`
 *   block is deliberately EXCLUDED, since root.stopped_at is null for the whole
 *   open session and would make every session look active forever) OR (ii) a
 *   fresh status heartbeat (now - Date.parse(last_updated_at) <
 *   CAGENTS_SESSION_LIVENESS_MS, default 60000ms). When the discriminator is
 *   true, a mid-flight incompletion is downgraded from a blocking ISSUE to a
 *   WARNING (continue). Only a genuinely-abandoned session (NOT actively working:
 *   no running child AND stale heartbeat) still BLOCKS.
 *
 * These tests exercise Path A. Each fixture is a mid-COORDINATED `run_` session
 * with a RECENT state_history entered_at (so it lands in Path A's
 * recent-transition branch, :591) and a next-stage agent (validator, per
 * nextStageMap) that is ABSENT (the only spawned child is a tech-lead
 * controller, not a validator). Fixtures deliberately omit plan.yaml and
 * coordination_log.yaml so Path B (guarded by `hasPlan`) is skipped and Path A
 * is the SOLE block source. `last_updated_at` is always < 24h old so the
 * upstream >24h staleness skip (:1148-1154) never fires.
 *
 * ---------------------------------------------------------------------------
 * FAILING-BEFORE / PASSING-AFTER contract (why each assertion FAILS on
 * pre-WI-6 HEAD and PASSES after WI-6):
 *
 *   Pre-change, Path A's recent-transition branch was, in effect:
 *       if (!nextStageSpawned) { issues.push("Pipeline stopped in '...' state
 *                                  with no next-stage agent spawned..."); }
 *       else { warnings.push(...); }
 *   i.e. the block fired UNCONDITIONALLY whenever the next-stage agent
 *   (validator) was absent — there was no sessionActivelyWorking() guard. So a
 *   mid-COORDINATED session whose live child is a CONTROLLER (not the validator)
 *   was BLOCKED even though it was actively working. Post-change the branch is
 *       if (!nextStageSpawned && !sessionActivelyWorking(...)) { issues.push(...) }
 *       else { warnings.push(...); }
 *   so a running child OR a fresh heartbeat downgrades the block to a warning.
 *
 *   - Test 1 (running child): pre-change -> !nextStageSpawned (true) -> BLOCK
 *     (fails `not.toBe('block')`). Post-change -> true && !running-child(true) =
 *     false -> WARNING -> passes.
 *   - Test 2 (fresh heartbeat, no running child): pre-change -> BLOCK (fails).
 *     Post-change -> true && !fresh-heartbeat(true) = false -> WARNING -> passes.
 *   - Test 3 (abandoned: no running child + stale heartbeat): BLOCKS both
 *     before AND after (the discriminator is false, so the block is preserved).
 *     This is the invariant guard — it must NOT weaken. It passes on both HEADs;
 *     its job is to prove FIX-2 did not turn the abandoned block into a warning.
 *   - Test 4 (liveness boundary): the SAME abandoned-shaped fixture (heartbeat
 *     10 min old, no running child) is run twice with different
 *     CAGENTS_SESSION_LIVENESS_MS. With a 60s window the 10-min heartbeat is
 *     STALE -> BLOCK (pre- and post-change agree). With a 1h window it is FRESH
 *     -> WARNING post-change (pre-change ignored the heartbeat entirely and
 *     BLOCKED, so the 1h-window sub-assertion FAILS pre-change, PASSES after).
 *     This pins that the heartbeat arm of the discriminator is real and that the
 *     fresh/stale boundary is driven deterministically by the env var (no
 *     wall-clock flakiness).
 *   - Test 5 (bonus, >30min no-transition branch): pre-change, the else branch
 *     (:609-619, no recent transition) also did `issues.push(...)`
 *     UNCONDITIONALLY. A stale-transition session with a FRESH heartbeat was
 *     BLOCKED pre-change; post-change the same discriminator downgrades it to a
 *     WARNING. Fails pre-change, passes after.
 *
 * NOTE ON VERIFICATION METHOD: `git stash` is intentionally NOT used to prove
 * the failing-before half — the shared working tree carries other in-flight
 * OBJ-1/OBJ-2 changes that a stash would disturb. The failing-before contract is
 * established by direct reasoning against the current (post-WI-6) source: the
 * `&& !sessionActivelyWorking(...)` conjunct at :600 and the
 * `if (!sessionActivelyWorking(...))` guards at :613 and :690 are the exact
 * lines WI-6 added; removing them (the pre-change state) makes Tests 1, 2, 4-fresh
 * and 5 BLOCK, which is what the assertions forbid. Tests run green on
 * post-change HEAD (see the WI-8 report for the captured pass count + exit code).
 *
 * Test pattern mirrors tests/hooks/verify-completion-staleness-skip.test.js and
 * tests/hooks/verify-completion.test.js: spawnSync the hook .cjs as a subprocess
 * over stdin with a synthetic Stop payload, point it at a fabricated session via
 * input.session_id (a cAgents-shaped `run_...` hint resolves through the
 * explicit-hint path since COORDINATED is non-terminal), and parse the stdout
 * JSON `decision` field ('block' = incomplete; absent/continue otherwise). The
 * dedup guard self-bypasses under VITEST=true (inherited via ...process.env), so
 * no dedup-file cleanup is required.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
// Phase-0 safety-net (audit team_plugin-full-audit_260717_001): shared fixture
// builders for the appended REC-04 describe.skip block at the bottom of this file.
import { materializeInitZeroAgent, cleanup, hookEnv, SESSIONS_DIR } from './fixtures/safety-net/materialize.mjs';

const PROJECT_ROOT = process.cwd();
const HOOK = join(PROJECT_ROOT, '.claude', 'hooks', 'verify-completion.cjs');
// SESSIONS_DIR is imported from materialize.mjs — this file's own makeSession()
// fixtures share the isolated temp project root with the safety-net builders
// instead of being written into the REAL cagents-memory/sessions/, where a
// sibling test's heuristic session resolution could bind to them mid-run.

// Explicit liveness window so the fresh/stale heartbeat boundary is deterministic
// (never dependent on the machine's default or on subprocess spawn latency).
const LIVENESS_MS = 60000; // 60s

const NOW = Date.now();
const MIN = 60 * 1000;
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();

// State transition 2 min ago: < 30 min => Path A recent-transition branch (:591),
// and < 24h => never hits the upstream staleness skip.
const TX_RECENT = iso(2 * MIN);
// State transition 40 min ago: > 30 min => Path A else / no-recent-transition
// branch (:609). Used only by the bonus Test 5.
const TX_OLD = iso(40 * MIN);
// Heartbeat "now" => within the 60s liveness window => FRESH.
const HB_FRESH = iso(0);
// Heartbeat 2 min ago (120s) => beyond the 60s window => STALE, but < 24h so the
// staleness skip does not fire. Equal to TX_RECENT so the fixture stays internally
// consistent (heartbeat == last transition) while isolating the running-child arm.
const HB_STALE = iso(2 * MIN);
// Heartbeat 10 min ago => STALE under a 60s window, FRESH under a 1h window,
// < 24h either way. Used by the Test 4 liveness-boundary pair.
const HB_10MIN = iso(10 * MIN);

const TS = Date.now().toString(36);
const created = [];

/**
 * Fabricate a mid-COORDINATED `run_` session.
 *
 * @param {string} slug         unique session slug
 * @param {object} opts
 * @param {string} opts.heartbeat    ISO timestamp for status.yaml last_updated_at
 * @param {boolean} opts.childRunning whether the single child agent's stopped_at is null
 * @param {string} [opts.transition]  ISO timestamp for the state_history entered_at
 */
function makeSession(slug, { heartbeat, childRunning, transition = TX_RECENT }) {
  const sid = `act_active-wait-${slug}_${TS}`;
  const dir = join(SESSIONS_DIR, sid);
  created.push(dir);
  mkdirSync(join(dir, 'workflow'), { recursive: true });

  // status.yaml: mid-COORDINATED with a state_history entered_at (drives the
  // Path A recent/no-recent branch) and last_updated_at (drives the heartbeat
  // arm of the discriminator AND the >24h staleness skip).
  writeFileSync(
    join(dir, 'status.yaml'),
    [
      `session_id: ${sid}`,
      `pipeline_state: COORDINATED`,
      `phase: coordinating`,
      `last_updated_at: "${heartbeat}"`,
      `started_at: "${transition}"`,
      `state_history:`,
      `  - state: COORDINATED`,
      `    entered_at: "${transition}"`,
      `    duration_ms: null`,
      ``,
    ].join('\n')
  );

  // agent_tree.yaml: a top-level `root:` block (its stopped_at is null for the
  // whole open session — the discriminator MUST exclude it) plus ONE child in
  // the `agents:` list. The child is a tech-lead CONTROLLER, never a validator,
  // so checkNextStageAgentSpawned() reports the COORDINATED next-stage agent
  // (validator) as ABSENT. The child's stopped_at is the running-child signal.
  const childStopped = childRunning ? 'null' : `"${transition}"`;
  writeFileSync(
    join(dir, 'workflow', 'agent_tree.yaml'),
    [
      `root:`,
      `  agent_id: root-${slug}`,
      `  agent_type: cagents:run`,
      `  depth: 0`,
      `  spawned_at: "${transition}"`,
      `  stopped_at: null`,
      `agents:`,
      `  - agent_id: agent-tl-1`,
      `    agent_type: cagents:tech-lead`,
      `    depth: 1`,
      `    spawned_at: "${transition}"`,
      `    stopped_at: ${childStopped}`,
      ``,
    ].join('\n')
  );

  // Intentionally NO plan.yaml and NO coordination_log.yaml: Path B
  // (coordination_log enforcement) is guarded by `hasPlan`, so omitting plan.yaml
  // keeps Path A the SOLE block source. The pending/in_progress work-item checks
  // and sentinel/self-handling checks are all guarded by coordination_log too.
  return sid;
}

/**
 * spawnSync the Stop hook over stdin. Returns parsed stdout JSON.
 * `livenessMs` sets CAGENTS_SESSION_LIVENESS_MS so the heartbeat boundary is
 * deterministic. CAGENTS_ACTIVE_SESSION is cleared so resolution binds strictly
 * to the explicit session_id hint.
 */
function runHook(sid, livenessMs = LIVENESS_MS) {
  const payload = JSON.stringify({
    session_id: sid,
    stop_hook_active: false,
    hook_event_name: 'Stop',
  });
  const result = spawnSync('node', [HOOK], {
    input: payload,
    encoding: 'utf8',
    timeout: 10000,
    env: {
      ...process.env,
      ...hookEnv(),
      CAGENTS_ACTIVE_SESSION: '',
      CAGENTS_SESSION_LIVENESS_MS: String(livenessMs),
    },
  });
  if (result.status !== 0 && result.status !== null) {
    throw new Error(
      `Hook exited non-zero: status=${result.status}\nstdout=${result.stdout}\nstderr=${result.stderr}`
    );
  }
  try {
    return JSON.parse(result.stdout);
  } catch (e) {
    throw new Error(
      `Hook stdout not valid JSON: "${result.stdout}"\nstderr: ${result.stderr}`
    );
  }
}

describe('verify-completion.cjs Stop-hook actively-working discriminator (FIX-2 / WI-8)', () => {
  afterEach(() => {
    while (created.length) {
      const d = created.pop();
      try {
        if (existsSync(d)) rmSync(d, { recursive: true, force: true });
      } catch {}
    }
  });

  it('Test 1 (FAIL-before, PASS-after) — mid-COORDINATED with a RUNNING child agent (no validator) does NOT block', () => {
    // Running child (stopped_at: null) is the active signal; heartbeat is STALE
    // so this test isolates the running-child arm of the discriminator.
    const sid = makeSession('running-child', {
      heartbeat: HB_STALE,
      childRunning: true,
    });
    const result = runHook(sid);

    // Pre-change: !nextStageSpawned(validator absent) => BLOCK (this assertion FAILS).
    // Post-change: !nextStageSpawned && !runningChild(true) => false => WARNING.
    expect(result.decision).not.toBe('block');
    expect(result.continue).toBe(true);
  });

  it('Test 2 (FAIL-before, PASS-after) — mid-COORDINATED with a FRESH heartbeat and all children stopped does NOT block', () => {
    // No running child (child stopped_at set); heartbeat FRESH (within 60s window)
    // is the active signal — isolates the heartbeat arm of the discriminator.
    const sid = makeSession('fresh-heartbeat', {
      heartbeat: HB_FRESH,
      childRunning: false,
    });
    const result = runHook(sid);

    // Pre-change: !nextStageSpawned => BLOCK (FAILS). Post-change: fresh heartbeat
    // => sessionActivelyWorking true => WARNING.
    expect(result.decision).not.toBe('block');
    expect(result.continue).toBe(true);
  });

  it('Test 3 (abandoned — blocks before AND after) — mid-COORDINATED with NO running child + STALE heartbeat still blocks', () => {
    // Identical to Test 1 EXCEPT the child is stopped: BOTH discriminator signals
    // are false (no running child, heartbeat 2 min old > 60s window). The block
    // must be preserved (FIX-2 must not weaken the abandoned case).
    const sid = makeSession('abandoned', {
      heartbeat: HB_STALE,
      childRunning: false,
    });
    const result = runHook(sid);

    expect(result.decision).toBe('block');
    expect(result.reason).toContain('COORDINATED');
    expect(result.reason).toContain('no next-stage agent spawned');
  });

  it('Test 4 (deterministic liveness boundary) — the SAME fixture blocks under a 60s window but not under a 1h window', () => {
    // Abandoned-shaped fixture (no running child, heartbeat 10 min old). The ONLY
    // variable is CAGENTS_SESSION_LIVENESS_MS, which decides fresh vs stale. This
    // removes wall-clock flakiness AND proves the heartbeat arm is load-bearing.

    // 60s window: 10-min heartbeat is STALE => both signals false => BLOCK.
    // (Blocks pre- and post-change alike — the abandoned invariant.)
    const sidStale = makeSession('boundary-stale', {
      heartbeat: HB_10MIN,
      childRunning: false,
    });
    const stale = runHook(sidStale, 60000);
    expect(stale.decision).toBe('block');

    // 1h window: the SAME 10-min heartbeat is now FRESH => sessionActivelyWorking
    // true => WARNING. Pre-change ignored the heartbeat entirely and BLOCKED, so
    // this sub-assertion FAILS pre-change and PASSES after WI-6.
    const sidFresh = makeSession('boundary-fresh', {
      heartbeat: HB_10MIN,
      childRunning: false,
    });
    const fresh = runHook(sidFresh, 60 * 60 * 1000);
    expect(fresh.decision).not.toBe('block');
    expect(fresh.continue).toBe(true);
  });

  it('Test 5 (bonus — >30min no-transition branch) — a stale-transition session with a FRESH heartbeat does NOT block', () => {
    // Transition 40 min ago => > 30 min => Path A's else / no-recent-transition
    // branch (:609-619). Pre-change that branch did issues.push() UNCONDITIONALLY;
    // post-change it is guarded by !sessionActivelyWorking. A fresh heartbeat keeps
    // the session active, so it must downgrade to a WARNING. Fails pre-change,
    // passes after. last_updated_at is fresh => no >24h staleness skip.
    const sid = makeSession('old-transition-fresh-hb', {
      heartbeat: HB_FRESH,
      childRunning: false,
      transition: TX_OLD,
    });
    const result = runHook(sid);

    expect(result.decision).not.toBe('block');
    expect(result.continue).toBe(true);
  });
});

/**
 * ===========================================================================
 * SAFETY-NET Phase-0 scaffold (audit team_plugin-full-audit_260717_001) —
 * appended REC-04 block. The suite ABOVE (FIX-2 / WI-8) is a LANDED, passing
 * suite for the actively-working discriminator and is intentionally left
 * un-skipped. This SEPARATE describe.skip block below is the not-yet-landed
 * REC-04 assertion; per the ACTION-PLAN Phase-3 line ("extend
 * verify-completion-active-wait.test.js — INIT + fresh heartbeat + 0 `- id:` →
 * BLOCK"), it is appended here rather than in a new file.
 *
 * UN-SKIPPED BY: Phase 3 (REC-04 — INIT-never-spawns 0-child heartbeat gate).
 *
 * WHAT THE UN-SKIPPED ASSERTION MUST PROVE:
 *   A fresh heartbeat may NOT rescue a session that has 0 child agents — its own
 *   init write IS the heartbeat. After REC-04, sessionActivelyWorking() returns
 *   false when `!runningChild` AND agent_tree.yaml has 0 `- id:` entries, so the
 *   INIT-stall block (:613/:626) fires and the session BLOCKS. A fresh heartbeat
 *   WITH a running child still warns.
 *
 * WHY IT'S SKIPPED NOW (fail-if-run):
 *   On pre-REC-04 HEAD, sessionActivelyWorking() returns true on the fresh
 *   heartbeat alone (regardless of child count), so the INIT/0-child session is
 *   downgraded to a warning and Test 1 would observe no block and FAIL its
 *   `toBe('block')`. Skipping keeps `npm test` GREEN until REC-04 lands.
 *
 * FIXTURE: materializeInitZeroAgent (fixture (a)) — the SAME fixture the Phase-2
 * honesty suite consumes, satisfying the "fixture (a) backs BOTH Phase-2 and
 * Phase-3 assertions" contract.
 * ===========================================================================
 */
describe('verify-completion INIT 0-child heartbeat gate (REC-04; Phase 3 un-skips)', () => {
  const dirs = [];
  afterEach(() => cleanup(dirs));

  it('Test 1 (FAIL-before, PASS-after) — INIT + fresh heartbeat + 0 `- id:` children → BLOCK', () => {
    // Fresh heartbeat (now), zero child agents: the init write is the only
    // heartbeat, so it must NOT rescue the stalled session.
    const { sid, dir } = materializeInitZeroAgent({ heartbeatMsAgo: 0, withRunningChild: false });
    dirs.push(dir);
    const result = runHook(sid);
    expect(result.decision).toBe('block');
  });

  it('Test 2 (control) — INIT + fresh heartbeat WITH a running child → warn (not block)', () => {
    // A running child means real work is in flight; the fresh-heartbeat rescue is
    // legitimate here, so REC-04 must NOT block this case.
    const { sid, dir } = materializeInitZeroAgent({
      heartbeatMsAgo: 0,
      withRunningChild: true,
      childSpawnedMsAgo: 10 * 1000,
    });
    dirs.push(dir);
    const result = runHook(sid);
    expect(result.decision).not.toBe('block');
    expect(result.continue).toBe(true);
  });
});
