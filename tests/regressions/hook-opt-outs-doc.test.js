/**
 * hook-opt-outs-doc.test.js: FU-11 (v12.77.0).
 *
 * docs/HOOK_OPT_OUTS.md names env vars that relax the guard hooks. Each name
 * must exist in a hook, so the doc cannot point users at a switch that does
 * nothing. The bash-validator ask suffix names the doc path, so that path
 * must exist.
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

describe('FU-11: docs/HOOK_OPT_OUTS.md', () => {
  const doc = fs.readFileSync(DOC, 'utf8');
  const names = [...new Set(doc.match(/CAGENTS_[A-Z_]+/g) || [])];

  it('names at least the core opt-out vars', () => {
    for (const v of ['CAGENTS_BASH_GUARD', 'CAGENTS_SECRET_MODE', 'CAGENTS_DELEGATION_ENFORCEMENT',
      'CAGENTS_STALE_CHILD_MS', 'CAGENTS_HOOK_DEDUP_DISABLE']) {
      expect(names).toContain(v);
    }
  });

  it.each(names)('%s appears in .claude/hooks/*.cjs', (name) => {
    expect(new RegExp(`\\b${name}\\b`).test(hookSource)).toBe(true);
  });

  it('the bash-validator ask suffix names a doc path that exists', () => {
    const src = fs.readFileSync(path.join(HOOKS, 'bash-validator.cjs'), 'utf8');
    const m = src.match(/const OPT_OUT_SUFFIX = '[^']*see (docs\/[A-Za-z0-9_.-]+\.md)'/);
    expect(m).not.toBeNull();
    expect(m[1]).toBe('docs/HOOK_OPT_OUTS.md');
    expect(fs.existsSync(path.join(ROOT, m[1]))).toBe(true);
  });
});
