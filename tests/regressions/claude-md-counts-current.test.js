import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, lstatSync, existsSync } from 'fs';
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

function countSkillMd(dir) {
  let count = 0;
  if (!existsSync(dir)) return 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    let lst;
    try { lst = lstatSync(full); } catch { continue; }
    if (lst.isDirectory()) {
      count += countSkillMd(full);
    } else if (entry === 'SKILL.md') {
      count++;
    }
  }
  return count;
}

function countCjs(dir) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => f.endsWith('.cjs')).length;
}

const ARCHETYPES = ['developer', 'operator', 'advisor', 'analyst', 'creator', 'writer', 'strategist', 'core', 'leadership'];

describe('CLAUDE.md count claims match reality', () => {
  const claudeMd = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');

  it('agent count claim matches actual SKILL.md count', () => {
    let total = 0;
    const perArchetype = {};
    for (const arch of ARCHETYPES) {
      const c = countSkillMd(join(ROOT, arch));
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
      counts[arch] = countSkillMd(join(ROOT, arch));
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
});
