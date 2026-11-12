/**
 * hook-opt-outs-doc.test.js: FU-11 (v12.77.0).
 *
 * docs/HOOK_OPT_OUTS.md names env vars that relax the guard hooks. Each name
 * must exist in a hook, so the doc cannot point users at a switch that does
 * nothing.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..', '..');
const DOC = path.join(ROOT, 'docs', 'HOOK_OPT_OUTS.md');
const HOOKS = path.join(ROOT, '.claude', 'hooks');

const hookSource = fs.readdirSync(HOOKS)
  .filter((f) => f.endsWith('.cjs'))
  .map((f) => fs.readFileSync(path.join(HOOKS, f), 'utf8'))
  .join('\n');

// FU2-13 (v12.81.0): the doc names the old bash guard keys only to say that
// they are inert. No hook may read them, and the doc must say "inert".
const INERT = ['CAGENTS_BASH_GUARD', 'CAGENTS_BASH_GUARD_DISABLED'];

describe('FU-11: docs/HOOK_OPT_OUTS.md', () => {
  const doc = fs.readFileSync(DOC, 'utf8');
  const names = [...new Set(doc.match(/CAGENTS_[A-Z_]+/g) || [])];
  const live = names.filter((n) => !INERT.includes(n));

  it('names at least the core opt-out vars', () => {
    for (const v of ['CAGENTS_SECRET_MODE', 'CAGENTS_DELEGATION_ENFORCEMENT',
      'CAGENTS_STALE_CHILD_MS', 'CAGENTS_HOOK_DEDUP_DISABLE',
      'CAGENTS_BASH_NARROW_GUARD']) {
      expect(names).toContain(v);
    }
  });

  it.each(live)('%s appears in .claude/hooks/*.cjs', (name) => {
    expect(new RegExp(`\\b${name}\\b`).test(hookSource)).toBe(true);
  });

  it.each(INERT)('%s is inert: no hook reads it, and the doc says so', (name) => {
    expect(new RegExp(`\\b${name}\\b`).test(hookSource)).toBe(false);
    const line = doc.split('\n').find((l) => new RegExp(`\\b${name}\\b`).test(l));
    expect(line).toBeDefined();
    expect(line).toMatch(/inert/);
  });
});
