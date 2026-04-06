import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'session-init-gate.cjs');

function runHook(input, env = {}) {
  const inputStr = JSON.stringify(input).replace(/'/g, "'\\''");
  const result = execSync(
    `printf '%s' '${inputStr}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ...env } }
  );
  return JSON.parse(result.trim());
}

describe('session-init-gate.cjs', () => {
  let tmpDir;

  beforeEach(() => {
    // Isolated project root with no Agent_Memory — findActiveSession returns null
    tmpDir = join(tmpdir(), 'cagents-test-sig-' + Date.now());
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should allow non-Agent tool calls', () => {
    const result = runHook(
      { tool_name: 'Write', tool_input: {} },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );
    expect(result.continue).toBe(true);
  });

  it('should deny Agent spawn when no active session exists', () => {
    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' } },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );
    expect(result.hookSpecificOutput).toBeDefined();
    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('deny message includes expected session directory path with status.yaml', () => {
    const result = runHook(
      { tool_name: 'Agent', tool_input: {} },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );
    const reason = result.hookSpecificOutput?.permissionDecisionReason || '';
    expect(reason).toContain('sessions');
    expect(reason).toContain('status.yaml');
  });

  it('should allow Agent spawn when active session with status.yaml exists', () => {
    const sessionId = 'run_test-gate_260320_999';
    const sessionDir = join(tmpDir, 'Agent_Memory', 'sessions', sessionId);
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(
      join(sessionDir, 'status.yaml'),
      'phase: executing\ncreated_at: "2026-03-20T10:00:00Z"\n'
    );

    const result = runHook(
      { tool_name: 'Agent', tool_input: {}, session_id: sessionId },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );
    expect(result.continue).toBe(true);
  });

  it('should bypass gate when CAGENTS_SESSION_ID env var is set', () => {
    // No session dir exists — but CAGENTS_SESSION_ID signals skill is creating it now
    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' } },
      { CLAUDE_PROJECT_DIR: tmpDir, CAGENTS_SESSION_ID: 'run_test_260320_001' }
    );
    expect(result.continue).toBe(true);
  });

  it('should allow Agent spawn when CAGENTS_SESSION_ID is set and session dir already exists with valid status.yaml', () => {
    // Dir exists with valid status — standard findActiveSession check finds it, so spawn is allowed
    const sessionId = 'run_test-gate-env_260322_001';
    const sessionDir = join(tmpDir, 'Agent_Memory', 'sessions', sessionId);
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(
      join(sessionDir, 'status.yaml'),
      'phase: executing\ncreated_at: "2026-03-22T10:00:00Z"\n'
    );

    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' }, session_id: sessionId },
      { CLAUDE_PROJECT_DIR: tmpDir, CAGENTS_SESSION_ID: sessionId }
    );
    expect(result.continue).toBe(true);
  });

  it('should deny Agent spawn when CAGENTS_SESSION_ID is set and session dir exists but findActiveSession finds no active session', () => {
    // Dir exists but findActiveSession cannot find any non-terminal session —
    // no session_id hint is passed in the tool input, and the dir has no status.yaml
    // or any other recognisable session file, so the gate denies the spawn.
    const sessionId = 'run_test-gate-env-deny_260322_002';
    const sessionDir = join(tmpDir, 'Agent_Memory', 'sessions', sessionId);
    mkdirSync(sessionDir, { recursive: true });
    // No status.yaml, instruction.yaml, or agent_tree.yaml — only the bare directory

    // Note: no session_id in the hook input — without a hint, findActiveSession falls
    // through all three passes and returns null for an empty dir outside the grace window.
    // We set mtime to the past to ensure the session is outside the grace period.
    const pastTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
    const { utimesSync } = require('fs');
    utimesSync(sessionDir, pastTime, pastTime);

    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' } },
      { CLAUDE_PROJECT_DIR: tmpDir, CAGENTS_SESSION_ID: sessionId }
    );
    expect(result.hookSpecificOutput).toBeDefined();
    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
  });
});
