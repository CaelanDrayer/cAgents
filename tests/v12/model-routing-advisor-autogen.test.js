/**
 * LP-16 (v12.x): model-routing-advisor.cjs KNOWN_AGENTS auto-generation
 *
 * v12.68.0: the catalog moved from plugin.json's `agents` array to the flat
 * agents/ directory (Claude Code discovers plugin agents with a non-recursive
 * scan of agents/, so agents/<name>.md IS the registration). This test now
 * pins the helper to that directory listing.
 *
 * Asserts:
 *   (a) the hook module exports a `loadKnownAgents()` helper
 *   (b) the helper reads the flat agents/ directory and returns a map whose
 *       key-set equals the agent names on disk (modulo `_deprecated/`)
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
const AGENTS_DIR = path.join(REPO_ROOT, 'agents');

const require = createRequire(import.meta.url);

function diskAgentNames() {
  const names = new Set();
  for (const entry of fs.readdirSync(AGENTS_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    names.add(entry.name.slice(0, -'.md'.length));
  }
  return names;
}

describe('LP-16: model-routing-advisor KNOWN_AGENTS auto-generated from agents/', () => {
  it('hook file exists', () => {
    expect(fs.existsSync(HOOK_PATH)).toBe(true);
  });

  it('exports loadKnownAgents() helper', () => {
    // Bust require cache so each test run starts fresh
    delete require.cache[require.resolve(HOOK_PATH)];
    const mod = require(HOOK_PATH);
    expect(typeof mod.loadKnownAgents).toBe('function');
  });

  it('loadKnownAgents() key-set equals the flat agents/ directory listing', () => {
    delete require.cache[require.resolve(HOOK_PATH)];
    const { loadKnownAgents } = require(HOOK_PATH);
    const known = loadKnownAgents();
    expect(known).toBeTypeOf('object');

    const knownNames = new Set(Object.keys(known));
    const diskNames = diskAgentNames();

    // Diagnostics on mismatch
    const missingFromKnown = [...diskNames].filter(n => !knownNames.has(n));
    const extraInKnown = [...knownNames].filter(n => !diskNames.has(n));

    expect(missingFromKnown, `Agents on disk but not in loadKnownAgents(): ${missingFromKnown.join(', ')}`).toEqual([]);
    expect(extraInKnown, `Agents in loadKnownAgents() but not on disk: ${extraInKnown.join(', ')}`).toEqual([]);
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
