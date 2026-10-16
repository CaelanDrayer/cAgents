/**
 * HS-6 (team_hook-session-fixes_261015_001, WI-7): agent_tree.yaml under a
 * concurrent burst. Port of wi028-B scratch repro b2.sh (20-way start/stop
 * burst, anonymous ids, hand-appended row, held lock) and b2c.cjs (a row with
 * no spawned_at is stale, never "running forever").
 *
 * Before HS-6: 30 parse-skips, 1 unlocked write, 3 unmatched stops, final
 * tree unparseable. After: every row present, 0 `stopped_at: null`, no
 * unlocked write, a malformed tree is quarantined and rebuilt from
 * workflow/events.jsonl.
 *
 * Isolation: CLAUDE_PROJECT_DIR and TMPDIR point at a mkdtemp project.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, appendFileSync, readdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawn } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const START = join(HOOKS_DIR, 'subagent-tracker.cjs');
const STOP = join(HOOKS_DIR, 'subagent-stop-tracker.cjs');
const yaml = require('js-yaml');

const UUID = 'aaaaaaaa-0000-4000-8000-00000000000a';
const SID = 'team_burst_261015_001';

let proj;
let sessionDir;
let treeFile;
let env;
let stderrAll = '';

function run(hook, payload) {
  return new Promise((resolve) => {
    const child = spawn('node', [hook], { cwd: proj, env, stdio: ['pipe', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err += d; });
    child.stdout.on('data', () => {});
    const killer = setTimeout(() => child.kill('SIGKILL'), 60000);
    child.on('close', (code) => { clearTimeout(killer); stderrAll += err; resolve(code); });
    child.stdin.end(JSON.stringify(payload));
  });
}

let anonSeq = 0;
const start = (id, type = 'cagents:backend-developer') => run(START, {
  hook_event_name: 'SubagentStart', session_id: UUID, agent_type: type,
  ...(id ? { agent_id: id } : { agent_transcript_path: `/t/anon-start-${anonSeq++}` }),
});
const stop = (id, type = 'cagents:backend-developer') => run(STOP, {
  hook_event_name: 'SubagentStop', session_id: UUID, agent_type: type, last_assistant_message: `done ${id || 'anon'}`,
  ...(id ? { agent_id: id } : { agent_transcript_path: `/t/anon-stop-${anonSeq++}` }),
});

function loadTree() {
  return yaml.load(readFileSync(treeFile, 'utf8'));
}

describe('agent_tree.yaml 20-way concurrent burst (HS-6)', () => {
  beforeAll(async () => {
    proj = mkdtempSync(join(tmpdir(), 'cagents-burst-'));
    const mem = join(proj, 'cagents-memory');
    sessionDir = join(mem, 'sessions', SID);
    treeFile = join(sessionDir, 'workflow', 'agent_tree.yaml');
    mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
    mkdirSync(join(mem, '_system', 'sdk_session_map'), { recursive: true });
    mkdirSync(join(proj, 'tmp'), { recursive: true });
    writeFileSync(join(sessionDir, 'status.yaml'), 'pipeline_state: COORDINATED\n');
    writeFileSync(join(sessionDir, 'session.sdk_id'), UUID);
    writeFileSync(join(mem, '_system', 'sdk_session_map', UUID), SID);
    env = { ...process.env, CLAUDE_PROJECT_DIR: proj, TMPDIR: join(proj, 'tmp') };
    delete env.CAGENTS_ACTIVE_SESSION;
    delete env.CAGENTS_SESSION_ID;
    delete env.CLAUDE_PLUGIN_ROOT;

    // Phase 1: 20 parallel starts, each registered twice, + 3 anonymous starts.
    const p1 = [];
    for (let i = 1; i <= 20; i++) p1.push(start(`s-${i}`), start(`s-${i}`));
    for (let i = 0; i < 3; i++) p1.push(start(null, 'cagents:reviewer'));
    await Promise.all(p1);

    // Phase 2: 20 more starts racing 20 stops of phase-1 agents + 3 anonymous stops.
    const p2 = [];
    for (let i = 1; i <= 20; i++) p2.push(start(`t-${i}`), stop(`s-${i}`));
    for (let i = 0; i < 3; i++) p2.push(stop(null, 'cagents:reviewer'));
    await Promise.all(p2);

    // Phase 3: a hand-appended row breaks the YAML, then 5 start/stop pairs
    // and the 20 phase-2 stops.
    appendFileSync(treeFile, '- agent: cagents:planner\n  role_description: "self-registered"\n  spawned_at: 2026-10-15T00:00:00Z\n');
    for (let i = 1; i <= 5; i++) await start(`m-${i}`);
    const p3 = [];
    for (let i = 1; i <= 5; i++) p3.push(stop(`m-${i}`));
    for (let i = 1; i <= 20; i++) p3.push(stop(`t-${i}`));
    await Promise.all(p3);

    // One sequential write so any lock-skipped writer is reconciled from
    // events.jsonl (the documented "reconciled on next write" contract).
    await start('z-final');
    await stop('z-final');
  }, 300000);

  afterAll(() => {
    if (proj && existsSync(proj)) rmSync(proj, { recursive: true, force: true });
  });

  it('the final tree parses and has a canonical agents list', () => {
    const tree = loadTree();
    expect(tree && Array.isArray(tree.agents)).toBe(true);
  });

  it('every expected row is present exactly once (dedup holds under double registration)', () => {
    const ids = loadTree().agents.map(a => a.id);
    const want = [];
    for (let i = 1; i <= 20; i++) want.push(`s-${i}`, `t-${i}`);
    for (let i = 1; i <= 5; i++) want.push(`m-${i}`);
    want.push('z-final');
    for (const id of want) expect(ids.filter(x => x === id).length, id).toBe(1);
  });

  it('no stopped_at: null leaks (named and anonymous stops all applied)', () => {
    const agents = loadTree().agents;
    const anon = agents.filter(a => /^anon_cagents:reviewer_/.test(a.id));
    expect(anon.length).toBe(3);
    expect(agents.filter(a => !a.stopped_at).map(a => a.id)).toEqual([]);
  });

  it('the malformed hand-appended tree was quarantined, not silently skipped', () => {
    const q = readdirSync(join(sessionDir, 'workflow')).filter(f => f.startsWith('agent_tree.yaml.corrupt-'));
    expect(q.length).toBeGreaterThan(0);
    expect(stderrAll).not.toMatch(/Malformed agent_tree\.yaml — skipping append/);
  });

  it('never writes without the lock, and leaves no tmp files behind', () => {
    expect(stderrAll).not.toMatch(/proceeding without lock/);
    const leftovers = readdirSync(join(sessionDir, 'workflow')).filter(f => f.endsWith('.tmp'));
    expect(leftovers).toEqual([]);
  });

  it('events.jsonl is append-only JSON lines with one spawn per agent', () => {
    const lines = readFileSync(join(sessionDir, 'workflow', 'events.jsonl'), 'utf8').split('\n').filter(Boolean);
    const evs = lines.map(l => JSON.parse(l));
    const spawns = evs.filter(e => e.type === 'spawn').map(e => e.agent_id);
    expect(new Set(spawns).size).toBe(spawns.length);
    expect(spawns.length).toBe(20 + 20 + 5 + 3 + 1);
  });
});

describe('a held lock skips the tree write instead of writing unlocked (HS-6)', () => {
  it('records the spawn in events.jsonl and reconciles it on the next write', async () => {
    const p = mkdtempSync(join(tmpdir(), 'cagents-burst-lock-'));
    try {
      const uuid = 'eeeeeeee-0000-4000-8000-00000000000e';
      const sid = 'team_lock_261015_001';
      const sd = join(p, 'cagents-memory', 'sessions', sid);
      const tf = join(sd, 'workflow', 'agent_tree.yaml');
      mkdirSync(join(sd, 'workflow'), { recursive: true });
      mkdirSync(join(p, 'cagents-memory', '_system', 'sdk_session_map'), { recursive: true });
      mkdirSync(join(p, 'tmp'), { recursive: true });
      writeFileSync(join(sd, 'status.yaml'), 'pipeline_state: COORDINATED\n');
      writeFileSync(join(sd, 'session.sdk_id'), uuid);
      writeFileSync(join(p, 'cagents-memory', '_system', 'sdk_session_map', uuid), sid);
      const e = { ...process.env, CLAUDE_PROJECT_DIR: p, TMPDIR: join(p, 'tmp') };
      delete e.CAGENTS_ACTIVE_SESSION;
      const go = (id) => new Promise((resolve) => {
        const c = spawn('node', [START], { cwd: p, env: e, stdio: ['pipe', 'pipe', 'pipe'] });
        let err = '';
        c.stderr.on('data', (d) => { err += d; });
        c.on('close', () => resolve(err));
        c.stdin.end(JSON.stringify({ session_id: uuid, agent_id: id, agent_type: 'cagents:x' }));
      });
      await go('u-0');
      const before = readFileSync(tf, 'utf8');
      // Hold the lock with a live pid (this test process), as a slow writer would.
      mkdirSync(`${tf}.lock`);
      writeFileSync(join(`${tf}.lock`, 'pid'), String(process.pid));
      const err = await go('u-1');
      expect(readFileSync(tf, 'utf8')).toBe(before); // no unlocked write
      expect(err).not.toMatch(/proceeding without lock/);
      rmSync(`${tf}.lock`, { recursive: true, force: true });
      await go('u-2');
      const ids = yaml.load(readFileSync(tf, 'utf8')).agents.map(a => a.id).sort();
      expect(ids).toEqual(['u-0', 'u-1', 'u-2']);
    } finally {
      rmSync(p, { recursive: true, force: true });
    }
  }, 120000);
});

describe('verify-completion: a running row with no spawned_at is stale (b2c port, HS-6)', () => {
  it('hasFreshRunningChild ignores a hand row without spawned_at', () => {
    const src = readFileSync(join(HOOKS_DIR, 'verify-completion.cjs'), 'utf8');
    const pick = (name) => {
      const i = src.indexOf(`function ${name}(`);
      expect(i, name).toBeGreaterThan(-1);
      let d = 0;
      const j = src.indexOf('{', i);
      for (let k = j; k < src.length; k++) {
        if (src[k] === '{') d++;
        else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); }
      }
      return '';
    };
    // eslint-disable-next-line no-new-func
    const fn = new Function(`${pick('staleChildThresholdMs')}\n${pick('isRootRowBlock')}\n${pick('hasFreshRunningChild')}\nreturn hasFreshRunningChild;`)();
    const old = new Date(Date.now() - 3 * 3600e3).toISOString();
    const region = `\n  - id: a1\n    spawned_at: '${old}'\n    stopped_at: null\n  - id: subagent-1-2-x\n    cagents_type: cagents:planner\n    stopped_at: null\n`;
    expect(fn(region)).toBe(false); // was true before HS-6 ("running forever")
    const fresh = `\n  - id: a2\n    spawned_at: '${new Date().toISOString()}'\n    stopped_at: null\n`;
    expect(fn(fresh)).toBe(true); // a genuinely fresh child still counts
  });
});
