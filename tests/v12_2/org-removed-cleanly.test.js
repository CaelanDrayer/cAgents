/**
 * v12.2.0 regression test: /org skill removed cleanly.
 *
 * Bug-driven test per CLAUDE.md Bug-Driven Testing mandate and the Phase-2
 * success criteria of the fold-org-into-skills migration. This test FAILS
 * before /org is removed (because .claude/skills/org/SKILL.md exists and
 * plugin manifests reference /org) and PASSES after /org is removed and
 * its capabilities are folded into /team strategic mode.
 *
 * Could have caught: any future PR that re-adds /org without going through
 * the proper migration path (which would have to also restore the SKILL.md
 * directory, plugin.json command entry, and marketplace.json listing).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

describe('v12.2.0: /org removed cleanly', () => {
  it('.claude/skills/org/ directory does not exist', () => {
    const orgDir = path.join(ROOT, '.claude', 'skills', 'org');
    expect(fs.existsSync(orgDir)).toBe(false);
  });

  it('.claude/skills/org/SKILL.md does not exist', () => {
    const orgSkill = path.join(ROOT, '.claude', 'skills', 'org', 'SKILL.md');
    expect(fs.existsSync(orgSkill)).toBe(false);
  });

  it('plugin.json does not reference /org as a slash command', () => {
    const pluginJson = JSON.parse(
      fs.readFileSync(path.join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8')
    );
    const stringified = JSON.stringify(pluginJson);
    // Allow agent names containing "org" as a substring (e.g.,
    // "organizational-development-specialist") but reject "/org" slash-command refs.
    expect(stringified).not.toMatch(/\/org\b/);
  });

  it('marketplace.json does not reference /org', () => {
    const marketJson = JSON.parse(
      fs.readFileSync(path.join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf8')
    );
    const stringified = JSON.stringify(marketJson);
    expect(stringified).not.toMatch(/\/org\b/);
  });

  it('marketplace.json declares version 12.2.0 (the fold-org release)', () => {
    const marketJson = JSON.parse(
      fs.readFileSync(path.join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf8')
    );
    // marketplace.json nests version inside the first plugin entry.
    const plugins = marketJson.plugins || [];
    expect(plugins.length).toBeGreaterThan(0);
    expect(plugins[0].version).toBe('12.2.0');
  });

  it('.claude/skills/ contains exactly the 4 v12.2.0 user-invocable skills', () => {
    const skillsDir = path.join(ROOT, '.claude', 'skills');
    // Filter out _MODE_REGISTRY.md, commit-changes (untracked workspace artifact),
    // and any non-directory entries. The 4 v12.2.0 user-invocable skills:
    // designer, helper, run, team.
    const entries = fs
      .readdirSync(skillsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((n) => !n.startsWith('_'));
    // commit-changes is a workspace-level untracked symlink; tolerate its
    // presence (per tests/skills/no-broken-symlinks.test.js it may resolve
    // or not depending on workspace layout).
    const userSkills = entries
      .filter((n) => n !== 'commit-changes')
      .sort();
    expect(userSkills).toEqual(['designer', 'helper', 'run', 'team']);
    expect(userSkills).not.toContain('org');
  });
});
