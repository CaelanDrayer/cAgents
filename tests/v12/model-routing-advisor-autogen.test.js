/**
 * LP-16 (v12.x): model-routing-advisor.cjs KNOWN_AGENTS auto-generation
 *
 * Asserts:
 *   (a) the hook module exports a `loadKnownAgents()` helper
 *   (b) the helper reads `.claude-plugin/plugin.json` and returns a map
 *       whose key-set equals the agent names in plugin.json's agents array
 *       (modulo `_deprecated/` entries, which are excluded by sync-agents.sh
 *       and therefore never appear in plugin.json in the first place)
 *   (c) the helper is memoized per-process — subsequent calls return the
 *       same object reference
 *   (d) each value is one of the recognized tier strings
 *
 * This replaces the hand-maintained 230-line KNOWN_AGENTS literal that
 * drifted from the catalog (v12.4.0 cull moved 96 agents to _deprecated/,
 * but the literal still listed 243 entries from pre-cull eras).
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const HOOK_PATH = path.join(REPO_ROOT, '.claude', 'hooks', 'model-routing-advisor.cjs');
const PLUGIN_JSON = path.join(REPO_ROOT, '.claude-plugin', 'plugin.json');

const require = createRequire(import.meta.url);

function pluginAgentNames() {
  const plugin = JSON.parse(fs.readFileSync(PLUGIN_JSON, 'utf8'));
  const names = new Set();
  for (const p of plugin.agents || []) {
    // Skip any _deprecated path entries (sync-agents.sh excludes them, but
    // defensive — the contract is "modulo _deprecated/")
    if (/\/_deprecated\//.test(p)) continue;
    // Path shape: "./<archetype>/[<branch>/]<agent-name>/SKILL.md"
    const m = p.match(/\/([^/]+)\/SKILL\.md$/);
    if (m) names.add(m[1]);
  }
  return names;
}

describe('LP-16: model-routing-advisor KNOWN_AGENTS auto-generated from plugin.json', () => {
  it('hook file exists', () => {
    expect(fs.existsSync(HOOK_PATH)).toBe(true);
  });

  it('exports loadKnownAgents() helper', () => {
    // Bust require cache so each test run starts fresh
    delete require.cache[require.resolve(HOOK_PATH)];
    const mod = require(HOOK_PATH);
    expect(typeof mod.loadKnownAgents).toBe('function');
  });

  it('loadKnownAgents() key-set equals plugin.json agent names (modulo _deprecated/)', () => {
    delete require.cache[require.resolve(HOOK_PATH)];
    const { loadKnownAgents } = require(HOOK_PATH);
    const known = loadKnownAgents();
    expect(known).toBeTypeOf('object');

    const knownNames = new Set(Object.keys(known));
    const pluginNames = pluginAgentNames();

    // Diagnostics on mismatch
    const missingFromKnown = [...pluginNames].filter(n => !knownNames.has(n));
    const extraInKnown = [...knownNames].filter(n => !pluginNames.has(n));

    expect(missingFromKnown, `Agents in plugin.json but not in loadKnownAgents(): ${missingFromKnown.join(', ')}`).toEqual([]);
    expect(extraInKnown, `Agents in loadKnownAgents() but not in plugin.json: ${extraInKnown.join(', ')}`).toEqual([]);
  });

  it('loadKnownAgents() is memoized per-process (same reference across calls)', () => {
    delete require.cache[require.resolve(HOOK_PATH)];
    const { loadKnownAgents } = require(HOOK_PATH);
    const a = loadKnownAgents();
    const b = loadKnownAgents();
    expect(a).toBe(b);
  });

  it('every tier value is a recognized tier string', () => {
    delete require.cache[require.resolve(HOOK_PATH)];
    const { loadKnownAgents } = require(HOOK_PATH);
    const known = loadKnownAgents();
    const allowed = new Set(['controller', 'execution', 'support', 'infrastructure', 'executive']);
    for (const [name, tier] of Object.entries(known)) {
      expect(allowed.has(tier), `agent ${name} has invalid tier '${tier}'`).toBe(true);
    }
  });
});
