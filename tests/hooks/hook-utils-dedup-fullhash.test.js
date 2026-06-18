/**
 * H6 regression test (v12.20.0): dedupGuard keys on a hash of the FULL input,
 * not a 200-char prefix.
 *
 * Background (H6 from team_action-report-items_260617_001 / source audit
 * REPORT-ONLY.md): the dedup key was
 *   crypto.createHash('md5').update(hookName + JSON.stringify(input).slice(0,200))
 * Two genuinely-DIFFERENT invocations whose first ~200 stringified chars matched
 * (e.g. two Writes to the same long file_path that differ only in their later
 * `content` field) hashed to the SAME key. Within the 2s window the SECOND
 * invocation was treated as a duplicate and SKIPPED — bypassing the security
 * gates (secret-detection, controller-delegation) that the dispatcher runs.
 *
 * Fix: hash the FULL stringified input (sha1). Only truly-identical payloads
 * dedup; same-prefix-but-different payloads both proceed (both run their gates).
 *
 * Failing-before contract: with the old 200-char-prefix key, Test 1's second
 * call returns `true` (deduped) — the bug. With the full-hash key it returns
 * `false` (proceeds).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');

function freshUtils() {
  delete require.cache[require.resolve(join(HOOKS_DIR, 'hook-utils.cjs'))];
  return require(join(HOOKS_DIR, 'hook-utils.cjs'));
}

// Remove any leftover dedup temp files for a given hook name so each assertion
// starts from a clean slate (the guard cleans up on process exit + 2s timer,
// but tests run synchronously inside one process).
function cleanDedupFiles(hookName) {
  for (const f of readdirSync(tmpdir())) {
    if (f.startsWith(`cagents-dedup-${hookName}-`)) {
      try { rmSync(join(tmpdir(), f), { force: true }); } catch { /* ignore */ }
    }
  }
}

describe('dedupGuard full-input hashing (H6)', () => {
  let utils;
  // Saved env so we can disable the vitest test-mode bypass for the duration of
  // a test, then restore it (the bypass makes dedupGuard a no-op under VITEST).
  let savedVitest, savedNodeEnv, savedDisable;

  beforeEach(() => {
    utils = freshUtils();
    savedVitest = process.env.VITEST;
    savedNodeEnv = process.env.NODE_ENV;
    savedDisable = process.env.CAGENTS_HOOK_DEDUP_DISABLE;
    // Disable all three bypass switches so the REAL dedup logic runs.
    delete process.env.VITEST;
    delete process.env.NODE_ENV;
    delete process.env.CAGENTS_HOOK_DEDUP_DISABLE;
  });

  afterEach(() => {
    if (savedVitest === undefined) delete process.env.VITEST; else process.env.VITEST = savedVitest;
    if (savedNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = savedNodeEnv;
    if (savedDisable === undefined) delete process.env.CAGENTS_HOOK_DEDUP_DISABLE; else process.env.CAGENTS_HOOK_DEDUP_DISABLE = savedDisable;
  });

  it('Test 1 — two same-200-char-prefix-but-different Writes are NOT deduped (both gates run)', () => {
    const hookName = `H6PrefixTest_${Date.now().toString(36)}`;
    cleanDedupFiles(hookName);

    // file_path long enough that the differing `content` field falls AFTER the
    // 200th character of the stringified payload — so the old prefix key would
    // collide while the full-input hash does not.
    const longPath = 'src/' + 'a'.repeat(240) + '.ts';
    const inputA = { tool_name: 'Write', tool_input: { file_path: longPath, content: 'AAAA' } };
    const inputB = { tool_name: 'Write', tool_input: { file_path: longPath, content: 'BBBB' } };

    // Sanity: the two payloads DO share the first 200 stringified chars (the
    // precondition that triggered the old-key collision).
    const sA = JSON.stringify(inputA);
    const sB = JSON.stringify(inputB);
    expect(sA.slice(0, 200)).toBe(sB.slice(0, 200));
    expect(sA).not.toBe(sB);

    // First invocation: not a duplicate -> proceed.
    expect(utils.dedupGuard(hookName, inputA)).toBe(false);
    // Second invocation with a DIFFERENT full payload: must also proceed.
    // Under the OLD 200-char-prefix key this returned true (deduped) — the bug.
    expect(utils.dedupGuard(hookName, inputB)).toBe(false);

    cleanDedupFiles(hookName);
  });

  it('Test 2 — two IDENTICAL payloads still dedup (second is skipped)', () => {
    const hookName = `H6IdentTest_${Date.now().toString(36)}`;
    cleanDedupFiles(hookName);

    const input = { tool_name: 'Write', tool_input: { file_path: 'src/auth/token.ts', content: 'x'.repeat(50) } };

    // First: proceed. Second (byte-identical): deduped -> skip. This preserves
    // the plugin+project double-load protection the guard exists for.
    expect(utils.dedupGuard(hookName, input)).toBe(false);
    expect(utils.dedupGuard(hookName, JSON.parse(JSON.stringify(input)))).toBe(true);

    cleanDedupFiles(hookName);
  });

  it('Test 3 — the test-mode bypass still short-circuits when VITEST=true', () => {
    process.env.VITEST = 'true';
    const hookName = `H6BypassTest_${Date.now().toString(36)}`;
    const input = { tool_name: 'Write', tool_input: { file_path: 'src/x.ts', content: 'y' } };
    // Both calls return false because the bypass returns false unconditionally.
    expect(utils.dedupGuard(hookName, input)).toBe(false);
    expect(utils.dedupGuard(hookName, input)).toBe(false);
  });
});
