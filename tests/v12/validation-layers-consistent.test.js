/**
 * Phase 8 (A8-04 / A3-07): Validation-layers consistency guard.
 *
 * The cAgents validation surface is honestly LAYERED, not one monolithic
 * checklist. This guard pins the two invariants the Phase-8 clarity pass
 * established, so neither regresses:
 *
 *   1. The docs state EXACTLY "5" hook-enforced checks (the only enforced
 *      layer). The canonical "Validation Layers" map lives in completion.md;
 *      the active 5-check file declares "(5 checks)". The canonical narrative
 *      "5 enforced" appears in both completion.md and validation-framework.md.
 *   2. No CURRENT (non-historical) "(0-5)" revision-round field-schema claim
 *      survives. The canonical pipeline revision cap is 3 total cycles
 *      (`revision.max_cycles: 3`); status.yaml / execution_summary.yaml schema
 *      ranges must read "(0-3)". A clearly-historical mention of "(0-5)"
 *      (e.g. "lowered from 5", "Any `(0-5)` range is stale") is allowed — only
 *      the field-PAIRED schema shape is forbidden.
 *
 * Failing-before evidence (A3-07): validation-framework.md lines 234/236
 *      pinned `revision_rounds_used (0-5)` and `revision_round (0-5)`,
 *      contradicting the canonical max-3-cycle cap.
 * Passing-after: those schema lines read "(0-3)" and the field-paired "(0-5)"
 *      shape appears nowhere as a current claim.
 *
 * Note: assertions are deliberately grouped into a small number of it() blocks
 * to keep this file's test-count footprint minimal (CLAUDE.md test-count
 * freshness is owned by the P2 count sweep).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const completion = readFileSync(join(ROOT, '.claude/rules/quality/completion.md'), 'utf8');
const framework = readFileSync(join(ROOT, '.claude/rules/quality/validation-framework.md'), 'utf8');
const active = readFileSync(join(ROOT, '.claude/rules/quality/resources/validation-checklist-active.md'), 'utf8');

// Field-PAIRED schema shape ONLY: "revision_round (0-5)" /
// "revision_rounds_used (0-5)". Does NOT match historical prose like
// "lowered from 5" or a backticked "Any `(0-5)` range is stale".
const FORBIDDEN_05 = /(?:revision_round|revision_rounds_used)\s*\(0-5\)/i;

describe('Phase 8: validation-layers consistency', () => {
  it('states exactly 5 hook-enforced checks via a single legible Validation Layers map', () => {
    // completion.md owns the canonical map with all three honest layers.
    expect(
      /##+\s*Validation Layers/i.test(completion),
      'completion.md must contain the canonical "Validation Layers" section.',
    ).toBe(true);
    for (const label of ['**Enforced**', '**Advisory (by convention)**', '**Aspirational (deferred)**']) {
      expect(completion.includes(label), `completion.md must include the "${label}" layer row.`).toBe(true);
    }
    // Enforced layer = 5 checks, the 3 enforcing hooks named.
    expect(/Enforced\*\*\s*\|\s*5 cross-cutting/i.test(completion)).toBe(true);
    for (const hook of ['subagent-stop-tracker.cjs', 'post-write-validator.cjs', 'verify-completion.cjs']) {
      expect(completion.includes(hook), `completion.md Enforced layer must name ${hook}.`).toBe(true);
    }
    // Canonical narrative "5 enforced" in both quality docs.
    expect(/5 enforced/i.test(completion), 'completion.md must carry the "5 enforced" narrative.').toBe(true);
    expect(/5 enforced/i.test(framework), 'validation-framework.md must carry the "5 enforced" narrative.').toBe(true);
    // Active 5-check file heading declares "(5 checks)".
    const firstHeading = active.split('\n').find((l) => l.startsWith('# '));
    expect(/\(5 checks\)/i.test(firstHeading || ''), `Active checklist heading must declare "(5 checks)"; got "${firstHeading}".`).toBe(true);
  });

  it('carries no CURRENT field-paired "(0-5)" revision-round claim; schema reads "(0-3)"', () => {
    for (const [name, content] of [['completion.md', completion], ['validation-framework.md', framework]]) {
      expect(
        FORBIDDEN_05.test(content),
        `${name} contains a CURRENT "revision_round (0-5)" field-schema claim. ` +
          'The canonical pipeline revision cap is 3 total cycles — use "(0-3)".',
      ).toBe(false);
    }
    expect(/revision_rounds_used \(0-3\)/.test(framework), 'execution_summary.yaml schema must read revision_rounds_used (0-3).').toBe(true);
    expect(/revision_round \(0-3\)/.test(framework), 'status.yaml schema must read revision_round (0-3).').toBe(true);
  });
});
