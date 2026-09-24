#!/usr/bin/env node
/**
 * sync-plugin-hooks.cjs — generate .claude/hooks.json from .claude/settings.json.
 *
 * Root cause this fixes: `.claude-plugin/plugin.json` used to point its `hooks`
 * field straight at `.claude/settings.json`. Claude Code's plugin loader reads
 * that file as a hooks-only manifest and expects the wrapper shape
 * `{"description": ..., "hooks": {...}}`. `.claude/settings.json` also carries
 * project-settings keys (`env`, `permissions`, `worktree`, `teammateMode`, ...)
 * that a hooks manifest does not recognize, so every session logged:
 *   cagents: hooks.json: unknown keys "$comment", "displayOrigin", ... ignored
 *
 * The hooks still ran (Claude Code extracts the `hooks` key and ignores the
 * rest), but the warning fired in every session of every project with cAgents
 * installed. The fix splits the two roles apart:
 *   - `.claude/settings.json` stays the full project settings file (used
 *     directly by Claude Code when developing inside this repo).
 *   - `.claude/hooks.json` is a generated wrapper carrying ONLY the `hooks`
 *     block, and `.claude-plugin/plugin.json` now points there instead.
 *
 * `.claude/settings.json` stays the single source of truth for hook
 * registration (scripts/lint-hooks.cjs already parses it that way). This
 * script regenerates the wrapper from it, so the two files cannot drift.
 *
 * Usage:
 *   node scripts/sync-plugin-hooks.cjs          # write .claude/hooks.json
 *   node scripts/sync-plugin-hooks.cjs --check  # exit 1 if the file on disk
 *                                                # would differ (CI drift gate)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SETTINGS_PATH = path.join(REPO_ROOT, '.claude', 'settings.json');
const OUTPUT_PATH = path.join(REPO_ROOT, '.claude', 'hooks.json');

function buildWrapper() {
  const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  if (!settings.hooks || typeof settings.hooks !== 'object') {
    throw new Error(`${SETTINGS_PATH} has no "hooks" object to extract`);
  }
  const wrapper = {
    description:
      'cAgents lifecycle hooks (GENERATED from the "hooks" block of .claude/settings.json ' +
      '-- run `node scripts/sync-plugin-hooks.cjs` after editing that block, do not hand-edit this file)',
    hooks: settings.hooks,
  };
  return `${JSON.stringify(wrapper, null, 2)}\n`;
}

function main() {
  const check = process.argv.includes('--check');
  const generated = buildWrapper();

  if (check) {
    const onDisk = fs.existsSync(OUTPUT_PATH) ? fs.readFileSync(OUTPUT_PATH, 'utf8') : null;
    if (onDisk !== generated) {
      console.error(
        `FAIL: ${path.relative(REPO_ROOT, OUTPUT_PATH)} is stale relative to the ` +
          '"hooks" block of .claude/settings.json. Run `node scripts/sync-plugin-hooks.cjs` and commit the result.'
      );
      process.exit(1);
    }
    console.log(`OK: ${path.relative(REPO_ROOT, OUTPUT_PATH)} matches .claude/settings.json`);
    return;
  }

  fs.writeFileSync(OUTPUT_PATH, generated);
  console.log(`Wrote ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
}

main();
