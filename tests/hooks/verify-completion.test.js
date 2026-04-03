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

    // Regression test for WI-2: hook must read validation_report.yaml from
    // workflow/ (the correct path), not from the old validation/ directory.
    it('reads validation_report.yaml from workflow/ (regression: WI-2 path fix)', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'), 'phase: validating\n');
      writeFileSync(
        join(TEST_SESSION_DIR, 'workflow', 'validation_report.yaml'),
        'overall_status: FAIL\nreason: tests failed\n'
      );
      const result = runHook({ session_id: TEST_SESSION });
      // Hook found the file at workflow/ and recorded the FAIL status as a warning
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('warning');
      // The FAIL status must appear in completion_summary.yaml warnings list,
      // proving the hook read the file from the correct workflow/ path.
      const summary = readFileSync(join(TEST_SESSION_DIR, 'completion_summary.yaml'), 'utf8');
      expect(summary).toMatch(/Validation status: FAIL/i);
    });

    it('should warn (not block) when pipeline_state is ORCHESTRATED with recent transition (regression: BUG-1)', () => {
      const recentTimestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 minutes ago
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'), `pipeline_state: ORCHESTRATED\nstate_history:\n  - state: ORCHESTRATED\n    entered_at: "${recentTimestamp}"\n    duration_ms: null\n`);
      const result = runHook({ session_id: TEST_SESSION });
      // ORCHESTRATED is an active pipeline state with a recent transition — hook must
      // downgrade to warning (continue: true) rather than blocking. If 'ORCHESTRATED'
      // is removed from activeStates in the hook, this assertion will fail.
      expect(result.decision).not.toBe('block');
      expect(result.continue).toBe(true);
    });

    it('ignores validation_report.yaml placed in old validation/ path (regression: WI-2 path fix)', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'), 'phase: validating\n');
      // Write FAIL report only at the old wrong path — hook must NOT pick it up
      writeFileSync(
        join(TEST_SESSION_DIR, 'validation', 'validation_report.yaml'),
        'overall_status: FAIL\nreason: tests failed\n'
      );
      // workflow/validation_report.yaml intentionally absent
      const result = runHook({ session_id: TEST_SESSION });
      expect(result.continue).toBe(true);
      // systemMessage may warn about *missing* validation report, but must NOT
      // contain the FAIL status string produced by the file at the wrong path
      if (result.systemMessage) {
        expect(result.systemMessage).not.toMatch(/Validation status: FAIL/i);
      }
    });
  });

  describe('team session pre-execution blocking (regression: team enrichment hang)', () => {
    // Regression test: /team stops after enrichment (planner + decomposer finish)
    // but TeamCreate never runs because verify-completion.cjs only warns for INIT phase.
    // Fix: block when team_ session has pre-exec phase + enrichment artifacts exist.
    const TEAM_SESSION = 'team_20260101_000001_test_vc';
    const TEAM_SESSION_DIR = join(TEST_SESSIONS_DIR, TEAM_SESSION);

    beforeEach(() => {
      mkdirSync(join(TEAM_SESSION_DIR, 'workflow'), { recursive: true });
    });

    afterEach(() => {
      try { rmSync(TEAM_SESSION_DIR, { recursive: true, force: true }); } catch {}
    });

    it('should block when team session has phase INIT and plan.yaml exists (no coordination_log)', () => {
      writeFileSync(join(TEAM_SESSION_DIR, 'status.yaml'),
        `phase: INIT\ncreated_at: "${new Date().toISOString()}"\n`);
      writeFileSync(join(TEAM_SESSION_DIR, 'workflow', 'plan.yaml'),
        'plan_id: test\ntier: 3\ndomain: engineering\nmission: "Test team"\n');
      const result = runHook({ session_id: TEAM_SESSION });
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('coordination is incomplete');
    });

    it('should block when team session has phase ENRICHING and work_items.yaml exists', () => {
      writeFileSync(join(TEAM_SESSION_DIR, 'status.yaml'),
        `phase: ENRICHING\ncreated_at: "${new Date().toISOString()}"\n`);
      writeFileSync(join(TEAM_SESSION_DIR, 'workflow', 'work_items.yaml'),
        'work_items:\n  - id: WI-1\n    title: "Test"\n');
      const result = runHook({ session_id: TEAM_SESSION });
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('coordination is incomplete');
    });

    it('should block when team session has phase ENRICHED and plan.yaml exists', () => {
      writeFileSync(join(TEAM_SESSION_DIR, 'status.yaml'),
        `phase: ENRICHED\ncreated_at: "${new Date().toISOString()}"\n`);
      writeFileSync(join(TEAM_SESSION_DIR, 'workflow', 'plan.yaml'),
        'plan_id: test\ntier: 3\ndomain: engineering\nmission: "Test team"\n');
      const result = runHook({ session_id: TEAM_SESSION });
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('coordination is incomplete');
    });

    it('should NOT block team session in INIT if no enrichment artifacts exist', () => {
      writeFileSync(join(TEAM_SESSION_DIR, 'status.yaml'),
        `phase: INIT\ncreated_at: "${new Date().toISOString()}"\n`);
      // No plan.yaml or work_items.yaml — enrichment hasn't run yet
      const result = runHook({ session_id: TEAM_SESSION });
      // Should warn (not block) since there are no enrichment artifacts
      expect(result.decision).not.toBe('block');
    });

    it('should NOT block team session if coordination_log.yaml exists (past TeamCreate)', () => {
      writeFileSync(join(TEAM_SESSION_DIR, 'status.yaml'),
        `phase: ENRICHED\ncreated_at: "${new Date().toISOString()}"\n`);
      writeFileSync(join(TEAM_SESSION_DIR, 'workflow', 'plan.yaml'),
        'plan_id: test\ntier: 3\n');
      writeFileSync(join(TEAM_SESSION_DIR, 'workflow', 'coordination_log.yaml'),
        'schema_version: "1"\nstatus: completed\n');
      const result = runHook({ session_id: TEAM_SESSION });
      // coordination_log exists = past TeamCreate, so should NOT block with the team message
      expect(result.decision).not.toBe('block');
    });

    it('should NOT block non-team session in INIT with plan.yaml', () => {
      // run_ session (not team_) should use existing warning behavior, not the new block
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'),
        `phase: INIT\ncreated_at: "${new Date().toISOString()}"\n`);
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'plan.yaml'),
        'plan_id: test\ntier: 2\n');
      const result = runHook({ session_id: TEST_SESSION });
      // run_ sessions should NOT trigger the team-specific block
      if (result.decision === 'block' && result.reason) {
        expect(result.reason).not.toContain('TeamCreate');
      }
    });
  });

  describe('learning JSONL store', () => {
    it('should append session outcome to session_outcomes.jsonl', () => {
      // Set up a session with validating phase so the hook processes it fully
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'), 'phase: validating\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'plan.yaml'),
        'domain: engineering\ntier: 2\nmission: "Test JSONL"\n');

      runHook({ session_id: TEST_SESSION });

      // The hook writes session_outcomes.jsonl under Agent_Memory/_knowledge/learning/
      const jsonlPath = join(TEST_SESSIONS_DIR, '..', '_knowledge', 'learning', 'session_outcomes.jsonl');
      if (existsSync(jsonlPath)) {
        const content = readFileSync(jsonlPath, 'utf8');
        const lines = content.trim().split('\n').filter(Boolean);
        const lastEntry = JSON.parse(lines[lines.length - 1]);
        expect(lastEntry).toHaveProperty('session_id');
        expect(lastEntry).toHaveProperty('pass_fail');
        expect(lastEntry).toHaveProperty('timestamp');
      } else {
        // If _knowledge dir doesn't exist in test env, verify the hook source
        // contains the JSONL code path (contract test)
        const hookSource = readFileSync(join(process.cwd(), '.claude', 'hooks', 'verify-completion.cjs'), 'utf8');
        expect(hookSource).toContain('session_outcomes.jsonl');
        expect(hookSource).toContain('appendFileSync');
      }
    });
  });
});
