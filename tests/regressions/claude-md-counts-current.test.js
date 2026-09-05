import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, lstatSync, existsSync, statSync } from 'fs';
import { ARCHETYPES, archetypeCounts } from '../helpers/agent-catalog.js';
import { join } from 'path';

/**
 * Regression test for V11.2.2 CLAUDE.md count-drift fix.
 *
 * Bug: Multiple count claims in CLAUDE.md drifted from code reality after
 * accumulated bumps without doc sync:
 *  - "243 agents"          → actual 255
 *  - archetype distribution → actual 33/87/30/31/11/26/9/17/11
 *  - "28 .cjs files"        → actual 29
 *  - "25 unique registered hooks" → actual 26
 *  - "790 Vitest tests across 46 files" → actual 858+ across 60+
 *  - "13 legacy domain dirs"      → actual 15
 *
 * Root cause: agent additions, hook additions (skill-size-monitor.cjs added in
 * V11.1.13), and test additions in recent bumps did not propagate to CLAUDE.md.
 *
 * Test added: tests/regressions/claude-md-counts-current.test.js — asserts
 * CLAUDE.md contains the CURRENT counts. If a future bump adds a new agent
 * without updating CLAUDE.md, this test will fail and force the doc sync.
 *
 * Could have caught by: a count-validation test in CI alongside validate-versions.sh.
 */

const ROOT = process.cwd();

// v12.68.0: agent definitions are flat (agents/<name>.md) and archetype is a
// frontmatter field — see tests/helpers/agent-catalog.js.
const ARCH_COUNTS = archetypeCounts();
function countSkillMd(arch) {
  return ARCH_COUNTS[arch] || 0;
}

function countCjs(dir) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => f.endsWith('.cjs')).length;
}

