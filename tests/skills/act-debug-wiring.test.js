// Regression test for V10.26.13 — wire debug-mode prefix into controller spawn
// Asserts SKILL.md PLANNED controller section references debug-mode-prompt.md, gated
// on flags.mode === "debug".
// Failing-before: V10.26.12 added the prefix file but nothing referenced it;
// this test locks in the wiring so /act --mode debug actually injects the prefix.
// v12.0.0: PROMPTS_READY collapsed into PLANNED — controller now lives in the
// PLANNED state. The wiring paragraph stays in the controller-state block.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RUN_SKILL = resolve(process.cwd(), '.claude/skills/act/SKILL.md');
const DELEGATION_REF = resolve(
  process.cwd(),
  '.claude/skills/act/reference/delegation-patterns.md'
);

describe('V10.26.13 debug-mode prefix wiring', () => {
  const runContent = readFileSync(RUN_SKILL, 'utf8');

  it('SKILL.md references the debug-mode-prompt.md prefix file', () => {
    expect(runContent).toMatch(/debug-mode-prompt\.md/);
  });

  it('SKILL.md gates injection on flags.mode === "debug"', () => {
    expect(runContent).toMatch(/flags\.mode === "debug"/);
  });

  it('SKILL.md locates wiring in the PLANNED controller section (v12.0.0)', () => {
    // v12.0.0: PROMPTS_READY collapsed into PLANNED. The wiring paragraph now
    // sits within the PLANNED controller block. The earlier mention at flag
    // parsing (line ~100) is a forward reference; the wiring paragraph itself
    // sits after the controller-state heading, so use lastIndexOf.
    const controllerIdx = runContent.indexOf(
      'For the **PLANNED state (controller)**'
    );
    const wiringIdx = runContent.lastIndexOf('debug-mode-prompt.md');
    expect(controllerIdx).toBeGreaterThan(-1);
    expect(wiringIdx).toBeGreaterThan(controllerIdx);
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
