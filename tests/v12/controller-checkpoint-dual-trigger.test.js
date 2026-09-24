/**
 * TASK-20 regression test: checkpoint's dual trigger fires exactly once on
 * whichever condition comes first.
 *
 * `.claude/rules/core/controllers.md` (Mid-Execution Validation, V10.23.0)
 * reads:
 *
 *   "Mid-Execution (5 checks): run these after every 3 completed work
 *   items, or immediately when the last vertical-slice-tagged item
 *   completes, whichever comes first. An item counts as completed only
 *   after its bounded reviewer loop resolves, not merely after its
 *   executor pass finishes."
 *
 * That is prose guidance, not live code -- there is no hook or module that
 * implements it today. This file supplies a small REFERENCE
 * IMPLEMENTATION of the described trigger logic and exercises it against
 * both trigger orderings, asserting the checkpoint fires exactly once in
 * each case and is never double-fired for the same 3-item window.
 */
import { describe, it, expect } from 'vitest';

/**
 * Reference implementation of the dual-trigger mid-execution checkpoint
 * condition described in controllers.md.
 *
 * @param {Object} params
 * @param {number} params.completedCount - running count of items that have
 *   fully completed (reviewer loop resolved, not merely executor pass).
 * @param {boolean} params.isLastSliceItemJustResolved - true only on the
 *   step where the last vertical-slice-tagged item's reviewer loop just
 *   resolved.
 * @returns {boolean} true if a mid-execution checkpoint should run now.
 */
function shouldCheckpoint({ completedCount, isLastSliceItemJustResolved }) {
  return completedCount % 3 === 0 || isLastSliceItemJustResolved === true;
}

/**
 * Simulates running a sequence of work items through executor -> bounded
 * reviewer-loop resolution -> checkpoint evaluation, and records how many
 * times (and where) the mid-execution checkpoint actually fires.
 *
 * Each item is only counted toward `completedCount` at the point its
 * simulated reviewer loop resolves -- an executor pass alone does NOT
 * increment the count, matching the controllers.md text.
 *
 * "Whichever comes first" is enforced by windowing: each run of 3 items
 * (items 1-3, 4-6, 7-9, ...) is one checkpoint window. A window fires at
 * most once, on whichever trigger (count or slice) satisfies it first.
 * Once a window has fired, reaching its count-multiple-of-3 boundary
 * later in that same window does NOT fire a second time.
 *
 * @param {Array<{isSliceItem?: boolean, isLastSliceItem?: boolean}>} items
 * @returns {{
 *   checkpointFireCount: number,
 *   fireLog: Array<{itemNumber: number, completedCount: number, reason: 'count'|'slice'}>,
 *   completedCount: number,
 * }}
 */
function runSequence(items) {
  let completedCount = 0;
  let checkpointFireCount = 0;
  let lastCheckpointedWindow = 0;
  const fireLog = [];

  items.forEach((item, index) => {
    const itemNumber = index + 1;

    // --- Simulated executor pass ---
    // The executor "finishes" here. Per controllers.md this alone does
    // NOT count the item as completed, so completedCount is untouched.

    // --- Simulated bounded reviewer-loop resolution ---
    // Only now does the item count as completed.
    completedCount += 1;

    const isLastSliceItemJustResolved = Boolean(
      item.isSliceItem && item.isLastSliceItem
    );

    const triggered = shouldCheckpoint({
      completedCount,
      isLastSliceItemJustResolved,
    });

    const currentWindow = Math.ceil(completedCount / 3);

    // Fire only if this window hasn't already been checkpointed by an
    // earlier trigger (the "whichever comes first" / no-double-fire rule).
    if (triggered && currentWindow > lastCheckpointedWindow) {
      checkpointFireCount += 1;
      lastCheckpointedWindow = currentWindow;
      fireLog.push({
        itemNumber,
        completedCount,
        reason: isLastSliceItemJustResolved ? 'slice' : 'count',
      });
    }
  });

  return { checkpointFireCount, fireLog, completedCount };
}

describe('controller mid-execution checkpoint: dual trigger fires exactly once', () => {
  it('shouldCheckpoint returns true on the count-of-3 boundary', () => {
    expect(
      shouldCheckpoint({ completedCount: 3, isLastSliceItemJustResolved: false })
    ).toBe(true);
    expect(
      shouldCheckpoint({ completedCount: 6, isLastSliceItemJustResolved: false })
    ).toBe(true);
    expect(
      shouldCheckpoint({ completedCount: 1, isLastSliceItemJustResolved: false })
    ).toBe(false);
    expect(
      shouldCheckpoint({ completedCount: 2, isLastSliceItemJustResolved: false })
    ).toBe(false);
  });

  it('shouldCheckpoint returns true when the last slice item just resolved, regardless of count', () => {
    expect(
      shouldCheckpoint({ completedCount: 2, isLastSliceItemJustResolved: true })
    ).toBe(true);
    expect(
      shouldCheckpoint({ completedCount: 1, isLastSliceItemJustResolved: true })
    ).toBe(true);
  });

  it('ordering A (count-trigger fires first): 5 plain items checkpoint exactly once, at item 3', () => {
    // None of the 5 items is a (last) vertical-slice item, so only the
    // count-of-3 trigger can ever fire.
    const items = [
      { isSliceItem: false, isLastSliceItem: false },
      { isSliceItem: false, isLastSliceItem: false },
      { isSliceItem: false, isLastSliceItem: false },
      { isSliceItem: false, isLastSliceItem: false },
      { isSliceItem: false, isLastSliceItem: false },
    ];

    const result = runSequence(items);

    expect(result.completedCount).toBe(5);
    expect(result.checkpointFireCount).toBe(1);
    expect(result.fireLog).toHaveLength(1);
    expect(result.fireLog[0]).toEqual({
      itemNumber: 3,
      completedCount: 3,
      reason: 'count',
    });
  });

  it('ordering B (slice-trigger fires first): last slice item at item 2 checkpoints exactly once, at item 2, with no double-fire at item 3', () => {
    // The last vertical-slice-tagged item resolves at item 2 -- before the
    // 3-item count threshold is reached.
    const items = [
      { isSliceItem: false, isLastSliceItem: false },
      { isSliceItem: true, isLastSliceItem: true },
      { isSliceItem: false, isLastSliceItem: false },
      { isSliceItem: false, isLastSliceItem: false },
      { isSliceItem: false, isLastSliceItem: false },
    ];

    const result = runSequence(items);

    expect(result.completedCount).toBe(5);

    // Fires exactly once overall...
    expect(result.checkpointFireCount).toBe(1);
    expect(result.fireLog).toHaveLength(1);

    // ...at item 2, via the slice trigger...
    expect(result.fireLog[0]).toEqual({
      itemNumber: 2,
      completedCount: 2,
      reason: 'slice',
    });

    // ...and explicitly NOT again at item 3, even though completedCount
    // reaches 3 (a count-trigger boundary) immediately afterward in the
    // same 3-item window that the slice trigger already checkpointed.
    expect(result.fireLog.some((entry) => entry.itemNumber === 3)).toBe(false);
  });
});
