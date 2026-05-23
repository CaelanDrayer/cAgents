// Regression test for V10.26.14 — universal-validator detects --mode debug
// Asserts the validator SKILL.md has a Debug-Mode Detection section that:
//  1. keys off instruction.yaml flags.mode == "debug"
//  2. writes "debug mode detected" to mode_notes in validation_report.yaml
//  3. does not alter verdicts in V10.26.14 (log-only)
// Failing-before: V10.26.13 had no validator-side awareness of --mode.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const VALIDATOR_SKILL = resolve(
  process.cwd(),
  'agents/core/universal-validator/SKILL.md'
);
const CHECKS_DOC = resolve(
  process.cwd(),
  'agents/core/universal-validator/resources/debug-mode-checks.md'
);

describe('V10.26.14 universal-validator debug-mode detection', () => {
  const validatorContent = readFileSync(VALIDATOR_SKILL, 'utf8');

  it('SKILL.md has a Debug-Mode Detection section', () => {
    expect(validatorContent).toMatch(/Debug-Mode Detection/);
  });

  it('SKILL.md detects flags.mode == "debug" in instruction.yaml', () => {
    expect(validatorContent).toMatch(/instruction\.yaml/);
    expect(validatorContent).toMatch(/flags\.mode/);
    expect(validatorContent).toMatch(/"debug"/);
  });

  it('SKILL.md emits the "debug mode detected" sentinel into mode_notes', () => {
    expect(validatorContent).toMatch(/debug mode detected/);
    expect(validatorContent).toMatch(/mode_notes/);
  });

  it('SKILL.md calls out V10.26.14 as log-only (no new verdicts)', () => {
    expect(validatorContent).toMatch(/V10\.26\.14/);
    expect(validatorContent).toMatch(/log-only/);
  });

  it('SKILL.md references the upcoming checks in V10.26.15–17', () => {
    expect(validatorContent).toMatch(/V10\.26\.15/);
    expect(validatorContent).toMatch(/V10\.26\.16/);
    expect(validatorContent).toMatch(/V10\.26\.17/);
  });

  it('debug-mode-checks.md resource file exists', () => {
    expect(existsSync(CHECKS_DOC)).toBe(true);
  });

  it('debug-mode-checks.md documents the V10.26.14 detection check', () => {
    const checks = readFileSync(CHECKS_DOC, 'utf8');
    expect(checks).toMatch(/V10\.26\.14/);
    expect(checks).toMatch(/sentinel_log_line|debug mode detected/);
    expect(checks).toMatch(/Non-debug runs are unaffected/);
  });
});
