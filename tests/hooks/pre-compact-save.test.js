import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'pre-compact-save.cjs');
const TEST_SESSION = 'act_test-compact_260317_999';

function runHook(input, env = {}) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ...env } }
  );
  return JSON.parse(result.trim());
}

describe('pre-compact-save.cjs', () => {
  let tmpDir;
  let sessionDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pre-compact-save-test-'));
    sessionDir = join(tmpDir, 'cagents-memory', 'sessions', TEST_SESSION);
    mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
    writeFileSync(join(sessionDir, 'status.yaml'), 'phase: coordinating\npipeline_state: PROMPTS_READY\n');
    writeFileSync(join(sessionDir, 'workflow', 'plan.yaml'),
      'mission: "Build auth system"\ndomain: engineering\ntier: 3\n');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return continue true when no active session', () => {
    rmSync(sessionDir, { recursive: true, force: true });
    const result = runHook({}, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.continue).toBe(true);
  });

  it('should create waypoint file in waypoints directory', () => {
    runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const waypointsDir = join(sessionDir, 'waypoints');
    expect(existsSync(waypointsDir)).toBe(true);
    const files = readdirSync(waypointsDir);
    expect(files.length).toBeGreaterThan(0);
    expect(files[0]).toMatch(/^wp-compact-/);
  });

  it('should include phase in waypoint', () => {
    runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const waypointsDir = join(sessionDir, 'waypoints');
    const files = readdirSync(waypointsDir);
    const content = readFileSync(join(waypointsDir, files[0]), 'utf8');
    expect(content).toContain('phase: coordinating');
  });

  it('should include 5-question reboot check', () => {
    runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const waypointsDir = join(sessionDir, 'waypoints');
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
    runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const waypointsDir = join(sessionDir, 'waypoints');
    const files = readdirSync(waypointsDir);
    const content = readFileSync(join(waypointsDir, files[0]), 'utf8');
    expect(content).toContain('recovery');
    expect(content).toContain('resume_phase');
    expect(content).toContain('next_action');
  });

  it('should include plan info when available', () => {
    runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const waypointsDir = join(sessionDir, 'waypoints');
    const files = readdirSync(waypointsDir);
    const content = readFileSync(join(waypointsDir, files[0]), 'utf8');
    expect(content).toContain('tier: 3');
    expect(content).toContain('domain: engineering');
  });

  it('should return continue:true with no systemMessage (thinking-block contract)', () => {
    const result = runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    // thinking-block 400 fix (run_team-thinking-400_260531_001): PreCompact
    // no longer emits systemMessage — it could attach to the to-be-frozen
    // assistant turn's content array, violating Anthropic API thinking-block
    // immutability. The waypoint file (asserted by other tests in this suite)
    // is the authoritative resume artifact. Status text goes to stderr only.
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeUndefined();
  });
});
