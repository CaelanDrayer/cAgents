import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'notification.cjs');

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('notification.cjs', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return continue:true (non-blocking)', () => {
    const result = runHook({ type: 'info', message: 'test notification' });
    expect(result.continue).toBe(true);
  });

  it('should handle empty input', () => {
    const result = runHook({});
    expect(result.continue).toBe(true);
  });

  it('should handle notification_type field', () => {
    const result = runHook({ notification_type: 'warning', message: 'test' });
    expect(result.continue).toBe(true);
  });

  it('should handle content field as message fallback', () => {
    const result = runHook({ content: 'test content' });
    expect(result.continue).toBe(true);
  });

  describe('log rotation', () => {
    it('should have 1MB rotation threshold', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('1024 * 1024');
    });

    it('should use daily log files', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('notifications_');
    });
  });
});
