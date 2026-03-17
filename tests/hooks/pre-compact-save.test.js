import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'pre-compact-save.cjs');
const AGENT_MEMORY = join(process.cwd(), 'Agent_Memory');
const TEST_SESSION = 'run_test-compact_260317_999';
const SESSION_DIR = join(AGENT_MEMORY, 'sessions', TEST_SESSION);

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('pre-compact-save.cjs', () => {
  beforeEach(() => {
    mkdirSync(join(SESSION_DIR, 'workflow'), { recursive: true });
    writeFileSync(join(SESSION_DIR, 'status.yaml'), 'phase: coordinating\npipeline_state: PROMPTS_READY\n');
    writeFileSync(join(SESSION_DIR, 'workflow', 'plan.yaml'),
      'mission: "Build auth system"\ndomain: engineering\ntier: 3\n');
  });

  afterEach(() => {
    rmSync(SESSION_DIR, { recursive: true, force: true });
  });

  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return continue true when no active session', () => {
    rmSync(SESSION_DIR, { recursive: true, force: true });
    const result = runHook({});
    expect(result.continue).toBe(true);
  });

  it('should create waypoint file in waypoints directory', () => {
    runHook({ session_id: TEST_SESSION });
    const waypointsDir = join(SESSION_DIR, 'waypoints');
    expect(existsSync(waypointsDir)).toBe(true);
    const files = readdirSync(waypointsDir);
    expect(files.length).toBeGreaterThan(0);
    expect(files[0]).toMatch(/^wp-compact-/);
  });

  it('should include phase in waypoint', () => {
    runHook({ session_id: TEST_SESSION });
    const waypointsDir = join(SESSION_DIR, 'waypoints');
    const files = readdirSync(waypointsDir);
    const content = readFileSync(join(waypointsDir, files[0]), 'utf8');
    expect(content).toContain('phase: coordinating');
  });

  it('should include 5-question reboot check', () => {
    runHook({ session_id: TEST_SESSION });
    const waypointsDir = join(SESSION_DIR, 'waypoints');
    const files = readdirSync(waypointsDir);
    const content = readFileSync(join(waypointsDir, files[0]), 'utf8');
    expect(content).toContain('reboot_check');
    expect(content).toContain('where_am_i');
    expect(content).toContain('where_going');
    expect(content).toContain('whats_the_goal');
    expect(content).toContain('what_learned');
    expect(content).toContain('what_done');
  });

  it('should include recovery instructions', () => {
    runHook({ session_id: TEST_SESSION });
    const waypointsDir = join(SESSION_DIR, 'waypoints');
    const files = readdirSync(waypointsDir);
    const content = readFileSync(join(waypointsDir, files[0]), 'utf8');
    expect(content).toContain('recovery');
    expect(content).toContain('resume_phase');
    expect(content).toContain('next_action');
  });

  it('should include plan info when available', () => {
    runHook({ session_id: TEST_SESSION });
    const waypointsDir = join(SESSION_DIR, 'waypoints');
    const files = readdirSync(waypointsDir);
    const content = readFileSync(join(waypointsDir, files[0]), 'utf8');
    expect(content).toContain('tier: 3');
    expect(content).toContain('domain: engineering');
  });

  it('should return systemMessage with waypoint info', () => {
    const result = runHook({ session_id: TEST_SESSION });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toContain('Workflow state saved');
    expect(result.systemMessage).toContain('coordinating');
  });
});
