/**
 * WI-17 (team_hook-session-fixes_261015_001): a depth-0 ROOT row is not a
 * running child.
 *
 * /act ACTION 1 seeds the canonical tree with the root as the FIRST entry of the
 * `agents:` list (`- id: "pipeline"`, `depth: 0`, fresh `spawned_at`,
 * `stopped_at: null`; .claude/skills/act/reference/agent-tracking.md). The
 * running-child scan in verify-completion.cjs (hasFreshRunningChild) used to
 * treat that row as a fresh running child for CAGENTS_STALE_CHILD_MS (30 min).
 * That defeated the REC-04 0-child gate in sessionActivelyWorking(): a session
 * that never spawned anything still read as "actively working" for 30 min, so
 * its INIT stall was downgraded to a warning. The scan's own contract already
 * excludes the legacy `root:` block for the same reason; this extends it to the
 * in-list root row.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { cleanup, hookEnv, SESSIONS_DIR } from './fixtures/safety-net/materialize.mjs';

const HOOK = join(process.cwd(), '.claude', 'hooks', 'verify-completion.cjs');
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();

function pickFn() {
  const src = readFileSync(HOOK, 'utf8');
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
  return new Function(`${pick('staleChildThresholdMs')}\n${pick('isRootRowBlock')}\n${pick('hasFreshRunningChild')}\nreturn hasFreshRunningChild;`)();
}

const rootRow = (spawned) =>
  `\n  - id: "pipeline"\n    type: "cagents:act"\n    parent: "root"\n    depth: 0\n    spawned_at: "${spawned}"\n    stopped_at: null\n`;
const childRow = (id, spawned) =>
  `  - id: ${id}\n    type: cagents:orchestrator\n    parent: pipeline\n    depth: 1\n    spawned_at: '${spawned}'\n    stopped_at: null\n`;

describe('hasFreshRunningChild: depth-0 root row is excluded', () => {
  it('a fresh in-list root row alone is not a running child', () => {
    expect(pickFn()(rootRow(iso(0)))).toBe(false);
  });
  it('a fresh depth-1 child next to the root row still counts', () => {
    expect(pickFn()(rootRow(iso(0)) + childRow('orch-1', iso(5e3)))).toBe(true);
  });
});

describe('Stop on an INIT 0-child session with a canonical in-list root row', () => {
  const dirs = [];
  afterEach(() => cleanup(dirs));

  function makeSession(withChild) {
    const sid = `act_root-row-live-${withChild ? 'c' : 'z'}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const dir = join(SESSIONS_DIR, sid);
    dirs.push(dir);
    mkdirSync(join(dir, 'workflow'), { recursive: true });
    const now = iso(0);
    writeFileSync(join(dir, 'status.yaml'), [
      `session_id: ${sid}`, 'pipeline_state: INIT', 'phase: init',
      `created_at: "${now}"`, `last_updated_at: "${now}"`, `started_at: "${now}"`,
      'state_history:', '  - state: INIT', `    entered_at: "${now}"`, '    duration_ms: null', '',
    ].join('\n'));
    writeFileSync(join(dir, 'workflow', 'agent_tree.yaml'),
      'agents:' + rootRow(now) + (withChild ? childRow('orch-1', iso(5e3)) : ''));
    return sid;
  }

  function runHook(sid) {
    const r = spawnSync('node', [HOOK], {
      input: JSON.stringify({ session_id: sid, stop_hook_active: false, hook_event_name: 'Stop' }),
      encoding: 'utf8',
      timeout: 60000,
      env: { ...process.env, ...hookEnv(), CAGENTS_ACTIVE_SESSION: '', CAGENTS_SESSION_LIVENESS_MS: '60000' },
    });
    if (r.status !== 0) throw new Error(`hook exit ${r.status}\n${r.stdout}\n${r.stderr}`);
    return JSON.parse(r.stdout);
  }

  it('blocks: the fresh root row must not rescue a session that spawned nothing', () => {
    expect(runHook(makeSession(false)).decision).toBe('block');
  });

  it('control: a fresh depth-1 child still keeps the session live (no block)', () => {
    const res = runHook(makeSession(true));
    expect(res.decision).not.toBe('block');
  });
});
