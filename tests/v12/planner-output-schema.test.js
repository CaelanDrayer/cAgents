/**
 * LP-28 — Planner output schema validator (Check 0).
 *
 * Locks in these contract assertions:
 *
 *   1. scripts/ci/validate-planner-output.cjs exists and is executable as a Node script.
 *   2. A malformed `plan.yaml` (missing `controller_assignment.primary`) makes
 *      the validator FAIL (non-zero exit, error mentioning the missing field).
 *   3. A malformed `work_items.yaml` (missing `acceptance_criteria` on any item)
 *      makes the validator FAIL.
 *   4. A valid pair (`plan.yaml` + `work_items.yaml`) makes the validator PASS
 *      (exit 0).
 *   5. `.claude/rules/core/resources/controller-validation-checklist.md` contains
 *      "Check 0" placed BEFORE "Check 1" and updates the heading to mention 7 checks.
 *
 * History:
 *   - v12.7.x LP-28: initial planner-output schema validator contract.
 */
import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const VALIDATOR = path.join(REPO_ROOT, 'scripts', 'ci', 'validate-planner-output.cjs');
const CHECKLIST = path.join(REPO_ROOT, '.claude', 'rules', 'core', 'resources', 'controller-validation-checklist.md');

const VALID_PLAN = `plan_id: plan_test_001
tier: 3
domain: engineering
mission: "Test the planner output schema validator end-to-end"
objectives:
  - id: OBJ-1
    description: "Validator emits PASS on well-formed inputs"
controller_assignment:
  primary: cagents:tech-lead
success_criteria:
  - "Validator returns exit 0 for a complete plan"
`;

const VALID_WORK_ITEMS = `schema_version: "1"
work_items:
  - id: WI-1
    title: "Demonstrate valid acceptance criteria"
    assigned_to: cagents:backend-developer
    acceptance_criteria:
      - "Validator exits 0 when criteria are present"
`;

const PLAN_MISSING_CONTROLLER = `plan_id: plan_test_002
tier: 3
domain: engineering
mission: "Plan missing controller_assignment.primary should fail Check 0"
objectives:
  - id: OBJ-1
    description: "Force the missing-controller failure path"
success_criteria:
  - "Validator detects missing controller_assignment.primary"
`;

const WORK_ITEMS_MISSING_AC = `schema_version: "1"
work_items:
  - id: WI-1
    title: "Item without acceptance criteria"
    assigned_to: cagents:backend-developer
`;

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'planner-output-schema-'));
}

function runValidator(planDir) {
  try {
    const stdout = execFileSync(
      process.execPath,
      [VALIDATOR, '--plan', path.join(planDir, 'plan.yaml'), '--work-items', path.join(planDir, 'work_items.yaml')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    return { exitCode: 0, stdout, stderr: '' };
  } catch (err) {
    return {
      exitCode: err.status ?? 1,
      stdout: (err.stdout || '').toString(),
      stderr: (err.stderr || '').toString(),
    };
  }
}

describe('LP-28: planner-output schema validator (Pre-Execution Check 0)', () => {
  let tmpDirs = [];

  afterAll(() => {
    for (const dir of tmpDirs) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
    }
  });

  it('Assertion 1: scripts/ci/validate-planner-output.cjs exists', () => {
    expect(fs.existsSync(VALIDATOR)).toBe(true);
  });

  it('Assertion 2: malformed plan.yaml (missing controller_assignment.primary) fails Check 0', () => {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    fs.writeFileSync(path.join(dir, 'plan.yaml'), PLAN_MISSING_CONTROLLER);
    fs.writeFileSync(path.join(dir, 'work_items.yaml'), VALID_WORK_ITEMS);
    const result = runValidator(dir);
    expect(result.exitCode).not.toBe(0);
    const output = result.stdout + result.stderr;
    expect(output.toLowerCase()).toMatch(/controller_assignment|primary/);
  });

  it('Assertion 3: malformed work_items.yaml (missing acceptance_criteria) fails Check 0', () => {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    fs.writeFileSync(path.join(dir, 'plan.yaml'), VALID_PLAN);
    fs.writeFileSync(path.join(dir, 'work_items.yaml'), WORK_ITEMS_MISSING_AC);
    const result = runValidator(dir);
    expect(result.exitCode).not.toBe(0);
    const output = result.stdout + result.stderr;
    expect(output.toLowerCase()).toMatch(/acceptance_criteria/);
  });

  it('Assertion 4: valid plan.yaml + work_items.yaml passes Check 0', () => {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    fs.writeFileSync(path.join(dir, 'plan.yaml'), VALID_PLAN);
    fs.writeFileSync(path.join(dir, 'work_items.yaml'), VALID_WORK_ITEMS);
    const result = runValidator(dir);
    expect(result.exitCode).toBe(0);
  });

  it('Assertion 5: controller-validation-checklist.md inserts Check 0 BEFORE Check 1 and updates count to 7', () => {
    expect(fs.existsSync(CHECKLIST)).toBe(true);
    const md = fs.readFileSync(CHECKLIST, 'utf8');

    // Heading updated from 6 → 7 checks
    expect(md).toMatch(/Pre-Execution Validation Checklist \(7 checks\)/);

    // Check 0 exists and appears before Check 1
    const check0Idx = md.indexOf('### Check 0:');
    const check1Idx = md.indexOf('### Check 1:');
    expect(check0Idx).toBeGreaterThan(-1);
    expect(check1Idx).toBeGreaterThan(-1);
    expect(check0Idx).toBeLessThan(check1Idx);

    // Check 0 references the validator script
    const check0Block = md.slice(check0Idx, check1Idx);
    expect(check0Block).toMatch(/validate-planner-output\.cjs/);
  });
});
