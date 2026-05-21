/**
 * FU-1 (v12.1.1, updated v12.2.0): graceful-degradation rule
 * scope-generalization regression
 *
 * Locks the v12.1.1 documentation generalization: the depth-1 Agent-tool
 * stripping graceful-degradation rule applies to ALL spawning skills (the
 * two surviving skills /run and /team, plus the historically-affected /org
 * which was absorbed into /team strategic mode in v12.2.0) and ALL agent
 * types (cagents:*, general-purpose, Explore, Plan) — not just /team
 * teammates as previously asserted.
 *
 * The v12.1.0 spike (session run_improve-team-context_260521_001) and the
 * v12.1.1 coordination session (run_v12-1-1-followups_260521_002) both
 * reproduced depth-1 Agent stripping under /run, falsifying the earlier
 * "/run controllers retain Agent at level 1 and MUST delegate" assertion.
 *
 * This test asserts that the three rule docs:
 *   1. .claude/rules/core/controllers.md
 *   2. .claude/rules/core/execution.md
 *   3. .claude/rules/core/teams.md
 *
 * each contain generalized scope language (mentioning BOTH of the surviving
 * spawning skills /run and /team in the graceful-degradation context) and
 * do NOT retain the narrow "/team teammates only" or "/run controllers must
 * delegate" assertions that v12.1.0 empirically falsified. Historical
 * mentions of /org in the rule docs are tolerated for back-compat narrative
 * but no longer required (post-v12.2.0).
 *
 * Bug-driven testing mandate: this test would have caught a regression where
 * a future doc rewrite re-narrowed the scope to /team-only, or re-introduced
 * the "/run controllers retain Agent" assertion. It also catches drift away
 * from the empirically-correct generalized scope language.
 *
 * Could have caught by: unit test on the three rule docs' graceful-
 * degradation sections, checking for scope-qualifier presence and absence
 * of the falsified narrow-scope claims.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const CONTROLLERS_RULE = path.join(REPO_ROOT, '.claude', 'rules', 'core', 'controllers.md');
const EXECUTION_RULE = path.join(REPO_ROOT, '.claude', 'rules', 'core', 'execution.md');
const TEAMS_RULE = path.join(REPO_ROOT, '.claude', 'rules', 'core', 'teams.md');
const STRIPPING_KNOWLEDGE = path.join(REPO_ROOT, 'cagents-memory', '_knowledge', 'agent-tool-depth1-stripping.md');

// Extract the "Graceful Degradation" / "Known Harness Limitation" section from a rule doc.
// Returns the section body between the matching header and the next top-level header (or EOF).
function extractGracefulSection(content) {
  // Match either "Graceful Degradation" or "Known Harness Limitation" as section header.
  const headerPattern = /^##+\s+(Graceful Degradation|Known Harness Limitation)/m;
  const match = content.match(headerPattern);
  if (!match) return '';
  const startIdx = match.index;
  // Find next top-level (## or larger) header after start.
  const afterStart = content.slice(startIdx + match[0].length);
  const nextHeader = afterStart.search(/^##\s+\S/m);
  return nextHeader === -1 ? content.slice(startIdx) : content.slice(startIdx, startIdx + match[0].length + nextHeader);
}

describe('FU-1 (v12.1.1): graceful-degradation scope generalization', () => {
  describe('Invariant 1 — all three rule docs exist', () => {
    it('.claude/rules/core/controllers.md exists', () => {
      expect(fs.existsSync(CONTROLLERS_RULE)).toBe(true);
    });
    it('.claude/rules/core/execution.md exists', () => {
      expect(fs.existsSync(EXECUTION_RULE)).toBe(true);
    });
    it('.claude/rules/core/teams.md exists', () => {
      expect(fs.existsSync(TEAMS_RULE)).toBe(true);
    });
  });

  describe('Invariant 2 — graceful-degradation section mentions both surviving spawning skills', () => {
    // v12.2.0: /org was absorbed into /team strategic mode. The two surviving
    // spawning skills are /run and /team; both MUST appear in the graceful-
    // degradation section of each rule doc. Historical /org mentions are
    // tolerated (back-compat narrative) but not required.
    it('controllers.md graceful-degradation section mentions both /run AND /team', () => {
      const content = fs.readFileSync(CONTROLLERS_RULE, 'utf8');
      const section = extractGracefulSection(content);
      expect(section.length).toBeGreaterThan(100); // section must exist and be substantive
      expect(section).toMatch(/\/run/);
      expect(section).toMatch(/\/team/);
    });

    it('execution.md graceful-degradation section mentions both /run AND /team', () => {
      const content = fs.readFileSync(EXECUTION_RULE, 'utf8');
      const section = extractGracefulSection(content);
      expect(section.length).toBeGreaterThan(100);
      expect(section).toMatch(/\/run/);
      expect(section).toMatch(/\/team/);
    });

    it('teams.md known-harness-limitation section mentions both /run AND /team', () => {
      const content = fs.readFileSync(TEAMS_RULE, 'utf8');
      const section = extractGracefulSection(content);
      expect(section.length).toBeGreaterThan(100);
      expect(section).toMatch(/\/run/);
      expect(section).toMatch(/\/team/);
    });
  });

  describe('Invariant 3 — falsified narrow-scope assertions are removed', () => {
    // The v12.1.0 spike empirically falsified the claim that /run controllers
    // retain Agent at level 1. The pre-v12.1.1 phrasing of that claim must not
    // re-appear in any of the three rule docs.
    const FALSIFIED_PHRASES = [
      // Exact pre-v12.1.1 phrasing from controllers.md:
      /Controllers running under `?\/run`? execute at level 1 with the Agent tool present and MUST delegate/,
      // Exact pre-v12.1.1 phrasing from teams.md graceful-degradation block:
      /It is NOT acceptable for `?\/run`? workflows, where controllers run at level 1 with the lead-equivalent tool surface and Agent is available/,
    ];

    for (const doc of [CONTROLLERS_RULE, EXECUTION_RULE, TEAMS_RULE]) {
      const docName = path.basename(doc);
      it(`${docName} does not retain falsified narrow-scope assertions`, () => {
        const content = fs.readFileSync(doc, 'utf8');
        for (const phrase of FALSIFIED_PHRASES) {
          expect(content).not.toMatch(phrase);
        }
      });
    }
  });

  describe('Invariant 4 — scope language explicitly generalized', () => {
    // Each rule doc's section must contain at least one explicit generalization
    // marker — either "all skills" / "all spawning skills" / "depth ≥ 1" /
    // "regardless of which skill" — to make the generalization unambiguous
    // for future readers and AI agents loading these rules.
    const GENERALIZATION_MARKERS = [
      /all skills/i,
      /all spawning skills/i,
      /regardless of which skill/i,
      /depth\s*[≥>]=?\s*1/,
      /applies (uniformly )?across all (spawning )?skills/i,
    ];

    it('controllers.md graceful-degradation section contains a generalization marker', () => {
      const content = fs.readFileSync(CONTROLLERS_RULE, 'utf8');
      const section = extractGracefulSection(content);
      const matchCount = GENERALIZATION_MARKERS.filter((re) => re.test(section)).length;
      expect(matchCount).toBeGreaterThanOrEqual(1);
    });

    it('execution.md graceful-degradation section contains a generalization marker', () => {
      const content = fs.readFileSync(EXECUTION_RULE, 'utf8');
      const section = extractGracefulSection(content);
      const matchCount = GENERALIZATION_MARKERS.filter((re) => re.test(section)).length;
      expect(matchCount).toBeGreaterThanOrEqual(1);
    });

    it('teams.md known-harness-limitation section contains a generalization marker', () => {
      const content = fs.readFileSync(TEAMS_RULE, 'utf8');
      const section = extractGracefulSection(content);
      const matchCount = GENERALIZATION_MARKERS.filter((re) => re.test(section)).length;
      expect(matchCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Invariant 5 — knowledge note records v12.1.0 spike reproduction', () => {
    it('cagents-memory/_knowledge/agent-tool-depth1-stripping.md cites the v12.1.0 spike session', () => {
      expect(fs.existsSync(STRIPPING_KNOWLEDGE)).toBe(true);
      const content = fs.readFileSync(STRIPPING_KNOWLEDGE, 'utf8');
      expect(content).toMatch(/run_improve-team-context_260521_001/);
      // The knowledge note must document that the v12.1.0 finding affects /run.
      expect(content).toMatch(/\/run/);
    });
  });
});
