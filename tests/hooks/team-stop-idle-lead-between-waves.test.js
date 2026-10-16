/**
 * WI-14 (HS-4): an idle /team lead between waves must NOT be stamped incomplete,
 * while a stalled new session still is. End-to-end matrix from the WI-9 design
 * (team_hook-session-fixes_261015_001 outputs/wave_3/WI-9/idle-lead-design.md
 * section 6, cases T1-T10), driven at BOTH hooks:
 *   - SessionEnd: .claude/hooks/team-stop.cjs (defines + exports teamIdleBetweenWaves)
 *   - Stop:       .claude/hooks/verify-completion.cjs (WI-13b: requires team-stop.cjs
 *                 and ORs the predicate into liveAtStop; only the force-terminal
 *                 stamp is skipped)
 *
 * Justification (design section 5): adds the idle-between-waves contract. No
 * existing expectation changes, because the predicate needs gate and wave
 * evidence that no prior fixture has.
 *
 * T9 (byte-parity of two predicate copies) is replaced: WI-13b consumes the single
 * exported predicate, so the test asserts verify-completion.cjs defines no copy of
 * its own and requires team-stop.cjs.
 *
 * Isolation (HS-5): every fixture lives in a per-file temp project root passed as
 * CLAUDE_PROJECT_DIR + CAGENTS_TEST_ROOT; CAGENTS_ACTIVE_SESSION is blanked.
 * Activity ages are set through last_updated_at text and fs.utimesSync mtimes.
 *
 * Spawns are generous (90s) and FAIL LOUD on timeout/signal/non-zero exit: a
 * killed hook writes nothing, and every "not stamped" assertion here would then
 * pass spuriously (the shared box runs at load 50+).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, copyFileSync, utimesSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const ROOT = process.cwd();
const TEAM_STOP = join(ROOT, '.claude', 'hooks', 'team-stop.cjs');
const VERIFY = join(ROOT, '.claude', 'hooks', 'verify-completion.cjs');
const SPAWN_TIMEOUT_MS = 90000;
const TEST_TIMEOUT_MS = 240000;
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

let projectRoot;
let sessionsDir;
let seq = 0;

beforeAll(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'cagents-idle-lead-'));
  sessionsDir = join(projectRoot, 'cagents-memory', 'sessions');
  mkdirSync(sessionsDir, { recursive: true });
  // Seed what the hooks read from AGENT_MEMORY_DIR (mirrors safety-net
  // materialize.mjs ensureProjectRoot): pipeline config, and the 24h throttle
  // sentinels so team-stop does not launch detached maintenance spawns.
  const cfgDir = join(projectRoot, 'cagents-memory', '_system', 'config');
  mkdirSync(cfgDir, { recursive: true });
  try {
    copyFileSync(join(ROOT, 'cagents-memory', '_system', 'config', 'pipeline_config.yaml'), join(cfgDir, 'pipeline_config.yaml'));
  } catch { /* hooks fall back to built-in defaults */ }
  mkdirSync(join(projectRoot, 'cagents-memory', '_knowledge', 'patterns'), { recursive: true });
  writeFileSync(join(projectRoot, 'cagents-memory', '_knowledge', 'patterns', '.last-extracted'), '');
  writeFileSync(join(projectRoot, 'cagents-memory', '_system', '.last-gc'), '');
});

afterAll(() => {
  try { rmSync(projectRoot, { recursive: true, force: true }); } catch { /* best effort */ }
});

const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();
const setMtime = (p, msAgo) => { const t = (Date.now() - msAgo) / 1000; utimesSync(p, t, t); };

/**
 * Build one /team session fixture.
 * @param {object} o
 * @param {string} [o.prefix='team']        session prefix (team | act)
 * @param {string} [o.state='EXECUTING']    phase + pipeline_state
 * @param {object|null} [o.gates]           { wave_0: 'PASS', ... } -> gate_validations/<k>.yaml
 * @param {boolean} [o.meta=true]           write work_meta.yaml with waves 0-3
 * @param {string|null} [o.taskList]        raw team/task_list.yaml body
 * @param {number} [o.activityAgeMs=10min]  age of last_updated_at text and gate mtimes
 * @param {boolean} [o.heartbeat=true]      include last_updated_at in status.yaml
 * @param {string} [o.children='stopped']   'stopped' | 'none' | 'leaked' (stopped_at: null, same age)
 * @param {boolean} [o.validated=false]     write a genuine validator PASS + completed coordination_log
 */
