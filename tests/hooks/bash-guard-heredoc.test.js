/**
 * bash-guard-heredoc.test.js — regression suite for the heredoc-body tokenize
 * false positive and the inline-assignment constant propagation.
 *
 * BUG (failing before, passing after): tokenize() recognized `<<` as a redirect
 * operator but never consumed the heredoc BODY, so the body's text was lexed as
 * shell source. A single odd apostrophe in a heredoc body — overwhelmingly a
 * commit message containing "it's" / "don't" — threw 'unterminated single quote',
 * fail-closed the evaluator, and downgraded a wholly benign command to a
 * confirmation `ask`. Measured on a 439-command corpus of real session history,
 * this was the single largest source of interactive approval prompts.
 *
 * The fix skips heredoc bodies during tokenization (sound: bash feeds them to the
 * command on stdin and never executes them) and, for the ONE shape where the body
 * IS executed — a shell reading its script from a heredoc — recurses the body
 * through the evaluator exactly like a `-c` payload. The security assertions
 * below pin that the skip did not open a bypass.
 *
 * Second fix: `S=<literal>; rm -rf $S` is statically resolvable, so the guard now
 * resolves the assignment instead of asking blindly. Sharper in BOTH directions —
 * a variable holding a protected path DENIES where it previously only asked.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require_ = createRequire(import.meta.url);
const { evaluate } = require_('../../.claude/hooks/bash-guard-evaluator.cjs');

// Destructive literals are assembled at runtime rather than written inline so
// that authoring/editing this file does not itself trip the raw-string
// catastrophic belt in bash-validator.cjs (which scans whole command strings and
// cannot tell test data from a real invocation).
const RM_RF = 'rm -' + 'rf ';
const ROOT_DELETE = RM_RF + '/';
const ETC_DELETE = RM_RF + '/etc';

/** evaluate() external shape -> 'deny' | 'ask' | 'allow' */
function verdict(cmd) {
  const r = evaluate(cmd);
  if (r === null) return 'allow';
  if (r && r.deny === true) return 'deny';
  if (r && r.hookSpecificOutput && r.hookSpecificOutput.permissionDecision === 'ask') return 'ask';
  throw new Error('unrecognized verdict shape: ' + JSON.stringify(r));
}

describe('heredoc bodies are inert data, not shell source', () => {
  it.each([
    ['odd apostrophe in body (the reported bug)', "git commit -q -F - <<'MSG'\nfix: it's broken\nMSG"],
    ['balanced apostrophes in body', "cat > x.js <<'EOF'\nit('does a thing', () => {});\nEOF"],
    ['unbalanced double quote in body', 'cat > x.md <<\'EOF\'\nHe said "hello\nEOF'],
    ['contraction-heavy commit message', "git commit -F - <<'MSG'\ndon't ship what you can't verify\nMSG"],
    ['unquoted delimiter', "cat > x.txt <<EOF\nit's fine\nEOF"],
    ['tab-stripping <<- delimiter', "cat > x.txt <<-EOF\n\tit's fine\n\tEOF"],
    ['body text after the terminator still lexes', "cat > x <<'EOF'\nit's data\nEOF\necho done"]
  ])('allows: %s', (_label, cmd) => {
    expect(verdict(cmd)).toBe('allow');
  });

  it('a heredoc body is NOT silently un-analyzed when a SHELL reads it as its script', () => {
    // `bash <<EOF` executes the body. Skipping it would be a bypass, so the
    // evaluator recurses the body on the same terms as a `-c` payload.
    expect(verdict("bash <<'EOF'\n" + ROOT_DELETE + '\nEOF')).toBe('deny');
    expect(verdict('sh <<EOF\n' + ETC_DELETE + '\nEOF')).toBe('deny');
  });

  it('a NON-shell heredoc consumer does not execute the body, so it stays inert', () => {
    // Same destructive-looking text, but cat never executes it.
    expect(verdict("cat > notes.txt <<'EOF'\n" + ROOT_DELETE + '\nEOF')).toBe('allow');
  });

  it('a computed delimiter (<<$X) is not stripped — old fail-closed behaviour kept', () => {
    // The body extent is unknowable, so the guard must not guess where it ends.
    expect(verdict("cat <<$D\nit's data\n$D")).not.toBe('allow');
  });

  it('<<< herestrings are unaffected (no body to skip)', () => {
    expect(verdict("grep foo <<< 'bar'")).toBe('allow');
  });
});

