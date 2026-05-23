// V11.2.0: Standalone Contract regression test
//
// Asserts cAgents has no MCP server coupling:
//   (a) .mcp.json does not exist (no project-level MCP config shipped)
//   (b) .claude-plugin/plugin.json has no mcpServers field
//   (c) No agent SKILL.md declares `mcp__*` patterns in allowed-tools
//   (d) The Standalone Contract section in CLAUDE.md is present
//   (e) elicitation-handler.cjs is gone and not registered in settings.json
//
// See CLAUDE.md § "Standalone Contract (V11.2.0+)" for the rule.

import { describe, test, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const ARCHETYPES = ['developer', 'operator', 'advisor', 'analyst', 'creator', 'writer', 'strategist', 'core', 'leadership'];
const MCP_TOKEN_RE = /\bmcp__[a-z0-9_-]+__[a-z0-9_*-]+/i;

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
  for (const a of ARCHETYPES) walk(join(ROOT, 'agents', a));
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

describe('Standalone Contract (V11.2.0+)', () => {
  test('(a) .mcp.json does not exist at repo root', () => {
    expect(existsSync(join(ROOT, '.mcp.json'))).toBe(false);
  });

  test('(b) .claude-plugin/plugin.json has no mcpServers field', () => {
    const data = JSON.parse(readFileSync(join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8'));
    expect(data.mcpServers).toBeUndefined();
  });

  test('(c) No agent SKILL.md declares mcp__* in allowed-tools', () => {
    const offenders = [];
    for (const path of findAllSkillMd()) {
      const fm = parseFrontmatter(path);
      if (!fm) continue;
      const tools = fm['allowed-tools'];
      if (typeof tools !== 'string') continue;
      if (MCP_TOKEN_RE.test(tools)) {
        offenders.push({ path: path.replace(ROOT + '/', ''), tools });
      }
    }
    expect(
      offenders,
      `Standalone Contract violation — agents must not declare mcp__* in allowed-tools:\n${offenders.map(o => `  ${o.path}: ${o.tools}`).join('\n')}`
    ).toEqual([]);
  });

  test('(d) CLAUDE.md contains the Standalone Contract section', () => {
    const claudeMd = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
    expect(claudeMd).toMatch(/##\s+Standalone Contract/);
    expect(claudeMd).toContain('cAgents is standalone');
    expect(claudeMd).toContain('MUST NOT depend on MCP servers');
  });

  test('(e) elicitation-handler.cjs is gone and not registered in settings.json', () => {
    expect(existsSync(join(ROOT, '.claude', 'hooks', 'elicitation-handler.cjs'))).toBe(false);
    const settings = JSON.parse(readFileSync(join(ROOT, '.claude', 'settings.json'), 'utf8'));
    expect(settings.hooks?.Elicitation).toBeUndefined();
    expect(settings.hooks?.ElicitationResult).toBeUndefined();
  });
});
