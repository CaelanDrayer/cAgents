/**
 * Regression test: Phase 3 — paper-search agent absorption (v11.1.x)
 *
 * Asserts that analyst/academic-paper-searcher/SKILL.md exists with valid
 * v11.1.0 frontmatter (archetype: analyst, no top-level branch field, required
 * metadata fields populated).
 *
 * Failing-before/passing-after assertion: this test MUST fail when the SKILL.md
 * is missing or malformed, and pass once Phase 3 absorption is implemented.
 *
 * References:
 *   - example/external-skills/IMPLEMENT_AND_VALIDATE_PROMPT.md § Phase 3
 *   - .claude/rules/core/skill-format.md (v11.1.0 archetype/branch schema)
 *   - CLAUDE.md "Bug-Driven Testing" mandate
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SKILL_PATH = path.join(
  REPO_ROOT,
  'analyst',
  'academic-paper-searcher',
  'SKILL.md',
);

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  return yaml.load(match[1]);
}

describe('Phase 3 regression: paper-search → academic-paper-searcher absorbed', () => {
  it('SKILL.md file exists at the expected archetype path', () => {
    expect(fs.existsSync(SKILL_PATH)).toBe(true);
  });

  it('frontmatter parses as YAML', () => {
    const text = fs.readFileSync(SKILL_PATH, 'utf8');
    const fm = parseFrontmatter(text);
    expect(fm).not.toBeNull();
    expect(typeof fm).toBe('object');
  });

  describe('frontmatter required fields (v11.1.0 schema)', () => {
    const text = fs.existsSync(SKILL_PATH)
      ? fs.readFileSync(SKILL_PATH, 'utf8')
      : '';
    const fm = text ? parseFrontmatter(text) : null;

    it('name is "academic-paper-searcher"', () => {
      expect(fm?.name).toBe('academic-paper-searcher');
    });

    it('archetype is "analyst"', () => {
      expect(fm?.archetype).toBe('analyst');
    });

    it('does NOT declare a top-level branch field (analyst is 2-level)', () => {
      expect(fm).not.toHaveProperty('branch');
    });

    it('description is a non-empty string', () => {
      expect(typeof fm?.description).toBe('string');
      expect(fm.description.length).toBeGreaterThan(20);
    });

    it('metadata.tier is present (execution)', () => {
      expect(fm?.metadata?.tier).toBe('execution');
    });

    it('metadata.model is set', () => {
      expect(typeof fm?.metadata?.model).toBe('string');
      expect(fm.metadata.model.length).toBeGreaterThan(0);
    });

    it('allowed-tools is declared', () => {
      // YAML loader exposes hyphenated keys verbatim
      const tools = fm?.['allowed-tools'];
      expect(typeof tools).toBe('string');
      expect(tools.length).toBeGreaterThan(0);
    });
  });

  it('SKILL.md body retains paper-search semantics (OpenAlex reference)', () => {
    const text = fs.readFileSync(SKILL_PATH, 'utf8');
    expect(text.toLowerCase()).toContain('openalex');
  });
});
