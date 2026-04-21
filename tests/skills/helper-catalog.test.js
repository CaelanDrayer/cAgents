/**
 * /helper catalog regression test (added in V10.26.4).
 *
 * Bug this catches: helper SKILL.md drops a command from its catalog or the
 * V10.27+ planned commands (/improve, /debug migration, /context demotion)
 * silently disappear from the reserved slots.
 * Could have been caught by: unit test on helper/SKILL.md catalog coverage.
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

const CURRENT_SKILLS = [
  '/run',
  '/designer',
  '/review',
  '/optimize',
  '/team',
  '/org',
  '/helper',
  '/debug',
  '/context',
];

describe('/helper catalog coverage', () => {
  for (const skill of CURRENT_SKILLS) {
    it(`mentions current skill ${skill}`, () => {
      expect(content).toContain(skill);
    });
  }

  it('has a "Planned Commands" section for V10.27+ roadmap', () => {
    expect(content).toMatch(/^## Planned Commands/m);
  });

  it('reserves an /improve slot with trigger keywords', () => {
    expect(content).toMatch(/\/improve/);
    // Trigger keywords specified in the cluster-1 roadmap
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

  it('notes /context demotion in V10.27', () => {
    expect(content).toMatch(/\/context/);
    expect(content).toMatch(/V10\.27/);
    expect(content.toLowerCase()).toMatch(/demot/);
  });
});
