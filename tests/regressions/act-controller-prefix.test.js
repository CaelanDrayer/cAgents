import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * HO-09 regression: the planner writes controller_assignment.primary as
 * "cagents:tech-lead". A template that always prepends "cagents:" yields
 * "cagents:cagents:tech-lead". Both spawn instructions must add the prefix
 * only when it is missing.
 * Origin: session act_streamline-cleanup-plugin_261111_001, WI-37 (HO-09 from WI-29).
 */
const ROOT = join(__dirname, '..', '..');
const ACT = readFileSync(join(ROOT, '.claude', 'skills', 'act', 'SKILL.md'), 'utf8');
const DP = readFileSync(join(ROOT, '.claude', 'skills', 'act', 'reference', 'delegation-patterns.md'), 'utf8');

describe('HO-09: controller subagent_type prefix is conditional', () => {
  it('delegation-patterns.md does not build a literal cagents:{controller_name}', () => {
    expect(DP).not.toMatch(/cagents:\{controller_name\}/);
  });

  it('delegation-patterns.md says to add the prefix only when it is missing', () => {
    expect(DP).toMatch(/does not start with `cagents:`, add the prefix/);
  });

  it('act/SKILL.md resolves the controller with exactly one cagents: prefix', () => {
    const line = ACT.split('\n').find((l) => l.includes('**PLANNED state (controller)**'));
    expect(line).toBeTruthy();
    expect(line).toMatch(/exactly one `cagents:` prefix/);
    expect(line).toMatch(/only if it is absent/);
  });

  it('act/SKILL.md Step 3f template does not hard-code a cagents: prefix (S2-02)', () => {
    const block = ACT.slice(ACT.indexOf('**3f. Agent delegation pattern**'));
    const typeLine = block.split('\n').find((l) => l.includes('subagent_type:'));
    expect(typeLine).toBeTruthy();
    expect(typeLine).not.toMatch(/"cagents:\{/);
  });
});
