/**
 * REC-33 (audit team_plugin-full-audit_260717_001, v12.58.0): CLAUDE.md size ceiling.
 *
 * CLAUDE.md is always-loaded project memory — every agent/subagent pays its full
 * token cost on every spawn. REC-33 trimmed it from 568 -> <400 lines by MOVING
 * (not deleting) the Standalone-Contract history, the Performance-Benchmarks
 * provenance, and verbose narrative to docs/ARCHITECTURE-HISTORY.md, leaving a
 * pointer plus every load-bearing contract and disk-derived count inline.
 *
 * This test pins the ceiling so a future edit can't silently re-bloat CLAUDE.md,
 * and asserts the moved content actually landed at its new docs home (so a trim
 * that drops content instead of relocating it is caught).
 *
 * Failing-before / passing-after: pre-REC-33 CLAUDE.md was 568 lines (fails the
 * <400 ceiling); the trimmed file is under 400.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const CLAUDE_MD = join(ROOT, 'CLAUDE.md');
const ARCH_HISTORY = join(ROOT, 'docs', 'ARCHITECTURE-HISTORY.md');
const CEILING = 400;

describe('REC-33: CLAUDE.md size ceiling (< 400 lines)', () => {
  const claudeMd = readFileSync(CLAUDE_MD, 'utf8');
  // Mirror `wc -l` (count newlines) rather than split length, which off-by-ones
  // on a trailing newline.
  const wcLines = (claudeMd.match(/\n/g) || []).length;

  it(`CLAUDE.md is under ${CEILING} lines (currently ${wcLines})`, () => {
    expect(
      wcLines,
      `CLAUDE.md has ${wcLines} lines (ceiling ${CEILING}). Move history / benchmark-provenance / verbose narrative to docs/ARCHITECTURE-HISTORY.md; keep load-bearing contracts + disk-derived counts inline.`
    ).toBeLessThan(CEILING);
  });

  it('the moved-content docs home exists with the relocated sections', () => {
    expect(
      existsSync(ARCH_HISTORY),
      'docs/ARCHITECTURE-HISTORY.md (the REC-33 moved-content home) is missing'
    ).toBe(true);
    const doc = readFileSync(ARCH_HISTORY, 'utf8');
    expect(doc, 'moved Performance Benchmarks section not found in docs home').toMatch(/##\s+Performance Benchmarks/);
    expect(doc, 'moved Standalone Contract history not found in docs home').toMatch(/Standalone Contract/);
  });

  it('CLAUDE.md points at the docs home for the moved content (no dangling pointer)', () => {
    expect(
      claudeMd.includes('docs/ARCHITECTURE-HISTORY.md'),
      'CLAUDE.md should point at docs/ARCHITECTURE-HISTORY.md for the moved benchmark + standalone-contract content'
    ).toBe(true);
    expect(existsSync(ARCH_HISTORY)).toBe(true);
  });

  it('load-bearing contracts + disk-derived counts remain inline (spot-check)', () => {
    // A guard against over-trimming: the honesty-critical literals the count
    // guards depend on must survive the trim.
    expect(claudeMd).toContain('## Standalone Contract');
    expect(claudeMd).toContain('MUST NOT depend on MCP servers');
    expect(claudeMd).toMatch(/\b60 agents\b/);
    expect(claudeMd).toContain('33 .cjs files');
    expect(claudeMd).toContain('Total: 43 .md');
  });
});
