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
//   9. handoff/README.md + check-skill-session-paths.cjs -> zero /run at all
//  10. cagents-ci.sh + sync-versions.sh    -> present tense fixed, HISTORY kept
//  11. delegation.md `{run,team}`          -> bare brace form, slash-blind site
//  12. agent-tracking.md                   -> zero `cagents:run` in the examples
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

// ---------------------------------------------------------------------------
// WI-9 ADDITIONS — six MORE stale /run sites, found by hand, now pinned
// ---------------------------------------------------------------------------
// Blocks 1-8 above were written during the rename itself. AFTERWARDS, a closing
// hand-sweep found SIX further `/run` references that the automated pass had
// missed entirely — they shipped, silently, across v12.66.0-v12.66.2. Nothing
// broke loudly; they were simply wrong text pointing readers and future
// maintainers at a command that no longer exists. Blocks 9-12 pin all six.
//
// Why the automated pass missed them, and what that dictates about HOW these
// assertions are written:
//
//   (a) THE ANCHORED-PATTERN BLIND SPOT. The original sweep searched for the
//       slashed form `/run`. Two of the six sites spell it BARE, inside a comma
//       catalog or a brace expansion — `(run, team, designer, helper)` and
//       `{run,team}` — where the slash has been factored out. There is no `/run`
//       substring to match, so the sweep read those lines as clean. Blocks 10
//       and 11 pin the bare form explicitly.
//
//   (b) THE NAIVE-WHOLE-FILE-SCAN TRAP. The obvious guard ("assert this file
//       contains no /run") is WRONG for two of these files, because each one
//       DELIBERATELY RETAINS a historical `/run` describing a v12.1.2-era event
//       (`/improve` was folded into `/run`, which was only later renamed to
//       `/act`). A whole-file scan would fail against correct source, and the
//       natural way to "fix" a failing scan is to delete the history — losing
//       true provenance to satisfy a lazy assertion. So block 10 pins those two
//       files by CONTENT, line by line, asserting the present-tense line is
//       corrected AND the historical line still says `/run`. Where a whole-file
//       scan genuinely is safe, block 9 says so and shows the check that
//       established it.
//
// This is the same lesson as the NUL-byte trap documented at the top of this
// file: choose the matching strategy from the target file's actual contents,
// never from whichever pattern is easiest to type.

