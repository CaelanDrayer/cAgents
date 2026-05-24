import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CONFIG_PATH = join(process.cwd(), 'cagents-memory', '_system', 'config', 'pipeline_config.yaml');

function loadConfig() {
  return readFileSync(CONFIG_PATH, 'utf8');
}

describe('pipeline_config.yaml', () => {
  it('should exist', () => {
    expect(existsSync(CONFIG_PATH)).toBe(true);
  });

  it('should be version 2.0', () => {
    expect(loadConfig()).toContain('version: "2.0"');
  });

  describe('states', () => {
    it('should define INIT state', () => {
      expect(loadConfig()).toContain('INIT:');
    });

    it('should define ORCHESTRATED state', () => {
      expect(loadConfig()).toContain('ORCHESTRATED:');
    });

    it('should define PLANNED state', () => {
      expect(loadConfig()).toContain('PLANNED:');
    });

    // v12.0.0: DECOMPOSED and PROMPTS_READY removed
    // (task-decomposer + prompt-engineer absorbed into universal-planner).
    // See tests/v12/pipeline-state-machine.test.js for the 5-state contract.

    it('should define COORDINATED state', () => {
      expect(loadConfig()).toContain('COORDINATED:');
    });

    it('should define VALIDATED terminal state', () => {
      const content = loadConfig();
      expect(content).toContain('VALIDATED:');
      expect(content).toContain('terminal: true');
    });
  });

  // v12.3.0 removed pre-enrichment detection and the progressive
  // minimal/medium/full path model. Every /run and /team session now
  // unconditionally executes the full 5-state pipeline. The old
  // 'progressive pipeline paths' block (asserting minimal/medium/full +
  // 0.25/0.65/1.0 thresholds) asserted a removed feature; it is replaced
  // here with assertions of the current unconditional-full-pipeline contract.
  describe('unconditional full pipeline (v12.3.0)', () => {
    it('documents that pre-enrichment detection was removed in v12.3.0', () => {
      expect(loadConfig()).toContain('Pre-enrichment detection removed in v12.3.0');
    });

    it('every session unconditionally executes the full 5-state pipeline', () => {
      expect(loadConfig()).toMatch(/unconditionally executes the full 5-state/);
    });

    it('no longer defines minimal/medium/full progressive path thresholds', () => {
      const content = loadConfig();
      expect(content).not.toMatch(/^\s*minimal:/m);
      expect(content).not.toMatch(/^\s*medium:/m);
      expect(content).not.toMatch(/threshold:\s*0\.25/);
    });
  });

  describe('revision routing', () => {
    it('should define max_cycles', () => {
      expect(loadConfig()).toContain('max_cycles: 3');
    });

    // v12.0.0: PROMPTS_READY removed; FAIL now routes to PLANNED.
    it('should route FAIL to PLANNED (v12.0.0; was PROMPTS_READY)', () => {
      expect(loadConfig()).toContain('on_fail: PLANNED');
    });

    it('should route REVISE to PLANNED', () => {
      expect(loadConfig()).toContain('on_revise: PLANNED');
    });
  });
});
