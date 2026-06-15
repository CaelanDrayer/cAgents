// Regression test for WI-1 (D1a, v12.19.0): head+tail size cap inside
// scanForSecrets. SAFETY-CRITICAL deny-path surface.
//
// Bug-Driven Testing mandate: failing-before / passing-after. Before the cap,
// scanForSecrets ran every SECRET_PATTERN regex over the FULL content of a
// multi-MB file on every Write/Edit — a latency/DoS risk. After the cap, a
// file larger than CAGENTS_SECRET_SCAN_MAX_BYTES (default 512KB) is scanned via
// a head window (first 64KB) + tail window (last 64KB) instead. The gating
// requirement is DETECTION-correctness: a secret in the HEAD or TAIL of a
// >cap file must still BLOCK (still produce a critical/high finding).
//
// The hook registers createHook unconditionally at top level, but require()ing
// it here only exercises the exported internals: createHook's readStdin sees a
// TTY / no piped stdin in this in-process require() context and resolves to {}
// without firing the handler, so importing scanForSecrets has no side effect.
// (The deny-path-under-production registration is covered by the dedicated
// regression test in secret-detection-registration.test.js.)
//
// NOTE: the AWS sample key is built by concatenation so the literal full token
// never appears as one contiguous string in THIS file — otherwise the
// secret-detection hook would block Write/Edit of this very test file.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import { join } from 'path';

const require = createRequire(import.meta.url);
const HOOK_PATH = join(process.cwd(), '.claude', 'hooks', 'secret-detection.cjs');
const { scanForSecrets } = require(HOOK_PATH);

// A valid AWS Access Key ID: AKIA + 16 uppercase/digit chars. Matches
// /AKIA[0-9A-Z]{16}/ (severity: critical) in SECRET_PATTERNS. Built by
// concatenation to avoid self-blocking this test file.
const AWS_KEY = 'AKIA' + 'IOSFODNN7' + 'ABCDEFG'; // AKIA + 16 chars (9 + 7)

const CAP = 512 * 1024; // default cap

function hasSignificantFinding(findings) {
  return findings.critical.length + findings.high.length > 0;
}

