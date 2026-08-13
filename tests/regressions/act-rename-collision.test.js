// Bug-driven regression guard for the `/run` -> `/act` skill rename.
//
// WHY THIS FILE EXISTS
// --------------------
// Claude Code shipped a BUILT-IN `run` skill, which collided with cAgents' own
// `/run` entry point. The plugin's skill was renamed `/run` -> `/act`. Most of
// that rename is loud: a stale `/run` reference in prose is visible, and a moved
// file breaks an import. But FIVE of the sites below fail SILENTLY — no error, no
// test failure, no visible symptom — and two of them were nearly missed during
// execution. This file is the standing guard that turns each silent site into an
// assertion, per the CLAUDE.md Standalone-Contract rule-5 pattern ("every fix
// ships a regression test").
//
// The silent-failure class, concretely:
//   - A `paths:` glob pointing at the dead `.claude/skills/run/` directory does not
//     error; the rule just silently stops loading, forever. 11 rules files were in
//     this state.
//   - A SESSION_PREFIXES list that drops `run_` does not error; it just silently
//     stops seeing 21 live + 26 archived `run_*` session directories.
//   - A SECOND SESSION_PREFIXES list (scripts/maintenance/session-gc.cjs) missing
//     `act_` does not error; every go-forward `act_` session is simply invisible to
//     garbage collection, forever. WI-20 caught this one by hand.
//
// READ THIS BEFORE EDITING — the NUL-byte trap
// --------------------------------------------
// `.claude/hooks/hook-utils.cjs` contains a NUL byte (line 1320). GNU grep therefore
// classifies the whole file as BINARY and prints NOTHING for a plain
// `grep SESSION_PREFIXES .claude/hooks/hook-utils.cjs`. Any text-matching assertion
// against that file is a FALSE GREEN: it "finds no violation" because it can read no
// lines at all. Assertion 4 below reads the value via `require()` for exactly this
// reason. Do not convert it to a text grep. (`grep -a` and `git grep` do work, but
// the exported value is the real contract anyway.)
//
// Pinned sites (one describe block each):
//   1. .claude/skills/run/ gone; .claude/skills/act/SKILL.md present, frontmatter name: act
//   2. prompt-router.cjs      ENFORCED_SKILLS      -> '/act', not '/run'
//   3. trigger-collision.cjs  RESERVED_SKILLS/_BUILTINS -> 'act' skill, 'run' built-in
//   4. hook-utils.cjs         SESSION_PREFIXES     -> BOTH 'act_' and legacy 'run_'
//   5. .claude/rules/**       paths: globs         -> none on the dead skills/run/ dir
//   6. skill-awareness.md     exclusion list       -> `run` is a BUILT-IN, `act` is ours
//   7. G2 canary              run-hook.cjs         -> still present, still 26 hooks
//   8. BOTH SESSION_PREFIXES lists                 -> can never drift apart again
//
// Scope note (assertion 5): tests/v12/rules-paths-globs-resolve.test.js ALREADY
// enforces the general "every `paths:` glob resolves to >= 1 file on disk" invariant
// for all ~349 globs. That guard is not duplicated here. This file asserts only the
// narrower rename-specific facts it does not cover: that ZERO globs still point at
// the dead `.claude/skills/run/` directory, and that the 11 files repointed to
// `.claude/skills/act/` are still there and still resolve.

