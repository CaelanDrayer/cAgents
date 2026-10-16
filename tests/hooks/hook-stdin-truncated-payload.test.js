import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Regression test for HS-3 (+ H6, W5, HS-7): the readStdin() contract in
// hook-utils.cjs.
//
// Before the fix, a hook read stdin until EOF. If the harness held stdin open,
// the hook printed its verdict at the 2000 ms fallback and then did not exit
// until it was killed. A truncated payload also reached each guard as `{}`, so
// the guard saw an empty command and allowed the call without a check.
//
// The contract that these tests pin:
//   1. A complete payload on a held-open stdin gives a verdict and an exit < 3 s.
//   2. A truncated payload DENIES for the real guards (BashValidator,
//      WriteEditDispatch, AgentDispatch).
//   3. A truncated payload does NOT deny for SessionInitGate (advisory, HS-7).
//   4. An empty payload ALLOWS with exactly one systemMessage (W5).
//   5. Advisory hooks fail open on a truncated payload.
//   6. A stdin 'error' after partial bytes DENIES for the guards (F1); a stdin
//      'error' with no bytes ALLOWS with exactly one systemMessage.
//
// The payloads are inlined copies of the scratch fixtures from the review
// session (scratch/A/fx). Each one uses a temp dir as `cwd` and as
// CLAUDE_PROJECT_DIR, so no hook reads or writes the real repo sessions.

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const EXIT_BUDGET_MS = 3000;
const GUARDS = ['bash-validator.cjs', 'write-edit-dispatch.cjs', 'agent-dispatch.cjs'];

let proj;
let errorPreload;

// F1: a preload that swaps process.stdin for a PassThrough. Once the hook has
// attached its 'error' listener, the preload writes FAKE_STDIN_PARTIAL (if
// any) and then destroys the stream with ECONNRESET. This drives the real
// readStdin() 'error' branch inside the real hook process, deterministically.
const ERROR_PRELOAD = `
const { PassThrough } = require('stream');
const fake = new PassThrough();
Object.defineProperty(process, 'stdin', { configurable: true, get: () => fake });
const partial = process.env.FAKE_STDIN_PARTIAL || '';
const poll = setInterval(() => {
  if (fake.listenerCount('error') === 0) return;
  clearInterval(poll);
  if (partial) fake.write(partial);
  setTimeout(() => {
    const err = new Error('read ECONNRESET');
    err.code = 'ECONNRESET';
    fake.destroy(err);
  }, 30);
}, 5);
`;

function payload(kind) {
  const base = { session_id: 's-a1', hook_event_name: 'PreToolUse', cwd: proj };
  if (kind === 'bash-allow') {
    return JSON.stringify({ ...base, tool_name: 'Bash', tool_use_id: 'tu-allow-1', tool_input: { command: 'ls -la' } });
  }
  if (kind === 'bash-deny') {
    return JSON.stringify({ ...base, tool_name: 'Bash', tool_use_id: 'tu-deny-1', tool_input: { command: 'rm -rf /' } });
  }
  // The first 60 bytes of a real PreToolUse payload: it stops inside a key.
  if (kind === 'truncated') return '{"session_id":"s-a1","hook_event_name":"PreToolUse","tool_na';
  throw new Error(`unknown payload kind: ${kind}`);
}

/**
 * Spawn a hook, write `input` to its stdin, and either close stdin or hold it
 * open. Resolve with the wall-clock ms to exit, the exit code, and the stdout.
 * A hard kill at 15 s turns a hang into a clear failure instead of a test timeout.
 */
function runHook(hookFile, input, { holdOpen, stdinError }) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, CLAUDE_PROJECT_DIR: proj };
    delete env.CAGENTS_SESSION_ID;
    const args = [join(HOOKS_DIR, hookFile)];
    if (stdinError !== undefined) {
      env.FAKE_STDIN_PARTIAL = stdinError;
      args.unshift('-r', errorPreload);
    }
    const t0 = Date.now();
    const child = spawn('node', args, { env, cwd: proj });
    let stdout = '';
    let stderr = '';
    const killer = setTimeout(() => child.kill('SIGKILL'), 15000);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      clearTimeout(killer);
      resolve({ ms: Date.now() - t0, code, signal, stdout: stdout.trim(), stderr });
    });
    if (input) child.stdin.write(input);
    if (!holdOpen) child.stdin.end();
  });
}

function parseSingle(stdout) {
  const lines = stdout.split('\n').filter((l) => l.trim());
  expect(lines, `expected exactly one JSON line, got: ${stdout}`).toHaveLength(1);
  return JSON.parse(lines[0]);
}

const isDeny = (v) => v?.hookSpecificOutput?.permissionDecision === 'deny';

beforeAll(() => {
  proj = mkdtempSync(join(tmpdir(), 'hook-stdin-'));
  errorPreload = join(proj, 'stdin-error-preload.cjs');
  writeFileSync(errorPreload, ERROR_PRELOAD);
});
afterAll(() => { rmSync(proj, { recursive: true, force: true }); });

