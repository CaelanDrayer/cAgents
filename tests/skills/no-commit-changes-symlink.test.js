/**
 * WI-2 (v12.12.1) regression: `.claude/skills/commit-changes` must NOT exist
 * as a path (symlink or otherwise).
 *
 * Context: a broken symlink in
 *   _archive/repo_root_scratch/example/external-skills/pjt222__agent-almanac/.claude/skills/commit-changes
 *     -> ../../skills/commit-changes  (path does not resolve in archive layout)
 * was causing Claude Code's session-time plugin discovery to re-create
 * `.claude/skills/commit-changes` as a broken symlink in the repo root. The
 * existing `tests/skills/no-broken-symlinks.test.js` would catch this AFTER
 * re-creation; this test is a tighter, name-specific guard that fires fast
 * and points directly at the WI-2 fix.
 *
 * Fix applied in v12.12.1:
 *   1. Deleted the offending source symlink in _archive/.
 *   2. Added `.claude/skills/commit-changes` to .gitignore (belt-and-suspenders).
 *   3. Added this regression test.
 *
 * Bug-driven testing mandate (CLAUDE.md): failing-before / passing-after.
 * If this test starts failing in the future, run:
 *   find _archive -name commit-changes -type l -delete
 *   rm -f .claude/skills/commit-changes
 * and investigate the new discovery source.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, lstatSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const TARGET = join(REPO_ROOT, '.claude', 'skills', 'commit-changes');

describe('WI-2: .claude/skills/commit-changes does not exist', () => {
  it('path does not exist as a regular file, directory, or symlink', () => {
    // existsSync follows symlinks; lstatSync does not. We want BOTH to fail —
    // i.e. neither the symlink nor its target should be present here.
    const exists = existsSync(TARGET);
    let lstatExists = false;
    try {
      lstatSync(TARGET);
      lstatExists = true;
    } catch {
      lstatExists = false;
    }

    expect(
      exists || lstatExists,
      `Expected ${TARGET} to not exist (the WI-2 regression guard). ` +
        `If this fails, a broken symlink has been re-created at this path. ` +
        `Run: rm -f ${TARGET} and investigate.`
    ).toBe(false);
  });

  it('the offending source symlink in _archive/ is not present', () => {
    const sourceSymlink = join(
      REPO_ROOT,
      '_archive',
      'repo_root_scratch',
      'example',
      'external-skills',
      'pjt222__agent-almanac',
      '.claude',
      'skills',
      'commit-changes'
    );
    let sourceExists = false;
    try {
      lstatSync(sourceSymlink);
      sourceExists = true;
    } catch {
      sourceExists = false;
    }
    expect(
      sourceExists,
      `Expected source symlink ${sourceSymlink} to have been deleted in WI-2 (v12.12.1).`
    ).toBe(false);
  });
});
