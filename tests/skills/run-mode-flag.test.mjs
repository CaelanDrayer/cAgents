// Regression test for V10.26.11 — /run --mode flag parser
// Asserts the documentation contract: Step 1 parses `--mode <value>`, accepts
// `standard` and `debug`, rejects unknown values, and defaults to `standard`.
// Failing-before: V10.26.10 had no --mode flag defined anywhere in /run; this
// test locks in the parser surface before downstream patches wire behavior.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RUN_SKILL = resolve(process.cwd(), '.claude/skills/run/SKILL.md');
const FLAGS_REF = resolve(process.cwd(), '.claude/skills/run/reference/flags.md');

describe('V10.26.11 /run --mode flag parser', () => {
  it('SKILL.md Step 1 lists --mode in the value-flag set', () => {
    expect(existsSync(RUN_SKILL)).toBe(true);
    const content = readFileSync(RUN_SKILL, 'utf8');
    expect(content).toMatch(/--mode <debug\|standard>/);
  });

  it('SKILL.md documents the --mode parser contract', () => {
    const content = readFileSync(RUN_SKILL, 'utf8');
    expect(content).toMatch(/--mode parser \(V10\.26\.11\+\)/);
    expect(content).toMatch(/flags\.mode/);
  });

  it('SKILL.md accepts standard and debug as valid --mode values', () => {
    const content = readFileSync(RUN_SKILL, 'utf8');
    expect(content).toMatch(/standard.*\(default\)/);
    expect(content).toMatch(/debug/);
  });

  it('SKILL.md rejects unknown --mode values with an error', () => {
    const content = readFileSync(RUN_SKILL, 'utf8');
    expect(content).toMatch(/unknown mode.*Supported.*standard.*debug/s);
  });

  it('SKILL.md states the default --mode is standard', () => {
    const content = readFileSync(RUN_SKILL, 'utf8');
    expect(content).toMatch(/Default when unset:\s*`standard`/);
  });

  it('SKILL.md marks --mode as a no-op downstream in V10.26.11', () => {
    const content = readFileSync(RUN_SKILL, 'utf8');
    expect(content).toMatch(/no-op/);
  });

  it('flags.md reference documents the --mode flag', () => {
    expect(existsSync(FLAGS_REF)).toBe(true);
    const content = readFileSync(FLAGS_REF, 'utf8');
    expect(content).toMatch(/`--mode <value>`/);
    expect(content).toMatch(/V10\.26\.11/);
  });
});
