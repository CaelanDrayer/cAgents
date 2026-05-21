import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for V11.2.13 — Q-008.
 *
 * Bug: `.claude/skills/improve/SKILL.md` used the markdown-link form
 *   [`reference/X.md`](reference/X.md)
 * for 18 internal resource references, breaking pattern consistency with
 * the other 5 cAgents skills (run, team, org, designer, helper) which all
 * use the `@reference/X.md` form. The `@path` syntax triggers progressive
 * disclosure per `.claude/rules/core/skill-format.md` Three-Tier
 * Progressive Disclosure; the markdown-link form is a no-op for tier-3
 * loading and inconsistent across the skill catalog.
 *
 * Root cause: improve/SKILL.md was authored before the @path convention
 * was adopted across skills; never refactored during V11.0 consolidation.
 *
 * Test added (this file): walks `.claude/skills/{run,team,org,designer,
 * improve,helper}/SKILL.md` and asserts no SKILL.md uses the
 * `[`reference/X.md`](reference/X.md)` markdown-link form for resource
 * references. Lists offending file paths and counts in the failure
 * message so the report is actionable.
 *
 * Could have caught by: a contract test on .claude/skills/ formatting
 * consistency — this regression test IS that contract test.
 *
 * If the @path convention is ever superseded by a different form, this
 * test must be deleted (or rewritten) in the same bump that introduces
 * the replacement.
 */

const ROOT = process.cwd();
const SKILLS_DIR = join(ROOT, '.claude', 'skills');
// v12.2.0: /org absorbed into /team strategic mode; 4 user skills.
// (v12.1.2 previously folded /improve into /run via keyword router.)
const SKILL_NAMES = ['run', 'team', 'designer', 'helper'];

// Matches: [`reference/anything.md`](reference/anything.md) and the
// backtick-less variant [reference/anything.md](reference/anything.md).
// Anchored on the link-target `](reference/` because that's the form
// that bypasses @path progressive-disclosure loading.
const MARKDOWN_LINK_PATTERN = /\]\(reference\/[^)]+\)/g;

describe('skill-at-path-consistency (Q-008)', () => {
  it('all 5 user-invocable SKILL.md files exist (v12.1.2: /improve folded into /run)', () => {
    for (const name of SKILL_NAMES) {
      const p = join(SKILLS_DIR, name, 'SKILL.md');
      expect(existsSync(p), `Missing SKILL.md: ${p}`).toBe(true);
    }
  });

  it('no SKILL.md uses [reference/X.md](reference/X.md) markdown-link form for resource refs', () => {
    const offenders = [];
    for (const name of SKILL_NAMES) {
      const p = join(SKILLS_DIR, name, 'SKILL.md');
      const content = readFileSync(p, 'utf8');
      const matches = content.match(MARKDOWN_LINK_PATTERN) || [];
      if (matches.length > 0) {
        offenders.push({ path: p, count: matches.length, samples: matches.slice(0, 3) });
      }
    }
    if (offenders.length > 0) {
      const summary = offenders
        .map((o) => `  - ${o.path}: ${o.count} markdown-link refs (samples: ${o.samples.join(', ')})`)
        .join('\n');
      throw new Error(
        `Found ${offenders.length} SKILL.md file(s) using markdown-link form for reference resources.\n` +
          `Convert to @reference/X.md form per Three-Tier Progressive Disclosure (see .claude/rules/core/skill-format.md).\n` +
          `Offenders:\n${summary}`,
      );
    }
    expect(offenders).toEqual([]);
  });

  it('run/SKILL.md uses @reference/ form at least once (positive assertion)', () => {
    // v12.1.2: improve folded into /run; the @reference/ check now applies to /run.
    const p = join(SKILLS_DIR, 'run', 'SKILL.md');
    const content = readFileSync(p, 'utf8');
    const atRefCount = (content.match(/@reference\//g) || []).length;
    expect(
      atRefCount,
      `Expected run/SKILL.md to use @reference/ form for progressive disclosure; got ${atRefCount} matches.`,
    ).toBeGreaterThan(0);
  });
});
