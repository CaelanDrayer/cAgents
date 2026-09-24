/**
 * TASK-26 regression test: Check 4's vertical-slice-only evidence-chain clause.
 *
 * TASK-22 extended `agents/wave-reviewer/resources/gate-check-protocol.md`'s
 * Check 4 ("Acceptance Criteria Coverage") section with a vertical-slice-only
 * clause:
 *
 *   "for a `type: vertical-slice` wave only, add one more check. Confirm a
 *   downstream item's evidence cites the real artifact that its upstream
 *   slice dependency produced. Reject a placeholder citation."
 *
 * That clause is prose guidance for `cagents:wave-reviewer`, not live code.
 * This file therefore ships its own small REFERENCE IMPLEMENTATION,
 * `check4Passes()`, that encodes the clause's decision rule so the rule has
 * an executable, testable shape:
 *
 *   - Applies ONLY when `waveType === 'vertical-slice'`.
 *   - On a vertical-slice wave, a downstream item's evidence FAILS the check
 *     when it is a placeholder string (matches /^(TBD|TODO|pending)$/i) OR
 *     when it does not cite (contain) the upstream artifact's path.
 *   - On any other wave type, the clause does not apply, so the function
 *     always returns true here -- the ordinary Check-4 evidence-presence
 *     rule (real evidence must exist at all) is a separate, pre-existing
 *     check that is out of scope for this reference implementation.
 *
 * If this test fails, either `check4Passes()` regressed, or the "placeholder"
 * clause was removed/reworded in gate-check-protocol.md's Check 4 section.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const GATE_CHECK_PROTOCOL = 'agents/wave-reviewer/resources/gate-check-protocol.md';

/**
 * Reference implementation of Check 4's vertical-slice-only evidence-chain
 * clause (see file header). This is a test-local encoding of the prose rule
 * in gate-check-protocol.md, not a copy of production code.
 *
 * @param {string} waveType - e.g. 'vertical-slice', 'implementation'
 * @param {string} downstreamEvidence - the downstream item's evidence string
 * @param {string} upstreamArtifactPath - the real artifact the upstream
 *   slice dependency produced
 * @returns {boolean} false only when waveType is 'vertical-slice' AND the
 *   evidence is a placeholder or omits the upstream artifact path
 */
function check4Passes(waveType, downstreamEvidence, upstreamArtifactPath) {
  if (waveType !== 'vertical-slice') {
    return true;
  }
  const isPlaceholder = /^(TBD|TODO|pending)$/i.test(downstreamEvidence.trim());
  const citesUpstreamArtifact = downstreamEvidence.includes(upstreamArtifactPath);
  if (isPlaceholder || !citesUpstreamArtifact) {
    return false;
  }
  return true;
}

describe('TASK-26: wave-reviewer Check 4 evidence-chain clause (vertical-slice waves)', () => {
  const upstreamArtifactPath = 'outputs/wave-1/task-2/schema.sql';

  it('fails a placeholder downstream evidence string on a vertical-slice wave', () => {
    const result = check4Passes('vertical-slice', 'TBD', upstreamArtifactPath);
    expect(result).toBe(false);
  });

  it('is unaffected by the same placeholder evidence on a non-slice wave', () => {
    // The vertical-slice-only clause does not apply here. Check 4's ordinary
    // evidence-presence rule (reject empty/placeholder evidence outright) is
    // a separate, pre-existing check not modeled by this reference
    // implementation, so this reference function reports "unaffected" (true)
    // for any non-vertical-slice wave.
    const result = check4Passes('implementation', 'TBD', upstreamArtifactPath);
    expect(result).toBe(true);
  });

  it('passes a vertical-slice wave whose downstream evidence cites the real upstream artifact', () => {
    const result = check4Passes(
      'vertical-slice',
      `Confirmed users table via ${upstreamArtifactPath}:12`,
      upstreamArtifactPath
    );
    expect(result).toBe(true);
  });

  it('fails a vertical-slice wave whose downstream evidence omits the upstream artifact path', () => {
    const result = check4Passes(
      'vertical-slice',
      'Looks good, ran the migration successfully',
      upstreamArtifactPath
    );
    expect(result).toBe(false);
  });

  it('the Check 4 section in gate-check-protocol.md still documents the placeholder clause', () => {
    const abs = path.join(REPO_ROOT, GATE_CHECK_PROTOCOL);
    const content = fs.readFileSync(abs, 'utf8');

    const check4Match = content.match(
      /## Check 4 — Acceptance Criteria Coverage\n([\s\S]*?)(?=\n## Check 5)/
    );
    expect(check4Match).not.toBeNull();
    const check4Section = check4Match[1];

    expect(check4Section).toMatch(/vertical-slice/i);
    expect(check4Section).toMatch(/placeholder/i);
  });
});
