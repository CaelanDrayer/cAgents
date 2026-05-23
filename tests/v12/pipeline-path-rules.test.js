/**
 * P2-9: Pipeline path rules + orchestrator-skip enum regression test.
 *
 * Locks in the v12.7.0 contract for pipeline-path naming and orchestrator-
 * skip rationale:
 *
 *   1. .claude/skills/run/reference/adaptive-pipeline.md documents exactly
 *      TWO named paths: `fast` and `standard`. The pre-v12.7 names
 *      (`Minimal`, `Medium`, `Full`) must not appear as path labels.
 *   2. .claude/skills/run/SKILL.md enforces orchestrator-skip as an
 *      enumerated allowlist: tier == 2 AND !ambiguous_domain AND
 *      mode != "debug". Tier 3+ ALWAYS runs the orchestrator.
 *   3. Tier-3 mock (constructed from a plan.yaml fixture): orchestrator
 *      MUST NOT be skipped.
 *   4. Tier-2 ambiguous-domain mock: orchestrator MUST NOT be skipped.
 *   5. Tier-2 clear-domain mock: orchestrator IS skipped, and the skip
 *      reason is the enum value `tier-2-fast-path`.
 *   6. The state_history schema (documented in session-schema.md or the
 *      adaptive-pipeline doc) defines `skipped: bool` and
 *      `skipped_reason: enum{tier-2-clear, tier-2-fast-path,
 *      disabled-by-flag}`. The freeform `note` field is deprecated.
 *
 * Bug-driven test mandate (CLAUDE.md § Bug-Driven Testing): this test
 * MUST fail before P2-9's edits and pass after them.
 *
 * Failing-before state: adaptive-pipeline.md uses `Minimal`/`Medium`/`Full`,
 * SKILL.md describes "tier 2 with clear scope" in prose without the enum
 * allowlist, and no `skipped_reason` enum exists.
 *
 * Passing-after state: only `fast` and `standard` paths appear, SKILL.md
 * documents the enumerated allowlist with three enum values, and the
 * orchestrator-skip mock evaluations agree with the rule.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const ADAPTIVE_DOC = path.join(
  REPO_ROOT,
  '.claude',
  'skills',
  'run',
  'reference',
  'adaptive-pipeline.md'
);
const RUN_SKILL = path.join(
  REPO_ROOT,
  '.claude',
  'skills',
  'run',
  'SKILL.md'
);
const STATE_MACHINE_DETAIL = path.join(
  REPO_ROOT,
  '.claude',
  'skills',
  'run',
  'reference',
  'state-machine-detail.md'
);

const ENUM_REASONS = ['tier-2-clear', 'tier-2-fast-path', 'disabled-by-flag'];

/**
 * Reference implementation of the orchestrator-skip enumerated allowlist.
 *
 * Spec (P2-9): orchestrator MAY be skipped iff
 *   tier == 2 AND !ambiguous_domain AND mode != "debug"
 *
 * Returns { skipped: bool, skipped_reason: enum | null }.
 */
function shouldSkipOrchestrator({ tier, ambiguous_domain, mode, disabled_flag = false }) {
  if (disabled_flag) {
    return { skipped: true, skipped_reason: 'disabled-by-flag' };
  }
  if (tier === 2 && !ambiguous_domain && mode !== 'debug') {
    return { skipped: true, skipped_reason: 'tier-2-fast-path' };
  }
  return { skipped: false, skipped_reason: null };
}

