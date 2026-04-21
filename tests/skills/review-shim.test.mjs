// Regression test for V10.26.26 — /review converted to shim over /improve --mode review.
// Parity test: the shim preserves every legacy /review flag by forwarding verbatim.
// Failing-before: V10.26.25 still had the full /review orchestrator body; invoking
// /review did NOT forward to /improve --mode review.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REVIEW_SKILL = resolve(process.cwd(), '.claude/skills/review/SKILL.md');
const HELPER_DETAILS = resolve(
  process.cwd(),
  '.claude/skills/helper/reference/command-details.md'
);
const IMPROVE_SKILL = resolve(process.cwd(), '.claude/skills/improve/SKILL.md');

describe('V10.26.26 /review → /improve --mode review shim', () => {
  const reviewContent = readFileSync(REVIEW_SKILL, 'utf8');

  it('review SKILL.md frontmatter preserves name, description, version registration', () => {
    expect(reviewContent).toMatch(/^---\s*\n[\s\S]*?name: review/m);
    expect(reviewContent).toMatch(/user-invocable: "true"/);
    expect(reviewContent).toMatch(/context: "fork"/);
  });

  it('review SKILL.md has the Skill tool in allowed-tools (needed to invoke /improve)', () => {
    expect(reviewContent).toMatch(/allowed-tools:.*Skill/);
  });

  it('review SKILL.md declares itself a shim over /improve --mode review', () => {
    expect(reviewContent).toMatch(/shim.*\/improve --mode review/s);
  });

  it('review SKILL.md shows the Skill tool invocation of /improve', () => {
    expect(reviewContent).toMatch(/Skill\(\{\s*skill:\s*"improve"/);
    expect(reviewContent).toMatch(/--mode review/);
  });

  it('review SKILL.md documents a one-time deprecation notice', () => {
    expect(reviewContent).toMatch(/ONCE per session|once per session/);
    expect(reviewContent).toMatch(/will be removed in V11\.0/);
  });

  it('review SKILL.md notes V11.0 removal schedule', () => {
    expect(reviewContent).toMatch(/V11\.0\.0.*removed|removed.*V11\.0/s);
  });

  it('review SKILL.md does NOT spawn agents or create sessions directly', () => {
    expect(reviewContent).toMatch(/does NOT|Does NOT/);
    expect(reviewContent).toMatch(/Create session|session directories|owns session/);
  });

  // Flag parity — all 15 representative /review flags must forward verbatim
  const PRESERVED_FLAGS = [
    '--focus',
    '--auto-fix',
    '--severity',
    '--mode paranoid|quick|security|pre-merge',
    '--baseline',
    '--suppress',
    '--profile',
    '--show-confidence',
    '--run-tests',
    '--rollback-on-failure',
    '--critical-first',
    '--pr-context',
    '--git-hotspots',
    '--format',
    '--scope',
  ];

  for (const flag of PRESERVED_FLAGS) {
    it(`shim preserves ${flag} flag (pass-through to /improve)`, () => {
      // Escape regex special chars in flag value
      const escaped = flag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(reviewContent).toMatch(new RegExp(escaped));
    });
  }

  it('shim documents that baselines copy-forward to _projects/{hash}/improve/', () => {
    expect(reviewContent).toMatch(/_projects\/\{hash\}\/improve\/baseline\.yaml/);
  });

  it('shim preserves artifact-set identity with legacy /review', () => {
    expect(reviewContent).toMatch(/reports\/aggregate\.yaml/);
    expect(reviewContent).toMatch(/reports\/final_report\.md/);
    expect(reviewContent).toMatch(/identical|artifact-equivalent/);
  });

  it('helper command-details.md marks /review as shim deprecated V11.0', () => {
    const h = readFileSync(HELPER_DETAILS, 'utf8');
    expect(h).toMatch(/shim.*\/improve --mode review/);
    expect(h).toMatch(/deprecated V11\.0|removed in V11\.0/);
  });

  it('helper command-details.md removes preview note from /improve entry', () => {
    const h = readFileSync(HELPER_DETAILS, 'utf8');
    // /improve should now be listed as canonical, not preview
    expect(h).toMatch(/\/improve.*canonical|canonical.*\/improve/s);
  });

  it('/improve --mode review remains feature-complete (V10.26.25 guarantee)', () => {
    const improveContent = readFileSync(IMPROVE_SKILL, 'utf8');
    expect(improveContent).toMatch(/all 7 states complete/);
    expect(improveContent).toMatch(/EXECUTING/);
    expect(improveContent).toMatch(/VALIDATING/);
    expect(improveContent).toMatch(/REPORTING/);
  });
});
