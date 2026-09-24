/**
 * TASK-07 regression test: wave-type enum consistency across the three
 * canonical sources that describe the 9-value wave-type taxonomy.
 *
 * Three files independently document the same 9-value enum
 * (bootstrap, research, design, implementation, supporting, testing,
 * documentation, integration, vertical-slice):
 *
 *   1. .claude/rules/core/teams.md            -- "Wave Types" table (9 rows,
 *      backtick-quoted `Type` column values, lines 758-768).
 *   2. agents/planner/resources/per-wave-emission.md -- line 24, a
 *      pipe-delimited `type:` enum inside the work_meta.yaml schema example.
 *   3. .claude/skills/team/reference/per-wave-decomposition.md -- line 26,
 *      the SAME pipe-delimited `type:` enum, duplicated from #2 into the
 *      /team skill's reference doc.
 *
 * Because the enum is hand-duplicated in three places, a future edit to any
 * one of them (adding a wave type, renaming one, or fixing a typo) can
 * silently desync the other two. This test extracts each source's token set
 * at run time -- it does not hardcode all three independently -- and asserts:
 *
 *   1. teams.md's 9 Wave Types table values, as a SET, equal
 *      per-wave-emission.md:24's enum values, as a SET.
 *   2. per-wave-decomposition.md:26 is BYTE-FOR-BYTE identical to
 *      per-wave-emission.md:24 (not just set-equal) -- mirrors the existing
 *      teams.md-vs-executor-resources collision guard pattern in
 *      tests/v12/wave-execution-style-collision-guard.test.js, applied here
 *      to the emission-doc / decomposition-doc pair instead.
 *
 * If this test fails, one of the three sources drifted: either a wave type
 * was added/removed/renamed in only one place, or the two doc-embedded enum
 * lines (which are meant to be exact duplicates) diverged.
 *
 * Bug-driven testing mandate: this test would have caught a regression where
 * TASK-11's vertical-slice mirror into per-wave-decomposition.md landed with
 * a typo, a missing value, or a value ordered/spelled differently from its
 * per-wave-emission.md source.
 *
 * Could have caught by: unit test extracting all three enum sources via
 * regex and asserting set-equality (teams.md vs per-wave-emission.md) plus
 * byte-identity (per-wave-emission.md vs per-wave-decomposition.md).
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const TEAMS_MD = path.join(REPO_ROOT, '.claude', 'rules', 'core', 'teams.md');
const PER_WAVE_EMISSION = path.join(REPO_ROOT, 'agents', 'planner', 'resources', 'per-wave-emission.md');
const PER_WAVE_DECOMP = path.join(REPO_ROOT, '.claude', 'skills', 'team', 'reference', 'per-wave-decomposition.md');

function readFile(absPath) {
  return fs.readFileSync(absPath, 'utf8');
}

/**
 * Extracts the 9 backtick-quoted `Type` column values from teams.md's
 * "Wave Types" table, as a Set. Does not hardcode the value list -- it reads
 * whatever table rows are actually on disk.
 */
