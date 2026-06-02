/**
 * Regression test (WI-6, session run_concurrent-session-hooks_260602_001):
 *
 * Asserts the concurrency contract: when two cAgents sessions exist in the
 * same project directory at the same time, hooks fired for session A NEVER
 * mutate session B's tree, and vice versa.
 *
 * RED on v12.14.0 because:
 *   - findActiveSession's env-var Pass-0 wins over input.session_id, so a
 *     hook spawned for session A with CAGENTS_ACTIVE_SESSION=B accidentally
 *     writes B's tree.
 *   - secret-restore.cjs reads any manifest under
 *     _system/secret-backups/{sid}/manifest.yaml without verifying the
 *     manifest's session_id matches the resolving session.
 *
 * GREEN after WI-2 (deterministic chain: input.session_id → sessionHint →
 * env → promptHint → null), WI-3 (call-sites consume input.session_id), and
 * WI-7 (manifest.session_id strict match).
 *
 * Test isolation strategy: real cagents-memory/sessions/ test dirs with
 * unique names; explicit cleanup in afterEach. CAGENTS_HOOK_DEDUP_DISABLE=1
 * to bypass the createHook dedup guard (we intentionally fire the same hook
 * many times with the same payload shape).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, mkdirSync, rmSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = process.cwd();
const HOOKS_DIR = join(PROJECT_ROOT, '.claude', 'hooks');
const SESSIONS_DIR = join(PROJECT_ROOT, 'cagents-memory', 'sessions');
const SECRET_BACKUPS_DIR = join(PROJECT_ROOT, 'cagents-memory', '_system', 'secret-backups');

const TS = Date.now().toString(36);
const SESSION_A = `run_concurrent-test-a_${TS}`;
const SESSION_B = `run_concurrent-test-b_${TS}`;
const SESSION_A_DIR = join(SESSIONS_DIR, SESSION_A);
const SESSION_B_DIR = join(SESSIONS_DIR, SESSION_B);

function makeSession(sessionDir, sessionId) {
  mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
  writeFileSync(
    join(sessionDir, 'status.yaml'),
    `session_id: ${sessionId}\nphase: coordinating\npipeline_state: COORDINATING\nlast_updated_at: "${new Date().toISOString()}"\n`
  );
  writeFileSync(
    join(sessionDir, 'instruction.yaml'),
    `session_id: ${sessionId}\nraw_request: "test"\ncreated_at: "${new Date().toISOString()}"\ncommand: "/run"\n`
  );
  writeFileSync(
    join(sessionDir, 'workflow', 'agent_tree.yaml'),
    `schema_version: "1"\nagents: []\n`
  );
}

function runHook(hookFile, input, extraEnv = {}) {
  const hookPath = join(HOOKS_DIR, hookFile);
  const env = {
    ...process.env,
    CAGENTS_HOOK_DEDUP_DISABLE: '1',
    VITEST: 'true',
    ...extraEnv,
  };
  try {
    const result = execSync(
      `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${hookPath}"`,
      { encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'], env }
    );
    return { ok: true, stdout: result };
  } catch (e) {
    return { ok: false, stdout: e.stdout || '', stderr: e.stderr || '', error: e.message };
  }
}

describe('Concurrent sessions: no cross-write (WI-6)', () => {
  beforeEach(() => {
    if (existsSync(SESSION_A_DIR)) rmSync(SESSION_A_DIR, { recursive: true, force: true });
    if (existsSync(SESSION_B_DIR)) rmSync(SESSION_B_DIR, { recursive: true, force: true });
    makeSession(SESSION_A_DIR, SESSION_A);
    makeSession(SESSION_B_DIR, SESSION_B);
  });

  afterEach(() => {
    if (existsSync(SESSION_A_DIR)) rmSync(SESSION_A_DIR, { recursive: true, force: true });
    if (existsSync(SESSION_B_DIR)) rmSync(SESSION_B_DIR, { recursive: true, force: true });
    // Cleanup any test secret backups
    const aBak = join(SECRET_BACKUPS_DIR, SESSION_A);
    const bBak = join(SECRET_BACKUPS_DIR, SESSION_B);
    if (existsSync(aBak)) rmSync(aBak, { recursive: true, force: true });
    if (existsSync(bBak)) rmSync(bBak, { recursive: true, force: true });
  });

  it('subagent-tracker resolves to input.session_id, not env-var (H1 fix)', () => {
    // Fire SubagentStart for session A, but CAGENTS_ACTIVE_SESSION points at B.
    // Deterministic chain: input.session_id MUST win over env.
    const input = {
      session_id: SESSION_A,
      agent_type: 'cagents:backend-developer',
      agent_id: 'agent-A-1',
      prompt: 'work for SESSION_A only',
    };
    const res = runHook('subagent-tracker.cjs', input, { CAGENTS_ACTIVE_SESSION: SESSION_B });
    expect(res.ok).toBe(true);

    // A's agent_tree.yaml MUST be mutated, B's MUST NOT.
    const aTree = readFileSync(join(SESSION_A_DIR, 'workflow', 'agent_tree.yaml'), 'utf8');
    const bTree = readFileSync(join(SESSION_B_DIR, 'workflow', 'agent_tree.yaml'), 'utf8');
    expect(aTree).toContain('agent-A-1');
    expect(bTree).not.toContain('agent-A-1');
  });

  it('post-write-validator file_changes.log routes to input.session_id, not env-var', () => {
    const tmpFile = join(SESSION_A_DIR, 'workflow', 'sample-write.txt');
    writeFileSync(tmpFile, 'hello');
    const input = {
      session_id: SESSION_A,
      tool_name: 'Write',
      tool_input: { file_path: tmpFile, content: 'hello' },
    };
    const res = runHook('post-write-validator.cjs', input, { CAGENTS_ACTIVE_SESSION: SESSION_B });
    expect(res.ok).toBe(true);

    const aLog = join(SESSION_A_DIR, 'workflow', 'file_changes.log');
    const bLog = join(SESSION_B_DIR, 'workflow', 'file_changes.log');
    expect(existsSync(aLog)).toBe(true);
    expect(existsSync(bLog)).toBe(false);
    const aLogContent = readFileSync(aLog, 'utf8');
    expect(aLogContent).toContain('sample-write.txt');
  });

  it('interleaved spawns: A and B agent_trees disjoint in agent ids', () => {
    // Alternate A and B subagent spawns
    for (let i = 0; i < 4; i++) {
      const target = i % 2 === 0 ? SESSION_A : SESSION_B;
      const other = i % 2 === 0 ? SESSION_B : SESSION_A;
      runHook('subagent-tracker.cjs', {
        session_id: target,
        agent_type: 'cagents:backend-developer',
        agent_id: `agent-${target}-${i}`,
      }, { CAGENTS_ACTIVE_SESSION: other });
    }

    const aTree = readFileSync(join(SESSION_A_DIR, 'workflow', 'agent_tree.yaml'), 'utf8');
    const bTree = readFileSync(join(SESSION_B_DIR, 'workflow', 'agent_tree.yaml'), 'utf8');

    // A's tree contains only A's agents
    expect(aTree).toMatch(new RegExp(`agent-${SESSION_A}-0`));
    expect(aTree).toMatch(new RegExp(`agent-${SESSION_A}-2`));
    expect(aTree).not.toMatch(new RegExp(`agent-${SESSION_B}-`));

    // B's tree contains only B's agents
    expect(bTree).toMatch(new RegExp(`agent-${SESSION_B}-1`));
    expect(bTree).toMatch(new RegExp(`agent-${SESSION_B}-3`));
    expect(bTree).not.toMatch(new RegExp(`agent-${SESSION_A}-`));
  });

  it('secret-restore refuses to restore from a manifest whose session_id ≠ resolved session (H8 fix)', () => {
    // Craft a manifest under session B's backup dir, but stamped with session A's id.
    const aBackup = join(SECRET_BACKUPS_DIR, SESSION_B);
    mkdirSync(aBackup, { recursive: true });
    // Write a manifest header with a DIFFERENT session_id than the resolving session.
    // WI-7 contract: manifest carries `session_id:` at top level and secret-restore
    // refuses on mismatch.
    const manifestPath = join(aBackup, 'manifest.yaml');
    const targetFile = join(SESSION_B_DIR, 'workflow', 'should-not-be-restored.txt');
    writeFileSync(targetFile, 'CURRENT_CONTENT');
    const origPath = join(aBackup, 'fake.orig');
    writeFileSync(origPath, 'ORIG_CONTENT_FROM_WRONG_SESSION');
    writeFileSync(
      manifestPath,
      `schema_version: "1"\nsession_id: "${SESSION_A}"\nentries:\n  - placeholder: "BLOCK_deadbeef"\n    file_path: "${targetFile}"\n    hash: "deadbeef"\n`
    );

    // Fire secret-restore resolving to session B (input.session_id=B).
    const res = runHook('secret-restore.cjs', { session_id: SESSION_B }, {});
    expect(res.ok).toBe(true);

    // After the hook: the target file MUST still contain CURRENT_CONTENT
    // (restore aborted because manifest.session_id ≠ resolved session).
    const after = readFileSync(targetFile, 'utf8');
    expect(after).toBe('CURRENT_CONTENT');
    // Manifest should still exist (mismatch → no cleanup), OR may be removed if
    // strict-binding decides to clean up the foreign manifest. Either is OK,
    // but the file MUST NOT be mutated.
  });

  it('no bare findActiveSession() calls remain in hooks (WI-3 contract)', () => {
    // Static check: every findActiveSession call in .claude/hooks/*.cjs (except
    // hook-utils itself) MUST pass at least one argument, OR be inside an explicit
    // fallbackHeuristic branch. This is the WI-3 anti-regression guard.
    const hookFiles = readdirSync(HOOKS_DIR).filter(f =>
      f.endsWith('.cjs') &&
      !['hook-utils.cjs', 'run-hook.cjs', 'eval-runner.cjs'].includes(f)
    );
    const violations = [];
    for (const f of hookFiles) {
      const content = readFileSync(join(HOOKS_DIR, f), 'utf8');
      // Match findActiveSession( followed by ) — i.e. zero-argument call.
      // Skip comment lines (// or *) so docstring references don't false-positive.
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const stripped = line.trim();
        if (stripped.startsWith('//') || stripped.startsWith('*')) return;
        if (/findActiveSession\(\s*\)/.test(line)) {
          violations.push(`${f}:${idx + 1} — bare findActiveSession() call`);
        }
      });
    }
    expect(violations, `Unhinted findActiveSession() calls found:\n${violations.join('\n')}`).toEqual([]);
  });
});
