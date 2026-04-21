// Regression test for V10.26.13 — wire debug-mode prefix into controller spawn
// Asserts SKILL.md PROMPTS_READY section references debug-mode-prompt.md, gated
// on flags.mode === "debug".
// Failing-before: V10.26.12 added the prefix file but nothing referenced it;
// this test locks in the wiring so /run --mode debug actually injects the prefix.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RUN_SKILL = resolve(process.cwd(), '.claude/skills/run/SKILL.md');
const DELEGATION_REF = resolve(
  process.cwd(),
  '.claude/skills/run/reference/delegation-patterns.md'
);

describe('V10.26.13 debug-mode prefix wiring', () => {
  const runContent = readFileSync(RUN_SKILL, 'utf8');

  it('SKILL.md references the debug-mode-prompt.md prefix file', () => {
    expect(runContent).toMatch(/debug-mode-prompt\.md/);
  });

  it('SKILL.md gates injection on flags.mode === "debug"', () => {
    expect(runContent).toMatch(/flags\.mode === "debug"/);
  });

  it('SKILL.md locates wiring in the PROMPTS_READY controller section', () => {
    // Confirm the wiring paragraph sits within the PROMPTS_READY controller block.
    const promptsReadyIdx = runContent.indexOf(
      'For the PROMPTS_READY state (controller):'
    );
    const wiringIdx = runContent.indexOf('debug-mode-prompt.md');
    expect(promptsReadyIdx).toBeGreaterThan(-1);
    expect(wiringIdx).toBeGreaterThan(promptsReadyIdx);
  });

  it('SKILL.md documents the injection as V10.26.13 change', () => {
    expect(runContent).toMatch(/V10\.26\.13/);
  });

  it('SKILL.md confirms standard mode skips injection', () => {
    expect(runContent).toMatch(/standard.*skip.*injection/s);
  });

  it('delegation-patterns.md documents the injection point', () => {
    const ref = readFileSync(DELEGATION_REF, 'utf8');
    expect(ref).toMatch(/Debug-Mode Prefix Injection/);
    expect(ref).toMatch(/V10\.26\.13/);
    expect(ref).toMatch(/debug-mode-prompt\.md/);
  });
});
