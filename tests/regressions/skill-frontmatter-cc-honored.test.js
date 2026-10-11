/**
 * Regression test for N1 (v12.74.0): Claude Code skill fields under metadata.
 *
 * Bug: the 4 skills stored argument-hint, user-invocable and context under the
 *      `metadata:` map. The skills docs say of `metadata`: "Free-form YAML map
 *      for your own key-value data ... Claude Code doesn't act on its contents"
 *      (https://code.claude.com/docs/en/skills). The autocomplete hint was
 *      therefore never shown, and /team never ran in a fork.
 *
 * Fix: argument-hint is a top-level field in all 4 skills. context: fork stays
 *      under metadata on purpose: CC 2.1.218 runs a top-level fork skill in
 *      the background by default, which would break /team. The fork guard
 *      below is a forward-looking safeguard. It is not an N2 fix (N2 is
 *      refuted).
 *
 * This test fails on the pre-fix tree, where argument-hint was metadata-only.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');
const SKILLS = ['act', 'team', 'designer', 'helper'];

function frontmatter(skill) {
  const text = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'skills', skill, 'SKILL.md'), 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`${skill}/SKILL.md has no frontmatter`);
  return yaml.load(match[1]);
}

describe('skill frontmatter fields that Claude Code honors (N1)', () => {
  it.each(SKILLS)('%s declares argument-hint at the top level', (skill) => {
    const fm = frontmatter(skill);
    expect(typeof fm['argument-hint']).toBe('string');
    expect(fm['argument-hint'].length).toBeGreaterThan(0);
  });

  it.each(SKILLS)('%s has no metadata-only argument-hint', (skill) => {
    const fm = frontmatter(skill);
    expect(fm.metadata?.['argument-hint']).toBeUndefined();
  });

  it.each(SKILLS)('%s has no top-level context: fork without background: false (forward-looking guard per CC 2.1.218; N2 refuted)', (skill) => {
    const fm = frontmatter(skill);
    if (fm.context === 'fork') {
      expect(fm.background).toBe(false);
    }
  });
});
