/**
 * TASK-18 regression test: the shared checkpoint clause stays identical.
 *
 * `.claude/rules/core/controllers.md` and
 * `.claude/rules/core/resources/controller-validation-checklist.md` each
 * state the dual-trigger mid-execution checkpoint rule. The lead-in phrasing
 * differs on purpose. controllers.md starts with "Mid-Execution (5 checks):
 * run these after every 3...". The checklist starts with "The controller
 * runs these checks after every 3...".
 *
 * The TRAILING clause, from "after every 3 completed work items" through
 * the end of the line, must stay byte-identical in both files. This test
 * reads both files, extracts that trailing clause from the known line
 * numbers, and asserts an exact match. It also asserts the extracted clause
 * itself still names both triggers, so a coordinated drift in both files
 * cannot hide from this test.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const CONTROLLERS_MD = path.join(
  REPO_ROOT,
  '.claude/rules/core/controllers.md'
);
const CHECKLIST_MD = path.join(
  REPO_ROOT,
  '.claude/rules/core/resources/controller-validation-checklist.md'
);

const CONTROLLERS_MD_LINE = 592;
const CHECKLIST_MD_LINE = 147;

const CLAUSE_ANCHOR = 'after every 3 completed work items';

/**
 * Reads a file's line and returns one specific line, one-indexed.
 *
 * @param {string} filePath - absolute path to the file.
 * @param {number} lineNumber - one-indexed line number to return.
 * @returns {string} the line's text, without the trailing newline.
 */
function readLine(filePath, lineNumber) {
  const contents = readFileSync(filePath, 'utf8');
  const lines = contents.split('\n');
  return lines[lineNumber - 1];
}

/**
 * Extracts the shared trailing clause from a line: the substring that
 * starts at CLAUSE_ANCHOR and runs through the end of the line.
 *
 * @param {string} line - the full line's text.
 * @returns {string} the trailing clause.
 */
function extractClause(line) {
  const anchorIndex = line.indexOf(CLAUSE_ANCHOR);
  if (anchorIndex === -1) {
    throw new Error(
      `Anchor "${CLAUSE_ANCHOR}" not found in line: ${JSON.stringify(line)}`
    );
  }
  return line.slice(anchorIndex);
}

describe('controller checkpoint clause: controllers.md and controller-validation-checklist.md stay in sync', () => {
  it('extracts a non-empty trailing clause from each file at the assigned line', () => {
    const controllersLine = readLine(CONTROLLERS_MD, CONTROLLERS_MD_LINE);
    const checklistLine = readLine(CHECKLIST_MD, CHECKLIST_MD_LINE);

    expect(controllersLine).toBeTruthy();
    expect(checklistLine).toBeTruthy();

    const controllersClause = extractClause(controllersLine);
    const checklistClause = extractClause(checklistLine);

    expect(controllersClause.length).toBeGreaterThan(0);
    expect(checklistClause.length).toBeGreaterThan(0);
  });

  it('the two trailing clauses are byte-identical', () => {
    const controllersLine = readLine(CONTROLLERS_MD, CONTROLLERS_MD_LINE);
    const checklistLine = readLine(CHECKLIST_MD, CHECKLIST_MD_LINE);

    const controllersClause = extractClause(controllersLine);
    const checklistClause = extractClause(checklistLine);

    expect(controllersClause).toBe(checklistClause);
  });

  it('the shared clause still names both triggers of the dual-trigger design', () => {
    const controllersLine = readLine(CONTROLLERS_MD, CONTROLLERS_MD_LINE);
    const clause = extractClause(controllersLine);

    expect(clause).toContain('vertical-slice-tagged item completes');
    expect(clause).toContain('bounded reviewer loop resolves');
  });
});
