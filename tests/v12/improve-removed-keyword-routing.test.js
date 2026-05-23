/**
 * v12.1.2 regression: /improve folded into /run via keyword router.
 *
 * The standalone /improve skill was removed in v12.1.2. The improve modes
 * (review, optimize, full) are now triggered by a first-word keyword in /run:
 *   /run improve <target>  -> --mode full
 *   /run review <target>   -> --mode review
 *   /run audit <target>    -> --mode review (alias)
 *   /run optimize <target> -> --mode optimize
 *
 * Bug-driven testing mandate: this test would have caught a regression where
 *   (a) the .claude/skills/improve/ directory was restored;
 *   (b) the plugin manifest gained an /improve skill reference;
 *   (c) the /run SKILL.md lost the keyword router section.
 *
 * Could have caught by: unit test on the plugin file structure + /run
 * SKILL.md content after the v12.1.2 fold.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();

describe('v12.1.2: /improve folded into /run via keyword router', () => {
  it('removes .claude/skills/improve/ directory entirely', () => {
    const improveDir = join(REPO_ROOT, '.claude', 'skills', 'improve');
    expect(existsSync(improveDir),
      `Expected ${improveDir} to NOT exist after v12.1.2 removed the /improve skill, but it does`
    ).toBe(false);
  });

  it('removes .claude/skills/improve/SKILL.md', () => {
    const skillPath = join(REPO_ROOT, '.claude', 'skills', 'improve', 'SKILL.md');
    expect(existsSync(skillPath)).toBe(false);
  });

  it('plugin.json description does NOT mention /improve as a standalone skill', () => {
    const pluginJsonPath = join(REPO_ROOT, '.claude-plugin', 'plugin.json');
    expect(existsSync(pluginJsonPath)).toBe(true);
    const pluginJson = JSON.parse(readFileSync(pluginJsonPath, 'utf8'));
    // The description should advertise 4 user skills (v12.2.0 removed /org;
    // v12.1.2 folded /improve into /run). Pre-v12.2.0 this was "5 user skills".
    expect(pluginJson.description).toMatch(/4 user skills/i);
    // And it should NOT describe /improve as one of the user skills
    expect(pluginJson.description).not.toMatch(/\/improve audits/i);
  });

  it('plugin.json agents[] does NOT reference any skills/improve/ path', () => {
    const pluginJsonPath = join(REPO_ROOT, '.claude-plugin', 'plugin.json');
    const pluginJson = JSON.parse(readFileSync(pluginJsonPath, 'utf8'));
    const agents = pluginJson.agents || [];
    const offending = agents.filter(p => /\.claude\/skills\/improve\//.test(p));
    expect(offending,
      `Found stale references to .claude/skills/improve/ in plugin.json agents[]:\n${offending.join('\n')}`
    ).toEqual([]);
  });

  it('/run SKILL.md contains the keyword router section mentioning all four keywords', () => {
    const runSkillPath = join(REPO_ROOT, '.claude', 'skills', 'run', 'SKILL.md');
    expect(existsSync(runSkillPath)).toBe(true);
    const content = readFileSync(runSkillPath, 'utf8');
    // The keyword router section must mention the section heading
    expect(content).toMatch(/Improve-Mode Keyword Router|Keyword Router/i);
    // And it must reference all four improve-family keywords
    expect(content).toContain('improve');
    expect(content).toContain('review');
    expect(content).toContain('audit');
    expect(content).toContain('optimize');
  });

  it('/run SKILL.md references the new improve-mode.md reference doc', () => {
    const runSkillPath = join(REPO_ROOT, '.claude', 'skills', 'run', 'SKILL.md');
    const content = readFileSync(runSkillPath, 'utf8');
    expect(content).toMatch(/@reference\/improve-mode\.md/);
  });

  it('/run reference directory contains the new improve-mode.md doc', () => {
    const refPath = join(REPO_ROOT, '.claude', 'skills', 'run', 'reference', 'improve-mode.md');
    expect(existsSync(refPath),
      'Expected .claude/skills/run/reference/improve-mode.md to exist'
    ).toBe(true);
    const content = readFileSync(refPath, 'utf8');
    // It must describe the keyword router contract
    expect(content).toMatch(/keyword router/i);
    expect(content).toMatch(/improve/);
    expect(content).toMatch(/review/);
    expect(content).toMatch(/audit/);
    expect(content).toMatch(/optimize/);
  });

  it('/run SKILL.md --mode parser accepts review|optimize|full in addition to standard|debug', () => {
    const runSkillPath = join(REPO_ROOT, '.claude', 'skills', 'run', 'SKILL.md');
    const content = readFileSync(runSkillPath, 'utf8');
    // After v12.1.2, the --mode parser must list the absorbed improve modes
    expect(content).toMatch(/--mode parser/i);
    expect(content).toMatch(/standard, debug, review, optimize, full/);
  });

  it('v12-aliases.yaml has an entry mapping the removed /improve skill', () => {
    const aliasesPath = join(REPO_ROOT, 'scripts', 'migration', 'v12-aliases.yaml');
    expect(existsSync(aliasesPath)).toBe(true);
    const content = readFileSync(aliasesPath, 'utf8');
    // The migration file must document the /improve removal
    expect(content).toMatch(/improve/i);
  });

  it('CHANGELOG.md has a v12.1.2 entry under [Unreleased] or as own section', () => {
    const changelogPath = join(REPO_ROOT, 'CHANGELOG.md');
    expect(existsSync(changelogPath)).toBe(true);
    const content = readFileSync(changelogPath, 'utf8');
    // Either a dedicated section header or an Unreleased entry mentioning v12.1.2 / improve fold
    expect(content).toMatch(/## \[12\.1\.2\]|improve.*folded.*into.*run|keyword router/i);
  });

  it('version-registry.md slot count reduced to 16 after improve + org removal', () => {
    // v12.1.2 removed /improve slot (18 -> 17). v12.2.0 removed /org slot (17 -> 16).
    // This test originally asserted "17 total"; updated for the v12.2.0 cumulative state.
    const registryPath = join(REPO_ROOT, '.claude', 'rules', 'core', 'version-registry.md');
    expect(existsSync(registryPath)).toBe(true);
    const content = readFileSync(registryPath, 'utf8');
    expect(content).toMatch(/Version Locations \(16 total\)/);
  });
});
