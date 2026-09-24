/**
 * TASK-25: Check 6's conditional bucket skips or runs npm test correctly
 *
 * agents/wave-reviewer/resources/gate-check-protocol.md's Check 6 section
 * (extended by TASK-22) documents a conditional bucket for
 * `type: vertical-slice` waves:
 *
 *   "`type: vertical-slice` waves: run `npm test` only if the wave's item
 *   set includes a `build`-category item. Skip otherwise, because a pure-
 *   UNDERSTAND slice has nothing to test."
 *
 * That's prose, not live code, so there is nothing in the codebase to
 * import and exercise directly. This test provides a small REFERENCE
 * IMPLEMENTATION of the documented rule, scoped to the vertical-slice case
 * only (per the doc's own scoping), and exercises it against two fixtures.
 * It also asserts the governing doc text still contains the phrases that
 * drive the rule, so this test fails loudly if the conditional bucket is
 * ever removed from the doc.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const GATE_CHECK_PROTOCOL_PATH = path.join(
  REPO_ROOT,
  'agents/wave-reviewer/resources/gate-check-protocol.md'
);

/**
 * Reference implementation of the Check 6 conditional bucket for
 * `type: vertical-slice` waves, per gate-check-protocol.md:
 *
 *   run `npm test` only if the wave's item set includes a `build`-category
 *   item; skip otherwise.
 *
 * Scoped to the vertical-slice case only, per the doc's own scoping —
 * other wave types (implementation/testing, research/design, documentation)
 * have their own defaults and are out of scope for this helper.
 */
function shouldRunNpmTest(waveType, workItems) {
  if (waveType !== 'vertical-slice') {
    return false;
  }
  return workItems.some((item) => item.type === 'build');
}

describe('TASK-25: wave-reviewer Check 6 conditional npm test bucket', () => {
  describe('shouldRunNpmTest reference implementation', () => {
    it('skips npm test for a vertical-slice wave with zero build items', () => {
      const fixture1 = [
        { id: 'WI-1', type: 'understand', title: 'Understand existing auth flow' },
        { id: 'WI-2', type: 'verify', title: 'Verify current behavior with manual walkthrough' },
      ];

      expect(shouldRunNpmTest('vertical-slice', fixture1)).toBe(false);
    });

    it('runs npm test for a vertical-slice wave with at least one build item', () => {
      const fixture2 = [
        { id: 'WI-1', type: 'understand', title: 'Understand existing auth flow' },
        { id: 'WI-2', type: 'build', title: 'Implement token refresh endpoint' },
        { id: 'WI-3', type: 'verify', title: 'Verify token refresh behavior' },
      ];

      expect(shouldRunNpmTest('vertical-slice', fixture2)).toBe(true);
    });

    it('skips npm test for non-vertical-slice wave types regardless of item set', () => {
      const fixtureWithBuild = [{ id: 'WI-1', type: 'build', title: 'Implement feature' }];

      expect(shouldRunNpmTest('implementation', fixtureWithBuild)).toBe(false);
      expect(shouldRunNpmTest('research', fixtureWithBuild)).toBe(false);
    });
  });

  describe('governing doc text', () => {
    it('gate-check-protocol.md Check 6 section still documents the vertical-slice/build conditional', () => {
      const content = fs.readFileSync(GATE_CHECK_PROTOCOL_PATH, 'utf8');

      // Isolate the Check 6 section (from its heading to the next "## " heading).
      const check6Match = content.match(
        /## Check 6[\s\S]*?(?=\n## Check 7|\n## [^\n]+\n|$)/
      );
      expect(check6Match, 'Check 6 section not found in gate-check-protocol.md').not.toBeNull();

      const check6Section = check6Match[0];

      expect(check6Section).toContain('vertical-slice');
      expect(check6Section).toContain('build');
    });
  });
});
