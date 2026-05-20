/**
 * WI-W1.2: Validation honesty contract regression test
 *
 * Asserts that .claude/rules/core/resources/execution-self-validation.md
 * defines EXACTLY 5 hook-verifiable checks (down from the V10.23.0 15-check
 * version) and that the prose contract matches the locked v12 design:
 *   - 5 checks (not 15)
 *   - Each check maps to one of the 5 canonical categories:
 *     1. Acceptance criteria evidence freshness (timestamps)
 *     2. File existence claims (fs.existsSync)
 *     3. Test/lint/typecheck exit codes (guard exit codes)
 *     4. Git working-tree state (git status)
 *     5. Referenced file:line accuracy (grep/sed verification)
 *   - Auto-downgrade rule mentions "1 of the 5 checks failing"
 *
 * Bug-driven test mandate (CLAUDE.md): this test guards against regression
 * to the 15-check aspirational protocol or any expansion beyond the 5
 * hook-verifiable checks the v12 design locks in.
 *
 * Failing-before state: prior to WI-W1.2, the file declared 15 checks
 * across 5 categories ("**Check 1**" through "**Check 15**") and the
 * auto-downgrade rule used a graded 1-3/4+ failure matrix.
 *
 * Passing-after state: exactly 5 checks, each mapping to the canonical
 * category, and a binary auto-downgrade rule ("any 1 of the 5 checks
 * failing -> DONE_WITH_CONCERNS").
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SELF_VALIDATION_DOC = path.join(
  REPO_ROOT,
  '.claude',
  'rules',
  'core',
  'resources',
  'execution-self-validation.md'
);

const CANONICAL_CATEGORIES = [
  // 1. Acceptance criteria evidence freshness
  { id: 1, keywords: ['evidence freshness', 'fresh'], mechanism: 'timestamp' },
  // 2. File existence claims
  { id: 2, keywords: ['file existence', 'existence claim', 'exists'], mechanism: 'fs.existsSync' },
  // 3. Test/lint/typecheck exit codes
  { id: 3, keywords: ['exit code', 'guard'], mechanism: 'exit_code' },
  // 4. Git working-tree state
  { id: 4, keywords: ['git working-tree', 'git working tree', 'git state', 'git status'], mechanism: 'git status' },
  // 5. Referenced file:line accuracy
  { id: 5, keywords: ['file:line', 'file line', 'referenced file', 'citation'], mechanism: 'sed' },
];

let docContent;

beforeAll(() => {
  expect(
    fs.existsSync(SELF_VALIDATION_DOC),
    `execution-self-validation.md must exist at ${SELF_VALIDATION_DOC}`
  ).toBe(true);
  docContent = fs.readFileSync(SELF_VALIDATION_DOC, 'utf8');
});

describe('WI-W1.2: validation honesty contract — 5 hook-verifiable checks', () => {
  it('declares exactly 5 checks (no more, no less)', () => {
    // Count "### Check N:" headings AND "**Check N**:" bold markers.
    // The v12 contract uses "### Check N:" style.
    const headingMatches = docContent.match(/^###\s+Check\s+\d+\s*:/gim) || [];
    const boldMatches = docContent.match(/^\*\*Check\s+\d+\*\*\s*:/gim) || [];
    const total = headingMatches.length + boldMatches.length;

    expect(
      total,
      `Expected exactly 5 checks, found ${total}. Headings: ${headingMatches.length}, bold: ${boldMatches.length}. ` +
        `The v12 contract locks the protocol at 5 hook-verifiable checks. ` +
        `Any expansion is a regression to the V10.23.0 15-check aspirational protocol.`
    ).toBe(5);
  });

  it('check numbering runs 1..5 with no gaps', () => {
    const numbers = [];
    const headingRegex = /^###\s+Check\s+(\d+)\s*:/gim;
    let match;
    while ((match = headingRegex.exec(docContent)) !== null) {
      numbers.push(parseInt(match[1], 10));
    }
    numbers.sort((a, b) => a - b);
    expect(numbers).toEqual([1, 2, 3, 4, 5]);
  });

  it('each of the 5 canonical categories is represented in the document', () => {
    const lowerDoc = docContent.toLowerCase();
    const missing = [];
    for (const cat of CANONICAL_CATEGORIES) {
      const found = cat.keywords.some((kw) => lowerDoc.includes(kw.toLowerCase()));
      if (!found) {
        missing.push(
          `Category ${cat.id}: none of [${cat.keywords.join(', ')}] appear in the document`
        );
      }
    }
    expect(
      missing,
      `Missing canonical categories:\n${missing.join('\n')}`
    ).toEqual([]);
  });

  it('each canonical verification mechanism is referenced', () => {
    const missing = [];
    for (const cat of CANONICAL_CATEGORIES) {
      if (!docContent.toLowerCase().includes(cat.mechanism.toLowerCase())) {
        missing.push(
          `Category ${cat.id} verification mechanism "${cat.mechanism}" not referenced`
        );
      }
    }
    expect(
      missing,
      `Missing verification mechanisms:\n${missing.join('\n')}`
    ).toEqual([]);
  });

  it('auto-downgrade rule mentions "1 of the 5 checks failing"', () => {
    // The v12 contract: binary, not graded. "Any 1 of the 5 checks failing
    // -> DONE_WITH_CONCERNS." Accept several phrasings.
    const patterns = [
      /any\s+1\s+of\s+the\s+5\s+checks\s+failing/i,
      /1\s+of\s+the\s+5\s+checks\s+fail/i,
      /any\s+one\s+of\s+the\s+5\s+checks\s+failing/i,
    ];
    const matched = patterns.some((p) => p.test(docContent));
    expect(
      matched,
      `Auto-downgrade rule must explicitly state "1 of the 5 checks failing -> DONE_WITH_CONCERNS". ` +
        `Searched for patterns: ${patterns.map((p) => p.source).join(' | ')}. ` +
        `Found neither; the v12 honesty contract requires a binary auto-downgrade, not the V10.23.0 graded 1-3 / 4+ matrix.`
    ).toBe(true);
  });

  it('does not regress to the V10.23.0 "15 checks across 5 categories" wording', () => {
    // Sanity guard: if someone re-introduces the 15-check phrasing in this
    // file, the test should fire. Note: a brief historical "why 5 (not 15)"
    // paragraph IS allowed (and present) — we only fail on the canonical
    // marketing-style phrase that defined the old protocol.
    const regressionPattern = /15\s+checks?\s+across\s+5\s+categor/i;
    expect(
      regressionPattern.test(docContent),
      'Document must not advertise "15 checks across 5 categories" as the active protocol. ' +
        'That phrasing was the V10.23.0 aspirational contract; v12 reduced to 5 hook-verifiable checks.'
    ).toBe(false);
  });

  it('schema_version is bumped to "2" in the YAML template', () => {
    // The v12 reduction changes the self_validation YAML schema; bump the
    // schema_version so consumers (hooks, lead aggregators) can detect the
    // shape change.
    expect(
      /schema_version\s*:\s*["']?2["']?/.test(docContent),
      'YAML template must declare schema_version: "2" to signal the v12 5-check shape ' +
        '(was schema_version: "1" with 15 checks).'
    ).toBe(true);
  });
});
