/**
 * REC-16 (v12.51.0) regression: the structured per-session event stream
 * `workflow/events.jsonl` (one JSON object per line) restored via the
 * appendSessionEvent() helper in hook-utils.cjs, plus its wiring into the
 * spawn / stop lifecycle hooks.
 *
 * Covers:
 *   1. Schema + ordering  — spawn/stop/gate/outcome lines each parse, carry a
 *      `ts` + `type`, and appear in emission order.
 *   2. null no-op         — appendSessionEvent(null, …) writes nothing and never throws.
 *   3. Fail-open          — a sessionDir that is a FILE (not a dir) never throws.
 *   4. Concurrent lock    — N subprocess writers produce N intact lines (no truncation).
 *   5. Wiring             — subagent-tracker (spawn) + subagent-stop-tracker (stop)
 *                           actually append events.jsonl lines end-to-end.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createRequire } from 'module';
import { spawn, spawnSync } from 'child_process';

const require = createRequire(import.meta.url);
const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_UTILS = join(HOOKS_DIR, 'hook-utils.cjs');
const { appendSessionEvent } = require(HOOK_UTILS);

let TMP;

beforeEach(() => {
  TMP = mkdtempSync(join(tmpdir(), 'rec16-'));
});
afterEach(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function readEvents(sessionDir) {
  const f = join(sessionDir, 'workflow', 'events.jsonl');
  if (!existsSync(f)) return [];
  return readFileSync(f, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

describe('REC-16: appendSessionEvent helper', () => {
  it('writes one parseable JSONL line per event with ts + type, in order', () => {
    const sessionDir = join(TMP, 'run_rec16_a');
    mkdirSync(sessionDir, { recursive: true });

    appendSessionEvent(sessionDir, { type: 'spawn', agent_id: 'a1', depth: 1 });
    appendSessionEvent(sessionDir, { type: 'stop', agent_id: 'a1', duration_seconds: 12 });
    appendSessionEvent(sessionDir, { type: 'gate', decision: 'pass', issues: 0 });
    appendSessionEvent(sessionDir, { type: 'outcome', pass_fail: 'pass', agent_count: 1 });

    const events = readEvents(sessionDir);
    expect(events.length).toBe(4);
    for (const e of events) {
      expect(typeof e.ts).toBe('string');
      expect(Date.parse(e.ts)).not.toBeNaN();
      expect(typeof e.type).toBe('string');
    }
    expect(events.map((e) => e.type)).toEqual(['spawn', 'stop', 'gate', 'outcome']);
    // Payload fields survive round-trip.
    expect(events[1].duration_seconds).toBe(12);
    expect(events[3].pass_fail).toBe('pass');
  });

  it('is a no-op (no file, no throw) when sessionDir is null/undefined', () => {
    expect(() => appendSessionEvent(null, { type: 'spawn' })).not.toThrow();
    expect(() => appendSessionEvent(undefined, { type: 'spawn' })).not.toThrow();
    // Nothing written anywhere under TMP.
    expect(existsSync(join(TMP, 'workflow'))).toBe(false);
  });

  it('fails open (no throw) when sessionDir points at a FILE, not a dir', () => {
    const filePath = join(TMP, 'not-a-dir');
    writeFileSync(filePath, 'i am a file');
    // ensureDir(<file>/workflow) throws ENOTDIR internally; must be swallowed.
    expect(() => appendSessionEvent(filePath, { type: 'spawn', agent_id: 'x' })).not.toThrow();
  });

  it('is lock-protected: N concurrent subprocess writers produce N intact lines', async () => {
    const sessionDir = join(TMP, 'run_rec16_concurrent');
    mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
    const N = 10;

    const script = (i) =>
      `const {appendSessionEvent}=require(${JSON.stringify(HOOK_UTILS)});` +
      `appendSessionEvent(${JSON.stringify(sessionDir)},{type:'spawn',agent_id:'a${i}',i:${i}});`;

    await Promise.all(
      Array.from({ length: N }, (_, i) =>
        new Promise((resolve) => {
          const child = spawn('node', ['-e', script(i)], { stdio: ['ignore', 'ignore', 'pipe'] });
          let err = '';
          child.stderr.on('data', (d) => (err += d));
          child.on('exit', (code) => resolve({ code, err }));
        })
      )
    );

    const events = readEvents(sessionDir); // JSON.parse of every line = no truncation
    expect(events.length).toBe(N);
    const seen = new Set(events.map((e) => e.i));
    for (let i = 0; i < N; i++) expect(seen.has(i)).toBe(true);
  }, 30000);
});

describe('REC-16: lifecycle hook wiring (spawn + stop)', () => {
  it('subagent-tracker emits a spawn line and subagent-stop-tracker emits a stop line', () => {
    const sid = `run_rec16wire_${Date.now().toString(36)}`;
    const sessionDir = join(TMP, 'cagents-memory', 'sessions', sid);
    mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
    writeFileSync(
      join(sessionDir, 'status.yaml'),
      `session_id: ${sid}\nphase: coordinating\npipeline_state: COORDINATING\n`
    );
    writeFileSync(join(sessionDir, 'workflow', 'agent_tree.yaml'), `schema_version: "1"\nagents: []\n`);

    const agentId = `agent_rec16_${Date.now().toString(36)}`;
    const env = {
      ...process.env,
      CLAUDE_PROJECT_DIR: TMP,
      CAGENTS_ACTIVE_SESSION: sid,
      VITEST: 'true',
      CAGENTS_HOOK_DEDUP_DISABLE: '1',
    };

    const start = spawnSync('node', [join(HOOKS_DIR, 'subagent-tracker.cjs')], {
      input: JSON.stringify({ session_id: sid, agent_type: 'cagents:backend-developer', agent_id: agentId }),
      encoding: 'utf8',
      timeout: 8000,
      env,
    });
    expect(start.status, `start stderr: ${start.stderr}`).toBe(0);

    const stop = spawnSync('node', [join(HOOKS_DIR, 'subagent-stop-tracker.cjs')], {
      input: JSON.stringify({
        session_id: sid,
        agent_type: 'cagents:backend-developer',
        agent_id: agentId,
        last_assistant_message: 'done',
      }),
      encoding: 'utf8',
      timeout: 8000,
      env,
    });
    expect(stop.status, `stop stderr: ${stop.stderr}`).toBe(0);

    const events = readEvents(sessionDir);
    const types = events.map((e) => e.type);
    expect(types).toContain('spawn');
    expect(types).toContain('stop');
    // spawn precedes stop
    expect(types.indexOf('spawn')).toBeLessThan(types.indexOf('stop'));
    const spawnEvt = events.find((e) => e.type === 'spawn');
    expect(spawnEvt.agent_id).toBe(agentId);
  });
});
