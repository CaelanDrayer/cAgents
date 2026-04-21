// Regression test for V10.26.6 — /context demoted from user-invocable slash menu
// Asserts frontmatter flip: metadata.user-invocable is "false" (Claude-invoked only).
// Failing-before: the frontmatter previously declared user-invocable: "true",
// exposing /context in the / menu. This test asserts the flip landed.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SKILL_PATH = resolve(process.cwd(), '.claude/skills/context/SKILL.md');

function extractFrontmatter(path) {
  const content = readFileSync(path, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`No frontmatter found in ${path}`);
  return match[1];
}

function extractMetadataValue(frontmatter, key) {
  // Matches lines like `  key: "value"` or `  key: value` inside metadata block.
  const re = new RegExp(`^\\s{2,}${key}:\\s*"?([^"\\n]+?)"?\\s*$`, 'm');
  const match = frontmatter.match(re);
  return match ? match[1] : null;
}

describe('V10.26.6 /context slash-menu hide', () => {
  const fm = extractFrontmatter(SKILL_PATH);
  const body = readFileSync(SKILL_PATH, 'utf8');

  it('frontmatter declares name: context', () => {
    expect(fm).toMatch(/^name: context\s*$/m);
  });

  it('top-level fields only include Agent Skills spec-allowed keys', () => {
    const topLevelKeys = fm
      .split('\n')
      .filter((line) => /^[a-z][a-z0-9_-]*:/i.test(line))
      .map((line) => line.split(':')[0].trim());
    const allowed = new Set([
      'name',
      'description',
      'license',
      'compatibility',
      'metadata',
      'allowed-tools',
    ]);
    for (const key of topLevelKeys) {
      expect(allowed.has(key)).toBe(true);
    }
  });

  it('metadata.user-invocable is the string "false"', () => {
    // Agent Skills spec stores extensions as strings inside metadata.
    expect(extractMetadataValue(fm, 'user-invocable')).toBe('false');
  });

  it('argument-hint notes Claude-invoked dispatch', () => {
    expect(extractMetadataValue(fm, 'argument-hint')).toMatch(/Claude-invoked/i);
  });

  it('data file path reference is preserved in the body', () => {
    expect(body).toMatch(/_projects\/\{project_hash\}\/product_context\.yaml/);
  });
});
