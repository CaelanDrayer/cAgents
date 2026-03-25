import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'elicitation-handler.cjs');

// Log dir created by the hook during tests
const LOG_DIR = join(process.cwd(), 'Agent_Memory', '_system', 'logs');

function runHook(input = {}) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('elicitation-handler.cjs', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  describe('Elicitation event', () => {
    it('should return continue:true for an Elicitation event', () => {
      const result = runHook({
        prompt: 'What directory should I use?',
        mcp_server_name: 'filesystem',
        elicitation_id: 'test-elicit-001',
        session_id: 'run_test_260101_001'
      });
      expect(result.continue).toBe(true);
    });

    it('should pass through without blocking', () => {
      const result = runHook({ prompt: 'Choose an option', server_name: 'github' });
      expect(result).not.toHaveProperty('hookSpecificOutput.permissionDecision', 'deny');
    });

    it('should handle missing server_name gracefully', () => {
      const result = runHook({ prompt: 'Enter a value' });
      expect(result.continue).toBe(true);
    });

    it('should handle schema-based elicitation', () => {
      const result = runHook({
        schema: { type: 'object', properties: { name: { type: 'string' } } },
        mcp_server_name: 'filesystem'
      });
      expect(result.continue).toBe(true);
    });
  });

  describe('ElicitationResult event', () => {
    it('should return continue:true for an ElicitationResult event', () => {
      const result = runHook({
        result: { value: 'my-project' },
        action: 'accept',
        mcp_server_name: 'filesystem',
        elicitation_id: 'test-elicit-001'
      });
      expect(result.continue).toBe(true);
    });

    it('should handle deny action', () => {
      const result = runHook({
        result: null,
        action: 'deny',
        server_name: 'github'
      });
      expect(result.continue).toBe(true);
    });

    it('should handle cancel action', () => {
      const result = runHook({ result: undefined, action: 'cancel' });
      expect(result.continue).toBe(true);
    });

    it('should handle result:false (falsy result is still ElicitationResult)', () => {
      const result = runHook({ result: false, action: 'accept' });
      expect(result.continue).toBe(true);
    });
  });

  describe('unknown event shape', () => {
    it('should return continue:true for empty input', () => {
      const result = runHook({});
      expect(result.continue).toBe(true);
    });

    it('should return continue:true for unrecognized fields', () => {
      const result = runHook({ foo: 'bar', baz: 123 });
      expect(result.continue).toBe(true);
    });
  });

  describe('hook source code contracts', () => {
    let source;
    beforeEach(() => {
      source = readFileSync(HOOK_PATH, 'utf8');
    });

    it('should use createHook factory', () => {
      expect(source).toContain("createHook('ElicitationHandler'");
    });

    it('should import from hook-utils.cjs', () => {
      expect(source).toContain("require('./hook-utils.cjs')");
    });

    it('should use AGENT_MEMORY_DIR for log path', () => {
      expect(source).toContain('AGENT_MEMORY_DIR');
    });

    it('should return null (pass-through)', () => {
      expect(source).toContain('return null');
    });

    it('should detect Elicitation events via prompt or schema field', () => {
      expect(source).toContain('prompt');
      expect(source).toContain('schema');
    });

    it('should detect ElicitationResult events via result field', () => {
      expect(source).toContain('result !== undefined');
    });

    it('should log to elicitations daily log file', () => {
      expect(source).toContain('elicitations_');
    });

    it('should warn on unrecognized MCP servers', () => {
      expect(source).toContain('unrecognized');
    });
  });

  describe('settings.json registration', () => {
    let settings;
    beforeEach(() => {
      settings = JSON.parse(
        readFileSync(join(process.cwd(), '.claude', 'settings.json'), 'utf8')
      );
    });

    it('should be registered under Elicitation event', () => {
      expect(settings.hooks).toHaveProperty('Elicitation');
      const hooks = settings.hooks.Elicitation;
      expect(Array.isArray(hooks)).toBe(true);
      expect(hooks[0].hooks[0].command).toContain('elicitation-handler');
    });

    it('should be registered under ElicitationResult event', () => {
      expect(settings.hooks).toHaveProperty('ElicitationResult');
      const hooks = settings.hooks.ElicitationResult;
      expect(Array.isArray(hooks)).toBe(true);
      expect(hooks[0].hooks[0].command).toContain('elicitation-handler');
    });

    it('should have async:true for both registrations (logging-only hooks)', () => {
      expect(settings.hooks.Elicitation[0].hooks[0].async).toBe(true);
      expect(settings.hooks.ElicitationResult[0].hooks[0].async).toBe(true);
    });
  });
});
