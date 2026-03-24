import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'approval-gate.cjs');

// Safe runner that passes JSON via stdin without shell quoting issues.
// Accepts optional env overrides for AGENT_MEMORY_DIR.
function runHookSafe(input, envOverrides = {}) {
  const result = execSync(`node "${HOOK_PATH}"`, {
    encoding: 'utf8',
    timeout: 5000,
    input: JSON.stringify(input),
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...envOverrides },
  });
  return JSON.parse(result.trim());
}

/**
 * Build the temp directory structure:
 *
 *   <tmpDir>/
 *     sessions/         <- AGENT_MEMORY_DIR points here
 *     _data/
 *       policies/       <- policy YAML files go here
 */
function createTempPoliciesDir() {
  const tmpBase = mkdtempSync(join(tmpdir(), 'approval-gate-test-'));
  const sessionsDir = join(tmpBase, 'sessions');
  const policiesDir = join(tmpBase, '_data', 'policies');
  mkdirSync(sessionsDir, { recursive: true });
  mkdirSync(policiesDir, { recursive: true });
  return { tmpBase, sessionsDir, policiesDir };
}

// Track temp dirs created per test for cleanup
const tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
});

describe('approval-gate.cjs', () => {
  it('hook file exists', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  describe('passthrough behavior', () => {
    it('passes through when AGENT_MEMORY_DIR is not set', () => {
      const result = runHookSafe(
        { tool_name: 'Bash', tool_input: { command: 'ls' } },
        { AGENT_MEMORY_DIR: '' }
      );
      expect(result.continue).toBe(true);
    });

    it('passes through when AGENT_MEMORY_DIR points to a nonexistent path', () => {
      const result = runHookSafe(
        { tool_name: 'Bash', tool_input: { command: 'ls' } },
        { AGENT_MEMORY_DIR: '/nonexistent/path/that/does/not/exist/sessions' }
      );
      expect(result.continue).toBe(true);
    });

    it('passes through for tools that are not Bash, Write, or Edit', () => {
      const { tmpBase, sessionsDir, policiesDir } = createTempPoliciesDir();
      tempDirs.push(tmpBase);

      writeFileSync(join(policiesDir, 'deny-all.yaml'), [
        'name: deny-all',
        'status: active',
        'rules:',
        '  - actionType: execute_goal',
        '    requires: deny',
      ].join('\n'));

      // A tool like 'Read' should never be gated
      const result = runHookSafe(
        { tool_name: 'Read', tool_input: { file_path: '/tmp/foo.txt' } },
        { AGENT_MEMORY_DIR: sessionsDir }
      );
      expect(result.continue).toBe(true);
    });
  });

  describe('deny behavior', () => {
    it('denies Bash when an active execute_goal deny policy exists', () => {
      const { tmpBase, sessionsDir, policiesDir } = createTempPoliciesDir();
      tempDirs.push(tmpBase);

      writeFileSync(join(policiesDir, 'test-policy.yaml'), [
        'name: test-policy',
        'status: active',
        'rules:',
        '  - actionType: execute_goal',
        '    requires: deny',
      ].join('\n'));

      const result = runHookSafe(
        { tool_name: 'Bash', tool_input: { command: 'ls' } },
        { AGENT_MEMORY_DIR: sessionsDir }
      );
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('denies Write when an active file_write deny policy exists', () => {
      const { tmpBase, sessionsDir, policiesDir } = createTempPoliciesDir();
      tempDirs.push(tmpBase);

      writeFileSync(join(policiesDir, 'write-policy.yaml'), [
        'name: write-policy',
        'status: active',
        'rules:',
        '  - actionType: file_write',
        '    requires: deny',
      ].join('\n'));

      const result = runHookSafe(
        { tool_name: 'Write', tool_input: { file_path: '/tmp/test.txt', content: 'hello' } },
        { AGENT_MEMORY_DIR: sessionsDir }
      );
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('denies Edit when an active file_write deny policy exists', () => {
      const { tmpBase, sessionsDir, policiesDir } = createTempPoliciesDir();
      tempDirs.push(tmpBase);

      writeFileSync(join(policiesDir, 'edit-policy.yaml'), [
        'name: edit-policy',
        'status: active',
        'rules:',
        '  - actionType: file_write',
        '    requires: deny',
      ].join('\n'));

      const result = runHookSafe(
        { tool_name: 'Edit', tool_input: { file_path: '/tmp/test.txt', old_string: 'a', new_string: 'b' } },
        { AGENT_MEMORY_DIR: sessionsDir }
      );
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('allow behavior when policy does not match', () => {
    it('allows Bash when policy only denies file_write', () => {
      const { tmpBase, sessionsDir, policiesDir } = createTempPoliciesDir();
      tempDirs.push(tmpBase);

      // Policy targets file_write, not execute_goal
      writeFileSync(join(policiesDir, 'file-write-only.yaml'), [
        'name: file-write-only',
        'status: active',
        'rules:',
        '  - actionType: file_write',
        '    requires: deny',
      ].join('\n'));

      const result = runHookSafe(
        { tool_name: 'Bash', tool_input: { command: 'ls' } },
        { AGENT_MEMORY_DIR: sessionsDir }
      );
      expect(result.continue).toBe(true);
    });

    it('allows Write when policy only denies execute_goal', () => {
      const { tmpBase, sessionsDir, policiesDir } = createTempPoliciesDir();
      tempDirs.push(tmpBase);

      writeFileSync(join(policiesDir, 'exec-only.yaml'), [
        'name: exec-only',
        'status: active',
        'rules:',
        '  - actionType: execute_goal',
        '    requires: deny',
      ].join('\n'));

      const result = runHookSafe(
        { tool_name: 'Write', tool_input: { file_path: '/tmp/ok.txt', content: 'data' } },
        { AGENT_MEMORY_DIR: sessionsDir }
      );
      expect(result.continue).toBe(true);
    });

    it('allows Bash when policy status is inactive', () => {
      const { tmpBase, sessionsDir, policiesDir } = createTempPoliciesDir();
      tempDirs.push(tmpBase);

      writeFileSync(join(policiesDir, 'inactive-policy.yaml'), [
        'name: inactive-policy',
        'status: inactive',
        'rules:',
        '  - actionType: execute_goal',
        '    requires: deny',
      ].join('\n'));

      const result = runHookSafe(
        { tool_name: 'Bash', tool_input: { command: 'ls' } },
        { AGENT_MEMORY_DIR: sessionsDir }
      );
      expect(result.continue).toBe(true);
    });

    it('allows Bash when policies directory is empty', () => {
      const { tmpBase, sessionsDir } = createTempPoliciesDir();
      tempDirs.push(tmpBase);

      // No policy files written — directory exists but is empty
      const result = runHookSafe(
        { tool_name: 'Bash', tool_input: { command: 'ls' } },
        { AGENT_MEMORY_DIR: sessionsDir }
      );
      expect(result.continue).toBe(true);
    });
  });
});
