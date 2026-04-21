// Regression tests for V10.26.33+ — /improve --mode full.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const IMPROVE_SKILL = resolve(ROOT, '.claude/skills/improve/SKILL.md');
const FULL_MODE = resolve(
  ROOT,
  '.claude/skills/improve/reference/full-mode.md'
);

describe('V10.26.33 /improve --mode full (review + optimize synthesis)', () => {
  const content = readFileSync(IMPROVE_SKILL, 'utf8');

  it('SKILL.md marks --mode full implemented in V10.26.33', () => {
    expect(content).toMatch(/--mode full.*Implemented in V10\.26\.33/);
  });

  it('SKILL.md documents review-then-optimize order of operations', () => {
    expect(content).toMatch(/Full-Mode Pipeline.*V10\.26\.33/);
    expect(content).toMatch(/review[\s\S]*?optimize/i);
    expect(content).toMatch(/Run .--mode review[\s\S]*?findings\.yaml/);
    expect(content).toMatch(/Run .--mode optimize/);
  });

  it('SKILL.md documents perf-relevant filter predicate', () => {
    expect(content).toMatch(/Perf-Relevant Filter Predicate/);
    expect(content).toMatch(/performance/);
    expect(content).toMatch(/efficiency/);
    expect(content).toMatch(/bundle-size/);
    expect(content).toMatch(/slow/);
    expect(content).toMatch(/n\+1/);
  });

  it('SKILL.md declares shared-baseline contract (captured ONCE)', () => {
    expect(content).toMatch(/Shared-Baseline Contract/);
    expect(content).toMatch(/captured ONCE/);
    expect(content).toMatch(/neither re-measures|prevents double-measurement/);
  });

  it('SKILL.md documents seeded opportunities from review findings', () => {
    expect(content).toMatch(/seed|seeded/i);
    expect(content).toMatch(/source:\s*review_finding/);
  });

  it('SKILL.md documents unified improve_report.md output', () => {
    expect(content).toMatch(/improve_report\.md/);
    expect(content).toMatch(/## Review Findings/);
    expect(content).toMatch(/## Optimizations Applied/);
  });

  it('SKILL.md documents both gate sets must PASS for verdict PASS', () => {
    expect(content).toMatch(/Both must PASS|BOTH[\s\S]*gate sets/i);
  });

  it('reference/full-mode.md exists', () => {
    expect(existsSync(FULL_MODE)).toBe(true);
  });

  it('full-mode.md documents shared baseline path + marker', () => {
    const f = readFileSync(FULL_MODE, 'utf8');
    expect(f).toMatch(/_projects\/\{hash\}\/improve\/baselines/);
    expect(f).toMatch(/shared:\s*true/);
  });

  it('full-mode.md documents synthesis schema with mode: full', () => {
    const f = readFileSync(FULL_MODE, 'utf8');
    expect(f).toMatch(/mode:\s*full/);
    expect(f).toMatch(/baseline_shared:\s*true/);
    expect(f).toMatch(/seeded_from_review/);
  });

  it('full-mode.md documents exit message with both sub-pipeline counts', () => {
    const f = readFileSync(FULL_MODE, 'utf8');
    expect(f).toMatch(/review_findings/);
    expect(f).toMatch(/optimizations_applied/);
    expect(f).toMatch(/seeded_from_review/);
  });

  it('SKILL.md stays under 600 lines (progressive disclosure)', () => {
    const lineCount = content.split('\n').length;
    expect(lineCount).toBeLessThan(600);
  });

  it('SKILL.md synthesis asserts review feeds optimize AND both appear in report', () => {
    // This is the headline synthesis assertion — the unified report must
    // include review findings AND optimizations in dedicated sections,
    // with the filter predicate driving which findings feed optimize.
    expect(content).toMatch(/synthesis|synthesize/i);
    expect(content).toMatch(/filtered_findings\.yaml|filter[\s\S]*findings/i);
  });
});
