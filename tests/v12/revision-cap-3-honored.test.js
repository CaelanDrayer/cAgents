/**
 * WI-W4.4 (e): revision-cap-3-honored
 *
 * Asserts max_revision_cycles == 3 in pipeline_config.yaml. Complementary
 * to tests/v12/revision-cap.test.js (WI-W1.4) — that test checks the
 * pipeline_config.yaml value plus audit-citation comments. This test adds
 * an additional surface-area check: any docs/rules file that documents
 * the cap must agree with the live config value.
 *
 * Rationale: a value in one place is easy to drift. The /run state machine
 * loop and any rules file that mentions the cap must agree.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(REPO_ROOT, 'cagents-memory', '_system', 'config', 'pipeline_config.yaml');

let config;

beforeAll(() => {
  config = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8'));
});

describe('WI-W4.4 (e): revision cap == 3 honored across surfaces', () => {
  it('pipeline_config.yaml: revision.max_cycles === 3', () => {
    expect(config.revision).toBeDefined();
    expect(config.revision.max_cycles).toBe(3);
  });

  it('pipeline_config.yaml: revision.max_cycles is the integer 3 (not a string)', () => {
    expect(typeof config.revision.max_cycles).toBe('number');
    expect(Number.isInteger(config.revision.max_cycles)).toBe(true);
  });

  it('CLAUDE.md (cAgents): if it mentions max_revision_cycles, the value is 3 (not 5)', () => {
    const claudemd = path.join(REPO_ROOT, 'CLAUDE.md');
    if (!fs.existsSync(claudemd)) return;
    const content = fs.readFileSync(claudemd, 'utf8');
    // Look for lines mentioning max_revision_cycles with a number after.
    const lines = content.split('\n').filter((l) => /max_revision_cycles/.test(l));
    for (const line of lines) {
      // The line may legitimately say "max_revision_cycles 5 -> 3" (historical
      // arrow describing the v12 reduction). Such arrow-form lines are OK.
      // What is NOT OK is a line that asserts "= 5" or "is 5" as the active value.
      const isArrowReduction = /5\s*->\s*3|5\s*→\s*3/.test(line);
      const claimsFive =
        /max_revision_cycles\s*[:=]\s*5\b/.test(line) ||
        /max_revision_cycles\s+is\s+5\b/i.test(line);
      if (claimsFive && !isArrowReduction) {
        throw new Error(`CLAUDE.md still documents max_revision_cycles=5: "${line.trim()}"`);
      }
    }
  });

  it('no production *.yaml/*.yml file declares `max_revision_cycles: 5` or `max_cycles: 5`', () => {
    const excludeDirs = [
      '--exclude-dir=node_modules',
      '--exclude-dir=vendor_repos',
      '--exclude-dir=archive',
      '--exclude-dir=_archive',
      '--exclude-dir=sessions',
      '--exclude-dir=tests',
      '--exclude-dir=.git',
      '--exclude-dir=example',
      '--exclude-dir=examples',
    ];
    // Match: `max_cycles: 5` or `max_revision_cycles: 5` at start of line (with optional indent)
    const pattern = '^[[:space:]]*(max_revision_cycles|max_cycles):[[:space:]]*5[[:space:]]*$';
    const proc = spawnSync(
      'grep',
      ['-rEn', '--include=*.yaml', '--include=*.yml', ...excludeDirs, pattern, '.'],
      { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 15000 },
    );
    // grep exit 1 = no matches (good); exit 0 = matches found (bad)
    if (proc.status === 1) {
      // no matches — pass
      return;
    }
    const matches = (proc.stdout || '').trim();
    expect(matches, `Production YAML still declares max_cycles: 5:\n${matches}`).toBe('');
  });

  it('revision routing references PLANNED (not the deleted PROMPTS_READY state)', () => {
    // Sanity cross-check with the 5-state collapse: revision routes back to
    // a state in the 5-state set, not the v11 PROMPTS_READY.
    expect(config.revision.on_fail).not.toBe('PROMPTS_READY');
    expect(config.revision.on_revise).not.toBe('PROMPTS_READY');
    // Per v12 design: both route to PLANNED
    expect(config.revision.on_fail).toBe('PLANNED');
    expect(config.revision.on_revise).toBe('PLANNED');
  });
});
