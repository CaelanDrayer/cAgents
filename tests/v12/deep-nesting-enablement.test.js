/**
 * Deep Subagent Nesting Enablement — v12.17.0 regression test.
 *
 * Locks the v12.17.0 architectural change (session
 * run_deep-nesting-enablement_260611_001): Claude Code 2.1.172 added
 * subagent-spawns-subagent support up to 5 levels deep, verified empirically on
 * CC 2.1.173 (spawn chain depth 1 → 2 → 3 → 4 → 5 → 6, Agent tool present at
 * every level, zero stripping). The historical "Agent stripped at depth >= 1"
 * limitation is OBSOLETE as the default; graceful degradation is repositioned to
 * a defensive FALLBACK (nesting ceiling at depth 5, or a regressed harness).
 *
 * Asserts:
 *   (a) the graceful-degradation playbook carries the v12.17.0 repositioning
 *       banner (mentions "2.1.172" and "5 levels");
 *   (b) max_nesting_depth of 5 is documented somewhere authoritative
 *       (pipeline_config.yaml `max_nesting_depth: 5`, OR CLAUDE.md "max depth: 5",
 *       OR teams.md "5 levels deep" / "max_nesting_depth"). Robust to WG-F
 *       landing the config AFTER this test;
 *   (c) no rule/skill file under .claude/rules/ states, as NON-historical
 *       current fact, that Agent is "stripped at depth 1 / >= 1" as the DEFAULT
 *       — any such phrase must sit near a historical/fallback marker.
 *
 * Bug-driven testing mandate: catches a future regression that drops the
 * repositioning banner, removes the documented depth ceiling, or re-asserts
 * depth-1 stripping as current default in a rules doc.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PLAYBOOK = path.join(REPO_ROOT, '.claude', 'rules', 'playbooks', 'pat-graceful-degradation-depth1.md');
const PIPELINE_CONFIG = path.join(REPO_ROOT, 'cagents-memory', '_system', 'config', 'pipeline_config.yaml');
const CLAUDE_MD = path.join(REPO_ROOT, 'CLAUDE.md');
const TEAMS_RULE = path.join(REPO_ROOT, '.claude', 'rules', 'core', 'teams.md');
const RULES_DIR = path.join(REPO_ROOT, '.claude', 'rules');

// Recursively collect *.md files under a directory.
function collectMarkdown(dir) {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectMarkdown(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

describe('v12.17.0: deep subagent nesting enablement', () => {
  describe('(a) playbook carries the v12.17.0 repositioning banner', () => {
    it('pat-graceful-degradation-depth1.md exists', () => {
      expect(fs.existsSync(PLAYBOOK)).toBe(true);
    });

    it('mentions "REPOSITIONED in v12.17.0", "2.1.172", and "5 levels"', () => {
      const content = fs.readFileSync(PLAYBOOK, 'utf8');
      expect(content).toMatch(/REPOSITIONED in v12\.17\.0/i);
      expect(content).toMatch(/2\.1\.172/);
      expect(content).toMatch(/5 levels/i);
    });

    it('preserves the fallback sentinel sentence for verify-completion.cjs', () => {
      // The sentinel "Agent/subagent-spawn tool was not available" is keyed on
      // by verify-completion.cjs for the fallback case. It MUST remain in the
      // playbook so the documentation requirement stays self-consistent.
      const content = fs.readFileSync(PLAYBOOK, 'utf8');
      expect(content).toContain('Agent/subagent-spawn tool was not available');
    });
  });

  describe('(b) max nesting depth of 5 is documented authoritatively', () => {
    // Robust to WG-F landing pipeline_config.yaml `max_nesting_depth: 5` AFTER
    // this test: accept the config, OR CLAUDE.md "max depth: 5", OR a teams.md
    // mention of "5 levels deep" / "max_nesting_depth".
    it('documents max_nesting_depth: 5 (config) OR "max depth: 5" (CLAUDE.md) OR "5 levels deep" (teams.md)', () => {
      const sources = [];

      if (fs.existsSync(PIPELINE_CONFIG)) {
        const cfg = fs.readFileSync(PIPELINE_CONFIG, 'utf8');
        if (/max_nesting_depth:\s*5\b/.test(cfg)) sources.push('pipeline_config.yaml:max_nesting_depth: 5');
      }
      if (fs.existsSync(CLAUDE_MD)) {
        const claude = fs.readFileSync(CLAUDE_MD, 'utf8');
        if (/max depth:\s*5\b/i.test(claude)) sources.push('CLAUDE.md:"max depth: 5"');
        if (/max_nesting_depth/.test(claude)) sources.push('CLAUDE.md:max_nesting_depth');
      }
      if (fs.existsSync(TEAMS_RULE)) {
        const teams = fs.readFileSync(TEAMS_RULE, 'utf8');
        if (/5 levels deep/i.test(teams)) sources.push('teams.md:"5 levels deep"');
        if (/max_nesting_depth/.test(teams)) sources.push('teams.md:max_nesting_depth');
      }

      // Diagnostic message lists where the depth-5 ceiling was found.
      expect(
        sources.length,
        `Expected the depth-5 nesting ceiling to be documented in at least one of: ` +
        `pipeline_config.yaml (max_nesting_depth: 5), CLAUDE.md ("max depth: 5"), ` +
        `or teams.md ("5 levels deep"). Found: [${sources.join(', ') || 'NONE'}]. ` +
        `If NONE, this is pending WG-F adding pipeline_config.yaml max_nesting_depth.`
      ).toBeGreaterThanOrEqual(1);
    });
  });

  describe('(c) no rules file asserts depth-1 stripping as a NON-historical current default', () => {
    // Scan .claude/rules/**/*.md for phrasings that claim the Agent tool is
    // "stripped at depth 1" / ">= 1". Any match MUST sit within ~150 chars of a
    // historical/fallback marker so it reads as past behavior, not current fact.
    // Lenient by design (avoid false failures) but meaningful (catches a bare
    // re-assertion of the obsolete default).
    const STRIP_PHRASE = /strip(?:ped|ping|s)?\b[^.\n]{0,40}?\bdepth\s*(?:>=|≥|of)?\s*1\b/gi;
    const HISTORICAL_MARKERS = /(historical|historically|before v12\.17\.0|pre-?2\.1\.172|obsolete|no longer|fallback|repositioned|was stripped|used to|formerly|previously)/i;
    const WINDOW = 150;

    const mdFiles = collectMarkdown(RULES_DIR);

    it(`scanned at least one rules markdown file`, () => {
      expect(mdFiles.length).toBeGreaterThan(0);
    });

    it('every "stripped at depth 1" phrase is framed historically or as a fallback', () => {
      const offenders = [];
      for (const file of mdFiles) {
        const content = fs.readFileSync(file, 'utf8');
        let m;
        STRIP_PHRASE.lastIndex = 0;
        while ((m = STRIP_PHRASE.exec(content)) !== null) {
          const start = Math.max(0, m.index - WINDOW);
          const end = Math.min(content.length, m.index + m[0].length + WINDOW);
          const windowText = content.slice(start, end);
          if (!HISTORICAL_MARKERS.test(windowText)) {
            offenders.push(
              `${path.relative(REPO_ROOT, file)}: "${m[0].trim()}" — no historical/fallback marker within ${WINDOW} chars`
            );
          }
        }
      }
      expect(offenders, `Non-historical depth-1-stripping claims found:\n${offenders.join('\n')}`).toEqual([]);
    });
  });
});