function makeSession(o = {}) {
  const {
    prefix = 'team', state = 'EXECUTING', gates = { wave_0: 'PASS', wave_1: 'CONDITIONAL_PASS' },
    meta = true, taskList = null, activityAgeMs = 10 * MIN, heartbeat = true, children = 'stopped',
    validated = false,
  } = o;
  seq += 1;
  const sid = `${prefix}_idle-lead-${process.pid}-${seq}_261015_001`;
  const dir = join(sessionsDir, sid);
  const put = (rel, body) => {
    const p = join(dir, rel);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, body);
    return p;
  };
  const hb = iso(activityAgeMs);

  put('status.yaml', [
    `session_id: ${sid}`,
    `phase: ${state}`,
    `pipeline_state: ${state}`,
    ...(heartbeat ? [`last_updated_at: "${hb}"`] : []),
    'completed_at: null',
    'result: null',
    '',
  ].join('\n'));
  put('team/metrics/timing.yaml', `started_at: "${iso(activityAgeMs + HOUR)}"\ncompleted_at: null\n`);

  const childLines = children === 'none'
    ? ['agents: []']
    : [
      'agents:',
      '  - id: wave-lead-1',
      '    type: cagents:tech-lead',
      '    depth: 1',
      `    spawned_at: "${iso(activityAgeMs + 5 * MIN)}"`,
      `    stopped_at: ${children === 'leaked' ? 'null' : `"${hb}"`}`,
    ];
  const treePath = put('workflow/agent_tree.yaml', [
    "schema_version: '1'",
    'root:',
    '  agent: team',
    '  depth: 0',
    `  spawned_at: "${iso(activityAgeMs + HOUR)}"`,
    '  stopped_at: null',
    ...childLines,
    '',
  ].join('\n'));

  for (const [k, v] of Object.entries(gates || {})) {
    const p = put(`workflow/gate_validations/${k}.yaml`, `wave: ${k.replace('wave_', '')}\noverall: ${v}\n`);
    setMtime(p, activityAgeMs);
  }
  if (meta) put('workflow/work_meta.yaml', 'total_waves: 4\nwaves:\n  - wave: 0\n  - wave: 1\n  - wave: 2\n  - wave: 3\n');
  if (taskList) put('team/task_list.yaml', taskList);

  if (validated) {
    put('workflow/validation_report.yaml', [
      'schema_version: "1"', 'overall_status: PASS', 'classification: PASS',
      'generated_by: cagents:validator', `generated_at: "${hb}"`,
      'criteria:', '  - criterion: "All acceptance criteria met."', '    verdict: MET',
      '    evidence: "src/foo.ts:15 - implemented"', '',
    ].join('\n'));
    put('workflow/coordination_log.yaml', [
      'schema_version: "1"', 'controller: cagents:tech-lead', 'status: completed',
      'objectives:', '  - id: OBJ-1', '    description: "Ship the change."',
      'implementation_tasks:', '  - task_id: WI-1', '    assigned_to: cagents:backend-developer',
      '    status: completed', '',
    ].join('\n'));
  }

  // Hook self-writes must never count as activity: age the two files hooks
  // rewrite themselves along with everything else (T10 re-touches them).
  setMtime(join(dir, 'status.yaml'), activityAgeMs);
  setMtime(treePath, activityAgeMs);
  return { sid, dir };
}

function runHook(hook, payload, extraEnv = {}) {
  const r = spawnSync('node', [hook], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: SPAWN_TIMEOUT_MS,
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: projectRoot,
      CAGENTS_TEST_ROOT: projectRoot,
      CAGENTS_ACTIVE_SESSION: '',
      CAGENTS_DISPATCH_IMPORT: '',
      CAGENTS_IDLE_LEAD_MAX_MS: '',
      CAGENTS_SESSION_LIVENESS_MS: '',
      ...extraEnv,
    },
  });
  const diag = () => `status=${r.status} signal=${r.signal} error=${r.error ? r.error.message : 'none'} stdout=${JSON.stringify((r.stdout || '').slice(0, 300))} stderr=${JSON.stringify((r.stderr || '').slice(0, 800))}`;
  if (r.error) throw new Error(`${hook}: spawnSync errored: ${diag()}`);
  if (r.status === null) throw new Error(`${hook}: hook killed (timeout/signal): ${diag()}`);
  if (r.status !== 0) throw new Error(`${hook}: hook exited non-zero: ${diag()}`);
  return { stdout: r.stdout || '', stderr: r.stderr || '' };
}

