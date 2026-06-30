/**
 * scripts/lint-hooks.cjs — hook-count drift catcher (A2-11 / C1.11).
 *
 * The hook-count constants drift whenever a hook is added/removed (settings.json,
 * CLAUDE.md, hooks.md, README all hardcode them). lint-hooks.cjs derives the counts
 * from disk so drift is catchable. This test asserts the script runs, prints the
 * three counts, and that the derived inventory is internally consistent
 * (hook_files === registered + dispatched + utilities), independently re-deriving
 * each count to guard against the script silently mis-counting.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const ROOT = process.cwd();
const SCRIPT = join(ROOT, 'scripts', 'lint-hooks.cjs');
const HOOKS_DIR = join(ROOT, '.claude', 'hooks');
const SETTINGS = join(ROOT, '.claude', 'settings.json');

describe('lint-hooks.cjs derives consistent hook counts', () => {
  it('the script exists', () => {
    expect(existsSync(SCRIPT)).toBe(true);
  });

  it('runs and exits 0 (inventory internally consistent)', () => {
    let exitCode = 0;
    let out = '';
    try {
      out = execSync(`node "${SCRIPT}"`, { encoding: 'utf8' });
    } catch (err) {
      exitCode = err.status;
      out = (err.stdout || '') + (err.stderr || '');
    }
    expect(exitCode, `lint-hooks.cjs output:\n${out}`).toBe(0);
    expect(out).toMatch(/hook_files=\d+/);
    expect(out).toMatch(/registered_hooks=\d+/);
    expect(out).toMatch(/event_types=\d+/);
    expect(out).toMatch(/consistency=OK/);
  });

  it('--json output is parseable and consistency.ok is true', () => {
    const out = execSync(`node "${SCRIPT}" --json`, { encoding: 'utf8' });
    const parsed = JSON.parse(out);
    expect(parsed.consistency.ok).toBe(true);
    expect(parsed.consistency.expected).toBe(parsed.consistency.actual);
  });

  it('derived counts match an independent re-derivation from disk', () => {
    delete require.cache[require.resolve('../../scripts/lint-hooks.cjs')];
    const { deriveCounts } = require('../../scripts/lint-hooks.cjs');
    const c = deriveCounts();

    // Re-derive hook_files independently.
    const cjs = readdirSync(HOOKS_DIR).filter((f) => f.endsWith('.cjs'));
    expect(c.hook_files).toBe(cjs.length);

    // Re-derive event_types + registered_hooks independently.
    const settings = JSON.parse(readFileSync(SETTINGS, 'utf8'));
    expect(c.event_types).toBe(Object.keys(settings.hooks || {}).length);

    const names = new Set();
    for (const event of Object.keys(settings.hooks || {})) {
      for (const entry of settings.hooks[event]) {
        for (const hk of entry.hooks || []) {
          const m = (hk.command || '').match(/run-hook\.cjs"\s+([a-z0-9-]+)/);
          if (m) names.add(m[1]);
        }
      }
    }
    expect(c.registered_hooks).toBe(names.size);

    // Internal-consistency invariant: every .cjs is registered, dispatched, or a utility.
    expect(c.hook_files).toBe(c.registered_hooks + c.dispatched + c.utilities.length);
  });
});
