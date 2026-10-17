/**
 * run-hook-guard-fail-closed.test.js (v12.78.0, WI-02, ITEM-1b).
 *
 * The launcher .claude/hooks/run-hook.cjs must fail closed for the 3 guard
 * hooks (bash-validator, write-edit-dispatch, agent-dispatch). If a guard
 * hook is missing, has a syntax error, or throws at module load, the launcher
 * prints a PreToolUse deny and exits 0. All other hooks stay fail-open.
 *
 * Harness: the test copies the real run-hook.cjs into a mkdtemp dir at
 * <tmp>/.claude/hooks/ and puts the stub hooks beside it. Every search root of
 * the launcher (__dirname, CLAUDE_PLUGIN_ROOT, CLAUDE_PROJECT_DIR, cwd) points
 * at the temp dir, so the launcher never finds a real hook. The test never
 * writes under the live .claude/hooks dir. A check with git status pins that.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const REPO_ROOT = process.cwd();
const REAL_LAUNCHER = join(REPO_ROOT, '.claude', 'hooks', 'run-hook.cjs');

let tmpRoot;
let launcher;
let gitStatusBefore;

function gitStatusHooks() {
  const r = spawnSync('git', ['status', '--porcelain', '.claude/hooks'], {
    cwd: REPO_ROOT, encoding: 'utf8', timeout: 60000
  });
  return r.stdout;
}

function runLauncher(hookName) {
  const env = { ...process.env, CAGENTS_CI_QUIET: '1', CLAUDECODE: '1' };
  delete env.CLAUDE_PLUGIN_ROOT;
  env.CLAUDE_PROJECT_DIR = tmpRoot;
  const r = spawnSync(process.execPath, [launcher, hookName], {
    cwd: tmpRoot,
    env,
    input: '{}',
    encoding: 'utf8',
    timeout: 60000
  });
  let json = null;
  const lines = (r.stdout || '').trim().split('\n').filter(Boolean);
  try { json = JSON.parse(lines[lines.length - 1]); } catch { json = null; }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, json };
}

function decisionOf(json) {
  return json && json.hookSpecificOutput ? json.hookSpecificOutput.permissionDecision : undefined;
}

beforeAll(() => {
  gitStatusBefore = gitStatusHooks();
  tmpRoot = mkdtempSync(join(tmpdir(), 'run-hook-failclosed-'));
  const hooksDir = join(tmpRoot, '.claude', 'hooks');
  mkdirSync(hooksDir, { recursive: true });
  copyFileSync(REAL_LAUNCHER, join(hooksDir, 'run-hook.cjs'));
  launcher = join(hooksDir, 'run-hook.cjs');

  // Guard hook with a syntax error.
  writeFileSync(join(hooksDir, 'bash-validator.cjs'), 'module.exports = {;\n', 'utf8');
  // Guard hook that throws at module load.
  writeFileSync(join(hooksDir, 'agent-dispatch.cjs'),
    "throw new Error('injected load fault (test)');\n", 'utf8');
  // write-edit-dispatch.cjs is deliberately absent.
  // Non-guard hook with a syntax error.
  writeFileSync(join(hooksDir, 'session-catchup.cjs'), 'function (\n', 'utf8');
  // Healthy non-guard hook: proves that the hook still runs on the normal load path.
  writeFileSync(join(hooksDir, 'notification.cjs'),
    "console.log(JSON.stringify({ continue: true, systemMessage: 'stub-ran' }));\n", 'utf8');
});

afterAll(() => {
  if (tmpRoot) rmSync(tmpRoot, { recursive: true, force: true });
});

describe('run-hook.cjs fails closed for guard hooks', () => {
  it('denies when bash-validator.cjs has a syntax error', () => {
    const r = runLauncher('bash-validator');
    expect(r.status).toBe(0);
    expect(r.json).not.toBeNull();
    expect(r.json.hookSpecificOutput.hookEventName).toBe('PreToolUse');
    expect(decisionOf(r.json)).toBe('deny');
    expect(r.json.hookSpecificOutput.permissionDecisionReason).toMatch(/bash-validator/);
    expect(r.json.hookSpecificOutput.permissionDecisionReason).toMatch(/SyntaxError/);
  });

  it('denies when write-edit-dispatch.cjs is missing', () => {
    const r = runLauncher('write-edit-dispatch');
    expect(r.status).toBe(0);
    expect(decisionOf(r.json)).toBe('deny');
    expect(r.json.hookSpecificOutput.hookEventName).toBe('PreToolUse');
    expect(r.json.hookSpecificOutput.permissionDecisionReason).toMatch(/write-edit-dispatch/);
    expect(r.json.hookSpecificOutput.permissionDecisionReason).toMatch(/HOOK NOT FOUND/);
  });

  it('denies when agent-dispatch.cjs throws at load', () => {
    const r = runLauncher('agent-dispatch');
    expect(r.status).toBe(0);
    expect(decisionOf(r.json)).toBe('deny');
    expect(r.json.hookSpecificOutput.permissionDecisionReason).toMatch(/agent-dispatch/);
    expect(r.json.hookSpecificOutput.permissionDecisionReason).toMatch(/injected load fault/);
  });
});

describe('run-hook.cjs stays fail-open for other hooks', () => {
  it('does not deny when a non-guard hook (session-catchup) has a syntax error', () => {
    const r = runLauncher('session-catchup');
    expect(r.status).toBe(0);
    expect(decisionOf(r.json)).toBeUndefined();
    expect(r.json.continue).toBe(true);
    expect(r.json.systemMessage).toMatch(/HOOK LOAD FAILED/);
  });

  it('does not deny when a non-guard hook is missing', () => {
    const r = runLauncher('pre-compact-save');
    expect(r.status).toBe(0);
    expect(decisionOf(r.json)).toBeUndefined();
    expect(r.json.continue).toBe(true);
    expect(r.json.systemMessage).toMatch(/HOOK NOT FOUND/);
  });

  it('runs a healthy hook normally', () => {
    const r = runLauncher('notification');
    expect(r.status).toBe(0);
    expect(r.json).toEqual({ continue: true, systemMessage: 'stub-ran' });
  });
});

describe('test hygiene', () => {
  it('leaves git status of .claude/hooks unchanged', () => {
    expect(gitStatusHooks()).toBe(gitStatusBefore);
  });
});
