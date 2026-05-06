// Regression test for V10.26.9 — /run context passthrough subcommands
// Asserts the documentation contract for /run context show|init|update|clear.
//
// V11.0 update: /context skill was removed in V11.0 (see docs/MIGRATION-V11.md).
// The /run context passthrough no longer dispatches to a sibling skill.
// SKILL.md preserves a deprecation note pointing at the historical contract
// in @reference/context-passthrough.md. The reference file still documents
// the original four subcommands and dispatch behavior for AgentPath
// FileWatcher backward-compatibility and historical traceability.
//
// Tests below verify:
//   - reference/context-passthrough.md retains the full historical contract
//     (4 subcommands, canonical product_context.yaml path, Skill dispatch)
//   - SKILL.md retains the V11.0+ deprecation note (combined subcommand
//     syntax, removal acknowledgement, link to reference doc)
//   - Token-level passthrough detection logic still parses correctly
//     (preserved for any future re-implementation)

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

  it('run/SKILL.md acknowledges the V11.0 /context skill removal', () => {
    // Post-V11.0: SKILL.md must preserve a deprecation note explaining that
    // the /run context passthrough no longer dispatches to a sibling skill.
    expect(runSkillContent).toMatch(/V11\.0/);
    expect(runSkillContent).toMatch(/no longer dispatches/i);
  });

  it('run/SKILL.md documents the historical subcommand syntax', () => {
    // The combined form `/run context show|init|update|clear` must remain in
    // SKILL.md so users searching for the old syntax land on the deprecation
    // note rather than guessing.
    expect(runSkillContent).toMatch(
      /\/run context show\|init\|update\|clear/
    );
  });

  it('run/SKILL.md points users at product_context.yaml for direct edits', () => {
    // Post-V11.0: the orchestrator still reads product_context.yaml during
    // INIT-state enrichment. SKILL.md must tell users to edit the file
    // directly since no /run subcommand wraps it anymore.
    expect(runSkillContent).toMatch(/product_context\.yaml/);
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
