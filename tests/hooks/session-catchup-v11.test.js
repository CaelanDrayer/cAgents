/**
 * V11.0 regression test for session-catchup.cjs
 *
 * Bug-1 (gap_analysis.md §2): SessionStart hook actively suggested removed
 * slash-commands (/review, /optimize, /context, /debug) to the user via the
 * `additionalContext` it returns. V11.0 removed those skills, so following
 * the suggestion would fail.
 *
 * This test asserts that the hook's emitted `additionalContext` does NOT
 * advertise the four removed skills. Comments / documentation that mention
 * them in a "removed in V11" or migration context are explicitly allowed
 * by checking the live emitted text, not the file source.
 *
 * Failing-before / passing-after: must FAIL against current main and PASS
 * after Bug-1 is fixed in session-catchup.cjs.
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

const HOOK_PATH = join(process.cwd(), '.claude', 'hooks', 'session-catchup.cjs');

// The hook's dedup guard hashes on session_id; tests that share an empty
// session_id collide and end up returning {"continue":true} instead of the
// full additionalContext payload. Inject a fresh session_id per call so the
// dedup file is unique and the handler actually runs.
function runHook(input = {}) {
  const merged = { session_id: `v11-test-${randomUUID()}`, ...input };
  const result = execSync(
    `printf '%s' '${JSON.stringify(merged).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

// Helper: word-boundary slash-command match. Excludes longer commands so
// "/review" doesn't accidentally match "/reviewer-foo". A removed skill is
// matched only when it appears as its own token (`/review` followed by
// whitespace, comma, paren, period, or end-of-string).
function mentionsLiveSkill(text, skill) {
  if (!text) return false;
  const re = new RegExp(`(^|[^a-zA-Z0-9_-])${skill}(?=[^a-zA-Z0-9_-]|$)`, 'g');
  return re.test(text);
}

describe('session-catchup.cjs V11.0 removed-skill suggestions (Bug-1)', () => {
  it('hook file exists', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('emitted additionalContext does NOT advertise /review as a live skill', () => {
    const result = runHook({});
    const ctx = result?.hookSpecificOutput?.additionalContext || '';
    expect(mentionsLiveSkill(ctx, '/review')).toBe(false);
  });

  it('emitted additionalContext does NOT advertise /optimize as a live skill', () => {
    const result = runHook({});
    const ctx = result?.hookSpecificOutput?.additionalContext || '';
    expect(mentionsLiveSkill(ctx, '/optimize')).toBe(false);
  });

  it('emitted additionalContext does NOT advertise /context as a live skill', () => {
    const result = runHook({});
    const ctx = result?.hookSpecificOutput?.additionalContext || '';
    expect(mentionsLiveSkill(ctx, '/context')).toBe(false);
  });

  it('emitted additionalContext does NOT advertise /debug as a live skill', () => {
    const result = runHook({});
    const ctx = result?.hookSpecificOutput?.additionalContext || '';
    expect(mentionsLiveSkill(ctx, '/debug')).toBe(false);
  });

  it('emitted additionalContext still advertises live V11 skills', () => {
    // After fix, the hook should still mention the canonical V11 skill set.
    const result = runHook({});
    const ctx = result?.hookSpecificOutput?.additionalContext || '';
    // /run, /team, /org are listed as the orchestration skills that may
    // never self-handle. /improve is the V11 unified review/optimize entry
    // point — at least one of these must remain in the emitted context.
    expect(mentionsLiveSkill(ctx, '/run')).toBe(true);
    expect(mentionsLiveSkill(ctx, '/team')).toBe(true);
    expect(mentionsLiveSkill(ctx, '/org')).toBe(true);
  });

  it('emitted additionalContext mentions /improve (V11 unified entry point)', () => {
    // /improve subsumes /review and /optimize in V11.0. The fix should
    // re-route any removed-skill mentions to /improve --mode {review,optimize,full}.
    const result = runHook({});
    const ctx = result?.hookSpecificOutput?.additionalContext || '';
    expect(ctx).toMatch(/\/improve/);
  });
});
