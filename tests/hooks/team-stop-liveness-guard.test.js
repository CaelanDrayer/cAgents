import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';

/**
 * Regression test: team-stop.cjs (SessionEnd) must NOT stamp terminal state on a
 * team session that is still actively working.
 *
 * Bug: Phase 2 rewrote `phase: completed` + `pipeline_state: VALIDATED`
 * unconditionally for the resolved team_* session. SessionEnd fires when a
 * CLAUDE CODE session ends, but a /team program can span many Claude Code
 * sessions across days — so ending any one of them stamped a still-mid-flight
 * program terminal. A terminal phase makes findActiveSession() return null,
 * which makes session-init-gate.cjs hard-deny EVERY subsequent Agent spawn.
 * The symptom is silent and total.
 *
 * Evidence: cagents-memory/sessions/team_load-cut-program_260804_001 recorded
 * `terminal_reset_recurrences: 5` with per-occurrence notes. Two recurrences
 * were pinned to the moment immediately after a merge — i.e. a Claude Code
 * session ending while the program sat mid-wave. It was misdiagnosed once as
 * "the Agent tool is absent at depth 3".
 *
 * Fix: gate the two terminal-state replacements behind
 * teamSessionActivelyWorking() — a running child agent in agent_tree.yaml, or a
 * fresh last_updated_at heartbeat. Mirrors sessionActivelyWorking() in
 * verify-completion.cjs, minus its REC-04 0-child gate (a team session that
 * spawned nothing is finished, not mid-flight).
 *
 * Could have been caught by: this test, which drives the hook against a live
 * session fixture and asserts the scalars survive.
 */

const ROOT = process.cwd();
const HOOK = join(ROOT, '.claude/hooks/team-stop.cjs');

let sandbox;

function makeTeamSession({ heartbeatAgeMs, runningChild }) {
  const sessionId = 'team_liveness-fixture_260806_001';
  const dir = join(sandbox, 'cagents-memory', 'sessions', sessionId);
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  mkdirSync(join(dir, 'team', 'metrics'), { recursive: true });

  const heartbeat = new Date(Date.now() - heartbeatAgeMs).toISOString();
  writeFileSync(
    join(dir, 'status.yaml'),
    [
      `session_id: ${sessionId}`,
      'phase: EXECUTING',
      'pipeline_state: EXECUTING',
      'current_wave: 3',
      'completed_at: null',
      'result: null',
      `last_updated_at: "${heartbeat}"`,
      '',
    ].join('\n'),
  );

  // Top-level `root:` always carries stopped_at: null for an open session, so a
  // correct implementation must NOT treat it as a running child.
  writeFileSync(
    join(dir, 'workflow', 'agent_tree.yaml'),
    [
      'root:',
      '  agent: lead',
      '  spawned_at: "2026-08-06T00:00:00Z"',
      '  stopped_at: null',
      'agents:',
      '  - agent: cagents:tech-lead',
      '    spawned_at: "2026-08-06T00:00:00Z"',
      `    stopped_at: ${runningChild ? 'null' : '"2026-08-06T00:05:00Z"'}`,
      '',
    ].join('\n'),
  );

  writeFileSync(join(dir, 'team', 'task_list.yaml'), 'tasks:\n  - id: WI-1\n    status: in_progress\n');
  writeFileSync(join(dir, 'session.sdk_id'), '11111111-2222-3333-4444-555555555555\n');
  return { sessionId, dir };
}

function runHook(sessionId) {
  execFileSync('node', [HOOK], {
    input: JSON.stringify({ session_id: sessionId, hook_event_name: 'SessionEnd', cwd: sandbox }),
    encoding: 'utf8',
    timeout: 30000,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      // hook-utils derives AGENT_MEMORY_DIR from CLAUDE_PROJECT_DIR, so this is
      // what redirects findTeamSession() at the sandbox; CAGENTS_TEST_ROOT only
      // reroutes team-stop's own pattern-extractor path.
      CLAUDE_PROJECT_DIR: sandbox,
      CAGENTS_TEST_ROOT: sandbox,
      CAGENTS_ACTIVE_SESSION: sessionId,
      CAGENTS_SESSION_LIVENESS_MS: '60000',
      // Keep teardown's fire-and-forget background children out of the test.
      CAGENTS_PATTERN_EXTRACTOR_OVERRIDE: 'skip',
    },
  });
}