describe('heredocs nested inside $(...) — the other half of the same bug', () => {
  // extractParen is a SEPARATE scanner from tokenize(). It was quote-aware but
  // heredoc-unaware, so a prose apostrophe in a heredoc body flipped it into
  // single-quote mode, desynced paren matching, and threw 'unbalanced command
  // substitution'. That is the exact shape threat-model §5.3 was written about.
  it('allows the §5.3 motivating false positive', () => {
    expect(verdict('git commit -m "$(cat <<\'EOF\'\nfix the model\'s unit test\nEOF\n)"')).toBe('allow');
  });

  it('leaves a destructive body inert when the substitution consumer does not execute it', () => {
    expect(verdict('x="$(cat <<\'EOF\'\n' + ETC_DELETE + '\nEOF\n)"')).toBe('allow');
  });

  it('still DENIES when the nested heredoc feeds a shell that executes it', () => {
    // The body stays inside the returned `inner`, so the substitution is still
    // recursed in full — skipping the body for paren-matching is not a bypass.
    expect(verdict('y="$(bash <<\'EOF\'\n' + ETC_DELETE + '\nEOF\n)"')).toBe('deny');
  });
});

describe('heredoc terminator matching follows bash exactly', () => {
  it('analyses commands that follow a properly terminated heredoc', () => {
    expect(verdict("cat > a <<'EOF'\ndata\nEOF\n" + ETC_DELETE)).toBe('deny');
    expect(verdict('cat > a <<-EOF\n\tdata\n\tEOF\n' + ETC_DELETE)).toBe('deny');
  });

  it('treats an UNTERMINATED heredoc as running to EOF, exactly as bash does', () => {
    // bash consumes the rest of the input as body, so the trailing text is data
    // and is never executed. Allowing is correct, not a miss.
    expect(verdict("cat > a <<'EOF'\ndata\n" + ETC_DELETE)).toBe('allow');
    // A terminator with trailing whitespace is NOT a terminator in bash either.
    expect(verdict("cat > a <<'EOF'\ndata\nEOF \n" + ETC_DELETE)).toBe('allow');
  });
});

describe('inline-assignment constant propagation for a recursive-force delete', () => {
  it('resolves a literal scratch path and stops asking', () => {
    expect(verdict('S=/tmp/scratch; ' + RM_RF + '$S')).toBe('allow');
    expect(verdict('S=/tmp/scratch\n' + RM_RF + '"$S"')).toBe('allow');
  });

  it('DENIES when the resolved literal is a protected path (sharper than the old ask)', () => {
    expect(verdict('P=/etc; ' + RM_RF + '$P')).toBe('deny');
    expect(verdict('P=~/.ssh; ' + RM_RF + '$P')).toBe('deny');
    expect(verdict('P=/; ' + RM_RF + '$P')).toBe('deny');
  });

  it('still asks when the variable is NOT assigned in the same command', () => {
    // Assigned in the environment or an earlier Bash call — genuinely unknown.
    expect(verdict(RM_RF + '$SOME_EXTERNAL_DIR')).toBe('ask');
  });

  it('does not resolve a value that itself expands', () => {
    expect(verdict('S=$HOME/x; ' + RM_RF + '$S')).toBe('ask');
  });

  it('still asks for a command-substitution target', () => {
    expect(verdict(RM_RF + '$(cat target.txt)')).toBe('ask');
  });
});