describe('CLAUDE.md count claims match reality', () => {
  const claudeMd = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');

  it('agent count claim matches actual SKILL.md count', () => {
    let total = 0;
    const perArchetype = {};
    for (const arch of ARCHETYPES) {
      const c = countSkillMd(arch);
      perArchetype[arch] = c;
      total += c;
    }
    // CLAUDE.md must mention the actual total in at least one Quick Reference / Project Overview claim
    expect(claudeMd).toContain(`${total} agents`);
  });

  it('hook .cjs file count claim matches actual count', () => {
    const actualCjs = countCjs(join(ROOT, '.claude/hooks'));
    // CLAUDE.md must mention the current count somewhere
    expect(claudeMd).toContain(`${actualCjs} .cjs files`);
  });

  it('claim about archetype distribution lists current per-archetype counts', () => {
    const counts = {};
    for (const arch of ARCHETYPES) {
      counts[arch] = countSkillMd(arch);
    }
    // Each archetype's current count must appear adjacent to its name somewhere in CLAUDE.md
    // (allowing for either "developer 33" or "developer (33)" or similar formatting)
    for (const arch of ARCHETYPES) {
      const c = counts[arch];
      const patterns = [
        `${arch} ${c}`,
        `${arch} (${c})`,
        `${arch}: ${c}`,
        `${arch} | ${c}`,  // markdown table
        `**${arch}** | \`${arch}/\` | ${c}`,
      ];
      const found = patterns.some((p) => claudeMd.includes(p));
      expect(found, `Expected one of ${patterns.join(' OR ')} in CLAUDE.md for archetype ${arch} (count ${c})`).toBe(true);
    }
  });

  it('test-count claim is within freshness window of statically-counted suite size (Q-009)', () => {
    // Q-009 (v11.2.14): CLAUDE.md test-count claim was "858+ Vitest tests across 60+ files"
    // — stale by ~74 runtime tests / 12 files. This sub-test computes a static
    // lower-bound on the suite size (counting `it(...)` and `test(...)` invocations
    // across discovered `tests/**/*.test.js` files) and enforces:
    //   claim_tests  <= static_lower_bound  AND  static_lower_bound - claim_tests <= FRESHNESS_TESTS
    //   claim_files  <= actual_files        AND  actual_files       - claim_files <= FRESHNESS_FILES
    // Static counter under-counts `it.each(...)` rows (each runtime test row only
    // shows once in source), so the static lower-bound is strictly conservative —
    // a claim that passes here is guaranteed true at runtime. Lower-bound design
    // accommodates the "+" suffix (which permits under-counts).
    const FRESHNESS_TESTS = 20;  // claim must be within 20 tests of static lower-bound
    const FRESHNESS_FILES = 5;   // claim must be within 5 files of actual

    // Walk tests/ counting *.test.js files. Mirrors the include/exclude rules in
    // tests/vitest.config.js (include: ['tests/**/*.test.js'], exclude: ['node_modules',
    // 'archive', 'example', 'vendor_repos']) so the count matches what `npm test`
    // actually discovers and runs.
    const VITEST_EXCLUDES = ['node_modules', 'archive', 'example', 'vendor_repos'];
    function isExcluded(fullPath) {
      return VITEST_EXCLUDES.some((seg) => fullPath.includes(`/${seg}/`) || fullPath.endsWith(`/${seg}`));
    }
    function listTestJsFiles(dir, out = []) {
      if (!existsSync(dir)) return out;
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (isExcluded(full)) continue;
        let lst;
        try { lst = lstatSync(full); } catch { continue; }
        if (lst.isDirectory()) {
          listTestJsFiles(full, out);
        } else if (entry.endsWith('.test.js')) {
          out.push(full);
        }
      }
      return out;
    }
    const testJsFiles = listTestJsFiles(join(ROOT, 'tests'));
    const actualFiles = testJsFiles.length;

    // For the test count, count `it(...)` and `test(...)` invocations across the
    // discovered .test.js files. We strip line comments and block comments first to
    // avoid over-counting commented-out tests. This still over-counts strings that
    // happen to contain `it(`, but in practice that's rare; the freshness window
    // tolerates a small drift.
    function stripComments(src) {
      // Remove /* ... */ blocks.
      let s = src.replace(/\/\*[\s\S]*?\*\//g, '');
      // Remove // ... line comments.
      s = s.replace(/(^|[^:])\/\/[^\n]*/g, '$1');
      return s;
    }
    let actualTests = 0;
    for (const file of testJsFiles) {
      const body = stripComments(readFileSync(file, 'utf8'));
      // Match `it(` or `test(` not preceded by an identifier/dot character. Allow
      // optional `.skip`/`.only`/`.todo`/`.each(...)` modifier. Excludes `describe(...)`.
      const matches = body.match(/(?<![.\w$])(it|test)(?:\.(?:skip|only|todo)|\.each\s*\([^)]*\))?\s*\(/g) || [];
      actualTests += matches.length;
    }

    // Parse the claim from CLAUDE.md. Pattern: "NNN+ Vitest tests across MM+ files".
    const claimMatch = claudeMd.match(/(\d+)\+\s+Vitest tests across\s+(\d+)\+\s+files/);
    expect(
      claimMatch,
      'CLAUDE.md must contain a claim of the form "NNN+ Vitest tests across MM+ files" (Quick Reference Tests row)',
    ).toBeTruthy();
    const claimTests = parseInt(claimMatch[1], 10);
    const claimFiles = parseInt(claimMatch[2], 10);

    // Lower-bound: claim_tests + "+" suffix must be true vs the static lower-bound.
    expect(
      claimTests,
      `CLAUDE.md test-count claim "${claimTests}+" must be <= static lower-bound ${actualTests} (the "+" suffix only permits under-counts; actual runtime count is at least ${actualTests}).`,
    ).toBeLessThanOrEqual(actualTests);
    expect(
      claimFiles,
      `CLAUDE.md test-file-count claim "${claimFiles}+" must be <= actual ${actualFiles} test files.`,
    ).toBeLessThanOrEqual(actualFiles);

    // Freshness window: claim must be within FRESHNESS_TESTS / FRESHNESS_FILES of
    // the static lower-bound (which is itself ≤ runtime count). Catches stale-low
    // drift like the 858+/60+ → 932/72 drift Q-009 was filed to fix.
    expect(
      actualTests - claimTests,
      `CLAUDE.md test-count claim "${claimTests}+" is more than ${FRESHNESS_TESTS} tests behind static lower-bound (${actualTests}). Update CLAUDE.md test-count to roughly "${actualTests - 5}+ Vitest tests across ${actualFiles}+ files".`,
    ).toBeLessThanOrEqual(FRESHNESS_TESTS);
    expect(
      actualFiles - claimFiles,
      `CLAUDE.md test-file-count claim "${claimFiles}+" is more than ${FRESHNESS_FILES} files behind actual (${actualFiles}). Update CLAUDE.md test-file count.`,
    ).toBeLessThanOrEqual(FRESHNESS_FILES);
  });
});
