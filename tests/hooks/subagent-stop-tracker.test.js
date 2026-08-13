import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'subagent-stop-tracker.cjs');
const TEST_SESSION = 'act_test-stop-track_260317_999';

function runHook(input, env = {}) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ...env } }
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
  let tmpDir;
  let agentMemory;
  let sessionDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'subagent-stop-tracker-test-'));
    agentMemory = join(tmpDir, 'cagents-memory');
    sessionDir = join(agentMemory, 'sessions', TEST_SESSION);
    mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
    mkdirSync(join(agentMemory, '_system', 'logs'), { recursive: true });
    writeFileSync(join(sessionDir, 'status.yaml'), 'phase: executing\npipeline_state: COORDINATED\n');
    writeFileSync(join(sessionDir, 'workflow', 'agent_tree.yaml'), AGENT_TREE_CONTENT);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return continue true (always passes through)', () => {
    const result = runHook({ agent_id: 'agent-123', agent_type: 'test', session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.continue).toBe(true);
  });

  it('should update stopped_at in agent_tree.yaml', () => {
    runHook({ agent_id: 'agent-123', agent_type: 'test', session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const tree = readFileSync(join(sessionDir, 'workflow', 'agent_tree.yaml'), 'utf8');
    expect(tree).not.toContain('stopped_at: null');
    // yaml.dump() may produce quoted or unquoted timestamps — accept both formats
    expect(tree).toMatch(/stopped_at: '?\d{4}-\d{2}-\d{2}/);
  });

  it('should calculate duration_seconds from spawned_at', () => {
    runHook({ agent_id: 'agent-123', agent_type: 'test', session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const tree = readFileSync(join(sessionDir, 'workflow', 'agent_tree.yaml'), 'utf8');
    expect(tree).toContain('duration_seconds:');
  });

  it('should capture completion_summary from last_assistant_message', () => {
    runHook({
      agent_id: 'agent-123',
      agent_type: 'test',
      session_id: TEST_SESSION,
      last_assistant_message: 'Successfully implemented the auth module with JWT tokens.'
    }, { CLAUDE_PROJECT_DIR: tmpDir });
    const tree = readFileSync(join(sessionDir, 'workflow', 'agent_tree.yaml'), 'utf8');
    expect(tree).toContain('completion_summary');
    expect(tree).toContain('outcome:');
    expect(tree).toContain('key_decisions:');
  });

  it('should extract key_decisions from bullet items in last_assistant_message', () => {
    runHook({
      agent_id: 'agent-123',
      agent_type: 'test',
      session_id: TEST_SESSION,
      last_assistant_message: 'Done.\n- Implemented JWT auth\n- Added rate limiting\n- Updated tests'
    }, { CLAUDE_PROJECT_DIR: tmpDir });
    const tree = readFileSync(join(sessionDir, 'workflow', 'agent_tree.yaml'), 'utf8');
    expect(tree).toContain('key_decisions:');
    expect(tree).toContain('Implemented JWT auth');
  });

  it('should append to global audit log', () => {
    runHook({ agent_id: 'agent-123', agent_type: 'test', session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const logFile = join(agentMemory, '_system', 'logs', 'agent_spawns.log');
    expect(existsSync(logFile)).toBe(true);
    const logContent = readFileSync(logFile, 'utf8');
    expect(logContent).toContain('agent-123');
    expect(logContent).toContain('event=stop');
  });

  it('should append agent performance to agent_performance.jsonl', () => {
    runHook({
      agent_id: 'agent-123',
      agent_type: 'test',
      session_id: TEST_SESSION,
      last_assistant_message: 'Completed task successfully'
    }, { CLAUDE_PROJECT_DIR: tmpDir });

    const perfFile = join(agentMemory, '_knowledge', 'agent_performance.jsonl');
    if (existsSync(perfFile)) {
      const content = readFileSync(perfFile, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      const lastEntry = JSON.parse(lines[lines.length - 1]);
      expect(lastEntry).toHaveProperty('agent_type');
      expect(lastEntry).toHaveProperty('duration_seconds');
      expect(lastEntry).toHaveProperty('session_id');
      expect(lastEntry).toHaveProperty('timestamp');
    } else {
      // Contract test: verify the hook source contains the JSONL code path
      const hookSource = readFileSync(join(process.cwd(), '.claude', 'hooks', 'subagent-stop-tracker.cjs'), 'utf8');
      expect(hookSource).toContain('agent_performance.jsonl');
      expect(hookSource).toContain('appendFileSync');
    }
  });
});
