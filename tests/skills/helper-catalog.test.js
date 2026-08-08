/**
 * /helper catalog regression test, updated for v12.2.0.
 *
 * Bug this catches: helper SKILL.md drops a current user skill from its
 * catalog, the migration references for removed commands (/review,
 * /optimize, /context, /debug, /org) vanish from the SKILL.md body, or
 * the /team strategic-mode mention disappears.
 * Could have been caught by: unit test on helper/SKILL.md catalog coverage.
 *
 * v12.2.0 change: /org was absorbed into /team strategic mode. The
 * user-invocable catalog shrinks to 4 skills (/designer, /helper, /act,
 * /team). /org joins the removed-commands list along with the four V11.0
 * removals; users searching for it should be redirected to /team strategic
 * mode.
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

// v12.2.0: 4 user-invocable skills (/improve folded into /act in v12.1.2;
// /org folded into /team strategic mode in v12.2.0). `/run` was renamed to
// `/act` (it collided with Claude Code's built-in `run` skill).
const USER_INVOCABLE_SKILLS = [
  '/act',
  '/designer',
  '/team',
  '/helper',
];

// Removed-but-still-referenced commands (for search redirects). /org joins
// the V11.0 quartet in v12.2.0.
const REMOVED_COMMANDS = ['/review', '/optimize', '/context', '/debug', '/org'];

describe('/helper catalog coverage (v12.2.0)', () => {
  for (const skill of USER_INVOCABLE_SKILLS) {
    it(`mentions current user-invocable skill ${skill}`, () => {
      expect(content).toContain(skill);
    });
  }

  it('mentions /team strategic mode for cross-domain routing', () => {
    // /team strategic mode is the v12.2.0 replacement for the removed /org
    // skill. Helper must surface this for users searching cross-domain or
    // strategic keywords.
    expect(content.toLowerCase()).toContain('strategic');
    expect(content).toMatch(/\/team.*strategic|strategic.*\/team/i);
  });

  it('still references removed commands for search redirects', () => {
    // Users who search for the old names should find migration guidance.
    for (const removed of REMOVED_COMMANDS) {
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

  it('user-facing Command Overview table does NOT list /org as user-invocable (v12.2.0)', () => {
    // Extract the "Available Commands" overview table body.
    const tableStart = content.indexOf('Available Commands:');
    expect(tableStart).toBeGreaterThan(-1);
    const tableEnd = content.indexOf('```', tableStart + 1);
    const table = content.slice(tableStart, tableEnd);
    // /org should no longer appear as a row in the main user catalog (it
    // was absorbed into /team strategic mode in v12.2.0).
    expect(table).not.toMatch(/\|\s*\/org\s*\|/);
  });
});
