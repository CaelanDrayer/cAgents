// Regression test for V10.26.15 — validator requires hypotheses_tested[]
// Asserts SKILL.md debug-mode branch now requires coordination_log.yaml to
// contain a non-empty hypotheses_tested[] array in debug mode.
// Failing-before: V10.26.14 only emitted a log line; no enforcement check.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const VALIDATOR_SKILL = resolve(
  process.cwd(),
  'core/agents/universal-validator/SKILL.md'
);
const CHECKS_DOC = resolve(
  process.cwd(),
  'core/agents/universal-validator/resources/debug-mode-checks.md'
);

describe('V10.26.15 validator hypotheses_tested[] requirement', () => {
  const validatorContent = readFileSync(VALIDATOR_SKILL, 'utf8');
  const checksContent = readFileSync(CHECKS_DOC, 'utf8');

  it('SKILL.md references the V10.26.15 check', () => {
    expect(validatorContent).toMatch(/V10\.26\.15/);
  });

  it('SKILL.md requires hypotheses_tested[] to be present and non-empty', () => {
    expect(validatorContent).toMatch(/hypotheses_tested/);
    expect(validatorContent).toMatch(/at least one entry|≥1 entry|non-empty/);
  });

  it('SKILL.md tags the finding as FIXABLE with HIGH severity', () => {
    expect(validatorContent).toMatch(/FIXABLE/);
    expect(validatorContent).toMatch(/HIGH/);
  });

  it('SKILL.md cites /debug SKILL.md Phase 3 in the finding message', () => {
    expect(validatorContent).toMatch(/Phase 3/);
    expect(validatorContent).toMatch(/\.claude\/skills\/debug\/SKILL\.md/);
  });

  it('SKILL.md confirms non-debug runs skip the check', () => {
    expect(validatorContent).toMatch(/Non-debug runs skip this check/);
  });

  it('debug-mode-checks.md documents verification method yaml_key_exists', () => {
    expect(checksContent).toMatch(/yaml_key_exists/);
  });

  it('debug-mode-checks.md replaces the V10.26.15 placeholder with a concrete spec', () => {
    // No placeholder remains for V10.26.15
    expect(checksContent).not.toMatch(
      /V10\.26\.15.*[\s\S]*Placeholder\. Concrete check spec lands with V10\.26\.15/
    );
    // And the spec mentions the required shape
    expect(checksContent).toMatch(/result:\s*confirmed\|falsified/);
  });
});
