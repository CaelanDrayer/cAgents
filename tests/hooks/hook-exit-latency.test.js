import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { existsSync, readFileSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

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

// Build an env that DISABLES the dedupGuard test-mode bypass, so the real
// dedup path runs. A2 (HS-2) removed the dedup cleanup timer: the marker now
// outlives the process for DEDUP_TTL_MS. TMPDIR points at a private temp dir,
// so the marker does not stay behind in the shared /tmp.
function dedupActiveEnv() {
  const env = { ...process.env };
  env.TMPDIR = mkdtempSync(join(tmpdir(), 'cagents-exit-latency-'));
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
    // and writes a marker. The dedup path must not keep the process alive.
    const { ms, stdout } = await measureExitLatency(
      'notification.cjs',
      { type: 'info', message: 'dedup-active-probe-' + Date.now() + '-' + Math.random() },
      dedupActiveEnv()
    );
    expect(stdout).toContain('"continue":true');
    expect(ms).toBeLessThan(LINGER_BUDGET_MS);
  });

  it('write-edit-dispatch.cjs exits well under 500ms on a benign write', async () => {
    // Second representative hook: the Write|Edit guard. It took the place of
    // the bash guard in v12.80.0 and stays here. A plain text write to a temp path is
    // allowed quickly; the assertion proves the hook does not linger afterward.
    const { ms } = await measureExitLatency('write-edit-dispatch.cjs', {
      tool_name: 'Write',
      tool_input: { file_path: join(tmpdir(), 'cagents-latency-probe.txt'), content: 'hello' },
    });
    expect(ms).toBeLessThan(LINGER_BUDGET_MS);
  });

  it('hook-utils.cjs unrefs the stdin fallback timer and dedupGuard sets no timer (guards against regression)', () => {
    const src = readFileSync(join(HOOKS_DIR, 'hook-utils.cjs'), 'utf8');
    // readStdin fallback timer
    expect(src).toMatch(/stdinFallbackTimer\.unref\(\)/);
    // A2 (HS-2): dedupGuard keeps its marker for DEDUP_TTL_MS and sets no
    // cleanup timer, so no dedup timer can hold the event loop open.
    const guard = src.slice(src.indexOf('function dedupGuard('), src.indexOf('const DEDUP_TTL_MS'));
    expect(guard.length).toBeGreaterThan(0);
    expect(guard).not.toMatch(/setTimeout\(/);
    expect(src).toMatch(/const DEDUP_TTL_MS = 5000;/);
  });
});
