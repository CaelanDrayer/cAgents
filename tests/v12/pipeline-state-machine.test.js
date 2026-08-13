// v12.0.0 regression: pipeline collapsed from 7 states to 5 states.
// task-decomposer + prompt-engineer absorbed into universal-planner.
// See revamp-design-v2.md Q1.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

const CONFIG_PATH = join(process.cwd(), 'cagents-memory', '_system', 'config', 'pipeline_config.yaml');

function loadConfig() {
  return yaml.load(readFileSync(CONFIG_PATH, 'utf8'));
}

describe('v12.0.0 pipeline state machine (5-state collapse)', () => {
  it('pipeline_config.yaml exists and parses', () => {
    expect(existsSync(CONFIG_PATH)).toBe(true);
    expect(() => loadConfig()).not.toThrow();
  });

  describe('exactly 5 states defined', () => {
    const EXPECTED_STATES = ['INIT', 'ORCHESTRATED', 'PLANNED', 'COORDINATED', 'VALIDATED'];

    it('states map contains exactly the 5 expected state keys', () => {
      const config = loadConfig();
      expect(config.states).toBeDefined();
      const actual = Object.keys(config.states).sort();
      const expected = [...EXPECTED_STATES].sort();
      expect(actual).toEqual(expected);
    });

    it.each(EXPECTED_STATES)('defines state %s', (name) => {
      const config = loadConfig();
      expect(config.states[name]).toBeDefined();
    });
  });

  describe('removed states absent', () => {
    it('does NOT define DECOMPOSED', () => {
      const config = loadConfig();
      expect(config.states.DECOMPOSED).toBeUndefined();
    });

    it('does NOT define PROMPTS_READY', () => {
      const config = loadConfig();
      expect(config.states.PROMPTS_READY).toBeUndefined();
    });

    it('config text contains no DECOMPOSED state declaration', () => {
      const raw = readFileSync(CONFIG_PATH, 'utf8');
      // Tolerate the word in comments/strings; reject state definition `DECOMPOSED:` at top of indented states block.
      expect(raw).not.toMatch(/^\s{2}DECOMPOSED:\s*$/m);
    });

    it('config text contains no PROMPTS_READY state declaration', () => {
      const raw = readFileSync(CONFIG_PATH, 'utf8');
      expect(raw).not.toMatch(/^\s{2}PROMPTS_READY:\s*$/m);
    });
  });

  describe('PLANNED transitions directly to COORDINATED', () => {
    it('PLANNED.next === COORDINATED', () => {
      const config = loadConfig();
      expect(config.states.PLANNED.next).toBe('COORDINATED');
    });

    it('ORCHESTRATED.next === PLANNED', () => {
      const config = loadConfig();
      expect(config.states.ORCHESTRATED.next).toBe('PLANNED');
    });

    it('COORDINATED.next === VALIDATED', () => {
      const config = loadConfig();
      expect(config.states.COORDINATED.next).toBe('VALIDATED');
    });

    it('VALIDATED is terminal', () => {
      const config = loadConfig();
      expect(config.states.VALIDATED.terminal).toBe(true);
    });
  });

  describe('revision routing (v12.0.0)', () => {
    it('on_fail routes to PLANNED (not PROMPTS_READY)', () => {
      const config = loadConfig();
      expect(config.revision.on_fail).toBe('PLANNED');
    });

    it('on_fail does NOT reference PROMPTS_READY', () => {
      const config = loadConfig();
      expect(config.revision.on_fail).not.toBe('PROMPTS_READY');
    });

    it('on_revise routes to PLANNED', () => {
      const config = loadConfig();
      expect(config.revision.on_revise).toBe('PLANNED');
    });

    it('max_cycles is 3 (v12.0.0 lowered from 5)', () => {
      const config = loadConfig();
      expect(config.revision.max_cycles).toBe(3);
    });
  });

  describe('progressive pipeline paths reference only 5-state set', () => {
    // v12.7.0 P2-9: pipeline_config.yaml no longer carries a `paths:` map.
    // The 3-path Minimal/Medium/Full progressive structure was collapsed in
    // v12.3.0 (deletion) and partially re-introduced in v12.7.0 P2-9 as two
    // named paths (`fast`, `standard`) — BUT only described in
    // .claude/skills/act/reference/adaptive-pipeline.md, NOT in the config.
    // The config has a single unconditional 5-state machine; "fast" is an
    // orchestrator-skip selector applied at runtime, not a separate config path.
    // Therefore the path-validity check now asserts that no `paths:` map is
    // present (matching mandatory-pipeline-contract AC-1.1).
    it('pipeline_config.yaml has no top-level `paths:` map (v12.7.0 single-config)', () => {
      const config = loadConfig();
      expect(config.paths).toBeUndefined();
    });

    it('the only states in the config are the 5 canonical states (no DECOMPOSED/PROMPTS_READY)', () => {
      const config = loadConfig();
      const stateNames = Object.keys(config.states || {});
      expect(stateNames).not.toContain('DECOMPOSED');
      expect(stateNames).not.toContain('PROMPTS_READY');
    });
  });
});