function readRepoFile(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

// Lines of `text` matching `re`, as `{ n, line }` with n 1-indexed. Assertions
// below compare against `[]` rather than a count so a failure message names the
// offending line and its number instead of just reporting "expected 0, got 1".
// `re` must not carry the /g flag — `.test()` on a global regex is stateful.
function linesMatching(text, re) {
  return text
    .split('\n')
    .map((line, i) => ({ n: i + 1, line: line.trim() }))
    .filter(({ line }) => re.test(line));
}

// ---------------------------------------------------------------------------
// 9. Prose sites that must carry ZERO /run (whole-file scan verified safe)
// ---------------------------------------------------------------------------
// Both files below contain the letters "run" only as the ENGLISH VERB — "Must be
// run inside a git work tree", "an install run with the cwd inside a session
// dir". Neither has any legitimate historical command reference. So for these
// two, and only these two, `zero occurrences of /run` is both correct and the
// strictest available assertion. (Contrast block 10, where the same assertion
// would be a bug.)
describe('9. prose files that must carry zero /run references', () => {
  const CASES = [
    {
      rel: 'scripts/handoff/README.md',
      present: /`\/act` or `\/team` pipeline requires them/,
      old: /`\/run` or `\/team` pipeline requires them/,
      what: 'the "not load-bearing pipeline code" disclaimer',
    },
    {
      rel: 'scripts/ci/check-skill-session-paths.cjs',
      present: /nested \/act or \/team teammate happens to have/,
      old: /nested \/run or \/team teammate happens to have/,
      what: 'the CWD-leak rationale in the file header',
    },
  ];

  for (const { rel, present, old, what } of CASES) {
    describe(rel, () => {
      const text = readRepoFile(rel);

      test(`${what} names the pipeline as "/act or /team"`, () => {
        expect(
          present.test(text),
          `${rel} no longer describes the pipeline as "/act or /team". This is a SILENT ` +
            'defect: the file still runs fine, it just documents a command that no longer ' +
            'exists, sending the next reader to a dead entry point.',
        ).toBe(true);
      });

      test('does NOT use the pre-rename "/run or /team" form', () => {
        expect(old.test(text), `${rel} reverted to the pre-rename "/run or /team" wording.`).toBe(false);
      });

      test('contains zero /run references anywhere in the file', () => {
        expect(
          linesMatching(text, /\/run/),
          `${rel} gained a /run reference. Verified at pin time: this file's only "run" is ` +
            'the English verb, and it holds no historical command reference — so any /run ' +
            'here is a live, wrong pointer at the removed skill. If a genuinely historical ' +
            'reference is ever added on purpose, NARROW this assertion to exclude that one ' +
            'line (see block 10 for how) — do not delete the assertion.',
        ).toEqual([]);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// 10. Present tense corrected, HISTORY deliberately kept (content-anchored)
// ---------------------------------------------------------------------------
// The two files here each hold BOTH a present-tense reference that had to change
// AND a historical one that must not. Every assertion is anchored to specific
// line content for that reason. Do not "simplify" any of these into a file-wide
// /run count — that is the exact mistake this block exists to prevent.
describe('10. cagents-ci.sh + sync-versions.sh: present tense fixed, history kept', () => {
  describe('scripts/ci/cagents-ci.sh', () => {
    const text = readRepoFile('scripts/ci/cagents-ci.sh');

    test('the check_skill_paths CWD-leak comment now reads "/act or /team"', () => {
      expect(
        /nested \/act or \/team teammate has a drifted cwd/.test(text),
        'the present-tense CWD-leak comment above check_skill_paths() no longer says ' +
          '"/act or /team". It documents which pipelines can drift their cwd — naming a ' +
          'removed command makes the guard unreadable to the next maintainer.',
      ).toBe(true);
    });

    test('no line reverted to "nested /run or /team teammate"', () => {
      expect(linesMatching(text, /nested \/run or \/team teammate/)).toEqual([]);
    });

    test('the HISTORICAL /improve comment still says "/run" — MUST KEEP', () => {
      expect(
        /\/improve \(folded into \/run,/.test(text),
        'the historical note in check_tiny_bump() lost its "/run". That "/run" is CORRECT ' +
          'and load-bearing history: /improve really was folded into /run in v12.1.2, and ' +
          '/run was renamed to /act only later. Rewriting it to /act would assert a thing ' +
          'that never happened. If a /run sweep flagged this line, the sweep is wrong.',
      ).toBe(true);
    });

    test('the historical line is the ONLY command-form /run left in the file', () => {
      // `(?![\w-])` excludes `/run-*` PATH tokens — this file names
      // `scripts/ci/run-advisory.cjs` twice. A naive `/run` grep matches THREE lines
      // here: one real reference plus two innocent file paths. That is precisely why
      // this file is pinned by content and not by a count.
      const hits = linesMatching(text, /\/run(?![\w-])/);
      expect(
        hits.map((h) => h.n),
        'a new command-form /run appeared in cagents-ci.sh (or the historical one was ' +
          'removed). Exactly one is expected: the v12.1.2 /improve note.',
      ).toHaveLength(1);
      expect(hits[0].line).toMatch(/\/improve \(folded into \/run,/);
    });
  });

  describe('scripts/sync-versions.sh', () => {
    const text = readRepoFile('scripts/sync-versions.sh');

    test('the header slot list reads "(act, team, designer, helper)"', () => {
      expect(
        /4 skill SKILL\.md frontmatter versions \(act, team, designer, helper\)/.test(text),
        'the sync-versions.sh header no longer lists the 4 active skills as ' +
          '(act, team, designer, helper). This is a BARE-FORM site: the slash is factored ' +
          'out of the catalog, so a /run sweep cannot see it — which is exactly how the ' +
          'stale "(run, team, designer, helper)" survived the rename.',
      ).toBe(true);
    });

    test('the SKILLS[] section comment reads "act, team, designer, helper"', () => {
      expect(/4 active skills: act, team, designer, helper/.test(text)).toBe(true);
    });

    test('neither skill catalog lists a bare `run` as an active skill', () => {
      expect(
        linesMatching(text, /(frontmatter versions|active skills:)[^\n]*\brun\b/),
        'a sync-versions.sh skill catalog lists `run` as an ACTIVE skill again. The ' +
          'catalogs enumerate the 4 SKILL.md files whose frontmatter version gets synced; ' +
          '`run` is not one of them and its SKILL.md no longer exists.',
      ).toEqual([]);
    });

    test('the HISTORICAL /improve comment still says "/run" — MUST KEEP', () => {
      expect(
        /\/improve folded into \/run \(now \/act\)/.test(text),
        'the v12.1.2 historical comment below SKILLS[] lost its "/run (now /act)" wording. ' +
          'That phrasing is deliberate: it records the real v12.1.2 event AND signposts the ' +
          'later rename. Do not flatten it to /act — that would erase the fold-in history.',
      ).toBe(true);
    });

    test('the historical line is the ONLY /run left in the file', () => {
      const hits = linesMatching(text, /\/run/);
      expect(hits.map((h) => h.n)).toHaveLength(1);
      expect(hits[0].line).toMatch(/\/improve folded into \/run \(now \/act\)/);
    });
  });
});

// ---------------------------------------------------------------------------
// 11. The bare-form brace expansion — a site no /run search can ever find
// ---------------------------------------------------------------------------
// `.claude/skills/{run,team}/SKILL.md` is shell brace-expansion shorthand. The
// slash sits BEFORE the brace, so the token `/run` never appears and every
// `/run` sweep reports the file clean. This one had to be found by eye.
describe('11. delegation.md brace expansion uses {act,team}', () => {
  const text = readRepoFile('.claude/rules/core/delegation.md');

  test('the enforcement-layer table points at `.claude/skills/{act,team}/SKILL.md`', () => {
    expect(
      /`\.claude\/skills\/\{act,team\}\/SKILL\.md`/.test(text),
      'the delegation enforcement table (layer 2) no longer names ' +
        '`.claude/skills/{act,team}/SKILL.md`. That row tells a reader which skill bodies ' +
        're-state the delegation rule; pointing it at a path that does not exist makes the ' +
        'contract untraceable.',
    ).toBe(true);
  });

  test('does NOT point at the dead `{run,team}` expansion', () => {
    expect(
      linesMatching(text, /skills\/\{run,team\}/),
      'delegation.md points at `.claude/skills/{run,team}/SKILL.md` again. `.claude/skills/' +
        'run/` was deleted in the rename, so half this path resolves to nothing. Note this ' +
        'site is INVISIBLE to a `/run` search — the slash precedes the brace — which is how ' +
        'it survived the original sweep.',
    ).toEqual([]);
  });

  test('carries no /run and no bare `{run,` anywhere', () => {
    expect(linesMatching(text, /\/run|\{run,/)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 12. agent-tracking.md self-registration examples
// ---------------------------------------------------------------------------
// These YAML blocks are COPY TARGETS: /act reads this reference and writes the
// shown `type:` / `cagents_type:` values straight into agent_tree.yaml. A stale
// `cagents:run` here is not a typo in prose — it propagates into live session
// state and mislabels the pipeline root in every agent tree built from it.
describe('12. agent-tracking.md examples register as cagents:act', () => {
  const text = readRepoFile('.claude/skills/act/reference/agent-tracking.md');

  test('contains ZERO `cagents:run`', () => {
    expect(
      linesMatching(text, /cagents:run/),
      'agent-tracking.md shows `cagents:run` again. These YAML blocks are copied verbatim ' +
        'into agent_tree.yaml by /act self-registration, so the stale type propagates into ' +
        'live session state and every downstream consumer that matches on agent type.',
    ).toEqual([]);
  });

  test('all three self-registration examples use `cagents:act`', () => {
    // Three sites: `type:` and `cagents_type:` in the root-entry block, plus the
    // `cagents_type:` in the spawned-as-subagent block.
    expect(
      (text.match(/cagents:act/g) || []).length,
      'the agent-tracking.md examples lost one or more `cagents:act` values.',
    ).toBeGreaterThanOrEqual(3);
  });
});
