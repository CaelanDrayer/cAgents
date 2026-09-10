/**
 * H3 / H4 integration test (v12.20.0): session-resolution under SDK-UUID payloads
 * when CAGENTS_ACTIVE_SESSION does NOT propagate to the hook subprocess.
 *
 * This test invokes the REAL registered hook path via .claude/hooks/run-hook.cjs
 * (spawned as a child process, exactly as Claude Code invokes it), pipes a JSON
 * payload whose `session_id` is an SDK transcript UUID, and supplies NO
 * CAGENTS_ACTIVE_SESSION / CAGENTS_SESSION_ID in the child env — reproducing the
 * env-propagation gap the audit flagged.
 *
 * Isolation: CLAUDE_PROJECT_DIR is pointed at a temp fixture dir so
 * findActiveSession / findMostRecentSessionDir resolve against a controlled
 * cagents-memory/ (NOT the live repo sessions, which are concurrently mutated by
 * the running team). The real hook files still load via run-hook.cjs's __dirname.
 *
 * Findings this test pins (both were genuine bugs, fixed in v12.20.0):
 *   H4 (over-deny): session-init-gate HARD-DENIED every Agent spawn because
 *      findActiveSession(UUID) returned null even when a valid active session
 *      existed on disk. Fix: fall back to findMostRecentSessionDir() — the same
 *      deterministic fallback subagent-tracker.cjs uses — before denying.
 *   H3 (silent fail-open): controller-delegation-validator returned {continue:true}
 *      (no-op) for a controller's src/ write because the session was unresolvable,
 *      so the active-controller probe never ran. Fix: same findMostRecentSessionDir()
 *      fallback so the governance deny still fires.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const RUN_HOOK = join(HOOKS_DIR, 'run-hook.cjs');

// Empirical production payload shape (8-4-4-4-12 hex SDK transcript UUID).
const UUID = '28d9d944-e2f5-4e03-b06b-d367625f1fdd';

let projectDir;

function sessionsDir() {
  return join(projectDir, 'cagents-memory', 'sessions');
}

function makeSession(sid, { controller = true, terminal = false } = {}) {
  const dir = join(sessionsDir(), sid);
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  const phase = terminal ? 'VALIDATED' : 'coordinating';
  const state = terminal ? 'VALIDATED' : 'COORDINATING';
  writeFileSync(join(dir, 'status.yaml'), `session_id: ${sid}\nphase: ${phase}\npipeline_state: ${state}\n`);
  const agentType = controller ? 'cagents:tech-lead' : 'cagents:backend-developer';
  writeFileSync(
    join(dir, 'workflow', 'agent_tree.yaml'),
    `agents:\n  - cagents_type: ${agentType}\n    agent_id: a1\n    stopped_at: null\n`
  );
  return dir;
}

// Spawn the REAL hook via run-hook.cjs. Child env intentionally OMITS
// CAGENTS_ACTIVE_SESSION and CAGENTS_SESSION_ID (the propagation gap), and points
// CLAUDE_PROJECT_DIR at the temp fixture. Returns the parsed stdout JSON.
function runHook(hookName, payload, extraEnv = {}) {
  const env = { ...process.env };
  delete env.CAGENTS_ACTIVE_SESSION;
  delete env.CAGENTS_SESSION_ID;
  env.CLAUDE_PROJECT_DIR = projectDir;
  Object.assign(env, extraEnv);

  const res = spawnSync('node', [RUN_HOOK, hookName], {
    input: JSON.stringify(payload),
    env,
    encoding: 'utf8',
    timeout: 8000,
  });
  expect(res.status, `hook exited non-zero. stderr: ${res.stderr}`).toBe(0);
  try {
    return JSON.parse(res.stdout);
  } catch (e) {
    throw new Error(`hook stdout not JSON: ${res.stdout}\nstderr: ${res.stderr}`);
  }
}

function decisionOf(parsed) {
  return parsed?.hookSpecificOutput?.permissionDecision;
}

describe('session-gate env-propagation fallback (H3/H4)', () => {
  beforeEach(() => {
    projectDir = join(tmpdir(), `cagents-h3h4-${Date.now().toString(36)}-${Math.floor(process.hrtime()[1] % 1e6)}`);
    mkdirSync(sessionsDir(), { recursive: true });
  });

  afterEach(() => {
    try { rmSync(projectDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  // ---- H4: session-init-gate must NOT over-deny ----

  it('H4 — session-init-gate ALLOWS the Agent spawn when an active session is discoverable (UUID payload, no env)', () => {
    makeSession('act_h4-active_001', { controller: true });

    const parsed = runHook('session-init-gate', {
      tool_name: 'Agent',
      tool_input: { subagent_type: 'cagents:backend-developer' },
      session_id: UUID,
    });

    // Corrected behavior: NOT a deny. (Pre-fix it returned permissionDecision:deny
    // "no active session directory found" for every spawn.)
    expect(decisionOf(parsed)).not.toBe('deny');
  });

  // RF-1 (v12.70.0): the two cases below used to assert `deny`. That deny is the
  // bug, not the contract. `cagents-memory/` is git-ignored, so "no session at
  // all" is the DEFAULT shape of every fresh clone and every first-time plugin
  // install — the gate was denying delegation outright on any machine that
  // wasn't a cAgents dev box. Terminal-only is just as legitimate: a SUCCESSFUL
  // /act writes pipeline_state: VALIDATED and could then not spawn a single
  // follow-up agent. The presence check is now ADVISORY: it self-heals the
  // scaffold, allows, and says loudly what it found. What these cases still
  // pin — and what genuinely matters — is that the gate does not go SILENT: it
  // must report the branch it took, with that branch's remediation.
  it('H4 — genuinely no active session: ALLOWS but reports the branch (advisory, not silent)', () => {
    // Empty sessions dir — no fallback target exists.
    const parsed = runHook('session-init-gate', {
      tool_name: 'Agent',
      tool_input: { subagent_type: 'cagents:backend-developer' },
      session_id: UUID,
    });
    expect(decisionOf(parsed)).not.toBe('deny');
    const surfaced = `${parsed.systemMessage || ''}\n${parsed.hookSpecificOutput?.permissionDecisionReason || ''}`;
    expect(surfaced).toMatch(/SESSION PRESENCE/);
    expect(surfaced).toMatch(/CAUSE:/);
  });

  it('H4 — terminal-only sessions do not RESOLVE, but no longer block the spawn', () => {
    makeSession('act_h4-terminal_001', { controller: true, terminal: true });
    const parsed = runHook('session-init-gate', {
      tool_name: 'Agent',
      tool_input: { subagent_type: 'cagents:backend-developer' },
      session_id: UUID,
    });
    expect(decisionOf(parsed)).not.toBe('deny');
    const surfaced = `${parsed.systemMessage || ''}\n${parsed.hookSpecificOutput?.permissionDecisionReason || ''}`;
    // Branch-specific: it must say TERMINAL, not the old generic "run a skill first".
    expect(surfaced).toMatch(/TERMINAL/);
  });

  it('H4 — RF-2: a non-cAgents subagent_type is never touched by this gate', () => {
    // Empty sessions dir. Explore/general-purpose/Plan are the HARNESS's own
    // delegation; gating them turned a cAgents-internal invariant into a global
    // "the parent must do everything itself" failure.
    const parsed = runHook('session-init-gate', {
      tool_name: 'Agent',
      tool_input: { subagent_type: 'Explore' },
      session_id: UUID,
    });
    expect(decisionOf(parsed)).not.toBe('deny');
    expect(parsed.systemMessage || '').not.toMatch(/SESSION PRESENCE/);
  });

  // ---- H3: controller-delegation-validator must NOT silently fail-open ----

  it('H3 — controller-delegation DENIES a controller src/ write when an active controller is present (UUID payload, no env)', () => {
    makeSession('act_h3-controller_001', { controller: true });

    const parsed = runHook(
      'controller-delegation-validator',
      { tool_name: 'Write', tool_input: { file_path: 'src/app/foo.ts' }, session_id: UUID },
      { CAGENTS_DELEGATION_ENFORCEMENT: 'block' }
    );

    // Corrected behavior: governance deny fires. (Pre-fix it returned
    // {continue:true} — silent fail-open — because the session was unresolvable.)
    expect(decisionOf(parsed)).toBe('deny');
  });

  it('H3 — controller-delegation does NOT over-deny when only an execution agent is active (no controller)', () => {
    makeSession('act_h3-exec_001', { controller: false });

    const parsed = runHook(
      'controller-delegation-validator',
      { tool_name: 'Write', tool_input: { file_path: 'src/app/foo.ts' }, session_id: UUID },
      { CAGENTS_DELEGATION_ENFORCEMENT: 'block' }
    );

    // No active controller -> no-op (the write is an execution-agent or user edit).
    expect(decisionOf(parsed)).not.toBe('deny');
  });
});
