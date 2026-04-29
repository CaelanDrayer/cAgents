// Regression test for V10.26.16 — validator requires failing-test artifact in
// debug-mode evidence. Asserts SKILL.md and debug-mode-checks.md document the
// regex scan over implementation_tasks[].evidence.
// Failing-before: V10.26.15 only required hypotheses_tested[]; no check on
// whether a failing test was actually written.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const VALIDATOR_SKILL = resolve(
  process.cwd(),
  'core/universal-validator/SKILL.md'
);
const CHECKS_DOC = resolve(
  process.cwd(),
  'core/universal-validator/resources/debug-mode-checks.md'
);

describe('V10.26.16 validator failing-test artifact requirement', () => {
  const validatorContent = readFileSync(VALIDATOR_SKILL, 'utf8');
  const checksContent = readFileSync(CHECKS_DOC, 'utf8');

  it('SKILL.md references the V10.26.16 check', () => {
    expect(validatorContent).toMatch(/V10\.26\.16/);
  });

  it('SKILL.md scans implementation_tasks[].evidence for a test artifact', () => {
    expect(validatorContent).toMatch(/implementation_tasks/);
    expect(validatorContent).toMatch(/evidence/);
  });

  it('SKILL.md names the three accepted phrases', () => {
    expect(validatorContent).toMatch(/failing test/);
    expect(validatorContent).toMatch(/reproduction test/);
    expect(validatorContent).toMatch(/regression test/);
  });

  it('SKILL.md requires a tests/** path in the evidence', () => {
    expect(validatorContent).toMatch(/tests\/\*\*/);
  });

  it('SKILL.md cites /debug Phase 4 step 1 in the finding message', () => {
    expect(validatorContent).toMatch(/Phase 4/);
  });

  it('debug-mode-checks.md documents verification method evidence_regex_match', () => {
    expect(checksContent).toMatch(/evidence_regex_match/);
  });

  it('debug-mode-checks.md replaces the V10.26.16 placeholder with a concrete spec', () => {
    expect(checksContent).not.toMatch(
      /V10\.26\.16 — Evidence.*[\s\S]*Placeholder\. Concrete check spec lands with V10\.26\.16/
    );
    // Regex spec is documented
    expect(checksContent).toMatch(/failing\|reproduction\|regression/);
  });
});