function extractTeamsMdWaveTypes(content) {
  const sectionMatch = content.match(
    /###\s+Wave Types\n\n\|[^\n]*\|\n\|[-\s|]+\|\n((?:\|.*\|\n?)+)/
  );
  if (!sectionMatch) {
    throw new Error('Could not locate the "Wave Types" table in teams.md');
  }
  const tableBody = sectionMatch[1];
  const rows = tableBody
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.length > 0);

  const values = rows.map((row) => {
    const cellMatch = row.match(/^\|\s*`([^`]+)`\s*\|/);
    if (!cellMatch) {
      throw new Error(`Could not extract a backtick-quoted Type value from row: ${row}`);
    }
    return cellMatch[1];
  });

  return { values, rowCount: rows.length };
}

/**
 * Extracts the pipe-delimited `type: a | b | c ...` enum line from a
 * work_meta.yaml schema example, as a Set. Returns both the raw line (for
 * byte-identity comparison) and the parsed value set.
 */
function extractTypeEnumLine(content, lineNumber) {
  const lines = content.split('\n');
  const rawLine = lines[lineNumber - 1]; // lineNumber is 1-indexed
  if (rawLine === undefined) {
    throw new Error(`File has fewer than ${lineNumber} lines`);
  }

  const enumMatch = rawLine.match(/type:\s*(.+)$/);
  if (!enumMatch) {
    throw new Error(`Line ${lineNumber} does not match the expected "type: a | b | c" shape: ${rawLine}`);
  }

  const values = enumMatch[1].split('|').map((v) => v.trim());

  return { rawLine, values };
}

describe('TASK-07: wave-type enum consistency across teams.md, per-wave-emission.md, per-wave-decomposition.md', () => {
  describe('source files exist', () => {
    it('.claude/rules/core/teams.md exists', () => {
      expect(fs.existsSync(TEAMS_MD)).toBe(true);
    });

    it('agents/planner/resources/per-wave-emission.md exists', () => {
      expect(fs.existsSync(PER_WAVE_EMISSION)).toBe(true);
    });

    it('.claude/skills/team/reference/per-wave-decomposition.md exists', () => {
      expect(fs.existsSync(PER_WAVE_DECOMP)).toBe(true);
    });
  });

  describe('teams.md Wave Types table vs per-wave-emission.md:24 enum -- set equality', () => {
    it('teams.md Wave Types table has exactly 9 rows', () => {
      const content = readFile(TEAMS_MD);
      const { rowCount } = extractTeamsMdWaveTypes(content);
      expect(rowCount).toBe(9);
    });

    it('per-wave-emission.md:24 enum has exactly 9 values', () => {
      const content = readFile(PER_WAVE_EMISSION);
      const { values } = extractTypeEnumLine(content, 24);
      expect(values.length).toBe(9);
    });

    it('the two value sets are identical (same 9 values, order-independent)', () => {
      const teamsContent = readFile(TEAMS_MD);
      const emissionContent = readFile(PER_WAVE_EMISSION);

      const { values: teamsValues } = extractTeamsMdWaveTypes(teamsContent);
      const { values: emissionValues } = extractTypeEnumLine(emissionContent, 24);

      const teamsSet = new Set(teamsValues);
      const emissionSet = new Set(emissionValues);

      // Set equality: same size, and every teams.md value is present in the
      // emission enum (and vice versa, guaranteed by equal size + subset).
      expect(teamsSet.size).toBe(emissionSet.size);
      for (const value of teamsSet) {
        expect(emissionSet.has(value)).toBe(true);
      }
      for (const value of emissionSet) {
        expect(teamsSet.has(value)).toBe(true);
      }
    });

    it('the shared 9-value set is exactly the canonical wave-type taxonomy', () => {
      const teamsContent = readFile(TEAMS_MD);
      const { values: teamsValues } = extractTeamsMdWaveTypes(teamsContent);

      const expected = new Set([
        'bootstrap',
        'research',
        'design',
        'implementation',
        'supporting',
        'testing',
        'documentation',
        'integration',
        'vertical-slice',
      ]);

      expect(new Set(teamsValues)).toEqual(expected);
    });
  });

  describe('per-wave-emission.md:24 vs per-wave-decomposition.md:26 -- byte identity', () => {
    it('per-wave-decomposition.md:26 is byte-for-byte identical to per-wave-emission.md:24', () => {
      const emissionContent = readFile(PER_WAVE_EMISSION);
      const decompContent = readFile(PER_WAVE_DECOMP);

      const { rawLine: emissionLine } = extractTypeEnumLine(emissionContent, 24);
      const { rawLine: decompLine } = extractTypeEnumLine(decompContent, 26);

      expect(decompLine).toBe(emissionLine);
    });

    it('per-wave-decomposition.md:26 enum values equal per-wave-emission.md:24 enum values (set check, belt-and-braces)', () => {
      const emissionContent = readFile(PER_WAVE_EMISSION);
      const decompContent = readFile(PER_WAVE_DECOMP);

      const { values: emissionValues } = extractTypeEnumLine(emissionContent, 24);
      const { values: decompValues } = extractTypeEnumLine(decompContent, 26);

      expect(new Set(decompValues)).toEqual(new Set(emissionValues));
    });
  });
});