function runSessionEnd(sid, env) {
  const { stdout, stderr } = runHook(TEAM_STOP, { session_id: sid, hook_event_name: 'SessionEnd', reason: 'other', cwd: projectRoot }, env);
  let json = null;
  if (stdout.trim()) {
    try { json = JSON.parse(stdout.trim().split('\n').pop()); } catch (e) {
      throw new Error(`team-stop stdout not JSON: ${e.message}: ${JSON.stringify(stdout.slice(0, 300))}`);
    }
  }
  return { json, msg: (json && json.systemMessage) || '', stderr };
}

function runStop(sid, env) {
  const { stdout, stderr } = runHook(VERIFY, { session_id: sid, stop_hook_active: false, hook_event_name: 'Stop' }, env);
  if (!stdout.trim()) throw new Error(`verify-completion: empty stdout: stderr=${JSON.stringify(stderr.slice(0, 800))}`);
  return { stderr };
}

const read = (dir, rel) => { try { return readFileSync(join(dir, rel), 'utf8'); } catch { return ''; } };
const pipelineState = (dir) => (read(dir, 'status.yaml').match(/^pipeline_state:\s*(\S+)/m) || [])[1];
const summaryPath = (dir) => join(dir, 'workflow', 'execution_summary.yaml');
// v12.77.0 follow-up FU-8: Stop no longer stamps a non-live, non-terminal
// session `incomplete`. It leaves pipeline_state as it is and records the stop
// in last_stop_observed_at. That field is now the "not live at Stop" signal.
const expectStopRecorded = (dir) => {
  expect(read(dir, 'status.yaml')).toMatch(/^last_stop_observed_at:/m);
  expect(pipelineState(dir)).not.toBe('incomplete');
};

/** SessionEnd assertions for an idle-between-waves lead (T1 / T7 / T8). */
function expectPausedAtSessionEnd(dir, res) {
  const status = read(dir, 'status.yaml');
  expect(status).toMatch(/^phase:\s*EXECUTING$/m);
  expect(status).toMatch(/^pipeline_state:\s*EXECUTING$/m);
  expect(status).toMatch(/^completed_at:\s*null$/m);
  expect(status).toMatch(/^result:\s*null$/m);
  expect(read(dir, 'team/metrics/timing.yaml')).toMatch(/completed_at:\s*null/);
  expect(existsSync(summaryPath(dir))).toBe(false);
  expect(res.msg).toContain('paused between waves');
  expect(res.msg).not.toContain('\n');
  expect(res.msg).not.toMatch(/Team Session (Complete|Paused)/);
}

/** SessionEnd assertions for a session that is NOT idle (normal WI-10 path). */
function expectNotPausedAtSessionEnd(dir, res) {
  expect(res.msg).not.toContain('paused between waves');
  expect(res.msg).toMatch(/work items completed/);
  expect(existsSync(summaryPath(dir))).toBe(true);
}

const STOP_IDLE_SIGNAL = /session is live at Stop.*\(signal: idle-between-waves\)/;

