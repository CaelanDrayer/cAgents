/**
 * bash-guard-full-off-switch.test.js: UD-2 (v12.79.0), the full-off switch.
 *
 * CAGENTS_BASH_GUARD_DISABLED=1 turns the whole bash guard off. The hook then
 * prints {"continue":true} before any check, the Stage-1 hard denies included.
 *
 * - The env var turns the switch on.
 * - The "env" object of .claude/settings.local.json turns the switch on.
 * - With no switch, a Stage-1 deny stays a deny.
 * - CAGENTS_BASH_GUARD=off keeps its meaning: a Stage-1 deny stays a deny.
 * - A malformed settings.local.json keeps the guard on.
 * - An env value of "0" keeps the guard on and wins over the file.
 * - An oversize file, a directory or a FIFO at the file path keeps the guard on.
 * - With CLAUDE_PLUGIN_ROOT set and CLAUDE_PROJECT_DIR unset, the hook skips
 *   the fallback to its own repo.
 *
 * Each case runs through the registered launcher (run-hook.cjs bash-validator)
 * with a temp CLAUDE_PROJECT_DIR. The test never reads or writes the real
 * .claude/settings.local.json.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawnSync } from 'child_process';

const ROOT = join(__dirname, '..', '..');
const LAUNCHER = join(ROOT, '.claude', 'hooks', 'run-hook.cjs');
const FB = [':()', '{ :', '|', ':& };:'].join('');
const STAGE1_DENIES = ['rm -rf /', FB, 'sudo ls', 'eval "$W"'];

let base;
function projectDir(name, localSettings) {
  const d = join(base, name);
  mkdirSync(join(d, '.claude'), { recursive: true });
  if (localSettings !== undefined) writeFileSync(join(d, '.claude', 'settings.local.json'), localSettings);
  return d;
}

function run(command, { disabled, mode, projectDir: pd, launcher = LAUNCHER, pluginRoot, cwd }) {
  const env = { ...process.env, CAGENTS_HOOK_DEDUP_DISABLE: '1', CLAUDE_PROJECT_DIR: pd };
  delete env.CAGENTS_BASH_GUARD;
  delete env.CAGENTS_BASH_GUARD_DISABLED;
  delete env.CLAUDE_PLUGIN_ROOT;
  if (pd === undefined) delete env.CLAUDE_PROJECT_DIR;
  if (disabled !== undefined) env.CAGENTS_BASH_GUARD_DISABLED = disabled;
  if (mode !== undefined) env.CAGENTS_BASH_GUARD = mode;
  if (pluginRoot !== undefined) env.CLAUDE_PLUGIN_ROOT = pluginRoot;
  const r = spawnSync('node', [launcher, 'bash-validator'], {
    input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: ROOT, tool_input: { command } }),
    encoding: 'utf8',
    timeout: 60000,
    cwd,
    env
  });
  if (r.error) throw r.error;
  const out = JSON.parse(String(r.stdout).trim());
  const h = out.hookSpecificOutput || {};
  return { out, decision: h.permissionDecision || 'allow' };
}

let plain, localOn, localOff, localBad, localNoEnv, localBig, localDir, localFifo, hookRepo;
const ON = JSON.stringify({ env: { CAGENTS_BASH_GUARD_DISABLED: '1' } });
const HAS_MKFIFO = spawnSync('sh', ['-c', 'command -v mkfifo'], { timeout: 60000 }).status === 0;
beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), 'bash-guard-full-off-'));
  plain = projectDir('plain');
  localOn = projectDir('local-on', JSON.stringify({ env: { CAGENTS_BASH_GUARD_DISABLED: '1' } }));
  localOff = projectDir('local-off', JSON.stringify({ env: { CAGENTS_BASH_GUARD_DISABLED: '0' } }));
  localBad = projectDir('local-bad', '{ "env": { "CAGENTS_BASH_GUARD_DISABLED": "1" ');
  localNoEnv = projectDir('local-no-env', JSON.stringify({ CAGENTS_BASH_GUARD_DISABLED: '1' }));
  localBig = projectDir('local-big', JSON.stringify({ env: { CAGENTS_BASH_GUARD_DISABLED: '1' }, pad: 'x'.repeat(70000) }));
  localDir = projectDir('local-dir');
  mkdirSync(join(localDir, '.claude', 'settings.local.json'));
  localFifo = projectDir('local-fifo');
  if (HAS_MKFIFO) {
    const m = spawnSync('mkfifo', [join(localFifo, '.claude', 'settings.local.json')], { timeout: 60000 });
    if (m.error || m.status !== 0) throw new Error('mkfifo failed: ' + (m.error || m.stderr));
  }
  // A copy of the hooks dir whose repo holds a switch-on local file. The hook
  // falls back to this repo when CLAUDE_PROJECT_DIR is unset.
  hookRepo = projectDir('hook-repo', ON);
  cpSync(join(ROOT, '.claude', 'hooks'), join(hookRepo, '.claude', 'hooks'), { recursive: true });
});
afterAll(() => { rmSync(base, { recursive: true, force: true }); });

describe('switch absent: Stage-1 denies hold', () => {
  it.each(STAGE1_DENIES)('%j denies', (command) => {
    expect(run(command, { projectDir: plain }).decision).toBe('deny');
  });
});

describe('switch on through the env var', () => {
  it.each(STAGE1_DENIES)('%j gives a plain continue', (command) => {
    const r = run(command, { disabled: '1', projectDir: plain });
    expect(r.out).toEqual({ continue: true });
  });

  it('"true" also turns the switch on', () => {
    expect(run('rm -rf /', { disabled: 'TRUE', projectDir: plain }).out).toEqual({ continue: true });
  });

  it.each(['0', 'yes', 'off', 'block'])('the value %j keeps the guard on', (v) => {
    expect(run('rm -rf /', { disabled: v, projectDir: plain }).decision).toBe('deny');
  });
});

describe('switch on through settings.local.json', () => {
  it.each(STAGE1_DENIES)('%j gives a plain continue', (command) => {
    const r = run(command, { projectDir: localOn });
    expect(r.out).toEqual({ continue: true });
  });

  it('an env value of "0" wins over the file', () => {
    expect(run('rm -rf /', { disabled: '0', projectDir: localOn }).decision).toBe('deny');
  });

  it('a file value of "0" keeps the guard on', () => {
    expect(run('rm -rf /', { projectDir: localOff }).decision).toBe('deny');
  });

  it('a malformed file keeps the guard on', () => {
    expect(run('rm -rf /', { projectDir: localBad }).decision).toBe('deny');
  });

  it('a key outside the "env" object does not count', () => {
    expect(run('rm -rf /', { projectDir: localNoEnv }).decision).toBe('deny');
  });

  it('a file over 64 KiB keeps the guard on', () => {
    expect(run('rm -rf /', { projectDir: localBig }).decision).toBe('deny');
  });

  it('a directory at the file path keeps the guard on', () => {
    expect(run('rm -rf /', { projectDir: localDir }).decision).toBe('deny');
  });

  it.skipIf(!HAS_MKFIFO)('a FIFO at the file path keeps the guard on and does not hang', () => {
    const t0 = Date.now();
    expect(run('rm -rf /', { projectDir: localFifo }).decision).toBe('deny');
    expect(Date.now() - t0).toBeLessThan(30000);
  }, 60000);
});

describe('fallback to the hook repo', () => {
  // cwd is the copy, so the launcher does not stand down for this repo.
  const copied = () => join(hookRepo, '.claude', 'hooks', 'run-hook.cjs');

  it('with CLAUDE_PROJECT_DIR unset, the hook reads its own repo file', () => {
    expect(run('rm -rf /', { launcher: copied(), cwd: hookRepo }).out).toEqual({ continue: true });
  });

  it('with CLAUDE_PLUGIN_ROOT set, the hook skips that fallback', () => {
    expect(run('rm -rf /', { launcher: copied(), pluginRoot: hookRepo, cwd: hookRepo }).decision).toBe('deny');
  });
});

describe('CAGENTS_BASH_GUARD=off keeps its meaning', () => {
  it.each(STAGE1_DENIES)('%j still denies under off with no switch', (command) => {
    expect(run(command, { mode: 'off', projectDir: plain }).decision).toBe('deny');
  });

  it('the value "off" in CAGENTS_BASH_GUARD_DISABLED is not the switch', () => {
    expect(run('rm -rf /', { disabled: 'off', mode: 'off', projectDir: plain }).decision).toBe('deny');
  });
});
