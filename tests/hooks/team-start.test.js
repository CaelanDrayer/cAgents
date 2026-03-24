import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'team-start.cjs');
const TEST_SESSION = 'team_test-start_260317_999';

function runHook(input, env = {}) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    }
  );
  return JSON.parse(result.trim());
}

describe('team-start.cjs', () => {
  let tmpDir;
  let sessionDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'team-start-test-'));
    sessionDir = join(tmpDir, 'Agent_Memory', 'sessions', TEST_SESSION);
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(
      join(sessionDir, 'status.yaml'),
      'phase: executing\ncreated_at: "2026-03-17T10:00:00Z"\n'
    );
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return continue true when no team session found', () => {
    rmSync(sessionDir, { recursive: true, force: true });
    const result = runHook({}, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.continue).toBe(true);
  });

  it('should create team directory structure', () => {
    runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(existsSync(join(sessionDir, 'team'))).toBe(true);
    expect(existsSync(join(sessionDir, 'team', 'messages'))).toBe(true);
    expect(existsSync(join(sessionDir, 'team', 'metrics'))).toBe(true);
  });

  it('should initialize timing metrics file', () => {
    runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const timingFile = join(sessionDir, 'team', 'metrics', 'timing.yaml');
    expect(existsSync(timingFile)).toBe(true);
    const content = readFileSync(timingFile, 'utf8');
    expect(content).toContain('session_id:');
    expect(content).toContain('started_at:');
    expect(content).toContain('phases:');
  });

  it('should initialize parallelism metrics file', () => {
    runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const parallelismFile = join(sessionDir, 'team', 'metrics', 'parallelism.yaml');
    expect(existsSync(parallelismFile)).toBe(true);
    const content = readFileSync(parallelismFile, 'utf8');
    expect(content).toContain('parallelism_score');
    expect(content).toContain('wave_stats');
  });

  it('should return SubagentStart hook event with context', () => {
    const result = runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.hookSpecificOutput).toBeDefined();
    expect(result.hookSpecificOutput.hookEventName).toBe('SubagentStart');
    expect(result.hookSpecificOutput.additionalContext).toBeDefined();
  });
});
