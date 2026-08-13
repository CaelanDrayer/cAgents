/**
 * v12.3.0 Pillar 1: Mandatory pipeline contract regression test.
 * (Updated v12.7.0 by P2-9: allow two named paths fast/standard while
 *  still rejecting the deleted 3-path Minimal/Medium/Full pattern.)
 *
 * Locks in these contract assertions:
 *
 *   1. pipeline_config.yaml has no `paths:`, `complexity_scoring`, or
 *      `skip_if_exists` keys (top-level or inside pre_enrichment).
 *      [Unchanged in v12.7.0 — the state-machine config remains a single
 *      5-state machine; "fast" is an orchestrator-skip selector, not a
 *      separate config path.]
 *   2. The state machine contains exactly the 5 canonical states
 *      (INIT, ORCHESTRATED, PLANNED, COORDINATED, VALIDATED).
 *      [Unchanged.]
 *   3. (REVISED v12.7.0) adaptive-pipeline.md MAY exist; if present, it
 *      MUST describe exactly two named paths (`fast`, `standard`) and
 *      MUST NOT reintroduce the deleted 3-path Minimal/Medium/Full names.
 *   4. (REVISED v12.7.0) .claude/skills/act/SKILL.md Step 3 describes
 *      orchestrator-skip via an enumerated allowlist (tier-2-clear /
 *      tier-2-fast-path / disabled-by-flag). The deleted "complexity
 *      score" heuristic must remain absent. The "fast path" and
 *      "adaptive" prose are now permitted under the v12.7.0 two-path
 *      naming.
 *
 * History:
 *   - v12.3.0 WI-8: initial contract (single mandatory pipeline, no
 *     adaptive-pipeline.md, no fast-path prose).
 *   - v12.7.0 P2-9: collapsed the pre-v12.3 3-path Minimal/Medium/Full
 *     model into 2 named paths (fast, standard), reintroduced
 *     adaptive-pipeline.md as the path catalog, and replaced the
 *     freeform orchestrator-skip note with an enum allowlist.
 *     The "no adaptive / no fast-path" prose checks were dropped; the
 *     "no Minimal/Medium/Full / no complexity scoring" checks remain.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PIPELINE_CONFIG = path.join(REPO_ROOT, 'cagents-memory', '_system', 'config', 'pipeline_config.yaml');
const ADAPTIVE_DOC = path.join(REPO_ROOT, '.claude', 'skills', 'act', 'reference', 'adaptive-pipeline.md');
const RUN_SKILL = path.join(REPO_ROOT, '.claude', 'skills', 'act', 'SKILL.md');

const CANONICAL_STATES = ['INIT', 'ORCHESTRATED', 'PLANNED', 'COORDINATED', 'VALIDATED'];

describe('v12.3.0 Pillar 1: Mandatory pipeline contract', () => {
  describe('AC-1.2: pipeline_config.yaml has no adaptive-pipeline keys', () => {
    let cfg;
    let raw;
    beforeAll: {
      // Eager-load once; vitest exposes this as a top-level read.
    }
    it('loads pipeline_config.yaml as valid YAML', () => {
      raw = fs.readFileSync(PIPELINE_CONFIG, 'utf8');
      cfg = yaml.load(raw);
      expect(cfg).toBeTruthy();
      expect(typeof cfg).toBe('object');
    });

    it('has no top-level `paths:` key', () => {
      const cfg = yaml.load(fs.readFileSync(PIPELINE_CONFIG, 'utf8'));
      expect(cfg.paths).toBeUndefined();
    });

    it('has no `complexity_scoring` key', () => {
      const cfg = yaml.load(fs.readFileSync(PIPELINE_CONFIG, 'utf8'));
      expect(cfg.complexity_scoring).toBeUndefined();
    });

    it('has no `pre_enrichment.skip_if_exists` key', () => {
      const cfg = yaml.load(fs.readFileSync(PIPELINE_CONFIG, 'utf8'));
      // pre_enrichment block may be absent entirely; if present must not have skip_if_exists
      if (cfg.pre_enrichment) {
        expect(cfg.pre_enrichment.skip_if_exists).toBeUndefined();
      }
    });

    it('has no `domain_complexity_signals` key (supporting dead code for the deleted shortcut)', () => {
      const cfg = yaml.load(fs.readFileSync(PIPELINE_CONFIG, 'utf8'));
      expect(cfg.domain_complexity_signals).toBeUndefined();
    });

    it('grep-level check: file contains no "skip_if_exists" or "complexity_scoring" substrings', () => {
      const raw = fs.readFileSync(PIPELINE_CONFIG, 'utf8');
      expect(raw).not.toMatch(/skip_if_exists/);
      expect(raw).not.toMatch(/complexity_scoring/);
    });
  });

  describe('AC-1.2 (continued): state machine has the 5 unconditional states', () => {
    it('states map contains exactly the 5 canonical states', () => {
      const cfg = yaml.load(fs.readFileSync(PIPELINE_CONFIG, 'utf8'));
      expect(cfg.states).toBeTruthy();
      const stateKeys = Object.keys(cfg.states).sort();
      expect(stateKeys).toEqual([...CANONICAL_STATES].sort());
    });
  });

  describe('AC-1.3 (REVISED v12.7.0): adaptive-pipeline.md, if present, describes exactly two named paths', () => {
    it('if adaptive-pipeline.md exists, it names both `fast` and `standard` paths', () => {
      if (!fs.existsSync(ADAPTIVE_DOC)) return; // tolerated: file is optional
      const raw = fs.readFileSync(ADAPTIVE_DOC, 'utf8');
      expect(raw).toMatch(/\bfast\b/);
      expect(raw).toMatch(/\bstandard\b/);
    });

    it('adaptive-pipeline.md MUST NOT reintroduce the deleted 3-path Minimal/Medium/Full names as active paths', () => {
      if (!fs.existsSync(ADAPTIVE_DOC)) return;
      const raw = fs.readFileSync(ADAPTIVE_DOC, 'utf8');
      // Allow historical mentions in collapse rationale, but reject active "Medium" path naming.
      // The v12.7.0 collapse drops the Medium path entirely; Minimal is renamed to fast; Full -> standard.
      // Reject any line that defines a Medium path as a current option.
      expect(raw).not.toMatch(/^\s*\|\s*`?Medium`?\s*\|/im);
      expect(raw).not.toMatch(/path:\s*Medium\b/i);
    });
  });

  describe('act/SKILL.md scrub (REVISED v12.7.0): Step 3c describes enumerated orchestrator-skip allowlist', () => {
    it('contains no "complexity score" heuristic (deleted in v12.3.0, remains absent)', () => {
      const raw = fs.readFileSync(RUN_SKILL, 'utf8');
      expect(raw).not.toMatch(/complexity[\s.-]score/i);
    });

    it('Step 3c describes the enumerated allowlist (tier-2-fast-path / tier-2-clear / disabled-by-flag)', () => {
      const raw = fs.readFileSync(RUN_SKILL, 'utf8');
      expect(raw).toMatch(/tier-2-fast-path/);
      expect(raw).toMatch(/tier-2-clear/);
      expect(raw).toMatch(/disabled-by-flag/);
    });

    it('Step 3c asserts tier 3+ ALWAYS runs the orchestrator (closed enumeration, not heuristic)', () => {
      const raw = fs.readFileSync(RUN_SKILL, 'utf8');
      expect(raw).toMatch(/Tier 3\+ ALWAYS runs the orchestrator/i);
    });
  });
});
