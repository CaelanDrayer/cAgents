/**
 * H3 (v12.x): example-store index bijection regression test
 *
 * Asserts the curated few-shot example store's machine-readable catalog
 * (docs/example-store/_index.yaml) stays in one-to-one correspondence
 * with the ex-*.md files on disk:
 *   - _index.yaml parses as valid YAML with an `examples:` list.
 *   - Every catalog entry's `path` (and `id`) resolves to an existing
 *     ex-*.md file, and `id` == `path` minus `.md`.
 *   - Every ex-*.md file on disk appears in _index.yaml (no orphans).
 *
 * Bug-driven test mandate (CLAUDE.md): the planner reads _index.yaml to
 * few-shot-select examples, so a catalog that points at a missing file, or
 * a shipped example the catalog forgot, is a real routing defect. This test
 * fails in both directions.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const EXAMPLES_DIR = path.join(REPO_ROOT, 'docs', 'example-store');
const INDEX_PATH = path.join(EXAMPLES_DIR, '_index.yaml');

function listExampleBasenames(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((entry) => entry.startsWith('ex-') && entry.endsWith('.md'));
}

describe('H3 (v12.x): example-store index bijection', () => {
  it('_index.yaml exists and parses with an examples list', () => {
    expect(fs.existsSync(INDEX_PATH)).toBe(true);
    let idx;
    expect(() => { idx = yaml.load(fs.readFileSync(INDEX_PATH, 'utf8')); }, '_index.yaml is not valid YAML').not.toThrow();
    expect(idx && typeof idx === 'object', '_index.yaml is not a YAML mapping').toBe(true);
    expect(Array.isArray(idx.examples), '_index.yaml missing an `examples:` list').toBe(true);
    expect(idx.examples.length, '_index.yaml `examples:` list is empty').toBeGreaterThan(0);
  });

  // (d, forward) Every catalog entry resolves to an existing ex-*.md file.
  it('every _index.yaml entry path/id resolves to an existing ex-*.md file', () => {
    const idx = yaml.load(fs.readFileSync(INDEX_PATH, 'utf8'));
    const problems = [];
    for (const entry of idx.examples) {
      const relPath = entry && entry.path;
      const id = entry && entry.id;
      if (!relPath) {
        problems.push(`entry id='${id}' has no 'path'`);
        continue;
      }
      const full = path.join(EXAMPLES_DIR, relPath);
      if (!fs.existsSync(full)) {
        problems.push(`entry id='${id}' path='${relPath}' does not exist on disk`);
      }
      if (id && relPath && `${id}.md` !== relPath) {
        problems.push(`entry id='${id}' does not match path='${relPath}' (expected '${id}.md')`);
      }
    }
    expect(problems, `Broken _index.yaml entries:\n  ${problems.join('\n  ')}`).toEqual([]);
  });

  // (d, reverse) Every ex-*.md file on disk appears in _index.yaml.
  it('every ex-*.md file on disk appears in _index.yaml (no orphans)', () => {
    const idx = yaml.load(fs.readFileSync(INDEX_PATH, 'utf8'));
    const catalogued = new Set(idx.examples.map((e) => e && e.path).filter(Boolean));
    const onDisk = listExampleBasenames(EXAMPLES_DIR);
    const orphans = onDisk.filter((f) => !catalogued.has(f));
    expect(orphans, `ex-*.md files missing from _index.yaml:\n  ${orphans.join('\n  ')}`).toEqual([]);
  });

  // (d, count) Bijection: exactly the same set both directions, no dupes.
  it('_index.yaml and disk hold the same set of examples (bijective)', () => {
    const idx = yaml.load(fs.readFileSync(INDEX_PATH, 'utf8'));
    const catalogPaths = idx.examples.map((e) => e && e.path).filter(Boolean);
    const catalogSet = new Set(catalogPaths);
    const onDisk = listExampleBasenames(EXAMPLES_DIR).sort();

    // No duplicate catalog entries.
    expect(catalogPaths.length, '_index.yaml has duplicate example paths').toBe(catalogSet.size);
    // Same cardinality and same members.
    expect([...catalogSet].sort()).toEqual(onDisk);
  });
});
