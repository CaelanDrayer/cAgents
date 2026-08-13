import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for WI-1 (REC-5) of V11.3.0:
 *
 * /helper SKILL.md must document the /goal + /act + Auto-mode autonomous-execution
 * triad. Before V11.3.0 the helper skill did not mention /goal at all, so cAgents
 * users had no on-ramp to Claude Code's native autonomous-continuation primitive.
 *
 * This test FAILS at V11.2.16 and PASSES at V11.3.0.
 * Failing-before evidence: `grep -c "/goal" .claude/skills/helper/SKILL.md` returned 0
 * at HEAD before the WI-1 edit; the new section adds the keyword + matrix + headless
 * example.
 */

const HELPER_SKILL = join(process.cwd(), '.claude/skills/helper/SKILL.md');

describe('helper SKILL.md /goal triad documentation (WI-1, REC-5)', () => {
  const content = readFileSync(HELPER_SKILL, 'utf8');

  it('mentions /goal as autonomous-continuation primitive', () => {
    expect(content).toMatch(/\/goal/);
    expect(content.toLowerCase()).toMatch(/autonomous[- ]continuation|autonomous[- ]execution/);
  });

  it('includes a comparison matrix with /goal, /loop, and Stop hook rows', () => {
    // The comparison table from goal.md must surface in the helper docs
    expect(content).toMatch(/\/goal/);
    expect(content).toMatch(/\/loop/);
    expect(content.toLowerCase()).toMatch(/stop hook/);
  });

  it('shows a headless invocation example using claude -p with /goal', () => {
    expect(content).toMatch(/claude\s+-p[\s\S]*\/goal/);
  });

  it('documents /goal clear and its aliases', () => {
    expect(content).toMatch(/\/goal clear/);
    // At least one of the documented aliases must appear in the same context
    const aliasMatches = ['stop', 'off', 'reset', 'none', 'cancel'].filter((a) =>
      new RegExp(`\\b${a}\\b`, 'i').test(content)
    );
    expect(aliasMatches.length).toBeGreaterThanOrEqual(3);
  });

  it('mentions Auto-mode is orthogonal to /goal', () => {
    expect(content.toLowerCase()).toMatch(/auto[- ]mode/);
    expect(content.toLowerCase()).toMatch(/orthogonal|complementary/);
  });
});
