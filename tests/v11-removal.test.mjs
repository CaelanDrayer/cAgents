// V11.0.0 removal regression test.
//
// Asserts that the four deprecated slash commands (/context, /debug,
// /review, /optimize) have been removed from disk, from the plugin
// manifest description, from the CLAUDE.md public skill menu, and
// from /helper's active catalog.
//
// Failing-before state: prior to V11.0.0 the four skill directories
// lived on disk and plugin.json advertised "9 skills + /context utility".
// Passing-after state: only 6 skills remain, and CLAUDE.md lists them
// accurately.
//
// Per the Bug-Driven Testing mandate in CLAUDE.md, this test is the
// regression gate for the V11.0.0 major-bump removal commit.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = process.cwd();
const SKILLS_DIR = resolve(ROOT, '.claude/skills');
const PLUGIN_JSON = resolve(ROOT, '.claude-plugin/plugin.json');
const CLAUDE_MD = resolve(ROOT, 'CLAUDE.md');
const HELPER_DETAILS = resolve(
  ROOT,
  '.claude/skills/helper/reference/command-details.md'
);
const MIGRATION_DOC = resolve(ROOT, 'docs/MIGRATION-V11.md');
const PACKAGE_JSON = resolve(ROOT, 'package.json');

const REMOVED_SKILLS = ['context', 'debug', 'review', 'optimize'];
const SURVIVING_SKILLS = ['run', 'team', 'org', 'designer', 'improve', 'helper'];

describe('V11.0.0 skill directory removal', () => {
  for (const name of REMOVED_SKILLS) {
    it(`.claude/skills/${name}/ does not exist`, () => {
      const dir = join(SKILLS_DIR, name);
      expect(existsSync(dir)).toBe(false);
    });

    it(`.claude/skills/${name}/SKILL.md does not exist`, () => {
      const skillMd = join(SKILLS_DIR, name, 'SKILL.md');
      expect(existsSync(skillMd)).toBe(false);
    });
  }

  it('.claude/skills/ contains exactly the 6 surviving skills', () => {
    const entries = readdirSync(SKILLS_DIR)
      .filter((e) => {
        try {
          return statSync(join(SKILLS_DIR, e)).isDirectory();
        } catch {
          return false;
        }
      })
      .sort();
    expect(entries).toEqual(SURVIVING_SKILLS.slice().sort());
  });

  it('every surviving skill still has a SKILL.md', () => {
    for (const name of SURVIVING_SKILLS) {
      const skillMd = join(SKILLS_DIR, name, 'SKILL.md');
      expect(existsSync(skillMd), `${name}/SKILL.md should exist`).toBe(true);
    }
  });
});

describe('V11.0.0 plugin.json hygiene', () => {
  const plugin = JSON.parse(readFileSync(PLUGIN_JSON, 'utf8'));

  it('plugin.json version is 11.0.0', () => {
    expect(plugin.version).toBe('11.0.0');
  });

  it('plugin.json description does not advertise removed skills', () => {
    const desc = plugin.description || '';
    // Word-boundary guard — avoid matching inside "/run context".
    expect(desc).not.toMatch(/\/review\b/);
    expect(desc).not.toMatch(/\/optimize\b/);
    expect(desc).not.toMatch(/\/debug\b/);
    // /context as a standalone skill reference:
    expect(desc).not.toMatch(/\s\/context\b/);
  });

  it('plugin.json description mentions the 6 surviving skills', () => {
    const desc = plugin.description || '';
    for (const name of SURVIVING_SKILLS) {
      expect(desc, `description should mention /${name}`).toMatch(
        new RegExp(`/${name}\\b`)
      );
    }
  });
});

describe('V11.0.0 CLAUDE.md skill menu', () => {
  const claude = readFileSync(CLAUDE_MD, 'utf8');

  it('the Skills table lists exactly 6 skills', () => {
    // Match table rows like `| \`/name\` | ... |`.
    const rowRe = /^\| `\/([a-z]+)` \|/gm;
    const matches = new Set();
    for (const m of claude.matchAll(rowRe)) {
      matches.add(m[1]);
    }
    // The Skills table should contain exactly the 6 surviving names.
    // Built-in /memory and /init may also appear in the same document,
    // so we intersect with the known surviving set.
    const surviving = new Set(SURVIVING_SKILLS);
    const listed = [...matches].filter((n) => surviving.has(n));
    expect(listed.sort()).toEqual(SURVIVING_SKILLS.slice().sort());
  });

  it('the Skills table does not list removed skills', () => {
    // No table row for /review, /optimize, /context, /debug.
    for (const name of REMOVED_SKILLS) {
      const rowRe = new RegExp(`^\\| \`/${name}\` \\|`, 'm');
      expect(claude, `CLAUDE.md should not have a table row for /${name}`).not.toMatch(rowRe);
    }
  });
});

describe('V11.0.0 /helper catalog', () => {
  const helper = readFileSync(HELPER_DETAILS, 'utf8');

  it('does not contain an active ## section for removed skills', () => {
    for (const name of REMOVED_SKILLS) {
      const sectionRe = new RegExp(`^## /${name}\\b`, 'm');
      expect(
        helper,
        `command-details.md should not have an active ## /${name} section`
      ).not.toMatch(sectionRe);
    }
  });

  it('contains a "Removed in V11.0.0" migration section', () => {
    expect(helper).toMatch(/## Removed in V11\.0\.0/);
  });

  it('the migration section mentions all four removed skills', () => {
    for (const name of REMOVED_SKILLS) {
      // Look for a backticked reference on the same line as the table row.
      const ref = new RegExp(`\\\`/${name}\\\``);
      expect(helper, `should reference /${name} in migration section`).toMatch(ref);
    }
  });
});

describe('V11.0.0 migration guide', () => {
  it('docs/MIGRATION-V11.md exists', () => {
    expect(existsSync(MIGRATION_DOC)).toBe(true);
  });

  it('migration guide covers all four removed commands', () => {
    const text = readFileSync(MIGRATION_DOC, 'utf8');
    expect(text).toMatch(/\/context/);
    expect(text).toMatch(/\/debug/);
    expect(text).toMatch(/\/review/);
    expect(text).toMatch(/\/optimize/);
    expect(text).toMatch(/--mode full/);
  });
});

describe('V11.0.0 package.json version', () => {
  it('is exactly 11.0.0', () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));
    expect(pkg.version).toBe('11.0.0');
  });
});
