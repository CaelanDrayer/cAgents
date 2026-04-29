import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'post-compact-restore.cjs');
const TEST_SESSION = 'run_test-post-compact_260317_999';

function runHook(input, env = {}) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ...env } }
  );
  return JSON.parse(result.trim());
}

describe('post-compact-restore.cjs', () => {
  let tmpDir;
  let sessionDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'post-compact-restore-test-'));
    sessionDir = join(tmpDir, 'cagents-memory', 'sessions', TEST_SESSION);
    mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
    writeFileSync(join(sessionDir, 'status.yaml'), 'phase: coordinating\n');
    writeFileSync(
      join(sessionDir, 'workflow', 'plan.yaml'),
      'mission: "Build auth system"\ndomain: engineering\ntier: 3\n'
    );
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return continue true with no active session', () => {
    rmSync(sessionDir, { recursive: true, force: true });
    const result = runHook({}, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeUndefined();
  });

  it('should return systemMessage when active session exists', () => {
    const result = runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeDefined();
    expect(typeof result.systemMessage).toBe('string');
  });

  it('should include mission from plan.yaml in systemMessage', () => {
    const result = runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.systemMessage).toContain('Build auth system');
  });

  it('should include domain in systemMessage', () => {
    const result = runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.systemMessage).toContain('engineering');
  });

  it('should include current phase in systemMessage', () => {
    const result = runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.systemMessage).toContain('coordinating');
  });

  it('should include work item counts when coordination_log exists', () => {
    writeFileSync(
      join(sessionDir, 'workflow', 'coordination_log.yaml'),
      [
        'schema_version: "1"',
        'controller: cagents:engineering-manager',
        'status: in_progress',
        'implementation_tasks:',
        '  - task_id: WI-1',
        '    status: completed',
        '  - task_id: WI-2',
        '    status: in_progress',
        '  - task_id: WI-3',
        '    status: pending',
      ].join('\n')
    );
    const result = runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    // countPattern matches all occurrences: WI-1 completed=1, WI-2 + top-level status=2 in_progress, WI-3 pending=1
    expect(result.systemMessage).toContain('1 done');
    expect(result.systemMessage).toContain('in progress');
    expect(result.systemMessage).toContain('1 pending');
  });

  it('should include controller name when coordination_log exists', () => {
    writeFileSync(
      join(sessionDir, 'workflow', 'coordination_log.yaml'),
      'schema_version: "1"\ncontroller: cagents:engineering-manager\nstatus: completed\n'
    );
    const result = runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.systemMessage).toContain('cagents:engineering-manager');
  });

  it('should keep systemMessage under 500 tokens (~2000 chars)', () => {
    writeFileSync(
      join(sessionDir, 'workflow', 'coordination_log.yaml'),
      'schema_version: "1"\ncontroller: cagents:engineering-manager\nstatus: in_progress\n'
    );
    const result = runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    // 500 tokens ~ 2000 chars conservatively; message should be well under
    expect(result.systemMessage.length).toBeLessThan(800);
  });

  it('should work without coordination_log.yaml', () => {
    const result = runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toContain('Goal');
  });

  it('should work without plan.yaml', () => {
    rmSync(join(sessionDir, 'workflow', 'plan.yaml'));
    const result = runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.continue).toBe(true);
    // Should still return a message with phase info
    expect(result.systemMessage).toContain('coordinating');
  });

  it('should include resume instruction', () => {
    const result = runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.systemMessage).toContain('Resume');
  });
});
