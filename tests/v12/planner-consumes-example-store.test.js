/**
 * H1 (v12.x): planner consumes the curated example store — wiring regression test
 *
 * The few-shot example store (docs/example-store/ — ex-*.md + _index.yaml)
 * shipped INERT: nothing referenced it. H1 wires the planner to consume it as
 * advisory few-shot context during decomposition + delegation-prompt assembly.
 *
 * Bug-driven test mandate (CLAUDE.md): this test gates the wiring against silent
 * regression. It fails if a future edit strips the example-store reference from
 * the planner SKILL.md, deletes the resource doc, or breaks the @path link
 * between them.
 *
 * Asserts:
 *   1. agents/core/planner/SKILL.md references the example store (its catalog
 *      `docs/example-store/_index.yaml` or the `docs/example-store` dir).
 *   2. The resource doc agents/core/planner/resources/example-store-selection.md
 *      exists.
 *   3. The SKILL.md @path-references that resource doc.
 *   4. The resource doc itself references the example store / its catalog.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PLANNER_SKILL = path.join(REPO_ROOT, 'agents', 'core', 'planner', 'SKILL.md');
const RESOURCE_DOC = path.join(
  REPO_ROOT,
  'agents',
  'core',
  'planner',
  'resources',
  'example-store-selection.md'
);
const INDEX_YAML = path.join(REPO_ROOT, 'docs', 'example-store', '_index.yaml');

describe('H1 (v12.x): planner consumes the example store', () => {
  it('planner SKILL.md references the example store (_index.yaml or docs/example-store)', () => {
    expect(fs.existsSync(PLANNER_SKILL), 'planner SKILL.md is missing').toBe(true);
    const body = fs.readFileSync(PLANNER_SKILL, 'utf8');
    const referencesStore =
      body.includes('docs/example-store/_index.yaml') ||
      body.includes('docs/example-store');
    expect(
      referencesStore,
      'planner SKILL.md does not reference the example store catalog (docs/example-store/_index.yaml or docs/example-store)'
    ).toBe(true);
  });

  it('the resource doc example-store-selection.md exists', () => {
    expect(
      fs.existsSync(RESOURCE_DOC),
      'agents/core/planner/resources/example-store-selection.md does not exist'
    ).toBe(true);
  });

  it('planner SKILL.md @path-references the resource doc', () => {
    const body = fs.readFileSync(PLANNER_SKILL, 'utf8');
    expect(
      body.includes('@agents/core/planner/resources/example-store-selection.md'),
      'planner SKILL.md does not @path-reference resources/example-store-selection.md'
    ).toBe(true);
  });

  it('the resource doc references the example store / its catalog', () => {
    const doc = fs.readFileSync(RESOURCE_DOC, 'utf8');
    const referencesStore =
      doc.includes('docs/example-store/_index.yaml') ||
      doc.includes('docs/example-store/') ||
      doc.includes('docs/example-store');
    expect(
      referencesStore,
      'example-store-selection.md does not reference the example store (docs/example-store or _index.yaml)'
    ).toBe(true);
  });

  it('sanity: the example store catalog the wiring points at actually exists', () => {
    expect(
      fs.existsSync(INDEX_YAML),
      'docs/example-store/_index.yaml (the catalog the planner consumes) is missing'
    ).toBe(true);
  });
});
