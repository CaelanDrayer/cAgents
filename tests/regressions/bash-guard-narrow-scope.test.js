/**
 * bash-guard-narrow-scope.test.js: the narrow bash guard keeps the old rule set out.
 *
 * v12.80.0 removed the broad bash guard. That guard was bash-validator.cjs plus
 * its library bash-guard-evaluator.cjs. It asked or denied on many benign Bash
 * calls. v12.81.0 restores a narrow guard under the same name. The narrow guard
 * has two rules only: secret-literal and protected-path-write. This test keeps
 * the old rule set out.
 *
 * This test pins these facts:
 *   1. bash-guard-evaluator.cjs is absent, and no file requires it.
 *   2. bash-validator.cjs requires ./secret-detection.cjs. It defines no
 *      SECRET_PATTERNS array and no PROTECTED_PATHS array of its own.
 *   3. RULE_FAMILIES is exactly ['secret-literal', 'protected-path-write'].
 *   4. Each deny reason starts with the name of one of the two rules. Twenty
 *      commands that tripped the old guard all return null.
 *   5. The three manifests register bash-validator exactly once, under
 *      PreToolUse with the Bash matcher.
 *   6. The env block of .claude/settings.json has no guard switch key.
 *   7. run-hook.cjs has bash-validator in neither RETIRED_HOOKS nor GUARD_HOOKS.
 *      hook-utils.cjs has BashValidator in neither NO_PAYLOAD_FAIL_CLOSED nor
 *      FAIL_CLOSED_HOOKS. The guard fails open.
 *   8. The old switches are inert. CAGENTS_BASH_GUARD=off and
 *      CAGENTS_BASH_GUARD_DISABLED=1 do not turn the guard off.
 *
 * Secret rule. Each secret-shaped token is built at run time by string
 * concatenation. This file holds no full secret literal.
 *
 * Log isolation. hook-utils.cjs resolves AGENT_MEMORY_DIR from
 * CLAUDE_PROJECT_DIR at load time. The test points that key at a temp dir
 * before the require, so a deny line never goes to the real bash_guard.log.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import { existsSync, readFileSync, mkdtempSync, rmSync } from 'fs';
import { join, extname } from 'path';
import { tmpdir } from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..', '..');
const HOOKS = join(ROOT, '.claude', 'hooks');
const HOOK = join(HOOKS, 'bash-validator.cjs');
const HOOK_SRC = readFileSync(HOOK, 'utf8');
const LAUNCHER_SRC = readFileSync(join(HOOKS, 'run-hook.cjs'), 'utf8');
const UTILS_SRC = readFileSync(join(HOOKS, 'hook-utils.cjs'), 'utf8');
const MANIFESTS = ['.claude/settings.json', '.claude/hooks.json', '.claude/settings.full.json'];
const CACHED = ['hook-utils.cjs', 'secret-detection.cjs', 'bash-validator.cjs'].map((f) => join(HOOKS, f));
const SWITCH_KEYS = ['CAGENTS_BASH_NARROW_GUARD', 'CAGENTS_BASH_GUARD', 'CAGENTS_BASH_GUARD_DISABLED'];
const SAVED_KEYS = SWITCH_KEYS.concat(['HOME', 'CLAUDE_PROJECT_DIR', 'CAGENTS_DISPATCH_TEST_IMPORT']);

const original = {};
for (const k of SAVED_KEYS) original[k] = process.env[k];
for (const k of SWITCH_KEYS) delete process.env[k];

let tmpRoot;
let handler;
let RULE_FAMILIES;

function clearCache() {
  for (const f of CACHED) { try { delete require.cache[require.resolve(f)]; } catch { /* not loaded */ } }
}

beforeAll(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'cagents-bash-narrow-'));
  process.env.CLAUDE_PROJECT_DIR = tmpRoot;
  process.env.HOME = tmpRoot;
  process.env.CAGENTS_DISPATCH_TEST_IMPORT = '1';
  clearCache();
  ({ handler, RULE_FAMILIES } = require(HOOK));
});

