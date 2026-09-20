// Unit tests for scripts/ste100/mechanize.cjs.
//
// Two kinds of test live here. A transform test proves that the rewriter
// produces the punctuation that the STE-100 standard asks for. An exclusion
// test proves that a protected surface comes back byte-identical.
//
// The exclusion tests are the load-bearing ones. A transform that is merely
// wrong is caught by the WI-041 review of the dry-run diff. A transform that
// edits a fenced code block or a string literal corrupts the repository.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const NUL = String.fromCharCode(0);
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'ste100', 'mechanize.cjs');
const mech = require(SCRIPT);

/** Transform a string and return the result text. */
function run(file, text, opts) {
  return mech.transformText(file, text, opts || {}).text;
}

/** Assert the input comes back byte-identical. */
function unchanged(file, text) {
  const out = mech.transformText(file, text, {});
  expect(out.text).toBe(text);
  expect(out.changed).toBe(false);
}

// ---------------------------------------------------------------------------
// TRANSFORM 1: context-sensitive dash replacement
// ---------------------------------------------------------------------------

describe('transform 1: em dash, case (a) parenthetical pair is DISABLED', () => {
  // DECISION D6. Case (a) turned a bracketing pair into a COMMA PAIR, and a
  // comma pair destroys a run-in bold label and an appositive: "the check, a
  // cheap one, runs first" reads as a three-item list and the aside is gone.
  // 119-182 sites carry the shape. The pair is still DETECTED; detection now
  // feeds a NO-CHANGE verdict, so both dashes come back byte-identical for the
  // phase P5 human judgement pass.
  it('leaves a bracketing pair byte-identical', () => {
    unchanged('a.md', 'The hook — which is CJS only — runs first.\n');
  });

  it('leaves a pair written with no surrounding spaces byte-identical', () => {
    unchanged('a.md', 'The hook—which is CJS only—runs first.\n');
  });

  it('leaves a pair that wraps across a line byte-identical, and keeps the lines', () => {
    const input = 'The planner — which the orchestrator spawns\nfirst — writes the plan.\n';
    const out = run('a.md', input);
    expect(out).toBe(input);
    expect(out.split('\n').length).toBe(input.split('\n').length);
  });

  it('never converts ONE dash of a pair and leaves the other', () => {
    // The fall-through is "skip", never "comma". A paired dash that fell
    // through to the single-dash path would write a bare comma at exactly the
    // site the defect class names.
    const out = run('a.md', 'The hook — which is CJS only — runs first.\n');
    expect((out.match(/—/g) || []).length).toBe(2);
    expect(out).not.toContain(',');
  });
});

describe('transform 1: em dash, case (b) appositive or list introducer', () => {
  it('turns a single dash in front of an expansion into a colon', () => {
    expect(run('b.md', 'Two classes of figures — MEASURED and ESTIMATE.\n'))
      .toBe('Two classes of figures: MEASURED and ESTIMATE.\n');
  });

  it('turns a definition dash after a bold term into a colon', () => {
    expect(run('b.md', '- **Waypoint** — a resume checkpoint on disk.\n'))
      .toBe('- **Waypoint**: a resume checkpoint on disk.\n');
  });

  it('never capitalises the word after a colon', () => {
    const out = run('b.md', '- **Waypoint** — a resume checkpoint on disk.\n');
    expect(out).toContain(': a resume');
  });

  it('never produces a doubled colon', () => {
    const out = run('b.md', '- **Waypoint**: the disk record — a resume checkpoint.\n');
    expect(out).not.toContain('::');
    expect(out).toBe('- **Waypoint**: the disk record, a resume checkpoint.\n');
  });
});

describe('transform 1: em dash, case (c) is DISABLED globally', () => {
  // WI-041b. Case (c) turned a dash between two independent clauses into a
  // sentence break: a full stop plus a capital on the next word. That one rule
  // produced R14, R16, R17 and R18. The classifier now emits a comma or a
  // colon and nothing else, and the shape that used to take case (c) falls
  // through to NO CHANGE. The fall-through is never a bare comma.
  it('leaves a dash between two independent clauses byte-identical', () => {
    unchanged('c.md', 'The test failed — the build was already broken.\n');
    unchanged('c.md', 'The gate passed — the reviewer was satisfied by then.\n');
  });

  it('never emits a full stop for a dash, in any context', () => {
    const inputs = [
      'The test failed — the build was already broken.\n',
      'The gate passed — the reviewer was satisfied by then.\n',
      ' * Errors are swallowed — team-stop must never fail because of extraction.\n',
      'The rule lives in docs/example-store/ex.md — the planner reads it now.\n'
    ];
    for (const src of inputs) {
      const file = src.startsWith(' *') ? 'a.cjs' : 'c.md';
      // The dash region is [ \t]*<dash>[ \t]*, so a break would leave ". " or
      // a line-final "." exactly where the dash sat.
      expect(run(file, src)).not.toMatch(/[a-z)\]"']\.\s+[A-Z]/);
    }
  });

  it('uses a comma in front of a coordinating conjunction', () => {
    expect(run('c.md', 'It works — but only on Linux.\n'))
      .toBe('It works, but only on Linux.\n');
    expect(run('c.md', 'It works — and the gate agrees.\n'))
      .toBe('It works, and the gate agrees.\n');
    expect(run('c.md', 'It works — so the gate agrees.\n'))
      .toBe('It works, so the gate agrees.\n');
    expect(run('c.md', 'It works — or the gate fails.\n'))
      .toBe('It works, or the gate fails.\n');
  });

  it('never breaks in front of a token that cannot open a sentence', () => {
    for (const w of ['and', 'but', 'or', 'so']) {
      expect(run('c.md', `The run was fine — ${w} the gate was not.\n`)).not.toContain('. ' + w);
    }
  });

  it('never puts a full stop after a path, which would extend the path token', () => {
    const out = run('c.md', 'The rule lives in docs/example-store/ex.md — the planner reads it now.\n');
    expect(out).not.toContain('ex.md.');
    // Both sides are clauses, so this is the former case (c): no change at all.
    expect(out).toBe('The rule lives in docs/example-store/ex.md — the planner reads it now.\n');
  });
});

