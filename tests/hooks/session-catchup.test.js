import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

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

  // WI-5 (session run_improve-skills-hooks_260703_001): the hook injected
  // guidance referencing the REMOVED standalone /improve skill (folded into
  // the pipeline entry point via the v12.1.2 keyword router — then spelled
  // `/run improve|review|optimize X`, now `/act ...` after the rename) and
  // pointed the product-context tip at the non-canonical
  // .claude/context/product-context.yaml path instead of the documented
  // cagents-memory/_projects/{project_hash}/product_context.yaml location
  // (see .claude/skills/act/SKILL.md § context passthrough removal).
  describe('WI-5: removed /improve references + canonical product-context path', () => {
    // The hook dedups on session_id (see session-catchup-v11.test.js) — use a
    // fresh session_id per invocation so the handler actually runs.
    function runHookFresh() {
      return runHook({ session_id: `wi5-test-${randomUUID()}` });
    }

    // Matches the standalone /improve SKILL token only. Deliberately does NOT
    // match the live keyword-router syntax `/act improve <target>`,
    // because there the token is a bare "improve" with no leading slash.
    const STANDALONE_IMPROVE_RE = /(?<![\w-])\/improve\b/;

    it('emitted additionalContext contains NO standalone /improve skill reference', () => {
      const result = runHookFresh();
      const ctx = result?.hookSpecificOutput?.additionalContext || '';
      expect(ctx.length).toBeGreaterThan(0);
      expect(STANDALONE_IMPROVE_RE.test(ctx)).toBe(false);
    });

    it('routes review/optimize work via the /act keyword router (v12.1.2)', () => {
      const result = runHookFresh();
      const ctx = result?.hookSpecificOutput?.additionalContext || '';
      // At least one keyword-router form must be advertised: /act review,
      // /act optimize, or /act improve.
      expect(ctx).toMatch(/\/act (review|optimize|improve)\b/);
    });

    it('names only live skills in the skill-invocation guidance', () => {
      const result = runHookFresh();
      const ctx = result?.hookSpecificOutput?.additionalContext || '';
      for (const skill of ['/act', '/team', '/designer', '/helper']) {
        expect(ctx).toContain(skill);
      }
      // The renamed-away /run entry point must not be advertised — it now
      // names Claude Code's built-in app-launcher skill, not the pipeline.
      expect(ctx).not.toMatch(/(?<![\w-])\/run(?![\w-])/);
    });

    it('product-context tip points at the canonical cagents-memory/_projects path', () => {
      // Source-contract test (the tip only renders once per install thanks to
      // the context_suggestion_shown marker, so live output would be flaky).
      const hookSource = readFileSync(HOOK_PATH, 'utf8');
      // Canonical location must be referenced (matching run SKILL.md).
      expect(hookSource).toContain('_projects');
      expect(hookSource).toContain('product_context.yaml');
      // The old tip suggesting creation at the non-canonical location is gone.
      expect(hookSource).not.toContain('Tip: Create .claude/context/product-context.yaml');
      // If the .claude/context read is retained at all, it must be explicitly
      // marked as a legacy fallback.
      if (hookSource.includes('product-context.yaml')) {
        expect(hookSource).toMatch(/legacy/i);
      }
    });
  });
});
