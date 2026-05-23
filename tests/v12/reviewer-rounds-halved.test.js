/**
 * LP-27: Halve controller reviewer rounds (3 → 2).
 *
 * Locks in these contract assertions:
 *
 *   1. `.claude/rules/core/controllers.md` documents
 *      `internal reviewer loop (max 2 rounds)` (was 3).
 *   2. `.claude/rules/core/controllers.md` documents the new round count
 *      in the topological-execution preamble: "If REVISE: re-spawn agent
 *      with feedback (max 2 rounds)".
 *   3. `cagents-memory/_system/config/pipeline_config.yaml`
 *      sets `controller_revision.max_internal_rounds: 2`.
 *   4. The P1-6 Dead-Letter Promotion Contract section is preserved in
 *      controllers.md (must NOT be removed). The contract still anchors
 *      promotion on the round-cap; only the round count is updated.
 *   5. The promotion-gate language remains intact: dead_letter promotion
 *      is gated on the rounds-cap being reached AND the item appearing
 *      in `dead_letter_items[]` — not on any-failed-review.
 *
 * Token-budget motivation: per-WI reviewer call savings ≈ 33% (one
 * fewer round when item fails twice).
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const CONTROLLERS_MD = path.join(REPO_ROOT, '.claude', 'rules', 'core', 'controllers.md');
const PIPELINE_CONFIG = path.join(REPO_ROOT, 'cagents-memory', '_system', 'config', 'pipeline_config.yaml');

describe('LP-27: Halve controller reviewer rounds (3 → 2)', () => {
  describe('controllers.md documents max 2 rounds', () => {
    let body;
    it('loads controllers.md', () => {
      body = fs.readFileSync(CONTROLLERS_MD, 'utf8');
      expect(body.length).toBeGreaterThan(0);
    });

    it('topological-execution preamble says "max 2 rounds"', () => {
      const body = fs.readFileSync(CONTROLLERS_MD, 'utf8');
      // The line in the numbered list under "## v10 Agent Chaining" must
      // reference max 2 rounds for REVISE re-spawn.
      expect(body).toMatch(/If REVISE: re-spawn agent with feedback \(max 2 rounds\)/);
    });

    it('Reviewer Loop section says "max 2 rounds"', () => {
      const body = fs.readFileSync(CONTROLLERS_MD, 'utf8');
      expect(body).toMatch(/internal reviewer loop \(max 2 rounds\)/);
    });

    it('does NOT still document "max 3 rounds" for the internal reviewer loop', () => {
      const body = fs.readFileSync(CONTROLLERS_MD, 'utf8');
      // The internal-reviewer-loop sentence must have been updated.
      expect(body).not.toMatch(/internal reviewer loop \(max 3 rounds\)/);
      // The topological-execution preamble must have been updated.
      expect(body).not.toMatch(/If REVISE: re-spawn agent with feedback \(max 3 rounds\)/);
    });
  });

  describe('pipeline_config.yaml sets max_internal_rounds: 2', () => {
    it('loads pipeline_config.yaml', () => {
      const cfg = yaml.load(fs.readFileSync(PIPELINE_CONFIG, 'utf8'));
      expect(cfg).toBeTruthy();
      expect(cfg.controller_revision).toBeTruthy();
    });

    it('controller_revision.max_internal_rounds === 2', () => {
      const cfg = yaml.load(fs.readFileSync(PIPELINE_CONFIG, 'utf8'));
      expect(cfg.controller_revision.max_internal_rounds).toBe(2);
    });

    it('controller_revision.escalation still routes to dead_letter', () => {
      // Sanity check: halving rounds must not break the dead_letter handoff.
      const cfg = yaml.load(fs.readFileSync(PIPELINE_CONFIG, 'utf8'));
      expect(cfg.controller_revision.escalation).toBe('dead_letter');
    });
  });

  describe('P1-6 Dead-Letter Promotion Contract is preserved', () => {
    it('controllers.md still contains the "Dead-Letter Promotion Contract" heading', () => {
      const body = fs.readFileSync(CONTROLLERS_MD, 'utf8');
      expect(body).toMatch(/### Dead-Letter Promotion Contract/);
    });

    it('contract still enumerates the 4 promotion steps', () => {
      const body = fs.readFileSync(CONTROLLERS_MD, 'utf8');
      // Step 1: mark implementation_task status: dead_letter
      expect(body).toMatch(/status\*?\*?\s+to\s+`dead_letter`/);
      // Step 2: append to dead_letter_items[]
      expect(body).toMatch(/dead_letter_items\[\]/);
      // Step 3: continue with remaining work items / PARTIAL_PASS
      expect(body).toMatch(/PARTIAL_PASS/);
      // Step 4: do NOT re-route to PLANNED for individual items
      expect(body).toMatch(/Do NOT re-route to PLANNED/);
    });

    it('promotion is gated on rounds-cap, not on any failed reviewer round', () => {
      const body = fs.readFileSync(CONTROLLERS_MD, 'utf8');
      // The trigger condition must reference consecutive rounds being
      // exhausted -- after LP-27, this is now "2 consecutive reviewer
      // rounds" (matching max_internal_rounds: 2). Accept either form
      // for back-compat but require the rounds-cap framing.
      expect(body).toMatch(/(2|3) consecutive reviewer rounds/);
    });
  });
});