describe('transform 1: the en dash is never transformed', () => {
  // WI-041b. In this corpus an en dash is a RANGE joiner, not sentence
  // punctuation, and rule 0 only recognised the digit-digit shape. Every other
  // range shape fell through and was destroyed. The transform is now restricted
  // to the em dash (U+2014).
  it('leaves an en dash byte-identical, whatever its role', () => {
    unchanged('e.md', 'It works – but only on Linux.\n');
    unchanged('e.md', 'Two classes of figures – MEASURED and ESTIMATE.\n');
    unchanged('e.md', 'The gate runs – the reviewer reads the report after it.\n');
  });

  it('leaves a true numeric range untouched', () => {
    unchanged('r.md', 'Keep the count at 3–5 items for a wave.\n');
    unchanged('r.md', 'The plan covers 2026–2027 and nothing else.\n');
    unchanged('r.md', 'Use 3—5 workers when the queue is deep.\n');
  });

  it('still fixes an em dash on a line that also carries a range', () => {
    // POSITIVE CONTROL: the en-dash exclusion is not a blanket line skip.
    const out = run('r.md', 'The wave takes 3–5 items — a hard cap on the queue.\n');
    expect(out).toContain('3–5 items');
    expect(out).toBe('The wave takes 3–5 items, a hard cap on the queue.\n');
  });

  it('collapses a doubled space that a substitution would create', () => {
    // WI-041 R10 narrowed the tidy step: a run of spaces is closed only when an
    // edit landed ON the run. The deletion of "basically" does exactly that.
    // The old input here used a dash behind a two-space gutter, which R10 now
    // classifies as a layout glyph and leaves alone. See the R10 test below.
    expect(run('s.md', 'The gate is basically  a check of the record.\n'))
      .toBe('The gate is a check of the record.\n');
  });
});

// ---------------------------------------------------------------------------
// TRANSFORM 2: ALL-CAPS emphasis reduction
// ---------------------------------------------------------------------------

