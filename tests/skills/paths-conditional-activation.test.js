// Phase 6 (V11.1.12): metadata.paths conditional activation regression test
// Asserts:
//   (a) Frontmatter parser accepts metadata.paths as an array of strings
//   (b) >=10 agents declare metadata.paths (pilot threshold)
//   (c) Every declared path entry is a non-empty string
//   (d) Back-compat: agents without paths: parse fine
//
// Refs:
//   - .claude/rules/core/skill-format.md § "paths (V11.1.12+)"
//   - cagents-memory/sessions/team_continue-cagents-w6_260505_001/workflow/work_items.yaml TASK-6

import { describe, test, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const ARCHETYPES = ['developer', 'operator', 'advisor', 'analyst', 'creator', 'writer', 'strategist', 'core', 'leadership'];

function findAllSkillMd() {
  const results = [];
  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'SKILL.md') results.push(full);
    }
  }
  for (const archetype of ARCHETYPES) walk(join(ROOT, 'agents', archetype));
  return results;
}

function parseFrontmatter(filepath) {
  const content = readFileSync(filepath, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  try {
    return yaml.load(match[1]);
  } catch {
    return null;
  }
}

describe('Phase 6: metadata.paths conditional activation (V11.1.12+)', () => {
  const skills = findAllSkillMd();
  const declarations = skills
    .map((p) => ({ path: p, fm: parseFrontmatter(p) }))
    .filter((x) => x.fm && x.fm.metadata && Array.isArray(x.fm.metadata.paths));

  test('(a) Frontmatter parser accepts metadata.paths as array of strings on pilot agents', () => {
    expect(declarations.length).toBeGreaterThan(0);
    for (const { path: p, fm } of declarations) {
      expect(Array.isArray(fm.metadata.paths)).toBe(true);
      for (const entry of fm.metadata.paths) {
        expect(typeof entry, `entry in ${p}`).toBe('string');
      }
    }
  });

  test('(b) >=8 agents declare metadata.paths (pilot threshold; v12.consolidation lowered from 10 — some pilots absorbed into survivor agents that carry the field)', () => {
    expect(declarations.length).toBeGreaterThanOrEqual(8);
  });

  test('(c) Every declared path entry is a non-empty string', () => {
    for (const { path: p, fm } of declarations) {
      for (const entry of fm.metadata.paths) {
        expect(entry.length, `entry in ${p}`).toBeGreaterThan(0);
        expect(entry.trim(), `entry in ${p}`).toBe(entry);
      }
    }
  });

  test('(d) Back-compat: agents without metadata.paths parse without error', () => {
    const skipped = skills
      .map((p) => ({ path: p, fm: parseFrontmatter(p) }))
      .filter((x) => x.fm && (!x.fm.metadata || !Array.isArray(x.fm.metadata.paths)));
    expect(skipped.length).toBeGreaterThan(0);
    for (const { fm } of skipped) {
      expect(fm).toBeTruthy();
      expect(fm.name).toBeTruthy();
      expect(fm.archetype).toBeTruthy();
    }
  });

  test('(e) Pilot agent path scopes use multiple distinct extensions (sanity)', () => {
    const tokens = new Set();
    for (const { fm } of declarations) {
      for (const entry of fm.metadata.paths) {
        const ext = entry.match(/\.([a-z0-9]+)\b/i);
        if (ext) tokens.add(ext[1].toLowerCase());
      }
    }
    expect(tokens.size).toBeGreaterThanOrEqual(5);
  });

  test('(f) Schema doc exists in skill-format.md', () => {
    const docPath = join(ROOT, '.claude', 'rules', 'core', 'skill-format.md');
    const docContent = readFileSync(docPath, 'utf8');
    expect(docContent).toContain('paths (V11.1.12');
    expect(docContent).toContain('metadata.paths');
  });
});
