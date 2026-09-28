/**
 * Bug-driven regression (act_concurrent-session-hooks_260927_001, WI-8).
 *
 * User report: two Claude transcripts ran in ONE project dir. Transcript B had
 * no cAgents session (or its own unrelated one), yet its hooks acted on
 * transcript A's session: Stop blocked B on A's unfinished pipeline, SessionEnd
 * finalized A, governance denied B's writes because of A's controller, and the
 * trackers filed B's agents into A's agent_tree.yaml.
 *
 * Strict ownership: a hook acts only on a session owned by its payload
 * session_id. This file fires every relevant hook as UUID-B, as registered in
 * .claude/settings.json, and asserts A is never touched, blocked on, or named.
 * Positive control: the same hooks still act on A for UUID-A.
 *
 * VERIFY_HOOK_PATH overrides the Stop hook file (used to demonstrate red
 * against the pre-fix verify-completion.cjs). It is unset in normal runs.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const RUN_HOOK = join(HOOKS_DIR, 'run-hook.cjs');
const STOP_HOOK = process.env.VERIFY_HOOK_PATH || join(HOOKS_DIR, 'verify-completion.cjs');

const UUID_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const UUID_B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const SID_A = 'act_owned-by-a_260927_001';
const TEAM_SID_A = 'team_owned-by-a_260927_001';
const SID_B = 'act_owned-by-b_260927_001';

// A's work is three hours old and its heartbeat is stale. The tech-lead
// controller has no stopped_at, and its executor has already stopped, so the
// controller is A's active writer. The Stop hook blocks on this hung pipeline
// for its owner.
const OLD = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

let projectDir;
let mem;
let mapDir;
let dirA;
let teamDirA;

const TREE_A = [
  'root:',
  '  agent_id: root-a',
  '  agent_type: cagents:act',
  '  depth: 0',
  `  spawned_at: "${OLD}"`,
  '  stopped_at: null',
  'agents:',
  '  - id: "agent-tl-1"',
  '    agent_id: agent-tl-1',
  '    cagents_type: cagents:tech-lead',
  '    agent_type: cagents:tech-lead',
  '    parent: "root"',
  '    depth: 1',
  `    spawned_at: "${OLD}"`,
  '    stopped_at: null',
  '  - id: "agent-be-1"',
  '    agent_id: agent-be-1',
  '    cagents_type: cagents:backend-developer',
  '    agent_type: cagents:backend-developer',
  '    parent: "agent-tl-1"',
  '    depth: 2',
  `    spawned_at: "${OLD}"`,
  `    stopped_at: "${OLD}"`,
  '',
].join('\n');

function seedOwnedA(sid) {
  const dir = join(mem, 'sessions', sid);
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeFileSync(join(dir, 'status.yaml'), [
    `session_id: ${sid}`,
    'pipeline_state: COORDINATED',
    'phase: coordinating',
    'completed_at: null',
    'result: null',
    `started_at: "${OLD}"`,
    `last_updated_at: "${OLD}"`,
    'state_history:',
    '  - state: COORDINATED',
    `    entered_at: "${OLD}"`,
    '    duration_ms: null',
    '',
  ].join('\n'));
  writeFileSync(join(dir, 'instruction.yaml'), `session_id: ${sid}\nrequest: build a thing\n`);
  writeFileSync(join(dir, 'workflow', 'agent_tree.yaml'), TREE_A);
  if (sid.startsWith('team_')) {
    mkdirSync(join(dir, 'team', 'metrics'), { recursive: true });
    writeFileSync(join(dir, 'team', 'task_list.yaml'), 'tasks:\n  - id: WI-1\n    status: in_progress\n');
    writeFileSync(join(dir, 'team', 'metrics', 'timing.yaml'),
      `started_at: "${OLD}"\ncompleted_at: null\ntotal_duration_seconds: 0\n`);
  }
  writeFileSync(join(dir, 'session.sdk_id'), UUID_A);
  return dir;
}

// B's own unrelated session: completed, so B has nothing of its own to block on.
function seedOwnedB() {
  const dir = join(mem, 'sessions', SID_B);
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeFileSync(join(dir, 'status.yaml'), [
    `session_id: ${SID_B}`,
    'pipeline_state: VALIDATED',
    'phase: completed',
    'result: PASS',
    `completed_at: "${OLD}"`,
    `last_updated_at: "${OLD}"`,
    '',
  ].join('\n'));
  writeFileSync(join(dir, 'session.sdk_id'), UUID_B);
  writeFileSync(join(mapDir, UUID_B), SID_B);
}

function snapshotDir(dir) {
  const out = {};
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out[p] = { mtimeMs: statSync(p).mtimeMs, bytes: readFileSync(p).toString('base64') };
    }
  };
  walk(dir);
  return out;
}

function snapshotA() {
  const pointer = join(mapDir, UUID_A);
  return {
    act: snapshotDir(dirA),
    team: snapshotDir(teamDirA),
    pointer: { bytes: readFileSync(pointer, 'utf8'), mtimeMs: statSync(pointer).mtimeMs },
  };
}

function hookEnv() {
  const env = { ...process.env };
  delete env.CAGENTS_ACTIVE_SESSION;
  delete env.CAGENTS_SESSION_ID;
  delete env.VERIFY_HOOK_PATH;
  env.CLAUDE_PROJECT_DIR = projectDir;
  env.CAGENTS_TEST_ROOT = projectDir;
  env.CAGENTS_DELEGATION_ENFORCEMENT = 'block';
  env.CAGENTS_PATTERN_EXTRACTOR_OVERRIDE = 'skip';
  env.CAGENTS_SESSION_LIVENESS_MS = '60000';
  return env;
}

// Per-test budget: above the 60s spawnSync timeout so a slow hook under load
// fails loud from spawnHook instead of vitest killing the test first.
const SPAWN_TEST_TIMEOUT = 120000;

// Fail loud on timeout, spawn error, or non-zero exit.
function spawnHook(args, payload) {
  const res = spawnSync('node', args, {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 60000,
    env: hookEnv(),
    cwd: projectDir,
  });
  if (res.error) throw new Error(`hook ${args.join(' ')} spawn error: ${res.error.message}`);
  if (res.status !== 0) {
    throw new Error(`hook ${args.join(' ')} exit ${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  }
  let parsed = {};
  const trimmed = (res.stdout || '').trim();
  if (trimmed) parsed = JSON.parse(trimmed.split('\n').filter(Boolean).pop());
  return { stdout: res.stdout || '', stderr: res.stderr || '', parsed };
}

const viaRunHook = (name, payload) => spawnHook([RUN_HOOK, name], payload);

// Every hook B's transcript can fire, routed as registered in settings.json.
const EVENTS = {
  'Stop (verify-completion)': (uuid) =>
    spawnHook([STOP_HOOK], { hook_event_name: 'Stop', session_id: uuid, stop_hook_active: false }),
  'SessionEnd (team-stop)': (uuid) =>
    viaRunHook('team-stop', { hook_event_name: 'SessionEnd', session_id: uuid, cwd: projectDir }),
  'PreToolUse Write src/x.js (write-edit-dispatch)': (uuid) =>
    viaRunHook('write-edit-dispatch', {
      hook_event_name: 'PreToolUse', session_id: uuid, cwd: projectDir, tool_name: 'Write',
      tool_input: { file_path: join(projectDir, 'src', 'x.js'), content: 'module.exports = 1;\n' },
    }),
  'PreToolUse Agent (agent-dispatch)': (uuid) =>
    viaRunHook('agent-dispatch', {
      hook_event_name: 'PreToolUse', session_id: uuid, cwd: projectDir, tool_name: 'Agent',
      tool_input: { subagent_type: 'cagents:backend-developer', description: 'x', prompt: 'Do some work.' },
    }),
  "SubagentStart naming A's dir (subagent-tracker)": (uuid) =>
    viaRunHook('subagent-tracker', {
      hook_event_name: 'SubagentStart', session_id: uuid, agent_id: 'agent-b-1', agent_type: 'general-purpose',
      tool_input: { prompt: `SESSION_DIR: cagents-memory/sessions/${SID_A}` },
    }),
  "SubagentStop of A's agent id (subagent-stop-tracker)": (uuid) =>
    viaRunHook('subagent-stop-tracker', {
      hook_event_name: 'SubagentStop', session_id: uuid, agent_id: 'agent-tl-1', agent_type: 'general-purpose',
    }),
  "PostToolUse Write of A's status.yaml (post-write-validator)": (uuid) =>
    viaRunHook('post-write-validator', {
      hook_event_name: 'PostToolUse', session_id: uuid, cwd: projectDir, tool_name: 'Write',
      tool_input: { file_path: join(dirA, 'status.yaml') },
    }),
};

function setup() {
  projectDir = mkdtempSync(join(tmpdir(), 'cagents-two-transcripts-'));
  mem = join(projectDir, 'cagents-memory');
  mapDir = join(mem, '_system', 'sdk_session_map');
  mkdirSync(mapDir, { recursive: true });
  mkdirSync(join(mem, '_system', 'logs'), { recursive: true });
  mkdirSync(join(projectDir, 'src'), { recursive: true });
  dirA = seedOwnedA(SID_A);
  teamDirA = seedOwnedA(TEAM_SID_A);
  writeFileSync(join(mapDir, UUID_A), SID_A);
}

function teardown() {
  try { rmSync(projectDir, { recursive: true, force: true }); } catch { /* best effort */ }
}

