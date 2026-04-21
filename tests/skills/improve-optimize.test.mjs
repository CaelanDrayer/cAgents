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

describe('V10.26.30 /improve --mode optimize MEASURING + pattern migration', () => {
  const content = readFileSync(IMPROVE_SKILL, 'utf8');
  const PATTERN_MIG = resolve(
    ROOT,
    '.claude/skills/improve/reference/pattern-effectiveness-migration.md'
  );

  it('SKILL.md documents MEASURING for --mode optimize', () => {
    expect(content).toMatch(/Optimize-Mode MEASURING.*V10\.26\.30/);
  });

  it('SKILL.md documents benchmark tool selection (auto/lighthouse/k6/hyperfine)', () => {
    expect(content).toMatch(/lighthouse/);
    expect(content).toMatch(/k6/);
    expect(content).toMatch(/hyperfine/);
  });

  it('SKILL.md documents baseline path under _projects/{hash}/improve/baselines', () => {
    expect(content).toMatch(/_projects\/\{hash\}\/improve\/baselines/);
  });

  it('SKILL.md documents pattern_effectiveness migration with legacy fallback', () => {
    expect(content).toMatch(
      /_projects\/\{hash\}\/improve\/pattern_effectiveness\.yaml/
    );
    expect(content).toMatch(
      /_projects\/\{hash\}\/optimize\/pattern_effectiveness\.yaml/
    );
    expect(content).toMatch(/legacy/i);
    expect(content).toMatch(/copy forward|copy-forward/i);
  });

  it('SKILL.md asserts writes go to improve/ only', () => {
    expect(content).toMatch(/writes go to.*improve/i);
  });

  it('reference/pattern-effectiveness-migration.md exists', () => {
    expect(existsSync(PATTERN_MIG)).toBe(true);
  });

  it('migration doc enforces primary preferred, legacy fallback, write improve-only', () => {
    const m = readFileSync(PATTERN_MIG, 'utf8');
    expect(m).toMatch(/Primary.*improve\/pattern_effectiveness\.yaml/);
    expect(m).toMatch(/fallback.*optimize\/pattern_effectiveness\.yaml/i);
    expect(m).toMatch(/Legacy is\s+NOT deleted|not deleted/i);
    expect(m).toMatch(/All writes go to[\s\S]*improve/i);
  });

  it('migration doc declares V11.0 fallback removal', () => {
    const m = readFileSync(PATTERN_MIG, 'utf8');
    expect(m).toMatch(/V11\.0/);
    expect(m).toMatch(/fallback removed|removes the legacy-fallback/i);
  });
});
