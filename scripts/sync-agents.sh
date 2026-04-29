#!/bin/bash
# sync-agents.sh — Auto-generate the `agents` array in .claude-plugin/plugin.json
# by globbing all SKILL.md files across the v11.1.0 archetype tree.
#
# Usage: ./scripts/sync-agents.sh
#
# Sorts paths alphabetically, prints count, and writes updated plugin.json.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export CAGENTS_ROOT="$ROOT"

node --input-type=commonjs <<'NODEEOF'
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.env.CAGENTS_ROOT;
const PLUGIN_JSON = path.join(ROOT, '.claude-plugin', 'plugin.json');

// v11.1.0 archetype roots (9 total). The new tree places SKILL.md files at
// {archetype}/{branch?}/{agent}/SKILL.md — no `agents/` segment. We walk each
// archetype root recursively to find every SKILL.md.
const ARCHETYPE_DIRS = [
  'developer',
  'operator',
  'advisor',
  'analyst',
  'creator',
  'writer',
  'strategist',
  'core',
  'leadership',
];

function findSkillMds(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSkillMds(fullPath));
    } else if (entry.isFile() && entry.name === 'SKILL.md') {
      results.push(fullPath);
    }
  }
  return results;
}

if (!fs.existsSync(PLUGIN_JSON)) {
  console.error(`Error: ${PLUGIN_JSON} not found`);
  process.exit(1);
}

const raw = fs.readFileSync(PLUGIN_JSON, 'utf8');
const plugin = JSON.parse(raw);

const agentPaths = [];
for (const archetype of ARCHETYPE_DIRS) {
  const archetypeDir = path.join(ROOT, archetype);
  if (!fs.existsSync(archetypeDir)) continue;
  const found = findSkillMds(archetypeDir);
  for (const absPath of found) {
    const rel = path.relative(ROOT, absPath).replace(/\\/g, '/');
    agentPaths.push(rel);
  }
}

// Sort alphabetically
agentPaths.sort();

// Paths use ./ prefix — plugin root is the project root (parent of .claude-plugin/)
plugin.agents = agentPaths.map(p => './' + p);

fs.writeFileSync(PLUGIN_JSON, JSON.stringify(plugin, null, 2) + '\n', 'utf8');

console.log(`Found ${agentPaths.length} agents`);
console.log(`Updated .claude-plugin/plugin.json`);
NODEEOF