describe('transform 2: ALL-CAPS emphasis reduction', () => {
  it('lowercases an emphasis word', () => {
    expect(run('c.md', 'You MUST NEVER edit that file.\n'))
      .toBe('You must never edit that file.\n');
  });

  it('capitalises an emphasis word that opens a sentence', () => {
    expect(run('c.md', 'Read the plan. ALWAYS read the plan first.\n'))
      .toBe('Read the plan. Always read the plan first.\n');
  });

  it('keeps a bold span and lowercases the word inside it', () => {
    expect(run('c.md', 'The gate is **MANDATORY** for every run.\n'))
      .toBe('The gate is **mandatory** for every run.\n');
  });

  it('skips an acronym or an initialism', () => {
    for (const w of ['YAML', 'CSV', 'API', 'HTTP', 'CJS', 'CI', 'HITL', 'WCAG', 'OWASP', 'SLA', 'JWT', 'URL', 'MCP', 'PR']) {
      expect(mech.ACRONYM_ALLOWLIST.has(w)).toBe(true);
      unchanged('c.md', `The run reads the ${w} value from the record.\n`);
    }
  });

  it('skips a pipeline state name', () => {
    for (const w of ['INIT', 'ORCHESTRATED', 'PLANNED', 'COORDINATED', 'VALIDATED', 'PASS', 'FAIL', 'REVISE', 'BLOCKED', 'DONE', 'NEEDS_CONTEXT', 'DONE_WITH_CONCERNS']) {
      expect(mech.PIPELINE_STATES.has(w)).toBe(true);
      unchanged('c.md', `The state moves to ${w} when the gate returns.\n`);
    }
  });

  it('skips a token that the same file uses inside a code span', () => {
    const input = 'Set `MUST` in the record, then the parser MUST read it.\n';
    unchanged('c.md', input);
    expect(mech.collectCodeTokens(input).caps.has('MUST')).toBe(true);
  });

  it('skips a snake-case or screaming-snake identifier', () => {
    unchanged('c.md', 'The record holds MUST_RUN and NEEDS_CONTEXT for the gate.\n');
  });

  it('skips a single letter, a roman numeral, an HTTP verb and a token with a digit', () => {
    unchanged('c.md', 'Phase A and phase II and the GET call and the V11 tag stay.\n');
  });

  it('never lowercases an emphasis word inside an inline code span', () => {
    unchanged('c.md', 'The literal `ALWAYS NEVER` stays exactly as written here.\n');
  });

  it('has no overlap between the emphasis list and the protected lists', () => {
    for (const w of mech.EMPHASIS_WORDS) {
      expect(mech.ACRONYM_ALLOWLIST.has(w)).toBe(false);
      expect(mech.PIPELINE_STATES.has(w)).toBe(false);
      expect(mech.HTTP_VERBS.has(w)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// TRANSFORM 3: slash removal
// ---------------------------------------------------------------------------

describe('transform 3: slash removal', () => {
  // DECISION D6. This transform is DROPPED from the command line: main() starts
  // its skip set with "slash" in it, so no corpus run reaches it. The tests
  // below call the MODULE API directly and are kept because they document what
  // transformSlash() still does for a caller that asks for it by name.
  it('removes an ambiguous prose slash', () => {
    // The old input here was REST/GraphQL, which WI-041 R4 confirmed is an
    // acronym pair and a name, not a disjunction. See the R4 test below.
    expect(run('c.md', 'The router handles frontend/backend work for the team.\n'))
      .toBe('The router handles frontend or backend work for the team.\n');
  });

  it('keeps the literal and/or', () => {
    unchanged('c.md', 'The gate accepts one and/or the other value here.\n');
    expect(mech.SLASH_KEEP.has('and/or')).toBe(true);
  });

  it('leaves a path slash alone', () => {
    unchanged('c.md', 'The rule lives in scripts/ci and nothing else reads it.\n');
    unchanged('c.md', 'Read docs/example-store/ex.md before the first write here.\n');
    unchanged('c.md', 'The file agents/backend-developer.md holds the roster.\n');
  });

  it('leaves a URL, a date and a regex slash alone', () => {
    unchanged('c.md', 'Get the specification from https://asd-ste100.org/spec/page now.\n');
    unchanged('c.md', 'The stamp reads 2026/09/17 and the gate keeps it.\n');
  });

  it('leaves a slash inside an inline code span alone', () => {
    unchanged('c.md', 'The literal `REST/GraphQL` stays exactly as it is written.\n');
  });
});

// ---------------------------------------------------------------------------
// TRANSFORM 4: the WI-011 substitution table
// ---------------------------------------------------------------------------

describe('transform 4: the WI-011 substitution table', () => {
  // DECISION D6. This transform is DROPPED from the command line: main() starts
  // its skip set with "words" in it, so no corpus run reaches it. The tests
  // below call the MODULE API directly and are kept because they document what
  // transformWords() still does for a caller that asks for it by name.
  it('applies the ASD verb rows', () => {
    expect(run('c.md', 'The hook will utilize the record for the gate.\n'))
      .toBe('The hook will use the record for the gate.\n');
    expect(run('c.md', 'The plan will require a second reviewer here.\n'))
      .toBe('The plan will need a second reviewer here.\n');
    expect(run('c.md', 'The gate will modify the record before the write.\n'))
      .toBe('The gate will change the record before the write.\n');
  });

  it('applies the ASD phrase rows', () => {
    expect(run('c.md', 'Read the plan in order to place the first work item.\n'))
      .toBe('Read the plan to place the first work item.\n');
    expect(run('c.md', 'Read the record prior to the first write of a file.\n'))
      .toBe('Read the record before the first write of a file.\n');
  });

  it('applies an adjective row and keeps the case of the source', () => {
    expect(run('c.md', 'Numerous agents read the plan at the same time.\n'))
      .toBe('Many agents read the plan at the same time.\n');
  });

  it('deletes a filler adverb and keeps every function word', () => {
    const out = run('c.md', 'The gate is basically a check of the record.\n');
    expect(out).toBe('The gate is a check of the record.\n');
    for (const w of [' is ', ' a ', ' the ', ' of ']) expect(out).toContain(w);
  });

  it('never deletes an article, a copula or the word "that" (M6)', () => {
    const input = 'The run is a check that the record is a file and the gate is that too.\n';
    const out = run('c.md', input);
    const count = (s, w) => (s.match(new RegExp('\\b' + w + '\\b', 'g')) || []).length;
    for (const w of ['The', 'the', 'is', 'a', 'that']) {
      expect(count(out, w)).toBe(count(input, w));
    }
  });

  it('never deletes a filler adverb that a line NAMES rather than uses', () => {
    // .claude/rules/quality/anti-slop.md carries this line verbatim.
    unchanged('c.md', '### H\nRemove filler adverbs: really, just, literally, genuinely, simply, actually, fundamentally, inherently, essentially, effectively, ultimately, importantly, significantly, arguably.\n');
  });

  it('still deletes a filler adverb that a sentence uses', () => {
    expect(run('c.md', 'The gate is basically a check, and it is actually simple, so it really works.\n'))
      .toBe('The gate is a check, and it is simple, so it works.\n');
  });

  it('never strands a doubled comma when it deletes two adjacent adverbs', () => {
    const out = run('c.md', 'The run is fast, basically, and the gate is simply green.\n');
    expect(out).not.toContain(',,');
    expect(out).not.toMatch(/ ,/);
  });

  it('keeps "rather than", which is not the filler adverb', () => {
    unchanged('c.md', 'Read the range rather than the whole file for a check.\n');
  });

  it('never applies a row inside an inline code span', () => {
    unchanged('c.md', 'The flag `--utilize` and the token `require` stay as written.\n');
  });

  it('never applies a row inside quoted example text (M10)', () => {
    unchanged('c.md', 'The record says "utilize the API" and the gate keeps it.\n');
  });

  it('reports an advisory row and never edits it', () => {
    const input = 'The system is robust and typically reads the plan first.\n';
    unchanged('c.md', input);
    const hits = mech.advisories('c.md', input).map((h) => h.word);
    expect(hits).toContain('robust');
    expect(hits).toContain('typically');
  });
});

// ---------------------------------------------------------------------------
// ABSOLUTE EXCLUSIONS: each one returns byte-identical input
// ---------------------------------------------------------------------------

describe('absolute exclusion: fenced code blocks', () => {
  it('protects a nested fence, where rules.cjs and invariants.sh disagree', () => {
    const rel = 'docs/templates/UNIVERSAL_AGENT_TEMPLATE.md';
    const input = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    const fenced = mech.invariantFenceLines(rel, input);
    expect(fenced.size).toBeGreaterThan(100);
    const out = mech.transformText(rel, input, {}).text;
    const a = input.split('\n');
    const b = out.split('\n');
    for (const n of fenced) expect(b[n - 1]).toBe(a[n - 1]);
  });

  it('returns a fenced block byte-identical', () => {
    unchanged('x.md', [
      '```bash',
      'echo "MUST — utilize the API" # NEVER/ALWAYS',
      'grep -n "require" scripts/ci/run.sh',
      '```',
      '',
    ].join('\n'));
  });

  it('returns a tilde fence byte-identical', () => {
    unchanged('x.md', '~~~\nMUST — utilize the API and/or REST/GraphQL\n~~~\n');
  });
});

describe('absolute exclusion: inline code spans', () => {
  it('returns a line that is only a code span byte-identical', () => {
    unchanged('x.md', 'A line with `MUST — utilize a REST/GraphQL API` and no more.\n');
  });

  it('returns a double-backtick span byte-identical', () => {
    unchanged('x.md', 'A line with ``a ` and MUST — utilize`` inside of it here.\n');
  });
});

describe('absolute exclusion: string literals in .cjs and .js', () => {
  it('returns every non-comment line of a .cjs file byte-identical', () => {
    const input = [
      'const MSG = "MUST — utilize the REST/GraphQL API";',
      "const OTHER = 'NEVER — require it';",
      'function f() { return MSG + OTHER; }',
      '',
    ].join('\n');
    unchanged('x.cjs', input);
  });

  it('returns every non-comment line of a .js test file byte-identical', () => {
    unchanged('tests/x.test.js', 'expect(out).toBe("MUST — utilize the API");\n');
  });

  it('edits a comment line in a code file and keeps the comment markers', () => {
    const out = run('x.cjs', '// The hook will utilize the record.\nconst a = "utilize";\n');
    expect(out).toBe('// The hook will use the record.\nconst a = "utilize";\n');
  });

  it('keeps the closing marker of a block comment', () => {
    const out = run('x.cjs', '/* The hook will utilize the record. */\n');
    expect(out).toBe('/* The hook will use the record. */\n');
  });
});

describe('absolute exclusion: YAML frontmatter and the agent description line', () => {
  it('returns frontmatter byte-identical', () => {
    unchanged('agents/x.md', [
      '---',
      'name: x',
      'description: MUST — utilize the REST/GraphQL API and/or the CSV record',
      'model: sonnet',
      '---',
      '',
    ].join('\n'));
  });

  it('edits the body but never the frontmatter of the same file', () => {
    const input = [
      '---',
      'description: The agent will utilize the API — always.',
      '---',
      '',
      'The agent will utilize the API.',
      '',
    ].join('\n');
    const out = run('agents/x.md', input);
    expect(out.split('\n')[1]).toBe('description: The agent will utilize the API — always.');
    expect(out.split('\n')[4]).toBe('The agent will use the API.');
  });
});

describe('absolute exclusion: headings, tables, rules and HTML comments', () => {
  it('returns a heading byte-identical, because invariant 1 freezes it', () => {
    unchanged('x.md', '## The gate MUST — utilize the API\n');
    unchanged('x.md', '# MUST/NEVER — the rule\n');
  });

  it('returns a table row byte-identical', () => {
    unchanged('x.md', '| Flag | Meaning |\n|---|---|\n| MUST — utilize | REST/GraphQL |\n');
  });

  it('returns a horizontal rule and an HTML comment byte-identical', () => {
    unchanged('x.md', '---\n');
    unchanged('x.md', '<!-- MUST — utilize the REST/GraphQL API -->\n');
  });
});

describe('absolute exclusion: exempt paths, CHANGELOG.md and RELEASE_NOTES.md', () => {
  it('names CHANGELOG.md and docs/RELEASE_NOTES.md in the hard exclusion list', () => {
    expect(mech.HARD_EXCLUDE).toContain('CHANGELOG.md');
    expect(mech.HARD_EXCLUDE).toContain('docs/RELEASE_NOTES.md');
  });

  it('writes no diff for CHANGELOG.md or docs/RELEASE_NOTES.md', () => {
    const r = spawnSync('node', [SCRIPT, '--dry-run', '--quiet', 'CHANGELOG.md', 'docs/RELEASE_NOTES.md'], {
      cwd: REPO_ROOT, encoding: 'utf8', timeout: 60000,
    });
    expect(r.error).toBeUndefined();
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
    expect(r.stderr).toContain('0 file(s) to process');
  });

  it('honours every glob in scripts/ste100/exempt.txt', () => {
    const rules = require(path.join(REPO_ROOT, 'scripts', 'ste100', 'rules.cjs'));
    const raw = fs.readFileSync(path.join(REPO_ROOT, 'scripts', 'ste100', 'exempt.txt'), 'utf8');
    const globs = raw.split('\n')
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => l.replace(/#.*$/, '').trim())
      .filter(Boolean);
    expect(globs.length).toBe(11);
    const samples = {
      'CHANGELOG.md': true,
      'docs/RELEASE_NOTES.md': true,
      'docs/MIGRATION-V11.md': true,
      'archive/docs/old.md': true,
      'cagents-memory/_archive/s/x.md': true,
      'tests/fixtures/owasp/x.md': true,
      'cagents-memory/sessions/act_x/plan.md': true,
      'node_modules/pkg/README.md': true,
      '.git/COMMIT_EDITMSG': true,
      '.omc/x.md': true,
      '.claude/sessions/x.md': true,
      'agents/architect.md': false,
      'CLAUDE.md': false,
    };
    for (const [p, expected] of Object.entries(samples)) {
      expect(globs.some((g) => rules.globMatch(p, g))).toBe(expected);
    }
  });
});

describe('absolute exclusion: test assertion text under tests/', () => {
  it('returns an assertion string byte-identical', () => {
    unchanged('tests/hooks/x.test.js', [
      "expect(msg).toBe('The gate is MANDATORY — utilize the API');",
      'expect(out).toContain("REST/GraphQL");',
      '',
    ].join('\n'));
  });
});

// ---------------------------------------------------------------------------
// STRUCTURE AND IDEMPOTENCE
// ---------------------------------------------------------------------------

describe('structure', () => {
  it('never changes the line count of a file', () => {
    const input = fs.readFileSync(path.join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
    const out = mech.transformText('CLAUDE.md', input, {});
    expect(out.text.split('\n').length).toBe(input.split('\n').length);
  });

  it('reads a file that carries a NUL byte, which grep would drop (TRAP 2)', () => {
    const rel = '.claude/hooks/hook-utils.cjs';
    const input = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    expect(input.indexOf(' ')).toBeGreaterThan(-1);
    const out = mech.transformText(rel, input, {});
    expect(out.text.split('\n').length).toBe(input.split('\n').length);
    expect(out.text.indexOf(' ')).toBeGreaterThan(-1);
  });

  it('shells out to nothing, so it cannot use awk (TRAP 1)', () => {
    const src = fs.readFileSync(SCRIPT, 'utf8');
    const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(code).not.toMatch(/child_process/);
    expect(code).not.toMatch(/\bawk\b/);

  });

  it('produces a unified diff with a header and a hunk', () => {
    const before = 'The hook will utilize the record.\n';
    const after = mech.transformText('x.md', before, {}).text;
    const diff = mech.unifiedDiff('x.md', before, after);
    expect(diff).toContain('--- a/x.md');
    expect(diff).toContain('+++ b/x.md');
    expect(diff).toContain('@@ -1,');
    expect(diff).toContain('-The hook will utilize the record.');
    expect(diff).toContain('+The hook will use the record.');
  });
});

describe('idempotence', () => {
  const corpus = [
    'The hook — which is CJS only — runs first.\n',
    'Two classes of figures — MEASURED and ESTIMATE.\n',
    'The test failed — the build was already broken.\n',
    'You MUST NEVER utilize the REST/GraphQL API in order to pass.\n',
    'It works – but only on Linux, and the range 3–5 holds.\n',
    '- **Waypoint** — a resume checkpoint that the run will require.\n',
  ];

  it('produces the same text on a second pass', () => {
    for (const text of corpus) {
      const once = mech.transformText('x.md', text, {}).text;
      const twice = mech.transformText('x.md', once, {});
      expect(twice.text).toBe(once);
      expect(twice.changed).toBe(false);
    }
  });

  it('reaches a fixed point in one call, not across two calls', () => {
    const input = 'The gate is basically a check, and it is actually simple, so it really works.\n';
    const once = mech.transformText('x.md', input, {}).text;
    expect(mech.transformText('x.md', once, {}).changed).toBe(false);
    expect(once).not.toContain('basically');
    expect(once).not.toContain('actually');
    expect(once).not.toContain('really');
  });

  it('is idempotent on a real repository file', () => {
    for (const rel of ['CLAUDE.md', 'README.md', '.claude/rules/core/delegation.md', '.claude/rules/quality/anti-slop.md', 'docs/templates/UNIVERSAL_AGENT_TEMPLATE.md']) {
      const input = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
      const once = mech.transformText(rel, input, {}).text;
      const twice = mech.transformText(rel, once, {});
      expect(twice.changed, rel).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// WI-041 REGRESSIONS: one per confirmed defect of the corpus dry-run review.
// Every input line below is VERBATIM from the corpus diff that found the bug.
// ---------------------------------------------------------------------------

describe('WI-041 regressions', () => {
  it('R1: a slashless filename is never rewritten', () => {
    // "verify" fired on the first component of verify-completion.cjs and the
    // line came back as "make sure-completion.cjs". 71 sites.
    unchanged('a.md', 'The verify-completion.cjs hook (and post-compact-restore.cjs after compaction) reads pipeline_state\n');
    expect(mech.maskProtected('The verify-completion.cjs hook reads it.'))
      .not.toContain('verify-completion.cjs');
    // The bare verb still converts, so the mask is not a blanket line skip.
    expect(run('a.md', 'The gate will verify the record before the write.\n'))
      .toBe('The gate will make sure the record before the write.\n');
  });

  it('R2: verified, verifies and verifying are never rewritten', () => {
    // "made sure" is ungrammatical as an adjective and a participle, and
    // "verified" is the literal name of a pass-rate counter. 66 sites.
    unchanged('a.cjs', ' * passRate = verified / (verified + failed). When passRate < 0.8 AND\n');
    unchanged('a.md', '**Last verified**: v12.42.0\n');
    expect(run('a.cjs', ' * the plugin IS the project). BOTH are sentinel-verified, so a foreign\n'))
      .toBe(' * the plugin IS the project). Both are sentinel-verified, so a foreign\n');
    for (const w of ['verified', 'verifies', 'verifying']) {
      expect(mech.INFLECTED_VERBS.some((r) => r.from === w)).toBe(false);
    }
    // The bare verb row survives.
    expect(mech.SUBSTITUTIONS.some((r) => r.from === 'verify' && r.to === 'make sure')).toBe(true);
  });

  it('R3: might is never rewritten, and a named list is never rewritten', () => {
    // "might" -> "can" inverts the modal, and the first line NAMES the words it
    // lists rather than using them. 17 sites.
    unchanged('a.md', 'Hedging words (might, could potentially, perhaps, arguably), vague future\n');
    unchanged('a.md', 'Does the copy address the top 2-3 reasons the audience might not convert?\n');
    expect(mech.SUBSTITUTIONS.some((r) => r.from === 'might')).toBe(false);
    // The same row still fires when a sentence USES it.
    expect(run('a.md', 'The gate could potentially read the record twice.\n'))
      .toBe('The gate can read the record twice.\n');
  });

  it('R4: an acronym pair or a compound technical name keeps its slash', () => {
    // The slash transform turned a name into a disjunction. 160 sites.
    unchanged('a.md', 'the outer FAIL/REVISE pipeline loop is capped at **3 total cycles**\n');
    unchanged('a.md', '- **LTV/CAC Ratio**: Lifetime value divided by customer acquisition cost\n');
    unchanged('a.md', 'Use SSL/TLS and SQL/NoSQL and UI/UX and REST/GraphQL and JSON/YAML here.\n');
    unchanged('a.md', 'The CEO/CFO pair reviews IRR/NPV, MQL/SQL, GiST/GIN and ENOENT/EACCES too.\n');
    unchanged('a.md', 'The try/catch and fork/exec and producer/consumer and client/server shapes.\n');
    unchanged('a.md', 'The setuid/setgid and upstream/downstream and encode/decode calls stay.\n');
    unchanged('a.md', 'The input/output and push/pull and start/stop and open/close pairs stay.\n');
    unchanged('a.md', 'A deny/allow list and the COORDINATED/VALIDATED move both stay as written.\n');
    for (const p of ['try/catch', 'fork/exec', 'producer/consumer', 'request/response',
                     'client/server', 'setuid/setgid', 'upstream/downstream', 'input/output',
                     'encode/decode', 'push/pull', 'start/stop', 'open/close', 'deny/allow']) {
      expect(mech.SLASH_KEEP.has(p)).toBe(true);
    }
    // A genuine prose disjunction still converts.
    expect(run('a.md', 'The router handles frontend/backend work for the team.\n'))
      .toBe('The router handles frontend or backend work for the team.\n');
  });

  it('R5: the verdict pair MET / NOT MET is never half-cased', () => {
    // "MET/not MET" is neither the verdict nor prose. 4 sites.
    unchanged('a.md', 'Each criterion in work_items.yaml has a MET/NOT MET verdict with specific evidence\n');
    unchanged('a.md', "a claimed output file that isn't present is automatic NOT MET for any criterion relying on it\n");
    expect(mech.PIPELINE_STATES.has('MET')).toBe(true);
  });

  it('R6: a filler adverb welded into a hyphenated compound is never deleted', () => {
    // The deletion ate the space in front and produced "the-rewritten". 14 sites.
    unchanged('a.cjs', " * a systemMessage that could attach to the just-rewritten assistant turn's\n");
    unchanged('a.md', '- **Just-in-Time Over Just-in-Case**: Provide exactly what a rep needs\n');
    unchanged('a.cjs', '//   TR1 over-broad   - a trigger that is a single very-common word or <=2 chars\n');
    // A free-standing filler adverb is still deleted.
    expect(run('a.md', 'The gate is basically a check of the record.\n'))
      .toBe('The gate is a check of the record.\n');
  });

  it('R7: "is capable of" is an advisory row, never a substitution', () => {
    // The approved word left a bare gerund: "this guard can failing". 1 site.
    const input = '    // Self-test: proves this guard is capable of failing. Without it, a classifier that\n';
    unchanged('a.cjs', input);
    expect(mech.advisories('a.cjs', input).map((h) => h.word)).toContain('is capable of');
    expect(mech.SUBSTITUTIONS.some((r) => r.from === 'is capable of')).toBe(false);
    expect(mech.ADVISORY_ROWS.some((r) => r.from === 'is capable of')).toBe(true);
  });

  it('R8: permitted, permits and permitting are never rewritten', () => {
    // "three let values" is not English. 7 sites.
    unchanged('a.md', 'The `skipped_reason` field is an enum with exactly three permitted values:\n');
    unchanged('a.md', 'Single-question calls are only permitted for standalone gate decisions (see rule 33).\n');
    for (const w of ['permitted', 'permits', 'permitting']) {
      expect(mech.INFLECTED_VERBS.some((r) => r.from === w)).toBe(false);
    }
    expect(mech.SUBSTITUTIONS.some((r) => r.from === 'permit' && r.to === 'let')).toBe(true);
  });

  it('R9: a row never fires on one component of a hyphenated compound', () => {
    // "highest-leverage" came back as "highest-use". 7 sites.
    unchanged('a.md', 'The highest-leverage HR investment is developing frontline managers.\n');
    // The same row still fires on the free-standing word.
    expect(run('a.md', 'The plan will leverage the record for the gate.\n'))
      .toBe('The plan will use the record for the gate.\n');
  });

  it('R10: an alignment gutter survives the em-dash transform and the tidy step', () => {
    // The replacement region [ \t]*<dash>[ \t]* ate the gutter of one row of an
    // ASCII table and left the sibling rows ragged. 29 sites.
    unchanged('a.cjs', ' *     1. secret-detection                  — SECURITY DENY GATE  (FAIL-CLOSED)\n');
    // The second shape: a caps edit sat NEAR the gutter and the tidy step closed
    // it. The gutter must survive even though the edit beside it lands.
    expect(run('a.cjs', ' *   agents:                      <- MANDATORY top-level key, a LIST\n'))
      .toBe(' *   agents:                      <- mandatory top-level key, a LIST\n');
    // One space in front of the dash is still sentence punctuation, so a SINGLE
    // dash behind one space is still a candidate. (D6 disabled the PAIR, which
    // is a separate matter from the gutter; the pair line that used to sit here
    // now lives in the case (a) describe above.)
    expect(run('a.md', 'The hook is CJS only — a hard rule for the gate.\n'))
      .toBe('The hook is CJS only, a hard rule for the gate.\n');
  });

  it('R12: a dash inside a quoted span is never replaced', () => {
    // M10 freezes the wording of a quoted example, so the action is SKIP, not
    // "pick the gentlest edit". 26 spans.
    const input = '- **Creative grammar** — parenthetical asides "(well, most caching — edge cases are another story)"; dash interruptions; sentence fragments.\n';
    const out = run('a.md', input);
    // The quoted span comes back byte-identical: the line still illustrates a
    // dash interruption with a dash.
    expect(out).toContain('"(well, most caching — edge cases are another story)"');
    // The dash OUTSIDE the quote is still transformed, so this is not a blanket
    // line skip.
    expect(out).toBe('- **Creative grammar**, parenthetical asides "(well, most caching — edge cases are another story)"; dash interruptions; sentence fragments.\n');

    unchanged('a.md', '- "design my Saturday — I want focused time without family conflict"\n');
    unchanged('a.md', '> "My third act feels rushed — characters resolve too easily"\n');
    unchanged('a.cjs', '  // a stamped "Placeholder — controller did not record ..." entry looked like\n');
    // The skip is reported, not silent.
    expect(mech.advisories('a.md', '> "My third act feels rushed — characters resolve too easily"\n').map((h) => h.word))
      .toContain('em dash in quoted text');
  });

  it('R13: a partially-protected ALL-CAPS run is left byte-identical', () => {
    // A token-by-token decision half-cased a multi-word label. 63 lines.
    unchanged('a.md', '**NEVER ASK USER FOR PERMISSION TO PROCEED BETWEEN STATES**\n');
    unchanged('a.md', 'Run by controller AFTER EVERY 3 COMPLETED WORK ITEMS.\n');
    unchanged('a.md', 'The rule says MUST STAY and ALL THREE and EXACTLY ONCE and NEVER DENIES.\n');
    unchanged('a.md', 'The note reads POINTER TEXT ONLY and LEGACY FALLBACK ONLY for the gate.\n');
    // The controller-delegation-validator.cjs shape. That file puts MUST inside
    // a template literal, so MUST is a code token there; the run freezes on it.
    const validator = 'const RULE = `Controllers MUST delegate via the Agent tool.`;\n' +
      '// HARD-DENY implementation paths: the canonical "a controller MUST NOT write\n';
    unchanged('v.cjs', validator);
    // A MASKED neighbour freezes the run too. maskProtected blanks
    // FAIL/REVISE/BLOCKED as a path, so a scan of the masked view alone would
    // see EVERY standing on its own and lowercase one word of a four-word run.
    unchanged('a.md', 'On EVERY FAIL/REVISE/BLOCKED verdict, re-read the plan first.\n');
    // An isolated ALL-CAPS emphasis word keeps the old behaviour.
    expect(run('a.cjs', ' * DIAGNOSTIC ONLY. This hook records numbers. It NEVER blocks, denies, fails a\n'))
      .toBe(' * DIAGNOSTIC ONLY. This hook records numbers. It never blocks, denies, fails a\n');
    // POSITIVE CONTROL: a run whose every token is an emphasis word still
    // reduces whole, so this is not a blanket caps skip.
    expect(run('a.md', 'The controller MUST NEVER write the file.\n'))
      .toBe('The controller must never write the file.\n');
  });
});

// ---------------------------------------------------------------------------
// WI-041b REGRESSIONS
//
// The five classes the WI-041 review left open. Every input below is a REAL
// CORPUS LINE, copied byte for byte from the file and line named above it, not
// a synthetic example. Four of the five (R14, R16, R17, R18) were symptoms of
// ONE cause, case (c) of the em-dash classifier. R15 is a separate masking bug.
// ---------------------------------------------------------------------------

describe('WI-041b regressions', () => {
  it('R14: a sentence break never capitalises a lowercase identifier', () => {
    // .claude/hooks/team-stop.cjs:154. Case (c) wrote "Team-stop must never
    // fail", and a capitalised hook basename names nothing.
    unchanged('a.cjs', ' * Errors are swallowed — team-stop must never fail because of extraction.\n');
    // .claude/hooks/session-init-gate.cjs:301. Case (c) wrote "Hook-utils
    // anchors it on". The dash now softens to a comma and the basename keeps
    // its case.
    const gate = run('a.cjs', ' * Order: PLUGIN_ROOT (correct by construction — hook-utils anchors it on\n');
    expect(gate).not.toContain('Hook-utils');
    expect(gate).toContain('construction, hook-utils anchors it on');
  });

  it('R15: an en-dash range is left byte-identical', () => {
    // docs/SECURITY_BASH_GUARD_THREAT_MODEL.md:137 and :374. The bypass-class
    // taxonomy became "Class A. E" and "(A, E, which", which turns five
    // classes into two.
    unchanged('a.md', '> **Status (v12.34.0):** the named Class A–E shapes below are now **CLOSED** by\n');
    unchanged('a.md', '*proven* bypass classes (A–E, which tokenize *successfully* and canonicalize to a\n');
    // .claude/rules/core/hooks.md:383. A recommended timeout SPAN became two
    // discrete values, which makes load-bearing config guidance unactionable.
    unchanged('a.md', '- For `team-stop.cjs` which writes final metrics, `5000`–`10000` ms is recommended\n');
    // .claude/skills/act/reference/improve-pattern-effectiveness.md:11. A
    // version range loses the deprecation window it describes.
    unchanged('a.md', 'V11.0 made `improve/` the single source of truth. The V10.26.30–V10.26.35\n');
    // docs/REMAINING_OPTIMIZATIONS.md:3. POSITIVE CONTROL: the range survives
    // and the em dash on the same line is still transformed, so the en-dash
    // exclusion is not a blanket line skip.
    const hist = run('a.md', '> **HISTORICAL (frozen at v8.0.18, 2026-02-02):** superseded by later v9–v12 optimization work — kept for record.\n');
    expect(hist).toContain('v9–v12');
    expect(hist).toContain('optimization work, kept for record.');
  });

  it('R16: a full stop is never inserted inside an unclosed parenthesis', () => {
    // .claude/hooks/secret-detection.cjs:458. Case (c) ended the sentence
    // inside the parenthesis, so the "(" was left hanging and the ")" on a
    // later line closed a sentence that never began.
    const secret = run('a.cjs', '      // 2. Write sanitized content to the target file path (use 0600 too —\n');
    expect(secret).not.toContain('0600 too.');
    expect(secret).toBe('      // 2. Write sanitized content to the target file path (use 0600 too,\n');
    // .claude/rules/core/controllers.md:108, the same shape mid-line.
    const ctrl = run('a.md', 'Concretely, every call is issued with a flag (explicit — subagents are background-by-default since then), and the controller waits.\n');
    expect(ctrl).not.toContain('(explicit.');
  });

  it('R17: a sentence fragment is never left behind', () => {
    // .claude/rules/core/delegation.md:159. Case (c) produced "inline.
    // Absorbing the entire cost", a participial phrase with no subject.
    unchanged('a.md', 're-does the work inline — absorbing the entire cost it meant to delegate. There is\n');
    // .claude/rules/core/controllers.md:438. Case (c) orphaned a normative
    // 7-item checklist behind the two-word fragment "Pre-Execution".
    unchanged('a.md', '**Pre-Execution** (7 checks): Before spawning any executor — planner output schema (Check 0, added LP-28), plan completeness, work item criteria, dependency acyclicity, agent existence, referenced file existence, coordination log schema.\n');
    // .claude/skills/designer/reference/domains/game.md:53. Case (c) split an
    // interview question the designer must ASK into two statements.
    unchanged('a.md', '- "What is the central mechanic — the decision the player makes on their\n');
  });

  it('R18: a colon never lands on a line that already carries one', () => {
    // agents/market-research-analyst/resources/market-best-practices.md:64.
    // splitSegments cuts on the "?" inside the parenthesis, so the run-in bold
    // label's colon sat in an earlier segment and a SECOND colon landed.
    const lead = run('a.md', '- **Leading Questions**: Phrasing survey questions to suggest a desired answer ("How much do you love our new feature?") — introduces response bias that invalidates findings\n');
    expect(lead.split(':').length - 1).toBe(1);
    expect(lead).toContain('feature?") — introduces');
    // agents/team-lead/resources/best-practices.md:76, the same shape.
    const tl = run('a.md', '- **With domain controllers (as teammates)**: Each teammate IS a controller agent (tech-lead, narrative-director, etc.) spawned by the lead — the lead coordinates controllers, and controllers coordinate execution agents\n');
    expect(tl.split(':').length - 1).toBe(1);
    // POSITIVE CONTROL: the same introducer shape on a colon-free line still
    // takes a colon, so this is not a blanket ban on the colon verdict.
    expect(run('a.md', 'Two classes of figures — MEASURED and ESTIMATE.\n'))
      .toBe('Two classes of figures: MEASURED and ESTIMATE.\n');
    // NEGATIVE CONTROL: the identical shape behind a run-in label does not.
    // The label's colon is inside the segment here, so the pre-existing comma
    // fallback applies; either way no SECOND colon lands.
    const labelled = run('a.md', '- **Benchmarks**: two classes of figures — MEASURED and ESTIMATE.\n');
    expect(labelled.split(':').length - 1).toBe(1);
    expect(labelled).toBe('- **Benchmarks**: two classes of figures, MEASURED and ESTIMATE.\n');
  });

  it('a lone-dash table cell never collapses to a bare comma', () => {
    // 45 cells in the corpus hold a lone dash as an n/a marker. The former
    // case (c) falls through to NO CHANGE and never to a comma default, so
    // nothing can rewrite one. Both lines below are real corpus rows:
    // agents/ai-writing-editor/resources/detection-categories.md:123 and
    // agents/marketing-analyst/resources/seo.md:43.
    const cells = [
      '| **Linear Argumentation** | — | Absence of counter-arguments, self-corrections, questions | zero deviations | present |\n',
      '| "Research keywords for [topic]" / "Plan content cluster" | keyword research | — |\n'
    ];
    for (const row of cells) {
      unchanged('a.md', row);
      expect(run('a.md', row)).not.toContain('| , |');
      expect(run('a.md', row)).not.toContain(', |\n');
    }
  });

  it('a surviving dash cannot make the run non-idempotent', () => {
    // The no-change verdict gave transform 1 a dependency on transform 4: the
    // substitution table can turn a word that is NOT in FINITE_VERBS into one
    // that is, which flips the verdict of a dash the first pass left alone.
    // Both lines are real corpus lines that changed on the SECOND --apply run
    // before the whole sequence was run to a fixed point.
    const lines = [
      // agents/operations-manager/resources/supply-chain-best-practices.md:109
      '- **Forecast Accuracy (at Planning Horizon)**: MAPE of demand forecasts vs. actuals at the lead time horizon — directly determines required safety stock levels.\n',
      // agents/team-lead/resources/best-practices.md:47
      '- **Parallelism Score**: The fraction of work items that executed in parallel vs. sequentially — measures how well the wave structure utilized available concurrency\n'
    ];
    for (const src of lines) {
      const once = run('a.md', src);
      expect(once).not.toBe(src);
      expect(run('a.md', once)).toBe(once);
    }
  });
});

// ---------------------------------------------------------------------------
// COMMAND LINE
// ---------------------------------------------------------------------------

describe('command line', () => {
  it('--dry-run writes no file and prints a diff', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mech-cli-'));
    const rel = 'sample.md';
    const body = 'The hook will utilize the record — always.\n';
    fs.writeFileSync(path.join(dir, rel), body, 'utf8');
    const r = spawnSync('node', [SCRIPT, '--root', dir, '--dry-run', '--quiet', rel], {
      encoding: 'utf8', timeout: 60000,
    });
    expect(r.error).toBeUndefined();
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('--- a/sample.md');
    expect(fs.readFileSync(path.join(dir, rel), 'utf8')).toBe(body);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('--apply writes the file, and a second run changes nothing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mech-cli-'));
    const rel = 'sample.md';
    fs.writeFileSync(path.join(dir, rel), 'The hook will utilize the record — always.\n', 'utf8');
    const one = spawnSync('node', [SCRIPT, '--root', dir, '--apply', '--quiet', rel], {
      encoding: 'utf8', timeout: 60000,
    });
    expect(one.status).toBe(0);
    const first = fs.readFileSync(path.join(dir, rel), 'utf8');
    // D6: the em dash converts and "utilize" STAYS, because the substitution
    // table is not reachable from the command line any more.
    expect(first).toBe('The hook will utilize the record, always.\n');
    const two = spawnSync('node', [SCRIPT, '--root', dir, '--apply', '--quiet', rel], {
      encoding: 'utf8', timeout: 60000,
    });
    expect(two.status).toBe(0);
    expect(fs.readFileSync(path.join(dir, rel), 'utf8')).toBe(first);
    expect(two.stderr).toContain('0 file(s) changed');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('--from-file reads a newline-separated list', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mech-cli-'));
    // D6: the fixture has to move under a transform the CLI still ships, so
    // both lines carry ALL-CAPS emphasis rather than a substitution-table word.
    fs.writeFileSync(path.join(dir, 'one.md'), 'You MUST NEVER edit this file.\n', 'utf8');
    fs.writeFileSync(path.join(dir, 'two.md'), 'The gate is MANDATORY for every run.\n', 'utf8');
    const list = path.join(dir, 'list.txt');
    fs.writeFileSync(list, '# a comment\none.md\ntwo.md\n', 'utf8');
    const r = spawnSync('node', [SCRIPT, '--root', dir, '--from-file', list, '--dry-run', '--quiet'], {
      encoding: 'utf8', timeout: 60000,
    });
    expect(r.status).toBe(0);
    expect(r.stderr).toContain('2 file(s) to process');
    expect(r.stdout).toContain('--- a/one.md');
    expect(r.stdout).toContain('--- a/two.md');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('expands a quoted glob against the root, with a * that crosses a directory', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mech-cli-'));
    fs.mkdirSync(path.join(dir, 'a', 'b'), { recursive: true });
    // D6: ALL-CAPS emphasis, because the substitution table is CLI-unreachable.
    fs.writeFileSync(path.join(dir, 'a', 'b', 'deep.md'), 'You MUST NEVER edit this file.\n', 'utf8');
    const r = spawnSync('node', [SCRIPT, '--root', dir, '--dry-run', '--quiet', 'a/*.md'], {
      encoding: 'utf8', timeout: 60000,
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('--- a/a/b/deep.md');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('exits 2 on bad usage and 0 with no work', () => {
    const bad = spawnSync('node', [SCRIPT, 'CLAUDE.md'], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 60000 });
    expect(bad.status).toBe(2);
    const noFlag = spawnSync('node', [SCRIPT, '--dry-run'], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 60000 });
    expect(noFlag.status).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// D6 REGRESSIONS: the transform set the command line actually ships.
//
// Three independent review rounds rejected the full four-transform set.
// Decision D6 ships TWO: the em-dash transform on SINGLE dashes, and ALL-CAPS
// emphasis reduction. Three families are dropped: the slash conversion, the
// WI-011 substitution table, and the paired-em-dash parenthetical. These are
// the bug-driven tests for that narrowing.
// ---------------------------------------------------------------------------

describe('D6: the command line ships emdash and caps only', () => {
  it('a: a CLI dry-run writes no diff for a slash or for a substitution word', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mech-d6-'));
    const rel = 'sample.md';
    const body = 'The router handles frontend/backend work for the team.\n' +
      'The hook will utilize the record for the gate.\n';
    fs.writeFileSync(path.join(dir, rel), body, 'utf8');

    // POSITIVE CONTROL. The same two lines DO move through the module API, so a
    // clean CLI run proves the skip set, not an inert fixture.
    expect(run(rel, body)).not.toBe(body);

    const r = spawnSync('node', [SCRIPT, '--root', dir, '--dry-run', '--quiet', rel], {
      encoding: 'utf8', timeout: 60000,
    });
    expect(r.error).toBeUndefined();
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
    expect(r.stderr).toContain('0 file(s) changed');
    expect(r.stderr).toContain('slash 0');
    expect(r.stderr).toContain('words 0');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('a: --skip-transform only ADDS, so no flag re-enables slash or words', () => {
    const src = fs.readFileSync(SCRIPT, 'utf8');
    // The skip set STARTS with both names in it.
    expect(src).toContain('const skip = ["slash", "words"];');
    // And nothing ever takes a name back out of it.
    expect(src).not.toMatch(/\bskip\.(splice|shift|pop|filter|slice)\b/);
    // The two functions stay in the file, reachable from the module API only.
    expect(src).toMatch(/function transformSlash\(/);
    expect(src).toMatch(/function transformWords\(/);
  });

  it('b: a paired em-dash parenthetical is byte-identical through transformText', () => {
    unchanged('a.md', 'The hook — which is CJS only — runs first.\n');
    unchanged('a.md', 'The hook—which is CJS only—runs first.\n');
    unchanged('a.md', 'The planner — which the orchestrator spawns\nfirst — writes the plan.\n');
  });

  it('c: the N3 shape, a run-in bold label with a dash pair, is byte-identical', () => {
    // A comma pair here reads as a three-item list and destroys the appositive:
    // "- **Gate**: the check, a cheap one, runs first".
    unchanged('n3.md', '- **Gate**: the check —a cheap one— runs first\n');
    unchanged('n3.md', '- **Gate**: the check — a cheap one — runs first\n');
    unchanged('n3.md', '- **Waypoint**: the disk record — a resume checkpoint — that the run reads.\n');
  });

  it('d: a SINGLE em dash still converts, so the shipped transform is intact', () => {
    expect(run('b.md', 'Two classes of figures — MEASURED and ESTIMATE.\n'))
      .toBe('Two classes of figures: MEASURED and ESTIMATE.\n');
    expect(run('c.md', 'It works — but only on Linux.\n'))
      .toBe('It works, but only on Linux.\n');

    // And from the COMMAND LINE, not only through the module API.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mech-d6-'));
    fs.writeFileSync(path.join(dir, 'one.md'), 'Two classes of figures — MEASURED and ESTIMATE.\n', 'utf8');
    const r = spawnSync('node', [SCRIPT, '--root', dir, '--dry-run', '--quiet', 'one.md'], {
      encoding: 'utf8', timeout: 60000,
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('+Two classes of figures: MEASURED and ESTIMATE.');
    expect(r.stderr).toContain('em-dash 1');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
