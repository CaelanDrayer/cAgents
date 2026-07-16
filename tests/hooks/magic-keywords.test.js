import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
// P1-7 (v12.7.1, commit c5d48fce) consolidated magic-keywords.cjs +
// delegation-enforcer.cjs into prompt-router.cjs. The natural-language
// keyword-routing behavior asserted here is preserved by prompt-router's
// Layer 2 (KEYWORD_ROUTES), so this regression now targets prompt-router.cjs.
const HOOK_PATH = join(HOOKS_DIR, 'prompt-router.cjs');

function runHook(input) {
  // Layer 2 (natural-language routing suggestions) is opt-in, default OFF.
  // Enable it explicitly so these regressions exercise the routing behavior.
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, CAGENTS_ROUTING_SUGGESTIONS: '1' }
    }
  );
  return JSON.parse(result.trim());
}

describe('prompt-router.cjs (keyword routing, formerly magic-keywords.cjs)', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return continue true for empty input', () => {
    const result = runHook({});
    expect(result.continue).toBe(true);
  });

  it('should return continue true for short prompts', () => {
    const result = runHook({ user_prompt: 'hi' });
    expect(result.continue).toBe(true);
  });

  it('should suggest /run for build keywords', () => {
    const result = runHook({ user_prompt: 'build a login page with OAuth' });
    expect(result.systemMessage).toContain('/run');
  });

  it('should suggest /run for fix keywords', () => {
    const result = runHook({ user_prompt: 'fix the authentication bug in login.ts' });
    expect(result.systemMessage).toContain('/run');
  });

  // v12.1.2: /improve folded into /run via keyword router. The hook now suggests
  // /run review (instead of /improve --mode review) and /run optimize.
  it('should suggest /run review for review keywords (v12.1.2 keyword router)', () => {
    const result = runHook({ user_prompt: 'review the auth module for security issues' });
    expect(result.systemMessage).toContain('/run review');
  });

  it('should suggest /run optimize for optimize keywords (v12.1.2 keyword router)', () => {
    const result = runHook({ user_prompt: 'optimize the database queries for performance' });
    expect(result.systemMessage).toContain('/run optimize');
  });

  it('should suggest /designer for design keywords', () => {
    const result = runHook({ user_prompt: 'design a new dashboard layout' });
    expect(result.systemMessage).toContain('/designer');
  });

  it('should suggest /team for team keywords', () => {
    const result = runHook({ user_prompt: 'team up to build the entire API' });
    expect(result.systemMessage).toContain('/team');
  });

  it('should suppress suggestions for questions', () => {
    const result = runHook({ user_prompt: 'what is the current auth implementation?' });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeUndefined();
  });

  it('should suppress suggestions for slash commands', () => {
    const result = runHook({ user_prompt: '/run fix the bug' });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeUndefined();
  });

  it('should suppress suggestions for yes/no responses', () => {
    const result = runHook({ user_prompt: 'yes go ahead' });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeUndefined();
  });

  it('should suppress suggestions for continue/proceed', () => {
    const result = runHook({ user_prompt: 'continue with the plan' });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeUndefined();
  });
});

describe('prompt-router.cjs Layer 2 is opt-in (default OFF)', () => {
  // Bug-driven regression: Layer 2 used to fire on EVERY intent-keyword prompt,
  // which was noise in sessions where the user did not want the plugin. It is
  // now gated behind CAGENTS_ROUTING_SUGGESTIONS. With the toggle unset/off, an
  // intent-keyword prompt must produce NO routing suggestion.
  function runHookWithEnv(input, routingEnv) {
    const env = { ...process.env };
    delete env.CAGENTS_ROUTING_SUGGESTIONS;
    if (routingEnv !== undefined) env.CAGENTS_ROUTING_SUGGESTIONS = routingEnv;
    const result = execSync(
      `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
      { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'], env }
    );
    return JSON.parse(result.trim());
  }

  it('emits no routing suggestion when the toggle is unset (default)', () => {
    const result = runHookWithEnv({ user_prompt: 'build a login page with OAuth' });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeUndefined();
  });

  it('emits no routing suggestion when the toggle is a non-affirmative value', () => {
    const result = runHookWithEnv({ user_prompt: 'fix the auth bug in login.ts' }, 'off');
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeUndefined();
  });

  it('emits the routing suggestion when the toggle is enabled', () => {
    const result = runHookWithEnv({ user_prompt: 'build a login page with OAuth' }, '1');
    expect(result.systemMessage).toContain('/run');
  });
});