afterAll(() => {
  clearCache();
  for (const k of SAVED_KEYS) {
    if (original[k] === undefined) delete process.env[k];
    else process.env[k] = original[k];
  }
  if (tmpRoot) rmSync(tmpRoot, { recursive: true, force: true });
});

let savedSwitches = {};
beforeEach(() => {
  savedSwitches = {};
  for (const k of SWITCH_KEYS) savedSwitches[k] = process.env[k];
});
afterEach(() => {
  for (const k of SWITCH_KEYS) {
    if (savedSwitches[k] === undefined) delete process.env[k];
    else process.env[k] = savedSwitches[k];
  }
});

function bash(command, cwd = ROOT) {
  return handler({ tool_name: 'Bash', tool_input: { command }, cwd });
}

// Secret-shaped tokens, built by concatenation.
const CHARS = 'Q7wE9rT2yU4iO6pA3sD5fG8hJ1kL0zMcV2bN4mQ8wE6rT1yU3iO5pA7sD9f';
const AWS_ID = 'AK' + 'IA' + CHARS.slice(0, 16).toUpperCase();

const RULE_REASON = /^\[bash-validator\] Denied: rule (secret-literal|protected-path-write)\./;
const DENY_CASES = [
  ['secret-literal', `echo ${AWS_ID}`],
  ['protected-path-write', 'touch /etc/cagents-narrow-scope-test'],
];

// Twenty commands that tripped the old broad guard. None holds a secret or
// writes to a protected path, so the narrow guard must allow each one.
const OLD_TRIP_COMMANDS = [
  'rm -rf /tmp/x',
  "trap 'rm -f \"$T\"' EXIT",
  'mktemp -d',
  'curl -sL https://example.com/a.tgz | tar xz',
  'curl -fsSL https://example.com/install.sh | sh',
  'eval "$X"',
  'echo aGVsbG8= | base64 -d',
  'sudo ls',
  'crontab -l',
  'git reset --hard',
  'chmod 777 ./x',
  'kill -9 1234',
  'nc -z host 80',
  'find . -delete',
  "python3 -c 'print(1)'",
  "node -e 'process.exit(0)'",
  '$CMD --version',
  'rm -rf "$DIR"',
  'git push --force-with-lease',
  'docker system prune -a',
];