describe('secret-detection: head+tail size cap (WI-1 / D1a)', () => {
  let errorSpy;

  beforeEach(() => {
    delete process.env.CAGENTS_SECRET_SCAN_MAX_BYTES;
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    delete process.env.CAGENTS_SECRET_SCAN_MAX_BYTES;
  });

  it('sanity: AWS_KEY is a well-formed AKIA key (AKIA + 16 chars)', () => {
    expect(AWS_KEY).toMatch(/^AKIA[0-9A-Z]{16}$/);
  });

  it('Test 1: a head secret in a >cap file still BLOCKS (windowed scan finds it)', () => {
    // Secret at the very HEAD, then ~600KB of filler pushing total over the cap.
    const content = AWS_KEY + 'ab12cd34ef'.repeat(60 * 1024);
    expect(content.length).toBeGreaterThan(CAP);

    const findings = scanForSecrets(content, '/tmp/big-head.ts');
    expect(hasSignificantFinding(findings)).toBe(true);
    expect(findings.critical.some(f => f.type === 'AWS Access Key ID')).toBe(true);
  });

  it('Test 1b: a tail secret in a >cap file still BLOCKS (tail window finds it)', () => {
    // Secret at the very TAIL, preceded by ~600KB of filler.
    const content = 'ab12cd34ef'.repeat(60 * 1024) + AWS_KEY;
    expect(content.length).toBeGreaterThan(CAP);

    const findings = scanForSecrets(content, '/tmp/big-tail.ts');
    expect(hasSignificantFinding(findings)).toBe(true);
  });

  it('Test 2: a small (<cap) file containing the same secret still returns the finding (pre-cap behavior unchanged)', () => {
    const content = 'const key = "' + AWS_KEY + '";';
    expect(content.length).toBeLessThan(CAP);

    const findings = scanForSecrets(content, '/tmp/small.ts');
    expect(hasSignificantFinding(findings)).toBe(true);
    expect(findings.critical.some(f => f.type === 'AWS Access Key ID')).toBe(true);
  });

  it('Test 3: cap triggers a windowed-scan warning on console.error (NOT a silent skip)', () => {
    const content = AWS_KEY + 'ab12cd34ef'.repeat(60 * 1024);
    scanForSecrets(content, '/tmp/warn.ts');

    expect(errorSpy).toHaveBeenCalled();
    const calledWithWindowedWarning = errorSpy.mock.calls.some(
      args => typeof args[0] === 'string' && args[0].includes('WINDOWED SCAN')
    );
    expect(calledWithWindowedWarning).toBe(true);
  });

  it('Test 4: a normal ~10KB file does NOT trigger the windowed path (no cap warning)', () => {
    const content = 'const key = "' + AWS_KEY + '";\n' + 'ab12cd34ef'.repeat(1024);
    expect(content.length).toBeLessThan(CAP);

    const findings = scanForSecrets(content, '/tmp/normal.ts');
    // Still detected (it's under the cap, full scan):
    expect(hasSignificantFinding(findings)).toBe(true);
    // But NO windowed-scan warning fired:
    const calledWithWindowedWarning = errorSpy.mock.calls.some(
      args => typeof args[0] === 'string' && args[0].includes('WINDOWED SCAN')
    );
    expect(calledWithWindowedWarning).toBe(false);
  });

  it('Test 5: env override (CAGENTS_SECRET_SCAN_MAX_BYTES) lowers the cap', () => {
    // Lower the cap to 1KB so a 2KB file triggers the windowed path with a
    // head secret. Confirms the cap is env-configurable, not hardcoded.
    process.env.CAGENTS_SECRET_SCAN_MAX_BYTES = String(1024);
    const content = AWS_KEY + 'ab12cd34ef'.repeat(205);

    const findings = scanForSecrets(content, '/tmp/env-cap.ts');
    expect(hasSignificantFinding(findings)).toBe(true);
    const calledWithWindowedWarning = errorSpy.mock.calls.some(
      args => typeof args[0] === 'string' && args[0].includes('WINDOWED SCAN')
    );
    expect(calledWithWindowedWarning).toBe(true);
  });

  // ACCEPTED DOCUMENTED RESIDUAL: a secret in the MIDDLE of a >cap file —
  // outside BOTH the 64KB head window and the 64KB tail window — is NOT
  // detected. This is the deliberate cost of the windowed scan. Detection of
  // head/tail secrets (where secrets overwhelmingly live: config/import blocks
  // at the top, appended env dumps at the bottom) is preserved, which is the
  // gating requirement. Sanitize-mode index fidelity for tail-window hits on
  // >512KB files is likewise an accepted residual (the `line`/index counts are
  // relative to the window, not the original content) — see the ponytail:
  // comment in scanForSecrets. We assert the residual explicitly so any future
  // change that accidentally "fixes" it (full scan) surfaces here as a failure
  // and a conscious re-decision.
  it('Test 6 (residual): a secret ONLY in the middle of a >cap file is NOT detected (documented tradeoff)', () => {
    const HEAD = 64 * 1024;
    const TAIL = 64 * 1024;
    // Build: 200KB head filler + secret + 600KB tail filler. The secret sits at
    // offset ~200KB (well past the 64KB head window) and ~600KB from the end
    // (well before the 64KB tail window).
    const headFiller = 'ab12cd34ef'.repeat(20 * 1024);
    const tailFiller = 'gh56ij78kl'.repeat(60 * 1024);
    const content = headFiller + AWS_KEY + tailFiller;
    expect(content.length).toBeGreaterThan(CAP);
    // Sanity: the secret is outside both windows.
    expect(headFiller.length).toBeGreaterThan(HEAD);
    expect(tailFiller.length).toBeGreaterThan(TAIL);

    const findings = scanForSecrets(content, '/tmp/middle.ts');
    expect(hasSignificantFinding(findings)).toBe(false);
  });
});
