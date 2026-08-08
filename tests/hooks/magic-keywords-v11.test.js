/**
 * Magic-keywords regression test for the V11 -> v12.1.2 routing migration.
 *
 * History:
 * - V11.0 unified /review and /optimize into /improve --mode {review,optimize}.
 * - v12.1.2 folded /improve into /act via a first-word keyword router:
 *   `/act review <target>` -> --mode review, `/act optimize <target>` ->
 *   --mode optimize, `/act improve <target>` -> --mode full, `/act audit
 *   <target>` -> --mode review.
 *
 * This test asserts the current (v12.1.2) routing target:
 *  (a) live runtime behavior: routing a "review ..." / "optimize ..." /
 *      "audit ..." prompt produces a /act review or /act optimize suggestion
 *      (NOT a bare /review, /optimize, or /improve standalone target)
 *  (b) source-level: the hook source documents the v12.1.2 keyword router
 *      and does not retain stale "-> /review" or "-> /optimize" doc mappings
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

// P1-7 (v12.7.1, c5d48fce) consolidated magic-keywords.cjs into prompt-router.cjs.
// The v12.1.2 keyword-routing behavior (/act review, /act optimize, audit->review)
// is preserved in prompt-router's KEYWORD_ROUTES, so this regression targets it.
const HOOK_PATH = join(process.cwd(), '.claude', 'hooks', 'prompt-router.cjs');

function runHook(input = {}) {
  const merged = { session_id: `v12-test-${randomUUID()}`, ...input };
  // Layer 2 (natural-language routing suggestions) is opt-in, default OFF.
  // Enable it explicitly so these regressions exercise the routing behavior.
  const result = execSync(
    `printf '%s' '${JSON.stringify(merged).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, CAGENTS_ROUTING_SUGGESTIONS: '1' }
    }
  );
  return JSON.parse(result.trim());
}

describe('prompt-router.cjs v12.1.2 keyword routing (formerly magic-keywords.cjs)', () => {
  it('hook file exists', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  // ---------- (a) live runtime behavior ----------

  it('routes "review ..." prompts to /act review (v12.1.2 keyword router)', () => {
    const result = runHook({ user_prompt: 'review the auth module for security issues' });
    expect(result.systemMessage).toBeDefined();
    expect(result.systemMessage).toMatch(/\/act review/);
    // Must not suggest the removed /review skill on its own.
    const stripped = result.systemMessage.replace(/\/act review/g, '');
    expect(stripped).not.toMatch(/(^|[^a-zA-Z0-9_-])\/review(?=[^a-zA-Z0-9_-]|$)/);
  });

  it('routes "optimize ..." prompts to /act optimize (v12.1.2 keyword router)', () => {
    const result = runHook({ user_prompt: 'optimize the database queries for performance' });
    expect(result.systemMessage).toBeDefined();
    expect(result.systemMessage).toMatch(/\/act optimize/);
    const stripped = result.systemMessage.replace(/\/act optimize/g, '');
    expect(stripped).not.toMatch(/(^|[^a-zA-Z0-9_-])\/optimize(?=[^a-zA-Z0-9_-]|$)/);
  });

  it('routes "audit ..." prompts to /act review (audit is an alias for review)', () => {
    const result = runHook({ user_prompt: 'audit our authentication for vulnerabilities' });
    expect(result.systemMessage).toBeDefined();
    expect(result.systemMessage).toMatch(/\/act review/);
  });

  // ---------- (b) source-level: documentation matches new target ----------

  it('source documents the v12.1.2 keyword router target', () => {
    const src = readFileSync(HOOK_PATH, 'utf8');
    // The hook should mention the new v12.1.2 routing target.
    expect(src).toMatch(/\/act review/);
    expect(src).toMatch(/\/act optimize/);
  });

  it('source does not advertise standalone /improve as the routing target', () => {
    const src = readFileSync(HOOK_PATH, 'utf8');
    // The KEYWORD_ROUTES table should NOT route to /improve any longer.
    // We allow historical references inside comments (e.g., V11.0 history),
    // but the route-table entries (lines with a `[/regex/...]` pattern and
    // a single-quoted target string) must not target /improve.
    const lines = src.split('\n');
    const routeLines = lines.filter(line => /^\s*\[\/.+\/.*,\s*'\//.test(line));
    const improveRouteLines = routeLines.filter(line =>
      /,\s*'\/improve\b/.test(line)
    );
    expect(improveRouteLines,
      `Found stale /improve route table entries:\n${improveRouteLines.join('\n')}`
    ).toEqual([]);
  });
});
