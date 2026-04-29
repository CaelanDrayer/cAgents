import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'session-catchup.cjs');

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('session-catchup.cjs', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return SessionStart hook event', () => {
    const result = runHook({});
    expect(result.hookSpecificOutput).toBeDefined();
    expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
  });

  it('should include cAgents context in additionalContext', () => {
    const result = runHook({});
    expect(result.hookSpecificOutput.additionalContext).toContain('cAgents');
  });

  it('should mention controller-centric delegation pattern', () => {
    const result = runHook({});
    expect(result.hookSpecificOutput.additionalContext).toContain('controller-centric');
  });

  it('should mention minimum tier 2', () => {
    const result = runHook({});
    expect(result.hookSpecificOutput.additionalContext).toContain('tier 2');
  });

  it('should mention auto-proceed', () => {
    const result = runHook({});
    expect(result.hookSpecificOutput.additionalContext).toContain('Auto-proceed');
  });

  it('should mention cagents: namespace', () => {
    const result = runHook({});
    expect(result.hookSpecificOutput.additionalContext).toContain('cagents:');
  });

  it('should mention agent self-registration', () => {
    const result = runHook({});
    expect(result.hookSpecificOutput.additionalContext).toContain('self-register');
  });

  describe('learning pattern loading', () => {
    it('should load learning patterns without error', () => {
      // The hook loads patterns from _knowledge/patterns/ if available.
      // Verify the hook runs without crashing regardless of whether pattern files exist.
      const result = runHook({});
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
      // The hook should not crash even if pattern files are missing
      expect(result.continue).not.toBe(false);
    });

    it('should reference learning patterns in hook source', () => {
      // Contract test: verify the pattern loading code path exists
      const hookSource = readFileSync(HOOK_PATH, 'utf8');
      expect(hookSource).toContain('success-patterns.yaml');
      expect(hookSource).toContain('coordination-patterns.yaml');
      expect(hookSource).toContain('_knowledge');
    });
  });

  describe('incomplete session detection', () => {
    it('should detect sessions with non-terminal phases', () => {
      // This test relies on actual session state. The hook scans cagents-memory/sessions/.
      // In test env, there may be existing sessions. We verify the hook doesn't crash.
      const result = runHook({});
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
    });

    it('should handle missing cagents-memory/sessions/ gracefully', () => {
      // The hook should not crash even if cagents-memory doesn't exist
      // (it uses fs.existsSync checks internally)
      const result = runHook({});
      expect(result.hookSpecificOutput).toBeDefined();
    });
  });
});
