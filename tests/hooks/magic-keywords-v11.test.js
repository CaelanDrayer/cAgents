/**
 * V11.0 regression test for magic-keywords.cjs
 *
 * Bug-2 (gap_analysis.md §3): The natural-language keyword router's
 * docstring (lines 11-12) advertises mappings to removed slash-commands
 * (`"review" -> /review`, `"optimize" -> /optimize`). The actual route
 * table was already migrated to /improve --mode {review,optimize}, but
 * the docstring is misleading and reinforces the same first-impression
 * UX damage as Bug-1.
 *
 * This test asserts BOTH:
 *  (a) live runtime behavior: routing a "review ..." or "optimize ..."
 *      prompt produces a /improve --mode ... suggestion (not /review or
 *      /optimize on its own)
 *  (b) source-level: the file's documentation/comments do not contain
 *      stale `-> /review` / `-> /optimize` mappings
 *
 * Failing-before / passing-after: (a) already passes against current main
 * because routes are correct; (b) must FAIL against current main and PASS
 * after Bug-2 is fixed.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

const HOOK_PATH = join(process.cwd(), '.claude', 'hooks', 'magic-keywords.cjs');

// The hook's dedup guard hashes on session_id; vary it per call so parallel
// tests don't collide on the dedup file and silently short-circuit.
function runHook(input = {}) {
  const merged = { session_id: `v11-test-${randomUUID()}`, ...input };
  const result = execSync(
    `printf '%s' '${JSON.stringify(merged).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('magic-keywords.cjs V11.0 keyword routing (Bug-2)', () => {
  it('hook file exists', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  // ---------- (a) live runtime behavior ----------

  it('routes "review ..." prompts to /improve --mode review (not /review)', () => {
    const result = runHook({ user_prompt: 'review the auth module for security issues' });
    expect(result.systemMessage).toBeDefined();
    expect(result.systemMessage).toMatch(/\/improve --mode review/);
    // Must not suggest the removed /review skill on its own.
    // (We check that "/review" is not used as a standalone command —
    // any occurrence must be inside "/improve --mode review".)
    const stripped = result.systemMessage.replace(/\/improve --mode review/g, '');
    expect(stripped).not.toMatch(/(^|[^a-zA-Z0-9_-])\/review(?=[^a-zA-Z0-9_-]|$)/);
  });

  it('routes "optimize ..." prompts to /improve --mode optimize (not /optimize)', () => {
    const result = runHook({ user_prompt: 'optimize the database queries for performance' });
    expect(result.systemMessage).toBeDefined();
    expect(result.systemMessage).toMatch(/\/improve --mode optimize/);
    const stripped = result.systemMessage.replace(/\/improve --mode optimize/g, '');
    expect(stripped).not.toMatch(/(^|[^a-zA-Z0-9_-])\/optimize(?=[^a-zA-Z0-9_-]|$)/);
  });

  it('routes "audit ..." prompts to /improve --mode review', () => {
    const result = runHook({ user_prompt: 'audit our authentication for vulnerabilities' });
    expect(result.systemMessage).toBeDefined();
    expect(result.systemMessage).toMatch(/\/improve --mode review/);
  });

  // ---------- (b) source-level: stale comments / docstrings ----------

  it('source does not contain stale "-> ... /review" doc mapping (bug-2 surface)', () => {
    const src = readFileSync(HOOK_PATH, 'utf8');
    // The bug surface: a stale arrow-style mapping in the JSDoc header that
    // documents a removed skill as the routing target. Allow occurrences
    // inside `/improve --mode review`. We match an arrow on the same line,
    // followed by anything up to a /review token that is NOT part of
    // `/improve --mode review`.
    const lines = src.split('\n');
    const offending = lines.filter(line => {
      // Look for arrow + bare `/review` on the same line.
      if (!/->/.test(line)) return false;
      if (!/(^|[^a-zA-Z0-9_-])\/review(?=[^a-zA-Z0-9_-]|$)/.test(line)) return false;
      // Allow `/improve --mode review` style (no bare /review token then).
      // Strip allowed substrings and re-check for bare /review.
      const stripped = line.replace(/\/improve --mode review/g, '');
      return /(^|[^a-zA-Z0-9_-])\/review(?=[^a-zA-Z0-9_-]|$)/.test(stripped);
    });
    expect(offending, `Lines mentioning stale -> /review mapping:\n${offending.join('\n')}`)
      .toEqual([]);
  });

  it('source does not contain stale "-> ... /optimize" doc mapping (bug-2 surface)', () => {
    const src = readFileSync(HOOK_PATH, 'utf8');
    const lines = src.split('\n');
    const offending = lines.filter(line => {
      if (!/->/.test(line)) return false;
      if (!/(^|[^a-zA-Z0-9_-])\/optimize(?=[^a-zA-Z0-9_-]|$)/.test(line)) return false;
      const stripped = line.replace(/\/improve --mode optimize/g, '');
      return /(^|[^a-zA-Z0-9_-])\/optimize(?=[^a-zA-Z0-9_-]|$)/.test(stripped);
    });
    expect(offending, `Lines mentioning stale -> /optimize mapping:\n${offending.join('\n')}`)
      .toEqual([]);
  });

  it('source documents /improve --mode review and /improve --mode optimize', () => {
    // Positive assertion: the migration target is documented somewhere
    // in the file (either in routes or comments).
    const src = readFileSync(HOOK_PATH, 'utf8');
    expect(src).toMatch(/\/improve --mode review/);
    expect(src).toMatch(/\/improve --mode optimize/);
  });
});
