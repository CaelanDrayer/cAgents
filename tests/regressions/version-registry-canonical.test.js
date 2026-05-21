import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for V11.2.16 — Q-011 / F-xcut-003.
 *
 * Bug: `.claude/rules/core/version-registry.md` simultaneously described the
 * V10.x 21-location registry catalog AND the V11.0+ canonical 18-location
 * registry. The mixed wording ("the V10.x catalog had 21 locations; the
 * current canonical count is 17", "Any '21 registry locations' phrasing
 * elsewhere in this file refers to the V10.x historical catalog") creates
 * ambiguity for future registry additions and obscures the single source
 * of truth.
 *
 * Fix: All V10.x historical context was moved verbatim to
 * `docs/VERSION_REGISTRY_HISTORY.md`. The rule file retains ONLY the
 * canonical 17-row table + tiny-bump cadence rules + a single-line back-
 * reference to the history file.
 *
 * This test asserts:
 *   (1) No "V10.x catalog" phrasing remains in the rule file.
 *   (2) No "21 registry locations" / "had 21 locations" phrasing remains
 *       as a registry count (the digits "21" may legitimately appear in
 *       other contexts — version numbers, line refs — but not as a
 *       registry-count claim).
 *   (3) The canonical 18-row markdown table (`| # | File | Field/Line |
 *       Updated By |`) still parses and contains exactly 17 numbered rows
 *       (1 through 17, in order).
 *
 * The test MUST FAIL at HEAD 7b3a1d45 (current state still has V10.x
 * cruft) and PASS after the fix lands. This is the failing-before /
 * passing-after invariant required by the Bug-Driven Testing mandate in
 * CLAUDE.md.
 *
 * Could have caught by: a documentation-currency / source-of-truth
 * invariant test on registry-rule files (this file).
 */

const ROOT = process.cwd();
const RULE_FILE = '.claude/rules/core/version-registry.md';

function readRuleFile() {
  return readFileSync(join(ROOT, RULE_FILE), 'utf8');
}

describe('version-registry.md is canonical-only (Q-011)', () => {
  const content = readRuleFile();

  it('contains no "V10.x catalog" phrasing', () => {
    // "V10.x catalog" appears in the pre-fix rule file at two spots:
    //   - Top of "Version Locations" section ("The V10.x catalog had 21 locations").
    //   - Inside tiny-bump criterion 5 ("the V10.x catalog had 21; the V11.0 canonical count is 17").
    const matches = content.match(/V10\.x\s+catalog/gi) || [];
    expect(
      matches,
      `version-registry.md must contain no "V10.x catalog" phrasing — historical context belongs in docs/VERSION_REGISTRY_HISTORY.md. Found ${matches.length} occurrence(s).`,
    ).toEqual([]);
  });

  it('contains no "21 registry locations" / "had 21 locations" phrasing as a registry count', () => {
    // Specifically watch for the pre-fix sentences:
    //   - 'Any "21 registry locations" phrasing'
    //   - 'V10.x catalog had 21 locations'
    //   - 'V10.x catalog had 21'
    const patterns = [
      /21\s+registry\s+locations/i,
      /had\s+21\s+locations/i,
      /catalog\s+had\s+21/i,
    ];
    const hits = [];
    for (const re of patterns) {
      const m = content.match(re);
      if (m) hits.push({ pattern: re.toString(), match: m[0] });
    }
    expect(
      hits,
      `version-registry.md must contain no "21 registry locations" / "had 21 locations" phrasing — the canonical count is 17 and historical V10.x references belong in docs/VERSION_REGISTRY_HISTORY.md. Hits:\n` +
        hits.map((h) => `  - ${h.pattern} matched "${h.match}"`).join('\n'),
    ).toEqual([]);
  });

  it('canonical 17-row registry table parses with rows numbered 1..18', () => {
    // Row shape: `| N | <path> | <field> | <updater> |` where N is 1-2 digits.
    // We extract every row in the canonical table and verify it covers 1..18
    // contiguously with no duplicates.
    const rowRe = /^\|\s*(\d{1,2})\s*\|\s*[^|]+\|\s*[^|]+\|\s*[^|]+\|/gm;
    const numbers = [];
    let m;
    while ((m = rowRe.exec(content)) !== null) {
      numbers.push(parseInt(m[1], 10));
    }

    // The canonical table has exactly 17 rows, numbered 1..17 in order.
    expect(
      numbers,
      `version-registry.md must contain a markdown table with exactly 17 rows numbered 1..17.\n` +
        `Extracted row numbers: [${numbers.join(', ')}]`,
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
  });
});
