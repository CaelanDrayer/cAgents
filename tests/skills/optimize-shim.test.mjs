// Regression test for V10.26.32 /optimize deprecation shim.
// Asserts /optimize SKILL.md is a thin shim forwarding to /improve --mode optimize,
// preserves all legacy flags in its documented shim surface, and emits
// a one-time deprecation notice per session.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const OPTIMIZE_SKILL = resolve(ROOT, '.claude/skills/optimize/SKILL.md');
const HELPER_DETAILS = resolve(
  ROOT,
  '.claude/skills/helper/reference/command-details.md'
);

describe('V10.26.32 /optimize → /improve --mode optimize shim', () => {
  const content = readFileSync(OPTIMIZE_SKILL, 'utf8');

  it('/optimize SKILL.md exists and is tagged as deprecation shim', () => {
    expect(existsSync(OPTIMIZE_SKILL)).toBe(true);
    expect(content).toMatch(/Deprecation Shim.*V10\.26\.32/);
  });

  it('shim forwards to /improve --mode optimize via Skill tool', () => {
    expect(content).toMatch(/improve --mode optimize/);
    expect(content).toMatch(
      /Skill\(\s*\{\s*skill:\s*"improve",\s*args:\s*"[^"]*--mode optimize[^"]*"/
    );
  });

  it('shim emits one-time deprecation notice per session', () => {
    expect(content).toMatch(/EXACTLY ONCE per session/);
    expect(content).toMatch(/deprecations_\{date\}\.log/);
    expect(content).toMatch(/session_id/);
  });

  it('deprecation notice mentions V11.0.0 removal', () => {
    expect(content).toMatch(/V11\.0/);
    expect(content).toMatch(/removed/);
  });

  it('shim allowed-tools includes Skill', () => {
    expect(content).toMatch(/allowed-tools:.*Skill/);
  });

  it('preserves all /optimize flags: positional, --type, --focus, --safety', () => {
    expect(content).toMatch(/Positional:\s*`<target>`/);
    expect(content).toMatch(/`--type/);
    expect(content).toMatch(/`--focus/);
    expect(content).toMatch(/`--safety/);
  });

  it('preserves execution flags: --dry-run, --incremental, --parallel', () => {
    expect(content).toMatch(/--dry-run/);
    expect(content).toMatch(/--incremental/);
    expect(content).toMatch(/--parallel/);
  });

  it('preserves --rollback automatic flag', () => {
    expect(content).toMatch(/--rollback automatic/);
  });

  it('preserves cross-file flags: --cross-file, --no-cross-file, --cross-file-only, --dependency-graph', () => {
    expect(content).toMatch(/--cross-file/);
    expect(content).toMatch(/--no-cross-file/);
    expect(content).toMatch(/--cross-file-only/);
    expect(content).toMatch(/--dependency-graph/);
  });

  it('preserves --benchmark auto|lighthouse|k6|hyperfine', () => {
    expect(content).toMatch(/--benchmark auto\|lighthouse\|k6\|hyperfine/);
  });

  it('preserves --history, --interactive, --plan-only, --explore-first, --review-after', () => {
    expect(content).toMatch(/--history/);
    expect(content).toMatch(/--interactive/);
    expect(content).toMatch(/--plan-only/);
    expect(content).toMatch(/--explore-first/);
    expect(content).toMatch(/--review-after/);
  });

  it('shim does NOT spawn agents directly', () => {
    expect(content).toMatch(/Do NOT spawn any agents directly/);
  });

  it('declares /improve owns session initialization', () => {
    expect(content).toMatch(/\/improve.*owns[\s\S]*session initialization/);
  });

  it('helper catalog flips /optimize entry to shim', () => {
    const h = readFileSync(HELPER_DETAILS, 'utf8');
    expect(h).toMatch(/\/optimize.*Shim.*\/improve --mode optimize/);
    expect(h).toMatch(/V10\.26\.32/);
  });

  it('shim file stays compact (under ~200 lines)', () => {
    const lineCount = content.split('\n').length;
    expect(lineCount).toBeLessThan(200);
  });
});
