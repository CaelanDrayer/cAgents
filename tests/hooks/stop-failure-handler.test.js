import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'stop-failure-handler.cjs');
const TEST_SESSION_DIR = join(process.cwd(), 'Agent_Memory', 'sessions', 'run_test-stop-failure_260101_001');
const WORKFLOW_DIR = join(TEST_SESSION_DIR, 'workflow');

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('stop-failure-handler.cjs', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  describe('no active session', () => {
    it('should return continue:true when given unknown session_id hint', () => {
      // Unknown session hint -- hook still returns continue:true
      const result = runHook({ session_id: 'nonexistent_session_xyz_999' });
      expect(result.continue).toBe(true);
    });

    it('should handle empty input gracefully', () => {
      const result = runHook({});
      expect(result.continue).toBe(true);
    });
  });

  describe('with active session', () => {
    beforeEach(() => {
      mkdirSync(WORKFLOW_DIR, { recursive: true });
      // Write a status.yaml in a non-terminal state
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'), [
        'pipeline_state: COORDINATED',
        'updated_at: "2026-01-01T12:00:00.000Z"'
      ].join('\n'));
      // Write a plan.yaml
      writeFileSync(join(WORKFLOW_DIR, 'plan.yaml'), [
        'domain: engineering',
        'controller: engineering-manager',
        'tier: 2'
      ].join('\n'));
    });

    afterEach(() => {
      try { rmSync(TEST_SESSION_DIR, { recursive: true, force: true }); } catch {}
    });

    it('should return continue:true with systemMessage', () => {
      const result = runHook({ session_id: 'run_test-stop-failure_260101_001' });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeDefined();
      expect(typeof result.systemMessage).toBe('string');
    });

    it('should mention the recovery state file in systemMessage', () => {
      const result = runHook({ session_id: 'run_test-stop-failure_260101_001' });
      expect(result.systemMessage).toContain('recovery_state.yaml');
    });

    it('should include workflow phase in systemMessage', () => {
      const result = runHook({ session_id: 'run_test-stop-failure_260101_001' });
      expect(result.systemMessage).toContain('COORDINATED');
    });

    it('should write recovery_state.yaml to workflow dir', () => {
      runHook({ session_id: 'run_test-stop-failure_260101_001' });
      const recoveryPath = join(WORKFLOW_DIR, 'recovery_state.yaml');
      expect(existsSync(recoveryPath)).toBe(true);
    });

    it('should include session_id in recovery_state.yaml', () => {
      runHook({ session_id: 'run_test-stop-failure_260101_001' });
      const content = readFileSync(join(WORKFLOW_DIR, 'recovery_state.yaml'), 'utf8');
      expect(content).toContain('run_test-stop-failure_260101_001');
    });

    it('should include event: stop_failure in recovery_state.yaml', () => {
      runHook({ session_id: 'run_test-stop-failure_260101_001' });
      const content = readFileSync(join(WORKFLOW_DIR, 'recovery_state.yaml'), 'utf8');
      expect(content).toContain('event: stop_failure');
    });

    it('should capture domain from plan.yaml in recovery_state.yaml', () => {
      runHook({ session_id: 'run_test-stop-failure_260101_001' });
      const content = readFileSync(join(WORKFLOW_DIR, 'recovery_state.yaml'), 'utf8');
      expect(content).toContain('domain: "engineering"');
    });

    it('should capture controller from plan.yaml in recovery_state.yaml', () => {
      runHook({ session_id: 'run_test-stop-failure_260101_001' });
      const content = readFileSync(join(WORKFLOW_DIR, 'recovery_state.yaml'), 'utf8');
      expect(content).toContain('controller: "engineering-manager"');
    });

    it('should capture phase from status.yaml in recovery_state.yaml', () => {
      runHook({ session_id: 'run_test-stop-failure_260101_001' });
      const content = readFileSync(join(WORKFLOW_DIR, 'recovery_state.yaml'), 'utf8');
      expect(content).toContain('phase: "COORDINATED"');
    });

    it('should include error_message in recovery_state.yaml when error provided', () => {
      runHook({
        session_id: 'run_test-stop-failure_260101_001',
        error: 'API rate limit exceeded'
      });
      const content = readFileSync(join(WORKFLOW_DIR, 'recovery_state.yaml'), 'utf8');
      expect(content).toContain('API rate limit exceeded');
    });

    it('should include error in systemMessage when error provided', () => {
      const result = runHook({
        session_id: 'run_test-stop-failure_260101_001',
        error: 'connection timeout'
      });
      expect(result.systemMessage).toContain('connection timeout');
    });

    it('should handle missing plan.yaml gracefully', () => {
      // Remove plan.yaml
      try { rmSync(join(WORKFLOW_DIR, 'plan.yaml')); } catch {}
      const result = runHook({ session_id: 'run_test-stop-failure_260101_001' });
      expect(result.continue).toBe(true);
      const content = readFileSync(join(WORKFLOW_DIR, 'recovery_state.yaml'), 'utf8');
      expect(content).toContain('domain: "unknown"');
    });

    it('should include recovery instructions in recovery_state.yaml', () => {
      runHook({ session_id: 'run_test-stop-failure_260101_001' });
      const content = readFileSync(join(WORKFLOW_DIR, 'recovery_state.yaml'), 'utf8');
      expect(content).toContain('instructions:');
      expect(content).toContain('workflow/plan.yaml');
    });
  });

  describe('hook file structure', () => {
    it('should use createHook factory', () => {
      const content = readFileSync(HOOK_PATH, 'utf8');
      expect(content).toContain("createHook('StopFailureHandler'");
    });

    it('should handle error_message field from input', () => {
      const content = readFileSync(HOOK_PATH, 'utf8');
      expect(content).toContain('error_message');
    });

    it('should return null when no active session', () => {
      const content = readFileSync(HOOK_PATH, 'utf8');
      expect(content).toContain('return null');
    });

    it('should save to workflow/recovery_state.yaml path', () => {
      const content = readFileSync(HOOK_PATH, 'utf8');
      expect(content).toContain('recovery_state.yaml');
    });
  });

  describe('settings.json registration', () => {
    it('should be registered under StopFailure event', () => {
      const settingsPath = join(process.cwd(), '.claude', 'settings.json');
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      expect(settings.hooks).toHaveProperty('StopFailure');
      const hooks = settings.hooks.StopFailure;
      expect(Array.isArray(hooks)).toBe(true);
      expect(hooks.length).toBeGreaterThan(0);
      const command = hooks[0].hooks[0].command;
      expect(command).toContain('stop-failure-handler');
    });
  });
});
