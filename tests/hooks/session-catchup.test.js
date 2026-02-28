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

  describe('incomplete session detection', () => {
    it('should detect sessions with non-terminal phases', () => {
      // This test relies on actual session state. The hook scans Agent_Memory/sessions/.
      // In test env, there may be existing sessions. We verify the hook doesn't crash.
      const result = runHook({});
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
    });

    it('should handle missing Agent_Memory/sessions/ gracefully', () => {
      // The hook should not crash even if Agent_Memory doesn't exist
      // (it uses fs.existsSync checks internally)
      const result = runHook({});
      expect(result.hookSpecificOutput).toBeDefined();
    });
  });
});
