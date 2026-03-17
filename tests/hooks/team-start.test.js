import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'team-start.cjs');
const AGENT_MEMORY = join(process.cwd(), 'Agent_Memory');
const TEST_SESSION = 'team_test-start_260317_999';
const SESSION_DIR = join(AGENT_MEMORY, 'sessions', TEST_SESSION);

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('team-start.cjs', () => {
  beforeEach(() => {
    mkdirSync(SESSION_DIR, { recursive: true });
    writeFileSync(join(SESSION_DIR, 'status.yaml'), 'phase: executing\ncreated_at: "2026-03-17T10:00:00Z"\n');
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

  it('should create team directory structure', () => {
    runHook({ session_id: TEST_SESSION });
    expect(existsSync(join(SESSION_DIR, 'team'))).toBe(true);
    expect(existsSync(join(SESSION_DIR, 'team', 'messages'))).toBe(true);
    expect(existsSync(join(SESSION_DIR, 'team', 'metrics'))).toBe(true);
  });

  it('should initialize timing metrics file', () => {
    runHook({ session_id: TEST_SESSION });
    const timingFile = join(SESSION_DIR, 'team', 'metrics', 'timing.yaml');
    expect(existsSync(timingFile)).toBe(true);
    const content = readFileSync(timingFile, 'utf8');
    expect(content).toContain('session_id:');
    expect(content).toContain('started_at:');
    expect(content).toContain('phases:');
  });

  it('should initialize parallelism metrics file', () => {
    runHook({ session_id: TEST_SESSION });
    const parallelismFile = join(SESSION_DIR, 'team', 'metrics', 'parallelism.yaml');
    expect(existsSync(parallelismFile)).toBe(true);
    const content = readFileSync(parallelismFile, 'utf8');
    expect(content).toContain('parallelism_score');
    expect(content).toContain('wave_stats');
  });

  it('should return SubagentStart hook event with context', () => {
    const result = runHook({ session_id: TEST_SESSION });
    expect(result.hookSpecificOutput).toBeDefined();
    expect(result.hookSpecificOutput.hookEventName).toBe('SubagentStart');
    expect(result.hookSpecificOutput.additionalContext).toBeDefined();
  });
});
