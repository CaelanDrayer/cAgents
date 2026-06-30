import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Regression test for the un-unref'd timer linger in hook-utils.cjs
// (findings C5.1 / A2-01 / A7-01).
//
// Before the fix, EVERY hook process lingered ~3s after its work completed,
// because readStdin()'s 3000ms fallback setTimeout (and dedupGuard()'s 2000ms
// cleanup setTimeout) kept the Node event loop alive even after stdin ended
// and the hook had already printed its JSON. Calling .unref() on both timers
// drops their keep-alive so the process exits as soon as the work is done.
//
// These tests spawn a representative hook with piped JSON on stdin that is then
// closed, and assert the process exits in WELL under 500ms — proving the ~3s
// linger is gone. (Observed post-fix: ~150ms; pre-fix: >3000ms.)

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const LINGER_BUDGET_MS = 500; // far below the ~3000ms pre-fix linger, far above ~150ms node cold start

/**
 * Spawn a hook as a child process, write `input` to its stdin, close stdin,
 * and resolve with the wall-clock ms from spawn to process exit.
 */
function measureExitLatency(hookName, input, env = process.env) {
  const hookPath = join(HOOKS_DIR, hookName);
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const child = spawn('node', [hookPath], { env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', reject);
    child.on('close', () => {
      resolve({ ms: Date.now() - t0, stdout: stdout.trim(), stderr });
    });
    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}

// Build an env that DISABLES the dedupGuard test-mode bypass, so the 2000ms
// dedup cleanup timer is actually created and its .unref() is exercised.
function dedupActiveEnv() {
  const env = { ...process.env };
  delete env.VITEST;
  delete env.CAGENTS_HOOK_DEDUP_DISABLE;
  env.NODE_ENV = 'production';
  return env;
}

describe('hook exit latency (no un-unref\'d timer linger)', () => {
  it('hook-utils.cjs exists', () => {
    expect(existsSync(join(HOOKS_DIR, 'hook-utils.cjs'))).toBe(true);
  });

  it('notification.cjs exits well under 500ms (readStdin fallback timer is unref\'d)', async () => {
    // Default env inherits VITEST=true, so dedupGuard is bypassed and this
    // isolates the readStdin() 3000ms fallback timer fix.
    const { ms, stdout } = await measureExitLatency('notification.cjs', {
      type: 'info',
      message: 'latency-probe-' + Date.now() + '-' + Math.random(),
    });
    expect(stdout).toContain('"continue":true');
    expect(ms).toBeLessThan(LINGER_BUDGET_MS);
  });

  it('notification.cjs exits well under 500ms with dedupGuard ACTIVE (dedup cleanup timer is unref\'d)', async () => {
    // Unique message => not a duplicate => the non-bypassed dedupGuard path runs
    // and creates the 2000ms cleanup timer. If that timer were NOT unref'd the
    // process would linger ~2s and blow the budget.
    const { ms, stdout } = await measureExitLatency(
      'notification.cjs',
      { type: 'info', message: 'dedup-active-probe-' + Date.now() + '-' + Math.random() },
      dedupActiveEnv()
    );
    expect(stdout).toContain('"continue":true');
    expect(ms).toBeLessThan(LINGER_BUDGET_MS);
  });

  it('bash-validator.cjs exits well under 500ms on a benign command', async () => {
    // Second representative hook. `ls` is benign (not in deny/ask lists) so the
    // hook returns quickly; the assertion proves it does not linger afterward.
    const { ms } = await measureExitLatency('bash-validator.cjs', {
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
    });
    expect(ms).toBeLessThan(LINGER_BUDGET_MS);
  });

  it('hook-utils.cjs calls .unref() on both fallback timers (guards against regression)', () => {
    const src = readFileSync(join(HOOKS_DIR, 'hook-utils.cjs'), 'utf8');
    // readStdin fallback timer
    expect(src).toMatch(/stdinFallbackTimer\.unref\(\)/);
    // dedupGuard cleanup timer
    expect(src).toMatch(/dedupCleanupTimer\.unref\(\)/);
  });
});
