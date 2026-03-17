import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'team-stop.cjs');
const AGENT_MEMORY = join(process.cwd(), 'Agent_Memory');
const TEST_SESSION = 'team_test-stop_260317_999';
const SESSION_DIR = join(AGENT_MEMORY, 'sessions', TEST_SESSION);

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
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

  it('should return summary with work item counts', () => {
    const result = runHook({ session_id: TEST_SESSION });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toContain('Team Session Complete');
    expect(result.systemMessage).toContain('Duration');
  });
});