function readStatus(dir) {
  return readFileSync(join(dir, 'status.yaml'), 'utf8');
}

describe('team-stop.cjs terminal-state liveness guard', () => {
  beforeEach(() => {
    sandbox = mkdtempSync(join(tmpdir(), 'cagents-teamstop-'));
  });
  afterEach(() => {
    try { rmSync(sandbox, { recursive: true, force: true }); } catch { /* best effort */ }
  });

  it('declares the guard and applies it to the terminal-state stamp', () => {
    const src = readFileSync(HOOK, 'utf8');
    expect(src).toContain('function teamSessionActivelyWorking(');
    // The two terminal replacements must sit on the guarded branch, not run
    // unconditionally as they did before the fix.
    const guardIdx = src.indexOf('const activelyWorking =');
    const phaseIdx = src.indexOf("'phase: completed'");
    const stateIdx = src.indexOf("'pipeline_state: VALIDATED'");
    expect(guardIdx, 'guard must be computed before the status rewrite').toBeGreaterThan(-1);
    expect(phaseIdx).toBeGreaterThan(guardIdx);
    expect(stateIdx).toBeGreaterThan(guardIdx);
  });

  it('captures the liveness verdict BEFORE cleanupAgentTree erases the signal', () => {
    // Ordering regression: cleanupAgentTree() rewrites every `stopped_at: null`,
    // so a guard that reads the tree afterwards sees a tree this hook just
    // marked finished and always concludes "idle". The entry capture must come
    // first. This is exactly what made the running-child case fail in review.
    const src = readFileSync(HOOK, 'utf8');
    const captureIdx = src.indexOf('activelyWorkingAtEntry = teamSessionActivelyWorking(');
    const cleanupIdx = src.indexOf('cleanupAgentTree(anySession, now)');
    expect(captureIdx, 'entry capture must exist').toBeGreaterThan(-1);
    expect(cleanupIdx, 'cleanupAgentTree call must exist').toBeGreaterThan(-1);
    expect(
      captureIdx,
      'liveness must be captured before cleanupAgentTree() rewrites stopped_at',
    ).toBeLessThan(cleanupIdx);
  });

  it('excludes the top-level root: block from the running-child signal', () => {
    const src = readFileSync(HOOK, 'utf8');
    expect(src).toContain("treeContent.split(/^agents:/m)");
  });

  it('does NOT stamp terminal state when a child agent is still running', () => {
    // Stale heartbeat on purpose: the running child alone must keep it alive.
    const { sessionId, dir } = makeTeamSession({ heartbeatAgeMs: 6 * 60 * 60 * 1000, runningChild: true });
    runHook(sessionId);
    const status = readStatus(dir);
    expect(status, 'phase must survive a live session').toMatch(/^phase:\s*EXECUTING/m);
    expect(status, 'pipeline_state must survive a live session').toMatch(/^pipeline_state:\s*EXECUTING/m);
  });

  it('does NOT stamp terminal state when the heartbeat is fresh', () => {
    // No running child: the fresh heartbeat alone must keep it alive.
    const { sessionId, dir } = makeTeamSession({ heartbeatAgeMs: 5000, runningChild: false });
    runHook(sessionId);
    const status = readStatus(dir);
    expect(status).toMatch(/^phase:\s*EXECUTING/m);
    expect(status).toMatch(/^pipeline_state:\s*EXECUTING/m);
  });

  it('DOES stamp terminal state on a genuinely finished session', () => {
    // No running child and a stale heartbeat => teardown should finalize.
    const { sessionId, dir } = makeTeamSession({ heartbeatAgeMs: 6 * 60 * 60 * 1000, runningChild: false });
    runHook(sessionId);
    const status = readStatus(dir);
    expect(status, 'an abandoned session must still be finalized').toMatch(/^phase:\s*completed/m);
    expect(status).toMatch(/^pipeline_state:\s*VALIDATED/m);
  });

  it('still fills completed_at/result placeholders on a live session', () => {
    const { sessionId, dir } = makeTeamSession({ heartbeatAgeMs: 5000, runningChild: true });
    runHook(sessionId);
    const status = readStatus(dir);
    expect(status, 'metrics finalization is independent of the terminal stamp').not.toMatch(/completed_at:\s*null/);
  });
});
