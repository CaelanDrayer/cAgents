import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'tool-failure-tracker.cjs');
const TEST_SESSION_DIR = join(process.cwd(), 'Agent_Memory', 'sessions', 'run_20260101_000000_test_tft');

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('tool-failure-tracker.cjs', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return continue:true for empty input', () => {
    const result = runHook({});
    expect(result.continue).toBe(true);
  });

  it('should return continue:true for missing tool_name', () => {
    const result = runHook({ error: 'some error' });
    expect(result.continue).toBe(true);
  });

  it('should handle tool_name with no session', () => {
    // If no active session found, should still return continue
    const result = runHook({ tool_name: 'Bash', error: 'command not found', session_id: 'nonexistent_session' });
    expect(result.continue).toBe(true);
  });

  describe('TOOL_ALTERNATIVES', () => {
    it('should define alternatives for common tools', () => {
      // Verify the hook file contains expected tool alternatives
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain("'Bash'");
      expect(hookContent).toContain("'Write'");
      expect(hookContent).toContain("'Edit'");
      expect(hookContent).toContain("'Task'");
      expect(hookContent).toContain("'WebFetch'");
      expect(hookContent).toContain("'Glob'");
      expect(hookContent).toContain("'Grep'");
    });
  });

  describe('pattern detection threshold', () => {
    it('should use threshold of 3 failures (2 previous + current)', () => {
      // Verify the threshold logic is in the code
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('recentCount >= 2');
    });

    it('should use 10 minute window for pattern detection', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('10 * 60 * 1000');
    });
  });

  describe('error sanitization', () => {
    it('should sanitize double quotes in error messages', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('.replace(/"/g');
    });

    it('should truncate long error messages', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('.slice(0, 200)');
    });
  });
});
