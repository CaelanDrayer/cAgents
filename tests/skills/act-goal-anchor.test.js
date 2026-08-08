import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for WI-2 (REC-1 + REC-10) of V11.3.0:
 *
 * /act Step 1 must derive a /goal condition and surface it as an optional Bash
 * invocation (auto-anchor pattern from REC-1). The /act flags reference must
 * document the --no-goal opt-out. /designer SKILL.md must include an exemption
 * sentence (REC-10) explaining that /designer is interactive-by-contract and
 * therefore exempt from /goal auto-anchoring.
 *
 * This test FAILS at V11.2.16 (no /goal mention in act/SKILL.md, no --no-goal flag,
 * no /designer exemption) and PASSES at V11.3.0.
 */

const RUN_SKILL = join(process.cwd(), '.claude/skills/act/SKILL.md');
const RUN_FLAGS = join(process.cwd(), '.claude/skills/act/reference/flags.md');
const DESIGNER_SKILL = join(process.cwd(), '.claude/skills/designer/SKILL.md');

describe('/act /goal auto-anchor (WI-2, REC-1 + REC-10)', () => {
  describe('/act SKILL.md Step 1 auto-anchor', () => {
    const content = readFileSync(RUN_SKILL, 'utf8');

    it('mentions /goal in Step 1 / session-init section', () => {
      expect(content).toMatch(/\/goal/);
    });

    it('references completion_summary.yaml as part of the derived condition', () => {
      expect(content).toMatch(/completion_summary\.yaml/);
    });

    it('includes a turn-cap clause to bound /goal execution', () => {
      // The derived condition must include a turn or cycle cap (the goal.md
      // documented pattern "or stop after N turns")
      expect(content.toLowerCase()).toMatch(/stop after \d+/);
    });

    it('documents the --no-goal opt-out condition', () => {
      expect(content).toMatch(/--no-goal/);
    });

    it('documents the /designer exemption for the auto-anchor', () => {
      expect(content.toLowerCase()).toMatch(/designer/);
    });
  });

  describe('/act reference/flags.md --no-goal flag', () => {
    const content = readFileSync(RUN_FLAGS, 'utf8');

    it('lists --no-goal in the flag table', () => {
      expect(content).toMatch(/--no-goal/);
    });

    it('explains what --no-goal opts out of', () => {
      expect(content.toLowerCase()).toMatch(/auto[- ]anchor|opt out|\/goal/);
      expect(content).toMatch(/\/goal/);
    });
  });

  describe('/designer SKILL.md /goal exemption (REC-10)', () => {
    const content = readFileSync(DESIGNER_SKILL, 'utf8');

    it('contains explicit /goal exemption sentence', () => {
      expect(content).toMatch(/\/goal/);
      expect(content.toLowerCase()).toMatch(/exempt/);
    });

    it('references interactive-by-contract rationale', () => {
      expect(content.toLowerCase()).toMatch(/interactive[- ]by[- ]contract|interactive by contract|askuserquestion/);
    });
  });
});
