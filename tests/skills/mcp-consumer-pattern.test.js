// Phase 9 (V11.1.12): MCP consumer pattern regression test
// Asserts:
//   (a) >=10 agents declare mcp__* in allowed-tools (pilot threshold)
//   (b) .claude-plugin/plugin.json has mcpServers block (object, non-empty)
//   (c) Every mcp__ pattern follows mcp__<server>__<tool> naming convention
//   (d) Back-compat: agents without mcp__* parse fine
//   (e) skill-format.md has "MCP Tool Integration" section
//   (f) CLAUDE.md has "MCP Integration" section
//
// Refs:
//   - .claude/rules/core/skill-format.md § "MCP Tool Integration (Consumer Pattern)"
//   - cagents-memory/sessions/team_continue-cagents-w6_260505_001/workflow/work_items.yaml TASK-9

import { describe, test, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const ARCHETYPES = ['developer', 'operator', 'advisor', 'analyst', 'creator', 'writer', 'strategist', 'core', 'leadership'];
const MCP_PATTERN_RE = /^mcp__[a-z][a-z0-9_-]*__[a-z0-9_*-]+$/i;
const MCP_TOKEN_RE = /\bmcp__[a-z][a-z0-9_-]*__[a-z0-9_*-]+/gi;

function findAllSkillMd() {
  const results = [];
  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'SKILL.md') results.push(full);
    }
  }
  for (const archetype of ARCHETYPES) walk(join(ROOT, archetype));
  return results;
}

function parseFrontmatter(filepath) {
  const content = readFileSync(filepath, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  try {
    return yaml.load(match[1]);
  } catch {
    return null;
  }
}

function extractMcpTokens(allowedTools) {
  if (!allowedTools || typeof allowedTools !== 'string') return [];
  return allowedTools.match(MCP_TOKEN_RE) || [];
}

describe('Phase 9: MCP consumer pattern (V11.1.12+)', () => {
  const skills = findAllSkillMd();
  const declarations = skills
    .map((p) => ({ path: p, fm: parseFrontmatter(p) }))
    .map((x) => ({
      ...x,
      mcpTokens: x.fm ? extractMcpTokens(x.fm['allowed-tools']) : [],
    }))
    .filter((x) => x.mcpTokens.length > 0);

  test('(a) >=10 agents declare mcp__* in allowed-tools (pilot threshold)', () => {
    expect(declarations.length).toBeGreaterThanOrEqual(10);
  });

  test('(b) .claude-plugin/plugin.json has mcpServers block (object, non-empty)', () => {
    const pluginJsonPath = join(ROOT, '.claude-plugin', 'plugin.json');
    expect(existsSync(pluginJsonPath)).toBe(true);
    const data = JSON.parse(readFileSync(pluginJsonPath, 'utf8'));
    expect(data.mcpServers).toBeTruthy();
    expect(typeof data.mcpServers).toBe('object');
    expect(Array.isArray(data.mcpServers)).toBe(false);
    expect(Object.keys(data.mcpServers).length).toBeGreaterThan(0);
    // Each entry should have a description
    for (const [name, entry] of Object.entries(data.mcpServers)) {
      expect(typeof entry, `mcpServers.${name}`).toBe('object');
      expect(entry.description, `mcpServers.${name}.description`).toBeTruthy();
    }
  });

  test('(c) Every mcp__ pattern follows mcp__<server>__<tool> naming convention', () => {
    for (const { path: p, mcpTokens } of declarations) {
      for (const token of mcpTokens) {
        expect(MCP_PATTERN_RE.test(token), `pattern in ${p}: ${token}`).toBe(true);
      }
    }
  });

  test('(d) Back-compat: agents without mcp__* parse fine', () => {
    const skipped = skills
      .map((p) => ({ path: p, fm: parseFrontmatter(p) }))
      .map((x) => ({ ...x, mcpTokens: x.fm ? extractMcpTokens(x.fm['allowed-tools']) : [] }))
      .filter((x) => x.fm && x.mcpTokens.length === 0);
    expect(skipped.length).toBeGreaterThan(0);
    for (const { fm } of skipped) {
      expect(fm).toBeTruthy();
      expect(fm.name).toBeTruthy();
      expect(fm.archetype).toBeTruthy();
    }
  });

  test('(e) skill-format.md has MCP Tool Integration section', () => {
    const docPath = join(ROOT, '.claude', 'rules', 'core', 'skill-format.md');
    const content = readFileSync(docPath, 'utf8');
    expect(content).toContain('MCP Tool Integration');
    expect(content).toContain('mcp__<server>__<tool>');
  });

  test('(f) CLAUDE.md has MCP Integration section', () => {
    const docPath = join(ROOT, 'CLAUDE.md');
    const content = readFileSync(docPath, 'utf8');
    expect(content).toMatch(/##\s+MCP Integration/);
    expect(content).toContain('mcp__');
  });

  test('(g) Suggested servers in plugin.json cover the agents that reference them (sanity)', () => {
    const pluginJsonPath = join(ROOT, '.claude-plugin', 'plugin.json');
    const data = JSON.parse(readFileSync(pluginJsonPath, 'utf8'));
    const declaredServers = new Set();
    for (const { mcpTokens } of declarations) {
      for (const token of mcpTokens) {
        const m = token.match(/^mcp__([a-z][a-z0-9_-]*)__/i);
        if (m) declaredServers.add(m[1].toLowerCase());
      }
    }
    const advertisedServers = new Set(Object.keys(data.mcpServers || {}).map((s) => s.toLowerCase()));
    // Every server that an agent references should appear in the suggested-server catalog
    for (const server of declaredServers) {
      expect(advertisedServers.has(server), `agent references mcp__${server}__* but plugin.json mcpServers does not list it`).toBe(true);
    }
  });
});
