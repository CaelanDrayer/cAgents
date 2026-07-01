import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'instructions-loaded.cjs');

function runHook(input = {}) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('instructions-loaded.cjs', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return a valid hook response', () => {
    const result = runHook({});
    // Either {"continue": true} (no active session) or {"hookSpecificOutput": {...}} (active session)
    const isContinue = result.continue === true;
    const isInstructionsLoaded = result.hookSpecificOutput?.hookEventName === 'InstructionsLoaded';
    expect(isContinue || isInstructionsLoaded).toBe(true);
  });

  it('should not throw on empty input', () => {
    expect(() => runHook({})).not.toThrow();
  });

  it('should not throw on minimal input with session_id', () => {
    expect(() => runHook({ session_id: 'run_test_260101_001' })).not.toThrow();
  });

  describe('source code contracts', () => {
    let source;
    beforeAll(() => {
      source = readFileSync(HOOK_PATH, 'utf8');
    });

    it('should use createHook factory', () => {
      expect(source).toContain("createHook('InstructionsLoaded'");
    });

    it('should check all expected rules dirs', () => {
      expect(source).toContain("'core'");
      expect(source).toContain("'domains'");
      expect(source).toContain("'quality'");
      expect(source).toContain("'memory'");
      expect(source).toContain("'infrastructure'");
    });

    it('should log rules count to stderr', () => {
      expect(source).toContain('console.error');
      expect(source).toContain('Rules loaded');
    });

    it('should call findActiveSession', () => {
      expect(source).toContain('findActiveSession');
    });

    it('should return null when no active session', () => {
      expect(source).toContain('return null');
    });

    it('should return InstructionsLoaded hookEventName', () => {
      expect(source).toContain("hookEventName: 'InstructionsLoaded'");
    });

    it('should inject additionalContext with rules count', () => {
      expect(source).toContain('additionalContext');
      expect(source).toContain('totalRules');
    });

    it('should warn about missing dirs in additionalContext', () => {
      expect(source).toContain('missing.length > 0');
      expect(source).toContain('Missing rules dirs');
    });
  });

  describe('rules directory validation', () => {
    it('should run without error when rules dirs exist', () => {
      // All standard rules dirs should be present in this repo
      const result = runHook({});
      // No crash = success (returns continue:true with no active session)
      expect(result).toBeDefined();
    });
  });

  describe('settings.json registration', () => {
    it('should be registered in settings.json', () => {
      const settingsPath = join(process.cwd(), '.claude', 'settings.json');
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      expect(settings.hooks.InstructionsLoaded).toBeDefined();
      expect(settings.hooks.InstructionsLoaded[0].hooks[0].command).toContain('instructions-loaded');
    });
  });
});
