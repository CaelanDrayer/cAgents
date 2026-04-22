/**
 * /helper catalog regression test, updated for V11.0.0.
 *
 * Bug this catches: helper SKILL.md drops a current user skill from its
 * catalog, or the migration references for removed V11.0 commands
 * (/review, /optimize, /context, /debug) vanish from the SKILL.md body.
 * Could have been caught by: unit test on helper/SKILL.md catalog coverage.
 *
 * V11.0 change: The user-invocable catalog shrinks to 6 skills. The four
 * removed commands are still mentioned in the SKILL.md body so users who
 * search for old names are redirected, but they are no longer presented
 * as active skills.
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
  '/improve',
  '/team',
  '/org',
  '/helper',
];

const REMOVED_V11_SKILLS = ['/review', '/optimize', '/context', '/debug'];

describe('/helper catalog coverage (V11.0)', () => {
  for (const skill of USER_INVOCABLE_SKILLS) {
    it(`mentions current user-invocable skill ${skill}`, () => {
      expect(content).toContain(skill);
    });
  }

  it('mentions /improve with its unified trigger keywords', () => {
    expect(content).toMatch(/\/improve/);
    const triggers = ['review', 'audit', 'optimize', 'improve'];
    for (const t of triggers) {
      expect(content.toLowerCase()).toContain(t);
    }
  });

  it('still references removed V11 commands for search redirects', () => {
    // Users who search for the old names should find migration guidance.
    for (const removed of REMOVED_V11_SKILLS) {
      expect(
        content,
        `SKILL.md should still reference ${removed} for migration`
      ).toMatch(new RegExp(removed));
    }
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
