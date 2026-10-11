/**
 * Regression test for F6 (v12.74.0): unknown top-level marketplace.json keys.
 *
 * Bug: .claude-plugin/marketplace.json carried top-level `categories` and
 *      `compatibility`. Neither key is in the Top-level fields table
 *      (https://code.claude.com/docs/en/plugins/marketplace-reference#top-level-fields:
 *      "The table lists every key Claude Code reads from `marketplace.json`").
 *      `claude plugin validate .` warned "Unknown field 'categories'" and
 *      "Unknown field 'compatibility'". Claude Code ignored both, so the
 *      "Claude Code >= 2.1.69" statement was never enforced.
 *
 * Fix: both keys are removed. The plugin entry keeps `category` and `tags`,
 *      which the plugin-entry schema documents.
 *
 * This test fails on the pre-fix tree.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..', '..');
const MARKETPLACE_JSON = path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json');

// Documented top-level fields (marketplace-reference, Top-level fields table).
const DOCUMENTED_TOP_LEVEL_KEYS = new Set([
  '$schema',
  'name',
  'owner',
  'plugins',
  'description',
  'version',
  'metadata',
  'forceRemoveDeletedPlugins',
  'allowCrossMarketplaceDependenciesOn',
  'renames',
]);

const DOCUMENTED_METADATA_KEYS = new Set(['description', 'version', 'pluginRoot']);

describe('marketplace.json top-level keys (F6)', () => {
  const manifest = JSON.parse(fs.readFileSync(MARKETPLACE_JSON, 'utf8'));

  it('has only documented top-level keys', () => {
    const unknown = Object.keys(manifest).filter((k) => !DOCUMENTED_TOP_LEVEL_KEYS.has(k));
    expect(unknown).toEqual([]);
  });

  it('has no top-level categories or compatibility key', () => {
    expect(manifest).not.toHaveProperty('categories');
    expect(manifest).not.toHaveProperty('compatibility');
  });

  it('has only documented metadata keys', () => {
    const unknown = Object.keys(manifest.metadata || {}).filter(
      (k) => !DOCUMENTED_METADATA_KEYS.has(k),
    );
    expect(unknown).toEqual([]);
  });

  it('has the required name, owner.name and plugins fields', () => {
    expect(typeof manifest.name).toBe('string');
    expect(typeof manifest.owner?.name).toBe('string');
    expect(Array.isArray(manifest.plugins)).toBe(true);
  });
});
