/**
 * REC-12 (P-8) regression: the shipped .claude/settings.json MUST NOT set
 * CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS in `env`.
 *
 * The DEFAULT /team execution model is concurrent-Agent waves (implicit teams),
 * which do NOT depend on the experimental named-background-teammate path. Shipping
 * the experimental flag ON by default was a defect: it opts every user into an
 * experimental, harness-variable code path they never asked for. The flag remains
 * a documented USER opt-in (export it manually + set teammateMode to 'tmux'), it
 * just is not shipped in the plugin's default `env`.
 *
 * FAILING-BEFORE / PASSING-AFTER: pre-REC-12 the key is present in env with value
 * "1" and this test FAILS; post-REC-12 it is absent and the test PASSES.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SETTINGS_PATH = join(process.cwd(), '.claude', 'settings.json');

describe('.claude/settings.json — no experimental agent-teams flag shipped (REC-12)', () => {
  const raw = readFileSync(SETTINGS_PATH, 'utf8');
  const settings = JSON.parse(raw);

  it('does NOT define CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS in env', () => {
    const env = settings.env || {};
    expect(env).not.toHaveProperty('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS');
  });

  it('does not carry the raw "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" env assignment anywhere', () => {
    // Guard against re-introduction under a differently-cased/nested key.
    expect(raw).not.toMatch(/"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"\s*:\s*"1"/);
  });

  it('still documents the flag as a manual, opt-in USER path (not removed from docs)', () => {
    // The $comment_teammateMode note must still explain the opt-in so users can
    // enable panes deliberately — REC-12 removes the default, not the capability.
    const comment = settings.$comment_teammateMode || '';
    expect(comment).toMatch(/CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS/);
    expect(comment.toLowerCase()).toMatch(/opt-in|manually|experimental/);
  });
});
