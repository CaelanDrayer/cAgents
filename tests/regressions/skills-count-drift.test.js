import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, appendFileSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

/**
 * COR-3 regression: scripts/ci/validate-counts.sh pinned CLAUDE.md, README.md,
 * AGENTS.md, package.json, .claude/settings.json, two .claude/rules files and
 * two docs/ files. It NEVER read .claude/skills/**. As a result, 13 false
 * claims reached the user surface. Two examples: an agent total of 57 while
 * disk said 60, and "Tier 1 (15 agents)" while disk said 16. Two archetype
 * headings were also wrong.
 *
 * Two checks close that hole.
 *
 * Check 16 is a .claude/skills/** ABSENCE check. It FAILS when an agent-TOTAL
 * phrasing cites a number other than ACTIVE_AGENTS. The phrasings are
 * "<N> agents", "<N> specialized agents", "<N>-agent catalog" and
 * "<N> available".
 *
 * A subset count is NOT flagged. Examples of a subset count are "### Core archetype (16 agents)", "the Wave 1 agents" and "3-5 agents".
 * A historical transition arrow is NOT flagged either. One example is
 * "240 -> 57 agents".
 *
 * Check 17 is a per-archetype heading check for _MODE_REGISTRY.md. It compares
 * each "### <Archetype> archetype (<N> agents)" heading against the derived
 * ARCH_COUNTS entry for that archetype.
 *
 * Bug-driven testing mandate: each mutation case below fails before the COR-3
 * hardening and passes after.
 *
 * Race discipline: every mutation happens on a temp-dir COPY of the skills
 * tree. The script reads that copy through CAGENTS_VALIDATE_COUNTS_SKILLS_DIR.
 * Nothing under the real .claude/skills/ is ever written. A sibling test,
 * tests/v12/deprecated-bucket-excluded.test.js, is flaky because it writes to a
 * real shared path. This test does not repeat that mistake.
 */

const REPO_ROOT = process.cwd();
const COUNTS = join(REPO_ROOT, 'scripts', 'ci', 'validate-counts.sh');
const REAL_SKILLS = join(REPO_ROOT, '.claude', 'skills');

/** Copy the real skills tree into a fresh temp dir. Return both paths. */
function copySkillsTree(label) {
  const tmpDir = mkdtempSync(join(tmpdir(), `skills-count-drift-${label}-`));
  const dest = join(tmpDir, 'skills');
  cpSync(REAL_SKILLS, dest, { recursive: true });
  return { tmpDir, dest };
}

/** Run validate-counts.sh against a skills dir. Return the code and output. */
function runCounts(skillsDir) {
  const env = { ...process.env };
  if (skillsDir) env.CAGENTS_VALIDATE_COUNTS_SKILLS_DIR = skillsDir;
  try {
    const stdout = execSync(`bash ${COUNTS}`, { cwd: REPO_ROOT, stdio: 'pipe', env });
    return { exitCode: 0, output: stdout.toString() };
  } catch (err) {
    return {
      exitCode: err.status,
      output: (err.stdout?.toString() || '') + (err.stderr?.toString() || ''),
    };
  }
}

describe('COR-3: .claude/skills count-drift guards', () => {
  describe('Check 16: skills agent-total absence check', () => {
    it('FAILS (exit 1) on a stale agent total injected into a skills .md copy', () => {
      const { tmpDir, dest } = copySkillsTree('c16');
      let result;
      try {
        // A stale CURRENT total, which must be flagged, plus a HISTORICAL
        // transition arrow, which must NOT be flagged.
        appendFileSync(
          join(dest, 'helper', 'SKILL.md'),
          '\ncAgents ships 57 agents across 9 builder-role archetypes.\n' +
            'Historical: 240 -> 57 agents in v12.4.0.\n'
        );
        result = runCounts(dest);
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }

      expect(result.exitCode, 'Check 16 must FAIL on a stale agent total').toBe(1);
      expect(result.output, 'must cite the skills agent-total absence check').toMatch(
        /skills agent-total absence check/
      );
      expect(result.output, 'must cite the stale 57 total').toMatch(/57 agents/);
      const flagged = result.output
        .split('\n')
        .filter((l) => /MISMATCH:.*skills agent-total absence check/.test(l));
      expect(
        flagged.length,
        `exactly one stale total, because the "240 -> 57" history line is ignored:\n${result.output}`
      ).toBe(1);
    });
  });

  describe('Check 17: _MODE_REGISTRY.md per-archetype headings', () => {
    it('FAILS (exit 1) when an archetype heading count is mutated', () => {
      const { tmpDir, dest } = copySkillsTree('c17');
      const registry = join(dest, '_MODE_REGISTRY.md');
      let result;
      try {
        const before = readFileSync(registry, 'utf8');
        expect(before, 'the fixture must carry the correct Writer heading').toContain(
          '### Writer archetype (4 agents)'
        );
        writeFileSync(
          registry,
          before.replace('### Writer archetype (4 agents)', '### Writer archetype (3 agents)')
        );
        result = runCounts(dest);
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }

      expect(result.exitCode, 'Check 17 must FAIL on a wrong archetype heading').toBe(1);
      expect(result.output, 'must name _MODE_REGISTRY.md').toMatch(/_MODE_REGISTRY\.md/);
      expect(result.output, 'must quote the wrong heading').toMatch(
        /### Writer archetype \(3 agents\)/
      );
      expect(result.output, 'must state the derived heading').toMatch(
        /### Writer archetype \(4 agents\)/
      );
    });
  });

  describe('no false positives', () => {
    it('exits 0 on the real, current .claude/skills tree', () => {
      const result = runCounts(null);
      expect(result.exitCode, `validate-counts.sh on the real tree:\n${result.output}`).toBe(0);
    });

    it('does not flag the historical "30 moded agents" line or a correct heading', () => {
      const { tmpDir, dest } = copySkillsTree('clean');
      let result;
      let registry;
      try {
        registry = readFileSync(join(dest, '_MODE_REGISTRY.md'), 'utf8');
        result = runCounts(dest);
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }

      // The fixture must carry both shapes, or this case proves nothing.
      expect(registry, 'the fixture must carry the v12.20.0 historical count').toMatch(
        /enumerated 30 moded agents across 8\s+archetypes/
      );
      expect(registry, 'the fixture must carry a correct archetype heading').toContain(
        '### Core archetype (16 agents)'
      );
      expect(
        result.exitCode,
        `a historical count and a subset count must not trigger a mismatch:\n${result.output}`
      ).toBe(0);
    });
  });
});
