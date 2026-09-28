import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';

/**
 * team-stop.cjs (SessionEnd) finalizes only the session owned by the payload
 * UUID. A SessionEnd from another transcript must leave a foreign session
 * byte-identical: no agent tree cleanup, no execution_summary.yaml, and no
 * reaped sdk_session_map pointer.
 */

const HOOK = join(process.cwd(), '.claude/hooks/team-stop.cjs');
const UUID_A = 'aaaaaaaa-1111-4222-8333-444444444444';
const UUID_B = 'bbbbbbbb-5555-4666-8777-888888888888';

const TREE = [
  'root:',
  '  agent: lead',
  '  spawned_at: "2026-09-27T00:00:00Z"',
  '  stopped_at: null',
  'agents:',
  '  - agent: cagents:tech-lead',
  '    spawned_at: "2026-09-27T00:00:00Z"',
  '    stopped_at: null',
  '  - agent: cagents:backend-developer',
  '    spawned_at: "2026-09-27T00:01:00Z"',
  '    stopped_at: null',
  '',
].join('\n');

let sandbox;

function makeSession(sessionId, owner) {
  const mem = join(sandbox, 'cagents-memory');
  const dir = join(mem, 'sessions', sessionId);
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeFileSync(join(dir, 'status.yaml'),
    `session_id: ${sessionId}\nphase: executing\npipeline_state: COORDINATED\ncompleted_at: null\nresult: null\n`);
  writeFileSync(join(dir, 'workflow', 'agent_tree.yaml'), TREE);
  if (sessionId.startsWith('team_')) {
    mkdirSync(join(dir, 'team', 'metrics'), { recursive: true });
    writeFileSync(join(dir, 'team', 'task_list.yaml'), 'tasks:\n  - id: WI-1\n    status: in_progress\n');
    writeFileSync(join(dir, 'team', 'metrics', 'timing.yaml'),
      'started_at: "2026-09-27T00:00:00Z"\ncompleted_at: null\ntotal_duration_seconds: 0\n');
  }
  writeFileSync(join(dir, 'session.sdk_id'), `${owner}\n`);
  const mapDir = join(mem, '_system', 'sdk_session_map');
  mkdirSync(mapDir, { recursive: true });
  writeFileSync(join(mapDir, owner), sessionId);
  return { dir, pointer: join(mapDir, owner) };
}

function runHook(uuid) {
  const payload = { hook_event_name: 'SessionEnd', cwd: sandbox };
  if (uuid !== undefined) payload.session_id = uuid;
  execFileSync('node', [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 60000,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: sandbox,
      CAGENTS_TEST_ROOT: sandbox,
      CAGENTS_ACTIVE_SESSION: '',
      CAGENTS_PATTERN_EXTRACTOR_OVERRIDE: 'skip',
    },
  });
}

const tree = (dir) => readFileSync(join(dir, 'workflow', 'agent_tree.yaml'), 'utf8');
const readIf = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);
const snapshot = (dir) => ({
  tree: tree(dir),
  status: readFileSync(join(dir, 'status.yaml'), 'utf8'),
  timing: readIf(join(dir, 'team', 'metrics', 'timing.yaml')),
  taskList: readIf(join(dir, 'team', 'task_list.yaml')),
});

describe.each([
  ['act_owned-by-a_260927_001'],
  ['team_owned-by-a_260927_001'],
])('team-stop.cjs ownership (%s)', (sessionId) => {
  beforeEach(() => { sandbox = mkdtempSync(join(tmpdir(), 'cagents-teamstop-own-')); });
  afterEach(() => { try { rmSync(sandbox, { recursive: true, force: true }); } catch { /* best effort */ } });

  it('SessionEnd from a foreign UUID leaves the session untouched', () => {
    const { dir, pointer } = makeSession(sessionId, UUID_A);
    const before = snapshot(dir);
    runHook(UUID_B);
    expect(snapshot(dir)).toEqual(before);
    expect(existsSync(join(dir, 'workflow', 'execution_summary.yaml'))).toBe(false);
    expect(existsSync(pointer)).toBe(true);
  });

  it('SessionEnd from the owner UUID finalizes the session', () => {
    const { dir, pointer } = makeSession(sessionId, UUID_A);
    runHook(UUID_A);
    expect(tree(dir)).not.toMatch(/^ {4}stopped_at: null$/m);
    expect(existsSync(join(dir, 'workflow', 'execution_summary.yaml'))).toBe(true);
    expect(existsSync(pointer)).toBe(false);
  });
});

describe('team-stop.cjs with no session_id', () => {
  beforeEach(() => { sandbox = mkdtempSync(join(tmpdir(), 'cagents-teamstop-own-')); });
  afterEach(() => { try { rmSync(sandbox, { recursive: true, force: true }); } catch { /* best effort */ } });

  it.each([[undefined], ['']])('SessionEnd with session_id=%s leaves unclaimed and owned team sessions untouched', (sid) => {
    const unclaimed = makeSession('team_unclaimed_260927_002', UUID_B);
    // Make the first session unclaimed: no marker, no map pointer.
    rmSync(join(unclaimed.dir, 'session.sdk_id'));
    rmSync(unclaimed.pointer);
    const owned = makeSession('team_owned-by-a_260927_001', UUID_A);
    const beforeUnclaimed = snapshot(unclaimed.dir);
    const beforeOwned = snapshot(owned.dir);
    runHook(sid);
    expect(snapshot(unclaimed.dir)).toEqual(beforeUnclaimed);
    expect(snapshot(owned.dir)).toEqual(beforeOwned);
    for (const d of [unclaimed.dir, owned.dir]) {
      expect(existsSync(join(d, 'workflow', 'execution_summary.yaml'))).toBe(false);
    }
    expect(existsSync(owned.pointer)).toBe(true);
  });
});
