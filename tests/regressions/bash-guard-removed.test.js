/**
 * bash-guard-removed.test.js: v12.80.0 removed the bash guard hook.
 *
 * The bash guard was bash-validator.cjs plus its library
 * bash-guard-evaluator.cjs. It asked or denied on many benign Bash calls.
 * v12.80.0 deleted both files and unregistered the hook.
 *
 * A live session or an install with a stale registration still calls
 * `run-hook.cjs bash-validator`. Before the fix, the launcher listed
 * bash-validator in GUARD_HOOKS. A missing guard file made it deny, so every
 * Bash call failed. The launcher now lists bash-validator in RETIRED_HOOKS and
 * exits 0 with no output for it.
 *
 * This test pins five facts:
 *   1. bash-validator.cjs and bash-guard-evaluator.cjs are absent.
 *   2. No hook manifest registers bash-validator: .claude/settings.json,
 *      .claude/hooks.json, .claude/settings.full.json.
 *   3. The env block of .claude/settings.json has no CAGENTS_BASH_GUARD key.
 *   4. run-hook.cjs has bash-validator in RETIRED_HOOKS and not in GUARD_HOOKS.
 *   5. The launcher exits 0 with no output for bash-validator. The two other
 *      guards still fail closed when their file is missing.
 *
 * Fails before the fix: at v12.79.8 facts 1 to 4 are false, and the launcher
 * check in fact 5 gets a deny for bash-validator from a hooks dir without
 * the file.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { existsSync, readFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const ROOT = join(__dirname, '..', '..');
const HOOKS_DIR = join(ROOT, '.claude', 'hooks');
const LAUNCHER_SRC = readFileSync(join(HOOKS_DIR, 'run-hook.cjs'), 'utf8');
const MANIFESTS = ['.claude/settings.json', '.claude/hooks.json', '.claude/settings.full.json'];

const BASH_PAYLOAD = JSON.stringify({
  hook_event_name: 'PreToolUse',
  tool_name: 'Bash',
  tool_input: { command: 'ls' },
});

let tmpRoot;
let launcher;

function registeredHookNames(cfg) {
  const names = new Set();
  for (const groups of Object.values(cfg.hooks || {})) {
    for (const group of groups) {
      for (const hook of group.hooks || []) {
        const m = typeof hook.command === 'string' && hook.command.match(/run-hook\.cjs\\?"?\s+([A-Za-z0-9_.-]+)/);
        if (m) names.add(m[1]);
      }
    }
  }
  return names;
}

function setOf(name) {
  const m = LAUNCHER_SRC.match(new RegExp(`const ${name} = new Set\\(\\[([^\\]]*)\\]\\)`));
  if (!m) return null;
  return m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
}

// Run a copy of the launcher from a temp root that holds no hook files. Every
// search root of the launcher points at the temp root, so it never finds a
// real hook.
function runLauncher(hookName) {
  const env = { ...process.env, CAGENTS_CI_QUIET: '1' };
  delete env.CLAUDE_PLUGIN_ROOT;
  delete env.CLAUDE_PROJECT_DIR;
  const r = spawnSync(process.execPath, [launcher, hookName], {
    cwd: tmpRoot,
    env,
    input: BASH_PAYLOAD,
    encoding: 'utf8',
    timeout: 60000,
  });
  if (r.error) throw r.error;
  if (r.signal) throw new Error(`launcher killed by ${r.signal}`);
  return r;
}

beforeAll(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'bash-guard-removed-'));
  const hooksDir = join(tmpRoot, '.claude', 'hooks');
  mkdirSync(hooksDir, { recursive: true });
  launcher = join(hooksDir, 'run-hook.cjs');
  copyFileSync(join(HOOKS_DIR, 'run-hook.cjs'), launcher);
});

afterAll(() => {
  if (tmpRoot) rmSync(tmpRoot, { recursive: true, force: true });
});

describe('v12.80.0: the bash guard is removed', () => {
  it.each(['bash-validator.cjs', 'bash-guard-evaluator.cjs'])('.claude/hooks/%s is absent', (file) => {
    expect(existsSync(join(HOOKS_DIR, file))).toBe(false);
  });

  it.each(MANIFESTS)('%s does not register bash-validator', (rel) => {
    const raw = readFileSync(join(ROOT, rel), 'utf8');
    expect(raw).not.toMatch(/bash-validator/);
    expect(registeredHookNames(JSON.parse(raw)).has('bash-validator')).toBe(false);
  });

  it('.claude/settings.json env has no CAGENTS_BASH_GUARD key', () => {
    const cfg = JSON.parse(readFileSync(join(ROOT, '.claude', 'settings.json'), 'utf8'));
    expect(Object.keys(cfg.env || {})).not.toContain('CAGENTS_BASH_GUARD');
  });

  it('run-hook.cjs lists bash-validator in RETIRED_HOOKS and not in GUARD_HOOKS', () => {
    expect(setOf('RETIRED_HOOKS')).toEqual(['bash-validator']);
    expect(setOf('GUARD_HOOKS')).toEqual(['write-edit-dispatch', 'agent-dispatch']);
  });
});

describe('v12.80.0: the launcher and a stale bash-validator registration', () => {
  it('exits 0 with no output for bash-validator when the file is absent', () => {
    const r = runLauncher('bash-validator');
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
    expect(r.stderr).toBe('');
  });

  it.each(['write-edit-dispatch', 'agent-dispatch'])('still fails closed for the guard %s', (name) => {
    const r = runLauncher(name);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout.trim().split('\n').pop());
    expect(out.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(out.hookSpecificOutput.permissionDecisionReason).toMatch(new RegExp(name));
  });
});
