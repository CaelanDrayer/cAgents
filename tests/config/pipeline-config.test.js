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

    it('should define DECOMPOSED state', () => {
      expect(loadConfig()).toContain('DECOMPOSED:');
    });

    it('should define PROMPTS_READY state', () => {
      expect(loadConfig()).toContain('PROMPTS_READY:');
    });

    it('should define COORDINATED state', () => {
      expect(loadConfig()).toContain('COORDINATED:');
    });

    it('should define VALIDATED terminal state', () => {
      const content = loadConfig();
      expect(content).toContain('VALIDATED:');
      expect(content).toContain('terminal: true');
    });
  });

  describe('progressive pipeline paths', () => {
    it('should define minimal path', () => {
      expect(loadConfig()).toContain('minimal:');
    });

    it('should define medium path', () => {
      expect(loadConfig()).toContain('medium:');
    });

    it('should define full path', () => {
      expect(loadConfig()).toContain('full:');
    });

    it('should have minimal threshold of 0.25', () => {
      const content = loadConfig();
      // Check minimal path section contains threshold 0.25
      expect(content).toMatch(/minimal:[\s\S]*?threshold:\s*0\.25/);
    });

    it('should have medium threshold of 0.65', () => {
      expect(loadConfig()).toMatch(/medium:[\s\S]*?threshold:\s*0\.65/);
    });

    it('should have full threshold of 1.0', () => {
      expect(loadConfig()).toMatch(/full:[\s\S]*?threshold:\s*1\.0/);
    });
  });

  describe('revision routing', () => {
    it('should define max_cycles', () => {
      expect(loadConfig()).toContain('max_cycles: 5');
    });

    it('should route FAIL to PROMPTS_READY', () => {
      expect(loadConfig()).toContain('on_fail: PROMPTS_READY');
    });

    it('should route REVISE to PLANNED', () => {
      expect(loadConfig()).toContain('on_revise: PLANNED');
    });
  });
});
