#!/usr/bin/env node
/**
 * Hook Runner - Resilient hook launcher for cAgents
 *
 * Resolves the hook directory path using multiple fallbacks:
 * 1. CAGENTS_DIR (explicit cAgents installation path, set in settings.json env)
 * 2. CLAUDE_PLUGIN_ROOT (set by Claude Code - may point to user's project, not plugin)
 * 3. CLAUDE_PROJECT_DIR (set by Claude Code for project context)
 * 4. process.cwd() (current working directory - works for local dev)
 * 5. __dirname (two levels up from .claude/hooks/ - always correct when launcher is found)
 *
 * Usage in settings.json:
 *   "command": "node ${CAGENTS_DIR}/.claude/hooks/run-hook.cjs <hook-name>"
 *
 * IMPORTANT: CLAUDE_PLUGIN_ROOT resolves to the user's project directory, NOT
 * the plugin directory. Use CAGENTS_DIR (set in settings.json env block) for
 * reliable hook resolution when cAgents is used as a plugin from other projects.
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
const candidates = [
  process.env.CAGENTS_DIR,
  path.resolve(__dirname, '../..'),  // Two levels up from .claude/hooks/ - always correct
  process.env.CLAUDE_PLUGIN_ROOT,
  process.env.CLAUDE_PROJECT_DIR,
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
