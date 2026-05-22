/**
 * v12.3.0 Pillar 1: Mandatory pipeline contract regression test.
 *
 * Locks in the four contract assertions that distinguish v12.3.0 from
 * the deleted progressive-paths shortcut:
 *
 *   1. pipeline_config.yaml has no `paths:`, `complexity_scoring`, or
 *      `skip_if_exists` keys (top-level or inside pre_enrichment).
 *   2. The state machine contains exactly the 5 unconditional states
 *      (INIT, ORCHESTRATED, PLANNED, COORDINATED, VALIDATED).
 *   3. The reference doc .claude/skills/run/reference/adaptive-pipeline.md
 *      does not exist on disk.
 *   4. .claude/skills/run/SKILL.md Step 3 describes unconditional
 *      orchestrator spawning and contains no 'adaptive' / 'complexity
 *      score' / 'fast path' tokens.
 *
 * This test ships as part of WI-8 in v12.3.0 per the bug-driven-testing
 * mandate (CLAUDE.md § Bug-Driven Testing). It MUST fail when run against
 * pre-v12.3.0 HEAD and pass after WI-1 through WI-3 land.
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
const ADAPTIVE_DOC = path.join(REPO_ROOT, '.claude', 'skills', 'run', 'reference', 'adaptive-pipeline.md');
const RUN_SKILL = path.join(REPO_ROOT, '.claude', 'skills', 'run', 'SKILL.md');

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

  describe('AC-1.3: adaptive-pipeline.md reference doc is deleted', () => {
    it('file .claude/skills/run/reference/adaptive-pipeline.md does not exist', () => {
      expect(fs.existsSync(ADAPTIVE_DOC)).toBe(false);
    });
  });

  describe('run/SKILL.md scrub (WI-3): Step 3 describes unconditional orchestrator spawn', () => {
    it('contains no "adaptive" or "complexity score" or "fast path" tokens', () => {
      const raw = fs.readFileSync(RUN_SKILL, 'utf8');
      expect(raw).not.toMatch(/adaptive/i);
      expect(raw).not.toMatch(/complexity[\s.-]score/i);
      expect(raw).not.toMatch(/fast[\s.-]path/i);
    });

    it('Step 3c describes unconditional orchestrator spawning', () => {
      const raw = fs.readFileSync(RUN_SKILL, 'utf8');
      // Should mention "unconditional" or "all 5 states" or "every /run and /team"
      expect(
        /unconditional|all 5 states|every \/run and \/team/i.test(raw)
      ).toBe(true);
    });
  });
});
