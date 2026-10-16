/**
 * WI-17: unit coverage for four teamIdleBetweenWaves paths left untested by WI-14
 * (team_hook-session-fixes_261015_001 outputs/wave_3/WI-9/idle-lead-design.md §3):
 *   A. workflow/events.jsonl mtime as an activity signal (condition 5)
 *   B. work_meta.yaml `total_waves: N` fallback, 0-based (condition 4a)
 *   C. HOLD (and FAIL) gate verdicts (condition 3)
 *   D. sub-wave ordering: wave_5b gate files and `wave: 5b` meta entries
 *
 * In-process: the predicate is required with CAGENTS_DISPATCH_IMPORT=1 so the
 * hook's stdin main() does not run. Fixtures live in an os.tmpdir() root and
 * never touch the real cagents-memory. Clock is injected via nowMs.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

let teamIdleBetweenWaves;
let root;
let seq = 0;
const NOW = Date.now();

beforeAll(() => {
  process.env.CAGENTS_DISPATCH_IMPORT = '1';
  try {
    ({ teamIdleBetweenWaves } = require(join(ROOT, '.claude', 'hooks', 'team-stop.cjs')));
  } finally {
    delete process.env.CAGENTS_DISPATCH_IMPORT;
  }
  root = mkdtempSync(join(tmpdir(), 'cagents-idle-predicate-'));
});

afterAll(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ } });
afterEach(() => { delete process.env.CAGENTS_IDLE_LEAD_MAX_MS; });

const setMtime = (p, msAgo) => { const t = (NOW - msAgo) / 1000; utimesSync(p, t, t); };

/**
 * @param {object} o
 * @param {object} o.gates          { 'wave_0': 'PASS', 'wave_5b': 'HOLD', ... }
 * @param {string|null} o.meta      raw work_meta.yaml body (null = absent)
 * @param {number} o.gateAgeMs      mtime age of every gate file
 * @param {number|null} o.heartbeatAgeMs  last_updated_at age (null = omitted)
 * @param {number|null} o.eventsAgeMs     events.jsonl mtime age (null = absent)
 */
function makeSession(o = {}) {
  const {
    gates = { wave_0: 'PASS', wave_1: 'PASS' },
    meta = 'waves:\n  - wave: 0\n  - wave: 1\n  - wave: 2\n  - wave: 3\n',
    gateAgeMs = 10 * MIN, heartbeatAgeMs = null, eventsAgeMs = null,
  } = o;
  seq += 1;
  const dir = join(root, `team_idle-pred-${seq}_261015_001`);
  const put = (rel, body) => { const p = join(dir, rel); mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, body); return p; };
  const status = [
    'phase: EXECUTING', 'pipeline_state: EXECUTING',
    ...(heartbeatAgeMs === null ? [] : [`last_updated_at: "${new Date(NOW - heartbeatAgeMs).toISOString()}"`]),
    '',
  ].join('\n');
  put('status.yaml', status);
  for (const [k, verdict] of Object.entries(gates)) {
    setMtime(put(`workflow/gate_validations/${k}.yaml`, `wave: ${k}\noverall: ${verdict}\n`), gateAgeMs);
  }
  mkdirSync(join(dir, 'workflow', 'gate_validations'), { recursive: true });
  if (meta !== null) put('workflow/work_meta.yaml', meta);
  if (eventsAgeMs !== null) setMtime(put('workflow/events.jsonl', '{"event":"spawn"}\n'), eventsAgeMs);
  return { dir, status };
}
const run = (s) => teamIdleBetweenWaves(s.dir, s.status, NOW);

describe('A. events.jsonl activity (condition 5)', () => {
  it('fresh events.jsonl keeps an otherwise-abandoned lead idle (gate 25h old, no heartbeat)', () => {
    const r = run(makeSession({ gateAgeMs: 25 * HOUR, eventsAgeMs: 1 * MIN }));
    expect(r).toMatchObject({ idle: true, gate: 'wave_1', lastWave: 3 });
  });
  it('stale events.jsonl (25h) does not rescue a 25h-old gate', () => {
    expect(run(makeSession({ gateAgeMs: 25 * HOUR, eventsAgeMs: 25 * HOUR }))).toBe(false);
  });
  it('absent events.jsonl + 25h-old gate + no heartbeat -> not idle', () => {
    expect(run(makeSession({ gateAgeMs: 25 * HOUR }))).toBe(false);
  });
  it('events.jsonl freshness is measured against CAGENTS_IDLE_LEAD_MAX_MS', () => {
    process.env.CAGENTS_IDLE_LEAD_MAX_MS = String(30 * MIN);
    expect(run(makeSession({ gateAgeMs: 25 * HOUR, eventsAgeMs: 20 * MIN }))).toMatchObject({ idle: true });
    expect(run(makeSession({ gateAgeMs: 25 * HOUR, eventsAgeMs: 40 * MIN }))).toBe(false);
  });
  it('status.yaml mtime is NOT an activity signal (design §3 cond 5: hook self-writes excluded)', () => {
    // status.yaml is written just now (fresh mtime) but carries no last_updated_at.
    expect(run(makeSession({ gateAgeMs: 25 * HOUR }))).toBe(false);
  });
});