describe.each([
  ['UUID-B has no cAgents session', false],
  ['UUID-B owns its own unrelated session', true],
])('two transcripts, one project dir: %s', (_label, bOwnsSession) => {
  beforeEach(() => {
    setup();
    if (bOwnsSession) seedOwnedB();
  });
  afterEach(teardown);

  for (const [event, fire] of Object.entries(EVENTS)) {
    it(`${event} from UUID-B never blocks on, names, or touches A`, () => {
      const before = snapshotA();
      const { stdout, parsed } = fire(UUID_B);

      expect(parsed.decision).not.toBe('block');
      expect(parsed.hookSpecificOutput?.permissionDecision).not.toBe('deny');
      expect(stdout).not.toContain(SID_A);
      expect(stdout).not.toContain(TEAM_SID_A);

      const after = snapshotA();
      expect(after).toEqual(before);
      expect(readFileSync(join(dirA, 'session.sdk_id'), 'utf8')).toBe(UUID_A);
      expect(readFileSync(join(teamDirA, 'session.sdk_id'), 'utf8')).toBe(UUID_A);
      expect(existsSync(join(dirA, 'workflow', 'execution_summary.yaml'))).toBe(false);
      expect(existsSync(join(dirA, 'completion_summary.yaml'))).toBe(false);
      // No pointer for UUID-B may lead into A's sessions.
      const pointerB = join(mapDir, UUID_B);
      if (existsSync(pointerB)) {
        const target = readFileSync(pointerB, 'utf8').trim();
        expect([SID_A, TEAM_SID_A]).not.toContain(target);
      }
    }, SPAWN_TEST_TIMEOUT);
  }
});

