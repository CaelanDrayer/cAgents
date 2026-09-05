/**
 * WI-13 regression test: plugin manifest descriptions must reflect the ACTUAL
 * current catalog size, not a stale hardcoded count.
 *
 * The required agent count is DERIVED from plugin.json's `agents` array (the
 * single source of truth) so this test never goes stale on a future catalog
 * change. Historical hardcoded expectations (243 -> 144 -> 141) caused this
 * test to actively GUARD the wrong number and block the P2 (audit-260630)
 * sweep that corrected the descriptions from "141 agents" to the real 57.
 *
 * Surfaces audited:
 *   1. .claude-plugin/plugin.json — top-level "description" field
 *   2. .claude-plugin/marketplace.json — metadata.description (top-level)
 *   3. .claude-plugin/marketplace.json — plugins[0].description
 *
 * Rules enforced:
 *   - No stale current-state catalog claim (243 / 144 / 141 agents, 15 domains)
 *   - Description must mention the DERIVED agent count (`<N> agents` or
 *     `<N> specialized agents`, where N = plugin.json agents.length) AND the
 *     actual organization (9 archetypes / 9 builder-role archetypes)
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

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// DERIVED from disk — the single source of truth for the catalog size.
// v12.68.0: that source is the flat agents/ directory (Claude Code discovers
// plugin agents by scanning it), not a plugin.json `agents` array.
const ACTIVE_AGENTS = fs
  .readdirSync(path.join(REPO_ROOT, 'agents'), { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.md')).length;

const STALE_CURRENT_STATE_CLAIMS = [
  '243 agents',
  '243 specialized agents',
  '144 agents',
  '141 agents',
  '141 specialized agents',
  '15 business domains',
  '15 domains',
].filter((c) => !c.startsWith(`${ACTIVE_AGENTS} `)); // never flag the live count

// The manifest descriptions must reflect the current (derived) count.
const REQUIRED_CURRENT_STATE_TOKENS = {
  count: [`${ACTIVE_AGENTS} agents`, `${ACTIVE_AGENTS} specialized agents`],
  organization: ['9 archetypes', '9 builder-role archetypes'],
};

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

  it('plugin.json description mentions current state (derived agent count + 9 archetypes)', () => {
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

/**
 * Regression guard (plugin-validation issue, 2026-09-04): Claude Code's plugin
 * validator caps a plugin `description` at 500 characters and reports
 * "Plugin description must be at most 500 characters" when it is longer.
 * plugin.json (566) and marketplace.json plugins[0] (514) both tripped it.
 *
 * Failing-before / passing-after: this block fails on the pre-fix manifests.
 */
const MAX_PLUGIN_DESCRIPTION_CHARS = 500;

describe('plugin manifest description length cap', () => {
  it.each([
    ['.claude-plugin/plugin.json description', () => loadJSON(PLUGIN_JSON).description],
    [
      '.claude-plugin/marketplace.json metadata.description',
      () => loadJSON(MARKETPLACE_JSON).metadata.description,
    ],
    [
      '.claude-plugin/marketplace.json plugins[0].description',
      () => loadJSON(MARKETPLACE_JSON).plugins[0].description,
    ],
  ])('%s is at most 500 characters', (source, read) => {
    const description = read();
    expect(
      description.length,
      `${source} is ${description.length} chars; Claude Code rejects anything over ${MAX_PLUGIN_DESCRIPTION_CHARS}`
    ).toBeLessThanOrEqual(MAX_PLUGIN_DESCRIPTION_CHARS);
  });
});
