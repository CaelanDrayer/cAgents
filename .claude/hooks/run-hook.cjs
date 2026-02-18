#!/usr/bin/env node
/**
 * Hook Runner - Resilient hook launcher for cAgents
 *
 * Resolves the hook directory path using multiple fallbacks:
 * 1. CLAUDE_PLUGIN_ROOT (set by Claude Code for installed plugins)
 * 2. CLAUDE_PROJECT_DIR (set by Claude Code for project context)
 * 3. process.cwd() (current working directory - works for local dev)
 *
 * Usage in settings.json:
 *   "command": "node .claude/hooks/run-hook.cjs <hook-name>"
 *
 * Example:
 *   "command": "node .claude/hooks/run-hook.cjs verify-completion"
 *   -> Resolves to: node /full/path/.claude/hooks/verify-completion.cjs
 *
 * This script is always found via relative path (settings.json commands
 * run from the project root), then it resolves the target hook using
 * absolute paths with proper fallbacks.
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
  process.env.CLAUDE_PLUGIN_ROOT,
  process.env.CLAUDE_PROJECT_DIR,
  process.cwd(),
  path.resolve(__dirname, '../..')  // Two levels up from .claude/hooks/
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