describe('HS-4 idle lead between waves vs stalled session (WI-9 matrix, WI-14)', () => {
  // ---------------------------------------------------------------- T1 / T1s
  it('T1 SessionEnd: idle between waves is not stamped; one-line "paused between waves"; no execution_summary', () => {
    const { sid, dir } = makeSession();
    const res = runSessionEnd(sid);
    expectPausedAtSessionEnd(dir, res);
  }, TEST_TIMEOUT_MS);

  it('T1s Stop: idle between waves keeps pipeline_state EXECUTING; stderr names the idle-between-waves signal', () => {
    const { sid, dir } = makeSession();
    const { stderr } = runStop(sid);
    expect(pipelineState(dir)).toBe('EXECUTING');
    expect(read(dir, 'status.yaml')).not.toMatch(/pipeline_state:\s*incomplete/);
    expect(read(dir, 'status.yaml')).not.toMatch(/^last_stop_observed_at:/m); // FU-8: live, nothing recorded
    expect(stderr).toMatch(STOP_IDLE_SIGNAL);
    expect(existsSync(summaryPath(dir))).toBe(false);
  }, TEST_TIMEOUT_MS);

  it('T1s-control (RED proof) Stop: the identical fixture without gate files records the stop (FU-8, state unchanged)', () => {
    // Same shape as T1s minus the gate evidence. The only thing that separates it
    // from T1s is the idle-between-waves signal, so without that signal T1s would
    // observe last_stop_observed_at and fail.
    const { sid, dir } = makeSession({ gates: null });
    const { stderr } = runStop(sid);
    expectStopRecorded(dir);
    expect(stderr).not.toMatch(STOP_IDLE_SIGNAL);
  }, TEST_TIMEOUT_MS);

  it('T1 then T1s: SessionEnd followed by Stop leaves the idle lead untouched at both hooks', () => {
    const { sid, dir } = makeSession();
    expectPausedAtSessionEnd(dir, runSessionEnd(sid));
    const { stderr } = runStop(sid);
    expect(pipelineState(dir)).toBe('EXECUTING');
    expect(stderr).toMatch(STOP_IDLE_SIGNAL);
  }, TEST_TIMEOUT_MS);

  // ---------------------------------------------------------------- T2 (negative)
  it('T2 stalled new team_ session (INIT, 0 children, fresh heartbeat, no gates): Stop records the stop (FU-8), then SessionEnd summary is incomplete', () => {
    const { sid, dir } = makeSession({ state: 'INIT', gates: null, meta: false, children: 'none', activityAgeMs: 0 });
    const { stderr } = runStop(sid);
    // THE stalled-session negative: the stop observation MUST still be recorded.
    expectStopRecorded(dir);
    expect(stderr).not.toMatch(STOP_IDLE_SIGNAL);
    const res = runSessionEnd(sid);
    expect(res.msg).not.toContain('paused between waves');
    expect(read(dir, 'workflow/execution_summary.yaml')).toMatch(/^status:\s*incomplete$/m);
    expectStopRecorded(dir);
  }, TEST_TIMEOUT_MS);

  it('T2 SessionEnd alone on the stalled session: summary status incomplete, not paused', () => {
    const { sid, dir } = makeSession({ state: 'INIT', gates: null, meta: false, children: 'none', activityAgeMs: 0 });
    const res = runSessionEnd(sid);
    expect(res.msg).not.toContain('paused between waves');
    expect(read(dir, 'workflow/execution_summary.yaml')).toMatch(/^status:\s*incomplete$/m);
    expect(pipelineState(dir)).not.toBe('VALIDATED');
  }, TEST_TIMEOUT_MS);

  // ---------------------------------------------------------------- T3
  it('T3 VALIDATED session (genuine PASS, all waves gated) is terminal at SessionEnd: not paused, stays VALIDATED', () => {
    const { sid, dir } = makeSession({
      state: 'VALIDATED', validated: true,
      gates: { wave_0: 'PASS', wave_1: 'PASS', wave_2: 'PASS', wave_3: 'PASS' },
    });
    const res = runSessionEnd(sid);
    expect(res.msg).not.toContain('paused between waves');
    expect(res.msg).toMatch(/work items completed/);
    expect(pipelineState(dir)).toBe('VALIDATED');
  }, TEST_TIMEOUT_MS);

  it('T3 VALIDATED session at Stop: stays terminal, never incomplete, no idle signal', () => {
    const { sid, dir } = makeSession({
      state: 'VALIDATED', validated: true,
      gates: { wave_0: 'PASS', wave_1: 'PASS', wave_2: 'PASS', wave_3: 'PASS' },
    });
    const { stderr } = runStop(sid);
    expect(pipelineState(dir)).not.toBe('incomplete');
    expect(['VALIDATED', 'complete', 'completed']).toContain(pipelineState(dir));
    expect(stderr).not.toMatch(STOP_IDLE_SIGNAL);
  }, TEST_TIMEOUT_MS);

  // ---------------------------------------------------------------- T4 / T4b
  it('T4 abandoned lead (all activity 25h old) at SessionEnd: not idle, normal WI-10 path (summary written, state left as-is)', () => {
    const { sid, dir } = makeSession({ activityAgeMs: 25 * HOUR });
    const res = runSessionEnd(sid);
    expectNotPausedAtSessionEnd(dir, res);
    expect(pipelineState(dir)).toBe('EXECUTING'); // no genuine PASS -> WI-10 leaves it
    expect(read(dir, 'status.yaml')).not.toMatch(/^completed_at:\s*null$/m);
  }, TEST_TIMEOUT_MS);

  it('T4 abandoned lead at Stop (no last_updated_at; gate mtime 25h): Stop records the stop (FU-8)', () => {
    // last_updated_at is omitted on purpose: with a 25h-old heartbeat Stop's
    // pre-existing 24h staleness skip returns before any stamp (pinned by T4c),
    // so the predicate is never reached. Without the field the only activity
    // signal is the 25h gate mtime, which the predicate rejects (condition 5).
    // This shape matches the live session in design fact F4 (no last_updated_at).
    const { sid, dir } = makeSession({ activityAgeMs: 25 * HOUR, heartbeat: false });
    const { stderr } = runStop(sid);
    expectStopRecorded(dir);
    expect(stderr).not.toMatch(STOP_IDLE_SIGNAL);
  }, TEST_TIMEOUT_MS);

  it('T4c (pins pre-existing behavior) abandoned lead with a 25h heartbeat at Stop: 24h staleness skip, not stamped', () => {
    const { sid, dir } = makeSession({ activityAgeMs: 25 * HOUR });
    const { stderr } = runStop(sid);
    expect(stderr).toMatch(/Skipping stale session/);
    expect(stderr).not.toMatch(STOP_IDLE_SIGNAL);
    expect(pipelineState(dir)).toBe('EXECUTING');
  }, TEST_TIMEOUT_MS);

  it('T4b abandoned lead with a leaked 25h running child at SessionEnd: not idle; cleanupAgentTree self-write does not refresh liveness', () => {
    const { sid, dir } = makeSession({ activityAgeMs: 25 * HOUR, children: 'leaked' });
    const res = runSessionEnd(sid);
    expect(res.msg).not.toContain('paused between waves');
    expect(existsSync(summaryPath(dir))).toBe(true);
    // team-stop rewrote the leaked child (a self-write to agent_tree.yaml)...
    expect(read(dir, 'workflow/agent_tree.yaml')).not.toMatch(/id: wave-lead-1[\s\S]*stopped_at:\s*null/);
    // ...and a second SessionEnd still does not treat the session as idle.
    const again = runSessionEnd(sid);
    expect(again.msg).not.toContain('paused between waves');
    // The second run must resolve the session (not a silent no-session pass).
    expect(again.msg).toMatch(/work items completed/);
  }, TEST_TIMEOUT_MS);

  // ---------------------------------------------------------------- T5
  it('T5 final wave gated (Kmax = maxWave) at SessionEnd: not idle, normal finalization', () => {
    const { sid, dir } = makeSession({ gates: { wave_0: 'PASS', wave_1: 'PASS', wave_2: 'PASS', wave_3: 'PASS' } });
    const res = runSessionEnd(sid);
    expectNotPausedAtSessionEnd(dir, res);
    expect(read(dir, 'team/metrics/timing.yaml')).not.toMatch(/completed_at:\s*null/);
  }, TEST_TIMEOUT_MS);

  // ---------------------------------------------------------------- T6
  it('T6 latest gate FAIL at SessionEnd: not idle', () => {
    const { sid, dir } = makeSession({ gates: { wave_0: 'PASS', wave_1: 'FAIL' } });
    const res = runSessionEnd(sid);
    expectNotPausedAtSessionEnd(dir, res);
  }, TEST_TIMEOUT_MS);

  it('T6 latest gate FAIL at Stop: records the stop (FU-8)', () => {
    const { sid, dir } = makeSession({ gates: { wave_0: 'PASS', wave_1: 'FAIL' } });
    const { stderr } = runStop(sid);
    expectStopRecorded(dir);
    expect(stderr).not.toMatch(STOP_IDLE_SIGNAL);
  }, TEST_TIMEOUT_MS);

  // ---------------------------------------------------------------- T7
  it('T7 task_list fallback (no work_meta; wave-2 item pending) at SessionEnd: idle, same assertions as T1', () => {
    const { sid, dir } = makeSession({
      meta: false,
      taskList: 'tasks:\n  - id: WI-9\n    wave: 2\n    status: pending\n',
    });
    expectPausedAtSessionEnd(dir, runSessionEnd(sid));
  }, TEST_TIMEOUT_MS);

  it('T7 control: task_list with only completed later-wave items is not idle', () => {
    const { sid, dir } = makeSession({
      meta: false,
      taskList: 'tasks:\n  - id: WI-9\n    wave: 2\n    status: completed\n',
    });
    expectNotPausedAtSessionEnd(dir, runSessionEnd(sid));
  }, TEST_TIMEOUT_MS);

  // ---------------------------------------------------------------- T8
  it('T8 CAGENTS_IDLE_LEAD_MAX_MS=48h turns the T4 fixture idle at SessionEnd', () => {
    const { sid, dir } = makeSession({ activityAgeMs: 25 * HOUR });
    expectPausedAtSessionEnd(dir, runSessionEnd(sid, { CAGENTS_IDLE_LEAD_MAX_MS: String(48 * HOUR) }));
  }, TEST_TIMEOUT_MS);

  it('T8 at Stop: CAGENTS_IDLE_LEAD_MAX_MS=48h keeps the T4-Stop fixture EXECUTING', () => {
    const { sid, dir } = makeSession({ activityAgeMs: 25 * HOUR, heartbeat: false });
    const { stderr } = runStop(sid, { CAGENTS_IDLE_LEAD_MAX_MS: String(48 * HOUR) });
    expect(pipelineState(dir)).toBe('EXECUTING');
    expect(stderr).toMatch(STOP_IDLE_SIGNAL);
  }, TEST_TIMEOUT_MS);

  it('T8 inverse: CAGENTS_IDLE_LEAD_MAX_MS=5min makes the 10-min-old T1 fixture abandoned at both hooks', () => {
    const env = { CAGENTS_IDLE_LEAD_MAX_MS: String(5 * MIN) };
    const a = makeSession();
    expectNotPausedAtSessionEnd(a.dir, runSessionEnd(a.sid, env));
    const b = makeSession();
    runStop(b.sid, env);
    expectStopRecorded(b.dir);
  }, TEST_TIMEOUT_MS);

  // ---------------------------------------------------------------- T9 (replaced)
  it('T9 (replaced) single predicate: verify-completion.cjs has no own teamIdleBetweenWaves and requires team-stop.cjs, which exports it', () => {
    const vc = readFileSync(VERIFY, 'utf8');
    const ts = readFileSync(TEAM_STOP, 'utf8');
    expect(vc).not.toMatch(/function\s+teamIdleBetweenWaves\s*\(/);
    expect(vc).not.toMatch(/(const|let|var)\s+teamIdleBetweenWaves\s*=\s*(function|\()/);
    expect(vc).toMatch(/require\(\s*['"]\.\/team-stop\.cjs['"]\s*\)/);
    expect(ts).toMatch(/function\s+teamIdleBetweenWaves\s*\(/);
    expect(ts).toMatch(/module\.exports\s*=\s*\{[^}]*\bteamIdleBetweenWaves\b/);
    // The export is importable without running the SessionEnd handler.
    const r = spawnSync('node', ['-e', `process.stdout.write(typeof require(${JSON.stringify(TEAM_STOP)}).teamIdleBetweenWaves)`], {
      encoding: 'utf8', timeout: SPAWN_TIMEOUT_MS, input: '',
      env: { ...process.env, CAGENTS_DISPATCH_IMPORT: '1', CLAUDE_PROJECT_DIR: projectRoot, CAGENTS_TEST_ROOT: projectRoot },
    });
    if (r.status !== 0) throw new Error(`import probe failed: status=${r.status} signal=${r.signal} stderr=${(r.stderr || '').slice(0, 500)}`);
    expect(r.stdout).toBe('function');
  }, TEST_TIMEOUT_MS);

  // ---------------------------------------------------------------- T10
  it('T10 hook self-writes (status.yaml + agent_tree.yaml mtime = now) do not refresh liveness of the abandoned T4 fixture', () => {
    const { sid, dir } = makeSession({ activityAgeMs: 25 * HOUR });
    setMtime(join(dir, 'status.yaml'), 0);
    setMtime(join(dir, 'workflow', 'agent_tree.yaml'), 0);
    expectNotPausedAtSessionEnd(dir, runSessionEnd(sid));
  }, TEST_TIMEOUT_MS);

  it('T10 at Stop: fresh status.yaml/agent_tree.yaml mtimes do not rescue the T4-Stop fixture', () => {
    const { sid, dir } = makeSession({ activityAgeMs: 25 * HOUR, heartbeat: false });
    setMtime(join(dir, 'status.yaml'), 0);
    setMtime(join(dir, 'workflow', 'agent_tree.yaml'), 0);
    runStop(sid);
    expectStopRecorded(dir);
  }, TEST_TIMEOUT_MS);

  // ---------------------------------------------------------------- non-team guard
  it('condition 1: an act_ session with T1-shaped gate evidence is not exempt at Stop', () => {
    const { sid, dir } = makeSession({ prefix: 'act' });
    const { stderr } = runStop(sid);
    expect(stderr).not.toMatch(STOP_IDLE_SIGNAL);
    expectStopRecorded(dir);
  }, TEST_TIMEOUT_MS);
});
