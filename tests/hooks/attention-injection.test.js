import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'attention-injection.cjs');
const AGENT_MEMORY = join(process.cwd(), 'Agent_Memory');
const TEST_SESSION = 'run_test-attention_260317_999';
const SESSION_DIR = join(AGENT_MEMORY, 'sessions', TEST_SESSION);

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('attention-injection.cjs', () => {
  beforeEach(() => {
    mkdirSync(join(SESSION_DIR, 'workflow'), { recursive: true });
    writeFileSync(join(SESSION_DIR, 'status.yaml'), 'phase: executing\npipeline_state: COORDINATED\n');
    writeFileSync(join(SESSION_DIR, 'workflow', 'plan.yaml'),
      'mission: "Fix authentication bug"\ndomain: engineering\nprimary: engineering-manager\ntier: 2\n');
  });

  afterEach(() => {
    rmSync(SESSION_DIR, { recursive: true, force: true });
  });

  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return continue true for non-matching tools', () => {
    const result = runHook({ tool_name: 'Read', session_id: TEST_SESSION });
    expect(result.continue).toBe(true);
  });

  it('should inject plan summary for Write tool', () => {
    const result = runHook({ tool_name: 'Write', session_id: TEST_SESSION });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toContain('Goal Refresh');
    expect(result.systemMessage).toContain('Fix authentication bug');
  });

  it('should inject for Edit tool', () => {
    const result = runHook({ tool_name: 'Edit', session_id: TEST_SESSION });
    expect(result.systemMessage).toContain('Goal Refresh');
  });

  it('should inject for Bash tool', () => {
    const result = runHook({ tool_name: 'Bash', session_id: TEST_SESSION });
    expect(result.systemMessage).toContain('Goal Refresh');
  });

  it('should include domain and controller in reminder', () => {
    const result = runHook({ tool_name: 'Write', session_id: TEST_SESSION });
    expect(result.systemMessage).toContain('engineering');
    expect(result.systemMessage).toContain('engineering-manager');
  });

  it('should include coordination status when available', () => {
    writeFileSync(join(SESSION_DIR, 'workflow', 'coordination_log.yaml'),
      'status: in_progress\ncontroller: engineering-manager\n');
    const result = runHook({ tool_name: 'Write', session_id: TEST_SESSION });
    expect(result.systemMessage).toContain('Coordination');
  });

  it('should return no-op when no active session', () => {
    rmSync(SESSION_DIR, { recursive: true, force: true });
    const result = runHook({ tool_name: 'Write' });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeUndefined();
  });

  it('should return no-op when no plan.yaml exists', () => {
    rmSync(join(SESSION_DIR, 'workflow', 'plan.yaml'), { force: true });
    const result = runHook({ tool_name: 'Write', session_id: TEST_SESSION });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeUndefined();
  });

  it('should respect MAX_ATTENTION_CHARS budget', () => {
    // Write a very long mission to test truncation
    const longMission = 'A'.repeat(600);
    writeFileSync(join(SESSION_DIR, 'workflow', 'plan.yaml'),
      `mission: "${longMission}"\ndomain: engineering\nprimary: engineering-manager\n`);
    const result = runHook({ tool_name: 'Write', session_id: TEST_SESSION });
    expect(result.systemMessage.length).toBeLessThanOrEqual(500);
  });
});
