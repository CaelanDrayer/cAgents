import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for WO-02 (session team_load-cut-program_260804_001).
 *
 * Bug: the constraint governing what the main session may carry was expressed
 *      as a token count. A token count is satisfiable in more than one way —
 *      in the source session it was demonstrably satisfied three different
 *      ways by three different artifacts, and none of them noticed the
 *      others. A number invites "we met the number"; it does not say what
 *      kind of content belongs in the main session.
 *
 * Fix: restate the constraint as a SIZE CLASS — content whose size does not
 *      grow with the size of the work — and write /designer's exception into
 *      /designer's own contract, scoped to user turns and bounded by
 *      checkpoint-restart.
 *
 * Failing-before evidence (measured, not estimated): with the three source
 *      edits stashed at HEAD 73349034, this file reports 12 failed / 6 passed
 *      of 18. The size rule did not exist in .claude/rules/ at all, and
 *      neither /designer surface mentioned "checkpoint-restart".
 * Passing-after evidence: 18 passed / 18. The doctrine lives in
 *      delegation.md § The Size Rule and the exception is stated on both
 *      /designer contract surfaces.
 *
 * Deliberately NOT tested: any token threshold, size gate, or budget check.
 *      The program that produced this rule explicitly rejected every gate
 *      option (brief.header.yaml core.scope.not_in_scope). Test 6 asserts the
 *      absence of a gate, not the presence of one.
 */

const ROOT = process.cwd();
const DELEGATION = '.claude/rules/core/delegation.md';
const DESIGNER_SKILL = '.claude/skills/designer/SKILL.md';
const DESIGNER_RULES = '.claude/skills/designer/reference/rules.md';

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/**
 * Slice a markdown file between a start heading and the next boundary matching
 * `stopRe`. The search for the stop boundary begins after the start line so a
 * heading cannot terminate its own section.
 */
function section(content, startRe, stopRe) {
  const start = content.search(startRe);
  if (start === -1) return '';
  const rest = content.slice(start);
  const firstLineEnd = rest.indexOf('\n');
  if (firstLineEnd === -1) return rest;
  const stop = rest.slice(firstLineEnd).search(stopRe);
  return stop === -1 ? rest : rest.slice(0, firstLineEnd + stop);
}

