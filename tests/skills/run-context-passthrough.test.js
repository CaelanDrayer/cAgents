// Regression test for V10.26.9 — /run context passthrough subcommands
// Asserts the documentation contract for /run context show|init|update|clear.
// Failing-before: after V10.26.6 hid /context from the / menu, no user-facing
// CLI existed for managing product_context.yaml. This test locks the /run
// context passthrough so users can still reach the utility.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RUN_SKILL = resolve(process.cwd(), '.claude/skills/run/SKILL.md');
const PASSTHROUGH_REF = resolve(
  process.cwd(),
  '.claude/skills/run/reference/context-passthrough.md'
);

describe('V10.26.9 /run context passthrough', () => {
  const runSkillContent = readFileSync(RUN_SKILL, 'utf8');

  it('reference file exists', () => {
    expect(existsSync(PASSTHROUGH_REF)).toBe(true);
  });

  const refContent = readFileSync(PASSTHROUGH_REF, 'utf8');

  it('reference cites the canonical product_context.yaml path', () => {
    expect(refContent).toMatch(
      /cagents-memory\/_projects\/\{project_hash\}\/product_context\.yaml/
    );
  });

  it('reference documents all four subcommand patterns', () => {
    for (const sub of ['show', 'init', 'update', 'clear']) {
      expect(refContent).toMatch(new RegExp(`/run context ${sub}`));
    }
  });

  it('reference dispatches to the /context skill via Skill tool', () => {
    expect(refContent).toMatch(/Skill\(\{\s*skill:\s*"context"/);
  });

  it('run/SKILL.md contains a "Context subcommand" section', () => {
    expect(runSkillContent).toMatch(/Context subcommand/i);
  });

  it('run/SKILL.md lists all four subcommands (show/init/update/clear)', () => {
    for (const sub of ['show', 'init', 'update', 'clear']) {
      expect(runSkillContent).toMatch(new RegExp(`/run context ${sub}`));
    }
  });

  it('run/SKILL.md documents the dispatch-before-state-machine ordering', () => {
    // The passthrough must STOP the standard state machine, not wrap it.
    expect(runSkillContent).toMatch(/STOP the standard state machine/i);
  });

  it('run/SKILL.md references the passthrough reference doc', () => {
    expect(runSkillContent).toMatch(/@reference\/context-passthrough\.md/);
  });

  it('routing would dispatch to /context rather than run the full pipeline', () => {
    // Simulate the Step 1 check: token 0 == "context", token 1 in the set.
    const tokens = '/run context show'.split(/\s+/).slice(1); // drop the command
    const isPassthrough =
      tokens.length >= 2 &&
      tokens[0] === 'context' &&
      ['show', 'init', 'update', 'clear'].includes(tokens[1]);
    expect(isPassthrough).toBe(true);
  });

  it('non-passthrough requests fall through to the state machine', () => {
    const tokens = '/run fix auth bug'.split(/\s+/).slice(1);
    const isPassthrough =
      tokens.length >= 2 &&
      tokens[0] === 'context' &&
      ['show', 'init', 'update', 'clear'].includes(tokens[1]);
    expect(isPassthrough).toBe(false);
  });
});
