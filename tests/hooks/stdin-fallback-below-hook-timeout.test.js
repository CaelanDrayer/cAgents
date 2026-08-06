import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Regression test: readStdin()'s fallback deadline must stay strictly below the
 * smallest hook `timeout` registered in .claude/settings.json.
 *
 * Bug: STDIN_FALLBACK_MS was 3000 ms while PreToolUse[Agent] and
 * UserPromptSubmit are both registered with `timeout: 3` (= 3000 ms). Equal
 * deadlines are a guaranteed race and the harness won it — the hook was
 * cancelled at the wall before it could emit a verdict, so its output was
 * discarded entirely.
 *
 * Empirical evidence (14-day transcript window, 2135 sessions):
 *   - PreToolUse:Agent    — 368 successes (p50 178 ms) + 68 cancelled at 3010-3063 ms
 *   - UserPromptSubmit    — 13 cancelled at ~3012 ms
 *   - PreToolUse:Write|Edit (timeout 5, so it survived) — 369 runs < 500 ms and
 *     36 runs >= 3000 ms (max 3168 ms), with NOTHING in between. That bimodal
 *     gap is the signature of a fixed deadline firing, not gradual slowness.
 *
 * Fix: STDIN_FALLBACK_MS = 2000, leaving >= 1 s of headroom for node cold start
 * plus handler work inside the tightest (3 s) budget.
 *
 * Could have been caught by: this invariant test, which fails the moment either
 * the constant is raised or a hook is registered with a tighter timeout.
 */

const ROOT = process.cwd();

function registeredTimeoutsMs() {
  const settings = JSON.parse(readFileSync(join(ROOT, '.claude/settings.json'), 'utf8'));
  const out = [];
  for (const [event, groups] of Object.entries(settings.hooks || {})) {
    for (const group of groups || []) {
      for (const hook of group.hooks || []) {
        // Claude Code's default command-hook timeout is 600 s when unset; an
        // unset timeout can never be the binding constraint, so skip it.
        if (typeof hook.timeout === 'number') {
          out.push({ event, matcher: group.matcher ?? '*', ms: hook.timeout * 1000 });
        }
      }
    }
  }
  return out;
}

describe('readStdin fallback deadline vs registered hook timeouts', () => {
  const hookUtils = readFileSync(join(ROOT, '.claude/hooks/hook-utils.cjs'), 'utf8');

  it('declares STDIN_FALLBACK_MS as a named constant', () => {
    expect(
      /const STDIN_FALLBACK_MS = (\d+);/.test(hookUtils),
      'hook-utils.cjs must declare `const STDIN_FALLBACK_MS = <number>;` so this invariant is checkable',
    ).toBe(true);
  });

  it('uses the constant for the readStdin fallback timer (no stray literal)', () => {
    expect(hookUtils).toContain('}, STDIN_FALLBACK_MS);');
  });

  it('exports STDIN_FALLBACK_MS', async () => {
    const mod = await import(join(ROOT, '.claude/hooks/hook-utils.cjs'));
    const exported = (mod.default ?? mod).STDIN_FALLBACK_MS;
    expect(typeof exported).toBe('number');
    expect(exported).toBe(parseInt(hookUtils.match(/const STDIN_FALLBACK_MS = (\d+);/)[1], 10));
  });

  it('stays strictly below every registered hook timeout, with >=500ms headroom', () => {
    const fallbackMs = parseInt(hookUtils.match(/const STDIN_FALLBACK_MS = (\d+);/)[1], 10);
    const timeouts = registeredTimeoutsMs();

    expect(timeouts.length, 'expected at least one hook with an explicit timeout').toBeGreaterThan(0);

    const tightest = timeouts.reduce((a, b) => (b.ms < a.ms ? b : a));
    expect(
      fallbackMs,
      `STDIN_FALLBACK_MS (${fallbackMs}ms) must be < the tightest registered hook timeout ` +
        `(${tightest.event}[${tightest.matcher}] = ${tightest.ms}ms). Equal deadlines race, and the ` +
        `harness wins — the hook is cancelled and its verdict discarded.`,
    ).toBeLessThan(tightest.ms);

    expect(
      tightest.ms - fallbackMs,
      `Need >=500ms of headroom between STDIN_FALLBACK_MS (${fallbackMs}ms) and the tightest ` +
        `timeout (${tightest.ms}ms) for node cold start plus handler work; got ${tightest.ms - fallbackMs}ms.`,
    ).toBeGreaterThanOrEqual(500);
  });

  it('an empty payload (what a timed-out stdin read yields) never denies', async () => {
    // Pins the "not a semantic change" half of the fix: letting the slow path
    // finish must produce the same effective outcome as being cancelled.
    const { execFileSync } = await import('child_process');
    for (const dispatcher of ['agent-dispatch.cjs', 'write-edit-dispatch.cjs']) {
      const stdout = execFileSync('node', [join(ROOT, '.claude/hooks', dispatcher)], {
        input: '{}',
        encoding: 'utf8',
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const out = JSON.parse(stdout || '{}');
      expect(
        out.hookSpecificOutput?.permissionDecision,
        `${dispatcher} must not deny on an empty payload`,
      ).not.toBe('deny');
      expect(out.continue === undefined || out.continue === true).toBe(true);
    }
  });
});
