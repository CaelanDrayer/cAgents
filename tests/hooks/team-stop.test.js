import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'team-stop.cjs');
const AGENT_MEMORY = join(process.cwd(), 'cagents-memory');
const TEST_SESSION = 'team_test-stop_260317_999';
const SESSION_DIR = join(AGENT_MEMORY, 'sessions', TEST_SESSION);

function runHook(input, opts = {}) {
  try {
    const result = execSync(
      `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
      { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, CAGENTS_ACTIVE_SESSION: '' } }
    );
    return JSON.parse(result.trim());
  } catch (e) {
    if (e.stdout) return JSON.parse(e.stdout.toString().trim());
    throw e;
  }
}

describe('team-stop.cjs', () => {
  beforeEach(() => {
    mkdirSync(join(SESSION_DIR, 'team', 'metrics'), { recursive: true });
    writeFileSync(join(SESSION_DIR, 'status.yaml'),
      'phase: executing\ncreated_at: "2026-03-17T10:00:00Z"\ncompleted_at: null\nresult: null\n');
    writeFileSync(join(SESSION_DIR, 'team', 'metrics', 'timing.yaml'),
      '# Team Timing Metrics\nsession_id: ' + TEST_SESSION + '\nstarted_at: "2026-03-17T10:00:00Z"\ncompleted_at: null\ntotal_duration_seconds: 0\n');
  });

  afterEach(() => {
    rmSync(SESSION_DIR, { recursive: true, force: true });
  });

  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return continue true when no team session found', () => {
    rmSync(SESSION_DIR, { recursive: true, force: true });
    const result = runHook({});
    expect(result.continue).toBe(true);
  });

  it('should finalize timing metrics with completed_at', () => {
    runHook({ session_id: TEST_SESSION });
    const timing = readFileSync(join(SESSION_DIR, 'team', 'metrics', 'timing.yaml'), 'utf8');
    expect(timing).not.toContain('completed_at: null');
    expect(timing).toMatch(/completed_at: "\d{4}-\d{2}-\d{2}/);
  });

  it('should update status to completed', () => {
    runHook({ session_id: TEST_SESSION });
    const status = readFileSync(join(SESSION_DIR, 'status.yaml'), 'utf8');
    expect(status).toContain('phase: completed');
  });

  it('should update pipeline_state to VALIDATED when status uses pipeline_state field', () => {
    // Simulate a /act session that writes pipeline_state instead of phase
    writeFileSync(join(SESSION_DIR, 'status.yaml'),
      'pipeline_state: COORDINATED\ncreated_at: "2026-03-17T10:00:00Z"\ncompleted_at: null\nresult: null\n');
    runHook({ session_id: TEST_SESSION });
    const status = readFileSync(join(SESSION_DIR, 'status.yaml'), 'utf8');
    expect(status).toContain('pipeline_state: VALIDATED');
  });

  it('should handle status with both phase and pipeline_state fields', () => {
    writeFileSync(join(SESSION_DIR, 'status.yaml'),
      'phase: executing\npipeline_state: COORDINATED\ncreated_at: "2026-03-17T10:00:00Z"\ncompleted_at: null\nresult: null\n');
    runHook({ session_id: TEST_SESSION });
    const status = readFileSync(join(SESSION_DIR, 'status.yaml'), 'utf8');
    expect(status).toContain('phase: completed');
    expect(status).toContain('pipeline_state: VALIDATED');
  });

  it('should report result: success (not partial) when no task_list.yaml exists (non-team session)', () => {
    // No task_list.yaml is written — simulates a /act session (not a team session)
    // The status.yaml has result: null which should become result: success
    runHook({ session_id: TEST_SESSION });
    const status = readFileSync(join(SESSION_DIR, 'status.yaml'), 'utf8');
    expect(status).toContain('result: success');
    expect(status).not.toContain('result: partial');
  });

  it('should return summary with work item counts', () => {
    const result = runHook({ session_id: TEST_SESSION });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toContain('Team Session Complete');
    expect(result.systemMessage).toContain('Duration');
  });

  describe('execution_summary.yaml generation', () => {
    it('should generate execution_summary.yaml when missing', () => {
      runHook({ session_id: TEST_SESSION });
      const summaryPath = join(SESSION_DIR, 'workflow', 'execution_summary.yaml');
      expect(existsSync(summaryPath)).toBe(true);
      const content = readFileSync(summaryPath, 'utf8');
      expect(content).toContain('session_id:');
      expect(content).toContain('final_state:');
      expect(content).toContain('status:');
      expect(content).toContain('agent_count:');
      expect(content).toContain('duration_seconds:');
      expect(content).toContain('started_at:');
      expect(content).toContain('completed_at:');
      expect(content).toContain('generated_by: session-stop-hook');
    });

    it('should not overwrite existing execution_summary.yaml', () => {
      mkdirSync(join(SESSION_DIR, 'workflow'), { recursive: true });
      writeFileSync(join(SESSION_DIR, 'workflow', 'execution_summary.yaml'),
        'session_id: "existing"\ngenerated_by: run-skill\n');
      runHook({ session_id: TEST_SESSION });
      const content = readFileSync(join(SESSION_DIR, 'workflow', 'execution_summary.yaml'), 'utf8');
      expect(content).toContain('generated_by: run-skill');
      expect(content).not.toContain('generated_by: session-stop-hook');
    });

    it('should include agent count from agent_tree.yaml', () => {
      mkdirSync(join(SESSION_DIR, 'workflow'), { recursive: true });
      writeFileSync(join(SESSION_DIR, 'workflow', 'agent_tree.yaml'),
        'agents:\n- agent_id: "a1"\n  type: backend-developer\n- agent_id: "a2"\n  type: reviewer\n- agent_id: "a3"\n  type: qa-lead\n');
      runHook({ session_id: TEST_SESSION });
      const content = readFileSync(join(SESSION_DIR, 'workflow', 'execution_summary.yaml'), 'utf8');
      expect(content).toContain('agent_count: 3');
    });

    it('should use pipeline_state for final_state when available', () => {
      writeFileSync(join(SESSION_DIR, 'status.yaml'),
        'pipeline_state: COORDINATED\ncreated_at: "2026-03-17T10:00:00Z"\ncompleted_at: null\nresult: null\n');
      runHook({ session_id: TEST_SESSION });
      const content = readFileSync(join(SESSION_DIR, 'workflow', 'execution_summary.yaml'), 'utf8');
      expect(content).toContain('final_state: COORDINATED');
    });

    it('should work for run_ session prefix', () => {
      const runSession = 'act_test-summary_260317_999';
      const runDir = join(AGENT_MEMORY, 'sessions', runSession);
      mkdirSync(join(runDir, 'workflow'), { recursive: true });
      writeFileSync(join(runDir, 'status.yaml'),
        'pipeline_state: VALIDATED\nsession_id: "' + runSession + '"\ncreated_at: "2026-03-17T10:00:00Z"\ncompleted_at: null\nresult: null\n');
      try {
        runHook({ session_id: runSession });
        const summaryPath = join(runDir, 'workflow', 'execution_summary.yaml');
        expect(existsSync(summaryPath)).toBe(true);
        const content = readFileSync(summaryPath, 'utf8');
        expect(content).toContain(`session_id: "${runSession}"`);
        expect(content).toContain('final_state: VALIDATED');
      } finally {
        rmSync(runDir, { recursive: true, force: true });
      }
    });

    it('should set status to failed when result is failed', () => {
      writeFileSync(join(SESSION_DIR, 'status.yaml'),
        'phase: failed\ncreated_at: "2026-03-17T10:00:00Z"\ncompleted_at: null\nresult: failed\n');
      runHook({ session_id: TEST_SESSION });
      const content = readFileSync(join(SESSION_DIR, 'workflow', 'execution_summary.yaml'), 'utf8');
      expect(content).toContain('status: failed');
    });
  });
});
