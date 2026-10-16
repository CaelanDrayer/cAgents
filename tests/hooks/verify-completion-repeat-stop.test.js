/**
 * Review round 1 on FU-6 / FU-8 (v12.77.0 follow-up).
 *
 * #1 FU-8 repeat guard: an idle non-terminal session (PLANNED, waiting on the
 *    user) blocks at the FIRST Stop only. A second Stop with nothing changed
 *    since is a non-blocking warning. pipeline_state is never written. A real
 *    state change between Stops re-arms the block.
 * #2 FU-6 stale pause: a leftover paused_at is ignored when signals/RESUME
 *    exists, or when the session moved on after it (last_updated_at or a newer
 *    state_history entry).
 *
 * Every fixture lives in a fresh mkdtemp project dir.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HOOK = path.join(process.cwd(), '.claude', 'hooks', 'verify-completion.cjs');
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();
const tmpRoots = [];
afterAll(() => { for (const d of tmpRoots) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} } });

function mkSession(sid, status) {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-repeat-'));
  tmpRoots.push(proj);
  fs.mkdirSync(path.join(proj, 'cagents-memory', '_system', 'logs'), { recursive: true });
  const dir = path.join(proj, 'cagents-memory', 'sessions', sid);
  fs.mkdirSync(path.join(dir, 'workflow'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'status.yaml'), status);
  fs.writeFileSync(path.join(dir, 'workflow', 'plan.yaml'), 'mission: x\nobjectives: [o1]\n');
  fs.writeFileSync(path.join(dir, 'workflow', 'agent_tree.yaml'),
    `agents:\n  - id: o1\n    type: cagents:orchestrator\n    depth: 1\n    spawned_at: '${iso(3600e3)}'\n    stopped_at: '${iso(3500e3)}'\n`);
  return { proj, sid, dir };
}

function stop({ proj, sid }) {
  const r = spawnSync('node', [HOOK], {
    input: JSON.stringify({ session_id: sid, stop_hook_active: false, hook_event_name: 'Stop' }),
    encoding: 'utf8', timeout: 60000,
    env: { ...process.env, CLAUDE_PROJECT_DIR: proj, VITEST: 'true', CAGENTS_ACTIVE_SESSION: '', CAGENTS_STALE_CHILD_MS: '' },
  });
  if (r.error || r.status === null) throw new Error(`hook did not finish: status=${r.status} error=${r.error && r.error.message}`);
  return { code: r.status, out: JSON.parse((r.stdout || '').trim() || 'null'), err: r.stderr || '' };
}

const stateLine = (dir) => fs.readFileSync(path.join(dir, 'status.yaml'), 'utf8').match(/^pipeline_state:.*$/m)[0];
const planned = (extra = '') =>
  `session_id: X\npipeline_state: PLANNED\nstarted_at: "${iso(7200e3)}"\nlast_updated_at: "${iso(3600e3)}"\n`
  + `state_history:\n  - state: PLANNED\n    entered_at: "${iso(3600e3)}"\n${extra}`;

describe('review r1 #1: FU-8 repeat Stop on an unchanged non-terminal state', () => {
  it('Stop twice: block, then no block; pipeline_state byte-identical throughout', () => {
    const s = mkSession('act_rr1-repeat_261016_001', planned());
    const line0 = stateLine(s.dir);
    const r1 = stop(s);
    expect(r1.out && r1.out.decision).toBe('block');
    expect(stateLine(s.dir)).toBe(line0);
    expect(fs.readFileSync(path.join(s.dir, 'status.yaml'), 'utf8')).toMatch(/last_stop_observed_at:/);
    const r2 = stop(s);
    expect(r2.code).toBe(0);
    expect(r2.out && r2.out.decision).toBeUndefined();
    expect(r2.err).toMatch(/repeat Stop in unchanged 'PLANNED'/);
    expect(stateLine(s.dir)).toBe(line0);
    const r3 = stop(s);
    expect(r3.out && r3.out.decision).toBeUndefined();
    expect(stateLine(s.dir)).toBe(line0);
  });

  it('a real state change between Stops re-arms the block', () => {
    const s = mkSession('act_rr1-rearm_261016_001', planned());
    expect(stop(s).out.decision).toBe('block');
    const f = path.join(s.dir, 'status.yaml');
    // The pipeline moved on: new state + new history entry + fresh last_updated_at
    // (old enough to fall outside the 60s liveness heartbeat window).
    const later = iso(61e3);
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8')
      .replace(/^pipeline_state: PLANNED$/m, 'pipeline_state: COORDINATED')
      .replace(/^last_updated_at:.*$/m, `last_updated_at: "${later}"`)
      .replace(/^state_history:\n/m, `state_history:\n  - state: COORDINATED\n    entered_at: "${later}"\n`));
    // last_stop_observed_at is newer than `later`, so backdate it to model the
    // ordering of real time: Stop 1 -> transition -> Stop 2.
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/^last_stop_observed_at:.*$/m, `last_stop_observed_at: "${iso(120e3)}"`));
    const r2 = stop(s);
    expect(r2.out && r2.out.decision).toBe('block');
    expect(stateLine(s.dir)).toBe('pipeline_state: COORDINATED');
  });

  it('same timestamps but a different state in stop_state_note re-arms the block', () => {
    const s = mkSession('act_rr1-note_261016_001',
      planned(`last_stop_observed_at: "${iso(60e3)}"\nstop_state_note: "stopped in ORCHESTRATED; not terminal, state left unchanged"\n`));
    expect(stop(s).out.decision).toBe('block');
  });
});

describe('review r1 #2: FU-6 leftover paused_at is ignored once stale', () => {
  it('fresh paused_at, no RESUME, nothing newer: still a pause (control)', () => {
    const s = mkSession('act_rr1-pause-live_261016_001', planned(`paused_at: "${iso(5e3)}"\n`));
    expect(stop(s).err).toMatch(/paused at Stop/);
  });

  it('signals/RESUME exists: paused_at ignored, normal Stop path runs', () => {
    const s = mkSession('act_rr1-pause-resume_261016_001', planned(`paused_at: "${iso(5e3)}"\npaused_reason: "user review"\n`));
    fs.mkdirSync(path.join(s.dir, 'signals'));
    fs.writeFileSync(path.join(s.dir, 'signals', 'RESUME'), '');
    const r = stop(s);
    expect(r.err).not.toMatch(/paused at Stop/);
    expect(r.out.decision).toBe('block');
  });

  it('paused_at older than last_updated_at: ignored', () => {
    const s = mkSession('act_rr1-pause-lu_261016_001',
      `session_id: X\npipeline_state: PLANNED\nstarted_at: "${iso(7200e3)}"\npaused_at: "${iso(5400e3)}"\nlast_updated_at: "${iso(3600e3)}"\n`);
    const r = stop(s);
    expect(r.err).not.toMatch(/paused at Stop/);
    expect(r.out.decision).toBe('block');
  });

  it('paused_at older than the latest state_history entry: ignored', () => {
    const s = mkSession('act_rr1-pause-hist_261016_001',
      `session_id: X\npipeline_state: PLANNED\nstarted_at: "${iso(7200e3)}"\npaused_at: "${iso(5400e3)}"\n`
      + `state_history:\n  - state: PLANNED\n    entered_at: "${iso(3600e3)}"\n`);
    const r = stop(s);
    expect(r.err).not.toMatch(/paused at Stop/);
    expect(r.out.decision).toBe('block');
  });
});
