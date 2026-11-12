import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * HLP-H1 regression: AskUserQuestion takes at most 4 options per question.
 * /helper Mode 1 once listed 7 options in one call, so the no-argument path
 * broke. Every `options: [...]` list in helper/SKILL.md must hold 4 or fewer.
 * Origin: session act_streamline-cleanup-plugin_261111_001, WI-37.
 */
const SKILL = join(__dirname, '..', '..', '.claude', 'skills', 'helper', 'SKILL.md');
const MAX_OPTIONS = 4;

function optionLists(text) {
  const lists = [];
  for (const m of text.matchAll(/options:\s*`(\[.*?\])`/g)) {
    lists.push({ raw: m[1], items: JSON.parse(m[1]) });
  }
  return lists;
}

describe('HLP-H1: helper AskUserQuestion option cap', () => {
  const text = readFileSync(SKILL, 'utf8');
  const lists = optionLists(text);

  it('finds the Mode 1 option lists', () => {
    expect(lists.length).toBeGreaterThanOrEqual(3);
  });

  it(`every option list has at most ${MAX_OPTIONS} entries`, () => {
    const over = lists.filter((l) => l.items.length > MAX_OPTIONS).map((l) => l.raw);
    expect(over).toEqual([]);
  });

  it('keeps every Step 1 intent reachable as an exact option label', () => {
    // Exact labels, not substrings: a group label such as
    // "Build, fix, or debug something" must not stand in for a leaf option.
    const all = new Set(lists.flatMap((l) => l.items));
    for (const label of [
      'Build or implement something',
      'Fix a bug or error',
      'Debug a stubborn problem (2+ failed fixes)',
      'Review or improve existing work',
      'Plan or design before building',
      'Explore one command',
      'Show me everything',
    ]) {
      expect(all.has(label), label).toBe(true);
    }
  });
});
