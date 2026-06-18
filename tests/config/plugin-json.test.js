import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();

function loadPluginJson(relativePath) {
  const filePath = join(PROJECT_ROOT, relativePath);
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

describe('root plugin.json', () => {
  const PLUGIN_PATH = '.claude-plugin/plugin.json';

  it('should exist', () => {
    expect(existsSync(join(PROJECT_ROOT, PLUGIN_PATH))).toBe(true);
  });

  it('should be valid JSON', () => {
    expect(() => loadPluginJson(PLUGIN_PATH)).not.toThrow();
  });

  it('should have name "cagents"', () => {
    const plugin = loadPluginJson(PLUGIN_PATH);
    expect(plugin.name).toBe('cagents');
  });

  it('should have version field', () => {
    const plugin = loadPluginJson(PLUGIN_PATH);
    expect(plugin.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should reference skills directory', () => {
    const plugin = loadPluginJson(PLUGIN_PATH);
    expect(plugin.skills).toBe('./.claude/skills/');
  });

  it('should reference hooks settings', () => {
    const plugin = loadPluginJson(PLUGIN_PATH);
    expect(plugin.hooks).toBe('./.claude/settings.json');
  });

  it('should have agents array in v12.consolidation band [40, 70]', () => {
    // v12.consolidation pass reduced the active catalog from 141 -> 57
    // (41 routable + 16 core). The post-consolidation floor/ceiling is [40, 70].
    const plugin = loadPluginJson(PLUGIN_PATH);
    expect(Array.isArray(plugin.agents)).toBe(true);
    expect(plugin.agents.length).toBeGreaterThanOrEqual(40);
    expect(plugin.agents.length).toBeLessThanOrEqual(70);
  });

  it('all agent paths should point to existing SKILL.md files', () => {
    const plugin = loadPluginJson(PLUGIN_PATH);
    const missing = plugin.agents.filter(
      agentPath => {
        // Paths use ./ prefix — plugin root is the project root
        const stripped = agentPath.startsWith('./') ? agentPath.slice(2) : agentPath;
        const resolved = join(PROJECT_ROOT, stripped);
        return !existsSync(resolved);
      }
    );
    expect(missing).toEqual([]);
  });

  it('description reflects v12.2.0 4-skill catalog (no standalone /improve, no /org)', () => {
    const plugin = loadPluginJson(PLUGIN_PATH);
    // v12.2.0: /org absorbed into /team strategic mode; 4 user skills now.
    // (v12.1.2 had previously folded /improve into /run, leaving 5 skills.)
    expect(plugin.description).toMatch(/4 user skills/);
    // The description should NOT advertise /improve as a standalone skill.
    expect(plugin.description).not.toMatch(/\/improve audits/i);
    // The description should NOT advertise /org as a live skill (it was absorbed into /team).
    expect(plugin.description).not.toMatch(/\/org\s+(?:routes|orchestrates|coordinates)/i);
  });

  it('should include agents from all 9 archetype roots (v11.1.0 builder-role tree)', () => {
    const plugin = loadPluginJson(PLUGIN_PATH);
    const agents = plugin.agents;
    const archetypes = ['developer', 'operator', 'advisor', 'analyst', 'creator', 'writer', 'strategist', 'core', 'leadership'];
    for (const archetype of archetypes) {
      const archetypeAgents = agents.filter(a => a.startsWith(`./agents/${archetype}/`));
      expect(archetypeAgents.length, `archetype ${archetype} should have at least one agent`).toBeGreaterThan(0);
    }
  });
});

describe('marketplace.json', () => {
  const MARKETPLACE_PATH = '.claude-plugin/marketplace.json';

  it('should exist', () => {
    expect(existsSync(join(PROJECT_ROOT, MARKETPLACE_PATH))).toBe(true);
  });

  it('should be valid JSON', () => {
    expect(() => loadPluginJson(MARKETPLACE_PATH)).not.toThrow();
  });

  it('should have matching version with plugin.json', () => {
    const marketplace = loadPluginJson(MARKETPLACE_PATH);
    const plugin = loadPluginJson('.claude-plugin/plugin.json');
    // marketplace.json uses nested plugins[0].version structure
    const marketplaceVersion = marketplace.version || (marketplace.plugins && marketplace.plugins[0] && marketplace.plugins[0].version);
    expect(marketplaceVersion).toBe(plugin.version);
  });
});

// V11.0: Domain sub-plugin files ({domain}/.claude-plugin/plugin.json) were removed.
// All 243 agents are registered centrally in the root .claude-plugin/plugin.json.
// Coverage above (root plugin.json + agent file existence) replaces the deleted suite.