describe('post-write-validator heartbeat is ownership-gated', () => {
  beforeEach(setup);
  afterEach(teardown);

  // B's PostToolUse on A's status.yaml must not refresh A's heartbeat
  // (last_updated_at), or a hung A would look alive forever.
  it("UUID-B's PostToolUse Write of A's status.yaml leaves its bytes unchanged", () => {
    const statusPath = join(dirA, 'status.yaml');
    const before = readFileSync(statusPath, 'utf8');
    EVENTS["PostToolUse Write of A's status.yaml (post-write-validator)"](UUID_B);
    const after = readFileSync(statusPath, 'utf8');
    expect(after).toContain(`last_updated_at: "${OLD}"`);
    expect(after).toBe(before);
  }, SPAWN_TEST_TIMEOUT);

  it("UUID-A's PostToolUse Write of its own status.yaml still refreshes the heartbeat", () => {
    const statusPath = join(dirA, 'status.yaml');
    EVENTS["PostToolUse Write of A's status.yaml (post-write-validator)"](UUID_A);
    expect(readFileSync(statusPath, 'utf8')).not.toContain(`last_updated_at: "${OLD}"`);
  }, SPAWN_TEST_TIMEOUT);
});

describe('positive control: the owner UUID-A still acts on A', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('Stop from UUID-A blocks on its hung pipeline', () => {
    const { parsed } = EVENTS['Stop (verify-completion)'](UUID_A);
    expect(parsed.decision).toBe('block');
  }, SPAWN_TEST_TIMEOUT);

  it("UUID-A's own src/ write is denied by its active controller", () => {
    const { parsed } = EVENTS['PreToolUse Write src/x.js (write-edit-dispatch)'](UUID_A);
    expect(parsed.hookSpecificOutput?.permissionDecision).toBe('deny');
  }, SPAWN_TEST_TIMEOUT);
});
