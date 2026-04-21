// Regression tests for V10.26.28+ — /improve --mode optimize.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const IMPROVE_SKILL = resolve(ROOT, '.claude/skills/improve/SKILL.md');
const OPTIMIZE_MODE = resolve(
  ROOT,
  '.claude/skills/improve/reference/optimize-mode.md'
);

describe('V10.26.28 /improve --mode optimize DETECTING', () => {
  const content = readFileSync(IMPROVE_SKILL, 'utf8');

  it('SKILL.md documents DETECTING for --mode optimize', () => {
    expect(content).toMatch(/Optimize-Mode DETECTING.*V10\.26\.28/);
  });

  it('SKILL.md lists three scanner groups (perf/size/efficiency)', () => {
    expect(content).toMatch(/Group 1.*Performance Scanner/);
    expect(content).toMatch(/Group 2.*Size Scanner/);
    expect(content).toMatch(/Group 3.*Efficiency Scanner/);
  });

  it('SKILL.md names cagents:performance-analyzer and cagents:code-standards-auditor', () => {
    expect(content).toMatch(/cagents:performance-analyzer/);
    expect(content).toMatch(/cagents:code-standards-auditor/);
  });

  it('SKILL.md documents opportunities.yaml aggregation output', () => {
    expect(content).toMatch(/workflow\/opportunities\.yaml/);
    expect(content).toMatch(/opp_id/);
  });

  it('SKILL.md documents IMPROVE_DRY_AGENTS=1 for DETECTING dry-run', () => {
    // Present anywhere (the review section already introduces the flag
    // and the optimize DETECTING section reiterates the dry-run contract).
    expect(content).toMatch(/IMPROVE_DRY_AGENTS=1/);
    expect(content).toMatch(/planned_spawns\.yaml/);
  });

  it('reference/optimize-mode.md exists and documents all three scanner groups', () => {
    expect(existsSync(OPTIMIZE_MODE)).toBe(true);
    const om = readFileSync(OPTIMIZE_MODE, 'utf8');
    expect(om).toMatch(/Performance Scanner/);
    expect(om).toMatch(/Size Scanner/);
    expect(om).toMatch(/Efficiency Scanner/);
  });

  it('reference/optimize-mode.md documents opportunity schema', () => {
    const om = readFileSync(OPTIMIZE_MODE, 'utf8');
    expect(om).toMatch(/opp_id:/);
    expect(om).toMatch(/category:.*performance.*size.*efficiency/);
    expect(om).toMatch(/confidence:/);
  });

  it('legacy /optimize phase-details.md has ported-to-/improve banner', () => {
    const pd = readFileSync(
      resolve(ROOT, '.claude/skills/optimize/reference/phase-details.md'),
      'utf8'
    );
    expect(pd).toMatch(/Ported to \/improve.*V10\.26\.28/);
    expect(pd).toMatch(/optimize-mode\.md/);
  });
});
