/**
 * H3 (v12.x): example-store frontmatter spec-compliance regression test
 *
 * Asserts every .claude/rules/examples/ex-*.md file has Agent Skills-spec-
 * compliant frontmatter: only the 6 spec-allowed top-level fields (`name`,
 * `description`, `license`, `compatibility`, `metadata`, `allowed-tools`),
 * a `name:` that matches its filename, and a frontmatter block that parses
 * as valid YAML. Claude Code extensions live inside `metadata`.
 *
 * Bug-driven test mandate (CLAUDE.md): this guards the curated few-shot
 * example store against future additions that smuggle non-spec fields to the
 * top level (e.g., `id:` or `category:` at indent 0 instead of under
 * `metadata:`), rename a file without updating `name:`, or ship malformed
 * YAML frontmatter. Mirrors tests/v12/playbook-frontmatter-valid.test.js.
 *
 * README.md and _index.yaml are NOT ex-*.md files and are exempt here
 * (_index.yaml is validated by tests/v12/example-index-resolves.test.js).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const EXAMPLES_DIR = path.join(REPO_ROOT, '.claude', 'rules', 'examples');

const ALLOWED_TOP_LEVEL = new Set([
  'name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'
]);

function listExampleFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((entry) => entry.startsWith('ex-') && entry.endsWith('.md'))
    .map((entry) => path.join(dir, entry));
}

function extractFrontmatterBlock(content) {
  // Returns the YAML text between the opening and closing `---` delimiters,
  // or null if the file has no frontmatter block.
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 3);
  if (end < 0) return null;
  return content.slice(3, end);
}

describe('H3 (v12.x): example-store frontmatter spec-compliance', () => {
  it('examples directory exists and holds ex-*.md files', () => {
    expect(fs.existsSync(EXAMPLES_DIR)).toBe(true);
    expect(listExampleFiles(EXAMPLES_DIR).length).toBeGreaterThan(0);
  });

  it('every ex-*.md file has a delimited frontmatter block', () => {
    const files = listExampleFiles(EXAMPLES_DIR);
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf8');
      const rel = path.relative(REPO_ROOT, f);
      expect(content.startsWith('---'), `${rel} missing opening --- frontmatter delimiter`).toBe(true);
      const end = content.indexOf('\n---', 3);
      expect(end, `${rel} missing closing --- delimiter`).toBeGreaterThan(0);
    }
  });

  // (c) Every ex-*.md frontmatter parses as valid YAML.
  it('every ex-*.md frontmatter parses as valid YAML (object)', () => {
    const files = listExampleFiles(EXAMPLES_DIR);
    for (const f of files) {
      const rel = path.relative(REPO_ROOT, f);
      const block = extractFrontmatterBlock(fs.readFileSync(f, 'utf8'));
      expect(block, `${rel} has no parseable frontmatter block`).not.toBeNull();
      let parsed;
      expect(() => { parsed = yaml.load(block); }, `${rel} frontmatter is not valid YAML`).not.toThrow();
      expect(parsed && typeof parsed === 'object' && !Array.isArray(parsed), `${rel} frontmatter is not a YAML mapping`).toBe(true);
    }
  });

  // (a) Only the 6 spec-allowed top-level frontmatter keys.
  it('every ex-*.md frontmatter has only spec-allowed top-level fields', () => {
    const files = listExampleFiles(EXAMPLES_DIR);
    const offenders = [];
    for (const f of files) {
      const block = extractFrontmatterBlock(fs.readFileSync(f, 'utf8'));
      if (block === null) continue;
      const parsed = yaml.load(block);
      for (const k of Object.keys(parsed || {})) {
        if (!ALLOWED_TOP_LEVEL.has(k)) {
          offenders.push({ file: path.relative(REPO_ROOT, f), key: k });
        }
      }
    }
    expect(offenders, `Non-spec top-level fields found:\n${offenders.map((o) => `  ${o.file}: '${o.key}'`).join('\n')}`).toEqual([]);
  });

  it('every ex-*.md has required name + description fields', () => {
    const files = listExampleFiles(EXAMPLES_DIR);
    for (const f of files) {
      const rel = path.relative(REPO_ROOT, f);
      const block = extractFrontmatterBlock(fs.readFileSync(f, 'utf8'));
      const parsed = yaml.load(block) || {};
      expect(parsed.name, `${rel} missing 'name'`).toBeTruthy();
      expect(parsed.description, `${rel} missing 'description'`).toBeTruthy();
    }
  });

  // (b) `name:` equals the filename minus `.md`.
  it("every ex-*.md name field equals its filename minus '.md'", () => {
    const files = listExampleFiles(EXAMPLES_DIR);
    const mismatches = [];
    for (const f of files) {
      const expected = path.basename(f, '.md');
      const block = extractFrontmatterBlock(fs.readFileSync(f, 'utf8'));
      const parsed = yaml.load(block) || {};
      if (parsed.name !== expected) {
        mismatches.push({ file: path.relative(REPO_ROOT, f), name: parsed.name, expected });
      }
    }
    expect(mismatches, `name != filename:\n${mismatches.map((m) => `  ${m.file}: name='${m.name}' expected='${m.expected}'`).join('\n')}`).toEqual([]);
  });
});
