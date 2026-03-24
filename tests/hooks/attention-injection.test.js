import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'attention-injection.cjs');
const TEST_SESSION = 'run_test-attention_260317_999';

function runHook(input, env = {}) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ...env } }
  );
  return JSON.parse(result.trim());
}

describe('attention-injection.cjs', () => {
  let tmpDir;
  let sessionDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'attention-injection-test-'));
    sessionDir = join(tmpDir, 'Agent_Memory', 'sessions', TEST_SESSION);
    mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
    writeFileSync(join(sessionDir, 'status.yaml'), 'phase: executing\npipeline_state: COORDINATED\n');
    writeFileSync(join(sessionDir, 'workflow', 'plan.yaml'),
      'mission: "Fix authentication bug"\ndomain: engineering\nprimary: engineering-manager\ntier: 2\n');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return continue true for non-matching tools', () => {
    const result = runHook({ tool_name: 'Read', session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.continue).toBe(true);
  });

  it('should inject plan summary for Write tool', () => {
    const result = runHook({ tool_name: 'Write', session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toContain('Goal Refresh');
    expect(result.systemMessage).toContain('Fix authentication bug');
  });

  it('should inject for Edit tool', () => {
    const result = runHook({ tool_name: 'Edit', session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.systemMessage).toContain('Goal Refresh');
  });

  it('should inject for Bash tool', () => {
    const result = runHook({ tool_name: 'Bash', session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.systemMessage).toContain('Goal Refresh');
  });

  it('should include domain and controller in reminder', () => {
    const result = runHook({ tool_name: 'Write', session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.systemMessage).toContain('engineering');
    expect(result.systemMessage).toContain('engineering-manager');
  });

  it('should include coordination status when available', () => {
    writeFileSync(join(sessionDir, 'workflow', 'coordination_log.yaml'),
      'status: in_progress\ncontroller: engineering-manager\n');
    const result = runHook({ tool_name: 'Write', session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.systemMessage).toContain('Coordination');
  });

  it('should return no-op when no active session', () => {
    rmSync(sessionDir, { recursive: true, force: true });
    // Pass a non-existent session_id to avoid fallback scan finding other sessions on disk
    const result = runHook({ tool_name: 'Write', session_id: 'run_nonexistent_999999_999' }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeUndefined();
  });

  it('should return no-op when no plan.yaml exists', () => {
    rmSync(join(sessionDir, 'workflow', 'plan.yaml'), { force: true });
    const result = runHook({ tool_name: 'Write', session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeUndefined();
  });

  it('should respect MAX_ATTENTION_CHARS budget', () => {
    // Write a very long mission to test truncation
    const longMission = 'A'.repeat(600);
    writeFileSync(join(sessionDir, 'workflow', 'plan.yaml'),
      `mission: "${longMission}"\ndomain: engineering\nprimary: engineering-manager\n`);
    const result = runHook({ tool_name: 'Write', session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.systemMessage.length).toBeLessThanOrEqual(500);
  });
});
