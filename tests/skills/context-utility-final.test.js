// Regression test for V10.26.10 — /context finalized as Claude-invoked utility
// Asserts the tightened description, preserved frontmatter flags, back-compat
// pointer to /run context show, and plugin.json "/context utility" wording.
// Failing-before: without the back-compat pointer a user who still typed
// /context would see the old user-facing description and not learn about the
// /run context passthrough.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SKILL_PATH = resolve(process.cwd(), '.claude/skills/context/SKILL.md');
const PLUGIN_PATH = resolve(process.cwd(), '.claude-plugin/plugin.json');

function extractFrontmatter(path) {
  const content = readFileSync(path, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`No frontmatter found in ${path}`);
  return match[1];
}

function extractMetadataValue(frontmatter, key) {
  const re = new RegExp(`^\\s{2,}${key}:\\s*"?([^"\\n]+?)"?\\s*$`, 'm');
  const m = frontmatter.match(re);
  return m ? m[1] : null;
}

function extractDescription(frontmatter) {
  // Multi-line top-level `description: "..."` — grab everything between
  // the first and last quote on the description line (tolerates long text).
  const m = frontmatter.match(/^description:\s*"([\s\S]*?)"\s*$/m);
  return m ? m[1] : null;
}

describe('V10.26.10 /context utility finalization', () => {
  const skillBody = readFileSync(SKILL_PATH, 'utf8');
  const fm = extractFrontmatter(SKILL_PATH);
  const description = extractDescription(fm);

  it('frontmatter.metadata.user-invocable stays "false"', () => {
    // The V10.26.6 flag must not regress.
    expect(extractMetadataValue(fm, 'user-invocable')).toBe('false');
  });

  it('description is utility-facing and starts with "Internal utility"', () => {
    expect(description).toBeTruthy();
    expect(description).toMatch(/^Internal utility/);
  });

  it('description references the canonical product_context.yaml path', () => {
    expect(description).toMatch(
      /Agent_Memory\/_projects\/\{hash\}\/product_context\.yaml/
    );
  });

  it('description states direct user invocation is deprecated', () => {
    expect(description.toLowerCase()).toMatch(/deprecated/);
    expect(description).toMatch(/\/run context/);
  });

  it('skill body contains the "/run context show" back-compat pointer', () => {
    // Users who type /context still see the migration signal.
    expect(skillBody).toMatch(/\/run context show/);
  });

  it('skill body acknowledges the V10.26.6 demotion landing', () => {
    expect(skillBody).toMatch(/V10\.26\.6/);
  });

  it('skill body includes a "Back-compat note"', () => {
    expect(skillBody.toLowerCase()).toMatch(/back-compat/);
  });

  it('plugin.json description mentions "/context utility"', () => {
    const pluginJson = JSON.parse(readFileSync(PLUGIN_PATH, 'utf8'));
    expect(pluginJson.description).toMatch(/\/context utility/);
  });

  it('plugin.json description says "8 user skills"', () => {
    const pluginJson = JSON.parse(readFileSync(PLUGIN_PATH, 'utf8'));
    expect(pluginJson.description).toMatch(/8 user skills/);
  });
});
