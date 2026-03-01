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

  it('should have agents array with 200+ entries', () => {
    const plugin = loadPluginJson(PLUGIN_PATH);
    expect(Array.isArray(plugin.agents)).toBe(true);
    expect(plugin.agents.length).toBeGreaterThanOrEqual(200);
  });

  it('all agent paths should point to existing SKILL.md files', () => {
    const plugin = loadPluginJson(PLUGIN_PATH);
    const missing = plugin.agents.filter(
      agentPath => {
        const resolved = agentPath.startsWith('./')
          ? join(PROJECT_ROOT, agentPath.slice(2))
          : join(PROJECT_ROOT, agentPath);
        return !existsSync(resolved);
      }
    );
    expect(missing).toEqual([]);
  });

  it('should include agents from all 8 domains', () => {
    const plugin = loadPluginJson(PLUGIN_PATH);
    const agents = plugin.agents;
    const domains = ['engineering', 'creative', 'business', 'people', 'service', 'core', 'leadership', 'shared'];
    for (const domain of domains) {
      const domainAgents = agents.filter(a => a.startsWith(`./${domain}/`));
      expect(domainAgents.length).toBeGreaterThan(0);
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

describe('domain plugin.json files', () => {
  const DOMAIN_PLUGINS = [
    { domain: 'engineering', minAgents: 30 },
    { domain: 'creative', minAgents: 20 },
    { domain: 'business', minAgents: 30 },
    { domain: 'people', minAgents: 15 },
    { domain: 'service', minAgents: 25 },
    { domain: 'core', minAgents: 10 },
    { domain: 'leadership', minAgents: 8 },
    { domain: 'shared', minAgents: 3 },
    { domain: 'growth', minAgents: 30 },
  ];

  for (const { domain, minAgents } of DOMAIN_PLUGINS) {
    describe(`${domain}/.claude-plugin/plugin.json`, () => {
      const pluginPath = `${domain}/.claude-plugin/plugin.json`;

      it('should exist', () => {
        expect(existsSync(join(PROJECT_ROOT, pluginPath))).toBe(true);
      });

      it('should be valid JSON', () => {
        expect(() => loadPluginJson(pluginPath)).not.toThrow();
      });

      it('should have a name field', () => {
        const plugin = loadPluginJson(pluginPath);
        expect(plugin.name).toBeTruthy();
        expect(plugin.name).toContain('cagents');
      });

      it('should have a version field matching root', () => {
        const plugin = loadPluginJson(pluginPath);
        const root = loadPluginJson('.claude-plugin/plugin.json');
        expect(plugin.version).toBe(root.version);
      });

      it(`should have agents array with at least ${minAgents} entries`, () => {
        const plugin = loadPluginJson(pluginPath);
        expect(Array.isArray(plugin.agents)).toBe(true);
        expect(plugin.agents.length).toBeGreaterThanOrEqual(minAgents);
      });

      it('all agent paths should exist on disk', () => {
        const plugin = loadPluginJson(pluginPath);
        if (plugin.agents.length === 0) return; // growth has empty agents (consolidated)
        const missing = plugin.agents.filter(agentPath => {
          // Domain plugin.json may use relative paths (./agents/...) or absolute from root
          const resolvedPath = agentPath.startsWith('./')
            ? join(PROJECT_ROOT, domain, agentPath.slice(2))
            : join(PROJECT_ROOT, agentPath);
          return !existsSync(resolvedPath);
        });
        expect(missing).toEqual([]);
      });
    });
  }

  describe('growth domain', () => {
    it('growth plugin.json should have marketing/sales agents', () => {
      const plugin = loadPluginJson('growth/.claude-plugin/plugin.json');
      expect(plugin.agents.length).toBeGreaterThanOrEqual(30);
    });
  });
});