describe('B. total_waves fallback (condition 4a, 0-based)', () => {
  it('total_waves: 4 with latest gate wave_2 -> pending, lastWave = 3', () => {
    const r = run(makeSession({ gates: { wave_0: 'PASS', wave_2: 'PASS' }, meta: 'total_waves: 4\n' }));
    expect(r).toMatchObject({ idle: true, gate: 'wave_2', lastWave: 3 });
  });
  it('total_waves: 4 with latest gate wave_3 (K = N-1) -> no later wave, not idle', () => {
    expect(run(makeSession({ gates: { wave_3: 'PASS' }, meta: 'total_waves: 4\n' }))).toBe(false);
  });
  it('waves[] list takes precedence over total_waves', () => {
    // total_waves says 8 waves remain, but the explicit list ends at wave 1.
    const meta = 'total_waves: 8\nwaves:\n  - wave: 0\n  - wave: 1\n';
    expect(run(makeSession({ gates: { wave_1: 'PASS' }, meta }))).toBe(false);
  });
  it('live-session shape (F4): total_waves: 8, gates 0..2, no task_list -> idle, lastWave 7', () => {
    const r = run(makeSession({
      gates: { wave_0: 'PASS', wave_1: 'CONDITIONAL_PASS', wave_2: 'CONDITIONAL_PASS' }, meta: 'total_waves: 8\n',
    }));
    expect(r).toMatchObject({ idle: true, gate: 'wave_2', lastWave: 7 });
  });
  it('indented total_waves (nested key) is not read -> no evidence, not idle', () => {
    expect(run(makeSession({ gates: { wave_0: 'PASS' }, meta: 'plan:\n  total_waves: 4\n' }))).toBe(false);
  });
});

describe('C. HOLD / FAIL gate verdicts (condition 3)', () => {
  it('latest gate HOLD -> not idle', () => {
    expect(run(makeSession({ gates: { wave_0: 'PASS', wave_1: 'HOLD' } }))).toBe(false);
  });
  it('latest gate FAIL -> not idle', () => {
    expect(run(makeSession({ gates: { wave_0: 'PASS', wave_1: 'FAIL' } }))).toBe(false);
  });
  it('earlier HOLD superseded by a later PASS -> idle (only the latest gate counts)', () => {
    expect(run(makeSession({ gates: { wave_0: 'HOLD', wave_1: 'PASS' } }))).toMatchObject({ idle: true, gate: 'wave_1' });
  });
  it('quoted "HOLD" is also not a pass', () => {
    expect(run(makeSession({ gates: { wave_1: '"HOLD"' } }))).toBe(false);
  });
});

describe('D. sub-wave ordering (wave_5b)', () => {
  const meta7 = 'waves:\n' + [0, 1, 2, 3, 4, 5, 6].map((n) => `  - wave: ${n}`).join('\n') + '\n';
  it('wave_5b sorts after wave_5: 5 PASS then 5b HOLD -> latest is HOLD, not idle', () => {
    expect(run(makeSession({ gates: { wave_5: 'PASS', wave_5b: 'HOLD' }, meta: meta7 }))).toBe(false);
  });
  it('wave_5 HOLD then wave_5b PASS -> idle, gate reported as wave_5b', () => {
    const r = run(makeSession({ gates: { wave_5: 'HOLD', wave_5b: 'PASS' }, meta: meta7 }));
    expect(r).toMatchObject({ idle: true, gate: 'wave_5b', lastWave: 6 });
  });
  it('integer ordering is numeric, not lexical: wave_10 beats wave_9', () => {
    const meta = 'waves:\n' + Array.from({ length: 12 }, (_, n) => `  - wave: ${n}`).join('\n') + '\n';
    const r = run(makeSession({ gates: { wave_9: 'HOLD', wave_10: 'PASS' }, meta }));
    expect(r).toMatchObject({ idle: true, gate: 'wave_10', lastWave: 11 });
  });
  it('wave_6 beats wave_5b', () => {
    const r = run(makeSession({ gates: { wave_5b: 'HOLD', wave_6: 'PASS' }, meta: meta7 + '  - wave: 7\n' }));
    expect(r).toMatchObject({ idle: true, gate: 'wave_6' });
  });
  it('CURRENT: `wave: 5b` in work_meta parses as 5, so a pending 5b after a wave_5 PASS is not seen (WI-13 LOW)', () => {
    const meta = 'waves:\n' + [0, 1, 2, 3, 4, 5].map((n) => `  - wave: ${n}`).join('\n') + '\n  - wave: 5b\n';
    expect(run(makeSession({ gates: { wave_5: 'PASS' }, meta }))).toBe(false);
  });
  it('CURRENT: gate wave_5b reduces to K=5, so meta max wave 6 is pending', () => {
    expect(run(makeSession({ gates: { wave_5b: 'PASS' }, meta: meta7 }))).toMatchObject({ idle: true, lastWave: 6 });
  });
});
