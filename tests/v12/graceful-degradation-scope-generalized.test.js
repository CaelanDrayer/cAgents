/**
 * FU-1 (v12.1.1) → REPOSITIONED in v12.17.0: graceful-degradation
 * scope/semantics regression
 *
 * ORIGINAL premise (v12.1.1): the depth-1 Agent-tool stripping graceful-
 * degradation rule applies to ALL spawning skills and ALL agent types — not
 * just /team teammates. That premise treated depth-1 stripping as the EXPECTED
 * DEFAULT behavior of the harness.
 *
 * REPOSITIONED premise (v12.17.0): Claude Code 2.1.172 added subagent-spawns-
 * subagent support up to 5 levels deep. An empirical chain test (session
 * run_deep-nesting-enablement_260611_001, verified on CC 2.1.173) ran a spawn
 * chain depth 1 → 2 → 3 → 4 → 5 → 6 with the `Agent` tool present at every
 * level and ZERO stripping. The "Agent stripped at depth >= 1" behavior is
 * therefore NO LONGER the default. Graceful degradation is repositioned from
 * "the expected depth-1 behavior" to a DEFENSIVE FALLBACK that triggers only
 * when the `Agent` tool is verifiably absent — at the nesting ceiling (a
 * subagent at depth 5 cannot spawn depth 6) or if a future/older harness
 * regresses the capability.
 *
 * This test asserts that the three rule docs:
 *   1. .claude/rules/core/controllers.md
 *   2. .claude/rules/core/execution.md
 *   3. .claude/rules/core/teams.md
 *
 * each carry the REPOSITIONED framing in their nesting/graceful-degradation
 * section (degradation = defensive fallback for verifiably-absent Agent, NOT
 * the expected depth-1 default), and do NOT retain the falsified narrow-scope
 * claims (e.g. "/run controllers retain Agent at level 1 and MUST delegate" as
 * the pre-v12.1.1 phrasing) NOR present depth-1 stripping as a current default.
 *
 * Bug-driven testing mandate: this test would have caught a regression where a
 * future doc rewrite re-introduced depth-1 stripping as the expected default,
 * dropped the repositioning framing, or re-narrowed the scope incorrectly.
 *
 * Could have caught by: unit test on the three rule docs' nesting/graceful-
 * degradation sections, checking for repositioning-marker presence and absence
 * of the falsified depth-1-stripping-as-default claims.
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

// Extract the nesting / graceful-degradation / nesting-ceiling section from a
// rule doc. Returns the section body between the matching header and the next
// top-level (## ) header (or EOF).
//
// v12.17.0: section titles were renamed. controllers.md / execution.md use
// "Nesting Model and Graceful Degradation ..."; teams.md uses "Nesting-Ceiling
// Degradation ...". Older titles ("Graceful Degradation", "Known Harness
// Limitation") are still matched for back-compat in case a doc lags the rename.
function extractGracefulSection(content) {
  const headerPattern = /^##+\s+.*?(Nesting[- ]Ceiling|Nesting Model|Graceful Degradation|Known Harness Limitation)/m;
  const match = content.match(headerPattern);
  if (!match) return '';
  const startIdx = match.index;
  // Find next top-level (## or larger) header after start.
  const afterStart = content.slice(startIdx + match[0].length);
  const nextHeader = afterStart.search(/^##\s+\S/m);
  return nextHeader === -1 ? content.slice(startIdx) : content.slice(startIdx, startIdx + match[0].length + nextHeader);
}

describe('FU-1 → v12.17.0 repositioning: graceful-degradation semantics', () => {
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

  describe('Invariant 2 — nesting/graceful-degradation section exists and frames degradation as a FALLBACK', () => {
    // v12.17.0: each rule doc's section must (a) exist and be substantive, and
    // (b) explicitly frame graceful degradation as a defensive FALLBACK for an
    // absent/verifiably-absent Agent tool — NOT as the expected depth-1 default.
    const FALLBACK_MARKERS = [
      /fallback/i,
      /defensive/i,
      /verifiably absent/i,
      /genuinely absent/i,
      /nesting[- ]ceiling/i,
    ];

    for (const [docPath, docName] of [
      [CONTROLLERS_RULE, 'controllers.md'],
      [EXECUTION_RULE, 'execution.md'],
      [TEAMS_RULE, 'teams.md'],
    ]) {
      it(`${docName} nesting/graceful-degradation section frames degradation as a fallback`, () => {
        const content = fs.readFileSync(docPath, 'utf8');
        const section = extractGracefulSection(content);
        expect(section.length).toBeGreaterThan(100); // section must exist and be substantive
        const matchCount = FALLBACK_MARKERS.filter((re) => re.test(section)).length;
        expect(matchCount).toBeGreaterThanOrEqual(1);
      });
    }
  });

  describe('Invariant 3 — falsified narrow-scope assertions are removed', () => {
    // The v12.1.0 spike empirically falsified the pre-v12.1.1 claim that /run
    // controllers retain Agent at level 1 in its OLD narrow phrasing. That exact
    // pre-v12.1.1 phrasing must not re-appear in any of the three rule docs.
    // (Note: under the v12.17.0 model controllers DO normally retain Agent and
    // MUST delegate — but the NEW phrasing frames that as the nesting model, not
    // as the pre-v12.1.1 narrow-scope exclusion below.)
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

  describe('Invariant 4 — section carries the v12.17.0 repositioning signal', () => {
    // Each rule doc's nesting/graceful-degradation section must contain at least
    // one explicit repositioning marker — the CC 2.1.172 capability, the
    // 5-levels-deep nesting model, the "repositioned in v12.17.0" tag, or the
    // "no longer the default" framing — so the repositioning is unambiguous for
    // future readers and AI agents loading these rules.
    const REPOSITION_MARKERS = [
      /2\.1\.172/,
      /5 levels deep/i,
      /repositioned in v12\.17\.0/i,
      /no longer (the )?(default|expected)/i,
      /obsolete as (the )?default/i,
      /depth\s*5/i,
    ];

    for (const [docPath, docName] of [
      [CONTROLLERS_RULE, 'controllers.md'],
      [EXECUTION_RULE, 'execution.md'],
      [TEAMS_RULE, 'teams.md'],
    ]) {
      it(`${docName} nesting/graceful-degradation section contains a repositioning marker`, () => {
        const content = fs.readFileSync(docPath, 'utf8');
        const section = extractGracefulSection(content);
        const matchCount = REPOSITION_MARKERS.filter((re) => re.test(section)).length;
        expect(matchCount).toBeGreaterThanOrEqual(1);
      });
    }
  });

  describe('Invariant 5 — historical knowledge note still records the v12.1.0 spike reproduction', () => {
    // The knowledge note is a HISTORICAL record (not a rules/skills doc). It
    // legitimately retains the depth-1 spike narrative and the v12.1.0 session
    // citation; the repositioning does not erase the historical record.
    it('cagents-memory/_knowledge/agent-tool-depth1-stripping.md cites the v12.1.0 spike session', () => {
      expect(fs.existsSync(STRIPPING_KNOWLEDGE)).toBe(true);
      const content = fs.readFileSync(STRIPPING_KNOWLEDGE, 'utf8');
      expect(content).toMatch(/run_improve-team-context_260521_001/);
      // The knowledge note must document that the v12.1.0 finding affects /run.
      expect(content).toMatch(/\/run/);
    });
  });
});
