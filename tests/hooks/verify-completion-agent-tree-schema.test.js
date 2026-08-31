/**
 * WI-1 (run_improve-skills-hooks_260703_001) regression test:
 * verify-completion.cjs wrong-schema agent_tree.yaml regex cluster + dead
 * events/ revision reader.
 *
 * Background (M-24 bug class, same as team-stop.cjs:232-251 fixed in v12.12.2):
 * subagent-tracker.cjs writes agent_tree.yaml entries via yaml.dump with keys
 * `- id:` / `type:` / `cagents_type:` — NEVER `agent_id:` or `agent_type:`.
 * The root is a separate `root:` block with an `agent:` key (not a list entry).
 * verify-completion.cjs matched the WRONG keys at 4 sites:
 *
 *   (a) checkNextStageAgentSpawned (:88): `agent_type:\s*["']?cagents:{agent}`
 *       never matches a real tree, so next-stage detection degrades to the weak
 *       `description:` line fallback; a spawned-and-stopped next-stage agent
 *       reads as "not spawned" and feeds Path A's BLOCK once the heartbeat is
 *       stale (deadlocking a session that legitimately advanced).
 *   (b) finalizeSessionLifecycle (:185): `- agent_id:` regex is dead — the
 *       lead/child stopped_at: null is never finalized on terminal sessions.
 *   (c) childAgentCount fallback (:722): `agent_id:` count is dead — always 0,
 *       so the DELEGATION VIOLATION warning false-positives whenever the
 *       depth-based primary count is 0 (e.g. the known first-entry depth:0 bug).
 *   (d) outcomeAgentCount (:1428): `/agent_id:/g` makes agent_count in
 *       _knowledge/learning/session_outcomes.jsonl ALWAYS 0.
 *   Plus (:1444-1456): revision_count read workflow/events/*.yaml — a directory
 *       removed in v12.6.0 (always 0, known-dead) — must be emitted honestly
 *       (null) instead of a fabricated 0.
 *
 * FAILING-BEFORE / PASSING-AFTER contract:
 *   - Test 1 FAILS pre-fix: realistic tree with a spawned+STOPPED planner in
 *     ORCHESTRATED state + stale heartbeat -> pre-fix BLOCKS ("no next-stage
 *     agent spawned") because neither the `agent_type:` regex nor the
 *     description fallback matches; post-fix the `type: cagents:planner` key
 *     matches -> warning only.
 *   - Test 2 passes BOTH before and after (invariant guard): a genuinely
 *     abandoned session (next-stage agent truly absent) must STILL block —
 *     proves the fix does not weaken block/warn topology (HC: criterion 4).
 *   - Test 3 FAILS pre-fix: session_outcomes.jsonl line for a 3-agent realistic
 *     tree must carry agent_count 3 (pre-fix 0) and revision_count null
 *     (pre-fix fabricated 0 from the dead events/ reader).
 *   - Test 4 FAILS pre-fix: terminal session finalize must set the child
 *     entry's stopped_at (pre-fix the `- agent_id:` regex never matches, null
 *     survives). root: stopped_at stays null (scoping preserved).
 *   - Test 5 FAILS pre-fix: PLANNED session with two real-schema depth:0
 *     entries must NOT emit the DELEGATION VIOLATION warning (pre-fix the
 *     `agent_id:` fallback counts 0 children -> false positive).
 *   - Test 6 passes BOTH before and after: legacy `agent_type:` trees remain
 *     detected (back-compat pin for the alternation).
 *
 * Test pattern mirrors tests/hooks/verify-completion-active-wait.test.js:
 * spawnSync the hook over stdin with a synthetic Stop payload bound to a
 * fabricated session via input.session_id. Unlike that test, fixtures live in
 * an ISOLATED temp project root via CLAUDE_PROJECT_DIR (hook-utils.cjs derives
 * PROJECT_ROOT from it), so the session_outcomes.jsonl assertion reads a fresh
 * file, not the repo's runtime state. The dedup guard self-bypasses under
 * VITEST=true (inherited via ...process.env).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const REPO_ROOT = process.cwd();
const HOOK = join(REPO_ROOT, '.claude', 'hooks', 'verify-completion.cjs');

let TMP_PROJECT; // isolated CLAUDE_PROJECT_DIR
let SESSIONS_DIR;
let JSONL_PATH;

const NOW = Date.now();
const MIN = 60 * 1000;
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();

// State transition 2 min ago: < 30 min => Path A recent-transition branch,
// and < 24h => never hits the upstream staleness skip.
const TX_RECENT = iso(2 * MIN);
// Heartbeat 2 min ago (120s) => beyond the explicit 60s liveness window =>
// STALE (sessionActivelyWorking's heartbeat arm false), but < 24h.
const HB_STALE = iso(2 * MIN);

const TS = Date.now().toString(36);

/**
 * Write a status.yaml for a fabricated session.
 */
