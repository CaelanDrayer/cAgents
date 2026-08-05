// WO-03 surface (c) guard: every `.claude/rules/**/*.md` file is path-gated.
//
// ROOT CAUSE this guard pins: a rules file with NO top-level `paths:` key loads
// UNCONDITIONALLY into every agent spawn — it has no predicate to evaluate, so there is
// no state of the world in which it is skipped. Before WO-03 (session
// `team_load-cut-program_260804_001`) 17 of the 43 rules files were in exactly that state,
// and the surface went unnoticed through an entire prior migration review precisely because
// an ABSENT key is invisible: nothing lists it, nothing warns, and the file reads as
// correct. Adding one more un-gated file silently reopens the whole surface.
//
// This test asserts, for EVERY `.claude/rules/**/*.md`:
//   (a) the file opens with a parseable YAML frontmatter block;
//   (b) that frontmatter carries a top-level `paths:` key;
//   (c) `paths:` is a non-empty list; and
//   (d) every entry is a non-empty string.
//
// Deliberately NOT asserted (see below): any count, total, byte size, line budget, or
// threshold. This is a PRESENCE-AND-STRUCTURE guard only.
//
// NIS-1 (standing user ruling, session `team_load-cut-program_260804_001`): no automated
// size check, byte budget, token gate, or blocking threshold — anywhere, including in
// tests. A correctly-gated NEW rules file must pass this test unchanged, and a large one
// must pass exactly as readily as a small one. If you are here to add a size assertion,
// that is the specific thing this comment exists to stop.
//
// Scope boundary vs the sibling: `tests/v12/rules-paths-globs-resolve.test.js` walks the
// same tree but starts where this one stops — it takes files that HAVE `paths:` and checks
// each glob resolves to a real path and is not rooted at a pre-move archetype dir. It
// `continue`s past any file lacking `paths:`, so an un-gated file is invisible to it. This
// test covers that blind spot; neither subsumes the other.
//
// Refs:
//   - .claude/rules/core/skill-format.md § "paths (V11.1.12+)"
//   - cagents-memory/sessions/team_load-cut-program_260804_001/outputs/wave-2/wo-03.md

import { describe, test, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const RULES_DIR = join(ROOT, '.claude', 'rules');

// --- collect every rules .md (repo-relative), sorted for stable row ordering ---
function collectRulesFiles() {
  const out = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.md')) out.push(full.replace(ROOT + '/', ''));
    }
  })(RULES_DIR);
  return out.sort();
}
const RULES_FILES = collectRulesFiles();

/**
 * The single classifier. Returns null when the file is correctly path-gated, or a
 * human-readable reason naming the specific defect. Pure over file TEXT so the self-test
 * below can exercise every branch without touching disk.
 */
function pathsDefect(txt) {
  const m = txt.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return 'no YAML frontmatter block — the file cannot carry a `paths:` predicate';

  let fm;
  try {
    fm = yaml.load(m[1]);
  } catch (err) {
    return `frontmatter is not valid YAML: ${err.message}`;
  }
  if (!fm || typeof fm !== 'object') return 'frontmatter parsed to a non-object';
  if (!('paths' in fm)) return 'no top-level `paths:` key — this file loads unconditionally';
  if (!Array.isArray(fm.paths)) return '`paths:` is present but is not a list';
  if (fm.paths.length === 0) return '`paths:` is an empty list — an empty predicate gates nothing';

  for (const [i, g] of fm.paths.entries()) {
    if (typeof g !== 'string') return `paths[${i}] is a ${typeof g}, not a string`;
    if (g.trim() === '') return `paths[${i}] is an empty string`;
  }
  return null;
}

describe('.claude/rules every file is path-gated (WO-03 surface (c) guard)', () => {
  test('sanity: the tree walk found rules files, including a known-stable anchor', () => {
    // Liveness check on the walker only. There is deliberately NO expected total and NO
    // upper bound here — adding correctly-gated rules files must never fail this test
    // (NIS-1). The anchor guards against a walk that silently returns almost nothing.
    expect(existsSync(RULES_DIR)).toBe(true);
    expect(RULES_FILES.length).toBeGreaterThan(0);
    expect(RULES_FILES).toContain('.claude/rules/core/execution.md');
  });

  test('the classifier itself rejects each un-gated shape and accepts a gated one', () => {
    // Self-test: proves this guard is capable of failing. Without it, a classifier that
    // returned null unconditionally would show 43 green rows and assert nothing.
    expect(pathsDefect('# no frontmatter at all\n')).toMatch(/no YAML frontmatter block/);
    expect(pathsDefect('---\npaths: [\n---\n')).toMatch(/not valid YAML|no top-level/);
    expect(pathsDefect('---\nname: x\n---\n')).toMatch(/no top-level `paths:` key/);
    expect(pathsDefect('---\npaths: "agents/**"\n---\n')).toMatch(/not a list/);
    expect(pathsDefect('---\npaths: []\n---\n')).toMatch(/empty list/);
    expect(pathsDefect('---\npaths:\n  - ""\n---\n')).toMatch(/empty string/);
    expect(pathsDefect('---\npaths:\n  - 42\n---\n')).toMatch(/not a string/);
    // ...and the correctly-gated shape passes:
    expect(pathsDefect('---\npaths:\n  - "agents/**"\n---\n\n# Body\n')).toBeNull();
  });

  test('no rules file loads unconditionally', () => {
    // Aggregate pass so a multi-file regression reports every offender at once rather
    // than making the fixer re-run the suite per file.
    const offenders = RULES_FILES.map((rel) => [rel, pathsDefect(readFileSync(join(ROOT, rel), 'utf8'))])
      .filter(([, defect]) => defect !== null)
      .map(([rel, defect]) => `  ${rel}\n      -> ${defect}`);

    expect(
      offenders,
      `${offenders.length} rules file(s) are not path-gated and therefore load into EVERY ` +
        `agent spawn:\n${offenders.join('\n')}\n\n` +
        `Fix: add a top-level \`paths:\` frontmatter block naming the files/dirs this rule ` +
        `actually governs (see .claude/rules/core/skill-format.md § "paths (V11.1.12+)" ` +
        `and any sibling in the same directory for the shape). If the file governs nothing ` +
        `specific, it does not belong under .claude/rules/.`,
    ).toEqual([]);
  });

  test.each(RULES_FILES)('%s carries a non-empty paths: predicate', (rel) => {
    expect(pathsDefect(readFileSync(join(ROOT, rel), 'utf8')), `${rel} is not path-gated`).toBeNull();
  });
});
