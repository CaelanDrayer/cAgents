/**
 * TASK-05 regression test: wave.type / wave.execution_style collision guard.
 *
 * TASK-03 renamed the conditional-execution field checked in the wave
 * executor resources from `wave.type` to `wave.execution_style`, because
 * `wave.type` collides with a DIFFERENT, pre-existing field: the planner's
 * own wave content-type taxonomy documented in the "Wave Types" table in
 * `.claude/rules/core/teams.md` (values like `bootstrap`, `research`,
 * `vertical-slice`, etc.). That table's field is still legitimately named
 * `wave.type` conceptually and must NOT be touched by the rename.
 *
 * This test asserts:
 *   1. Zero `wave.type ==` occurrences in the 3 files TASK-03 renamed:
 *      - agents/team-bootstrap/resources/wave-execution.md
 *      - agents/team-bootstrap/resources/template-selection.md
 *      - agents/team-lead/resources/wave-execution.md
 *   2. `wave.execution_style ==` appears in those same 3 files, with an
 *      exact total count of 6 (tighter guard than a bare non-zero check).
 *   3. `.claude/rules/core/teams.md`'s "Wave Types" table still exists,
 *      still has 9 rows, and none of its row values were renamed to
 *      `execution_style` -- it is a different field and must survive the
 *      TASK-03 rename unrenamed.
 *
 * If this test fails, either the rename regressed (wave.type == crept back
 * in, or the execution_style count changed) or the Wave Types table in
 * teams.md was incorrectly touched by a search-and-replace that should have
 * been scoped to the executor resource files only.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const RENAMED_FILES = [
  'agents/team-bootstrap/resources/wave-execution.md',
  'agents/team-bootstrap/resources/template-selection.md',
  'agents/team-lead/resources/wave-execution.md',
];

// Expected per-file counts of `wave.execution_style ==`, summing to 6.
const EXPECTED_EXECUTION_STYLE_COUNTS = {
  'agents/team-bootstrap/resources/wave-execution.md': 3,
  'agents/team-bootstrap/resources/template-selection.md': 1,
  'agents/team-lead/resources/wave-execution.md': 2,
};

const TEAMS_MD = '.claude/rules/core/teams.md';

// The 9 canonical Wave Types table rows (Type column values), unrenamed.
const EXPECTED_WAVE_TYPE_VALUES = [
  'bootstrap',
  'research',
  'design',
  'implementation',
  'supporting',
  'testing',
  'documentation',
  'integration',
  'vertical-slice',
];

function readRepoFile(relPath) {
  const abs = path.join(REPO_ROOT, relPath);
  return fs.readFileSync(abs, 'utf8');
}

function countOccurrences(content, regex) {
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}

describe('TASK-05: wave.type / wave.execution_style collision guard', () => {
  describe('wave.type == is fully removed from the renamed executor resources', () => {
    for (const relPath of RENAMED_FILES) {
      it(`has zero "wave.type ==" occurrences in ${relPath}`, () => {
        const content = readRepoFile(relPath);
        // Match both literal spacing variants: "wave.type ==" and
        // "wave.type==", tolerant of surrounding whitespace.
        const count = countOccurrences(content, /wave\.type\s*==/g);
        expect(count).toBe(0);
      });
    }
  });

  describe('wave.execution_style == is present in the renamed executor resources', () => {
    for (const relPath of RENAMED_FILES) {
      it(`has the expected "wave.execution_style ==" count in ${relPath}`, () => {
        const content = readRepoFile(relPath);
        const count = countOccurrences(content, /wave\.execution_style\s*==/g);
        expect(count).toBe(EXPECTED_EXECUTION_STYLE_COUNTS[relPath]);
      });
    }

    it('totals exactly 6 occurrences across all 3 renamed files', () => {
      const total = RENAMED_FILES.reduce((sum, relPath) => {
        const content = readRepoFile(relPath);
        return sum + countOccurrences(content, /wave\.execution_style\s*==/g);
      }, 0);
      expect(total).toBe(6);
    });
  });

  describe('teams.md Wave Types table is untouched by the rename', () => {
    it('still contains a "Wave Types" section with a Type column table', () => {
      const content = readRepoFile(TEAMS_MD);
      expect(content).toMatch(/###\s+Wave Types/);
      expect(content).toMatch(/\|\s*Type\s*\|\s*Executor\s*\|\s*Description\s*\|/);
    });

    it('still has exactly 9 data rows in the Wave Types table', () => {
      const content = readRepoFile(TEAMS_MD);
      const sectionMatch = content.match(
        /###\s+Wave Types\n\n\|[^\n]*\|\n\|[-\s|]+\|\n((?:\|.*\|\n?)+)/
      );
      expect(sectionMatch).not.toBeNull();
      const rows = sectionMatch[1]
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('|') && line.length > 0);
      expect(rows.length).toBe(9);
    });

    it('still lists all 9 canonical Type values, backtick-quoted, unrenamed', () => {
      const content = readRepoFile(TEAMS_MD);
      const sectionMatch = content.match(
        /###\s+Wave Types\n\n\|[^\n]*\|\n\|[-\s|]+\|\n((?:\|.*\|\n?)+)/
      );
      expect(sectionMatch).not.toBeNull();
      const tableBody = sectionMatch[1];

      for (const value of EXPECTED_WAVE_TYPE_VALUES) {
        const cellPattern = new RegExp('\\|\\s*`' + value + '`\\s*\\|');
        expect(tableBody).toMatch(cellPattern);
      }
    });

    it('never renamed a Wave Types table value to `execution_style`', () => {
      const content = readRepoFile(TEAMS_MD);
      const sectionMatch = content.match(
        /###\s+Wave Types\n\n\|[^\n]*\|\n\|[-\s|]+\|\n((?:\|.*\|\n?)+)/
      );
      expect(sectionMatch).not.toBeNull();
      const tableBody = sectionMatch[1];

      expect(tableBody).not.toMatch(/execution_style/);
    });

    it('does not use `wave.type ==` conditional syntax itself (it is a table, not code)', () => {
      // Sanity check: teams.md's table is descriptive prose/markdown, not
      // conditional pseudocode, so it should never contain the collision
      // string either. This guards against a future edit accidentally
      // turning the table into executable-looking pseudocode that reuses
      // the ambiguous field name.
      const content = readRepoFile(TEAMS_MD);
      const count = countOccurrences(content, /wave\.type\s*==/g);
      expect(count).toBe(0);
    });
  });
});
