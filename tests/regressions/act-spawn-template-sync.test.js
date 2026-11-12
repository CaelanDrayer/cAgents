import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * ACT-04 regression: the /act state spawn template (SKILL.md Step 3f) and the
 * controller spawn template (reference/delegation-patterns.md) must be
 * synchronous (run_in_background: false) and unnamed (no name: key). The skill
 * must also say that it never yields while a child it must collect still runs.
 * Origin: session act_streamline-cleanup-plugin_261111_001, WI-37.
 */
const ROOT = join(__dirname, '..', '..');
const ACT = readFileSync(join(ROOT, '.claude', 'skills', 'act', 'SKILL.md'), 'utf8');
const DP = readFileSync(join(ROOT, '.claude', 'skills', 'act', 'reference', 'delegation-patterns.md'), 'utf8');

function agentBlocks(text) {
  return [...text.matchAll(/Agent\(\{[\s\S]*?\n\}\)/g)].map((m) => m[0]);
}

describe('ACT-04: synchronous unnamed spawn templates', () => {
  const step3f = ACT.slice(ACT.indexOf('**3f. Agent delegation pattern**'));
  const actBlock = agentBlocks(step3f)[0];
  const dpSection = DP.slice(DP.indexOf('## Controller Delegation'));
  const dpBlock = agentBlocks(dpSection)[0];

  for (const [label, block] of [['act/SKILL.md Step 3f', actBlock], ['delegation-patterns.md', dpBlock]]) {
    it(`${label} template sets run_in_background: false`, () => {
      expect(block).toBeTruthy();
      expect(block).toMatch(/run_in_background:\s*false/);
    });
    it(`${label} template has no name: key`, () => {
      expect(block).not.toMatch(/^\s*name:/m);
    });
  }

  it('act/SKILL.md Step 3f says the skill never yields with a live child', () => {
    const section = step3f.slice(0, step3f.indexOf('**3g.'));
    expect(section).toMatch(/never yield/i);
  });

  it('delegation-patterns.md states the reviewer loop cap as 2 rounds, not 3', () => {
    // pipeline_config.yaml controller_revision.max_internal_rounds: 2 (LP-27).
    expect(DP).not.toMatch(/max 3 rounds/);
    expect(DP).toMatch(/Spawn cagents:reviewer after each executor completes \(max 2 rounds\)/);
  });
});
