import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
// P1-7 (v12.7.1, c5d48fce) consolidated delegation-enforcer.cjs into
// prompt-router.cjs. The delegation mandate is now delivered as a CONCISE
// reminder that references @.claude/rules/core/delegation.md (the canonical
// Rationalization Kill List) instead of inlining the full ~3000-char mandate
// on every /run + /team invocation. Assertions below target the new contract.
const HOOK_PATH = join(HOOKS_DIR, 'prompt-router.cjs');

function runHook(input) {
  const result = execSync(`node "${HOOK_PATH}"`, {
    encoding: 'utf8',
    timeout: 5000,
    input: JSON.stringify(input),
    stdio: ['pipe', 'pipe', 'pipe']
  });
  return JSON.parse(result.trim());
}

describe('prompt-router.cjs delegation enforcement (formerly delegation-enforcer.cjs)', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  describe('/run invocation detection', () => {
    it('should inject delegation mandate for /run', () => {
      const result = runHook({ user_prompt: '/run Fix auth bug' });
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
      expect(result.hookSpecificOutput.additionalContext).toContain('DELEGATION ACTIVE');
      expect(result.hookSpecificOutput.additionalContext).toContain('/run');
    });

    it('should inject delegation mandate for bare /run', () => {
      const result = runHook({ user_prompt: '/run' });
      expect(result.hookSpecificOutput.additionalContext).toContain('DELEGATION ACTIVE');
      expect(result.hookSpecificOutput.additionalContext).toContain('/run');
    });
  });

  describe('/team invocation detection', () => {
    it('should inject delegation mandate for /team', () => {
      const result = runHook({ user_prompt: '/team Build dashboard with tests' });
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.additionalContext).toContain('DELEGATION ACTIVE');
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
      expect(result.hookSpecificOutput.additionalContext).toContain('DELEGATION ACTIVE');
      expect(result.hookSpecificOutput.additionalContext).toContain('/team');
    });
  });

  describe('non-skill prompts', () => {
    it('should not inject the delegation mandate for regular prompts', () => {
      // P1-7: prompt-router's Layer 1 (delegation mandate) only fires on
      // /run and /team. A natural-language "Fix ..." prompt does NOT get the
      // mandate (no hookSpecificOutput/additionalContext). It MAY get a
      // Layer-2 routing suggestion via systemMessage — that is intended and
      // distinct from the delegation mandate.
      const result = runHook({ user_prompt: 'Fix the auth bug in login.ts' });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput).toBeUndefined();
    });

    it('should no-op for empty prompts', () => {
      const result = runHook({ user_prompt: '' });
      expect(result).toEqual({ continue: true });
    });

    it('should no-op for non-enforced skills', () => {
      // /review is not an enforced skill; the leading-slash suppression
      // pattern also blocks any Layer-2 routing suggestion -> true no-op.
      const result = runHook({ user_prompt: '/review Check code quality' });
      expect(result).toEqual({ continue: true });
    });

    it('should no-op when no prompt field exists', () => {
      const result = runHook({});
      expect(result).toEqual({ continue: true });
    });
  });

  describe('rationalization kill list delivery (P1-7: by reference, not inline)', () => {
    // P1-7 replaced the ~3000-char inline kill-list mandate with a concise
    // reminder that points the model at the canonical rule file. The kill list
    // itself now lives in .claude/rules/core/delegation.md (its Rationalization
    // Kill List section). Assert the new delivery mechanism rather than the
    // removed inline phrases.
    it('should reference the canonical Rationalization Kill List', () => {
      const result = runHook({ user_prompt: '/run Build testing framework' });
      const ctx = result.hookSpecificOutput.additionalContext;
      expect(ctx).toContain('@.claude/rules/core/delegation.md');
      expect(ctx).toContain('Rationalization Kill List');
    });

    it('should mandate delegation to subagents via the Agent tool', () => {
      const result = runHook({ user_prompt: '/run Fix typo' });
      const ctx = result.hookSpecificOutput.additionalContext;
      expect(ctx).toContain('Agent tool');
      expect(ctx).toMatch(/no direct implementation|no matter how small/i);
    });
  });

  describe('prompt format edge cases', () => {
    it('should detect /run with leading whitespace', () => {
      const result = runHook({ user_prompt: '  /run Fix something' });
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.additionalContext).toContain('DELEGATION ACTIVE');
    });

    it('should detect /run with newline after command', () => {
      const result = runHook({ user_prompt: '/run\nFix the auth module' });
      expect(result.hookSpecificOutput).toBeDefined();
    });
  });
});
