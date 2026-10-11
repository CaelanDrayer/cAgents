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
 *   "command": "bash -c 'R=\"${CLAUDE_PLUGIN_ROOT:-${CLAUDE_PROJECT_DIR:-$(pwd)}}\"; node \"$R/.claude/hooks/run-hook.cjs\" <hook-name>'"
 *
 * NOTE: V9.17.1 wraps the node command in bash -c with a 3-tier fallback chain to
 * handle cases where CLAUDE_PLUGIN_ROOT is not expanded (empty string causes
 * MODULE_NOT_FOUND at /.claude/hooks/run-hook.cjs). The fallback chain is:
 *   1. CLAUDE_PLUGIN_ROOT - official plugin env var (set by Claude Code for plugins)
 *   2. CLAUDE_PROJECT_DIR - user's project dir (works for local dev)
 *   3. $(pwd) - current working directory (last resort)
 *
 * Once run-hook.cjs is executing, __dirname provides the most reliable path to
 * sibling hook files (belt-and-suspenders with the bash -c fallback).
 *
 * HISTORY: V9.13 used bare ${CLAUDE_PLUGIN_ROOT} in command strings, which fails
 * when the env var is not set (resolves to /.claude/hooks/run-hook.cjs).
 * Earlier versions tried $CAGENTS_DIR (custom env, not expanded) and
 * $CLAUDE_PROJECT_DIR alone (points to user's project, not plugin).
 */

const path = require('path');
const fs = require('fs');

// Get the hook name from command line args
const hookName = process.argv[2];

if (!hookName) {
  const msg = '[run-hook] No hook name provided — the hook registration in .claude/settings.json ' +
              'is malformed (expected `node run-hook.cjs <hook-name>`). No hook ran for this event.';
  console.error(msg);
  // RF-5 (FS-3): stderr is not surfaced to the model. A hook system that
  // silently no-ops is indistinguishable from one that ran and found nothing.
  console.log(JSON.stringify({ continue: true, systemMessage: msg }));
  process.exit(0);
}

// F5 (v12.74.0): one copy of each hook in the cAgents source repo.
// Claude Code dedupes an identical handler across settings files, but "a
// plugin's or skill's copy of the same handler stays separate". So in this
// repo with the cagents plugin enabled, the plugin copy (.claude/hooks.json)
// and the project copy (.claude/settings.json) both ran. dedupGuard in
// hook-utils.cjs misses sequential runs, so side effects doubled.
//
// Rule: the PLUGIN copy stands down when all of these are true:
//   1. CLAUDE_PLUGIN_ROOT is set. Only a plugin copy has it.
//   2. The project dir has .claude-plugin/plugin.json with name "cagents".
//   3. The project .claude/settings.json "hooks" block has a command that
//      invokes run-hook.cjs with THIS hook name as its argument.
//   4. The project .claude/hooks/run-hook.cjs and .claude/hooks/<hook>.cjs
//      both exist, so the project copy can load this hook.
// Checks 3 and 4 are per hook. A hook that only the plugin registers (for
// example, the project is on an older branch) still runs from the plugin. If
// the plugin copy stood down for that hook, no copy would run, and a deny hook
// would silently stop blocking.
// Then the project copy always runs, and it runs the local dev hook code. The
// rule does not compare paths. With --plugin-dir . the plugin root IS the
// project, and the plugin copy still stands down, so the project copy is the
// one copy that runs. The project dir is CLAUDE_PROJECT_DIR, else cwd. This
// launcher does not read stdin, because the hook itself consumes stdin.
// Residual case: the rule reads the registration on disk. It cannot see if
// Claude Code loaded it. If project settings are excluded (--setting-sources
// without "project") or the workspace is not trusted, the project copy does
// not run, and the plugin copy still stands down. Then this hook runs zero
// times in the cAgents source repo. This is a dev-only case and is accepted.
// Fail-open: on any error, the plugin copy runs as before.
function projectRegistersHook(hooks, name) {
  const re = /run-hook\.cjs["']?\s+["']?([A-Za-z0-9_.-]+)/g;
  for (const groups of Object.values(hooks || {})) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      for (const h of (group && Array.isArray(group.hooks)) ? group.hooks : []) {
        if (!h || typeof h.command !== 'string') continue;
        for (const m of h.command.matchAll(re)) {
          if (m[1] === name) return true;
        }
      }
    }
  }
  return false;
}

function pluginCopyShouldStandDown() {
  if (!process.env.CLAUDE_PLUGIN_ROOT) return false;
  try {
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const manifest = JSON.parse(fs.readFileSync(path.join(projectDir, '.claude-plugin', 'plugin.json'), 'utf8'));
    if (!manifest || manifest.name !== 'cagents') return false;
    const settings = JSON.parse(fs.readFileSync(path.join(projectDir, '.claude', 'settings.json'), 'utf8'));
    if (!settings || !projectRegistersHook(settings.hooks, hookName)) return false;
    const projectHooks = path.join(projectDir, '.claude', 'hooks');
    return fs.existsSync(path.join(projectHooks, 'run-hook.cjs')) &&
      fs.existsSync(path.join(projectHooks, `${hookName}.cjs`));
  } catch {
    return false;
  }
}

if (pluginCopyShouldStandDown()) {
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
  // RF-5 (FS-3): this used to print to stderr and emit a bare {continue:true}.
  // stderr never reaches the model, so on a partial checkout (or a stale /
  // half-installed plugin) the ENTIRE hook system silently no-ops and nothing
  // tells anyone. Emit the notice as a systemMessage so the breakage is
  // self-reporting instead of requiring a forensic dig.
  const searched = candidates.map(c => path.join(c, '.claude/hooks/')).join(', ');
  const msg =
    `[run-hook] HOOK NOT FOUND: '${hookName}.cjs' is not present in any search path, so this hook ` +
    `DID NOT RUN — its checks contributed nothing to this tool call. Searched: ${searched}. ` +
    'FIX: the cAgents plugin install is incomplete or stale (partial/sparse checkout, interrupted ' +
    'update). Run `/plugin update cagents`, or verify CLAUDE_PLUGIN_ROOT points at a complete checkout.';
  console.error(msg);
  console.log(JSON.stringify({ continue: true, systemMessage: msg }));
  process.exit(0);
}

// Load and execute the hook
// The hook uses createHook() which reads stdin and writes stdout
require(hookPath);