/** Recursively collect .md files under a directory. */
function mdFiles(dir, acc = []) {
  for (const entry of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${entry}`;
    if (statSync(join(ROOT, rel)).isDirectory()) mdFiles(rel, acc);
    else if (entry.endsWith('.md')) acc.push(rel);
  }
  return acc;
}

/**
 * Lines that contain a count from the constraint's number family but do NOT
 * state the main-session constraint. Each needs a reason, not just a path.
 */
const NOT_THE_CONSTRAINT = [
  {
    file: '.claude/rules/infrastructure/model-routing.md',
    match: '100K+ tokens of context',
    reason:
      'Model-selection heuristic for when to enable the 1M context window — ' +
      'describes input size to pick a model, not what the main session may carry.',
  },
];

describe('WO-02 regression: the main-session constraint is a size class, not a token count', () => {
  const delegation = read(DELEGATION);
  const sizeRule = section(delegation, /^## The Size Rule$/m, /^## /m);
  // Strip blockquote markers so the operative statement matches as flowing prose.
  const sizeRuleText = sizeRule.replace(/^> ?/gm, '').replace(/\s+/g, ' ');

  it('1. the size rule has a canonical home in .claude/rules/', () => {
    expect(sizeRule).not.toBe('');
  });

  it('2. states the permitted class: size does not grow with the size of the work', () => {
    expect(sizeRuleText).toContain(
      'may carry only content whose size does not grow with the size of the work',
    );
    for (const permitted of ['user turns', 'routing decisions', 'fixed-size reports']) {
      expect(sizeRuleText).toContain(permitted);
    }
  });

  it('3. states the excluded class in full', () => {
    expect(sizeRuleText).toMatch(/MUST NOT carry/);
    for (const excluded of [
      'design reasoning',
      'artifact bodies',
      'evidence',
      'work-product content',
      'unbounded tool results',
    ]) {
      expect(sizeRuleText).toContain(excluded);
    }
  });

  it('4. records why a size class beats a token count', () => {
    expect(sizeRuleText).toContain(
      'satisfiable three different ways by three different artifacts',
    );
    expect(sizeRuleText).toContain('no one caught the disagreement');
    expect(sizeRuleText).toContain('A size class cannot be');
  });

  it('5. the surviving constraint is not restated as a token count', () => {
    // No numeric token figure anywhere in the doctrine section.
    expect(sizeRule).not.toMatch(/\d[\d,]*\s*[kK]?\s*tokens?\b/);
    // The specific counts the constraint used to be carried as.
    for (const stale of ['100k', '100,000', '102k', '102,001']) {
      expect(sizeRule.toLowerCase()).not.toContain(stale.toLowerCase());
    }
  });

  it('6. introduces no threshold, gate, or automated size check', () => {
    expect(sizeRuleText).toContain('no threshold, no CI gate, no warning');
    expect(sizeRuleText).toContain('holds on instruction quality alone');
  });

  it('7. no file in the rules or skills tree states the constraint as a token count', () => {
    const scanned = [...mdFiles('.claude/rules'), ...mdFiles('.claude/skills'), 'CLAUDE.md'];
    const offenders = [];
    for (const rel of scanned) {
      for (const [i, line] of read(rel).split('\n').entries()) {
        if (!/\b(100[,.]?000|~?10[0-9]k|102[,.]?001)\b/i.test(line)) continue;
        const allowed = NOT_THE_CONSTRAINT.some(
          (a) => a.file === rel && line.includes(a.match),
        );
        if (!allowed) offenders.push(`${rel}:${i + 1}: ${line.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('7b. every allowlisted near-miss still exists and still carries its reason', () => {
    // Guards the allowlist from rotting into a blanket suppression: if one of
    // these lines is edited away, the entry must be removed rather than kept.
    for (const entry of NOT_THE_CONSTRAINT) {
      expect(read(entry.file), `${entry.file} no longer contains "${entry.match}"`).toContain(
        entry.match,
      );
      expect(entry.reason.length).toBeGreaterThan(40);
    }
  });
});

describe("WO-02 regression: /designer's exception is stated, scoped, and bounded", () => {
  const surfaces = {
    [DESIGNER_SKILL]: section(
      read(DESIGNER_SKILL),
      /^### The Size Rule and \/designer's One Exception$/m,
      /^#{2,3} /m,
    ),
    [DESIGNER_RULES]: section(read(DESIGNER_RULES), /^34\. /m, /^\d+\. \*\*/m),
  };

  for (const [file, body] of Object.entries(surfaces)) {
    describe(file, () => {
      it('the exception is stated on this surface', () => {
        expect(body).not.toBe('');
        expect(body).toMatch(/exception/i);
      });

      it('is scoped to user turns and nothing else', () => {
        expect(body).toContain('user turns');
        expect(body).toMatch(/in one respect only/i);
        // A reader must not come away thinking /designer is broadly exempt.
        expect(body).toMatch(/not broadly exempt/i);
      });

      it('names checkpoint-restart as its bound', () => {
        expect(body).toMatch(/checkpoint-restart/);
        expect(body).toMatch(/bounded by/i);
      });

      it('does not restate the bound as a token count', () => {
        expect(body).not.toMatch(/\d[\d,]*\s*[kK]?\s*tokens?\b/);
      });
    });
  }

  it('the doctrine points at the /designer contract that carries the exception', () => {
    expect(read(DELEGATION)).toContain('.claude/skills/designer/reference/rules.md');
  });
});

describe("WO-02 guard: the word 'aggressive' survives (NIS-4)", () => {
  // The user explicitly declined removing "aggressive"; WO-07 re-points its
  // referent instead. This guards against a later sweep taking it as
  // collateral from the delegation file the size rule now shares.
  it('delegation.md still uses the word', () => {
    expect(read(DELEGATION)).toMatch(/aggressive/i);
  });
});
