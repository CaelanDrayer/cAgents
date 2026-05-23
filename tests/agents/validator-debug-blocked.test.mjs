// Regression test for V10.26.17 — falsified-hypothesis rule + BLOCKED verdict
// Asserts the validator documents two-stage check (require ≥1 falsified,
// BLOCKED at 3 without confirmed), and /run SKILL.md revision routing handles
// BLOCKED with an annotated prompt.
// Failing-before: V10.26.16 had no falsification counting or BLOCKED verdict.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const VALIDATOR_SKILL = resolve(
  process.cwd(),
  'agents/core/universal-validator/SKILL.md'
);
const CHECKS_DOC = resolve(
  process.cwd(),
  'agents/core/universal-validator/resources/debug-mode-checks.md'
);
const RUN_SKILL = resolve(process.cwd(), '.claude/skills/run/SKILL.md');

describe('V10.26.17 falsified-hypothesis rule + BLOCKED verdict', () => {
  const validatorContent = readFileSync(VALIDATOR_SKILL, 'utf8');
  const checksContent = readFileSync(CHECKS_DOC, 'utf8');
  const runContent = readFileSync(RUN_SKILL, 'utf8');

  it('validator SKILL.md references V10.26.17', () => {
    expect(validatorContent).toMatch(/V10\.26\.17/);
  });

  it('validator requires at least one falsified hypothesis', () => {
    expect(validatorContent).toMatch(/result:\s*falsified/);
    expect(validatorContent).toMatch(/at least one falsified hypothesis/);
  });

  it('validator introduces BLOCKED as a new verdict', () => {
    expect(validatorContent).toMatch(/BLOCKED/);
    expect(validatorContent).toMatch(/new verdict/);
  });

  it('validator emits BLOCKED when 3 falsified without confirmed', () => {
    expect(validatorContent).toMatch(/3\+ falsified hypotheses without confirmed root cause/);
  });

  it('validator gates BLOCKED behind flags.mode === "debug"', () => {
    expect(validatorContent).toMatch(/flags\.mode === "debug"/);
    expect(validatorContent).toMatch(/NEVER see verdict `BLOCKED`/);
  });

  it('debug-mode-checks.md replaces V10.26.17 placeholder with concrete spec', () => {
    expect(checksContent).not.toMatch(
      /V10\.26\.17.*[\s\S]*Placeholder\. Concrete check spec lands with V10\.26\.17/
    );
    expect(checksContent).toMatch(/count_by_result/);
  });

  it('/run SKILL.md documents BLOCKED routing with falsification annotation', () => {
    expect(runContent).toMatch(/BLOCKED.*V10\.26\.17/);
    expect(runContent).toMatch(/falsification count|hypotheses_tested/);
    expect(runContent).toMatch(/infinite revision loops|infinite loops/i);
  });

  it('/run SKILL.md routes BLOCKED identically to FAIL for state transitions', () => {
    expect(runContent).toMatch(/PROMPTS_READY.*identically to FAIL|identically to FAIL.*PROMPTS_READY/s);
  });

  it('non-debug runs never see BLOCKED (regression guard)', () => {
    // Both validator and checks doc must assert the invariant.
    expect(validatorContent).toMatch(/Non-debug runs NEVER see verdict `BLOCKED`/);
    expect(checksContent).toMatch(/non-debug|Non-debug/);
  });
});
