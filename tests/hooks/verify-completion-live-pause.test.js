/**
 * v12.77.0 follow-up FU-6: the Stop hook treats a legitimate pause as a pause.
 *
 * A non-terminal session with a fresh running child (stopped_at null, spawned
 * inside CAGENTS_STALE_CHILD_MS), a status.yaml paused_at / paused_reason, or a
 * <session>/signals/PAUSE file must get: exit 0, no decision block, and ZERO
 * writes. The zero-write proof is a sha1 of every file under the session dir
 * before and after the hook, plus the absence of the global outcome JSONL.
 *
 * The REAL_SHAPE fixture copies the shape of the agent_tree.yaml of session
 * act_hook-error-spam-scan_261016_001 at its 16:32:15Z Stop: a depth-0
 * `pipeline` root row already closed by repairSession, stopped depth-1 rows with
 * folded completion_summary blocks, and one fresh background tech-lead row.
 *
 * Every fixture lives in a fresh mkdtemp project dir.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const HOOK = path.join(process.cwd(), '.claude', 'hooks', 'verify-completion.cjs');
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();
const tmpRoots = [];
afterAll(() => { for (const d of tmpRoots) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} } });

function mkSession(sid, files) {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-pause-'));
  tmpRoots.push(proj);
  fs.mkdirSync(path.join(proj, 'cagents-memory', '_system', 'logs'), { recursive: true });
  const dir = path.join(proj, 'cagents-memory', 'sessions', sid);
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  return { proj, sid, dir };
}

/** sha1 of every file under dir, keyed by relative path. */
function hashTree(dir) {
  const out = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out[path.relative(dir, p)] = crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');
    }
  };
  walk(dir);
  return out;
}

function stop({ proj, sid }, env = {}) {
  const r = spawnSync('node', [HOOK], {
    input: JSON.stringify({ session_id: sid, stop_hook_active: false, hook_event_name: 'Stop' }),
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, CLAUDE_PROJECT_DIR: proj, VITEST: 'true', CAGENTS_ACTIVE_SESSION: '', CAGENTS_STALE_CHILD_MS: '', ...env },
  });
  if (r.error || r.status === null) throw new Error(`hook did not finish: status=${r.status} error=${r.error && r.error.message}`);
  let out = null;
  try { out = JSON.parse((r.stdout || '').trim()); } catch { throw new Error(`stdout not JSON: ${r.stdout}`); }
  return { code: r.status, out, err: r.stderr || '' };
}

const outcomesJsonl = (proj) => path.join(proj, 'cagents-memory', '_knowledge', 'learning', 'session_outcomes.jsonl');

// PLANNED, last transition 41 min ago, no heartbeat: the exact state that made
// the old hook push "Workflow stopping in 'PLANNED' pipeline state".
const statusPlanned = (extra = '') =>
  `session_id: X\npipeline_state: PLANNED\ndomain: engineering\ntier: 2\nstarted_at: "${iso(7.6 * 3600e3)}"\n`
  + `state_history:\n  - state: ORCHESTRATED\n    entered_at: "${iso(7.5 * 3600e3)}"\n  - state: PLANNED\n    entered_at: "${iso(41 * 60e3)}"\n${extra}`;
const plan = 'objectives: [o1]\ncontroller_assignment: {primary: tech-lead}\n';
const workItems = 'work_items:\n  - id: WI-1\n    acceptance_criteria: [c1]\n';

const row = (id, type, { ago, running = false }) =>
  `  - id: ${id}\n    type: ${type}\n    parent: pipeline\n    depth: 1\n    spawned_at: '${iso(ago)}'\n    stopped_at: ${running ? 'null' : `'${iso(ago - 60e3)}'`}\n`
  + `    session: X\n    cagents_type: ${type}\n`;

const REAL_SHAPE = () =>
  '# Agent Tree - cAgents Audit Trail (hook-owned; derived from workflow/events.jsonl)\n# Do not hand-edit.\n\nagents:\n'
  + `  - id: pipeline\n    agent: act\n    depth: 0\n    started_at: '${iso(7.6 * 3600e3)}'\n    stopped_at: '${iso(70 * 60e3)}'\n    stop_reason: repaired:root_of_terminal_session\n`
  + row('a7f675fa77c71f8b1', 'cagents:planner', { ago: 7.5 * 3600e3 })
  + '    short_role: Planner\n    completion_summary:\n      outcome: >-\n        I wrote the plan and 8 work items for tech-lead in coordinate mode, in\n        `/x/plan.yaml`\n      key_decisions: []\n      detail: >-\n        - not a list item, folded text\n    duration_seconds: 47\n'
  + row('a7a6efa4aa9c384b5', 'cagents:planner', { ago: 3 * 60e3 })
  + '    short_role: Planner\n    duration_seconds: 125\n'
  + row('a57f8d8958bc61803', 'cagents:tech-lead', { ago: 8e3, running: true })
  + '    short_role: Tech Lead\n';

