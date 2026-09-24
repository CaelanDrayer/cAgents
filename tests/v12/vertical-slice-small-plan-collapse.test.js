/**
 * TASK-15: small-plan collapse produces a single vertical-slice wave
 *
 * Locks the small-plan-collapse rule documented in prose (no live JS
 * implementation exists) at:
 *   - agents/planner/resources/per-wave-emission.md
 *     ("Vertical-slice rules" subsection, ~lines 79-83)
 *   - agents/planner/resources/vertical-slice-extraction.md
 *     ("## Small-plan collapse" section)
 *
 * Rule: when `vertical_slice.work_item_ids` equals the full work-item
 * list, the first wave IS the only wave. The planner types it
 * `vertical-slice` and adds no synthetic extra wave, and no empty
 * depth-fill wave.
 *
 * This file includes a small REFERENCE IMPLEMENTATION, `emitWaves()`,
 * that encodes the rule so the collapse behavior has an executable
 * regression guard even though the planner's own emission logic is
 * prose-only (produced by an LLM agent, not a function this suite can
 * import). Fixture 2 proves the reference implementation actually
 * branches (i.e. the Fixture 1 collapse assertion is not vacuously true
 * because emitWaves() always returns one wave).
 *
 * Bug-driven testing mandate: this test would catch a regression where
 * either resource doc silently drops the small-plan-collapse rule, and
 * (via the reference implementation) documents the exact collapse shape
 * any future live implementation must match.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PER_WAVE_EMISSION_DOC = path.join(
  REPO_ROOT,
  'agents',
  'planner',
  'resources',
  'per-wave-emission.md'
);
const VERTICAL_SLICE_EXTRACTION_DOC = path.join(
  REPO_ROOT,
  'agents',
  'planner',
  'resources',
  'vertical-slice-extraction.md'
);

// Matches both "small-plan-collapse" (hyphenated, per-wave-emission.md)
// and "Small-plan collapse" (space-separated heading, vertical-slice-extraction.md).
const SMALL_PLAN_COLLAPSE_RE = /small.plan.collapse/i;

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
    // No synthetic extra wave, no empty depth-fill wave.
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

  // Non-collapse fallback: vertical-slice wave plus a depth-fill wave
  // carrying the remainder of the work items.
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

describe('TASK-15: small-plan collapse produces a single vertical-slice wave', () => {
  describe('Fixture 1 — collapse case (slice IDs == all IDs)', () => {
    const allWorkItemIds = ['TASK-01', 'TASK-02', 'TASK-03'];
    const sliceWorkItemIds = ['TASK-01', 'TASK-02', 'TASK-03'];
    const result = emitWaves(allWorkItemIds, sliceWorkItemIds);

    it('returns total_waves: 1', () => {
      expect(result.total_waves).toBe(1);
    });

    it('the single wave has type: vertical-slice', () => {
      expect(result.waves[0].type).toBe('vertical-slice');
    });

    it('there is no second wave in the output', () => {
      expect(result.waves.length).toBe(1);
    });

    it('the single wave carries every work item ID', () => {
      expect(result.waves[0].work_item_ids).toEqual(allWorkItemIds);
    });
  });

  describe('Fixture 2 — non-collapse case (slice IDs strict subset of all IDs)', () => {
    const allWorkItemIds = ['TASK-01', 'TASK-02', 'TASK-03', 'TASK-04'];
    const sliceWorkItemIds = ['TASK-01', 'TASK-02'];
    const result = emitWaves(allWorkItemIds, sliceWorkItemIds);

    it('total_waves is greater than 1 (a depth-fill wave exists)', () => {
      expect(result.total_waves).toBeGreaterThan(1);
    });

    it('proves the reference implementation actually branches', () => {
      // If emitWaves() always returned a single wave, this fixture would
      // also collapse to total_waves: 1, making Fixture 1's collapse
      // assertion vacuously true. It does not.
      expect(result.waves.length).toBeGreaterThan(1);
    });

    it('the first wave stays typed vertical-slice and carries only the slice IDs', () => {
      expect(result.waves[0].type).toBe('vertical-slice');
      expect(result.waves[0].work_item_ids).toEqual(sliceWorkItemIds);
    });

    it('the second wave carries the remainder of the work items', () => {
      expect(result.waves[1].work_item_ids).toEqual(['TASK-03', 'TASK-04']);
    });
  });

  describe('Source docs state the small-plan-collapse rule', () => {
    it('agents/planner/resources/per-wave-emission.md exists', () => {
      expect(fs.existsSync(PER_WAVE_EMISSION_DOC)).toBe(true);
    });

    it('agents/planner/resources/vertical-slice-extraction.md exists', () => {
      expect(fs.existsSync(VERTICAL_SLICE_EXTRACTION_DOC)).toBe(true);
    });

    it('per-wave-emission.md states the small-plan-collapse rule', () => {
      const content = fs.readFileSync(PER_WAVE_EMISSION_DOC, 'utf8');
      expect(content).toMatch(SMALL_PLAN_COLLAPSE_RE);
    });

    it('vertical-slice-extraction.md states the small-plan-collapse rule', () => {
      const content = fs.readFileSync(VERTICAL_SLICE_EXTRACTION_DOC, 'utf8');
      expect(content).toMatch(SMALL_PLAN_COLLAPSE_RE);
    });
  });
});
