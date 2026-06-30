// Phase 6 (refactor/audit-260630, finding A3-01): rules `paths:` glob resolution guard.
//
// ROOT CAUSE this guard pins: in v12.8.0 the 9 archetype roots moved under `agents/`
// (e.g. `developer/` -> `agents/developer/`, `core/` -> `agents/core/`). ~18 of the 26
// `.claude/rules/**/*.md` files carrying `paths:` frontmatter still rooted their globs at
// the OLD pre-move locations, so each path-conditional rule silently matched NOTHING on
// disk and was mis-scoped.
//
// This test asserts, for every `.claude/rules/**/*.md` with `paths:` frontmatter:
//   (a) NO glob's first path segment is a bare pre-move archetype/overlay root
//       (`developer`, `operator`, `advisor`, `analyst`, `creator`, `writer`,
//        `strategist`, `core`, `leadership`, `people`, `shared`). Re-introducing
//       `developer/**` MUST fail this test so the v12.8.0 drift class can never recur.
//   (b) every glob resolves to >= 1 real path on disk, EXCEPT an explicit known-optional
//       allowlist of runtime/user-override roots (`.cagents`, `cagents-memory`) that are
//       git-ignored and may be empty or absent in a fresh CI checkout.
//
// Refs:
//   - .claude/rules/core/skill-format.md § "paths (V11.1.12+)"
//   - tests/skills/paths-conditional-activation.test.js (sibling: validates agent metadata.paths)

import { describe, test, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const RULES_DIR = join(ROOT, '.claude', 'rules');

// Bare pre-move archetype + overlay roots. A `paths:` glob whose first segment is one of
// these is the exact v12.8.0 drift class this guard exists to kill.
const PRE_MOVE_ROOTS = new Set([
  'developer', 'operator', 'advisor', 'analyst', 'creator',
  'writer', 'strategist', 'core', 'leadership', 'people', 'shared',
]);

// First segments whose globs are exempt from the ">=1 path" assertion: git-ignored runtime
// state (`cagents-memory/`) and the optional user-override config dir (`.cagents/`). These
// may legitimately be empty or absent in CI. NOTE: archetype roots are deliberately NOT
// here, so bare-archetype drift is never silently allowed.
const OPTIONAL_FIRST_SEGMENTS = new Set(['.cagents', 'cagents-memory']);

// --- build a flat list of every real file path (repo-relative), once ---
const SKIP_DIRS = new Set(['node_modules', '.git', 'cagents-memory']);
function buildFileList() {
  const out = [];
  (function walk(dir, rel) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(e.name)) continue;
      const full = join(dir, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(full, r);
      else out.push(r);
    }
  })(ROOT, '');
  return out;
}
const FILES = buildFileList();

// minimatch-compatible (subset) glob -> RegExp. Handles `**/`, `**`, `*`, `?`, literals.
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') { i++; re += '(?:.*/)?'; } // `**/` -> any depth incl. zero
        else re += '.*';                                    // `**`  -> any chars
      } else {
        re += '[^/]*';                                      // `*`   -> one segment
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if ('.+^${}()|[]\\'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$');
}
function globResolves(glob) {
  const re = globToRegExp(glob);
  return FILES.some((f) => re.test(f));
}
function firstSegment(glob) {
  return glob.split('/')[0];
}

// --- collect (file, glob) pairs from every rules .md with paths: frontmatter ---
function collectRulesFiles() {
  const out = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.md')) out.push(full);
    }
  })(RULES_DIR);
  return out.sort();
}
function collectGlobPairs() {
  const pairs = [];
  for (const file of collectRulesFiles()) {
    const txt = readFileSync(file, 'utf8');
    const m = txt.match(/^---\n([\s\S]*?)\n---/);
    if (!m) continue;
    let fm;
    try { fm = yaml.load(m[1]); } catch { continue; }
    if (!fm || !Array.isArray(fm.paths)) continue;
    const rel = file.replace(ROOT + '/', '');
    for (const glob of fm.paths) pairs.push({ rel, glob });
  }
  return pairs;
}
const GLOB_PAIRS = collectGlobPairs();

describe('.claude/rules paths: globs resolve (A3-01 v12.8.0 archetype-move drift guard)', () => {
  test('sanity: found a meaningful number of paths: globs to check', () => {
    expect(existsSync(RULES_DIR)).toBe(true);
    expect(GLOB_PAIRS.length).toBeGreaterThanOrEqual(40);
  });

  test('the guard classifier itself rejects a bare pre-move archetype root', () => {
    // Self-test: if someone re-introduces `developer/**`, classification must flag it.
    expect(PRE_MOVE_ROOTS.has(firstSegment('developer/**'))).toBe(true);
    expect(PRE_MOVE_ROOTS.has(firstSegment('core/planner/**'))).toBe(true);
    // ...and the corrected forms are NOT flagged:
    expect(PRE_MOVE_ROOTS.has(firstSegment('agents/developer/**'))).toBe(false);
    expect(PRE_MOVE_ROOTS.has(firstSegment('agents/core/planner/**'))).toBe(false);
  });

  test.each(GLOB_PAIRS)('$rel :: $glob', ({ glob }) => {
    const first = firstSegment(glob);

    // (a) No bare pre-move archetype/overlay root. This is the regression this guard pins.
    expect(
      PRE_MOVE_ROOTS.has(first),
      `glob "${glob}" is rooted at the bare pre-move archetype root "${first}/"; ` +
        `archetypes moved under agents/ in v12.8.0 — use "agents/${glob}" ` +
        `(or "agents/_overlay/${glob}" for people/ and shared/).`,
    ).toBe(false);

    // (b) Every non-optional glob must resolve to >= 1 real path on disk.
    if (!OPTIONAL_FIRST_SEGMENTS.has(first)) {
      expect(
        globResolves(glob),
        `glob "${glob}" matches no file on disk. Fix it to point at a real path ` +
          `(preserve the rule's intended scope), or — if it targets git-ignored runtime ` +
          `state — root it under cagents-memory/.`,
      ).toBe(true);
    }
  });
});
