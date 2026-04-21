// Regression test for V10.26.18 — /debug converted to shim over /run --mode debug
// Asserts:
//  1. /debug SKILL.md invokes /run --mode debug via the Skill tool
//  2. --escalate and --phase are forwarded unchanged
//  3. One-time deprecation notice is documented
//  4. /helper command-details.md marks /debug as shim deprecated V11.0
//  5. reference/methodology.md preserves the 4-phase content
// Failing-before: V10.26.17 still had the full /debug 4-phase body; invoking
// /debug did NOT forward to /run --mode debug.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEBUG_SKILL = resolve(process.cwd(), '.claude/skills/debug/SKILL.md');
const METHODOLOGY = resolve(
  process.cwd(),
  '.claude/skills/debug/reference/methodology.md'
);
const HELPER_DETAILS = resolve(
  process.cwd(),
  '.claude/skills/helper/reference/command-details.md'
);

describe('V10.26.18 /debug → /run --mode debug shim', () => {
  const debugContent = readFileSync(DEBUG_SKILL, 'utf8');

  it('debug SKILL.md has the Skill tool in allowed-tools (needed to invoke /run)', () => {
    expect(debugContent).toMatch(/allowed-tools:.*Skill/);
  });

  it('debug SKILL.md declares itself a shim over /run --mode debug', () => {
    expect(debugContent).toMatch(/shim.*\/run --mode debug/s);
  });

  it('debug SKILL.md shows the Skill tool invocation of /run --mode debug', () => {
    expect(debugContent).toMatch(/Skill\(\{\s*skill:\s*"run"/);
    expect(debugContent).toMatch(/--mode debug/);
  });

  it('debug SKILL.md forwards --escalate flag', () => {
    expect(debugContent).toMatch(/--escalate/);
  });

  it('debug SKILL.md forwards --phase flag', () => {
    expect(debugContent).toMatch(/--phase/);
  });

  it('debug SKILL.md documents a one-time deprecation notice', () => {
    expect(debugContent).toMatch(/ONCE per session|once per session/);
    expect(debugContent).toMatch(/will be removed in V11\.0/);
  });

  it('debug SKILL.md notes V11.0 removal schedule', () => {
    expect(debugContent).toMatch(/V11\.0\.0.*removed|removed.*V11\.0/s);
  });

  it('reference/methodology.md exists and preserves 4-phase content', () => {
    expect(existsSync(METHODOLOGY)).toBe(true);
    const m = readFileSync(METHODOLOGY, 'utf8');
    expect(m).toMatch(/Phase 1/);
    expect(m).toMatch(/Phase 2/);
    expect(m).toMatch(/Phase 3/);
    expect(m).toMatch(/Phase 4/);
    expect(m).toMatch(/Escalation Rules/);
  });

  it('helper command-details.md marks /debug as shim deprecated V11.0', () => {
    const h = readFileSync(HELPER_DETAILS, 'utf8');
    expect(h).toMatch(/shim.*\/run --mode debug/);
    expect(h).toMatch(/deprecated V11\.0/);
  });

  it('debug SKILL.md does NOT spawn agents directly (shim anti-pattern check)', () => {
    // The shim must not create sessions or spawn controllers; it delegates.
    // A section explicitly says so.
    expect(debugContent).toMatch(/does NOT|Does NOT/i);
    expect(debugContent).toMatch(/Create session|session directories/);
  });
});
