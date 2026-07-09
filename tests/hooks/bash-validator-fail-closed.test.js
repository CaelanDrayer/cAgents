/**
 * bash-validator-fail-closed.test.js — R2 REQUIRED (WI-2 C2 blocking fix).
 *
 * Proves the fail-closed wiring at .claude/hooks/bash-validator.cjs Stage 1
 * (the explicit try/catch around evaluate()). If the GuardFall evaluator's
 * evaluate() THROWS, bash-validator MUST emit a DENY verdict for an otherwise
 * benign command like `ls -la` — it must NOT fall through to `continue: true`.
 *
 * This matters because createHook()'s own outer catch fails OPEN
 * ({continue:true}); the guard's protection would silently vanish on any
 * evaluator crash if Stage 1 relied on that outer catch. The explicit
 * try/catch in bash-validator.cjs is the load-bearing fail-closed layer, and
 * this test is its regression pin.
 *
 * Harness: bash-validator.cjs require()s './hook-utils.cjs' and
 * './bash-guard-evaluator.cjs' by __dirname-relative path. To force evaluate()
 * to throw WITHOUT touching the shipped evaluator, we copy bash-validator.cjs +
 * the real hook-utils.cjs into a temp dir alongside a STUB
 * bash-guard-evaluator.cjs whose evaluate() throws, then invoke the temp hook
 * with a benign Bash payload over stdin and assert the deny.
 *
 * A companion case runs the REAL, unmodified hook against the same benign
 * command and asserts it continues — the sanity contrast proving `ls -la` is
 * only denied because the evaluator faulted, not for any intrinsic reason.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const REPO_ROOT = process.cwd();
const HOOKS_DIR = join(REPO_ROOT, '.claude', 'hooks');
const REAL_HOOK = join(HOOKS_DIR, 'bash-validator.cjs');

// Stub evaluator whose evaluate() always throws — the injected fault.
const THROWING_EVALUATOR = `'use strict';
function evaluate() { throw new Error('injected evaluator fault (test)'); }
function tokenize() { throw new Error('injected tokenize fault (test)'); }
module.exports = { evaluate, tokenize };
`;

let tmpRoot;
let faultHook;

beforeAll(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'bash-validator-failclosed-'));
  const tmpHooks = join(tmpRoot, 'hooks');
  mkdirSync(tmpHooks, { recursive: true });

  // Copy the real hook + the real hook-utils (its only requires are fs/path
  // built-ins, so no further copies are needed), then drop in the throwing stub.
  copyFileSync(REAL_HOOK, join(tmpHooks, 'bash-validator.cjs'));
  copyFileSync(join(HOOKS_DIR, 'hook-utils.cjs'), join(tmpHooks, 'hook-utils.cjs'));
  writeFileSync(join(tmpHooks, 'bash-guard-evaluator.cjs'), THROWING_EVALUATOR, 'utf8');

  faultHook = join(tmpHooks, 'bash-validator.cjs');
});

afterAll(() => {
  if (tmpRoot) rmSync(tmpRoot, { recursive: true, force: true });
});

// Invoke a hook script with a JSON payload on stdin; capture stdout + stderr +
// exit status (spawnSync so stderr is available even on a clean exit 0).
function invokeHook(hookPath, payload, cwd) {
  const res = spawnSync('node', [hookPath], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    cwd: cwd || REPO_ROOT,
    timeout: 8000,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  return { stdout: res.stdout || '', stderr: res.stderr || '', status: res.status };
}

describe('bash-validator fail-closed wiring (evaluator throws)', () => {
  it('DENIES a benign `ls -la` when evaluate() throws (does NOT continue)', () => {
    const { stdout, stderr } = invokeHook(
      faultHook,
      { tool_input: { command: 'ls -la' } },
      join(tmpRoot, 'hooks')
    );
    const parsed = JSON.parse(stdout.trim());

    // Fail-closed: a throwing evaluator must yield a deny verdict, never continue.
    expect(parsed.continue).not.toBe(true);
    expect(parsed.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(parsed.hookSpecificOutput?.permissionDecisionReason).toMatch(/fail-closed/i);

    // The Stage-1 explicit catch logs the fail-closed reason to stderr.
    expect(stderr).toMatch(/fail-closed/i);
  });

  it('SANITY CONTRAST: the real hook (working evaluator) lets `ls -la` continue', () => {
    const { stdout } = invokeHook(
      REAL_HOOK,
      { tool_input: { command: 'ls -la' } },
      REPO_ROOT
    );
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.continue).toBe(true);
  });
});
