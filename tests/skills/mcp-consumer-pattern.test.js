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

  test('(b) .claude-plugin/plugin.json mcpServers is absent OR uses Claude Code-valid schema', () => {
    // V11.1.14: removed `mcpServers` consumer-suggestion catalog from plugin.json.
    // Claude Code's plugin manifest validator rejects descriptive metadata
    // ({description, stage}) — mcpServers entries must be real MCP server configs
    // ({command, args, env, type, ...}). The consumer-suggestion catalog now lives
    // only in CLAUDE.md and .claude/rules/core/skill-format.md.
    // If a future bump re-introduces mcpServers, every entry MUST have `command` or `type`.
    const pluginJsonPath = join(ROOT, '.claude-plugin', 'plugin.json');
    expect(existsSync(pluginJsonPath)).toBe(true);
    const data = JSON.parse(readFileSync(pluginJsonPath, 'utf8'));
    if (data.mcpServers !== undefined) {
      expect(typeof data.mcpServers).toBe('object');
      expect(Array.isArray(data.mcpServers)).toBe(false);
      for (const [name, entry] of Object.entries(data.mcpServers)) {
        expect(typeof entry, `mcpServers.${name}`).toBe('object');
        const hasCommand = typeof entry.command === 'string' && entry.command.length > 0;
        const hasType = typeof entry.type === 'string' && entry.type.length > 0;
        expect(
          hasCommand || hasType,
          `mcpServers.${name} must have 'command' or 'type' (Claude Code schema). Got keys: ${Object.keys(entry).join(',')}`
        ).toBe(true);
      }
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

  test('(g) Servers referenced by agents are documented in CLAUDE.md', () => {
    // V11.1.14: catalog moved out of plugin.json (Claude Code schema rejection).
    // Documentation in CLAUDE.md is now the source of truth for the suggested-server catalog.
    const claudeMd = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8').toLowerCase();
    const declaredServers = new Set();
    for (const { mcpTokens } of declarations) {
      for (const token of mcpTokens) {
        const m = token.match(/^mcp__([a-z][a-z0-9_-]*)__/i);
        if (m) declaredServers.add(m[1].toLowerCase());
      }
    }
    for (const server of declaredServers) {
      expect(
        claudeMd.includes(server),
        `agent references mcp__${server}__* but CLAUDE.md does not mention it`
      ).toBe(true);
    }
  });
});