import { describe, test, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import yaml from 'js-yaml';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const SKILLS_DIR = join(ROOT, '.claude', 'skills');
const HOOKS_DIR = join(ROOT, '.claude', 'hooks');
const RULES_DIR = join(ROOT, '.claude', 'rules');

// Parse the `---\n...\n---` YAML frontmatter block off a markdown file.
function frontmatter(file) {
  const m = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  try {
    return yaml.load(m[1]);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1. The skill directory itself
// ---------------------------------------------------------------------------
describe('1. skill directory: /run is gone, /act is live', () => {
  test('.claude/skills/run/ does NOT exist', () => {
    expect(
      existsSync(join(SKILLS_DIR, 'run')),
      '.claude/skills/run/ is back. cAgents no longer owns the name `run` — Claude Code ' +
        'ships a built-in `run` skill, and a project skill at this path re-shadows it.',
    ).toBe(false);
  });

  test('.claude/skills/act/SKILL.md exists with frontmatter name: act', () => {
    const skill = join(SKILLS_DIR, 'act', 'SKILL.md');
    expect(existsSync(skill), 'the renamed entry point .claude/skills/act/SKILL.md is missing').toBe(true);
    expect(frontmatter(skill)?.name).toBe('act');
  });
});

// ---------------------------------------------------------------------------
// 2. prompt-router.cjs ENFORCED_SKILLS
// ---------------------------------------------------------------------------
// NOTE: prompt-router.cjs exports nothing AND runs the hook as a side effect of
// require() (it writes a JSON verdict to stdout). So this one is read from source.
// We still parse the array literal into real values rather than substring-matching,
// so reformatting/whitespace/reordering cannot break it.
describe('2. prompt-router.cjs ENFORCED_SKILLS', () => {
  const src = readFileSync(join(HOOKS_DIR, 'prompt-router.cjs'), 'utf8');
  const m = src.match(/const\s+ENFORCED_SKILLS\s*=\s*(\[[\s\S]*?\])/);

  test('the ENFORCED_SKILLS array literal is still parseable', () => {
    expect(m, 'could not find `const ENFORCED_SKILLS = [...]` in prompt-router.cjs').not.toBeNull();
  });

  test("contains '/act' and NOT '/run'", () => {
    const list = JSON.parse(m[1].replace(/'/g, '"'));
    expect(list, 'prompt-router no longer enforces delegation for /act').toContain('/act');
    expect(
      list,
      "prompt-router still enforces '/run'. That name now belongs to Claude Code's " +
        'built-in skill, so the hook would inject the cAgents delegation contract into an ' +
        'unrelated built-in invocation.',
    ).not.toContain('/run');
  });
});

// ---------------------------------------------------------------------------
// 3. trigger-collision.cjs reserved-name sets
// ---------------------------------------------------------------------------
// WI-08 MOVED `run` from RESERVED_SKILLS to RESERVED_BUILTINS rather than deleting
// it. That distinction is the whole point: if `run` were simply dropped, a future
// skill could take the name and silently re-shadow the Claude Code built-in.
describe('3. trigger-collision.cjs reserved names', () => {
  const tc = require(join(ROOT, 'scripts', 'ci', 'advisory', 'trigger-collision.cjs'));

  test("RESERVED_SKILLS has 'act' and not 'run'", () => {
    expect(tc.RESERVED_SKILLS.has('act')).toBe(true);
    expect(
      tc.RESERVED_SKILLS.has('run'),
      "'run' is back in RESERVED_SKILLS — it is a Claude Code BUILT-IN now, not a cAgents skill.",
    ).toBe(false);
  });

  test("RESERVED_BUILTINS still has 'run' (WI-08 moved it, did not delete it)", () => {
    expect(
      tc.RESERVED_BUILTINS.has('run'),
      "'run' was dropped from RESERVED_BUILTINS. It must stay reserved so a future cAgents " +
        'skill cannot silently re-shadow the Claude Code built-in `run`.',
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. hook-utils.cjs SESSION_PREFIXES  (NUL-byte site — require(), never grep)
// ---------------------------------------------------------------------------
describe('4. hook-utils.cjs SESSION_PREFIXES (read via require — file has a NUL byte)', () => {
  const { SESSION_PREFIXES } = require(join(HOOKS_DIR, 'hook-utils.cjs'));

  test('is an exported array', () => {
    expect(Array.isArray(SESSION_PREFIXES)).toBe(true);
  });

  test("contains 'act_' (the go-forward prefix)", () => {
    expect(SESSION_PREFIXES).toContain('act_');
  });

  test("STILL contains legacy 'run_' — deleting it orphans every pre-rename session", () => {
    expect(
      SESSION_PREFIXES,
      "'run_' was removed from hook-utils SESSION_PREFIXES. This fails SILENTLY: no error, " +
        'no crash — every hook that enumerates session directories simply stops seeing the ' +
        'pre-rename `run_*` sessions (21 live + 26 archived at rename time). The legacy ' +
        'reader is deliberate back-compat, not dead code. Do not "clean it up".',
    ).toContain('run_');
  });
});

// ---------------------------------------------------------------------------
// 5. .claude/rules/** paths: globs — rename-specific slice only
// ---------------------------------------------------------------------------
// The general "every glob resolves" invariant lives in
// tests/v12/rules-paths-globs-resolve.test.js and is NOT duplicated here.
describe('5. .claude/rules paths: globs do not reference the dead skills/run/ dir', () => {
  function rulesFiles(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) rulesFiles(full, out);
      else if (e.name.endsWith('.md')) out.push(full);
    }
    return out;
  }

  const globs = [];
  for (const file of rulesFiles(RULES_DIR)) {
    const fm = frontmatter(file);
    if (!fm || !Array.isArray(fm.paths)) continue;
    for (const glob of fm.paths) globs.push({ rel: file.replace(ROOT + '/', ''), glob });
  }

  test('sanity: found paths: globs to inspect', () => {
    expect(globs.length).toBeGreaterThan(0);
  });

  test('ZERO globs point at .claude/skills/run/', () => {
    const dead = globs.filter(({ glob }) => /(^|\/)\.claude\/skills\/run(?![\w-])/.test(glob));
    expect(
      dead,
      'a rules `paths:` glob targets the deleted .claude/skills/run/ directory. This fails ' +
        'OPEN and SILENTLY: the glob matches nothing, so the rule simply never loads again — ' +
        'no error is ever raised. Repoint it at .claude/skills/act/.',
    ).toEqual([]);
  });

  test('the repointed .claude/skills/act/ globs exist and resolve on disk', () => {
    const actGlobs = globs.filter(({ glob }) => glob.includes('.claude/skills/act'));
    // 11 rules files carried skills/run globs before the rename; they were all repointed.
    expect(
      actGlobs.length,
      'the .claude/skills/act/ paths: globs vanished from .claude/rules/ — the rules that ' +
        'scope to the pipeline skill are no longer loading.',
    ).toBeGreaterThanOrEqual(11);

    // Every non-wildcard prefix must exist. `**`/`*` segments are truncated away, so this
    // checks the concrete directory/file root rather than doing brittle glob expansion.
    const unresolved = actGlobs.filter(({ glob }) => {
      const concrete = glob.split('/').filter((seg) => !seg.includes('*')).join('/');
      return !existsSync(join(ROOT, concrete));
    });
    expect(unresolved, 'these act/ globs do not resolve to anything on disk').toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 6. skill-awareness.md exclusion list (the WI-13 behavioral fix)
// ---------------------------------------------------------------------------
// Without this, the planner sees the built-in `run` in every project's skill listing,
// mistakes it for the old cAgents entry point, and routes a work item into it.
describe('6. skill-awareness.md classifies `run` as a Claude Code built-in', () => {
  const doc = readFileSync(join(SKILLS_DIR, 'act', 'reference', 'skill-awareness.md'), 'utf8');

  test('names `run` as a Claude Code BUILT-IN skill', () => {
    expect(
      /built-in\s*\*{0,2}`run`\*{0,2}\s*skill/i.test(doc),
      "skill-awareness.md no longer identifies `run` as Claude Code's built-in skill. The " +
        'planner will see `run` in the workspace listing and can route a work item into it.',
    ).toBe(true);
  });

  test('instructs the planner never to select `run`', () => {
    expect(/never\s+select\s*\*{0,2}`run`/i.test(doc)).toBe(true);
  });

  test("lists `act` — and NOT `run` — among cAgents' own pipeline skills", () => {
    const own = doc.match(/own pipeline skills:[^\n]*/);
    expect(own, "could not find the \"cAgents' own pipeline skills:\" exclusion line").not.toBeNull();
    expect(own[0]).toMatch(/`act`/);
    expect(
      own[0],
      '`run` is listed as a cAgents pipeline skill again. It is a Claude Code built-in; ' +
        'excluding it under the wrong justification means the reason disappears if the ' +
        'own-skills list is ever regenerated.',
    ).not.toMatch(/`run`/);
  });
});

// ---------------------------------------------------------------------------
// 7. G2 CANARY — the rename must not have touched run-hook.cjs
// ---------------------------------------------------------------------------
// `run-hook.cjs` is the hook launcher. Its name contains "run" but has nothing to do
// with the /run skill; a blanket sed would have destroyed the entire hook system.
// Counting note: `git grep -o 'run-hook.cjs' -- .claude/settings.json | wc -l` returns
// 27, not 26 — 26 real hook "command" strings plus 1 prose mention inside the
// `$comment` metadata string. This test asserts the 26 REAL registrations by parsing
// settings.json as JSON and counting actual `command` values, which cannot be confused
// by prose and is immune to line numbers and formatting.
describe('7. G2 canary: run-hook.cjs launcher is untouched', () => {
  test('.claude/hooks/run-hook.cjs still exists', () => {
    expect(
      existsSync(join(HOOKS_DIR, 'run-hook.cjs')),
      'run-hook.cjs is gone. It is the hook launcher — its name is unrelated to the /run ' +
        'skill and it was explicitly out of scope for the rename (guardrail G2).',
    ).toBe(true);
  });

  test('.claude/settings.json registers exactly 26 hooks through run-hook.cjs', () => {
    const settings = JSON.parse(readFileSync(join(ROOT, '.claude', 'settings.json'), 'utf8'));
    const commands = [];
    for (const matchers of Object.values(settings.hooks || {})) {
      for (const matcher of matchers) {
        for (const hook of matcher.hooks || []) {
          if (typeof hook.command === 'string' && hook.command.includes('run-hook.cjs')) {
            commands.push(hook.command);
          }
        }
      }
    }
    expect(
      commands.length,
      'the number of hooks dispatched through run-hook.cjs changed. If the rename touched ' +
        'settings.json, the hook system is broken.',
    ).toBe(26);
  });
});

// ---------------------------------------------------------------------------
// 8. THE DRIFT GUARD — two independent SESSION_PREFIXES lists
// ---------------------------------------------------------------------------
// Highest-value assertion in this file. There are TWO prefix lists in the repo, in
// different trees, with no shared import. WI-20 found the session-gc one missing
// `act_` — which would have made every go-forward `act_` session invisible to garbage
// collection forever, with no error and no symptom until disk filled. This test binds
// the two lists together so they can never silently diverge again.
describe('8. both SESSION_PREFIXES lists agree (WI-20 drift guard)', () => {
  const hookUtils = require(join(HOOKS_DIR, 'hook-utils.cjs'));
  const sessionGc = require(join(ROOT, 'scripts', 'maintenance', 'session-gc.cjs'));

  test('session-gc.cjs exports its own SESSION_PREFIXES array', () => {
    expect(Array.isArray(sessionGc.SESSION_PREFIXES)).toBe(true);
  });

  test("session-gc.cjs SESSION_PREFIXES contains 'act_'", () => {
    expect(
      sessionGc.SESSION_PREFIXES,
      "scripts/maintenance/session-gc.cjs is missing 'act_'. This fails SILENTLY: garbage " +
        'collection enumerates session dirs by prefix, so every go-forward `act_` session ' +
        'becomes invisible to the GC forever and is never swept. This is the exact defect ' +
        'WI-20 caught by hand.',
    ).toContain('act_');
  });

  test("hook-utils.cjs SESSION_PREFIXES contains 'act_'", () => {
    expect(hookUtils.SESSION_PREFIXES).toContain('act_');
  });

  test('the two lists contain the same set of prefixes (order-insensitive)', () => {
    const a = [...hookUtils.SESSION_PREFIXES].sort();
    const b = [...sessionGc.SESSION_PREFIXES].sort();
    expect(
      b,
      'the two SESSION_PREFIXES lists have drifted apart. They are maintained independently ' +
        'in two trees with no shared import, so a prefix added to one and not the other ' +
        'silently breaks whichever consumer reads the shorter list. Keep them identical.',
    ).toEqual(a);
  });
});
