/**
 * P5.1 regression — secret-detection FALSE_POSITIVE_CONTENT overlap filter.
 *
 * BUG (pre-fix): isContentFalsePositive() suppressed a secret finding when ANY
 * false-positive marker appeared ANYWHERE in the ±50-char window around the
 * matched token — not only when the marker overlapped the token. The two
 * broadest markers, /<[^>]+>/ (any HTML-ish tag) and /\.{3,}/ (any run of 3+
 * dots), therefore suppressed a LIVE token that merely sat next to an HTML
 * comment or a "..." run.
 *
 * FIX (two parts):
 *   1. DROP the two broadest markers /<[^>]+>/ and /\.{3,}/.
 *   2. Require a retained marker to OVERLAP the matched token region (not merely
 *      appear somewhere in the window) before it suppresses.
 *
 * This only NARROWS suppression (more tokens block) — never widens it, keeping
 * the hook FAIL-CLOSED.
 *
 * Tokens are built via string concatenation so THIS test source file never
 * contains a contiguous full-length token (which would self-block on Write and
 * be caught by the hook's own scan). scanForSecrets is called in-process against
 * runtime-constructed content strings that DO contain full tokens.
 *
 * FAILING-BEFORE / PASSING-AFTER:
 *   - Cases 1–4 (token adjacent to, but NOT overlapping, a dropped/retained
 *     marker): pre-fix the marker suppressed → critical empty → assertion FAILS;
 *     post-fix not suppressed → critical non-empty → PASSES.
 *   - Case 5 (a real ${...} placeholder that OVERLAPS the token): suppressed both
 *     before and after — proves the overlap logic keeps genuine placeholders
 *     suppressed, not merely that markers were deleted.
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const HOOK_PATH = join(process.cwd(), '.claude', 'hooks', 'secret-detection.cjs');
const { scanForSecrets } = require(HOOK_PATH);

// Full-length token shapes, split so the source never carries a contiguous token.
// GitHub PAT: /ghp_[a-zA-Z0-9]{36}/ — 36-char body, no "xxx" run, no placeholder words.
const GH = 'ghp_' + 'ABCDEFGHIJKLMNOPQRSTUVWX0123456789ab';
// AWS Access Key ID: /AKIA[0-9A-Z]{16}/ — reuse the shape the existing suite uses.
const AWS = 'AKI' + 'AIOSFODNN7REALKEY1';
// Anthropic: /sk-ant-[a-zA-Z0-9_-]{40,}/ — 44-char body (>= 40).
const ANTHROPIC = 'sk-' + 'ant-' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefgh';

const SAFE_PATH = '/tmp/config.js'; // NOT a placeholder/test path — scanned normally.

function criticalCount(content) {
  return scanForSecrets(content, SAFE_PATH).critical.length;
}

describe('secret-detection FALSE_POSITIVE_CONTENT overlap filter (P5.1)', () => {
  it('exists and exports scanForSecrets', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
    expect(typeof scanForSecrets).toBe('function');
  });

  // ── Cases 1–4: live token ADJACENT to a marker → must STILL be detected ──────

  it('(1) detects a GitHub token adjacent to an HTML comment', () => {
    const content = '<!-- github auth config below -->\nconst token = "' + GH + '";';
    expect(criticalCount(content)).toBeGreaterThan(0);
  });

  it('(2) detects a GitHub token adjacent to a "..." run', () => {
    const content = 'token ... loaded from env: const t = "' + GH + '";';
    expect(criticalCount(content)).toBeGreaterThan(0);
  });

  it('(3) detects an AWS key adjacent to (but not overlapping) a ${...} placeholder', () => {
    // ${PLACEHOLDER} sits within the ±50 window but does not overlap the token.
    const content = 'region=us-east-1 other=${PLACEHOLDER_VALUE} key=' + AWS;
    expect(criticalCount(content)).toBeGreaterThan(0);
  });

  it('(4) detects an Anthropic key adjacent to an HTML comment', () => {
    const content = '<!-- anthropic api key -->\nconst k = "' + ANTHROPIC + '";';
    expect(criticalCount(content)).toBeGreaterThan(0);
  });

  // ── Case 5: a real ${...} placeholder that OVERLAPS the token → suppressed ───

  it('(5) still suppresses a token wrapped in an overlapping ${...} placeholder', () => {
    // The ${...} marker fully spans the token region, so it legitimately overlaps.
    const content = 'value=${' + GH + '}';
    expect(criticalCount(content)).toBe(0);
  });

  it('(5b) still suppresses an AWS token wrapped in an overlapping ${...} placeholder', () => {
    const content = 'aws=${' + AWS + '}';
    expect(criticalCount(content)).toBe(0);
  });
});
