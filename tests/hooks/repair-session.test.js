/**
 * HS-10 (WI-12): repairSession() self-heal (R1/R2/R3) at Stop and in the
 * SessionStart sweep.
 *
 * Ported from the WI-028 scratch replay (scratch/C/bin/stopw.cjs F cases,
 * scratch/C/bin/sweep.cjs S cases, out-after.txt, sweep-after.txt).
 *
 *   F1      leaked stopped_at:null rows whose stop IS in the global spawn log -> closed with the logged ts.
 *   F1-neg  live team session, rows with no stop evidence -> stay open, state untouched.
 *   F2      agent_tree.yaml broken by a col-0 hand append, events.jsonl present -> quarantined + rebuilt.
 *   F2-neg  broken tree, no events.jsonl -> bytes untouched, one needs_user warning.
 *   F3      genuine PASS but no execution_summary.yaml -> derived summary (not a stub).
 *   S1      sweep: idle 30 h, 2 never-stopped rows -> closed (stale_sweep).
 *   S2      sweep: idle 2 h -> stays open.
 *   S3      sweep: live (heartbeat 5 s) -> skipped.
 *
 * Every F/S case reruns the hook and asserts the rerun changes nothing.
 * Invariants: repairSession never changes validation_report.yaml (sha256), never
 * writes a validation stub, and never closes a row on age in Stop mode.
 *
 * Every fixture lives in a fresh mkdtemp project dir. Nothing is written into
 * the real cagents-memory/sessions.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const HOOKS = path.join(process.cwd(), '.claude', 'hooks');
const STOP_HOOK = path.join(HOOKS, 'verify-completion.cjs');
const SWEEP_HOOK = path.join(HOOKS, 'session-catchup.cjs');
const HOOK_UTILS = path.join(HOOKS, 'hook-utils.cjs');
const T = 120000;

const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();
const sha = (p) => { try { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); } catch { return 'absent'; } };
const tmpRoots = [];
afterAll(() => { for (const d of tmpRoots) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} } });

function mkProj() {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'repair-session-'));
  tmpRoots.push(proj);
  fs.mkdirSync(path.join(proj, 'cagents-memory', '_system', 'logs'), { recursive: true });
  fs.mkdirSync(path.join(proj, 'cagents-memory', 'sessions'), { recursive: true });
  return proj;
}
function mkSession(proj, sid, files) {
  const dir = path.join(proj, 'cagents-memory', 'sessions', sid);
  fs.mkdirSync(path.join(dir, 'workflow'), { recursive: true });
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  return dir;
}
const env = (proj) => ({ ...process.env, CLAUDE_PROJECT_DIR: proj, VITEST: 'true', CAGENTS_ACTIVE_SESSION: '' });
function run(hook, proj, payload) {
  const r = spawnSync('node', [hook], { input: JSON.stringify(payload), encoding: 'utf8', timeout: 60000, env: env(proj) });
  if (r.error || r.status === null) throw new Error(`hook did not finish: status=${r.status} error=${r.error && r.error.message}`);
  return r;
}
const stop = (proj, sid) => run(STOP_HOOK, proj, { session_id: sid, stop_hook_active: false, hook_event_name: 'Stop' });
const sweep = (proj) => run(SWEEP_HOOK, proj, { session_id: '00000000-0000-4000-8000-000000000001', hook_event_name: 'SessionStart', source: 'startup' });

/** Call repairSession directly in a child so PROJECT_ROOT (read at require time) is the fixture project. */
function callRepair(proj, dir, opts) {
  const script = `const {repairSession}=require(${JSON.stringify(HOOK_UTILS)});`
    + `process.stdout.write(JSON.stringify(repairSession(${JSON.stringify(dir)}, ${JSON.stringify(opts)})));`;
  const r = spawnSync('node', ['-e', script], { encoding: 'utf8', timeout: 60000, env: env(proj) });
  if (r.status !== 0) throw new Error(`repairSession child failed: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

function loadTree(dir) {
  const yaml = require('js-yaml');
  return yaml.load(fs.readFileSync(path.join(dir, 'workflow', 'agent_tree.yaml'), 'utf8'));
}
const openRows = (dir) => loadTree(dir).agents.filter((a) => a && !a.stopped_at);
function repairs(dir) {
  const f = path.join(dir, 'workflow', 'repairs.jsonl');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
}
function warningsOf(dir) {
  const f = path.join(dir, 'completion_summary.yaml');
  const cs = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  return (cs.split(/^warnings:/m)[1] || '').split('\n').filter((l) => /^\s+- "/.test(l)).map((l) => l.trim().slice(3, -1));
}
const quarantined = (dir) => fs.readdirSync(path.join(dir, 'workflow')).filter((f) => f.includes('.corrupt-'));
const stateOf = (dir) => (fs.readFileSync(path.join(dir, 'status.yaml'), 'utf8').match(/pipeline_state: (\S+)/) || [])[1];
const wf = (dir, f) => path.join(dir, 'workflow', f);

// ---- fixture builders (shapes copied from scratch/C/bin/stopw.cjs) -----------
const statusY = (state, { entered = 60e3, hb = 5e3, key = 'pipeline_state' } = {}) =>
  `session_id: X\n${key}: ${state}\nstarted_at: "${iso(7200e3)}"\nlast_updated_at: "${iso(hb)}"\nphase_history:\n  - state: ${state}\n    entered_at: "${iso(entered)}"\n    duration_ms: null\n`;
const row = (id, t, d, { ago = 600e3, running = false, parent = 'pipeline', noStopKey = false } = {}) =>
  `  - id: ${id}\n    type: cagents:${t}\n    parent: ${parent}\n    depth: ${d}\n    spawned_at: '${iso(ago)}'\n`
  + (noStopKey ? '' : `    stopped_at: ${running ? 'null' : `'${iso(ago - 30e3)}'`}\n`);
const tree = (...rows) => 'agents:\n' + rows.join('');
const planMission = 'mission: build vertical slices\nobjectives: [o1]\ncontroller_assignment: {primary: tech-lead}\n';
const valPass = 'classification: PASS\noverall_status: PASS\ngenerated_by: validator\n';
const valFail = 'classification: FAIL\noverall_status: FAIL\ngenerated_by: validator\n';
const execByAct = 'session_id: X\nfinal_state: complete\nstatus: completed\ngenerated_by: act-step-4\n';
const smallCoord = 'schema_version: "1"\ncontroller: tech-lead\nstatus: completed\nvalidation_checkpoints: [x]\nself_validation: x\n';

function f1(proj) {
  const stopA = iso(3000e3); const stopB = iso(2990e3);
  fs.writeFileSync(path.join(proj, 'cagents-memory', '_system', 'logs', 'agent_spawns.log'),
    `${stopA} | agent_id=a80a8d9f156a65c69 | type=cagents:backend-developer | event=stop | session=unknown | summary=done\n`
    + `${stopB} | agent_id=a567c1cecc3e7a7de | type=cagents:security-engineer | event=stop | session=unknown | summary=done\n`);
  const sid = 'act_f1-leak_260513_004';
  const dir = mkSession(proj, sid, {
    'status.yaml': statusY('complete', { hb: 3600e3 }), 'workflow/plan.yaml': planMission,
    'workflow/coordination_log.yaml': smallCoord, 'workflow/validation_report.yaml': valPass, 'workflow/execution_summary.yaml': execByAct,
    'workflow/agent_tree.yaml': tree(row('t', 'tech-lead', 1, { ago: 3700e3 }),
      row('a80a8d9f156a65c69', 'backend-developer', 2, { parent: 't', ago: 3100e3, running: true }),
      row('a567c1cecc3e7a7de', 'security-engineer', 2, { parent: 't', ago: 3050e3, noStopKey: true })),
  });
  return { sid, dir, stopA, stopB };
}
function f1neg(proj) {
  const sid = 'team_f1n-live_261015_001';
  const dir = mkSession(proj, sid, {
    'status.yaml': statusY('COORDINATED', { entered: 30e3, hb: 3e3 }),
    'workflow/agent_tree.yaml': tree(row('t', 'tech-lead', 1, { ago: 600e3 }),
      row('x1', 'backend-developer', 2, { parent: 't', ago: 10e3, running: true }),
      row('x2', 'backend-developer', 2, { parent: 't', ago: 7200e3, running: true })),
  });
  return { sid, dir };
}
function f2(proj) {
  const ev = [
    { ts: iso(900e3), type: 'spawn', agent_id: 'o1', agent_type: 'cagents:orchestrator', depth: 1 }, { ts: iso(880e3), type: 'stop', agent_id: 'o1' },
    { ts: iso(800e3), type: 'spawn', agent_id: 't1', agent_type: 'cagents:tech-lead', depth: 1 },
    { ts: iso(700e3), type: 'spawn', agent_id: 'b1', agent_type: 'cagents:backend-developer', depth: 2, parent: 't1' },
    { ts: iso(500e3), type: 'stop', agent_id: 'b1' }, { ts: iso(400e3), type: 'stop', agent_id: 't1' },
  ].map((e) => JSON.stringify(e)).join('\n') + '\n';
  const sid = 'act_f2-broken_261011_001';
  const dir = mkSession(proj, sid, {
    'status.yaml': statusY('complete', { hb: 120e3 }), 'workflow/plan.yaml': planMission,
    'workflow/coordination_log.yaml': smallCoord, 'workflow/validation_report.yaml': valPass,
    'workflow/execution_summary.yaml': execByAct, 'workflow/events.jsonl': ev,
    'workflow/agent_tree.yaml': tree(row('o1', 'orchestrator', 1, { ago: 900e3 })) + '- agent: cagents:planner\n  note: hand-appended at column 0\n    bad: indent\n',
  });
  return { sid, dir };
}
function f2neg(proj) {
  const sid = 'act_f2n-broken_261011_001';
  const dir = mkSession(proj, sid, {
    'status.yaml': statusY('complete', { hb: 120e3 }),
    'workflow/agent_tree.yaml': tree(row('o1', 'orchestrator', 1)) + '- agent: x\n    bad: indent\n',
  });
  return { sid, dir };
}
function f3(proj) {
  const sid = 'act_f3-noexec_261015_001';
  const dir = mkSession(proj, sid, {
    'status.yaml': statusY('complete', { hb: 120e3 }), 'workflow/plan.yaml': planMission,
    'workflow/coordination_log.yaml': smallCoord, 'workflow/validation_report.yaml': valPass,
    'workflow/agent_tree.yaml': tree(row('t', 'tech-lead', 1), row('b', 'backend-developer', 2, { parent: 't' })),
  });
  return { sid, dir };
}
function n3(proj) {
  const sid = 'act_n3-fail_261015_001';
  const dir = mkSession(proj, sid, {
    'status.yaml': statusY('complete', { hb: 120e3 }), 'workflow/plan.yaml': planMission,
    'workflow/coordination_log.yaml': smallCoord, 'workflow/validation_report.yaml': valFail,
    'workflow/agent_tree.yaml': tree(row('t', 'tech-lead', 1), row('b', 'backend-developer', 2, { parent: 't' })),
  });
  return { sid, dir };
}
/** sweep.cjs fixture: status + instruction + tree, every mtime pinned to the heartbeat. */
function sweepSession(proj, sid, hbAgo, rows) {
  const dir = mkSession(proj, sid, {
    'status.yaml': `session_id: ${sid}\npipeline_state: COORDINATED\nlast_updated_at: "${iso(hbAgo)}"\n`,
    'instruction.yaml': `session_id: ${sid}\nraw_request: x\ncreated_at: "${iso(hbAgo)}"\ncommand: act\n`,
    'workflow/agent_tree.yaml': 'agents:\n' + rows.map(([id, ago]) =>
      `  - id: ${id}\n    type: test-agent\n    depth: 1\n    spawned_at: '${iso(ago)}'\n    stopped_at: null\n`).join(''),
  });
  const t = (Date.now() - hbAgo) / 1000;
  for (const f of ['status.yaml', 'instruction.yaml', 'workflow/agent_tree.yaml', 'workflow', '.']) fs.utimesSync(path.join(dir, f), t, t);
  return dir;
}

// ---- F: Stop-mode repairs ---------------------------------------------------
describe('repairSession at Stop (verify-completion.cjs)', () => {
  it('F1 closes leaked rows that have a logged stop, using the logged ts; rerun changes nothing', () => {
    const proj = mkProj(); const { sid, dir, stopA, stopB } = f1(proj);
    stop(proj, sid);
    expect(openRows(dir)).toHaveLength(0);
    const rows = Object.fromEntries(loadTree(dir).agents.map((a) => [a.id, a]));
    expect(rows.a80a8d9f156a65c69.stopped_at).toBe(stopA);
    expect(rows.a567c1cecc3e7a7de.stopped_at).toBe(stopB);
    expect(rows.a80a8d9f156a65c69.stop_reason).toBe('repaired:stop_logged');
    const r1 = repairs(dir);
    expect(r1.map((r) => `${r.kind}:${r.reason}`)).toEqual(['agent_row_closed:stop_logged', 'agent_row_closed:stop_logged']);
    expect(warningsOf(dir)).toEqual([]);
    const treeSha = sha(wf(dir, 'agent_tree.yaml'));

    stop(proj, sid);
    expect(sha(wf(dir, 'agent_tree.yaml'))).toBe(treeSha);
    expect(repairs(dir)).toHaveLength(2);
  }, T);

  it('F1-neg leaves live rows without stop evidence open and does not stamp state; rerun changes nothing', () => {
    const proj = mkProj(); const { sid, dir } = f1neg(proj);
    for (let i = 0; i < 2; i++) {
      stop(proj, sid);
      expect(openRows(dir).map((a) => a.id).sort()).toEqual(['x1', 'x2']);
      expect(stateOf(dir)).toBe('COORDINATED');
      expect(repairs(dir)).toHaveLength(0);
    }
  }, T);

  it('F2 quarantines an unparseable tree and rebuilds it from events.jsonl; rerun changes nothing', () => {
    const proj = mkProj(); const { sid, dir } = f2(proj);
    stop(proj, sid);
    const t = loadTree(dir);
    expect(t.agents).toHaveLength(3);
    expect(openRows(dir)).toHaveLength(0);
    expect(quarantined(dir)).toHaveLength(1);
    expect(repairs(dir).map((r) => r.kind)).toEqual(['agent_tree_rebuilt']);
    expect(warningsOf(dir)).toEqual([]);
    const treeSha = sha(wf(dir, 'agent_tree.yaml'));

    stop(proj, sid);
    expect(sha(wf(dir, 'agent_tree.yaml'))).toBe(treeSha);
    expect(quarantined(dir)).toHaveLength(1);
    expect(repairs(dir)).toHaveLength(1);
  }, T);

  it('F2-neg leaves an unrebuildable tree byte-identical and surfaces one warning; rerun changes nothing', () => {
    const proj = mkProj(); const { sid, dir } = f2neg(proj);
    const before = sha(wf(dir, 'agent_tree.yaml'));
    for (let i = 0; i < 2; i++) {
      stop(proj, sid);
      expect(sha(wf(dir, 'agent_tree.yaml'))).toBe(before);
      expect(quarantined(dir)).toHaveLength(0);
      expect(repairs(dir)).toHaveLength(0);
      expect(warningsOf(dir).filter((w) => w.includes('is not valid YAML and events.jsonl cannot rebuild it'))).toHaveLength(1);
    }
  }, T);

  it('F3 derives execution_summary.yaml for a genuinely validated session; rerun changes nothing', () => {
    const proj = mkProj(); const { sid, dir } = f3(proj);
    stop(proj, sid);
    const body = fs.readFileSync(wf(dir, 'execution_summary.yaml'), 'utf8');
    expect(body).toMatch(/^generated_by: repair-session-derived$/m);
    expect(body).not.toContain('verify-completion-hook-safety-net');
    expect(body).toMatch(/^validation_verdict: "PASS"$/m);
    expect(repairs(dir).map((r) => r.kind)).toEqual(['execution_summary_derived']);
    expect(warningsOf(dir)).toEqual([]);
    const execSha = sha(wf(dir, 'execution_summary.yaml'));

    stop(proj, sid);
    expect(sha(wf(dir, 'execution_summary.yaml'))).toBe(execSha);
    expect(repairs(dir)).toHaveLength(1);
  }, T);

  it('writes no validation_report.yaml or execution_summary.yaml stub for a non-genuine session', () => {
    const proj = mkProj(); const { sid, dir } = f2neg(proj);
    stop(proj, sid);
    expect(fs.existsSync(wf(dir, 'validation_report.yaml'))).toBe(false);
    expect(fs.existsSync(wf(dir, 'execution_summary.yaml'))).toBe(false);
    expect(warningsOf(dir).some((w) => w.startsWith('No validator verdict on disk'))).toBe(true);
  }, T);
});

// ---- S: SessionStart sweep --------------------------------------------------
describe('repairSession sweep at SessionStart (session-catchup.cjs)', () => {
  it('S1 closes rows of a 30 h idle session; S2 (idle 2 h) and S3 (live) stay open; rerun changes nothing', () => {
    const proj = mkProj();
    const s1 = sweepSession(proj, 'run_s1-idle30h_260718_001', 30 * 3600e3, [['agent_1784361428465', 30.1 * 3600e3], ['agent_real_1784361428630', 30.1 * 3600e3]]);
    const s2 = sweepSession(proj, 'run_s2-idle2h_261015_001', 2 * 3600e3, [['old1', 3 * 3600e3]]);
    const s3 = sweepSession(proj, 'run_s3-live_261015_001', 5e3, [['old2', 3 * 3600e3]]);

    const r = sweep(proj);
    expect(r.status).toBe(0);
    expect(openRows(s1)).toHaveLength(0);
    expect(repairs(s1).map((x) => `${x.kind}:${x.reason}:${x.mode}`)).toEqual(['agent_row_closed:stale_sweep:sweep', 'agent_row_closed:stale_sweep:sweep']);
    expect(openRows(s2)).toHaveLength(1);
    expect(repairs(s2)).toHaveLength(0);
    expect(openRows(s3)).toHaveLength(1);
    expect(repairs(s3)).toHaveLength(0);
    const shas = [s1, s2, s3].map((d) => sha(wf(d, 'agent_tree.yaml')));

    expect(sweep(proj).status).toBe(0);
    expect([s1, s2, s3].map((d) => sha(wf(d, 'agent_tree.yaml')))).toEqual(shas);
    expect(repairs(s1)).toHaveLength(2);
    expect(repairs(s2)).toHaveLength(0);
    expect(repairs(s3)).toHaveLength(0);
  }, T);
});

// ---- invariants -------------------------------------------------------------
describe('repairSession invariants', () => {
  it('never changes validation_report.yaml (sha256) in stop or sweep mode', () => {
    const proj = mkProj();
    const sessions = [f1(proj), f2(proj), f3(proj), n3(proj)];
    const before = sessions.map(({ dir }) => sha(wf(dir, 'validation_report.yaml')));
    expect(before.every((s) => s !== 'absent')).toBe(true);
    const far = Date.now() + 7 * 24 * 3600e3; // makes every session sweep-eligible
    for (const { dir } of sessions) {
      callRepair(proj, dir, { mode: 'stop' });
      callRepair(proj, dir, { mode: 'sweep', now: far });
    }
    expect(sessions.map(({ dir }) => sha(wf(dir, 'validation_report.yaml')))).toEqual(before);
    // N3 (validator FAIL): no summary derived, verdict kept.
    expect(fs.existsSync(wf(sessions[3].dir, 'execution_summary.yaml'))).toBe(false);
  }, T);

  it('never changes validation_report.yaml through the Stop hook (N3 FAIL keeps its warning)', () => {
    const proj = mkProj(); const { sid, dir } = n3(proj);
    const before = sha(wf(dir, 'validation_report.yaml'));
    for (let i = 0; i < 2; i++) {
      stop(proj, sid);
      expect(sha(wf(dir, 'validation_report.yaml'))).toBe(before);
      expect(fs.existsSync(wf(dir, 'execution_summary.yaml'))).toBe(false);
      expect(warningsOf(dir).some((w) => w.startsWith('Validation status: FAIL'))).toBe(true);
    }
  }, T);

  it('never closes a row on age in stop mode, even when the session is idle for days', () => {
    const proj = mkProj();
    const sid = 'act_age-only_260101_001';
    const dir = mkSession(proj, sid, {
      'status.yaml': statusY('COORDINATED', { entered: 3 * 24 * 3600e3, hb: 3 * 24 * 3600e3 }),
      'workflow/agent_tree.yaml': tree(row('t', 'tech-lead', 1, { ago: 3 * 24 * 3600e3, running: true }),
        row('b', 'backend-developer', 2, { parent: 't', ago: 3 * 24 * 3600e3, running: true })),
    });
    const far = Date.now() + 30 * 24 * 3600e3;
    const out = callRepair(proj, dir, { mode: 'stop', now: far });
    expect(out.filter((r) => r.kind === 'agent_row_closed')).toEqual([]);
    expect(openRows(dir).map((a) => a.id).sort()).toEqual(['b', 't']);
    // Control: the same session IS closed by the sweep (age close is sweep-only).
    const swept = callRepair(proj, dir, { mode: 'sweep', now: far });
    expect(swept.filter((r) => r.kind === 'agent_row_closed').map((r) => r.reason)).toEqual(['stale_sweep', 'stale_sweep']);
  }, T);
});
