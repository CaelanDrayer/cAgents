/**
 * Regression test for the "No agent files found in specified directories"
 * plugin-validation failure (2026-09-04).
 *
 * Bug: agent definitions lived at agents/{archetype}/[{branch}/]{name}/SKILL.md
 *      and were registered via a 60-entry `agents` array in plugin.json that
 *      pointed at directories. The `agents` key accepts only .md files, so
 *      every definition was invisible:
 *      `claude plugin details cagents` reported "Agents (0)" and the plugin
 *      validator reported "No agent files found in specified directories".
 *
 * Root cause: two independent mismatches with the discovery contract —
 *      (a) nesting (only top-level agents/*.md is scanned), and
 *      (b) the `agents` manifest array, whose accepted shape differs across
 *          Claude Code versions (file paths in 2.1.260, directories in the
 *          validator that reported the bug). Omitting the field and shipping
 *          flat files is the only form that satisfies every version — and it
 *          is what every first-party Anthropic plugin does.
 *
 * Fix (v12.68.0): agents/<name>.md, resources at agents/<name>/resources/.
 *      Verified with `claude plugin details` reporting Agents (60).
 *
 * Correction (v12.74.0): the plugin agents/ scan is RECURSIVE, so the nested
 *      resource files registered as phantom agents. plugin.json now lists the
 *      60 flat files in an explicit `agents` array of file paths. That array
 *      replaces the default scan. tests/regressions/plugin-agents-explicit-list.test.js
 *      pins the array to agents/*.md.
 *
 * Could have been caught by: this test.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');
const AGENTS_DIR = path.join(REPO_ROOT, 'agents');
const PLUGIN_JSON = path.join(REPO_ROOT, '.claude-plugin', 'plugin.json');

function flatAgentFiles() {
  return fs
    .readdirSync(AGENTS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name);
}

function walkNestedSkillMd(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkNestedSkillMd(full, acc);
    else if (entry.name === 'SKILL.md') acc.push(path.relative(REPO_ROOT, full));
  }
  return acc;
}

function frontmatterOf(file) {
  const text = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : '';
}

describe('flat agent discovery (plugin.json lists the flat agents/*.md files)', () => {
  it('ships agent definitions as top-level agents/*.md files', () => {
    expect(flatAgentFiles().length).toBeGreaterThan(0);
  });

  it('has no nested SKILL.md under agents/ — a nested definition is never discovered', () => {
    const nested = walkNestedSkillMd(AGENTS_DIR);
    expect(
      nested,
      `These agent definitions sit below agents/ and are invisible to plugin discovery: ${nested.join(', ')}`
    ).toEqual([]);
  });

  it('plugin.json lists exactly the flat agent files (the scan is recursive)', () => {
    const manifest = JSON.parse(fs.readFileSync(PLUGIN_JSON, 'utf8'));
    const expected = flatAgentFiles().map((f) => `./agents/${f}`).sort();
    expect(
      [...(manifest.agents || [])].sort(),
      'plugin.json `agents` must list each agents/<name>.md file path and nothing else. ' +
        'Without it, Claude Code scans agents/ recursively and registers resource files as agents'
    ).toEqual(expected);
  });

  it('every agent file declares a `name` matching its basename (discovery keys off the filename)', () => {
    const mismatches = [];
    for (const file of flatAgentFiles()) {
      const nameMatch = frontmatterOf(file).match(/^name:\s*["']?([^"'\r\n]+)["']?\s*$/m);
      const declared = nameMatch ? nameMatch[1].trim() : null;
      const expected = file.slice(0, -'.md'.length);
      if (declared !== expected) mismatches.push(`${file}: name=${declared ?? '(missing)'}`);
    }
    expect(mismatches, `Agent name/filename mismatches: ${mismatches.join(', ')}`).toEqual([]);
  });

  it('every agent file declares an archetype (the taxonomy the directories used to encode)', () => {
    const missing = flatAgentFiles().filter((f) => !/^archetype:\s*\S/m.test(frontmatterOf(f)));
    expect(missing, `Agent files missing archetype: ${missing.join(', ')}`).toEqual([]);
  });
});
