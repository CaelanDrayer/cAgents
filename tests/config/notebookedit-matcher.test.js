/**
 * P5.4 regression — NotebookEdit covered by the Write|Edit gate matchers.
 *
 * BUG (pre-fix): the PreToolUse and PostToolUse matchers were "Write|Edit", so
 * a NotebookEdit (a Jupyter notebook cell write) bypassed the secret-detection /
 * controller-delegation gates (PreToolUse) and the post-write JSON/YAML +
 * evidence-recheck validators (PostToolUse). NotebookEdit writes file content
 * just like Write/Edit and must go through the same gates.
 *
 * FIX: broaden BOTH matchers to "Write|Edit|NotebookEdit".
 *
 * FAILING-BEFORE / PASSING-AFTER: pre-fix both matchers are "Write|Edit" → the
 * assertions FAIL; post-fix both are "Write|Edit|NotebookEdit" → PASS.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SETTINGS_PATH = join(process.cwd(), '.claude', 'settings.json');

describe('.claude/settings.json — NotebookEdit in Write|Edit gate matchers (P5.4)', () => {
  const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
  const hooks = settings.hooks || {};

  function writeEditMatchers(event) {
    return (hooks[event] || [])
      .map((group) => group.matcher)
      .filter((m) => typeof m === 'string' && m.includes('Write') && m.includes('Edit'));
  }

  it('PreToolUse Write|Edit matcher now equals "Write|Edit|NotebookEdit"', () => {
    const matchers = writeEditMatchers('PreToolUse');
    expect(matchers.length).toBeGreaterThan(0);
    for (const m of matchers) {
      expect(m).toBe('Write|Edit|NotebookEdit');
    }
  });

  it('PostToolUse Write|Edit matcher now equals "Write|Edit|NotebookEdit"', () => {
    const matchers = writeEditMatchers('PostToolUse');
    expect(matchers.length).toBeGreaterThan(0);
    for (const m of matchers) {
      expect(m).toBe('Write|Edit|NotebookEdit');
    }
  });

  it('no surviving bare "Write|Edit" matcher remains in either event', () => {
    for (const event of ['PreToolUse', 'PostToolUse']) {
      const bare = (hooks[event] || [])
        .map((g) => g.matcher)
        .filter((m) => m === 'Write|Edit');
      expect(bare).toEqual([]);
    }
  });
});
