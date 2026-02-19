#!/usr/bin/env node
/**
 * Hook Runner - Resilient hook launcher for cAgents
 *
 * Resolves the hook directory path using multiple fallbacks:
 * 1. __dirname (two levels up from .claude/hooks/ - always correct when launcher is found)
 * 2. CAGENTS_DIR (explicit cAgents installation path, set in settings.json env)
 * 3. CLAUDE_PROJECT_DIR (set by Claude Code for project context)
 * 4. CLAUDE_PLUGIN_ROOT (set by Claude Code for plugins)
 * 5. process.cwd() (current working directory - works for local dev)
 *
 * Usage in settings.json:
 *   "command": "node \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/run-hook.cjs <hook-name>"
 *
 * NOTE: Claude Code does NOT expand custom env vars (like ${CAGENTS_DIR}) in
 * hook command strings. Use the built-in $CLAUDE_PROJECT_DIR variable instead.
 * See: https://github.com/anthropics/claude-code/issues/4276
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
const candidates = [
  path.resolve(__dirname, '../..'),  // Two levels up from .claude/hooks/ - always correct
  process.env.CAGENTS_DIR,
  process.env.CLAUDE_PROJECT_DIR,
  process.env.CLAUDE_PLUGIN_ROOT,
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
