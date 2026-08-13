// Regression test: ensure user-facing skill SKILL.md files stay below the
// progressive-disclosure size budget. Wave 5 of the cAgents v11.1.5 →
// measurably-better release reduced six SKILL.md bodies to ≤400 lines each by
// extracting detail content to the per-skill `reference/` directory.
//
// This test is failing-before / passing-after the Wave 5 refactor. Pre-refactor
// line counts: org=1202, team=1185, run=861, designer=736, improve=597,
// helper=508 — all over the 400-line budget. Post-refactor: each ≤400.
//
// Why 400: matches the Three-Tier Progressive Disclosure target documented in
// `.claude/rules/core/skill-format.md`. The size-guard hook
// (`.claude/hooks/skill-size-monitor.cjs`) warns at 600 lines and blocks at 900.
// The 400-line ceiling here is stricter than the hook so user skills stay in
// the routing-surface tier with detail content in `reference/*.md`.

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SKILLS_DIR = path.join(REPO_ROOT, '.claude', 'skills');
const MAX_LINES = 400;

// v12.2.0: /org absorbed into /team strategic mode; 4 user skills.
// (v12.1.2: /improve folded into /act via keyword router.)
// `run` was renamed to `act` (collided with Claude Code's built-in `run`).
const USER_SKILLS = ['team', 'act', 'designer', 'helper'];

function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.split('\n').length;
}

describe('user-skill SKILL.md progressive disclosure (Wave 5)', () => {
  for (const skill of USER_SKILLS) {
    const skillPath = path.join(SKILLS_DIR, skill, 'SKILL.md');

    it(`${skill}/SKILL.md is ≤${MAX_LINES} lines`, () => {
      expect(fs.existsSync(skillPath)).toBe(true);
      const lines = countLines(skillPath);
      expect(lines).toBeLessThanOrEqual(MAX_LINES);
    });

    it(`${skill}/reference/ directory exists and is non-empty`, () => {
      const refDir = path.join(SKILLS_DIR, skill, 'reference');
      expect(fs.existsSync(refDir)).toBe(true);
      expect(fs.statSync(refDir).isDirectory()).toBe(true);
      const refFiles = fs.readdirSync(refDir).filter((f) => f.endsWith('.md'));
      expect(refFiles.length).toBeGreaterThanOrEqual(1);
    });
  }

  it('total user-skill SKILL.md body size is bounded', () => {
    // Sum across all 4 user skills (v12.2.0) must stay well under 4 * MAX_LINES = 1600.
    // Wave 5 brought the total from 5089 → ~1503 lines (a 70% reduction).
    // v12.2.0 removed /org SKILL.md entirely (~302 post-Wave-5 lines).
    // Ceiling here is generous; tightening risks brittleness as docs evolve.
    const total = USER_SKILLS.reduce(
      (sum, skill) => sum + countLines(path.join(SKILLS_DIR, skill, 'SKILL.md')),
      0,
    );
    expect(total).toBeLessThanOrEqual(2400);
  });

  it('no skill body has regressed past historical pre-refactor baseline', () => {
    // Baseline = pre-Wave-5 line counts. If any skill grows back past its
    // baseline, we flag it. This catches "rolled back the refactor" regressions.
    const PRE_REFACTOR = {
      // org: 1202 — removed in v12.2.0 (absorbed into /team strategic mode)
      team: 1185,
      // act: pre-Wave-5 baseline carried over from the skill's former `run` name.
      act: 861,
      designer: 736,
      // improve: 597 — removed in v12.1.2 (folded into /act)
      helper: 508,
    };
    for (const [skill, baseline] of Object.entries(PRE_REFACTOR)) {
      const current = countLines(path.join(SKILLS_DIR, skill, 'SKILL.md'));
      expect(current,
        `${skill}/SKILL.md grew back to or past pre-refactor baseline (${baseline} lines)`,
      ).toBeLessThan(baseline);
    }
  });
});