describe('hook stdin contract (HS-3 / H6 / W5 / HS-7)', () => {
  it('a complete payload on a held-open stdin gives a verdict and exits in < 3 s', async () => {
    const allow = await runHook('bash-validator.cjs', payload('bash-allow'), { holdOpen: true });
    expect(allow.signal, allow.stderr).toBeNull();
    expect(allow.code).toBe(0);
    expect(allow.ms).toBeLessThan(EXIT_BUDGET_MS);
    expect(isDeny(parseSingle(allow.stdout))).toBe(false);

    // The early parse must not turn a deny into an allow.
    const deny = await runHook('bash-validator.cjs', payload('bash-deny'), { holdOpen: true });
    expect(deny.signal, deny.stderr).toBeNull();
    expect(deny.ms).toBeLessThan(EXIT_BUDGET_MS);
    expect(isDeny(parseSingle(deny.stdout))).toBe(true);
  }, 30000);

  it.each(GUARDS)('a truncated payload DENIES for the guard %s (stdin closed)', async (hook) => {
    const r = await runHook(hook, payload('truncated'), { holdOpen: false });
    expect(r.code, r.stderr).toBe(0);
    const v = parseSingle(r.stdout);
    expect(isDeny(v)).toBe(true);
    expect(v.hookSpecificOutput.permissionDecisionReason).toMatch(/FAIL-CLOSED.*truncated/);
  }, 30000);

  it('a truncated payload DENIES on a held-open stdin and still exits in < 3 s', async () => {
    const r = await runHook('bash-validator.cjs', payload('truncated'), { holdOpen: true });
    expect(r.signal, r.stderr).toBeNull();
    expect(r.ms).toBeLessThan(EXIT_BUDGET_MS);
    expect(isDeny(parseSingle(r.stdout))).toBe(true);
  }, 30000);

  it('a truncated payload does NOT deny for SessionInitGate (advisory, HS-7)', async () => {
    const r = await runHook('session-init-gate.cjs', payload('truncated'), { holdOpen: false });
    expect(r.code, r.stderr).toBe(0);
    const v = parseSingle(r.stdout);
    expect(isDeny(v)).toBe(false);
    expect(v.continue).toBe(true);
  }, 30000);

  it.each([
    ['stdin closed', false],
    ['stdin held open', true],
  ])('an empty payload ALLOWS with exactly one systemMessage (%s)', async (_label, holdOpen) => {
    for (const hook of GUARDS) {
      const r = await runHook(hook, '', { holdOpen });
      expect(r.signal, `${hook}: ${r.stderr}`).toBeNull();
      expect(r.ms, hook).toBeLessThan(EXIT_BUDGET_MS);
      const v = parseSingle(r.stdout);
      expect(isDeny(v), hook).toBe(false);
      expect(v.continue, hook).toBe(true);
      expect(typeof v.systemMessage, hook).toBe('string');
      expect(v.systemMessage).toMatch(/FAIL-OPEN.*empty hook payload/);
    }
  }, 60000);

  it.each(['notification.cjs', 'session-init-gate.cjs'])(
    'the advisory hook %s fails OPEN on a truncated or empty payload',
    async (hook) => {
      for (const input of [payload('truncated'), '']) {
        const r = await runHook(hook, input, { holdOpen: false });
        expect(r.code, r.stderr).toBe(0);
        const v = parseSingle(r.stdout);
        expect(isDeny(v)).toBe(false);
        expect(v.continue).toBe(true);
      }
    },
    30000,
  );

  // F1: before the fix, readStdin resolved {} with status 'error' on a stdin
  // 'error', which neither the truncated (deny) nor the empty (allow + warn)
  // branch handled, so every guard printed a bare {"continue":true}.
  it.each(GUARDS)('a stdin error after partial bytes DENIES for the guard %s (F1)', async (hook) => {
    const r = await runHook(hook, '', { holdOpen: false, stdinError: payload('truncated') });
    expect(r.signal, r.stderr).toBeNull();
    expect(r.code, r.stderr).toBe(0);
    const v = parseSingle(r.stdout);
    expect(isDeny(v), r.stdout).toBe(true);
    expect(v.hookSpecificOutput.permissionDecisionReason).toMatch(/FAIL-CLOSED.*truncated/);
  }, 30000);

  it.each(GUARDS)('a stdin error with no bytes ALLOWS with exactly one systemMessage for %s (F1)', async (hook) => {
    const r = await runHook(hook, '', { holdOpen: false, stdinError: '' });
    expect(r.signal, r.stderr).toBeNull();
    expect(r.code, r.stderr).toBe(0);
    const v = parseSingle(r.stdout);
    expect(isDeny(v), r.stdout).toBe(false);
    expect(v.continue).toBe(true);
    expect(v.systemMessage).toMatch(/FAIL-OPEN.*empty hook payload/);
  }, 30000);
});