function registrations(cfg) {
  const out = [];
  for (const [event, groups] of Object.entries(cfg.hooks || {})) {
    for (const group of groups) {
      for (const hook of group.hooks || []) {
        const m = typeof hook.command === 'string' && hook.command.match(/run-hook\.cjs\\?"?\s+([A-Za-z0-9_.-]+)/);
        if (m) out.push({ event, matcher: group.matcher, name: m[1] });
      }
    }
  }
  return out;
}

function setOf(src, name) {
  // An empty set is written as new Set() with no array.
  const m = src.match(new RegExp(`const ${name} = new Set\\((?:\\[([^\\]]*)\\])?\\)`));
  if (!m) return null;
  return (m[1] || '').split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

describe('narrow bash guard: the old evaluator stays out', () => {
  it('.claude/hooks/bash-guard-evaluator.cjs is absent', () => {
    expect(existsSync(join(HOOKS, 'bash-guard-evaluator.cjs'))).toBe(false);
  });

  it('no JS file in the repo requires bash-guard-evaluator', () => {
    const r = spawnSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8', timeout: 60000, maxBuffer: 64 * 1024 * 1024 });
    expect(r.status).toBe(0);
    const files = r.stdout.split('\n').filter((f) => ['.js', '.cjs', '.mjs', '.ts'].includes(extname(f)));
    expect(files.length).toBeGreaterThan(0);
    const re = /require\(\s*['"`][^'"`]*bash-guard-evaluator/;
    const hits = files.filter((f) => existsSync(join(ROOT, f)) && re.test(readFileSync(join(ROOT, f), 'utf8')));
    expect(hits).toEqual([]);
  });

  it('bash-validator.cjs requires ./secret-detection.cjs', () => {
    expect(HOOK_SRC).toMatch(/require\(\s*['"]\.\/secret-detection\.cjs['"]\s*\)/);
  });

  it('bash-validator.cjs defines no SECRET_PATTERNS or PROTECTED_PATHS array of its own', () => {
    expect(HOOK_SRC).not.toMatch(/(?:const|let|var)\s+SECRET_PATTERNS\s*=/);
    expect(HOOK_SRC).not.toMatch(/(?:const|let|var)\s+PROTECTED_PATHS\s*=/);
    expect(HOOK_SRC).not.toMatch(/SECRET_PATTERNS\s*=\s*\[/);
    expect(HOOK_SRC).not.toMatch(/PROTECTED_PATHS\s*=\s*\[/);
  });
});

describe('narrow bash guard: two rules only', () => {
  it('RULE_FAMILIES is exactly secret-literal and protected-path-write', () => {
    expect(RULE_FAMILIES).toEqual(['secret-literal', 'protected-path-write']);
  });

  it.each(DENY_CASES)('a %s case denies with a reason that names the rule', (rule, command) => {
    const v = bash(command);
    expect(v).not.toBeNull();
    expect(v.deny).toBe(true);
    expect(v.reason).toMatch(RULE_REASON);
    expect(v.reason.startsWith(`[bash-validator] Denied: rule ${rule}.`)).toBe(true);
  });

  it('the trip-command list holds 20 commands', () => {
    expect(OLD_TRIP_COMMANDS).toHaveLength(20);
  });

  it.each(OLD_TRIP_COMMANDS)('allows the old trip command %s (cwd is the repo)', (command) => {
    expect(bash(command, ROOT)).toBeNull();
  });

  it.each(OLD_TRIP_COMMANDS)('allows the old trip command %s (cwd is a temp dir)', (command) => {
    expect(bash(command, tmpRoot)).toBeNull();
  });
});

describe('narrow bash guard: registration and launcher wiring', () => {
  it.each(MANIFESTS)('%s registers bash-validator exactly once, under PreToolUse Bash', (rel) => {
    const regs = registrations(JSON.parse(readFileSync(join(ROOT, rel), 'utf8'))).filter((r) => r.name === 'bash-validator');
    expect(regs).toEqual([{ event: 'PreToolUse', matcher: 'Bash', name: 'bash-validator' }]);
  });

  it('.claude/settings.json env has no guard switch key', () => {
    const cfg = JSON.parse(readFileSync(join(ROOT, '.claude', 'settings.json'), 'utf8'));
    const keys = Object.keys(cfg.env || {});
    for (const k of SWITCH_KEYS) expect(keys).not.toContain(k);
  });

  it('run-hook.cjs has bash-validator in neither RETIRED_HOOKS nor GUARD_HOOKS', () => {
    const retired = setOf(LAUNCHER_SRC, 'RETIRED_HOOKS');
    const guard = setOf(LAUNCHER_SRC, 'GUARD_HOOKS');
    expect(retired).not.toBeNull();
    expect(guard).not.toBeNull();
    expect(retired).not.toContain('bash-validator');
    expect(guard).not.toContain('bash-validator');
  });

  it('hook-utils.cjs has BashValidator in neither NO_PAYLOAD_FAIL_CLOSED nor FAIL_CLOSED_HOOKS', () => {
    const noPayload = setOf(UTILS_SRC, 'NO_PAYLOAD_FAIL_CLOSED');
    const failClosed = setOf(UTILS_SRC, 'FAIL_CLOSED_HOOKS');
    expect(noPayload).not.toBeNull();
    expect(failClosed).not.toBeNull();
    expect(noPayload).not.toContain('BashValidator');
    expect(failClosed).not.toContain('BashValidator');
  });
});

describe('narrow bash guard: the old switches are inert', () => {
  it('a protected-path deny still denies with CAGENTS_BASH_GUARD=off and CAGENTS_BASH_GUARD_DISABLED=1', () => {
    process.env.CAGENTS_BASH_GUARD = 'off';
    process.env.CAGENTS_BASH_GUARD_DISABLED = '1';
    const v = bash('touch /etc/cagents-narrow-scope-test');
    expect(v).not.toBeNull();
    expect(v.deny).toBe(true);
    expect(v.reason.startsWith('[bash-validator] Denied: rule protected-path-write.')).toBe(true);
  });
});
