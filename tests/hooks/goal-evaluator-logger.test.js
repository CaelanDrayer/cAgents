import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import os from 'os';

/**
 * Regression test for WI-3 (REC-4) of V11.3.0:
 *
 * .claude/hooks/goal-evaluator-logger.cjs is a Stop hook that captures the
 * latest /goal evaluator reason into the active session's
 * workflow/goal_evaluator_log.yaml so cagents:universal-self-correct can
 * consume it as additional revision signal.
 *
 * Contract:
 *   1. The hook file exists.
 *   2. Empty input (no /goal active) produces {continue: true} and writes nothing.
 *   3. Input with goal.active=true and an evaluator_reason appends a YAML entry
 *      to workflow/goal_evaluator_log.yaml under the session indicated by
 *      CAGENTS_ACTIVE_SESSION.
 *   4. Input with goal.active=false (or missing) does not create the log file.
 *   5. The hook is non-blocking (always returns continue:true).
 *
 * Failing-before / passing-after: at V11.2.16 the file does not exist,
 * so test 1 fails. At V11.3.0 all five tests pass.
 */

const HOOK = join(process.cwd(), '.claude/hooks/goal-evaluator-logger.cjs');

function runHook(input, env = {}) {
  const payload = JSON.stringify(input);
  const result = execSync(`node "${HOOK}"`, {
    input: payload,
    encoding: 'utf8',
    timeout: 5000,
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return JSON.parse(result.trim());
}

describe('goal-evaluator-logger.cjs (WI-3, REC-4)', () => {
  let tmpRoot;
  let sessionId;
  let sessionDir;

  beforeEach(() => {
    // Create an isolated cagents-memory tree per test so hook writes do not
    // leak into the real project sessions directory.
    tmpRoot = join(os.tmpdir(), `cagents-goal-logger-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    sessionId = 'run_test-goal-logger_260513_001';
    sessionDir = join(tmpRoot, 'cagents-memory', 'sessions', sessionId);
    mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
    // Minimal status.yaml so findActiveSession treats this as non-terminal.
    writeFileSync(
      join(sessionDir, 'status.yaml'),
      `session_id: ${sessionId}\npipeline_state: PROMPTS_READY\nstatus: in_progress\n`
    );
  });

  afterEach(() => {
    try { rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('hook file exists', () => {
    expect(existsSync(HOOK)).toBe(true);
  });

  it('returns continue:true on empty input (no /goal active)', () => {
    const result = runHook({}, { CLAUDE_PROJECT_DIR: tmpRoot, CAGENTS_ACTIVE_SESSION: sessionId });
    expect(result.continue).toBe(true);
  });

  it('does NOT create goal_evaluator_log.yaml when /goal inactive', () => {
    runHook({ session_id: sessionId }, { CLAUDE_PROJECT_DIR: tmpRoot, CAGENTS_ACTIVE_SESSION: sessionId });
    const logPath = join(sessionDir, 'workflow', 'goal_evaluator_log.yaml');
    expect(existsSync(logPath)).toBe(false);
  });

  it('appends evaluator reason when /goal active', () => {
    const input = {
      session_id: sessionId,
      goal: {
        active: true,
        condition: 'completion_summary.yaml exists with status: COMPLETED',
        evaluator_reason: 'completion_summary.yaml not yet written; coordination_log still in progress',
        turn: 2,
        evaluator_verdict: 'no',
      },
    };
    const result = runHook(input, { CLAUDE_PROJECT_DIR: tmpRoot, CAGENTS_ACTIVE_SESSION: sessionId });
    expect(result.continue).toBe(true);

    const logPath = join(sessionDir, 'workflow', 'goal_evaluator_log.yaml');
    expect(existsSync(logPath)).toBe(true);

    const log = readFileSync(logPath, 'utf8');
    expect(log).toMatch(/entries:/);
    expect(log).toMatch(/evaluator_reason: "completion_summary\.yaml not yet written/);
    expect(log).toMatch(/turn: 2/);
    expect(log).toMatch(/verdict: "no"/);
  });

  it('handles goal_state shape (alternative payload schema)', () => {
    const input = {
      session_id: sessionId,
      goal_state: {
        active: true,
        condition: 'all tests pass',
        evaluator_reason: 'two test failures remain in tests/skills/',
      },
    };
    runHook(input, { CLAUDE_PROJECT_DIR: tmpRoot, CAGENTS_ACTIVE_SESSION: sessionId });
    const logPath = join(sessionDir, 'workflow', 'goal_evaluator_log.yaml');
    expect(existsSync(logPath)).toBe(true);
    const log = readFileSync(logPath, 'utf8');
    expect(log).toMatch(/two test failures remain/);
  });

  it('appends multiple entries on repeated Stop events', () => {
    const base = {
      session_id: sessionId,
      goal: { active: true, condition: 'cond', evaluator_reason: 'r1' },
    };
    runHook(base, { CLAUDE_PROJECT_DIR: tmpRoot, CAGENTS_ACTIVE_SESSION: sessionId });
    runHook({ ...base, goal: { ...base.goal, evaluator_reason: 'r2' } },
      { CLAUDE_PROJECT_DIR: tmpRoot, CAGENTS_ACTIVE_SESSION: sessionId });
    const log = readFileSync(join(sessionDir, 'workflow', 'goal_evaluator_log.yaml'), 'utf8');
    expect(log).toMatch(/evaluator_reason: "r1"/);
    expect(log).toMatch(/evaluator_reason: "r2"/);
  });

  it('is registered in .claude/settings.json under Stop event', () => {
    const settings = JSON.parse(readFileSync(join(process.cwd(), '.claude/settings.json'), 'utf8'));
    const stopHooks = settings.hooks?.Stop || [];
    const flat = stopHooks.flatMap((g) => g.hooks || []);
    const found = flat.some((h) => typeof h.command === 'string' && h.command.includes('goal-evaluator-logger'));
    expect(found).toBe(true);
  });
});
