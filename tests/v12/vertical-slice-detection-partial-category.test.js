/**
 * TASK-14: slice-detection correctness on a partial-category graph.
 *
 * agents/planner/resources/vertical-slice-extraction.md's "Slice-detection
 * algorithm" section is agent-instruction prose for the LLM planner, not
 * application code. There is no live JS implementation of that algorithm to
 * import.
 *
 * This test provides a small REFERENCE IMPLEMENTATION, reduced to its
 * testable core: given a work-items fixture, compute the sorted unique set
 * of `type` values (the "categories") the fixture touches. This mirrors the
 * documented rule -- "walks the dependency graph, pulls the minimal
 * connected chain that touches every category the request exercises, skips
 * a category with zero items" -- at the level of "which categories are
 * present at all," which is the part the full 5-category taxonomy in the
 * doc depends on.
 *
 * It validates the spec's own internal consistency: a work-items graph
 * that only touches 3 of the 5 categories must report exactly those 3, and
 * it must not include the two zero-item categories. It also greps the doc
 * itself so this test fails loudly if the "skips a category with zero
 * items" rule's wording is ever removed or reworded away.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DOC_PATH = path.join(
  REPO_ROOT,
  'agents/planner/resources/vertical-slice-extraction.md'
);

// Reference implementation: mirrors the documented rule's testable core.
// The full algorithm also walks dependency edges to find the minimal
// connected chain; this reduction only computes which categories are
// present at all, which is the precondition the doc's "skips a category
// with zero items" clause depends on.
function categoriesCovered(workItems) {
  const present = new Set(workItems.map((item) => item.type));
  return Array.from(present).sort();
}

// 5-category taxonomy per CLAUDE.md's decomposition step:
// UNDERSTAND / DESIGN / BUILD / VERIFY / DOCUMENT (lower-cased `type` values).
const ALL_CATEGORIES = ['build', 'design', 'document', 'understand', 'verify'];

describe('vertical-slice-detection: partial-category graph', () => {
  // Fixture: work items that touch only 3 of the 5 categories.
  // Zero `design` items, zero `document` items.
  const fixture = [
    { id: 'WI-1', type: 'understand', title: 'Read existing auth module' },
    { id: 'WI-2', type: 'understand', title: 'Enumerate call sites' },
    { id: 'WI-3', type: 'build', title: 'Implement token refresh' },
    { id: 'WI-4', type: 'build', title: 'Wire refresh into middleware' },
    { id: 'WI-5', type: 'verify', title: 'Add refresh-flow regression test' },
  ];

  it('reports exactly the 3 touched categories, sorted', () => {
    expect(categoriesCovered(fixture)).toEqual(['build', 'understand', 'verify']);
  });

  it('does not include design (zero items in the fixture)', () => {
    expect(categoriesCovered(fixture)).not.toContain('design');
  });

  it('does not include document (zero items in the fixture)', () => {
    expect(categoriesCovered(fixture)).not.toContain('document');
  });

  it('never reports a category outside the full 5-category taxonomy', () => {
    for (const cat of categoriesCovered(fixture)) {
      expect(ALL_CATEGORIES).toContain(cat);
    }
  });

  it('an all-5-category graph reports all 5 categories', () => {
    const fullFixture = [
      ...fixture,
      { id: 'WI-6', type: 'design', title: 'Design refresh token schema' },
      { id: 'WI-7', type: 'document', title: 'Document refresh flow' },
    ];
    expect(categoriesCovered(fullFixture)).toEqual(ALL_CATEGORIES);
  });

  it('an empty work-items list covers zero categories', () => {
    expect(categoriesCovered([])).toEqual([]);
  });
});

describe('vertical-slice-detection: doc wording guard', () => {
  it('doc file exists at the expected path', () => {
    expect(fs.existsSync(DOC_PATH)).toBe(true);
  });

  it('"Slice-detection algorithm" section still states the zero-item-skip rule', () => {
    const content = fs.readFileSync(DOC_PATH, 'utf8');

    // Isolate the "Slice-detection algorithm" section (stop at the next `## `).
    const sectionMatch = content.match(
      /## Slice-detection algorithm\n([\s\S]*?)(?=\n## )/
    );
    expect(sectionMatch).not.toBeNull();
    const section = sectionMatch[1];

    // Guards against future documentation drift: the rule that a category
    // with zero items is skipped must still be present, in some phrasing
    // that contains "skips" and "zero items".
    expect(section).toMatch(/skips a category with zero items/i);
  });
});
