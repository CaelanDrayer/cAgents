import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'verify-completion.cjs');
const TEST_SESSIONS_DIR = join(process.cwd(), 'Agent_Memory', 'sessions');
const TEST_SESSION = 'run_20260101_000001_test_vc';
const TEST_SESSION_DIR = join(TEST_SESSIONS_DIR, TEST_SESSION);

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('verify-completion.cjs', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_SESSION_DIR, 'workflow'), { recursive: true });
    mkdirSync(join(TEST_SESSION_DIR, 'validation'), { recursive: true });
  });

  afterEach(() => {
    try { rmSync(TEST_SESSION_DIR, { recursive: true, force: true }); } catch {}
  });

  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should allow stop when stop_hook_active is true', () => {
    const result = runHook({ stop_hook_active: true });
    expect(result.continue).toBe(true);
  });

  it('should allow stop when no active session found', () => {
    // Use a temp project dir so findActiveSession doesn't find real active sessions
    const tmpDir = join(TEST_SESSIONS_DIR, '..', '..', '_test_isolated_vc');
    mkdirSync(join(tmpDir, 'Agent_Memory', 'sessions'), { recursive: true });
    try {
      const result = execSync(
        `printf '%s' '${JSON.stringify({ session_id: 'nonexistent_session_999' }).replace(/'/g, "'\\''")}' | CLAUDE_PROJECT_DIR="${tmpDir}" node "${HOOK_PATH}"`,
        { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
      );
      const parsed = JSON.parse(result.trim());
      expect(parsed.continue).toBe(true);
    } finally {
      try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  });

  describe('with active session', () => {
    it('should block when workflow is in planning phase', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'), 'phase: planning\n');
      const result = runHook({ session_id: TEST_SESSION });
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('planning');
    });

    it('should block when workflow is in coordinating phase', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'), 'phase: coordinating\n');
      const result = runHook({ session_id: TEST_SESSION });
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('coordinating');
    });

    it('should block when workflow is in executing phase', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'), 'phase: executing\n');
      const result = runHook({ session_id: TEST_SESSION });
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('executing');
    });

    it('should allow stop when phase is completed', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'), 'phase: completed\n');
      // completed phase -> findActiveSession won't find it, so returns continue
      const result = runHook({ session_id: TEST_SESSION });
      expect(result.continue).toBe(true);
    });

    it('should block when pending work items exist', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'), 'phase: validating\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'coordination_log.yaml'),
        'tasks:\n  - status: pending\n  - status: completed\n');
      const result = runHook({ session_id: TEST_SESSION });
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('pending');
    });

    it('should block when in_progress work items exist', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'), 'phase: validating\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'coordination_log.yaml'),
        'tasks:\n  - status: in_progress\n');
      const result = runHook({ session_id: TEST_SESSION });
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('in progress');
    });

    it('should warn about missing validation report', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'), 'phase: validating\n');
      const result = runHook({ session_id: TEST_SESSION });
      // Only warnings, no issues = continue with message
      expect(result.continue).toBe(true);
      if (result.systemMessage) {
        expect(result.systemMessage).toContain('warning');
      }
    });

    it('should write completion_summary.yaml', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'), 'phase: validating\n');
      runHook({ session_id: TEST_SESSION });
      expect(existsSync(join(TEST_SESSION_DIR, 'completion_summary.yaml'))).toBe(true);
    });

    it('should warn when validation status is not PASS', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'), 'phase: validating\n');
      writeFileSync(join(TEST_SESSION_DIR, 'validation', 'validation_report.yaml'),
        'overall_status: FAIL\nreason: tests failed\n');
      const result = runHook({ session_id: TEST_SESSION });
      expect(result.continue).toBe(true);
      if (result.systemMessage) {
        // The warning mentions number of warnings and refers to completion_summary
        expect(result.systemMessage).toContain('warning');
      }
    });
  });
});
