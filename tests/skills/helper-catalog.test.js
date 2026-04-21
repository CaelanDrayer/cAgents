/**
 * /helper catalog regression test (added in V10.26.4, updated in V10.26.8).
 *
 * Bug this catches: helper SKILL.md drops a current user skill from its
 * catalog, accidentally re-surfaces /context in the main user table, or
 * the V10.27+ planned commands (/improve, /debug migration) disappear.
 * Could have been caught by: unit test on helper/SKILL.md catalog coverage.
 *
 * V10.26.8 change: `/context` moved to the "Internal utilities" subsection.
 * This test enforces the split: 8 user-invocable skills in the main catalog
 * PLUS `/context` under a Claude-invoked utilities subsection.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const HELPER_PATH = join(
  process.cwd(),
  '.claude',
  'skills',
  'helper',
  'SKILL.md',
);
const content = readFileSync(HELPER_PATH, 'utf8');

const USER_INVOCABLE_SKILLS = [
  '/run',
  '/designer',
  '/review',
  '/optimize',
  '/team',
  '/org',
  '/helper',
  '/debug',
];

describe('/helper catalog coverage', () => {
  for (const skill of USER_INVOCABLE_SKILLS) {
    it(`mentions current user-invocable skill ${skill}`, () => {
      expect(content).toContain(skill);
    });
  }

  it('still mentions /context somewhere (utility listing)', () => {
    expect(content).toContain('/context');
  });

  it('has a "Planned Commands" section for V10.27+ roadmap', () => {
    expect(content).toMatch(/^## Planned Commands/m);
  });

  it('reserves an /improve slot with trigger keywords', () => {
    expect(content).toMatch(/\/improve/);
    const triggers = ['review', 'audit', 'optimize', 'speed up', 'improve'];
    for (const t of triggers) {
      expect(content.toLowerCase()).toContain(t);
    }
  });

  it('notes /debug migration to /run --mode debug in V10.28', () => {
    expect(content).toMatch(/\/debug/);
    expect(content).toMatch(/\/run --mode debug/);
    expect(content).toMatch(/V10\.28/);
  });

  it('records /context demotion as complete with V10.26.6 landing', () => {
    expect(content).toMatch(/\/context/);
    expect(content.toLowerCase()).toMatch(/demot/);
    // Demotion work lands in V10.26.6; roadmap entry can still mention V10.27.
    expect(content).toMatch(/V10\.26\.6/);
  });

  it('lists /context under an "Internal utilities" subsection', () => {
    // Subsection header introduced in V10.26.8.
    expect(content).toMatch(/^### Internal utilities/m);
    // The subsection should mention /context.
    const subsectionIdx = content.indexOf('### Internal utilities');
    expect(subsectionIdx).toBeGreaterThan(-1);
    const subsectionBody = content.slice(subsectionIdx, subsectionIdx + 800);
    expect(subsectionBody).toMatch(/\/context/);
  });

  it('user-facing Command Overview table does NOT list /context as user-invocable', () => {
    // Extract the "Available Commands" overview table body.
    const tableStart = content.indexOf('Available Commands:');
    expect(tableStart).toBeGreaterThan(-1);
    const tableEnd = content.indexOf('```', tableStart + 1);
    const table = content.slice(tableStart, tableEnd);
    // /context should no longer appear as a row in the main user catalog.
    expect(table).not.toMatch(/\|\s*\/context\s*\|/);
  });
});
