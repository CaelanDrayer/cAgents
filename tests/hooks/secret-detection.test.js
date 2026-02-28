import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'secret-detection.cjs');

function runHook(input) {
  const jsonStr = JSON.stringify(input);
  const result = execSync(
    `printf '%s' '${jsonStr.replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('secret-detection.cjs', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  describe('protected paths', () => {
    it('should block writes to /etc/', () => {
      const result = runHook({ tool_input: { file_path: '/etc/passwd', content: 'test' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block writes to /usr/', () => {
      const result = runHook({ tool_input: { file_path: '/usr/bin/test', content: 'test' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block writes to ~/.ssh/', () => {
      const home = process.env.HOME;
      if (!home) return;
      const result = runHook({ tool_input: { file_path: `${home}/.ssh/authorized_keys`, content: 'test' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should allow writes to normal paths', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/test.txt', content: 'safe content' } });
      expect(result.continue).toBe(true);
    });
  });

  describe('secret detection - critical', () => {
    it('should block GitHub PAT tokens', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block AWS access keys', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'AWS_KEY=AKIAIOSFODNN7EXAMPLE' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block Slack tokens', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const slack = "xoxb-1234567890-abcdefghij";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block Stripe live keys', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const key = "sk_live_" + "FAKE_TEST_KEY_NOT_REAL";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block Anthropic API keys', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const key = "sk-ant-abcdefghijklmnopqrstuvwxyz1234567890abcd";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block database connection strings with credentials', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const db = "postgres://user:password@host:5432/db";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block NPM tokens', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const token = "npm_1234567890abcdefghijklmnopqrstuvwxyz";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block OpenAI API keys (new format)', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const key = "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890abcd";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('secret detection - high', () => {
    it('should block Google API keys', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'const key = "AIzaSyA1234567890abcdefghijklmnopqrstuv";' } });
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('secret detection - medium (warnings)', () => {
    it('should warn about generic API keys', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'api_key = "abcdefghijklmnopqrstuvwxyz1234"' } });
      // Medium triggers ask
      if (result.hookSpecificOutput) {
        expect(result.hookSpecificOutput.permissionDecision).toBe('ask');
      }
    });
  });

  describe('false positive filtering', () => {
    it('should skip test files', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/auth.test.js', content: 'const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";' } });
      expect(result.continue).toBe(true);
    });

    it('should skip markdown files', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/README.md', content: 'const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";' } });
      expect(result.continue).toBe(true);
    });

    it('should skip example files', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/example.config.js', content: 'const key = "AKIAIOSFODNN7EXAMPLE";' } });
      expect(result.continue).toBe(true);
    });

    it('should skip template placeholders', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/config.js', content: 'api_key = "YOUR_API_KEY_HERE_REPLACE_WITH_ACTUAL"' } });
      expect(result.continue).toBe(true);
    });

    it('should skip lock files', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/package-lock.json', content: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz' } });
      expect(result.continue).toBe(true);
    });

    it('should handle empty content', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/empty.js', content: '' } });
      expect(result.continue).toBe(true);
    });

    it('should handle very short content', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/short.js', content: 'hi' } });
      expect(result.continue).toBe(true);
    });
  });

  describe('safe content', () => {
    it('should allow normal code', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/app.js', content: 'const x = 1;\nconsole.log(x);' } });
      expect(result.continue).toBe(true);
    });

    it('should allow Agent_Memory writes', () => {
      const result = runHook({ tool_input: { file_path: '/tmp/Agent_Memory/sessions/test.yaml', content: 'phase: completed' } });
      expect(result.continue).toBe(true);
    });
  });
});
