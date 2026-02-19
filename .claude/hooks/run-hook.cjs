#!/usr/bin/env node
/**
 * Hook Runner - Self-contained hook launcher for cAgents
 *
 * Resolves the hook directory path using multiple fallbacks:
 * 1. __dirname (always correct -- this file IS in .claude/hooks/)
 * 2. CLAUDE_PLUGIN_ROOT (set by Claude Code for plugins -- official mechanism)
 * 3. CLAUDE_PROJECT_DIR (set by Claude Code -- user's project directory)
 * 4. process.cwd() (current working directory -- local dev fallback)
 *
 * Usage in settings.json (plugin hooks):
 *   "command": "node \"${CLAUDE_PLUGIN_ROOT}\"/.claude/hooks/run-hook.cjs <hook-name>"
 *
 * NOTE: Hook command strings in settings.json use ${CLAUDE_PLUGIN_ROOT} (the official
 * Claude Code plugin env var, see docs.anthropic.com/en/hooks). Once run-hook.cjs
 * is executing, __dirname provides the most reliable path to sibling hook files.
 *
 * HISTORY: Previous versions tried $CAGENTS_DIR (custom env, not expanded by Claude
 * Code in command strings) and $CLAUDE_PROJECT_DIR (points to user's project, not
 * plugin). ${CLAUDE_PLUGIN_ROOT} is the documented mechanism for plugin portability.
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

// __dirname is ALWAYS correct when this file is executing (it's in .claude/hooks/).
// All other candidates are fallbacks for edge cases.
const candidates = [
  path.resolve(__dirname, '../..'),    // __dirname -> .claude/hooks/ -> plugin root (always correct)
  process.env.CLAUDE_PLUGIN_ROOT,      // Official plugin env var (set by Claude Code for plugins)
  process.env.CLAUDE_PROJECT_DIR,      // User's project dir (fallback for local dev where plugin IS the project)
  process.cwd()                        // Last resort
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
