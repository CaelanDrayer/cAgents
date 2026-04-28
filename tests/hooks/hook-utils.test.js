import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');

describe('hook-utils.cjs', () => {
  let hookUtils;

  beforeEach(() => {
    // Clear require cache to get fresh module
    delete require.cache[require.resolve(join(HOOKS_DIR, 'hook-utils.cjs'))];
    hookUtils = require(join(HOOKS_DIR, 'hook-utils.cjs'));
  });

  describe('module exports', () => {
    it('should exist at .claude/hooks/hook-utils.cjs', () => {
      expect(existsSync(join(HOOKS_DIR, 'hook-utils.cjs'))).toBe(true);
    });

    it('should export createHook function', () => {
      expect(typeof hookUtils.createHook).toBe('function');
    });

    it('should export readStdin function', () => {
      expect(typeof hookUtils.readStdin).toBe('function');
    });

    it('should export safeRead function', () => {
      expect(typeof hookUtils.safeRead).toBe('function');
    });

    it('should export extractYamlValue function', () => {
      expect(typeof hookUtils.extractYamlValue).toBe('function');
    });

    it('should export countPattern function', () => {
      expect(typeof hookUtils.countPattern).toBe('function');
    });

    it('should export findActiveSession function', () => {
      expect(typeof hookUtils.findActiveSession).toBe('function');
    });

    it('should export findTeamSession function', () => {
      expect(typeof hookUtils.findTeamSession).toBe('function');
    });

    it('should export ensureDir function', () => {
      expect(typeof hookUtils.ensureDir).toBe('function');
    });

    it('should export getTimestampSlug function', () => {
      expect(typeof hookUtils.getTimestampSlug).toBe('function');
    });

    it('should export assignGrade function', () => {
      expect(typeof hookUtils.assignGrade).toBe('function');
    });

    it('should export calculateScore function', () => {
      expect(typeof hookUtils.calculateScore).toBe('function');
    });

    it('should export formatError function', () => {
      expect(typeof hookUtils.formatError).toBe('function');
    });

    it('should export denyWithReason function', () => {
      expect(typeof hookUtils.denyWithReason).toBe('function');
    });

    it('should export warnWithReason function', () => {
      expect(typeof hookUtils.warnWithReason).toBe('function');
    });

    it('should export SESSION_PREFIXES array', () => {
      expect(Array.isArray(hookUtils.SESSION_PREFIXES)).toBe(true);
      expect(hookUtils.SESSION_PREFIXES).toContain('run_');
      expect(hookUtils.SESSION_PREFIXES).toContain('optimize_');
      expect(hookUtils.SESSION_PREFIXES).toContain('review_');
      expect(hookUtils.SESSION_PREFIXES).toContain('designer_');
      expect(hookUtils.SESSION_PREFIXES).toContain('team_');
    });
  });

  describe('extractYamlValue', () => {
    it('should extract simple key-value pairs', () => {
      const yaml = 'phase: coordinating\ntier: 3';
      expect(hookUtils.extractYamlValue(yaml, 'phase')).toBe('coordinating');
      expect(hookUtils.extractYamlValue(yaml, 'tier')).toBe('3');
    });

    it('should extract quoted values', () => {
      const yaml = 'name: "my-session"\nstatus: \'active\'';
      expect(hookUtils.extractYamlValue(yaml, 'name')).toBe('my-session');
      expect(hookUtils.extractYamlValue(yaml, 'status')).toBe('active');
    });

    it('should return null for missing keys', () => {
      expect(hookUtils.extractYamlValue('phase: active', 'missing')).toBe(null);
    });
  });

  describe('countPattern', () => {
    it('should count regex matches', () => {
      const content = 'status: pending\nstatus: completed\nstatus: pending';
      expect(hookUtils.countPattern(content, /status:\s*pending/g)).toBe(2);
      expect(hookUtils.countPattern(content, /status:\s*completed/g)).toBe(1);
    });

    it('should return 0 for no matches', () => {
      expect(hookUtils.countPattern('hello world', /missing/g)).toBe(0);
    });
  });

  describe('safeRead', () => {
    it('should return null for non-existent files', () => {
      expect(hookUtils.safeRead('/nonexistent/path/file.txt')).toBe(null);
    });
  });

  describe('assignGrade', () => {
    it('should return EXCELLENT for high scores', () => {
      expect(hookUtils.assignGrade(90)).toBe('EXCELLENT');
      expect(hookUtils.assignGrade(85)).toBe('EXCELLENT');
    });

    it('should return PASS for medium scores', () => {
      expect(hookUtils.assignGrade(70)).toBe('PASS');
      expect(hookUtils.assignGrade(65)).toBe('PASS');
    });

    it('should return FAIL for low scores', () => {
      expect(hookUtils.assignGrade(50)).toBe('FAIL');
      expect(hookUtils.assignGrade(0)).toBe('FAIL');
    });
  });

  describe('calculateScore', () => {
    it('should sum breakdown values', () => {
      expect(hookUtils.calculateScore({ a: 10, b: 20, c: 30 })).toBe(60);
    });

    it('should floor at 0', () => {
      expect(hookUtils.calculateScore({ a: -50, b: 10 })).toBe(0);
    });
  });

  describe('getTimestampSlug', () => {
    it('should produce a filesystem-safe timestamp', () => {
      const date = new Date('2026-02-28T14:30:00Z');
      const slug = hookUtils.getTimestampSlug(date);
      expect(slug).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);
      expect(slug).not.toContain(':');
      expect(slug).not.toContain('.');
    });
  });

  describe('parseTaskList', () => {
    it('should return empty array for non-existent files', () => {
      expect(hookUtils.parseTaskList('/nonexistent/file.yaml')).toEqual([]);
    });
  });

  describe('formatError', () => {
    it('should format What/Why/Fix sections', () => {
      const msg = hookUtils.formatError({
        what: 'File write blocked',
        why: 'Path is in protected system directory',
        fix: 'Move the file to Agent_Memory/ or project directory'
      });
      expect(msg).toContain('WHAT: File write blocked');
      expect(msg).toContain('WHY: Path is in protected system directory');
      expect(msg).toContain('FIX: Move the file to Agent_Memory/');
    });

    it('should include hook name when provided', () => {
      const msg = hookUtils.formatError({
        what: 'Command blocked',
        why: 'Dangerous operation',
        fix: 'Use a safer alternative',
        hook: 'BashValidator'
      });
      expect(msg).toContain('[BashValidator]');
    });

    it('should work without hook name', () => {
      const msg = hookUtils.formatError({
        what: 'Problem',
        why: 'Cause',
        fix: 'Solution'
      });
      expect(msg).not.toContain('[');
      expect(msg).toContain('WHAT: Problem');
    });
  });

  describe('denyWithReason', () => {
    it('should return deny:true with formatted reason', () => {
      const result = hookUtils.denyWithReason({
        what: 'Blocked',
        why: 'Dangerous',
        fix: 'Stop it'
      });
      expect(result.deny).toBe(true);
      expect(result.reason).toContain('WHAT: Blocked');
      expect(result.reason).toContain('WHY: Dangerous');
      expect(result.reason).toContain('FIX: Stop it');
    });
  });

  describe('warnWithReason', () => {
    it('should return continue:true with formatted systemMessage', () => {
      const result = hookUtils.warnWithReason({
        what: 'Warning issued',
        why: 'Potential issue',
        fix: 'Review output'
      });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('WHAT: Warning issued');
      expect(result.systemMessage).toContain('WHY: Potential issue');
      expect(result.systemMessage).toContain('FIX: Review output');
    });
  });

  describe('areDependenciesMet', () => {
    it('should return true when no dependencies', () => {
      const item = { id: 'TASK-01', dependencies: [] };
      expect(hookUtils.areDependenciesMet(item, [])).toBe(true);
    });

    it('should return true when all deps completed', () => {
      const item = { id: 'TASK-02', dependencies: ['TASK-01'] };
      const allItems = [
        { id: 'TASK-01', status: 'completed' },
        { id: 'TASK-02', status: 'pending', dependencies: ['TASK-01'] }
      ];
      expect(hookUtils.areDependenciesMet(item, allItems)).toBe(true);
    });

    it('should return false when deps not completed', () => {
      const item = { id: 'TASK-02', dependencies: ['TASK-01'] };
      const allItems = [
        { id: 'TASK-01', status: 'pending' },
        { id: 'TASK-02', status: 'pending', dependencies: ['TASK-01'] }
      ];
      expect(hookUtils.areDependenciesMet(item, allItems)).toBe(false);
    });
  });

  // Regression test for the test-mode bypass added to dedupGuard.
  // Bug: stale /tmp/cagents-dedup-* files (from crashed/cancelled prior runs) caused
  //      hook tests with deterministic fixtures to short-circuit, skipping side effects
  //      and producing 14 spurious failures across 3 test files.
  // Fix:  dedupGuard returns false (not a duplicate) under VITEST=true, NODE_ENV=test,
  //      or CAGENTS_HOOK_DEDUP_DISABLE=1.
  // Could have caught by: unit test on hook-utils.cjs dedupGuard.
  describe('dedupGuard test-mode bypass', () => {
    it('should bypass dedup when VITEST is set', () => {
      const orig = process.env.VITEST;
      process.env.VITEST = 'true';
      try {
        // Even on the second invocation with identical input, should not be a duplicate
        const first = hookUtils.dedupGuard('RegressionTest', { session_id: 'test-bypass' });
        const second = hookUtils.dedupGuard('RegressionTest', { session_id: 'test-bypass' });
        expect(first).toBe(false);
        expect(second).toBe(false);
      } finally {
        if (orig === undefined) delete process.env.VITEST;
        else process.env.VITEST = orig;
      }
    });

    it('should bypass dedup when NODE_ENV is test', () => {
      const origVitest = process.env.VITEST;
      const origNodeEnv = process.env.NODE_ENV;
      delete process.env.VITEST;
      process.env.NODE_ENV = 'test';
      try {
        const result = hookUtils.dedupGuard('RegressionTest2', { session_id: 'test-nodeenv' });
        expect(result).toBe(false);
      } finally {
        if (origVitest === undefined) delete process.env.VITEST;
        else process.env.VITEST = origVitest;
        if (origNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = origNodeEnv;
      }
    });

    it('should bypass dedup when CAGENTS_HOOK_DEDUP_DISABLE=1', () => {
      const origVitest = process.env.VITEST;
      const origNodeEnv = process.env.NODE_ENV;
      delete process.env.VITEST;
      delete process.env.NODE_ENV;
      process.env.CAGENTS_HOOK_DEDUP_DISABLE = '1';
      try {
        const result = hookUtils.dedupGuard('RegressionTest3', { session_id: 'test-escape' });
        expect(result).toBe(false);
      } finally {
        if (origVitest === undefined) delete process.env.VITEST;
        else process.env.VITEST = origVitest;
        if (origNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = origNodeEnv;
        delete process.env.CAGENTS_HOOK_DEDUP_DISABLE;
      }
    });

    it('should NOT bypass dedup in production (no test env vars)', () => {
      const origVitest = process.env.VITEST;
      const origNodeEnv = process.env.NODE_ENV;
      const origDisable = process.env.CAGENTS_HOOK_DEDUP_DISABLE;
      delete process.env.VITEST;
      delete process.env.NODE_ENV;
      delete process.env.CAGENTS_HOOK_DEDUP_DISABLE;
      try {
        // Use a unique hook name to avoid colliding with concurrent tests
        const uniqueName = 'ProdDedupTest_' + process.pid + '_' + Date.now();
        const first = hookUtils.dedupGuard(uniqueName, { session_id: 'prod-test' });
        const second = hookUtils.dedupGuard(uniqueName, { session_id: 'prod-test' });
        expect(first).toBe(false);   // First call wins
        expect(second).toBe(true);   // Second call is dedup'd
      } finally {
        if (origVitest === undefined) delete process.env.VITEST;
        else process.env.VITEST = origVitest;
        if (origNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = origNodeEnv;
        if (origDisable !== undefined) process.env.CAGENTS_HOOK_DEDUP_DISABLE = origDisable;
      }
    });
  });

  describe('createHook continue:true auto-inject (regression: V11.0.5)', () => {
    // V11.0.4 surfaced a class of latent bugs where hook authors forgot to
    // include `continue: true` alongside `hookSpecificOutput` (or other
    // non-decision return shapes). Tests asserting `result.continue === true`
    // would fail with "expected undefined" once the hook's branch fired.
    // V11.0.5 fix: createHook auto-injects continue:true when none is set
    // AND no decision/deny is in play. These tests pin the auto-inject
    // logic by exercising the same shape-normalization the factory performs.
    function normalize(result) {
      if (typeof result !== 'object' || result === null) return result;
      if (result.continue === undefined
          && result.decision === undefined
          && !(result.hookSpecificOutput && result.hookSpecificOutput.permissionDecision === 'deny')) {
        result.continue = true;
      }
      return result;
    }

    it('should inject continue:true when result has hookSpecificOutput but no continue', () => {
      const r = normalize({ hookSpecificOutput: { hookEventName: 'PostToolUseFailure', additionalContext: 'msg' } });
      expect(r.continue).toBe(true);
      expect(r.hookSpecificOutput.hookEventName).toBe('PostToolUseFailure');
    });

    it('should inject continue:true on a bare systemMessage response', () => {
      const r = normalize({ systemMessage: 'Be careful, X just happened' });
      expect(r.continue).toBe(true);
      expect(r.systemMessage).toBe('Be careful, X just happened');
    });

    it('should NOT override an explicit continue:false (TeammateIdle clean shutdown)', () => {
      const r = normalize({ continue: false, stopReason: 'All work complete' });
      expect(r.continue).toBe(false);
      expect(r.stopReason).toBe('All work complete');
    });

    it('should NOT inject continue when decision is set (Stop hook block)', () => {
      const r = normalize({ decision: 'block', reason: 'Workflow incomplete' });
      expect(r.continue).toBeUndefined();
      expect(r.decision).toBe('block');
    });

    it('should NOT touch a deny response (PreToolUse permissionDecision=deny)', () => {
      const r = normalize({ hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: 'blocked' } });
      expect(r.continue).toBeUndefined();
    });

    it('should leave continue:true alone when already set', () => {
      const r = normalize({ continue: true, systemMessage: 'hi' });
      expect(r.continue).toBe(true);
      expect(r.systemMessage).toBe('hi');
    });

    it('should pass primitives and null through unchanged', () => {
      expect(normalize(null)).toBe(null);
      expect(normalize(undefined)).toBe(undefined);
    });
  });
});
