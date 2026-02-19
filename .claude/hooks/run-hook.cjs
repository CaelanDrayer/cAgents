#!/usr/bin/env node
/**
 * Hook Runner - Resilient hook launcher for cAgents
 *
 * Resolves the hook directory path using multiple fallbacks:
 * 1. __dirname (two levels up from .claude/hooks/ - always correct when launcher is found)
 * 2. CAGENTS_DIR (explicit cAgents installation path, set in settings.json env - most reliable)
 * 3. CLAUDE_PLUGIN_ROOT (set by Claude Code - may point to plugin dir, but unreliable cross-project)
 * 4. CLAUDE_PROJECT_DIR (set by Claude Code - points to the user's project directory)
 * 5. process.cwd() (current working directory - works for local dev)
 *
 * Usage in settings.json (plugin hooks):
 *   "command": "node \"$CAGENTS_DIR\"/.claude/hooks/run-hook.cjs <hook-name>"
 *
 * NOTE: Use $CAGENTS_DIR (not $CLAUDE_PLUGIN_ROOT or $CLAUDE_PROJECT_DIR) in hook command strings.
 * CAGENTS_DIR is set in settings.json env block and always points to the plugin install directory.
 * CLAUDE_PLUGIN_ROOT is unreliable when the plugin is loaded cross-project (may resolve to user dir).
 * CLAUDE_PROJECT_DIR points to the user's project directory, not the plugin directory.
 */

const path = require('path');
const fs = require('fs');

// Get the hook name from command line args
const hookName = process.argv[2];

if (!hookName) {
  console.error('[run-hook] Error: No hook name provided');
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Resolve hooks directory using multiple fallbacks
// __dirname is first because if this file is executing, it's always correct
// CAGENTS_DIR is second because it's explicitly set in settings.json env and always reliable
const candidates = [
  path.resolve(__dirname, '../..'),  // Two levels up from .claude/hooks/ - always correct
  process.env.CAGENTS_DIR,           // Explicit path set in settings.json env by install.sh
  process.env.CLAUDE_PLUGIN_ROOT,    // Plugin dir (unreliable cross-project, may point to user dir)
  process.env.CLAUDE_PROJECT_DIR,    // User's project dir (fallback for local dev)
  process.cwd()
].filter(Boolean);

let hookPath = null;

for (const root of candidates) {
  const candidate = path.join(root, '.claude', 'hooks', `${hookName}.cjs`);
  if (fs.existsSync(candidate)) {
    hookPath = candidate;
    break;
  }
}

if (!hookPath) {
  console.error(`[run-hook] Error: Could not find hook '${hookName}.cjs' in any search path`);
  console.error(`[run-hook] Searched: ${candidates.map(c => path.join(c, '.claude/hooks/')).join(', ')}`);
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// Load and execute the hook
// The hook uses createHook() which reads stdin and writes stdout
require(hookPath);
