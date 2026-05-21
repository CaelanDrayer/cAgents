import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'delegation-enforcer.cjs');

function runHook(input) {
  const result = execSync(`node "${HOOK_PATH}"`, {
    encoding: 'utf8',
    timeout: 5000,
    input: JSON.stringify(input),
    stdio: ['pipe', 'pipe', 'pipe']
  });
  return JSON.parse(result.trim());
}

describe('delegation-enforcer.cjs', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  describe('/run invocation detection', () => {
    it('should inject delegation mandate for /run', () => {
      const result = runHook({ user_prompt: '/run Fix auth bug' });
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
      expect(result.hookSpecificOutput.additionalContext).toContain('DELEGATION ENFORCEMENT ACTIVE');
      expect(result.hookSpecificOutput.additionalContext).toContain('/run');
    });

    it('should inject delegation mandate for bare /run', () => {
      const result = runHook({ user_prompt: '/run' });
      expect(result.hookSpecificOutput.additionalContext).toContain('PIPELINE MANDATORY');
    });
  });

  describe('/team invocation detection', () => {
    it('should inject delegation mandate for /team', () => {
      const result = runHook({ user_prompt: '/team Build dashboard with tests' });
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.additionalContext).toContain('DELEGATION ENFORCEMENT ACTIVE');
      expect(result.hookSpecificOutput.additionalContext).toContain('/team');
    });
  });

  describe('/team strategic-mode invocation detection (v12.2.0)', () => {
    // /org was absorbed into /team strategic mode in v12.2.0. Cross-domain
    // strategic prompts now route through /team, which delegation-enforcer
    // already covers above. This case asserts a strategic-flavor /team prompt
    // still triggers the delegation mandate.
    it('should inject delegation mandate for /team strategic-mode prompts', () => {
      const result = runHook({ user_prompt: '/team Launch new product across engineering and marketing' });
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.additionalContext).toContain('DELEGATION ENFORCEMENT ACTIVE');
      expect(result.hookSpecificOutput.additionalContext).toContain('/team');
    });
  });

  describe('non-skill prompts', () => {
    it('should no-op for regular prompts', () => {
      const result = runHook({ user_prompt: 'Fix the auth bug in login.ts' });
      expect(result).toEqual({ continue: true });
    });

    it('should no-op for empty prompts', () => {
      const result = runHook({ user_prompt: '' });
      expect(result).toEqual({ continue: true });
    });

    it('should no-op for non-enforced skills', () => {
      const result = runHook({ user_prompt: '/review Check code quality' });
      expect(result).toEqual({ continue: true });
    });

    it('should no-op when no prompt field exists', () => {
      const result = runHook({});
      expect(result).toEqual({ continue: true });
    });
  });

  describe('rationalization kill list content', () => {
    it('should include rationalization phrases in the mandate', () => {
      const result = runHook({ user_prompt: '/run Build testing framework' });
      const ctx = result.hookSpecificOutput.additionalContext;
      expect(ctx).toContain('documentation task');
      expect(ctx).toContain('planning task');
      expect(ctx).toContain('handle this directly');
      expect(ctx).toContain('too simple');
      expect(ctx).toContain('spinning up agents');
      expect(ctx).toContain('more efficiently myself');
    });

    it('should include violation consequence warning', () => {
      const result = runHook({ user_prompt: '/run Fix typo' });
      const ctx = result.hookSpecificOutput.additionalContext;
      expect(ctx).toContain('VIOLATION CONSEQUENCE');
      expect(ctx).toContain('critical protocol failure');
    });
  });

  describe('prompt format edge cases', () => {
    it('should detect /run with leading whitespace', () => {
      const result = runHook({ user_prompt: '  /run Fix something' });
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.additionalContext).toContain('DELEGATION ENFORCEMENT ACTIVE');
    });

    it('should detect /run with newline after command', () => {
      const result = runHook({ user_prompt: '/run\nFix the auth module' });
      expect(result.hookSpecificOutput).toBeDefined();
    });
  });
});