function expectPausedNoWrites(s, env) {
  const before = hashTree(s.dir);
  const r = stop(s, env);
  expect(r.code).toBe(0);
  expect(r.out).toEqual({ continue: true });
  expect(r.out.decision).toBeUndefined();
  expect(r.err).toMatch(/paused at Stop/);
  expect(hashTree(s.dir)).toEqual(before);
  expect(fs.existsSync(path.join(s.dir, 'completion_summary.yaml'))).toBe(false);
  expect(fs.existsSync(outcomesJsonl(s.proj))).toBe(false);
}

describe('verify-completion FU-6: live child or pause marker -> allow stop, zero writes', () => {
  it('PLANNED + child spawned 1 min ago with stopped_at null: exit 0, no block, every session file byte-identical', () => {
    const s = mkSession('act_fu6-live-child_261016_001', {
      'status.yaml': statusPlanned(), 'workflow/plan.yaml': plan, 'workflow/work_items.yaml': workItems,
      'workflow/agent_tree.yaml': 'agents:\n' + row('c1', 'cagents:tech-lead', { ago: 60e3, running: true }),
    });
    expectPausedNoWrites(s);
  });

  it('real act_hook-error-spam-scan agent_tree shape (closed root row, folded summaries, fresh controller): paused, zero writes', () => {
    const s = mkSession('act_fu6-real-shape_261016_001', {
      'status.yaml': statusPlanned(), 'workflow/plan.yaml': plan, 'workflow/work_items.yaml': workItems,
      'workflow/agent_tree.yaml': REAL_SHAPE(),
    });
    expectPausedNoWrites(s);
  });

  it('paused_at set, no live child: no block, no writes', () => {
    const s = mkSession('act_fu6-paused-at_261016_001', {
      'status.yaml': statusPlanned(`paused_at: "${iso(5e3)}"\n`), 'workflow/plan.yaml': plan,
      'workflow/agent_tree.yaml': 'agents:\n' + row('c1', 'cagents:tech-lead', { ago: 2 * 3600e3 }),
    });
    expectPausedNoWrites(s);
  });

  it('paused_reason set, no live child: no block, no writes', () => {
    const s = mkSession('act_fu6-paused-reason_261016_001', {
      'status.yaml': statusPlanned('paused_reason: "waiting for user review"\n'), 'workflow/plan.yaml': plan,
      'workflow/agent_tree.yaml': 'agents:\n' + row('c1', 'cagents:tech-lead', { ago: 2 * 3600e3 }),
    });
    expectPausedNoWrites(s);
  });

  it('signals/PAUSE exists, no live child: no block, no writes', () => {
    const s = mkSession('act_fu6-signal_261016_001', {
      'status.yaml': statusPlanned(), 'workflow/plan.yaml': plan, 'signals/PAUSE': '',
      'workflow/agent_tree.yaml': 'agents:\n' + row('c1', 'cagents:tech-lead', { ago: 2 * 3600e3 }),
    });
    expectPausedNoWrites(s);
  });

  it('paused_at: null is NOT a pause marker (falls through to the normal Stop path)', () => {
    const s = mkSession('act_fu6-paused-null_261016_001', {
      'status.yaml': statusPlanned('paused_at: null\n'), 'workflow/plan.yaml': plan,
      'workflow/agent_tree.yaml': 'agents:\n' + row('c1', 'cagents:tech-lead', { ago: 2 * 3600e3 }),
    });
    const r = stop(s);
    expect(r.err).not.toMatch(/paused at Stop/);
    expect(fs.existsSync(path.join(s.dir, 'completion_summary.yaml'))).toBe(true);
  });

  it('child older than CAGENTS_STALE_CHILD_MS (1000 ms): falls through to the existing behaviour', () => {
    const s = mkSession('act_fu6-stale_261016_001', {
      'status.yaml': statusPlanned(), 'workflow/plan.yaml': plan, 'workflow/work_items.yaml': workItems,
      'workflow/agent_tree.yaml': 'agents:\n' + row('c1', 'cagents:tech-lead', { ago: 60e3, running: true }),
    });
    const before = hashTree(s.dir);
    const r = stop(s, { CAGENTS_STALE_CHILD_MS: '1000' });
    expect(r.code).toBe(0);
    expect(r.err).not.toMatch(/paused at Stop/);
    // The existing path runs: PLANNED 41 min with no live work blocks, and writes its summary.
    expect(r.out.decision).toBe('block');
    expect(r.out.reason).toMatch(/Workflow stopping in 'PLANNED'/);
    expect(hashTree(s.dir)).not.toEqual(before);
    expect(fs.existsSync(path.join(s.dir, 'completion_summary.yaml'))).toBe(true);
  });

  it('VALIDATED with a fresh child is not a pause: the VALIDATED->complete path still runs', () => {
    const s = mkSession('act_fu6-validated_261016_001', {
      'status.yaml': `session_id: X\npipeline_state: VALIDATED\nstarted_at: "${iso(3600e3)}"\nstate_history:\n  - state: VALIDATED\n    entered_at: "${iso(60e3)}"\n`,
      'workflow/agent_tree.yaml': 'agents:\n' + row('c1', 'cagents:tech-lead', { ago: 30e3, running: true }),
    });
    const r = stop(s);
    expect(r.err).not.toMatch(/paused at Stop/);
    expect(fs.readFileSync(path.join(s.dir, 'status.yaml'), 'utf8')).toMatch(/pipeline_state: complete/);
  });
});
