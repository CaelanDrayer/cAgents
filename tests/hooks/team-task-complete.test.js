import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'team-task-complete.cjs');
const AGENT_MEMORY = join(process.cwd(), 'Agent_Memory');
const TEST_SESSION = 'team_test-complete_260317_999';
const SESSION_DIR = join(AGENT_MEMORY, 'sessions', TEST_SESSION);

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

const TASK_LIST_CONTENT = `# Task List
summary:
  total: 3
  completed: 0
  in_progress: 1
  available: 2
  updated_at: "2026-03-17T10:00:00Z"

items:
  - id: "WI-01"
    name: "First task"
    status: in_progress
    claimed_by: "worker-1"
    completed_at: null
    dependencies: []
  - id: "WI-02"
    name: "Second task"
    status: available
    claimed_by: null
    completed_at: null
    dependencies: ["WI-01"]
  - id: "WI-03"
    name: "Third task"
    status: available
    claimed_by: null
    completed_at: null
    dependencies: []
`;

describe('team-task-complete.cjs', () => {
  beforeEach(() => {
    mkdirSync(join(SESSION_DIR, 'team', 'metrics'), { recursive: true });
    mkdirSync(join(SESSION_DIR, 'team', 'messages'), { recursive: true });
    writeFileSync(join(SESSION_DIR, 'status.yaml'), 'phase: executing\n');
    writeFileSync(join(SESSION_DIR, 'team', 'task_list.yaml'), TASK_LIST_CONTENT);
    writeFileSync(join(SESSION_DIR, 'team', 'metrics', 'timing.yaml'),
      'started_at: "2026-03-17T10:00:00Z"\nwork_items: {}\n');
  });

  afterEach(() => {
    rmSync(SESSION_DIR, { recursive: true, force: true });
  });

  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return continue true when no team session', () => {
    rmSync(SESSION_DIR, { recursive: true, force: true });
    const result = runHook({});
    expect(result.continue).toBe(true);
  });

  it('should return continue true when no work item ID found', () => {
    const result = runHook({ session_id: TEST_SESSION, task_subject: 'no wi pattern' });
    expect(result.continue).toBe(true);
  });

  it('should update task status to completed', () => {
    runHook({ session_id: TEST_SESSION, task_subject: 'WI-01 done', teammate_name: 'w1' });
    const content = readFileSync(join(SESSION_DIR, 'team', 'task_list.yaml'), 'utf8');
    // Check the WI-01 entry has status completed
    const wi01Block = content.split('- id:').find(b => b.includes('"WI-01"'));
    expect(wi01Block).toContain('completed');
  });

  it('should report newly unblocked dependencies', () => {
    const result = runHook({ session_id: TEST_SESSION, task_subject: 'WI-01 done', teammate_name: 'w1' });
    // WI-02 depends on WI-01, should be unblocked
    expect(result.systemMessage).toContain('WI-02');
    expect(result.systemMessage).toContain('Unblocked');
  });

  it('should write completion message file', () => {
    runHook({ session_id: TEST_SESSION, task_subject: 'WI-01 done', teammate_name: 'worker-1' });
    const messagesDir = join(SESSION_DIR, 'team', 'messages');
    const files = require('fs').readdirSync(messagesDir);
    const completionFiles = files.filter(f => f.includes('WI-01'));
    expect(completionFiles.length).toBeGreaterThan(0);
  });

  it('should update timing metrics', () => {
    runHook({ session_id: TEST_SESSION, task_subject: 'WI-01 done', teammate_name: 'w1' });
    const timing = readFileSync(join(SESSION_DIR, 'team', 'metrics', 'timing.yaml'), 'utf8');
    expect(timing).toContain('WI-01');
  });

  it('should signal stop when all items complete', () => {
    // Set all items to completed except WI-01
    let content = TASK_LIST_CONTENT
      .replace(/status: available/g, 'status: completed')
      .replace('completed: 0', 'completed: 2');
    writeFileSync(join(SESSION_DIR, 'team', 'task_list.yaml'), content);

    const result = runHook({ session_id: TEST_SESSION, task_subject: 'WI-01 done', teammate_name: 'w1' });
    expect(result.continue).toBe(false);
    expect(result.stopReason).toContain('completed');
  });

  it('should not signal stop when pending or blocked items remain', () => {
    // task_list with one in_progress (WI-01), one pending (WI-02), one blocked (WI-03)
    const content = `# Task List
summary:
  total: 3
  completed: 0
  in_progress: 1
  available: 0
  updated_at: "2026-03-25T10:00:00Z"

items:
  - id: "WI-01"
    name: "First task"
    status: in_progress
    claimed_by: "worker-1"
    completed_at: null
    dependencies: []
  - id: "WI-02"
    name: "Second task"
    status: pending
    claimed_by: null
    completed_at: null
    dependencies: []
  - id: "WI-03"
    name: "Third task"
    status: blocked
    claimed_by: null
    completed_at: null
    dependencies: ["WI-02"]
`;
    writeFileSync(join(SESSION_DIR, 'team', 'task_list.yaml'), content);

    const result = runHook({ session_id: TEST_SESSION, task_subject: 'WI-01 done', teammate_name: 'w1' });
    // totalCount must be 3 (1 completed + 0 in_progress + 0 available + 1 pending + 1 blocked)
    // completedCount (1) !== totalCount (3) => must NOT stop
    expect(result.continue).toBe(true);
    expect(result.stopReason).toBeUndefined();
    // systemMessage should show 1/3, not 1/1
    expect(result.systemMessage).toContain('1/3');
  });

  it('should create task_list.yaml when file does not exist', () => {
    // Remove the task_list.yaml file
    rmSync(join(SESSION_DIR, 'team', 'task_list.yaml'));
    const result = runHook({ session_id: TEST_SESSION, task_subject: 'WI-01 done', teammate_name: 'w1' });
    // File should be created
    expect(existsSync(join(SESSION_DIR, 'team', 'task_list.yaml'))).toBe(true);
    const content = readFileSync(join(SESSION_DIR, 'team', 'task_list.yaml'), 'utf8');
    expect(content).toContain('task_id: "WI-01"');
    expect(content).toContain('status: completed');
    expect(content).toContain('completed_at:');
    expect(content).toContain('subject:');
    // With only 1 item total and it's completed, hook signals stop
    expect(result.continue).toBe(false);
    expect(result.stopReason).toContain('1/1');
  });

  it('should append to completions when entry not in structured list', () => {
    // WI-99 is not in the task list
    const result = runHook({ session_id: TEST_SESSION, task_subject: 'WI-99 done', teammate_name: 'w1' });
    const content = readFileSync(join(SESSION_DIR, 'team', 'task_list.yaml'), 'utf8');
    expect(content).toContain('task_id: "WI-99"');
    expect(content).toContain('status: completed');
    expect(content).toContain('completions:');
  });

  it('should persist task_subject in task_list.yaml', () => {
    rmSync(join(SESSION_DIR, 'team', 'task_list.yaml'));
    runHook({ session_id: TEST_SESSION, task_subject: 'WI-01 Implement auth module', teammate_name: 'w1' });
    const content = readFileSync(join(SESSION_DIR, 'team', 'task_list.yaml'), 'utf8');
    expect(content).toContain('subject: "WI-01 Implement auth module"');
  });

  it('should handle special characters in task IDs', () => {
    // Use a task list with a special-char ID
    const specialContent = TASK_LIST_CONTENT.replace('"WI-01"', '"WI-01.a"')
      .replace('WI-01', 'WI-01.a');
    writeFileSync(join(SESSION_DIR, 'team', 'task_list.yaml'), specialContent);
    // Should not crash - the regex escaping should handle the dot
    const result = runHook({ session_id: TEST_SESSION, task_subject: 'WI-01.a done', teammate_name: 'w1' });
    // May or may not find it depending on pattern, but should not throw
    expect(result).toBeDefined();
  });
});
