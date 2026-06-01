#!/bin/bash
# sync-agents.sh — Auto-generate the `agents` array in .claude-plugin/plugin.json
# by globbing all SKILL.md files across the v11.1.0 archetype tree.
#
# Usage:
#   ./scripts/sync-agents.sh           # Apply: regenerate plugin.json (default)
#   ./scripts/sync-agents.sh --check   # Dry-run: exit 0 if in sync, 1 if drift, never mutate
#   ./scripts/sync-agents.sh --help    # Show this help
#
# Sorts paths alphabetically, prints count, and (in apply mode) writes updated plugin.json.

set -euo pipefail

MODE="apply"
for arg in "$@"; do
    case "$arg" in
        --check)
            MODE="check"
            ;;
        --apply)
            MODE="apply"
            ;;
        -h|--help)
            cat <<EOF
sync-agents.sh — Auto-generate the agents array in .claude-plugin/plugin.json.

Usage:
  ./scripts/sync-agents.sh           Apply: regenerate plugin.json (default)
  ./scripts/sync-agents.sh --check   Dry-run: exit 0 in sync, 1 drift, no mutation
  ./scripts/sync-agents.sh --apply   Same as default (explicit apply)
  ./scripts/sync-agents.sh -h|--help Show this help

Exit codes (--check mode):
  0  plugin.json is in sync with archetype-tree SKILL.md inventory
  1  drift detected (would have written changes); plugin.json untouched
EOF
            exit 0
            ;;
        *)
            echo "Unknown argument: $arg" >&2
            echo "Use --help for usage." >&2
            exit 2
            ;;
    esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export CAGENTS_ROOT="$ROOT"
export CAGENTS_SYNC_MODE="$MODE"
# WI-1 follow-on (v12.12.1): test-friendly override. When set, the script
# operates on the path in CAGENTS_PLUGIN_JSON_PATH instead of the canonical
# $ROOT/.claude-plugin/plugin.json. This lets sync-agents-check.test.js
# induce drift on a temp-dir copy without racing
# `validate-counts.sh --derive-only` (which reads the real plugin.json) in
# vitest's parallel test runs. Production callers never set this env var.
export CAGENTS_PLUGIN_JSON_PATH="${CAGENTS_PLUGIN_JSON_PATH:-}"

node --input-type=commonjs <<'NODEEOF'
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.env.CAGENTS_ROOT;
const MODE = process.env.CAGENTS_SYNC_MODE || 'apply';
const PLUGIN_JSON_OVERRIDE = process.env.CAGENTS_PLUGIN_JSON_PATH || '';
const PLUGIN_JSON = PLUGIN_JSON_OVERRIDE
  ? PLUGIN_JSON_OVERRIDE
  : path.join(ROOT, '.claude-plugin', 'plugin.json');

// v12.8.0 archetype roots (9 total). All archetypes live under `agents/`.
// Layout: agents/{archetype}/{branch?}/{agent}/SKILL.md. We walk each
// archetype root recursively to find every SKILL.md.
const ARCHETYPES_PARENT = 'agents';
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

// v12.0.5+: agents under `<archetype>/_deprecated/` are kept on disk for
// alias resolution (via scripts/migration/v12-aliases.yaml) but excluded
// from plugin registration so planners + routers won't select them.
function findSkillMds(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    // Skip _deprecated/ bucket dirs at any depth (v12.0.5+ bucket pattern)
    if (entry.isDirectory() && entry.name === '_deprecated') continue;
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
  const archetypeDir = path.join(ROOT, ARCHETYPES_PARENT, archetype);
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
const newAgents = agentPaths.map(p => './' + p);

if (MODE === 'check') {
  // Compare without mutating
  const currentAgents = Array.isArray(plugin.agents) ? plugin.agents : [];
  const inSync =
    currentAgents.length === newAgents.length &&
    currentAgents.every((p, i) => p === newAgents[i]);

  console.log(`Found ${newAgents.length} agents in archetype tree`);
  console.log(`plugin.json declares ${currentAgents.length} agents`);

  if (inSync) {
    console.log('In sync: plugin.json matches archetype-tree SKILL.md inventory');
    process.exit(0);
  } else {
    console.log('DRIFT: plugin.json does not match archetype tree.');
    // Print first 10 differences to aid debugging
    const setNew = new Set(newAgents);
    const setCur = new Set(currentAgents);
    const onlyInNew = newAgents.filter(p => !setCur.has(p)).slice(0, 10);
    const onlyInCur = currentAgents.filter(p => !setNew.has(p)).slice(0, 10);
    if (onlyInNew.length) {
      console.log('Found in tree but missing from plugin.json (first 10):');
      onlyInNew.forEach(p => console.log('  + ' + p));
    }
    if (onlyInCur.length) {
      console.log('Listed in plugin.json but no SKILL.md found (first 10):');
      onlyInCur.forEach(p => console.log('  - ' + p));
    }
    console.log('Run scripts/sync-agents.sh (without --check) to update.');
    process.exit(1);
  }
}

// MODE === 'apply'
plugin.agents = newAgents;
fs.writeFileSync(PLUGIN_JSON, JSON.stringify(plugin, null, 2) + '\n', 'utf8');

console.log(`Found ${newAgents.length} agents`);
console.log(`Updated .claude-plugin/plugin.json`);
NODEEOF
