import { describe, it, expect } from 'vitest';
import { readFileSync, mkdtempSync, copyFileSync, appendFileSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

/**
 * P2 (audit-260630) regression: the FINAL count/number drift sweep added two
 * guard hardenings so the "240 drift" class (a stale CURRENT agent total left
 * in a doc while CI stays green) and the dead-sync-target class cannot silently
 * recur:
 *
 *   1. scripts/ci/validate-counts.sh Check 13 — a CLAUDE.md ABSENCE check that
 *      FAILS when CLAUDE.md states an agent total != ACTIVE_AGENTS outside an
 *      "N -> M" historical transition arrow. Previously Check 1 was presence-only
 *      (A7-03), so a stale "Total agents: 251 -> 240" duplicate slipped through.
 *
 *   2. scripts/ci/cagents-ci.sh tiny-bump `sync_targets` — dropped the removed
 *      /org (v12.2.0) and /improve (v12.1.2) SKILL.md entries and corrected the
 *      stale "21 registry files" comment to 16 (A7-02), matching the canonical
 *      16 locations in version-registry.md.
 *
 * Bug-driven testing mandate: this test fails before the P2 hardening and
 * passes after.
 */

const REPO_ROOT = process.cwd();
const COUNTS = join(REPO_ROOT, 'scripts', 'ci', 'validate-counts.sh');
const CI = join(REPO_ROOT, 'scripts', 'ci', 'cagents-ci.sh');

describe('P2: count-drift guard hardening (audit-260630)', () => {
  describe('validate-counts.sh Check 13 — CLAUDE.md agent-total absence check', () => {
    it('FAILS (exit 1) on a stale CURRENT agent total injected into CLAUDE.md', () => {
      // Race-free: copy CLAUDE.md to a temp dir, mutate ONLY the copy, and point
      // Check 13 at it via CAGENTS_VALIDATE_COUNTS_CLAUDE_MD (same override Check 1
      // uses). The real CLAUDE.md is never touched.
      const tmpDir = mkdtempSync(join(tmpdir(), 'count-drift-c13-'));
      const tmpClaude = join(tmpDir, 'CLAUDE.md');
      copyFileSync(join(REPO_ROOT, 'CLAUDE.md'), tmpClaude);
      // A stale CURRENT total (must be flagged) + HISTORICAL arrows (must NOT be).
      appendFileSync(
        tmpClaude,
        '\n\nThe platform ships 240 agents across 9 builder-role archetypes today.\n' +
          'Historical: 251 -> 240 agents in v12.0.0; 240 -> 144 agents in v12.4.0.\n'
      );

      let exitCode = 0;
      let output = '';
      try {
        execSync(`bash ${COUNTS}`, {
          cwd: REPO_ROOT,
          stdio: 'pipe',
          env: { ...process.env, CAGENTS_VALIDATE_COUNTS_CLAUDE_MD: tmpClaude },
        });
      } catch (err) {
        exitCode = err.status;
        output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
      } finally {
        try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      }

      expect(exitCode, 'Check 13 should FAIL (exit 1) on stale current total').toBe(1);
      expect(output, 'should cite the agent-total absence check').toMatch(
        /agent-total absence check/
      );
      expect(output, 'should cite the stale 240 total').toMatch(/240 agents across 9/);
      // The historical "251 -> 240" / "240 -> 144" arrow lines must NOT be flagged.
      const flagged = output
        .split('\n')
        .filter((l) => /MISMATCH:.*agent-total absence check/.test(l));
      expect(flagged.length, 'exactly one stale current-total flagged (history ignored)').toBe(1);
    });

    it('exits 0 on the real (clean) CLAUDE.md — no false positive', () => {
      let exitCode = 0;
      let output = '';
      try {
        execSync(`bash ${COUNTS}`, { cwd: REPO_ROOT, stdio: 'pipe' });
      } catch (err) {
        exitCode = err.status;
        output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
      }
      expect(exitCode, `validate-counts.sh on clean tree:\n${output}`).toBe(0);
    });
  });

  describe('cagents-ci.sh tiny-bump sync_targets', () => {
    const ci = readFileSync(CI, 'utf8');

    it('no longer lists the removed /org or /improve SKILL.md sync targets', () => {
      expect(ci).not.toContain('.claude/skills/org/SKILL.md');
      expect(ci).not.toContain('.claude/skills/improve/SKILL.md');
    });

    it('comments cite 16 registry/sync targets, not the stale 21', () => {
      expect(ci).toMatch(/16 registry locations/);
      expect(ci).toMatch(/16 sync targets/);
      expect(ci).not.toMatch(/21 registry locations/);
      expect(ci).not.toMatch(/21 sync targets/);
    });
  });
});
