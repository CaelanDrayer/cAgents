/**
 * v12.62.0: "teammate" -> "subagent" reframe regression test.
 *
 * Session team_teammate-to-subagent_260725_001. Per CLAUDE.md bug-driven test
 * mandate + the Wave-1 reframe contract §7. Asserts the SEMANTIC reframe held:
 *   1. The DEFAULT /team wave unit is now labeled "subagent"/"wave subagent".
 *   2. The positive downward-nesting thesis is present (subagent spawns its own
 *      specialist downward instead of routing sideways through the lead).
 *   3. The experimental named-background-teammate path is LABELED, not deleted.
 *   4. The peer_request / cross-teammate machinery is DEMOTED, not deleted
 *      (playbook survives with a legacy banner + intact test surface).
 *   5. KEEP-list concepts (waves, GATE, synchronous spawning, depth-5) survive.
 *   6. Claude Code API tokens (teammateMode, --teammate-mode) are preserved.
 *
 * Positive-presence assertions only — NOT global "teammate" absence, because
 * the experimental/API references legitimately remain (demote-not-delete).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const TEAMS_DOC_PATH = path.join(REPO_ROOT, '.claude', 'rules', 'core', 'teams.md');
const TEAM_SKILL_PATH = path.join(REPO_ROOT, '.claude', 'skills', 'team', 'SKILL.md');
const PLAYBOOK_PATH = path.join(
  REPO_ROOT,
  '.claude',
  'rules',
  'playbooks',
  'pat-cross-teammate-request.md',
);
const SETTINGS_PATH = path.join(REPO_ROOT, '.claude', 'settings.json');
const MODE_REGISTRY_PATH = path.join(REPO_ROOT, '.claude', 'skills', '_MODE_REGISTRY.md');

const read = (p) => fs.readFileSync(p, 'utf8');

// Matches "spawn wave subagents", "Spawn ALL wave-K subagents", "spawn wave-k subagents"
const SPAWN_WAVE_SUBAGENTS = /spawn\s+(?:all\s+)?wave[-\s]?k?\s*subagents/i;

describe('teammate -> subagent reframe (v12.62.0 regression)', () => {
  // ---- Group 1: default unit reframed to "subagent" ----
  describe('1. default wave unit is reframed to "subagent"', () => {
    it('teams.md describes the wave unit as a subagent / wave subagent', () => {
      const doc = read(TEAMS_DOC_PATH);
      expect(doc).toContain('subagent');
      expect(/wave subagent/i.test(doc)).toBe(true);
      expect(SPAWN_WAVE_SUBAGENTS.test(doc)).toBe(true);
    });

    it('team/SKILL.md describes the wave unit as a subagent / wave subagent', () => {
      const doc = read(TEAM_SKILL_PATH);
      expect(doc).toContain('subagent');
      expect(/wave subagent/i.test(doc)).toBe(true);
      expect(SPAWN_WAVE_SUBAGENTS.test(doc)).toBe(true);
    });
  });

  // ---- Group 2: positive downward-nesting thesis present ----
  it('2. teams.md states the downward-nesting positive thesis (not sideways)', () => {
    const doc = read(TEAMS_DOC_PATH);
    const downward = /spawns?\s+[^.]*specialist[^.]*subagent|downward|own sub-?agent/i;
    const notSideways = /sideways|no\s+(?:sideways\s+)?peer|peer[_ ]request/i;
    expect(downward.test(doc)).toBe(true);
    expect(notSideways.test(doc)).toBe(true);
  });

  // ---- Group 3: experimental path labeled, not deleted ----
  it('3. experimental named-teammate path is labeled, not deleted', () => {
    const teams = read(TEAMS_DOC_PATH);
    expect(teams).toContain('Experimental Named-Background-Teammate');
    expect(teams).toContain('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS');

    const skill = read(TEAM_SKILL_PATH);
    expect(skill).toContain('5c-EXPERIMENTAL');
    expect(skill).toContain('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS');
  });

  // ---- Group 4: peer_request demoted, not deleted ----
  describe('4. peer_request machinery is demoted, not deleted', () => {
    it('cross-teammate playbook still exists', () => {
      expect(fs.existsSync(PLAYBOOK_PATH)).toBe(true);
    });

    it('playbook frontmatter name is unchanged', () => {
      const content = read(PLAYBOOK_PATH);
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      expect(fmMatch).not.toBeNull();
      const fm = yaml.load(fmMatch[1]);
      expect(fm.name).toBe('pat-cross-teammate-request');
    });

    it('playbook carries a LEGACY/EXPERIMENTAL/OBSOLETE demotion banner', () => {
      const content = read(PLAYBOOK_PATH);
      expect(/legacy|experimental|obsolete/i.test(content)).toBe(true);
    });

    it('playbook still documents all four routing branches', () => {
      const content = read(PLAYBOOK_PATH);
      for (const branch of ['RELAY', 'SPAWN', 'PROMOTE', 'REJECT']) {
        expect(content).toContain(branch);
      }
    });

    it('playbook YAML example blocks still parse as valid YAML', () => {
      const content = read(PLAYBOOK_PATH);
      const yamlBlocks = [];
      const fenceRe = /```yaml\n([\s\S]*?)\n```/g;
      let match;
      while ((match = fenceRe.exec(content)) !== null) {
        yamlBlocks.push(match[1]);
      }
      expect(yamlBlocks.length).toBeGreaterThanOrEqual(1);
      for (const block of yamlBlocks) {
        expect(() => yaml.load(block)).not.toThrow();
      }
    });

    it('teams.md still @-imports the cross-teammate playbook', () => {
      const teams = read(TEAMS_DOC_PATH);
      expect(teams).toContain('@.claude/rules/playbooks/pat-cross-teammate-request.md');
    });
  });

  // ---- Group 5: KEEP-list concepts survive ----
  describe('5. KEEP-list concepts survive the reframe', () => {
    for (const [label, docPath] of [
      ['teams.md', TEAMS_DOC_PATH],
      ['team/SKILL.md', TEAM_SKILL_PATH],
    ]) {
      it(`${label} retains wave / GATE / run_in_background:false / depth-5 / synchronous`, () => {
        const doc = read(docPath);
        expect(/\bwave\b/i.test(doc)).toBe(true);
        expect(doc).toContain('GATE');
        expect(doc).toContain('run_in_background: false');
        expect(/5 levels|depth 5/i.test(doc)).toBe(true);
        expect(/synchronous/i.test(doc)).toBe(true);
      });
    }
  });

  // ---- Group 6: Claude Code API tokens preserved ----
  it('6. Claude Code API tokens are preserved', () => {
    const settings = read(SETTINGS_PATH);
    expect(settings).toContain('teammateMode');
    // settings.json must still parse as JSON
    expect(() => JSON.parse(settings)).not.toThrow();

    const modeRegistry = read(MODE_REGISTRY_PATH);
    expect(modeRegistry).toContain('--teammate-mode');
  });
});
