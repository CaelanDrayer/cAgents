// Regression test for V10.26.12 — debug-mode controller prompt prefix (dormant)
// Asserts the prefix file exists and contains the four required sentinels.
// Failing-before: V10.26.11 had no debug-mode prompt file; this test locks the
// prefix text before V10.26.13 wires it into the controller spawn.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PREFIX_FILE = resolve(
  process.cwd(),
  '.claude/skills/act/reference/debug-mode-prompt.md'
);

describe('V10.26.12 debug-mode controller prompt prefix', () => {
  it('prefix file exists at the documented path', () => {
    expect(existsSync(PREFIX_FILE)).toBe(true);
  });

  const content = readFileSync(PREFIX_FILE, 'utf8');

  it('contains the DEBUG sentinel', () => {
    expect(content).toMatch(/DEBUG/);
  });

  it('contains the 4-phase sentinel', () => {
    expect(content).toMatch(/4-phase/);
  });

  it('contains the hypotheses_tested sentinel', () => {
    expect(content).toMatch(/hypotheses_tested/);
  });

  it('contains the failing-test sentinel', () => {
    expect(content).toMatch(/failing-test/);
  });

  it('is dormant in V10.26.12 (no wiring yet, docs say so)', () => {
    expect(content).toMatch(/dormant in V10\.26\.12/);
  });
});
