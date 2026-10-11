/**
 * Regression test for F1 (v12.74.0): phantom agents from nested resource files.
 *
 * Bug: Claude Code scans a plugin agents/ directory recursively
 *      (https://code.claude.com/docs/en/sub-agents: "Plugin `agents/`
 *      directories are also scanned recursively"). With no `agents` key in
 *      plugin.json, every nested .md file registered as an agent. That gave
 *      452 phantom types such as cagents:architect:resources:adr-template, and
 *      `claude plugin validate .` printed 452 "No frontmatter block found"
 *      warnings.
 *
 * Fix: plugin.json lists the 60 agent files explicitly. The `agents` key
 *      "Replaces the default `agents/` scan" and takes ".md files. Directories
 *      aren't accepted" (https://code.claude.com/docs/en/plugins-reference).
 *      Resource files under agents/<name>/resources/ are therefore not
 *      registered.
 *
 * This test fails on the pre-fix tree (no `agents` key). It also fails when a
 * new agents/<name>.md is added without a plugin.json entry, or the reverse.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');
const AGENTS_DIR = path.join(REPO_ROOT, 'agents');
const PLUGIN_JSON = path.join(REPO_ROOT, '.claude-plugin', 'plugin.json');

const manifest = JSON.parse(fs.readFileSync(PLUGIN_JSON, 'utf8'));

function flatAgentEntries() {
  return fs
    .readdirSync(AGENTS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => `./agents/${e.name}`)
    .sort();
}

describe('plugin.json lists agents explicitly (agents/ scan is recursive)', () => {
  it('declares an `agents` array', () => {
    expect(
      Array.isArray(manifest.agents),
      'plugin.json must declare `agents` as an array of ./agents/<name>.md paths. ' +
        'Without it Claude Code scans agents/ recursively and registers every resource file.'
    ).toBe(true);
  });

  it('every entry is an existing .md file, not a directory', () => {
    const bad = (manifest.agents || []).filter((entry) => {
      const full = path.join(REPO_ROOT, entry);
      return (
        typeof entry !== 'string' ||
        !entry.endsWith('.md') ||
        !fs.existsSync(full) ||
        !fs.statSync(full).isFile()
      );
    });
    expect(bad, `Entries that are not existing .md files: ${bad.join(', ')}`).toEqual([]);
  });

  it('no entry sits in a subdirectory of agents/', () => {
    const nested = (manifest.agents || []).filter((entry) => !/^\.\/agents\/[^/]+\.md$/.test(entry));
    expect(nested, `Nested or out-of-tree entries: ${nested.join(', ')}`).toEqual([]);
  });

  it('the set equals the top-level agents/*.md files exactly', () => {
    const listed = [...(manifest.agents || [])].sort();
    const onDisk = flatAgentEntries();
    const missing = onDisk.filter((f) => !listed.includes(f));
    const extra = listed.filter((f) => !onDisk.includes(f));
    expect(
      { missing, extra },
      'Add each new agents/<name>.md to plugin.json `agents` (and remove deleted ones)'
    ).toEqual({ missing: [], extra: [] });
    expect(new Set(listed).size).toBe(listed.length);
  });
});
