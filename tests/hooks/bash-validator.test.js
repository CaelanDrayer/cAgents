import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'bash-validator.cjs');

function runHook(input) {
  const result = execSync(
    `echo '${JSON.stringify(input).replace(/'/g, "\\'")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('bash-validator.cjs', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  describe('blocked commands', () => {
    it('should block rm -rf /', () => {
      const result = runHook({ tool_input: { command: 'rm -rf /' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block rm -rf ~', () => {
      const result = runHook({ tool_input: { command: 'rm -rf ~' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block fork bombs', () => {
      const result = runHook({ tool_input: { command: ':(){ :|:& };:' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block dd if=/dev/zero', () => {
      const result = runHook({ tool_input: { command: 'dd if=/dev/zero of=/dev/sda' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block mkfs', () => {
      const result = runHook({ tool_input: { command: 'mkfs.ext4 /dev/sda1' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block sudo commands', () => {
      const result = runHook({ tool_input: { command: 'sudo rm -rf /tmp' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block > /dev/sda', () => {
      const result = runHook({ tool_input: { command: 'echo test > /dev/sda' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('warning commands', () => {
    it('should warn about git push --force', () => {
      const result = runHook({ tool_input: { command: 'git push --force origin main' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('ask');
    });

    it('should warn about git reset --hard', () => {
      const result = runHook({ tool_input: { command: 'git reset --hard HEAD~1' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('ask');
    });

    it('should warn about git clean -fd', () => {
      const result = runHook({ tool_input: { command: 'git clean -fd' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('ask');
    });
  });

  describe('safe commands', () => {
    it('should allow ls', () => {
      const result = runHook({ tool_input: { command: 'ls -la' } });
      expect(result.continue).toBe(true);
    });

    it('should allow git status', () => {
      const result = runHook({ tool_input: { command: 'git status' } });
      expect(result.continue).toBe(true);
    });

    it('should allow npm install', () => {
      const result = runHook({ tool_input: { command: 'npm install' } });
      expect(result.continue).toBe(true);
    });

    it('should handle empty command', () => {
      const result = runHook({ tool_input: { command: '' } });
      expect(result.continue).toBe(true);
    });

    it('should allow rm -r on specific paths like /tmp/foo', () => {
      const result = runHook({ tool_input: { command: 'rm -r /tmp/gstack' } });
      expect(result.continue).toBe(true);
    });

    it('should allow rm -rf on specific subdirectory paths', () => {
      const result = runHook({ tool_input: { command: 'rm -rf /tmp/build-cache' } });
      expect(result.continue).toBe(true);
    });
  });
});
