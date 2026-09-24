/**
 * TASK-21: pure-UNDERSTAND edge case collapses and checkpoints exactly
 * once at plan completion.
 *
 * agents/planner/resources/vertical-slice-extraction.md's "## Edge cases"
 * section (landed by TASK-12) documents:
 *
 *   "Pure-UNDERSTAND request: the slice equals the UNDERSTAND items
 *   present. This collapses to the small-plan case, with one wave and no
 *   split. The checkpoint fires once, at plan completion."
 *
 * This is agent-instruction prose for the LLM planner/controller, not live
 * application code, so there is nothing to `import` and exercise directly.
 * This file provides two small REFERENCE IMPLEMENTATIONS that encode the
 * two rules this edge case combines, so the combination has an executable
 * regression guard:
 *
 *   1. `emitWaves()` -- the small-plan-collapse rule (mirrors
 *      tests/v12/vertical-slice-small-plan-collapse.test.js's reference
 *      implementation; rewritten fresh here to keep this file
 *      self-contained -- no cross-file import).
 *   2. `runCheckpoints()` -- the controller mid-execution checkpoint's
 *      dual-trigger rule from .claude/rules/core/controllers.md ("run
 *      these after every 3 completed work items, or immediately when the
 *      last vertical-slice-tagged item completes, whichever comes
 *      first... An item counts as completed only after its bounded
 *      reviewer loop resolves, not merely after its executor pass
 *      finishes.").
 *
 * The pure-UNDERSTAND fixture is the specific case where BOTH triggers
 * land on the same, final item: with exactly 3 items and every item
 * slice-tagged (because the slice equals the full item list when every
 * item is UNDERSTAND), the count boundary (every 3rd completion) and the
 * slice-complete boundary (last slice-tagged item) coincide at item 3,
 * which is also plan completion. The dual-trigger rule must still fire
 * the checkpoint exactly ONCE there, not twice (once per matching
 * condition), and a companion control fixture proves the reference
 * implementation can otherwise fire earlier than the last item, so the
 * "fires once, at plan completion, not an earlier count-based boundary"
 * assertion on the main fixture is not vacuously true.
 *
 * Bug-driven testing mandate: this test would catch a regression where
 * the doc silently drops the "Pure-UNDERSTAND request" edge case, or
 * where a future live implementation double-fires the checkpoint when
 * the count and slice-complete triggers coincide.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const VERTICAL_SLICE_EXTRACTION_DOC = path.join(
  REPO_ROOT,
  'agents',
  'planner',
  'resources',
  'vertical-slice-extraction.md'
);

/**
 * Reference implementation of the small-plan-collapse rule.
 *
 * @param {string[]} allWorkItemIds - every work item ID in the plan.
 * @param {string[]} sliceWorkItemIds - the vertical-slice chain's work item IDs.
 * @returns {{total_waves: number, waves: Array<{wave: number, type: string, work_item_ids: string[]}>}}
 */
function emitWaves(allWorkItemIds, sliceWorkItemIds) {
  const allSet = new Set(allWorkItemIds);
  const sliceSet = new Set(sliceWorkItemIds);

  const isFullCollapse =
    allSet.size === sliceSet.size &&
    [...allSet].every((id) => sliceSet.has(id));

  if (isFullCollapse) {
    // Small-plan collapse: the vertical-slice wave IS the only wave.
    return {
      total_waves: 1,
      waves: [
        {
          wave: 1,
          type: 'vertical-slice',
          work_item_ids: allWorkItemIds,
        },
      ],
    };
  }

  const remainder = allWorkItemIds.filter((id) => !sliceSet.has(id));
  return {
    total_waves: 2,
    waves: [
      {
        wave: 1,
        type: 'vertical-slice',
        work_item_ids: sliceWorkItemIds,
      },
      {
        wave: 2,
        type: 'implementation',
        work_item_ids: remainder,
      },
    ],
  };
}

/**
 * Reference implementation of the controller mid-execution checkpoint's
 * dual-trigger rule (.claude/rules/core/controllers.md:592 and its twin at
 * controller-validation-checklist.md:147):
 *
 *   "run these after every 3 completed work items, or immediately when
 *   the last vertical-slice-tagged item completes, whichever comes
 *   first. An item counts as completed only after its bounded reviewer
 *   loop resolves, not merely after its executor pass finishes."
 *
 * @param {Array<{id: string, is_slice_tagged: boolean}>} orderedItems -
 *   work items in the order their reviewer loops resolve (i.e.
 *   completion order, not executor-pass order).
 * @returns {Array<{after_item: string, position: number, reason: string}>}
 *   one entry per checkpoint firing. A position where both triggers are
 *   simultaneously satisfied still produces exactly one entry -- the two
 *   conditions are combined with OR per completed item, never summed.
 */
function runCheckpoints(orderedItems) {
  const sliceItemIds = orderedItems
    .filter((item) => item.is_slice_tagged)
    .map((item) => item.id);
  const lastSliceItemId =
    sliceItemIds.length > 0 ? sliceItemIds[sliceItemIds.length - 1] : null;

  const firings = [];
  let completedSinceLastCheckpoint = 0;

  orderedItems.forEach((item, idx) => {
    completedSinceLastCheckpoint += 1;
    const position = idx + 1;
    const countTrigger = completedSinceLastCheckpoint >= 3;
    const sliceCompleteTrigger =
      lastSliceItemId !== null && item.id === lastSliceItemId;

    if (countTrigger || sliceCompleteTrigger) {
      let reason;
      if (countTrigger && sliceCompleteTrigger) {
        reason = 'count+slice-complete (coincident)';
      } else if (countTrigger) {
        reason = 'count';
      } else {
        reason = 'slice-complete';
      }

      // OR, not two separate pushes: this is the mechanism that keeps a
      // coincident firing to exactly one checkpoint, not two.
      firings.push({ after_item: item.id, position, reason });
      completedSinceLastCheckpoint = 0;
    }
  });

  return firings;
}

