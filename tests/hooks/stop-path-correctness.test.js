/**
 * HS-4 (WI-10): Stop-path correctness.
 *
 * Ported from the WI-028 scratch fixtures (scratch/A/bin/a3.cjs, proj-a3/,
 * A3-before-after.txt). Four false positives must be gone, and five true
 * positives must still be flagged:
 *
 *   A3a sentinel gate      FP: `outputs: Test 3 passed`, `output: 8/8 tests`, `outputs: |`
 *                          TP: `output_file: outputs/report-missing.md` (absent)
 *   A3b self-handling      FP: 6 agents all at depth 1 (tracker lost parents)
 *                          TP: only the controller + pipeline roles
 *   A3c force-terminal     FP: live session (running child, fresh heartbeat) mid-pipeline
 *                          TP: stalled INIT session, 0 agents, stale heartbeat
 *   A3d evidence recheck   FP: evidence present, no verification_method
 *                          TP: file_exists cites a missing file; no evidence at all
 *
 * Plus HS-4 (d): relative evidence paths resolve against PROJECT_ROOT, not a
 * drifted input.cwd.
 *
 * Every fixture lives in a fresh mkdtemp project dir.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HOOKS = path.join(process.cwd(), '.claude', 'hooks');
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();
const tmpRoots = [];
afterAll(() => { for (const d of tmpRoots) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} } });

function mkProj() {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'stop-path-'));
  tmpRoots.push(proj);
  fs.mkdirSync(path.join(proj, 'cagents-memory', 'sessions'), { recursive: true });
  return proj;
}
function mkSession(proj, sid, files) {
  const dir = path.join(proj, 'cagents-memory', 'sessions', sid);
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  return dir;
}
function run(file, proj, payload) {
  const r = spawnSync('node', [path.join(HOOKS, file)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, CLAUDE_PROJECT_DIR: proj, VITEST: 'true', CAGENTS_ACTIVE_SESSION: '' },
  });
  if (r.error || r.status === null) throw new Error(`${file} did not finish: status=${r.status} error=${r.error && r.error.message}`);
  return { out: (r.stdout || '').trim(), err: r.stderr || '' };
}
const stop = (proj, sid) => run('verify-completion.cjs', proj, { session_id: sid, stop_hook_active: false, hook_event_name: 'Stop' });
const summaryOf = (dir) => { try { return fs.readFileSync(path.join(dir, 'completion_summary.yaml'), 'utf8'); } catch { return ''; } };
const stateOf = (dir) => fs.readFileSync(path.join(dir, 'status.yaml'), 'utf8').match(/pipeline_state:\s*(\S+)/)[1];

const status = (st, hbAgo) => `session_id: X\npipeline_state: ${st}\nstarted_at: '${iso(3600e3)}'\nlast_updated_at: '${iso(hbAgo)}'\n`;
const tree = (rows) => 'agents:\n' + rows.map((r, i) => `  - id: a${i}\n    type: cagents:${r.t}\n    parent: ${r.p || 'pipeline'}\n    depth: ${r.d}\n    spawned_at: '${iso(r.ago || 600e3)}'\n    stopped_at: ${r.running ? 'null' : `'${iso(60e3)}'`}\n`).join('');
const coord = (extra) => `schema_version: "1"\nstatus: completed\nobjectives: [x]\n${extra}`;
const SENTINEL = /Sentinel gate/;
const SELF_HANDLING = /CONTROLLER SELF-HANDLING \(protocol/;

describe('HS-4 (a) sentinel gate accepts only path-shaped claims', () => {
  it('A3a-FP: `outputs: Test 3 passed`, `output: 8/8 tests` and `outputs: |` are not file claims', () => {
    const proj = mkProj(); const sid = 'act_a3a-fp_261015_001';
    const dir = mkSession(proj, sid, { 'status.yaml': status('complete', 0), 'workflow/agent_tree.yaml': tree([{ t: 'tech-lead', d: 1 }, { t: 'backend-developer', d: 2 }]),
      'workflow/coordination_log.yaml': coord('implementation_tasks:\n  - task_id: WI-1\n    outputs: Test 3 passed\n    output: 8/8 tests\n  - task_id: WI-2\n    outputs: |\n      long text\n') });
    const r = stop(proj, sid);
    expect(r.out + summaryOf(dir)).not.toMatch(SENTINEL);
  });

  it('A3a-TP: a real missing output_file is still flagged', () => {
    const proj = mkProj(); const sid = 'act_a3a-tp_261015_001';
    const dir = mkSession(proj, sid, { 'status.yaml': status('complete', 0), 'workflow/agent_tree.yaml': tree([{ t: 'tech-lead', d: 1 }, { t: 'backend-developer', d: 2 }]),
      'workflow/coordination_log.yaml': coord('implementation_tasks:\n  - task_id: WI-1\n    output_file: outputs/report-missing.md\n') });
    stop(proj, sid);
    expect(summaryOf(dir)).toMatch(/Sentinel gate: 1 claimed file\(s\) missing \(first: outputs\/report-missing\.md\)/);
  });
});

describe('HS-4 (b) self-handling counts depth >= 1 executors', () => {
  it('A3b-FP: 6 agents all recorded at depth 1 (tracker lost parents) is not self-handling', () => {
    const proj = mkProj(); const sid = 'act_a3b-fp_261015_001';
    const dir = mkSession(proj, sid, { 'status.yaml': status('complete', 0),
      'workflow/agent_tree.yaml': tree([{ t: 'orchestrator', d: 1 }, { t: 'planner', d: 1 }, { t: 'tech-lead', d: 1 }, { t: 'backend-developer', d: 1 }, { t: 'reviewer', d: 1 }, { t: 'qa-lead', d: 1 }, { t: 'validator', d: 1 }]),
      'workflow/coordination_log.yaml': coord('') });
    const r = stop(proj, sid);
    expect(r.out + r.err + summaryOf(dir)).not.toMatch(SELF_HANDLING);
  });

  it('A3b-TP: only the controller + pipeline roles is still self-handling', () => {
    const proj = mkProj(); const sid = 'act_a3b-tp_261015_001';
    const dir = mkSession(proj, sid, { 'status.yaml': status('complete', 0),
      'workflow/agent_tree.yaml': tree([{ t: 'orchestrator', d: 1 }, { t: 'planner', d: 1 }, { t: 'tech-lead', d: 1 }, { t: 'reviewer', d: 1 }, { t: 'validator', d: 1 }]),
      'workflow/coordination_log.yaml': coord('') });
    stop(proj, sid);
    expect(summaryOf(dir)).toMatch(SELF_HANDLING);
  });

  it('the depth-0 pipeline root row is not counted as an executor type', () => {
    const proj = mkProj(); const sid = 'act_a3b-root_261015_001';
    const dir = mkSession(proj, sid, { 'status.yaml': status('complete', 0),
      'workflow/agent_tree.yaml': 'agents:\n  - id: pipeline\n    type: act-pipeline\n    depth: 0\n    parent: null\n' + tree([{ t: 'tech-lead', d: 1 }]).replace(/^agents:\n/, ''),
      'workflow/coordination_log.yaml': coord('') });
    stop(proj, sid);
    expect(summaryOf(dir)).toMatch(SELF_HANDLING);
  });
});

describe('HS-4 (c) no force-terminal stamp or stub writes on a live session', () => {
  it('A3c-FP: a live mid-pipeline session (running child, fresh heartbeat) keeps its state and gets no stubs', () => {
    const proj = mkProj(); const sid = 'team_a3c-fp_261015_001';
    const dir = mkSession(proj, sid, { 'status.yaml': status('coordinated', 5e3),
      'workflow/agent_tree.yaml': tree([{ t: 'tech-lead', d: 1 }, { t: 'backend-developer', d: 2, running: true, ago: 30e3 }]) });
    const r = stop(proj, sid);
    expect(stateOf(dir)).toBe('coordinated');
    expect(fs.existsSync(path.join(dir, 'workflow', 'validation_report.yaml'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'workflow', 'execution_summary.yaml'))).toBe(false);
    // v12.77.0 follow-up FU-6: a fresh running child now trips the early pause
    // gate, which returns before any write (no completion_summary either).
    expect(r.err).toMatch(/session paused at Stop \(fresh running child\); allowing stop, no writes/);
    expect(fs.existsSync(path.join(dir, 'completion_summary.yaml'))).toBe(false);
  });

  it('A3c-TP: a stalled INIT session (0 agents, stale heartbeat) keeps its state and records the stop (FU-8)', () => {
    const proj = mkProj(); const sid = 'act_a3c-tp_261015_001';
    const dir = mkSession(proj, sid, { 'status.yaml': status('init', 3600e3), 'workflow/agent_tree.yaml': 'agents: []\n' });
    stop(proj, sid);
    // v12.77.0 follow-up FU-8: no `incomplete` overwrite; the stop is recorded instead.
    expect(stateOf(dir)).toBe('init');
    expect(fs.readFileSync(path.join(dir, 'status.yaml'), 'utf8')).toMatch(/^last_stop_observed_at:/m);
    expect(fs.readFileSync(path.join(dir, 'completion_summary.yaml'), 'utf8')).toMatch(/^status: (incomplete|failed)/m);
  });
});

describe('HS-4 (d) validator-evidence-recheck', () => {
  function recheck(criteria, { cwdSub = null } = {}) {
    const proj = mkProj();
    fs.writeFileSync(path.join(proj, 'present.md'), 'x');
    const rep = path.join(proj, 'cagents-memory', 'sessions', 'act_a3d_261015_001', 'validation', 'validation_report.yaml');
    fs.mkdirSync(path.dirname(rep), { recursive: true });
    fs.writeFileSync(rep, `classification: PASS\nacceptance_criteria_results:\n${criteria}`);
    let cwd = proj;
    if (cwdSub) { cwd = path.join(proj, cwdSub); fs.mkdirSync(cwd, { recursive: true }); }
    run('validator-evidence-recheck.cjs', proj, { hook_event_name: 'PostToolUse', tool_name: 'Write', cwd, tool_input: { file_path: rep } });
    return fs.readFileSync(rep, 'utf8').match(/classification:\s*(\S+)/)[1];
  }

  it('A3d-FP: evidence present but no verification_method is unverifiable, not a downgrade', () => {
    expect(recheck('  - criterion: "Report written"\n    evidence: "present.md exists, 1 line"\n    met: true\n  - criterion: "Tests"\n    evidence: "npx vitest run: 12 passed"\n    met: true\n')).toBe('PASS');
  });

  it('A3d-TP: file_exists citing a missing file still downgrades PASS to FAIL', () => {
    expect(recheck('  - criterion: "Report written"\n    verification_method: file_exists\n    evidence: "missing-report.md"\n    met: true\n')).toBe('FAIL');
  });

  it('A3d-TP2: no evidence at all still downgrades PASS to FAIL', () => {
    expect(recheck('  - criterion: "Report written"\n    verification_method: file_exists\n    met: true\n')).toBe('FAIL');
  });

  it('a relative file_exists path resolves against PROJECT_ROOT even when input.cwd drifted into a subdir', () => {
    expect(recheck('  - criterion: "Report written"\n    verification_method: file_exists\n    evidence: "present.md"\n    met: true\n', { cwdSub: 'sub/dir' })).toBe('PASS');
  });
});