function writeStatus(dir, sid, pipelineState) {
  writeFileSync(
    join(dir, 'status.yaml'),
    [
      `session_id: ${sid}`,
      `pipeline_state: ${pipelineState}`,
      `last_updated_at: "${HB_STALE}"`,
      `started_at: "${TX_RECENT}"`,
      `state_history:`,
      `  - state: ${pipelineState}`,
      `    entered_at: "${TX_RECENT}"`,
      `    duration_ms: null`,
      ``,
    ].join('\n')
  );
}

/**
 * Render a REALISTIC agent_tree.yaml exactly as subagent-tracker.cjs writes it
 * (yaml.dump shape): `root:` block with `agent:` key, `agents:` list entries
 * keyed `- id:` / `type:` / `cagents_type:` — no `agent_id:` / `agent_type:`.
 *
 * @param {string} sid
 * @param {Array<{id:string,type:string,depth:number,stopped:string|null,role:string}>} agents
 */
function realTree(sid, agents) {
  const lines = [
    `schema_version: '1'`,
    `session_id: ${sid}`,
    `root:`,
    `  agent: cagents:act`,
    `  spawned_at: '${TX_RECENT}'`,
    `  stopped_at: null`,
    `agents:`,
  ];
  for (const a of agents) {
    lines.push(
      `  - id: ${a.id}`,
      `    type: ${a.type}`,
      `    parent: pipeline`,
      `    depth: ${a.depth}`,
      `    spawned_at: '${TX_RECENT}'`,
      `    stopped_at: ${a.stopped === null ? 'null' : `'${a.stopped}'`}`,
      `    session: ${sid}`,
      `    cagents_type: ${a.type}`,
      `    role_description: ${a.role}`
    );
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Create a fabricated session under the isolated temp project root.
 * Intentionally NO plan.yaml / coordination_log.yaml so Path B (hasPlan-guarded)
 * and the coord-log checks are skipped — Path A / the tree checks stay isolated.
 */
function makeSession(slug, pipelineState, treeContent) {
  const sid = `act_ats-${slug}_${TS}`;
  const dir = join(SESSIONS_DIR, sid);
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeStatus(dir, sid, pipelineState);
  writeFileSync(join(dir, 'workflow', 'agent_tree.yaml'), treeContent);
  return { sid, dir };
}

/**
 * spawnSync the Stop hook over stdin, bound to the isolated project root.
 * Returns parsed stdout JSON.
 */
function runHook(sid) {
  const payload = JSON.stringify({
    session_id: sid,
    stop_hook_active: false,
    hook_event_name: 'Stop',
  });
  const result = spawnSync('node', [HOOK], {
    input: payload,
    encoding: 'utf8',
    timeout: 15000,
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: TMP_PROJECT,
      CAGENTS_ACTIVE_SESSION: '',
      CAGENTS_SESSION_ID: '',
      CAGENTS_SESSION_LIVENESS_MS: '60000',
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

/** Read the session_outcomes.jsonl line for a given session_id (last match). */
function readOutcome(sid) {
  expect(existsSync(JSONL_PATH), `expected ${JSONL_PATH} to exist`).toBe(true);
  const lines = readFileSync(JSONL_PATH, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .filter((o) => o.session_id === sid);
  expect(lines.length, `expected an outcome line for ${sid}`).toBeGreaterThan(0);
  return lines[lines.length - 1];
}

describe('verify-completion.cjs agent_tree.yaml real-schema regexes (WI-1)', () => {
  beforeAll(() => {
    TMP_PROJECT = mkdtempSync(join(tmpdir(), 'cagents-ats-'));
    SESSIONS_DIR = join(TMP_PROJECT, 'cagents-memory', 'sessions');
    JSONL_PATH = join(TMP_PROJECT, 'cagents-memory', '_knowledge', 'learning', 'session_outcomes.jsonl');
    mkdirSync(SESSIONS_DIR, { recursive: true });
  });

  afterAll(() => {
    try {
      if (TMP_PROJECT && existsSync(TMP_PROJECT)) rmSync(TMP_PROJECT, { recursive: true, force: true });
    } catch {}
  });

  it('Test 1 (FAIL-before, PASS-after) — a spawned+STOPPED next-stage agent in the REAL schema is detected (no block)', () => {
    // ORCHESTRATED => expected next-stage agent is the planner. The planner WAS
    // spawned and already stopped (real `type:`/`cagents_type:` keys). Heartbeat
    // is stale and no child is running, so sessionActivelyWorking is false —
    // detection of the spawned planner is the ONLY thing standing between this
    // session and a Path A block. role_description deliberately avoids the word
    // "planner" so the pre-fix `description:` line fallback cannot mask the bug.
    const { sid } = makeSession(
      'next-stage',
      'ORCHESTRATED',
      realTree(`act_ats-next-stage_${TS}`, [
        { id: 'aaaa000000000001', type: 'cagents:planner', depth: 1, stopped: TX_RECENT, role: 'Decomposition + objectives + controller selection' },
      ])
    );
    const result = runHook(sid);

    // Pre-fix: `agent_type:` regex never matches a real tree AND the
    // description fallback finds no "planner" line => nextStageSpawned=false
    // => BLOCK (this assertion FAILS). Post-fix: `type: cagents:planner`
    // matches => warning only.
    expect(result.decision).not.toBe('block');
    expect(result.continue).toBe(true);
  });

  it('Test 2 (invariant — blocks before AND after) — a truly-absent next-stage agent still blocks', () => {
    // Same shape as Test 1 but the only child is a stopped orchestrator — the
    // expected planner genuinely never spawned. Both discriminator arms are
    // false (stale heartbeat, no running child). The block MUST be preserved:
    // the schema fix may not weaken the abandoned-session topology (criterion 4).
    const { sid } = makeSession(
      'abandoned',
      'ORCHESTRATED',
      realTree(`act_ats-abandoned_${TS}`, [
        { id: 'bbbb000000000001', type: 'cagents:orchestrator', depth: 1, stopped: TX_RECENT, role: 'Workflow phase conductor' },
      ])
    );
    const result = runHook(sid);

    expect(result.decision).toBe('block');
    expect(result.reason).toContain('ORCHESTRATED');
    expect(result.reason).toContain('no next-stage agent spawned');
  });

  it('Test 3 (FAIL-before, PASS-after) — session_outcomes.jsonl agent_count counts real `- id:` entries; revision_count is honest null', () => {
    // COORDINATED with 3 realistic agents (tech-lead still running => the
    // actively-working discriminator keeps this a warning either way — this
    // test isolates the JSONL analytics emission, not the block topology).
    const { sid } = makeSession(
      'outcome',
      'COORDINATED',
      realTree(`act_ats-outcome_${TS}`, [
        { id: 'cccc000000000001', type: 'cagents:orchestrator', depth: 1, stopped: TX_RECENT, role: 'Workflow phase conductor' },
        { id: 'cccc000000000002', type: 'cagents:planner', depth: 1, stopped: TX_RECENT, role: 'Decomposition + objectives' },
        { id: 'cccc000000000003', type: 'cagents:tech-lead', depth: 1, stopped: null, role: 'Controller coordinating work items' },
      ])
    );
    runHook(sid);
    const outcome = readOutcome(sid);

    // Pre-fix: /agent_id:/g never matches the real schema => agent_count 0
    // (FAILS). Post-fix: three `- id:` entries => 3.
    expect(outcome.agent_count).toBe(3);
    expect(outcome.agent_count).toBeGreaterThan(0);

    // Pre-fix: the dead workflow/events/ reader (dir removed in v12.6.0)
    // fabricated revision_count 0 (FAILS). Post-fix: emitted honestly as null.
    expect(outcome.revision_count).toBeNull();
  });

  it('Test 4 (FAIL-before, PASS-after) — terminal-session finalize sets the child stopped_at in the REAL schema; root stays untouched', () => {
    // Terminal state 'complete' => finalizeSessionLifecycle runs. The single
    // child entry has stopped_at: null and must be finalized. The `root:`
    // block's stopped_at precedes the first `- id:` and must remain null
    // (root lifecycle belongs to team-stop.cjs Phase 1 at SessionEnd).
    const { sid, dir } = makeSession(
      'finalize',
      'complete',
      realTree(`act_ats-finalize_${TS}`, [
        { id: 'dddd000000000001', type: 'cagents:tech-lead', depth: 1, stopped: null, role: 'Controller coordinating work items' },
      ])
    );
    runHook(sid);
    const tree = readFileSync(join(dir, 'workflow', 'agent_tree.yaml'), 'utf8');

    // root block: stopped_at still null (scoping preserved).
    const rootRegion = tree.split(/^agents:/m)[0];
    expect(rootRegion).toMatch(/stopped_at:\s*null/);

    // agents region: the child's stopped_at is finalized (no null left).
    // Pre-fix the `- agent_id:` regex never matched => null survived (FAILS).
    const childRegion = tree.split(/^agents:/m)[1];
    expect(childRegion).not.toMatch(/stopped_at:\s*null/);
    expect(childRegion).toMatch(/stopped_at:\s*"\d{4}-\d{2}-\d{2}T/);
  });

  it('Test 5 (FAIL-before, PASS-after) — real-schema children suppress the DELEGATION VIOLATION false positive when depth-based count is 0', () => {
    // PLANNED (a PRE_COORDINATED state) with TWO real-schema entries at
    // depth: 0 (mimicking the known first-entry depth bug), so the depth>=1
    // primary count is 0 and the fallback fires. Pre-fix the fallback counted
    // `agent_id:` keys => 0 children => DELEGATION VIOLATION warning (FAILS).
    // Post-fix it counts `- id:` entries => 2 => no violation. root's
    // stopped_at: null keeps the PLANNED branch on the warning path (no block),
    // so completion_summary.yaml is written with the warning list.
    const { sid, dir } = makeSession(
      'fallback',
      'PLANNED',
      realTree(`act_ats-fallback_${TS}`, [
        { id: 'eeee000000000001', type: 'cagents:orchestrator', depth: 0, stopped: TX_RECENT, role: 'Workflow phase conductor' },
        { id: 'eeee000000000002', type: 'cagents:planner', depth: 0, stopped: TX_RECENT, role: 'Decomposition + objectives' },
      ])
    );
    const result = runHook(sid);
    expect(result.decision).not.toBe('block');

    const summary = readFileSync(join(dir, 'completion_summary.yaml'), 'utf8');
    expect(summary).not.toContain('DELEGATION VIOLATION');
  });

  it('Test 6 (back-compat pin — passes before AND after) — legacy `agent_type:` trees are still detected', () => {
    // A legacy-shaped tree (pre-yaml.dump era / old fixtures) using
    // `- agent_id:` / `agent_type:` keys. The alternation must keep matching it
    // so historical sessions on disk do not regress to blocks.
    const sid = `act_ats-legacy_${TS}`;
    const dir = join(SESSIONS_DIR, sid);
    mkdirSync(join(dir, 'workflow'), { recursive: true });
    writeStatus(dir, sid, 'ORCHESTRATED');
    writeFileSync(
      join(dir, 'workflow', 'agent_tree.yaml'),
      [
        `root:`,
        `  agent_id: root-legacy`,
        // DELIBERATE legacy-session model: `cagents:run` is retained on purpose —
        // this tree models a pre-rename `/run` session as it exists on disk today
        // (18 live + 26 archived `run_*` session dirs). Do NOT sweep it to `act`.
        `  agent_type: cagents:run`,
        `  stopped_at: null`,
        `agents:`,
        `  - agent_id: agent-legacy-1`,
        `    agent_type: cagents:planner`,
        `    depth: 1`,
        `    spawned_at: "${TX_RECENT}"`,
        `    stopped_at: "${TX_RECENT}"`,
        ``,
      ].join('\n')
    );
    const result = runHook(sid);

    expect(result.decision).not.toBe('block');
    expect(result.continue).toBe(true);
  });
});
