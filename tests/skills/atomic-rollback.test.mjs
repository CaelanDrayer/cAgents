// Contract test for V10.26.29 atomic rollback primitive.
// Asserts that the shared helper exists, documents the required
// snapshot/apply/test/keep-or-rollback contract, and is referenced by
// both /improve SKILL.md and the legacy /optimize risk-classification
// doc.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const ATOMIC = resolve(
  ROOT,
  '.claude/skills/improve/reference/atomic-rollback.md'
);
const IMPROVE_SKILL = resolve(ROOT, '.claude/skills/improve/SKILL.md');
const OPTIMIZE_RISK = resolve(
  ROOT,
  '.claude/skills/optimize/reference/risk-classification.md'
);

describe('V10.26.29 atomic rollback primitive (shared helper)', () => {
  it('reference/atomic-rollback.md exists', () => {
    expect(existsSync(ATOMIC)).toBe(true);
  });

  it('documents the three-outcome contract (kept | rolled_back | dead_letter)', () => {
    const c = readFileSync(ATOMIC, 'utf8');
    expect(c).toMatch(/kept/);
    expect(c).toMatch(/rolled_back/);
    expect(c).toMatch(/dead_letter/);
  });

  it('documents git_stash_push / restore snapshot flow', () => {
    const c = readFileSync(ATOMIC, 'utf8');
    expect(c).toMatch(/git_stash_push/);
    expect(c).toMatch(/restore/);
  });

  it('declares byte-parity invariant via git diff --exit-code', () => {
    const c = readFileSync(ATOMIC, 'utf8');
    expect(c).toMatch(/git diff --exit-code/);
  });

  it('specifies guard chain for both review and optimize modes', () => {
    const c = readFileSync(ATOMIC, 'utf8');
    expect(c).toMatch(/Review Mode/i);
    expect(c).toMatch(/Optimize Mode/i);
    expect(c).toMatch(/npm test/);
  });

  it('specifies exit code contract for shell callers', () => {
    const c = readFileSync(ATOMIC, 'utf8');
    expect(c).toMatch(/Exit Code/);
    // kept=0, rolled_back=1, dead_letter=2
    expect(c).toMatch(/\|\s*`kept`\s*\|\s*0\s*\|/);
  });

  it('SKILL.md cites reference/atomic-rollback.md under V10.26.29', () => {
    const s = readFileSync(IMPROVE_SKILL, 'utf8');
    expect(s).toMatch(/Atomic Rollback Primitive.*V10\.26\.29/);
    expect(s).toMatch(/reference\/atomic-rollback\.md/);
  });

  it('SKILL.md asserts callers do NOT inline git-snapshot logic', () => {
    const s = readFileSync(IMPROVE_SKILL, 'utf8');
    expect(s).toMatch(/do NOT inline git-snapshot logic/);
  });

  it('legacy /optimize risk-classification.md has migrated-primitive banner', () => {
    const r = readFileSync(OPTIMIZE_RISK, 'utf8');
    expect(r).toMatch(/Atomic primitive migrated.*V10\.26\.29/);
    expect(r).toMatch(/improve\/reference\/atomic-rollback\.md/);
  });
});
