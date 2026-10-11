/**
 * Regression test for N3 (v12.74.0): false ExitWorktree claim.
 *
 * Bug: skill-format.md and team/reference/cross-version-compat.md said the
 *      ExitWorktree tool works inside a subagent that runs with
 *      `isolation: worktree`. The tools reference says it is "Not available to
 *      subagents that already run in their own working directory, such as
 *      with `isolation: worktree`" (https://code.claude.com/docs/en/tools-reference).
 *
 * Fix: both docs now say ExitWorktree is not available to worktree-isolated
 *      subagents.
 *
 * This test fails on the pre-fix tree, which held the false sentences below.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\s+/g, ' ');

const SKILL_FORMAT = '.claude/rules/core/skill-format.md';
const COMPAT = '.claude/skills/team/reference/cross-version-compat.md';

describe('ExitWorktree is not claimed for isolation: worktree subagents (N3)', () => {
  it('skill-format.md drops the pre-fix claim', () => {
    const text = read(SKILL_FORMAT);
    expect(text).not.toMatch(/ExitWorktree` tool \(CC 2\.1\.72\) is available inside a worktree-isolated/);
    expect(text).not.toMatch(/exits the worktree and returns to the parent context/);
  });

  it('skill-format.md states ExitWorktree is not available under isolation: worktree', () => {
    expect(read(SKILL_FORMAT)).toMatch(
      /It is not available to a subagent that runs with `isolation: worktree`/,
    );
  });

  it('cross-version-compat.md drops the pre-fix claim', () => {
    expect(read(COMPAT)).not.toMatch(/Clean exit from worktree-isolated subagents/);
  });

  it('cross-version-compat.md states ExitWorktree is not available under isolation: worktree', () => {
    expect(read(COMPAT)).toMatch(
      /\| `ExitWorktree` tool \|[^|]*\|[^|]*Not available to subagents that run with `isolation: worktree`/,
    );
  });
});
