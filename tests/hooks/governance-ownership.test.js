/**
 * Governance gates are owner-only (act_concurrent-session-hooks_260927_001, WI-5).
 *
 * Two transcripts share one project dir. Session A is owned by UUID_A and has an
 * active controller writer in agent_tree.yaml. Transcript B must never be denied,
 * allowed, or noticed on the basis of A's session:
 *   - controller-delegation-validator: B's src/ write is not denied.
 *   - session-init-gate: B's spawn output never names A's session id.
 * Positive control: A's own src/ write is still denied.
 *
 * The real hooks run through run-hook.cjs in a child process, with
 * CLAUDE_PROJECT_DIR pointed at a temp dir and no session env vars.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const RUN_HOOK = join(HOOKS_DIR, 'run-hook.cjs');

const UUID_A = 'aaaaaaaa-1111-2222-3333-444444444444';
const UUID_B = 'bbbbbbbb-1111-2222-3333-444444444444';
const SID_A = 'act_owned-by-a_260927_001';

let projectDir;

function makeOwnedSession(sid, owner) {
  const dir = join(projectDir, 'cagents-memory', 'sessions', sid);
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeFileSync(join(dir, 'status.yaml'), `session_id: ${sid}\nphase: coordinating\npipeline_state: COORDINATED\n`);
  writeFileSync(
    join(dir, 'workflow', 'agent_tree.yaml'),
    'agents:\n  - cagents_type: cagents:tech-lead\n    agent_id: a1\n    stopped_at: null\n'
  );
  writeFileSync(join(dir, 'session.sdk_id'), owner);
  const mapDir = join(projectDir, 'cagents-memory', '_system', 'sdk_session_map');
  mkdirSync(mapDir, { recursive: true });
  writeFileSync(join(mapDir, owner), sid);
  return dir;
}

function runHook(hookName, payload) {
  const env = { ...process.env };
  delete env.CAGENTS_ACTIVE_SESSION;
  delete env.CAGENTS_SESSION_ID;
  env.CLAUDE_PROJECT_DIR = projectDir;
  env.CAGENTS_DELEGATION_ENFORCEMENT = 'block';
  const res = spawnSync('node', [RUN_HOOK, hookName], {
    input: JSON.stringify(payload),
    env,
    encoding: 'utf8',
    timeout: 60000,
  });
  expect(res.status, `hook exited non-zero. stderr: ${res.stderr}`).toBe(0);
  return { stdout: res.stdout, parsed: JSON.parse(res.stdout) };
}

const writePayload = (uuid) => ({
  tool_name: 'Write',
  tool_input: { file_path: join(projectDir, 'src', 'x.js'), content: 'x' },
  session_id: uuid,
});

describe('governance gates are owner-only (WI-5)', () => {
  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'cagents-gov-own-'));
    makeOwnedSession(SID_A, UUID_A);
  });

  afterEach(() => {
    try { rmSync(projectDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it("controller-delegation-validator: UUID_B's src/ write is not denied by A's active controller", () => {
    const { parsed } = runHook('controller-delegation-validator', writePayload(UUID_B));
    expect(parsed?.hookSpecificOutput?.permissionDecision).not.toBe('deny');
  });

  it("positive control: UUID_A's own src/ write is still denied", () => {
    const { parsed } = runHook('controller-delegation-validator', writePayload(UUID_A));
    expect(parsed?.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it("session-init-gate: UUID_B's spawn output never names A's session", () => {
    const { stdout, parsed } = runHook('session-init-gate', {
      tool_name: 'Agent',
      tool_input: { subagent_type: 'cagents:backend-developer' },
      session_id: UUID_B,
    });
    expect(parsed?.hookSpecificOutput?.permissionDecision).not.toBe('deny');
    expect(stdout).not.toContain(SID_A);
    expect(stdout).not.toMatch(/FALLBACK HEURISTIC/);
  });
});
