import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'permission-handler.cjs');

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('permission-handler.cjs', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  describe('always-safe tools', () => {
    it('should auto-approve Read', () => {
      const result = runHook({ tool_name: 'Read', tool_input: {} });
      expect(result.hookSpecificOutput.hookEventName).toBe('PermissionRequest');
      expect(result.hookSpecificOutput.decision.behavior).toBe('allow');
    });

    it('should auto-approve Grep', () => {
      const result = runHook({ tool_name: 'Grep', tool_input: {} });
      expect(result.hookSpecificOutput.decision.behavior).toBe('allow');
    });

    it('should auto-approve Glob', () => {
      const result = runHook({ tool_name: 'Glob', tool_input: {} });
      expect(result.hookSpecificOutput.decision.behavior).toBe('allow');
    });

    it('should auto-approve TaskList', () => {
      const result = runHook({ tool_name: 'TaskList', tool_input: {} });
      expect(result.hookSpecificOutput.decision.behavior).toBe('allow');
    });

    it('should auto-approve TaskGet', () => {
      const result = runHook({ tool_name: 'TaskGet', tool_input: {} });
      expect(result.hookSpecificOutput.decision.behavior).toBe('allow');
    });
  });

  describe('Agent_Memory writes', () => {
    it('should auto-approve Write to Agent_Memory', () => {
      const amPath = join(process.cwd(), 'Agent_Memory', 'sessions', 'test.yaml');
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: amPath } });
      expect(result.hookSpecificOutput.decision.behavior).toBe('allow');
    });

    it('should auto-approve Edit to Agent_Memory', () => {
      const amPath = join(process.cwd(), 'Agent_Memory', 'sessions', 'test.yaml');
      const result = runHook({ tool_name: 'Edit', tool_input: { file_path: amPath } });
      expect(result.hookSpecificOutput.decision.behavior).toBe('allow');
    });
  });

  describe('non-safe operations', () => {
    it('should pass through Bash tool (not auto-approve)', () => {
      const result = runHook({ tool_name: 'Bash', tool_input: { command: 'ls' } });
      expect(result.continue).toBe(true);
    });

    it('should pass through Write to non-Agent_Memory paths', () => {
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: '/tmp/test.txt' } });
      expect(result.continue).toBe(true);
    });
  });

  describe('HITL detection', () => {
    it('should have HITL gate detection code', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('hitl_gate');
      expect(hookContent).toContain('human_approval');
      expect(hookContent).toContain("tier === '4'");
    });
  });
});