describe('P2-9: Pipeline path rules + orchestrator-skip enum', () => {
  describe('AC-1: adaptive-pipeline.md has exactly two named paths', () => {
    it('adaptive-pipeline.md file exists', () => {
      expect(fs.existsSync(ADAPTIVE_DOC)).toBe(true);
    });

    it('mentions the `fast` path as a named pipeline path', () => {
      const raw = fs.readFileSync(ADAPTIVE_DOC, 'utf8');
      // Look for the path label in a table row or heading context.
      // The `fast` token should appear as a path identifier (lowercase),
      // distinct from any "fastest" or "fast-path" prose.
      expect(/\*\*fast\*\*|`fast`/.test(raw)).toBe(true);
    });

    it('mentions the `standard` path as a named pipeline path', () => {
      const raw = fs.readFileSync(ADAPTIVE_DOC, 'utf8');
      expect(/\*\*standard\*\*|`standard`/.test(raw)).toBe(true);
    });

    it('does NOT use the pre-v12.7 names (Minimal/Medium/Full) as path labels', () => {
      const raw = fs.readFileSync(ADAPTIVE_DOC, 'utf8');
      // Path labels would appear as bold-table-cells or backtick-identifiers.
      // Plain prose mentioning history (e.g., "previously Minimal+Medium") is OK.
      expect(/\*\*Minimal\*\*|`Minimal`/i.test(raw)).toBe(false);
      expect(/\*\*Medium\*\*|`Medium`/i.test(raw)).toBe(false);
    });

    it('documents the v12.7.0 collapse note', () => {
      const raw = fs.readFileSync(ADAPTIVE_DOC, 'utf8');
      // Should reference the consolidation in changelog-style prose.
      expect(/v12\.7\.0|collapsed|consolidated/i.test(raw)).toBe(true);
    });
  });

  describe('AC-2: SKILL.md documents orchestrator-skip as enumerated allowlist', () => {
    it('SKILL.md exists', () => {
      expect(fs.existsSync(RUN_SKILL)).toBe(true);
    });

    it('describes the enumerated allowlist (tier == 2 AND !ambiguous_domain AND mode != "debug")', () => {
      const raw = fs.readFileSync(RUN_SKILL, 'utf8');
      // The rule must appear as a literal expression so reviewers can grep it.
      expect(raw).toMatch(/tier\s*==\s*2/);
      expect(/ambiguous[_-]domain|ambiguous domain/i.test(raw)).toBe(true);
      expect(/mode\s*!=\s*["']?debug["']?/i.test(raw)).toBe(true);
    });

    it('documents the three enum values for skipped_reason', () => {
      const raw = fs.readFileSync(RUN_SKILL, 'utf8');
      for (const enumVal of ENUM_REASONS) {
        expect(raw).toContain(enumVal);
      }
    });

    it('explicitly states tier 3+ always runs the orchestrator', () => {
      const raw = fs.readFileSync(RUN_SKILL, 'utf8');
      // Either "tier 3+ always" or "tier >= 3 always" should appear.
      expect(/tier\s*3\+?\s+always|tier\s*>=\s*3.*always|always\s+runs.*orchestrator/i.test(raw)).toBe(true);
    });

    it('deprecates the freeform `note` field in favor of the enum', () => {
      const raw = fs.readFileSync(RUN_SKILL, 'utf8');
      // Look for deprecation prose mentioning `note` and the enum.
      expect(/deprecat\w*\s+`?note`?|`?note`?\s+(field\s+)?(is\s+)?deprecat/i.test(raw)).toBe(true);
    });
  });

  describe('AC-3: tier-3 request does NOT skip orchestrator', () => {
    it('clear tier-3 request: orchestrator runs', () => {
      const result = shouldSkipOrchestrator({
        tier: 3,
        ambiguous_domain: false,
        mode: 'standard',
      });
      expect(result.skipped).toBe(false);
      expect(result.skipped_reason).toBeNull();
    });

    it('tier-4 request: orchestrator runs', () => {
      const result = shouldSkipOrchestrator({
        tier: 4,
        ambiguous_domain: false,
        mode: 'standard',
      });
      expect(result.skipped).toBe(false);
    });
  });

  describe('AC-4: tier-2 ambiguous-domain does NOT skip orchestrator', () => {
    it('tier-2 with ambiguous_domain=true: orchestrator runs', () => {
      const result = shouldSkipOrchestrator({
        tier: 2,
        ambiguous_domain: true,
        mode: 'standard',
      });
      expect(result.skipped).toBe(false);
      expect(result.skipped_reason).toBeNull();
    });

    it('tier-2 with debug mode: orchestrator runs (mode-gated)', () => {
      const result = shouldSkipOrchestrator({
        tier: 2,
        ambiguous_domain: false,
        mode: 'debug',
      });
      expect(result.skipped).toBe(false);
    });
  });

  describe('AC-5: tier-2 clear domain skips orchestrator with enum reason', () => {
    it('tier-2 clear-domain standard mode: orchestrator skipped with `tier-2-fast-path`', () => {
      const result = shouldSkipOrchestrator({
        tier: 2,
        ambiguous_domain: false,
        mode: 'standard',
      });
      expect(result.skipped).toBe(true);
      expect(result.skipped_reason).toBe('tier-2-fast-path');
      // Reason MUST be one of the enum values, never a freeform note.
      expect(ENUM_REASONS).toContain(result.skipped_reason);
    });

    it('disabled-by-flag short-circuit: skipped with `disabled-by-flag` reason', () => {
      const result = shouldSkipOrchestrator({
        tier: 2,
        ambiguous_domain: false,
        mode: 'standard',
        disabled_flag: true,
      });
      expect(result.skipped).toBe(true);
      expect(result.skipped_reason).toBe('disabled-by-flag');
    });
  });

  describe('AC-6: state_history schema documents skipped + skipped_reason enum', () => {
    it('state-machine-detail.md or adaptive-pipeline.md documents `skipped` + `skipped_reason`', () => {
      // Either file is acceptable as the schema source.
      const detailRaw = fs.existsSync(STATE_MACHINE_DETAIL)
        ? fs.readFileSync(STATE_MACHINE_DETAIL, 'utf8')
        : '';
      const adaptiveRaw = fs.existsSync(ADAPTIVE_DOC)
        ? fs.readFileSync(ADAPTIVE_DOC, 'utf8')
        : '';
      const combined = detailRaw + '\n' + adaptiveRaw;
      expect(combined).toContain('skipped');
      expect(combined).toContain('skipped_reason');
    });

    it('all three enum values appear in the schema doc(s)', () => {
      const detailRaw = fs.existsSync(STATE_MACHINE_DETAIL)
        ? fs.readFileSync(STATE_MACHINE_DETAIL, 'utf8')
        : '';
      const adaptiveRaw = fs.existsSync(ADAPTIVE_DOC)
        ? fs.readFileSync(ADAPTIVE_DOC, 'utf8')
        : '';
      const combined = detailRaw + '\n' + adaptiveRaw;
      for (const enumVal of ENUM_REASONS) {
        expect(combined).toContain(enumVal);
      }
    });
  });
});
