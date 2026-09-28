// WI-6: spawn trackers never file into a session owned by another transcript.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const START_HOOK = join(HOOKS_DIR, 'subagent-tracker.cjs');
const STOP_HOOK = join(HOOKS_DIR, 'subagent-stop-tracker.cjs');
const SESSION_A = 'act_owned-by-a_260927_001';
const UUID_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const UUID_B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';

const TREE = `agents:
  - id: "agent-a1"
    type: "general-purpose"
    parent: "root"
    depth: 1
    spawned_at: "2026-09-27T10:00:00Z"
    stopped_at: null
`;

function runHook(hook, input, projectDir) {
  const env = { ...process.env, CLAUDE_PROJECT_DIR: projectDir };
  delete env.CAGENTS_ACTIVE_SESSION;
  const r = spawnSync('node', [hook], { input: JSON.stringify(input), encoding: 'utf8', env, timeout: 60000 });
  if (r.error) throw r.error;
  return r;
}

describe('tracker ownership (WI-6)', () => {
  let tmp, mem, dirA, treeA, logFile;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'tracker-ownership-'));
    mem = join(tmp, 'cagents-memory');
    dirA = join(mem, 'sessions', SESSION_A);
    mkdirSync(join(dirA, 'workflow'), { recursive: true });
    mkdirSync(join(mem, '_system', 'logs'), { recursive: true });
    mkdirSync(join(mem, '_system', 'sdk_session_map'), { recursive: true });
    writeFileSync(join(dirA, 'status.yaml'), 'phase: executing\npipeline_state: COORDINATED\n');
    writeFileSync(join(dirA, 'session.sdk_id'), UUID_A);
    writeFileSync(join(mem, '_system', 'sdk_session_map', UUID_A), SESSION_A);
    treeA = join(dirA, 'workflow', 'agent_tree.yaml');
    writeFileSync(treeA, TREE);
    logFile = join(mem, '_system', 'logs', 'agent_spawns.log');
  });

  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  const prompts = {
    'no prompt': undefined,
    'unrelated prompt': 'Do some work.',
    "prompt naming A's path": `SESSION_DIR: cagents-memory/sessions/${SESSION_A}`,
  };

  for (const [label, prompt] of Object.entries(prompts)) {
    it(`UUID-B SubagentStart + SubagentStop (${label}) leave A byte-identical`, () => {
      const before = readFileSync(treeA);
      const start = { session_id: UUID_B, agent_id: 'agent-b1', agent_type: 'general-purpose' };
      if (prompt !== undefined) start.tool_input = { prompt };
      const r1 = runHook(START_HOOK, start, tmp);
      expect(r1.status).toBe(0);
      const stop = { session_id: UUID_B, agent_id: 'agent-a1', agent_type: 'general-purpose' };
      if (prompt !== undefined) stop.tool_input = { prompt };
      const r2 = runHook(STOP_HOOK, stop, tmp);
      expect(r2.status).toBe(0);

      expect(readFileSync(treeA).equals(before)).toBe(true);
      expect(readFileSync(join(dirA, 'session.sdk_id'), 'utf8')).toBe(UUID_A);
      expect(existsSync(join(mem, '_system', 'sdk_session_map', UUID_B))).toBe(false);
      const log = readFileSync(logFile, 'utf8');
      expect(log).toContain('agent_id=agent-b1');
      expect(log).toMatch(/agent_id=agent-a1 .*event=stop/);
    });
  }

  it('positive control: UUID-A records start and stop into A', () => {
    runHook(START_HOOK, { session_id: UUID_A, agent_id: 'agent-a2', agent_type: 'general-purpose' }, tmp);
    runHook(STOP_HOOK, { session_id: UUID_A, agent_id: 'agent-a1', agent_type: 'general-purpose' }, tmp);
    const tree = readFileSync(treeA, 'utf8');
    expect(tree).toContain('agent-a2');
    expect(tree).toMatch(/id: "?agent-a1"?\n(?:\s{4}.*\n)*?\s{4}stopped_at: '?\d{4}-/);
  });

  it('marker-only ownership (no map pointer): UUID-A start and stop record into A and re-seed the pointer', () => {
    const pointer = join(mem, '_system', 'sdk_session_map', UUID_A);
    rmSync(pointer);
    runHook(START_HOOK, { session_id: UUID_A, agent_id: 'agent-a3', agent_type: 'general-purpose' }, tmp);
    expect(readFileSync(treeA, 'utf8')).toContain('agent-a3');
    expect(readFileSync(pointer, 'utf8').trim()).toBe(SESSION_A);

    rmSync(pointer);
    runHook(STOP_HOOK, { session_id: UUID_A, agent_id: 'agent-a1', agent_type: 'general-purpose' }, tmp);
    expect(readFileSync(treeA, 'utf8')).toMatch(/id: "?agent-a1"?\n(?:\s{4}.*\n)*?\s{4}stopped_at: '?\d{4}-/);
    expect(readFileSync(pointer, 'utf8').trim()).toBe(SESSION_A);
  });

  it('unclaimed prompt-hinted session is accepted and claimed by the spawning UUID', () => {
    const unclaimed = 'act_unclaimed_260927_002';
    const dirU = join(mem, 'sessions', unclaimed);
    mkdirSync(join(dirU, 'workflow'), { recursive: true });
    writeFileSync(join(dirU, 'status.yaml'), 'phase: executing\npipeline_state: COORDINATED\n');
    runHook(START_HOOK, {
      session_id: UUID_B, agent_id: 'agent-b2', agent_type: 'general-purpose',
      tool_input: { prompt: `SESSION_DIR: cagents-memory/sessions/${unclaimed}` },
    }, tmp);
    expect(readFileSync(join(dirU, 'workflow', 'agent_tree.yaml'), 'utf8')).toContain('agent-b2');
    expect(readFileSync(join(dirU, 'session.sdk_id'), 'utf8')).toBe(UUID_B);
  });
});
