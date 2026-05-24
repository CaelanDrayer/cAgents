/**
 * WI-13 regression test: plugin manifest descriptions must reflect actual
 * v12.6.0 state (144 agents across 9 archetypes), not stale pre-v12.4.0
 * counts (243 agents / 15 business domains).
 *
 * Surfaces audited:
 *   1. .claude-plugin/plugin.json — top-level "description" field
 *   2. .claude-plugin/marketplace.json — metadata.description (top-level)
 *   3. .claude-plugin/marketplace.json — plugins[0].description
 *
 * Rules enforced:
 *   - No current-state claim of "243 agents" (was the pre-v12.4.0 catalog count)
 *   - No current-state claim of "243 specialized agents"
 *   - No current-state claim of "15 business domains" (v12 W4.2 deleted 11
 *     of 13 legacy domain dirs; the canonical structure is 9 archetypes)
 *   - No current-state claim of "15 domains"
 *   - Description must mention the actual agent count (144) AND the actual
 *     organization (9 archetypes / 9 builder-role archetypes)
 *
 * Note on historical claims: README.md "Version History" entries that
 * reference past counts (e.g., "V10.18.0 — Vibe field on all 243 agents")
 * are historical/version-log claims, not current-state. They are NOT covered
 * by this test (which scopes only plugin.json + marketplace.json).
 *
 * Original drift was reported in:
 *   cagents-memory/sessions/team_doc-review-full_260522_001/outputs/wi-1/findings.yaml
 *   findings F1.1, F1.2, F1.3 (all HIGH).
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PLUGIN_JSON = path.join(REPO_ROOT, '.claude-plugin', 'plugin.json');
const MARKETPLACE_JSON = path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json');

const STALE_CURRENT_STATE_CLAIMS = [
  '243 agents',
  '243 specialized agents',
  '15 business domains',
  '15 domains',
];

// v12.7.0 LP-12/LP-13 consolidation settled the catalog at 141 active agents
// (was 144 at v12.6.0). The manifest descriptions must reflect the current count.
const REQUIRED_CURRENT_STATE_TOKENS = {
  count: ['141 agents', '141 specialized agents'],
  organization: ['9 archetypes', '9 builder-role archetypes'],
};

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function assertNoStaleClaims(description, source) {
  for (const stale of STALE_CURRENT_STATE_CLAIMS) {
    expect(
      description,
      `${source} description must not contain stale current-state claim "${stale}"`
    ).not.toContain(stale);
  }
}

function assertCurrentStateTokens(description, source) {
  const hasCount = REQUIRED_CURRENT_STATE_TOKENS.count.some(t => description.includes(t));
  const hasOrg = REQUIRED_CURRENT_STATE_TOKENS.organization.some(t => description.includes(t));
  expect(
    hasCount,
    `${source} description must mention current agent count (one of: ${REQUIRED_CURRENT_STATE_TOKENS.count.join(', ')})`
  ).toBe(true);
  expect(
    hasOrg,
    `${source} description must mention current organization (one of: ${REQUIRED_CURRENT_STATE_TOKENS.organization.join(', ')})`
  ).toBe(true);
}

describe('WI-13: plugin manifest description accuracy', () => {
  it('plugin.json description does not contain stale "243 agents" / "15 domains" claims', () => {
    const manifest = loadJSON(PLUGIN_JSON);
    assertNoStaleClaims(manifest.description, '.claude-plugin/plugin.json');
  });

  it('plugin.json description mentions current state (144 agents + 9 archetypes)', () => {
    const manifest = loadJSON(PLUGIN_JSON);
    assertCurrentStateTokens(manifest.description, '.claude-plugin/plugin.json');
  });

  it('marketplace.json metadata.description does not contain stale claims', () => {
    const mp = loadJSON(MARKETPLACE_JSON);
    assertNoStaleClaims(
      mp.metadata.description,
      '.claude-plugin/marketplace.json metadata.description'
    );
  });

  it('marketplace.json metadata.description mentions current state', () => {
    const mp = loadJSON(MARKETPLACE_JSON);
    assertCurrentStateTokens(
      mp.metadata.description,
      '.claude-plugin/marketplace.json metadata.description'
    );
  });

  it('marketplace.json plugins[0].description does not contain stale claims', () => {
    const mp = loadJSON(MARKETPLACE_JSON);
    assertNoStaleClaims(
      mp.plugins[0].description,
      '.claude-plugin/marketplace.json plugins[0].description'
    );
  });

  it('marketplace.json plugins[0].description mentions current state', () => {
    const mp = loadJSON(MARKETPLACE_JSON);
    assertCurrentStateTokens(
      mp.plugins[0].description,
      '.claude-plugin/marketplace.json plugins[0].description'
    );
  });
});