describe('TASK-21: pure-UNDERSTAND edge case collapse + checkpoint', () => {
  describe('Fixture -- pure-UNDERSTAND plan (3 items, all type: understand)', () => {
    // Every item is UNDERSTAND, so the slice (by definition, the minimal
    // chain touching every category present) equals the full item list --
    // there is only one category to touch, and it touches all of it.
    const workItems = [
      { id: 'WI-1', type: 'understand', title: 'Read existing config loader' },
      { id: 'WI-2', type: 'understand', title: 'Enumerate call sites' },
      { id: 'WI-3', type: 'understand', title: 'Document current behavior' },
    ];
    const allWorkItemIds = workItems.map((item) => item.id);
    const sliceWorkItemIds = workItems.map((item) => item.id); // slice == full list

    it('touches exactly one category: understand', () => {
      const categories = new Set(workItems.map((item) => item.type));
      expect(Array.from(categories)).toEqual(['understand']);
    });

    it('the slice equals the full work-item list', () => {
      expect(sliceWorkItemIds).toEqual(allWorkItemIds);
    });

    describe('Assertion 1: small-plan collapse', () => {
      const result = emitWaves(allWorkItemIds, sliceWorkItemIds);

      it('returns total_waves: 1', () => {
        expect(result.total_waves).toBe(1);
      });

      it('the single wave has type: vertical-slice', () => {
        expect(result.waves[0].type).toBe('vertical-slice');
      });

      it('no second (depth-fill) wave is emitted', () => {
        expect(result.waves.length).toBe(1);
      });

      it('the single wave carries all three UNDERSTAND items', () => {
        expect(result.waves[0].work_item_ids).toEqual(allWorkItemIds);
      });
    });

    describe('Assertion 2: checkpoint fires exactly once, at plan completion', () => {
      // Completion order == reviewer-loop resolution order. Every item is
      // slice-tagged (the slice is the full list), so the last item
      // resolved is both the plan's last item AND the last slice-tagged
      // item -- the count boundary (every 3rd) and the slice-complete
      // boundary coincide here.
      const orderedItems = workItems.map((item) => ({
        id: item.id,
        is_slice_tagged: true,
      }));
      const firings = runCheckpoints(orderedItems);

      it('fires exactly once', () => {
        expect(firings.length).toBe(1);
      });

      it('fires on the last item (WI-3), i.e. at plan completion', () => {
        expect(firings[0].after_item).toBe('WI-3');
        expect(firings[0].position).toBe(3);
      });

      it('does not fire at any earlier position (WI-1 or WI-2)', () => {
        const positions = firings.map((f) => f.position);
        expect(positions).not.toContain(1);
        expect(positions).not.toContain(2);
      });

      it('the single firing is the coincident case (both triggers matched, still one checkpoint)', () => {
        expect(firings[0].reason).toBe('count+slice-complete (coincident)');
      });
    });
  });

  describe('Control fixture -- proves runCheckpoints() can fire before the last item', () => {
    // Without this control, "fires once, at plan completion, not an
    // earlier count-based boundary" on the 3-item pure-UNDERSTAND fixture
    // above would be true of ANY implementation that only ever fires on
    // the final item -- including a broken one that ignores the count
    // trigger entirely. This fixture has 5 items where the count boundary
    // (3rd completion) lands strictly before the last item (5th
    // completion), so it must produce a firing at position 3 that is NOT
    // plan completion.
    const orderedItems = [
      { id: 'WI-1', is_slice_tagged: false },
      { id: 'WI-2', is_slice_tagged: false },
      { id: 'WI-3', is_slice_tagged: false },
      { id: 'WI-4', is_slice_tagged: false },
      { id: 'WI-5', is_slice_tagged: false },
    ];
    const firings = runCheckpoints(orderedItems);

    it('fires at the count boundary (position 3), before plan completion', () => {
      expect(firings.length).toBeGreaterThanOrEqual(1);
      expect(firings[0].position).toBe(3);
      expect(firings[0].reason).toBe('count');
    });

    it('that first firing is not the last item', () => {
      expect(firings[0].after_item).not.toBe('WI-5');
    });
  });

  describe('Source doc still states the Pure-UNDERSTAND edge case', () => {
    it('agents/planner/resources/vertical-slice-extraction.md exists', () => {
      expect(fs.existsSync(VERTICAL_SLICE_EXTRACTION_DOC)).toBe(true);
    });

    it('the Edge cases section still contains the phrase "Pure-UNDERSTAND request"', () => {
      const content = fs.readFileSync(VERTICAL_SLICE_EXTRACTION_DOC, 'utf8');
      expect(content).toContain('## Edge cases');
      expect(content).toContain('Pure-UNDERSTAND request');
    });

    it('the edge case still ties the collapse to plan completion and one checkpoint firing', () => {
      const content = fs.readFileSync(VERTICAL_SLICE_EXTRACTION_DOC, 'utf8');
      expect(content).toMatch(/collapses to the small-plan case/i);
      expect(content).toMatch(/checkpoint fires once, at plan completion/i);
    });
  });
});
