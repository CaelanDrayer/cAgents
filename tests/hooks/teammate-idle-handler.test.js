import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'teammate-idle-handler.cjs');
const AGENT_MEMORY = join(process.cwd(), 'Agent_Memory');
const TEST_SESSION = 'team_test-idle_260317_999';
const SESSION_DIR = join(AGENT_MEMORY, 'sessions', TEST_SESSION);

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('teammate-idle-handler.cjs', () => {
  beforeEach(() => {
    mkdirSync(join(SESSION_DIR, 'team'), { recursive: true });
    writeFileSync(join(SESSION_DIR, 'status.yaml'), 'phase: executing\n');
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

  it('should suggest available work items', () => {
    writeFileSync(join(SESSION_DIR, 'team', 'task_list.yaml'),
      `items:\n  - id: "WI-05"\n    name: "Available task"\n    status: available\n    dependencies: []\n`);
    const result = runHook({ session_id: TEST_SESSION, teammate_name: 'worker-1' });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toContain('WI-05');
    expect(result.systemMessage).toContain('available');
  });

  it('should signal stop when all items completed', () => {
    writeFileSync(join(SESSION_DIR, 'team', 'task_list.yaml'),
      `items:\n  - id: "WI-01"\n    name: "Done task"\n    status: completed\n    dependencies: []\n  - id: "WI-02"\n    name: "Done task 2"\n    status: completed\n    dependencies: []\n`);
    const result = runHook({ session_id: TEST_SESSION, teammate_name: 'worker-1' });
    expect(result.continue).toBe(false);
    expect(result.stopReason).toContain('completed');
  });

  it('should pass through when no available work but not all complete', () => {
    writeFileSync(join(SESSION_DIR, 'team', 'task_list.yaml'),
      `items:\n  - id: "WI-01"\n    name: "In progress"\n    status: in_progress\n    claimed_by: "other"\n    dependencies: []\n`);
    const result = runHook({ session_id: TEST_SESSION, teammate_name: 'worker-1' });
    expect(result.continue).toBe(true);
  });

  it('should not suggest items blocked by dependencies', () => {
    writeFileSync(join(SESSION_DIR, 'team', 'task_list.yaml'),
      `items:\n  - id: "WI-01"\n    name: "Blocker"\n    status: in_progress\n    dependencies: []\n  - id: "WI-02"\n    name: "Blocked"\n    status: available\n    dependencies: ["WI-01"]\n`);
    const result = runHook({ session_id: TEST_SESSION, teammate_name: 'worker-1' });
    // WI-02 is blocked by WI-01 (in_progress), so no available items
    expect(result.continue).toBe(true);
    // Should not suggest WI-02 since its dependency is not completed
    if (result.systemMessage) {
      expect(result.systemMessage).not.toContain('WI-02');
    }
  });
});
