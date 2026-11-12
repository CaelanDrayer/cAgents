/**
 * run-hook-guard-fail-closed.test.js (v12.78.0, WI-02, ITEM-1b).
 *
 * The launcher .claude/hooks/run-hook.cjs must fail closed for the 2 guard
 * hooks (write-edit-dispatch, agent-dispatch). If a guard hook is missing, has
 * a syntax error, or throws at module load, the launcher prints a PreToolUse
 * deny and exits 0. All other hooks stay fail-open.
 *
 * v12.81.0 restores 'bash-validator' as a narrow guard. It is not retired and
 * it is not a guard hook of the launcher, so it stays fail-open: a missing or
 * broken file allows the Bash call with a systemMessage and never denies it.
 *
 * Harness: the test copies the real run-hook.cjs into a mkdtemp dir at
 * <tmp>/.claude/hooks/ and puts the stub hooks beside it. Every search root of
 * the launcher (__dirname, CLAUDE_PLUGIN_ROOT, CLAUDE_PROJECT_DIR, cwd) points
 * at the temp dir, so the launcher never finds a real hook. The test never
 * writes under the live .claude/hooks dir. A check with git status pins that.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const REPO_ROOT = process.cwd();
const REAL_LAUNCHER = join(REPO_ROOT, '.claude', 'hooks', 'run-hook.cjs');

let tmpRoot;
let launcher;
let missingRoot;
let missingLauncher;
let realRoot;
let realLauncher;
let gitStatusBefore;

function gitStatusHooks() {
  const r = spawnSync('git', ['status', '--porcelain', '.claude/hooks'], {
    cwd: REPO_ROOT, encoding: 'utf8', timeout: 60000
  });
  return r.stdout;
}

function runLauncher(hookName, opts = {}) {
  const root = opts.root || tmpRoot;
  const file = opts.launcher || launcher;
  const env = { ...process.env, CAGENTS_CI_QUIET: '1', CLAUDECODE: '1' };
  delete env.CLAUDE_PLUGIN_ROOT;
  if (opts.unsetProjectDir) delete env.CLAUDE_PROJECT_DIR;
  else env.CLAUDE_PROJECT_DIR = root;
  const r = spawnSync(process.execPath, [file, hookName], {
    cwd: root,
    env,
    input: opts.input || '{}',
    encoding: 'utf8',
    timeout: 60000
  });
  if (r.error) throw r.error;
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
  writeFileSync(join(hooksDir, 'write-edit-dispatch.cjs'), 'module.exports = {;\n', 'utf8');
  // Guard hook that throws at module load.
  writeFileSync(join(hooksDir, 'agent-dispatch.cjs'),
    "throw new Error('injected load fault (test)');\n", 'utf8');
  // bash-validator with a broken file: the launcher loads it and fails open.
  writeFileSync(join(hooksDir, 'bash-validator.cjs'), 'module.exports = {;\n', 'utf8');
  // Non-guard hook with a syntax error.
  writeFileSync(join(hooksDir, 'session-catchup.cjs'), 'function (\n', 'utf8');
  // Healthy non-guard hook: proves that the hook still runs on the normal load path.
  writeFileSync(join(hooksDir, 'notification.cjs'),
    "console.log(JSON.stringify({ continue: true, systemMessage: 'stub-ran' }));\n", 'utf8');

  // Second temp root: the launcher only. No guard file and no bash-validator.cjs.
  missingRoot = mkdtempSync(join(tmpdir(), 'run-hook-failclosed-missing-'));
  const missingHooks = join(missingRoot, '.claude', 'hooks');
  mkdirSync(missingHooks, { recursive: true });
  copyFileSync(REAL_LAUNCHER, join(missingHooks, 'run-hook.cjs'));
  missingLauncher = join(missingHooks, 'run-hook.cjs');

  // Third temp root: the launcher and the real bash-validator.cjs with the two
  // modules that it requires.
  realRoot = mkdtempSync(join(tmpdir(), 'run-hook-failclosed-real-'));
  const realHooks = join(realRoot, '.claude', 'hooks');
  mkdirSync(realHooks, { recursive: true });
  for (const f of ['run-hook.cjs', 'bash-validator.cjs', 'hook-utils.cjs', 'secret-detection.cjs']) {
    copyFileSync(join(REPO_ROOT, '.claude', 'hooks', f), join(realHooks, f));
  }
  realLauncher = join(realHooks, 'run-hook.cjs');
});

afterAll(() => {
  if (tmpRoot) rmSync(tmpRoot, { recursive: true, force: true });
  if (missingRoot) rmSync(missingRoot, { recursive: true, force: true });
  if (realRoot) rmSync(realRoot, { recursive: true, force: true });
});

describe('run-hook.cjs fails closed for guard hooks', () => {
  it('denies when write-edit-dispatch.cjs has a syntax error', () => {
    const r = runLauncher('write-edit-dispatch');
    expect(r.status).toBe(0);
    expect(r.json).not.toBeNull();
    expect(r.json.hookSpecificOutput.hookEventName).toBe('PreToolUse');
    expect(decisionOf(r.json)).toBe('deny');
    expect(r.json.hookSpecificOutput.permissionDecisionReason).toMatch(/write-edit-dispatch/);
    expect(r.json.hookSpecificOutput.permissionDecisionReason).toMatch(/SyntaxError/);
  });

  it('denies when write-edit-dispatch.cjs is missing', () => {
    const r = runLauncher('write-edit-dispatch', { root: missingRoot, launcher: missingLauncher });
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

describe('run-hook.cjs: bash-validator is a fail-open hook', () => {
  const bashPayload = JSON.stringify({
    hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls' }
  });

  it('is absent from RETIRED_HOOKS and from GUARD_HOOKS of the launcher', () => {
    const src = readFileSync(REAL_LAUNCHER, 'utf8');
    const setOf = (name) => {
      const m = src.match(new RegExp(`const ${name} = new Set\\(([^)]*)\\)`));
      expect(m, `${name} declaration`).not.toBeNull();
      return m[1];
    };
    expect(setOf('RETIRED_HOOKS')).not.toMatch(/bash-validator/);
    expect(setOf('GUARD_HOOKS')).not.toMatch(/bash-validator/);
  });

  it('allows with a HOOK NOT FOUND systemMessage and never denies when bash-validator.cjs is absent', () => {
    const r = runLauncher('bash-validator', {
      root: missingRoot, launcher: missingLauncher, input: bashPayload
    });
    expect(r.status).toBe(0);
    expect(decisionOf(r.json)).toBeUndefined();
    expect(r.json.continue).toBe(true);
    expect(r.json.systemMessage).toMatch(/HOOK NOT FOUND/);
    expect(r.json.systemMessage).toMatch(/bash-validator/);
  });

  it('allows with a HOOK LOAD FAILED systemMessage when bash-validator.cjs is broken', () => {
    const r = runLauncher('bash-validator', { input: bashPayload });
    expect(r.status).toBe(0);
    expect(decisionOf(r.json)).toBeUndefined();
    expect(r.json.continue).toBe(true);
    expect(r.json.systemMessage).toMatch(/HOOK LOAD FAILED/);
    expect(r.json.systemMessage).toMatch(/bash-validator/);
  });

  it('gives {continue:true} for a benign payload with the real bash-validator.cjs', () => {
    const r = runLauncher('bash-validator', {
      root: realRoot, launcher: realLauncher,
      input: JSON.stringify({
        hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: realRoot, tool_input: { command: 'ls' }
      })
    });
    expect(r.status, r.stderr).toBe(0);
    expect(decisionOf(r.json)).toBeUndefined();
    expect(r.json).toEqual({ continue: true });
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
