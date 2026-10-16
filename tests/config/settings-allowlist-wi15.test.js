/**
 * WI-15 regression: D1 (no-op PermissionRequest hook removed) and A1 (test
 * and CI allowlist rules).
 *
 * D1: permission-handler.cjs returned null in every branch. It added one node
 * spawn and a "Checking permissions..." flash to every permission dialog, and
 * it changed nothing. WI-15 unregistered it from every hook config and deleted
 * the file. The $comment hook count went from 26 to 25 unique registered hooks.
 *
 * A1: the approve-always clicks for the test runner and the CI scripts moved
 * into the shipped permissions.allow block. The broad interpreter wildcards
 * (node:*, python3:*) stay out, because they would pre-approve any script.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const CONFIGS = ['.claude/settings.json', '.claude/hooks.json', '.claude/settings.full.json'];
const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

function registeredHookNames(cfg) {
  const names = new Set();
  for (const matchers of Object.values(cfg.hooks || {})) {
    for (const matcher of matchers) {
      for (const hook of matcher.hooks || []) {
        const m = typeof hook.command === 'string' && hook.command.match(/run-hook\.cjs\\?"?\s+([a-z0-9-]+)/);
        if (m) names.add(m[1]);
      }
    }
  }
  return names;
}

describe('WI-15 D1: the no-op permission-handler hook is gone', () => {
  it('permission-handler.cjs is deleted from .claude/hooks/', () => {
    expect(existsSync(join(ROOT, '.claude', 'hooks', 'permission-handler.cjs'))).toBe(false);
  });

  it.each(CONFIGS)('%s registers no PermissionRequest hook and no permission-handler', (rel) => {
    const cfg = readJson(rel);
    expect(Object.keys(cfg.hooks || {})).not.toContain('PermissionRequest');
    expect(registeredHookNames(cfg).has('permission-handler')).toBe(false);
  });

  it('settings.json $comment hook count matches the registered hooks (25)', () => {
    const cfg = readJson('.claude/settings.json');
    const m = String(cfg.$comment || '').match(/(\d+)\s+unique registered hooks/);
    expect(m, '$comment must state "N unique registered hooks"').not.toBeNull();
    expect(Number(m[1])).toBe(registeredHookNames(cfg).size);
    expect(Number(m[1])).toBe(25);
  });

  it('settings.json and hooks.json register the same hook names', () => {
    const a = [...registeredHookNames(readJson('.claude/settings.json'))].sort();
    const b = [...registeredHookNames(readJson('.claude/hooks.json'))].sort();
    expect(b).toEqual(a);
  });
});

describe('WI-15 A1: test and CI allowlist rules', () => {
  // Round 2 (security review F4): exact runner forms, not open globs. A glob
  // such as scripts/ci/* matched scripts/ci/../../x.sh, and a bare vitest
  // prefix let a caller pick any config or root.
  const A1_RULES = [
    'Bash(npx vitest run --config tests/vitest.config.js:*)',
    'Bash(npm test)',
    'Bash(npm test --:*)',
    'Bash(bash scripts/ci/validate-counts.sh:*)',
    'Bash(bash scripts/ci/validate-agents.sh:*)',
    'Bash(node scripts/ci/validate-terminal-states.cjs:*)',
  ];
  const BANNED_BROAD = ['Bash(node:*)', 'Bash(node *)', 'Bash(python3:*)', 'Bash(python3 *)', 'Bash(npx:*)', 'Bash(bash:*)',
    'Bash(npx vitest run:*)', 'Bash(npm test:*)', 'Bash(node scripts/ci/*)', 'Bash(bash scripts/ci/*)'];

  it.each(['.claude/settings.json', '.claude/settings.full.json'])('%s holds the A1 rules', (rel) => {
    const allow = (readJson(rel).permissions || {}).allow || [];
    for (const rule of A1_RULES) expect(allow).toContain(rule);
  });

  it.each(['.claude/settings.json', '.claude/settings.full.json'])('every scripts/ci allow rule names a script that exists (%s)', (rel) => {
    const allow = (readJson(rel).permissions || {}).allow || [];
    const ci = allow.map((r) => /^Bash\((?:bash|node) (scripts\/ci\/[^:*]+):\*\)$/.exec(r)).filter(Boolean);
    expect(ci.length).toBeGreaterThan(0);
    for (const m of ci) expect(existsSync(join(ROOT, m[1])), m[1]).toBe(true);
  });

  it.each(['.claude/settings.json', '.claude/settings.full.json'])('%s holds no broad interpreter wildcard', (rel) => {
    const allow = (readJson(rel).permissions || {}).allow || [];
    for (const rule of BANNED_BROAD) expect(allow).not.toContain(rule);
  });
});
