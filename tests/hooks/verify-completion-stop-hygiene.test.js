/**
 * HS-11 (WI-10): Stop-warning hygiene for verify-completion.cjs.
 *
 * Ported from the WI-028 scratch replay (scratch/C/bin/stopw.cjs, out-before.txt,
 * out-after.txt). Each W case rebuilds the shape of a real session that
 * produced false-positive Stop warnings in the 2026-09-10..10-15 window. Each N
 * case is a true-positive control that must stay flagged after the fix.
 *
 *   W1-W7  false positives: no user-facing message (W4 keeps its 2 true gaps,
 *          W5 keeps its real self-handling line), and no SELF-CHECK block.
 *   N1-N4  true positives: still warned (N1-N3) or still BLOCK (N4).
 *   Emit-once: a second Stop with the same warning set shows nothing.
 *
 * HS-10 (WI-12) removed the autoResolveWarnings stub writer and added
 * repairSession. Cases here assert only HS-11 behavior. repair-session.test.js
 * covers HS-10.
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

const HOOK = path.join(process.cwd(), '.claude', 'hooks', 'verify-completion.cjs');
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();
const sha = (p) => { try { return crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex'); } catch { return 'absent'; } };
const tmpRoots = [];
afterAll(() => { for (const d of tmpRoots) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} } });

function mkSession(sid, files) {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-hygiene-'));
  tmpRoots.push(proj);
  fs.mkdirSync(path.join(proj, 'cagents-memory', '_system', 'logs'), { recursive: true });
  const dir = path.join(proj, 'cagents-memory', 'sessions', sid);
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  return { proj, sid, dir };
}

function stop({ proj, sid, dir }) {
  const r = spawnSync('node', [HOOK], {
    input: JSON.stringify({ session_id: sid, stop_hook_active: false, hook_event_name: 'Stop' }),
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, CLAUDE_PROJECT_DIR: proj, VITEST: 'true', CAGENTS_ACTIVE_SESSION: '' },
  });
  if (r.error || r.status === null) throw new Error(`hook did not finish: status=${r.status} error=${r.error && r.error.message}`);
  let out = null;
  try { out = JSON.parse((r.stdout || '').trim() || 'null'); } catch { out = (r.stdout || '').trim(); }
  const cs = fs.existsSync(path.join(dir, 'completion_summary.yaml')) ? fs.readFileSync(path.join(dir, 'completion_summary.yaml'), 'utf8') : '';
  const warnings = (cs.split(/^warnings:/m)[1] || '').split('\n').filter((l) => /^\s+- "/.test(l)).map((l) => l.trim().slice(3, -1));
  const issues = (cs.split(/^issues:/m)[1] || '').split(/^warnings:/m)[0].split('\n').filter((l) => /^\s+- "/.test(l)).map((l) => l.trim().slice(3, -1));
  const msg = out && typeof out === 'object' ? (out.systemMessage || '') : '';
  return { out, msg, warnings, issues, err: r.stderr || '' };
}

const stateOf = (dir) => (fs.readFileSync(path.join(dir, 'status.yaml'), 'utf8').match(/pipeline_state: (\S+)/) || [])[1];

// ---- fixture builders (shapes copied from the real warned sessions) --------
const statusY = (state, { entered = 60e3, hb = 5e3, key = 'pipeline_state' } = {}) =>
  `session_id: X\n${key}: ${state}\nstarted_at: "${iso(7200e3)}"\nlast_updated_at: "${iso(hb)}"\nphase_history:\n  - state: ${state}\n    entered_at: "${iso(entered)}"\n    duration_ms: null\n`;
const row = (id, t, d, { ago = 600e3, running = false, parent = 'pipeline' } = {}) =>
  `  - id: ${id}\n    type: cagents:${t}\n    parent: ${parent}\n    depth: ${d}\n    spawned_at: '${iso(ago)}'\n    stopped_at: ${running ? 'null' : `'${iso(ago - 30e3)}'`}\n`;
const tree = (...rows) => 'agents:\n' + rows.join('');
const planNoMission = 'schema_version: "1"\nrequest_summary: fix concurrent session hooks\nobjectives: [o1]\ncontroller_assignment: {primary: tech-lead}\n';
const planMission = 'mission: build vertical slices\nobjectives: [o1]\ncontroller_assignment: {primary: tech-lead}\n';
const workItems = (n) => 'work_items:\n' + Array.from({ length: n }, (_, i) => `  - id: WI-${i + 1}\n    acceptance_criteria:\n      - criterion ${i + 1}\n`).join('');
const valPass = 'classification: PASS\noverall_status: PASS\ngenerated_by: validator\n';
const execByAct = 'session_id: X\nfinal_state: complete\nstatus: completed\ngenerated_by: act-step-4\n';
const coordConcurrent = 'schema_version: "1"\nsession_id: X\ncontroller: tech-lead\nmode: coordinate\nstatus: completed\nobjectives: [o1]\nimplementation_tasks:\n'
  + Array.from({ length: 12 }, (_, i) => `  - {id: WI-${i + 1}, agent: backend-developer, status: completed, review: PASS r1, files: [.claude/hooks/x${i}.cjs]}\n`).join('')
  + 'self_validation:\n  npm_test: "3173 tests (3159 passed, 14 skipped, 0 failed)"\nvalidation_checkpoints:\n  - "grep findMostRecentSessionDir: no match"\n  - "12.73.0 in plugin.json"\n';
const coordSte100 = 'schema_version: "1"\ncontroller: tech-lead\nstatus: completed\nobjectives: [o1]\nimplementation_tasks:\n'
  + Array.from({ length: 23 }, (_, i) => `  - {id: P${i}, status: completed${i < 7 ? `, evidence: "validate-agents EXIT=0 run ${i}"` : ''}}\n`).join('')
  + Array.from({ length: 35 }, (_, i) => `  - {id: Q${i}, status: not_started}\n`).join('')
  + 'self_validation:\n  controller_run_gates:\n    - {cmd: "bash scripts/ci/validate-agents.sh", result: "EXIT=0"}\n'
  + 'validation_checkpoints:\n  - {gate: "P0 harness calibration", verdict: PASS, evidence: "exact"}\n'
  + 'findings_for_followup:\n  - id: F1\n    output: |\n      long free text that is not a path\n';
const coordVertical = 'schema_version: "1"\ncontroller: tech-lead\nstatus: completed\nobjectives: [o1]\nimplementation_tasks:\n'
  + Array.from({ length: 30 }, (_, i) => `  - task_id: TASK-${i + 1}\n    status: completed\n    evidence_path: outputs/task-${i + 1}.md\n    review_rounds: 1\n    review_result: PASS\n    guard_output: "${i % 2 ? '8/8 tests passed, exit 0' : 'Test Files 1 passed (1); Tests 5 passed (5); exit 0'}"\n`).join('')
  + 'validation_checkpoints:\n  pre_execution: ok\nmid_execution_checkpoints: [ok]\n';
const verticalOutputs = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`outputs/task-${i + 1}.md`, 'x\n']));
const smallCoord = 'schema_version: "1"\ncontroller: tech-lead\nstatus: completed\nvalidation_checkpoints: [x]\nself_validation: x\n';

// Removed message families: none of these may reach the user any more.
const REMOVED = /SELF-CHECK|Pipeline actively (running|working)|pre-execution validation checkpoint|mid-execution checkpoint|CONTROLLER SELF-HANDLED VIA GRACEFUL/;

// createHook() turns a null handler result into {"continue": true}: nothing is
// shown to the user and nothing blocks.
const SILENT = { continue: true };
function expectClean(r) {
  expect(r.out, `expected no user-facing output, got ${JSON.stringify(r.out)}`).toEqual(SILENT);
  expect(r.warnings).toEqual([]);
}
function expectNoRemovedFamilies(r) {
  expect(r.msg).not.toMatch(REMOVED);
  for (const w of r.warnings) expect(w).not.toMatch(REMOVED);
}

describe('verify-completion Stop hygiene (HS-11): false positives W1-W7', () => {
  it('W1 mid-flight yield (ORCHESTRATED, planner running 3s): silent on both Stops, no SELF-CHECK, state untouched', () => {
    const s = mkSession('act_w1-midflight_261015_001', {
      'status.yaml': statusY('ORCHESTRATED', { entered: 20e3 }),
      'workflow/agent_tree.yaml': tree(row('o1', 'orchestrator', 1, { ago: 60e3 }), row('p1', 'planner', 1, { ago: 3e3, running: true })),
    });
    const r1 = stop(s); expectClean(r1);
    expect(stateOf(s.dir)).toBe('ORCHESTRATED');
    const r2 = stop(s); expectClean(r2); expectNoRemovedFamilies(r2);
    expect(stateOf(s.dir)).toBe('ORCHESTRATED');
  });

  it('W2 concurrent mid-flight (COORDINATED, validator running): 8-warning shape is now silent; no stubs while live', () => {
    const s = mkSession('act_w2-concurrent-mid_260927_001', {
      'status.yaml': statusY('COORDINATED', { entered: 60e3 }), 'workflow/plan.yaml': planNoMission,
      'workflow/work_items.yaml': workItems(12), 'workflow/coordination_log.yaml': coordConcurrent,
      'workflow/agent_tree.yaml': tree(row('o', 'orchestrator', 1), row('p', 'planner', 1), row('t', 'tech-lead', 1), row('b', 'backend-developer', 1),
        row('w', 'technical-writer', 1), row('q', 'qa-lead', 1), row('v', 'validator', 1, { ago: 2e3, running: true })),
    });
    for (let i = 0; i < 2; i++) {
      const r = stop(s); expectClean(r);
      expect(stateOf(s.dir)).toBe('COORDINATED');
      expect(fs.existsSync(path.join(s.dir, 'workflow', 'validation_report.yaml'))).toBe(false);
      expect(fs.existsSync(path.join(s.dir, 'workflow', 'execution_summary.yaml'))).toBe(false);
    }
  });

  it('W3 concurrent final (complete, genuine PASS): 5-warning shape is now silent', () => {
    const s = mkSession('act_w3-concurrent-final_260927_001', {
      'status.yaml': statusY('complete', { hb: 120e3 }), 'workflow/plan.yaml': planNoMission,
      'workflow/work_items.yaml': workItems(12), 'workflow/coordination_log.yaml': coordConcurrent, 'workflow/validation_report.yaml': valPass,
      'workflow/execution_summary.yaml': execByAct,
      'workflow/agent_tree.yaml': tree(row('o', 'orchestrator', 1), row('p', 'planner', 1), row('t', 'tech-lead', 1), row('b', 'backend-developer', 1),
        row('w', 'technical-writer', 1), row('q', 'qa-lead', 1), row('v', 'validator', 1)),
    });
    expectClean(stop(s));
    expectClean(stop(s));
  });

  it('W4 ste100 final (35 not_started, `output: |`): keeps the 2 true gaps (K1 + coverage), one-line message, then emit-once', () => {
    const sid = 'act_w4-ste100_260910_001';
    const s = mkSession(sid, {
      'status.yaml': statusY('complete', { hb: 120e3 }), 'workflow/plan.yaml': planMission,
      'workflow/work_items.yaml': workItems(55), 'workflow/coordination_log.yaml': coordSte100, 'workflow/validation_report.yaml': valPass,
      'workflow/execution_summary.yaml': execByAct,
      'workflow/agent_tree.yaml': tree(row('t', 'tech-lead', 1), row('b', 'backend-developer', 2, { parent: 't' })),
    });
    const r1 = stop(s);
    expect(r1.warnings).toHaveLength(2);
    expect(r1.warnings[0]).toBe(`35 work item(s) never started in ${sid}; resume with /act --resume ${sid} or list them under not_in_scope.`);
    expect(r1.warnings[1]).toBe('47 of 55 work items have no evidence (15% covered); add evidence: lines to coordination_log.yaml.');
    expect(r1.warnings.join('\n')).not.toMatch(/Sentinel gate/); // `output: |` is not a path
    expect(r1.msg).toBe(`cAgents warning: ${r1.warnings[0]} (+1 more in cagents-memory/sessions/${sid}/completion_summary.yaml)`);
    expect(r1.msg).not.toMatch(/\n/);
    expectNoRemovedFamilies(r1);
    const r2 = stop(s);
    expect(r2.out, 'emit-once: an unchanged warning set is not re-shown').toEqual(SILENT);
    expect(r2.warnings, 'the summary file still records the warnings').toHaveLength(2);
  });

  it('W5 vertical final (evidence_path, guard_output, tree lost executors): only the real self-handling line remains', () => {
    const sid = 'act_w5-vertical_260923_001';
    const s = mkSession(sid, {
      'status.yaml': statusY('complete', { hb: 120e3 }), 'workflow/plan.yaml': planMission,
      'workflow/work_items.yaml': workItems(30), 'workflow/coordination_log.yaml': coordVertical, 'workflow/validation_report.yaml': valPass,
      'workflow/execution_summary.yaml': execByAct, ...verticalOutputs,
      'workflow/agent_tree.yaml': 'agents:\n  - id: pipeline\n    type: act-pipeline\n    depth: 0\n    spawned_at: \'' + iso(7200e3) + '\'\n    parent: null\n'
        + row('o', 'orchestrator', 1) + row('p', 'planner', 1) + row('t', 'tech-lead', 1),
    });
    const r1 = stop(s);
    expect(r1.warnings).toHaveLength(1);
    expect(r1.warnings[0]).toMatch(new RegExp(`^CONTROLLER SELF-HANDLING \\(protocol violation\\) in ${sid}: no execution agent recorded; re-run its work items via /act --resume ${sid}\\.$`));
    expect(r1.msg).toBe(`cAgents warning: ${r1.warnings[0]}`);
    expect(r1.warnings.join('\n')).not.toMatch(/Sentinel gate|Evidence quality|work items have no evidence/);
    expect(stop(s).out).toEqual(SILENT); // emit-once
  });

  it('W5b vertical final with executors at depth 2: silent', () => {
    const s = mkSession('act_w5b-vertical_260923_001', {
      'status.yaml': statusY('complete', { hb: 120e3 }), 'workflow/plan.yaml': planMission,
      'workflow/work_items.yaml': workItems(30), 'workflow/coordination_log.yaml': coordVertical, 'workflow/validation_report.yaml': valPass,
      'workflow/execution_summary.yaml': execByAct, ...verticalOutputs,
      'workflow/agent_tree.yaml': tree(row('o', 'orchestrator', 1), row('p', 'planner', 1), row('t', 'tech-lead', 1),
        row('b', 'backend-developer', 2, { parent: 't' }), row('r', 'reviewer', 2, { parent: 't' })),
    });
    expectClean(stop(s));
  });

  it('W6 designer between questions (phase: refinement): silent', () => {
    const s = mkSession('designer_w6-vertical_260920_001', { 'status.yaml': statusY('refinement', { key: 'phase', hb: 30e3 }) });
    expectClean(stop(s));
  });

  it('W7 designer finished (phase: completed, no validator by design): silent on both Stops', () => {
    const s = mkSession('designer_w7-vertical_260920_001', { 'status.yaml': statusY('completed', { key: 'phase', hb: 30e3 }) });
    expectClean(stop(s));
    expectClean(stop(s));
  });
});

describe('verify-completion Stop hygiene (HS-11): true positives N1-N4 stay flagged', () => {
  it('N1 real self-handling (controller only, no executor types): kept, one line', () => {
    const sid = 'act_n1-selfhandled_261015_001';
    const s = mkSession(sid, {
      'status.yaml': statusY('complete', { hb: 120e3 }), 'workflow/plan.yaml': planMission,
      'workflow/coordination_log.yaml': 'schema_version: "1"\ncontroller: tech-lead\nstatus: completed\nnote: handled directly\nvalidation_checkpoints: [x]\nself_validation: x\n',
      'workflow/validation_report.yaml': valPass, 'workflow/execution_summary.yaml': execByAct,
      'workflow/agent_tree.yaml': tree(row('o', 'orchestrator', 1), row('p', 'planner', 1), row('t', 'tech-lead', 1), row('v', 'validator', 1)),
    });
    const r = stop(s);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatch(new RegExp(`^CONTROLLER SELF-HANDLING \\(protocol violation\\) in ${sid}: no execution agent recorded`));
    expect(r.msg).toMatch(/^cAgents warning: CONTROLLER SELF-HANDLING/);
  });

  it('N2 real missing deliverable (output_file absent): Sentinel gate kept, names the first missing path', () => {
    const s = mkSession('act_n2-missing_261015_001', {
      'status.yaml': statusY('complete', { hb: 120e3 }), 'workflow/plan.yaml': planMission,
      'workflow/coordination_log.yaml': smallCoord + 'implementation_tasks:\n  - task_id: T1\n    status: completed\n    evidence: "src/a.js:10 tests 3/3 pass"\n    output_file: outputs/report-missing.md\n',
      'workflow/validation_report.yaml': valPass, 'workflow/execution_summary.yaml': execByAct,
      'workflow/agent_tree.yaml': tree(row('t', 'tech-lead', 1), row('b', 'backend-developer', 2, { parent: 't' })),
    });
    const r = stop(s);
    expect(r.warnings).toEqual(['Sentinel gate: 1 claimed file(s) missing (first: outputs/report-missing.md); create them or correct files_created/output in coordination_log.yaml.']);
    expect(r.msg).toBe(`cAgents warning: ${r.warnings[0]}`);
  });

  it('N3 validator FAIL: verdict file untouched, actionable FAIL line kept, emit-once on rerun', () => {
    const sid = 'act_n3-fail_261015_001';
    const s = mkSession(sid, {
      'status.yaml': statusY('complete', { hb: 120e3 }), 'workflow/plan.yaml': planMission,
      'workflow/coordination_log.yaml': smallCoord,
      'workflow/validation_report.yaml': 'classification: FAIL\noverall_status: FAIL\ngenerated_by: validator\n',
      'workflow/agent_tree.yaml': tree(row('t', 'tech-lead', 1), row('b', 'backend-developer', 2, { parent: 't' })),
    });
    const valPath = path.join(s.dir, 'workflow', 'validation_report.yaml');
    const before = sha(valPath);
    const r1 = stop(s);
    expect(sha(valPath)).toBe(before);
    expect(r1.warnings[0]).toBe(`Validation status: FAIL for ${sid}; fix the findings in workflow/validation_report.yaml, then /act --resume ${sid}.`);
    // The second line flags the missing /act Step 4 summary. Its wording depends
    // on whether the HS-10 stub writer still runs, so only its subject is pinned.
    expect(r1.warnings).toHaveLength(2);
    expect(r1.warnings[1]).toMatch(/execution_summary\.yaml/);
    expect(r1.msg).toMatch(new RegExp(`^cAgents warning: Validation status: FAIL for ${sid}.* \\(\\+1 more in `));
    expectNoRemovedFamilies(r1);
    const r2 = stop(s);
    expect(sha(valPath)).toBe(before);
    expect(r2.out).toEqual(SILENT);
  });

  it('N4 abandoned pipeline (PLANNED 2h, nothing running): still BLOCKS', () => {
    const s = mkSession('act_n4-abandoned_261015_001', {
      'status.yaml': statusY('PLANNED', { entered: 7200e3, hb: 7000e3 }), 'workflow/plan.yaml': planMission,
      'workflow/agent_tree.yaml': tree(row('o', 'orchestrator', 1, { ago: 7300e3 }), row('p', 'planner', 1, { ago: 7250e3 })),
    });
    const r = stop(s);
    expect(r.out && r.out.decision).toBe('block');
    expect(r.out.reason).toMatch(/Workflow stopping in 'PLANNED' pipeline state/);
    expect(r.issues.join('\n')).toMatch(/PLANNED/);
  });
});

describe('verify-completion Stop hygiene (HS-11): emit-once tracks the warning SET', () => {
  it('re-shows when the warning set changes between Stops', () => {
    const sid = 'act_n2b-change_261015_001';
    const s = mkSession(sid, {
      'status.yaml': statusY('complete', { hb: 120e3 }), 'workflow/plan.yaml': planMission,
      'workflow/coordination_log.yaml': smallCoord + 'implementation_tasks:\n  - task_id: T1\n    status: completed\n    evidence: "src/a.js:10 tests 3/3 pass"\n    output_file: outputs/report-missing.md\n',
      'workflow/validation_report.yaml': valPass, 'workflow/execution_summary.yaml': execByAct,
      'workflow/agent_tree.yaml': tree(row('t', 'tech-lead', 1), row('b', 'backend-developer', 2, { parent: 't' })),
    });
    expect(stop(s).msg).toMatch(/Sentinel gate/);
    expect(stop(s).out).toEqual(SILENT);
    // Add a not_started item: the set changes, so the Stop speaks again.
    fs.appendFileSync(path.join(s.dir, 'workflow', 'coordination_log.yaml'), '  - task_id: T2\n    status: not_started\n');
    const r3 = stop(s);
    expect(r3.msg).toMatch(/^cAgents warning: /);
    expect(r3.warnings.join('\n')).toMatch(/1 work item\(s\) never started/);
  });
});
