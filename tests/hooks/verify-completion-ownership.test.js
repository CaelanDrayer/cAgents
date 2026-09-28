/**
 * WI-3 (act_concurrent-session-hooks_260927_001): the Stop hook acts only on a
 * session owned by the payload transcript UUID.
 *
 * Session A is owned by UUID-A (session.sdk_id marker + sdk_session_map
 * pointer). It is mid-COORDINATED, abandoned (stale heartbeat, no running
 * child, validator never spawned), so the hook blocks it when UUID-A stops.
 * A Stop from UUID-B, or from a UUID that owns nothing, must not block and
 * must not write completion_summary.yaml or workflow/events.jsonl into A.
 * Before WI-3 the hook fell back to the newest session in the dir and did both.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const HOOK = join(process.cwd(), '.claude', 'hooks', 'verify-completion.cjs');

const UUID_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const UUID_B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const UUID_NONE = 'cccccccc-3333-4333-8333-cccccccccccc';
const SID_A = 'act_owned-by-a_260927_001';
const SID_B = 'act_owned-by-b_260927_001';

const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();

let projectDir;
let sessionDir;

function seedSessionA() {
  const sessionsDir = join(projectDir, 'cagents-memory', 'sessions');
  sessionDir = join(sessionsDir, SID_A);
  mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
  const tx = iso(2 * 60 * 1000);
  writeFileSync(join(sessionDir, 'status.yaml'), [
    `session_id: ${SID_A}`,
    'pipeline_state: COORDINATED',
    'phase: coordinating',
    `last_updated_at: "${tx}"`,
    `started_at: "${tx}"`,
    'state_history:',
    '  - state: COORDINATED',
    `    entered_at: "${tx}"`,
    '    duration_ms: null',
    '',
  ].join('\n'));
  writeFileSync(join(sessionDir, 'workflow', 'agent_tree.yaml'), [
    'root:',
    '  agent_id: root-a',
    '  agent_type: cagents:act',
    '  depth: 0',
    `  spawned_at: "${tx}"`,
    '  stopped_at: null',
    'agents:',
    '  - agent_id: agent-tl-1',
    '    agent_type: cagents:tech-lead',
    '    depth: 1',
    `    spawned_at: "${tx}"`,
    `    stopped_at: "${tx}"`,
    '',
  ].join('\n'));
  // Ownership: marker in the session dir and the map pointer.
  writeFileSync(join(sessionDir, 'session.sdk_id'), UUID_A);
  const mapDir = join(projectDir, 'cagents-memory', '_system', 'sdk_session_map');
  mkdirSync(mapDir, { recursive: true });
  writeFileSync(join(mapDir, UUID_A), SID_A);
}

// Session B is owned by UUID-B. It is completed, so a Stop from UUID-B has
// nothing to block on in its own session.
function seedSessionB() {
  const dirB = join(projectDir, 'cagents-memory', 'sessions', SID_B);
  mkdirSync(join(dirB, 'workflow'), { recursive: true });
  const tx = iso(2 * 60 * 1000);
  writeFileSync(join(dirB, 'status.yaml'), [
    `session_id: ${SID_B}`,
    'pipeline_state: VALIDATED',
    'phase: completed',
    'result: PASS',
    `completed_at: "${tx}"`,
    `last_updated_at: "${tx}"`,
    '',
  ].join('\n'));
  writeFileSync(join(dirB, 'session.sdk_id'), UUID_B);
  const mapDir = join(projectDir, 'cagents-memory', '_system', 'sdk_session_map');
  mkdirSync(mapDir, { recursive: true });
  writeFileSync(join(mapDir, UUID_B), SID_B);
}

function snapshot(dir) {
  const out = {};
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out[p] = { mtimeMs: statSync(p).mtimeMs, bytes: readFileSync(p, 'utf8') };
    }
  };
  walk(dir);
  return out;
}

function runStop(sessionId) {
  const result = spawnSync('node', [HOOK], {
    input: JSON.stringify({ session_id: sessionId, stop_hook_active: false, hook_event_name: 'Stop' }),
    encoding: 'utf8',
    timeout: 60000,
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: projectDir,
      CAGENTS_ACTIVE_SESSION: '',
      CAGENTS_SESSION_LIVENESS_MS: '60000',
    },
  });
  if (result.status !== 0) {
    throw new Error(`hook exit ${result.status}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
  return JSON.parse(result.stdout || '{}');
}

describe('verify-completion Stop hook: owner-only session resolution (WI-3)', () => {
  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'vc-ownership-'));
    seedSessionA();
    seedSessionB();
  });
  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  for (const [label, uuid] of [['UUID-B (owns another session)', UUID_B], ['a UUID that owns nothing', UUID_NONE]]) {
    it(`Stop from ${label} does not block and leaves session A byte-identical`, () => {
      const before = snapshot(sessionDir);
      const pointerA = join(projectDir, 'cagents-memory', '_system', 'sdk_session_map', UUID_A);
      const pointerBefore = readFileSync(pointerA, 'utf8');
      const result = runStop(uuid);
      expect(result.decision).not.toBe('block');
      expect(snapshot(sessionDir)).toEqual(before);
      expect(existsSync(join(sessionDir, 'completion_summary.yaml'))).toBe(false);
      expect(existsSync(join(sessionDir, 'workflow', 'events.jsonl'))).toBe(false);
      expect(readFileSync(pointerA, 'utf8')).toBe(pointerBefore);
    });
  }

  it('positive control: Stop from UUID-A still blocks session A', () => {
    const result = runStop(UUID_A);
    expect(result.decision).toBe('block');
  });
});
