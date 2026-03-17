import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'subagent-stop-tracker.cjs');
const AGENT_MEMORY = join(process.cwd(), 'Agent_Memory');
const TEST_SESSION = 'run_test-stop-track_260317_999';
const SESSION_DIR = join(AGENT_MEMORY, 'sessions', TEST_SESSION);

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

const AGENT_TREE_CONTENT = `# Agent Tree
agents:
  - id: "agent-123"
    type: "general-purpose"
    parent: "root"
    depth: 1
    spawned_at: "2026-03-17T10:00:00Z"
    stopped_at: null
`;

describe('subagent-stop-tracker.cjs', () => {
  beforeEach(() => {
    mkdirSync(join(SESSION_DIR, 'workflow'), { recursive: true });
    mkdirSync(join(AGENT_MEMORY, '_system', 'logs'), { recursive: true });
    writeFileSync(join(SESSION_DIR, 'status.yaml'), 'phase: executing\npipeline_state: COORDINATED\n');
    writeFileSync(join(SESSION_DIR, 'workflow', 'agent_tree.yaml'), AGENT_TREE_CONTENT);
  });

  afterEach(() => {
    rmSync(SESSION_DIR, { recursive: true, force: true });
    // Clean up lock files if any
    try { rmSync(join(SESSION_DIR, 'workflow', 'agent_tree.yaml.lock'), { recursive: true, force: true }); } catch {}
  });

  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return continue true (always passes through)', () => {
    const result = runHook({ agent_id: 'agent-123', agent_type: 'test', session_id: TEST_SESSION });
    expect(result.continue).toBe(true);
  });

  it('should update stopped_at in agent_tree.yaml', () => {
    runHook({ agent_id: 'agent-123', agent_type: 'test', session_id: TEST_SESSION });
    const tree = readFileSync(join(SESSION_DIR, 'workflow', 'agent_tree.yaml'), 'utf8');
    expect(tree).not.toContain('stopped_at: null');
    expect(tree).toMatch(/stopped_at: "\d{4}-\d{2}-\d{2}/);
  });

  it('should calculate duration_seconds from spawned_at', () => {
    runHook({ agent_id: 'agent-123', agent_type: 'test', session_id: TEST_SESSION });
    const tree = readFileSync(join(SESSION_DIR, 'workflow', 'agent_tree.yaml'), 'utf8');
    expect(tree).toContain('duration_seconds:');
  });

  it('should capture completion_summary from last_assistant_message', () => {
    runHook({
      agent_id: 'agent-123',
      agent_type: 'test',
      session_id: TEST_SESSION,
      last_assistant_message: 'Successfully implemented the auth module with JWT tokens.'
    });
    const tree = readFileSync(join(SESSION_DIR, 'workflow', 'agent_tree.yaml'), 'utf8');
    expect(tree).toContain('completion_summary');
    expect(tree).toContain('outcome:');
  });

  it('should append to global audit log', () => {
    runHook({ agent_id: 'agent-123', agent_type: 'test', session_id: TEST_SESSION });
    const logFile = join(AGENT_MEMORY, '_system', 'logs', 'agent_spawns.log');
    expect(existsSync(logFile)).toBe(true);
    const logContent = readFileSync(logFile, 'utf8');
    expect(logContent).toContain('agent-123');
    expect(logContent).toContain('event=stop');
  });
});
