#!/usr/bin/env node
/**
 * lint-hooks.cjs — derive the live hook counts from disk (A2-11 / C1.11).
 *
 * The hook-count constants (".cjs files", "unique registered hooks", "event types")
 * are hardcoded in several docs (CLAUDE.md, hooks.md, settings.json $comment,
 * README.md). Historically those drift whenever a hook is added/removed. This tiny
 * tool DERIVES the three counts from disk so future drift is catchable:
 *
 *   1. hook_files       — `.cjs` files under .claude/hooks/
 *   2. registered_hooks — unique hook names referenced in .claude/settings.json
 *                         run-hook.cjs commands
 *   3. event_types      — distinct hook event keys in .claude/settings.json
 *
 * It also derives the dispatched-sub-validator count (modules that exist under
 * .claude/hooks/ but are NOT registered standalone — they are run in-process by a
 * consolidating dispatcher) and asserts the inventory is internally consistent:
 *
 *   hook_files === registered_hooks + dispatched + non_hook_utilities
 *
 * where non_hook_utilities are hook-utils.cjs + run-hook.cjs (shared lib +
 * launcher) + bash-guard-evaluator.cjs (pure library require'd by
 * bash-validator.cjs — neither registered nor dispatched).
 *
 * Usage:
 *   node scripts/lint-hooks.cjs              # print counts + PASS/FAIL consistency
 *   node scripts/lint-hooks.cjs --json       # machine-readable JSON
 *
 * Exit code: 0 when internally consistent, 1 on a consistency violation.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HOOKS_DIR = path.join(REPO_ROOT, '.claude', 'hooks');
const SETTINGS_PATH = path.join(REPO_ROOT, '.claude', 'settings.json');

// Non-hook utility .cjs files that live in .claude/hooks/ but are not themselves
// Claude Code hooks: the shared library, the launcher, and the bash-guard
// evaluator library (require'd by bash-validator.cjs; not registered, not a
// dispatched sub-validator).
const NON_HOOK_UTILITIES = ['hook-utils.cjs', 'run-hook.cjs', 'bash-guard-evaluator.cjs'];

function deriveCounts() {
  // 1. All .cjs files on disk.
  const cjsFiles = fs.existsSync(HOOKS_DIR)
    ? fs.readdirSync(HOOKS_DIR).filter((f) => f.endsWith('.cjs'))
    : [];
  const hookFiles = cjsFiles.length;

  // 2 + 3. Parse settings.json for registered hook names + event keys.
  const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  const hooksBlock = settings.hooks || {};
  const eventTypes = Object.keys(hooksBlock).length;

  const registeredNames = new Set();
  for (const event of Object.keys(hooksBlock)) {
    const entries = Array.isArray(hooksBlock[event]) ? hooksBlock[event] : [];
    for (const entry of entries) {
      const inner = Array.isArray(entry.hooks) ? entry.hooks : [];
      for (const hk of inner) {
        if (typeof hk.command !== 'string') continue;
        const m = hk.command.match(/run-hook\.cjs"\s+([a-z0-9-]+)/);
        if (m) registeredNames.add(m[1]);
      }
    }
  }
  const registeredHooks = registeredNames.size;

  // Dispatched sub-validators: .cjs hook files that are NEITHER registered standalone
  // NOR utilities. They are run in-process by a consolidating dispatcher.
  const registeredFileNames = new Set([...registeredNames].map((n) => `${n}.cjs`));
  const dispatched = cjsFiles.filter(
    (f) => !registeredFileNames.has(f) && !NON_HOOK_UTILITIES.includes(f)
  );

  return {
    hook_files: hookFiles,
    registered_hooks: registeredHooks,
    event_types: eventTypes,
    dispatched: dispatched.length,
    dispatched_files: dispatched.sort(),
    utilities: NON_HOOK_UTILITIES.filter((u) => cjsFiles.includes(u)),
    registered_names: [...registeredNames].sort(),
  };
}

function checkConsistency(c) {
  // hook_files === registered + dispatched + utilities
  const expected = c.registered_hooks + c.dispatched + c.utilities.length;
  return {
    ok: expected === c.hook_files,
    expected,
    actual: c.hook_files,
  };
}

function main() {
  const args = process.argv.slice(2);
  const c = deriveCounts();
  const consistency = checkConsistency(c);

  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...c, consistency }, null, 2));
  } else {
    console.log(`hook_files=${c.hook_files}`);
    console.log(`registered_hooks=${c.registered_hooks}`);
    console.log(`event_types=${c.event_types}`);
    console.log(`dispatched=${c.dispatched} (${c.dispatched_files.join(', ') || 'none'})`);
    console.log(`utilities=${c.utilities.length} (${c.utilities.join(', ')})`);
    if (consistency.ok) {
      console.log(
        `consistency=OK (hook_files ${c.hook_files} = registered ${c.registered_hooks} ` +
        `+ dispatched ${c.dispatched} + utilities ${c.utilities.length})`
      );
    } else {
      console.error(
        `consistency=FAIL: hook_files ${consistency.actual} != registered ${c.registered_hooks} ` +
        `+ dispatched ${c.dispatched} + utilities ${c.utilities.length} (= ${consistency.expected})`
      );
    }
  }

  process.exit(consistency.ok ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { deriveCounts, checkConsistency };
