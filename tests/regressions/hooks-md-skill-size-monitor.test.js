import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for V11.2.3 hooks.md skill-size-monitor doc fix.
 *
 * Bug: skill-size-monitor.cjs was added to .claude/hooks/ in V11.1.13 (squashed
 * commit 37b321e9 — "Skill-size monitor hook + per-agent version-field test")
 * and is registered in .claude/settings.json. But .claude/rules/core/hooks.md
 * never mentioned the hook in either the count claim ("28 .cjs files = 25 unique
 * registered hooks") or the Active Hooks doc body or the Hook Type Overview
 * table. Users/contributors reading hooks.md cannot discover this hook exists.
 *
 * Test added: tests/regressions/hooks-md-skill-size-monitor.test.js — asserts
 * that hooks.md mentions skill-size-monitor.cjs and contains a doc entry for it.
 *
 * Could have caught by: hook-doc-coverage test that verifies every .cjs hook
 * in .claude/hooks/ is mentioned by name in hooks.md.
 */

const ROOT = process.cwd();
const HOOKS_MD = join(ROOT, '.claude/rules/core/hooks.md');

describe('hooks.md documents skill-size-monitor.cjs', () => {
  it('hooks.md exists', () => {
    expect(existsSync(HOOKS_MD)).toBe(true);
  });

  it('hooks.md mentions skill-size-monitor.cjs by name', () => {
    const content = readFileSync(HOOKS_MD, 'utf8');
    expect(content).toContain('skill-size-monitor.cjs');
  });

  it('hooks.md count claim is current (30 .cjs / 27 unique, V11.3.0)', () => {
    const content = readFileSync(HOOKS_MD, 'utf8');
    expect(content).toContain('30 .cjs files');
    expect(content).toContain('27 unique');
  });

  it('every .cjs hook in .claude/hooks/ is mentioned in hooks.md', () => {
    const { readdirSync } = require('fs');
    const hooks = readdirSync(join(ROOT, '.claude/hooks'))
      .filter((f) => f.endsWith('.cjs'));
    const content = readFileSync(HOOKS_MD, 'utf8');
    const missing = hooks.filter((h) => !content.includes(h));
    expect(missing, `hooks.md is missing entries for: ${missing.join(', ')}`).toEqual([]);
  });
});
