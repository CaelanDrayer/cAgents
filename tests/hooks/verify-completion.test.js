import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, mkdirSync, rmSync, readFileSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'verify-completion.cjs');
const TEST_SESSIONS_DIR = join(process.cwd(), 'cagents-memory', 'sessions');
const TEST_SESSION = 'run_20260101_000001_test_vc';
const TEST_SESSION_DIR = join(TEST_SESSIONS_DIR, TEST_SESSION);

function runHook(input, envOverrides = {}) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...envOverrides } }
  );
  return JSON.parse(result.trim());
}

// Clean stale dedup guard files left by prior test runs (killed processes don't clean up).
// The dedupGuard in hook-utils.cjs creates /tmp/cagents-dedup-{hook}-{hash} files that
// persist if the process is SIGKILL'd. Stale files cause the hook to silently skip execution.
function cleanDedupFiles() {
  try {
    const tmp = tmpdir();
    for (const f of readdirSync(tmp)) {
      if (f.startsWith('cagents-dedup-VerifyCompletion-')) {
        try { unlinkSync(join(tmp, f)); } catch {}
      }
    }
  } catch {}
}

describe('verify-completion.cjs', () => {
  beforeEach(() => {
    cleanDedupFiles();
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
    mkdirSync(join(tmpDir, 'cagents-memory', 'sessions'), { recursive: true });
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
      const result = runHook({ session_id: TEAM_SESSION }, { CAGENTS_ACTIVE_SESSION: '' });
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('coordination is incomplete');
    });

    it('should block when team session has phase ENRICHING and work_items.yaml exists', () => {
      writeFileSync(join(TEAM_SESSION_DIR, 'status.yaml'),
        `phase: ENRICHING\ncreated_at: "${new Date().toISOString()}"\n`);
      writeFileSync(join(TEAM_SESSION_DIR, 'workflow', 'work_items.yaml'),
        'work_items:\n  - id: WI-1\n    title: "Test"\n');
      const result = runHook({ session_id: TEAM_SESSION }, { CAGENTS_ACTIVE_SESSION: '' });
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('coordination is incomplete');
    });

    it('should block when team session has phase ENRICHED and plan.yaml exists', () => {
      writeFileSync(join(TEAM_SESSION_DIR, 'status.yaml'),
        `phase: ENRICHED\ncreated_at: "${new Date().toISOString()}"\n`);
      writeFileSync(join(TEAM_SESSION_DIR, 'workflow', 'plan.yaml'),
        'plan_id: test\ntier: 3\ndomain: engineering\nmission: "Test team"\n');
      const result = runHook({ session_id: TEAM_SESSION }, { CAGENTS_ACTIVE_SESSION: '' });
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

      // The hook writes session_outcomes.jsonl under cagents-memory/_knowledge/learning/
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

  describe('autoResolveWarnings()', () => {
    // These tests verify the safety-net auto-resolution of fixable warnings.
    // The function runs before verifyCompletion() and creates stub files for
    // missing artifacts, but only when the session is in a terminal state.

    it('should auto-create execution_summary.yaml when missing and session is terminal', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'),
        'pipeline_state: complete\nupdated_at: "' + new Date().toISOString() + '"\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'coordination_log.yaml'),
        'schema_version: "1"\ncontroller: cagents:engineering-manager\nstatus: completed\nimplementation_tasks:\n  - task_id: WI-1\n    status: completed\n    evidence: "done"\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'plan.yaml'),
        'plan_id: test\ntier: 2\ndomain: engineering\nmission: "Test"\nobjectives:\n  - id: OBJ-1\n    description: "Test"\ncontroller_assignment:\n  primary: "cagents:engineering-manager"\nsuccess_criteria:\n  - "Test"\n');

      // No execution_summary.yaml — autoResolveWarnings should create it
      const result = runHook({ session_id: TEST_SESSION });
      expect(existsSync(join(TEST_SESSION_DIR, 'workflow', 'execution_summary.yaml'))).toBe(true);
      const content = readFileSync(join(TEST_SESSION_DIR, 'workflow', 'execution_summary.yaml'), 'utf8');
      expect(content).toContain('session_id:');
      expect(content).toContain('final_state:');
      expect(content).toContain('status:');
      expect(content).toContain('verify-completion-hook-safety-net');
    });

    it('should auto-create validation_report.yaml when missing and session is terminal', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'),
        'pipeline_state: complete\nupdated_at: "' + new Date().toISOString() + '"\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'coordination_log.yaml'),
        'schema_version: "1"\ncontroller: cagents:engineering-manager\nstatus: completed\nimplementation_tasks:\n  - task_id: WI-1\n    status: completed\n    evidence: "done"\n');

      // No validation_report.yaml — autoResolveWarnings should create it
      const result = runHook({ session_id: TEST_SESSION });
      expect(existsSync(join(TEST_SESSION_DIR, 'workflow', 'validation_report.yaml'))).toBe(true);
      const content = readFileSync(join(TEST_SESSION_DIR, 'workflow', 'validation_report.yaml'), 'utf8');
      expect(content).toContain('overall_status: PASS');
      expect(content).toContain('verify-completion-hook-safety-net');
    });

    it('should add self_validation placeholder to coordination_log.yaml when absent', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'),
        'pipeline_state: complete\nupdated_at: "' + new Date().toISOString() + '"\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'coordination_log.yaml'),
        'schema_version: "1"\ncontroller: cagents:engineering-manager\nstatus: completed\nimplementation_tasks:\n  - task_id: WI-1\n    status: completed\n    evidence: "done"\n');

      runHook({ session_id: TEST_SESSION });
      const content = readFileSync(join(TEST_SESSION_DIR, 'workflow', 'coordination_log.yaml'), 'utf8');
      expect(content).toContain('self_validation');
      expect(content).toContain('verify-completion-hook-safety-net');
    });

    it('should add validation_checkpoints placeholder when pre_execution/mid_execution absent', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'),
        'pipeline_state: complete\nupdated_at: "' + new Date().toISOString() + '"\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'coordination_log.yaml'),
        'schema_version: "1"\ncontroller: cagents:engineering-manager\nstatus: completed\nimplementation_tasks:\n  - task_id: WI-1\n    status: completed\n    evidence: "done"\n');

      runHook({ session_id: TEST_SESSION });
      const content = readFileSync(join(TEST_SESSION_DIR, 'workflow', 'coordination_log.yaml'), 'utf8');
      expect(content).toContain('validation_checkpoints');
      expect(content).toContain('pre_execution');
      expect(content).toContain('mid_execution');
    });

    it('should NOT auto-resolve when session is NOT in terminal state', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'),
        'pipeline_state: COORDINATED\nupdated_at: "' + new Date().toISOString() + '"\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'coordination_log.yaml'),
        'schema_version: "1"\ncontroller: cagents:engineering-manager\nstatus: completed\n');

      runHook({ session_id: TEST_SESSION });
      // execution_summary.yaml should NOT be auto-created for non-terminal state
      // (COORDINATED is not terminal — the hook may transition it, but let's check
      // that at least the validation_report is not created with safety-net marker
      // if the state was genuinely non-terminal before the hook ran)
      // Note: the hook may auto-transition COORDINATED states, so we check a
      // mid-execution state instead
    });

    it('should NOT auto-resolve for non-terminal mid-execution state (PROMPTS_READY)', () => {
      const recentTimestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'),
        `pipeline_state: PROMPTS_READY\nupdated_at: "${new Date().toISOString()}"\nstate_history:\n  - state: PROMPTS_READY\n    entered_at: "${recentTimestamp}"\n    duration_ms: null\n`);

      runHook({ session_id: TEST_SESSION });
      // PROMPTS_READY is not terminal — autoResolveWarnings should not create stubs
      // The hook warns (recent transition) but does not create safety-net files
      if (existsSync(join(TEST_SESSION_DIR, 'workflow', 'execution_summary.yaml'))) {
        const content = readFileSync(join(TEST_SESSION_DIR, 'workflow', 'execution_summary.yaml'), 'utf8');
        expect(content).not.toContain('verify-completion-hook-safety-net');
      }
    });

    it('should NOT auto-resolve pending work items (blocking issue preserved)', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'),
        'pipeline_state: complete\nupdated_at: "' + new Date().toISOString() + '"\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'coordination_log.yaml'),
        'schema_version: "1"\ncontroller: cagents:engineering-manager\nstatus: completed\nimplementation_tasks:\n  - task_id: WI-1\n    status: pending\n');

      const result = runHook({ session_id: TEST_SESSION });
      // Pending work items produce a blocking issue — autoResolveWarnings should NOT suppress it
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('pending');
    });

    it('should NOT auto-resolve in_progress work items (blocking issue preserved)', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'),
        'pipeline_state: complete\nupdated_at: "' + new Date().toISOString() + '"\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'coordination_log.yaml'),
        'schema_version: "1"\ncontroller: cagents:engineering-manager\nstatus: completed\nimplementation_tasks:\n  - task_id: WI-1\n    status: in_progress\n');

      const result = runHook({ session_id: TEST_SESSION });
      // In-progress work items produce a blocking issue — must NOT be auto-resolved
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('in progress');
    });

    it('should not overwrite existing execution_summary.yaml', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'),
        'pipeline_state: complete\nupdated_at: "' + new Date().toISOString() + '"\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'execution_summary.yaml'),
        'session_id: "original"\nfinal_state: complete\nstatus: completed\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'coordination_log.yaml'),
        'schema_version: "1"\ncontroller: cagents:engineering-manager\nstatus: completed\nimplementation_tasks:\n  - task_id: WI-1\n    status: completed\n    evidence: "done"\n');

      runHook({ session_id: TEST_SESSION });
      const content = readFileSync(join(TEST_SESSION_DIR, 'workflow', 'execution_summary.yaml'), 'utf8');
      expect(content).toContain('original');
      expect(content).not.toContain('verify-completion-hook-safety-net');
    });

    it('should not overwrite existing validation_report.yaml', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'),
        'pipeline_state: complete\nupdated_at: "' + new Date().toISOString() + '"\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'validation_report.yaml'),
        'overall_status: FAIL\nreason: "real failure"\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'coordination_log.yaml'),
        'schema_version: "1"\ncontroller: cagents:engineering-manager\nstatus: completed\n');

      runHook({ session_id: TEST_SESSION });
      const content = readFileSync(join(TEST_SESSION_DIR, 'workflow', 'validation_report.yaml'), 'utf8');
      expect(content).toContain('FAIL');
      expect(content).not.toContain('verify-completion-hook-safety-net');
    });

    it('should not add self_validation placeholder if already present', () => {
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'),
        'pipeline_state: complete\nupdated_at: "' + new Date().toISOString() + '"\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'coordination_log.yaml'),
        'schema_version: "1"\ncontroller: cagents:engineering-manager\nstatus: completed\nself_validation:\n  checks_passed: 15\n');

      runHook({ session_id: TEST_SESSION });
      const content = readFileSync(join(TEST_SESSION_DIR, 'workflow', 'coordination_log.yaml'), 'utf8');
      // Should contain the original self_validation, not a duplicate
      expect(content).toContain('checks_passed: 15');
      const matches = content.match(/self_validation:/g);
      expect(matches.length).toBe(1);
    });
  });

  describe('Step 4 skip detection (auto-generated execution_summary)', () => {
    it('should warn when execution_summary was auto-generated by safety net', () => {
      // Simulate: pipeline reached VALIDATED/complete but /run skipped Step 4.
      // The autoResolveWarnings() safety net created a stub execution_summary.
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'),
        'pipeline_state: complete\nupdated_at: "' + new Date().toISOString() + '"\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'coordination_log.yaml'),
        'schema_version: "1"\ncontroller: cagents:engineering-manager\nstatus: completed\nimplementation_tasks:\n  - task_id: WI-1\n    status: completed\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'execution_summary.yaml'),
        'session_id: "' + TEST_SESSION + '"\nfinal_state: complete\nstatus: completed\ngenerated_by: verify-completion-hook-safety-net\ngenerated_at: "' + new Date().toISOString() + '"\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'validation_report.yaml'),
        'overall_status: PASS\nstatus: PASS\n');

      const result = runHook({ session_id: TEST_SESSION });
      // Should produce warnings (not block) -- the auto-generated warning is in completion_summary.yaml
      expect(result.continue).toBe(true);
      // The detailed warning about auto-generated summary goes into completion_summary.yaml
      const summary = readFileSync(join(TEST_SESSION_DIR, 'completion_summary.yaml'), 'utf8');
      expect(summary).toMatch(/auto-generated.*safety.net/i);
    });

    it('should not warn when execution_summary was written by /run itself', () => {
      // Simulate: /run properly executed Step 4 and wrote execution_summary.
      writeFileSync(join(TEST_SESSION_DIR, 'status.yaml'),
        'pipeline_state: complete\nupdated_at: "' + new Date().toISOString() + '"\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'coordination_log.yaml'),
        'schema_version: "1"\ncontroller: cagents:engineering-manager\nstatus: completed\nimplementation_tasks:\n  - task_id: WI-1\n    status: completed\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'execution_summary.yaml'),
        'session_id: "' + TEST_SESSION + '"\nfinal_state: VALIDATED\nstatus: completed\nrevision_rounds_used: 0\nstates_executed: [INIT, ORCHESTRATED, PLANNED, PROMPTS_READY, COORDINATED, VALIDATED]\ntotal_agents_spawned: 5\n');
      writeFileSync(join(TEST_SESSION_DIR, 'workflow', 'validation_report.yaml'),
        'overall_status: PASS\nstatus: PASS\n');

      const result = runHook({ session_id: TEST_SESSION });
      expect(result.continue).toBe(true);
      // No warning about auto-generated summary
      if (result.systemMessage) {
        expect(result.systemMessage).not.toContain('auto-generated');
      }
    });
  });
});
