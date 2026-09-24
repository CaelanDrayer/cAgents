/**
 * TASK-28 — vertical_slice / tags additive-schema regression fixture.
 *
 * This locks in one contract assertion. The planner-output validator
 * (`scripts/ci/validate-planner-output.cjs`) has a required-field contract.
 * That contract does not read `vertical_slice` or `tags` in any form. See
 * `validatePlan()` (lines 100-153) and `validateWorkItems()` (lines 155-206)
 * in the validator script for the full required-field list.
 *
 * The fixture pair under `tests/fixtures/vertical-slice/` adds both fields.
 * `plan.yaml` adds a `decomposition.vertical_slice` block. `work_items.yaml`
 * adds a `tags: [vertical-slice]` entry on every item. Both files still
 * satisfy the required-field contract, so the validator must PASS on them.
 *
 * A future change that makes `vertical_slice` or `tags` required, or that
 * rejects an unknown field, will turn this test RED. That is the signal this
 * regression test exists to catch.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const VALIDATOR = path.join(REPO_ROOT, 'scripts', 'ci', 'validate-planner-output.cjs');
const FIXTURE_DIR = path.join(REPO_ROOT, 'tests', 'fixtures', 'vertical-slice');
const PLAN = path.join(FIXTURE_DIR, 'plan.yaml');
const WORK_ITEMS = path.join(FIXTURE_DIR, 'work_items.yaml');

function runValidator() {
  try {
    const stdout = execFileSync(
      process.execPath,
      [VALIDATOR, '--plan', PLAN, '--work-items', WORK_ITEMS],
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

describe('TASK-28: vertical_slice / tags additive-schema fixture', () => {
  it('the fixture pair exists on disk', () => {
    expect(fs.existsSync(PLAN)).toBe(true);
    expect(fs.existsSync(WORK_ITEMS)).toBe(true);
  });

  it('plan.yaml carries decomposition.vertical_slice alongside the required fields', () => {
    const raw = fs.readFileSync(PLAN, 'utf8');
    expect(raw).toMatch(/vertical_slice:/);
    expect(raw).toMatch(/work_item_ids:/);
    expect(raw).toMatch(/categories_covered:/);
  });

  it('work_items.yaml carries tags: [vertical-slice] on every item', () => {
    const raw = fs.readFileSync(WORK_ITEMS, 'utf8');
    const tagMatches = raw.match(/tags:/g) || [];
    // Two work items in the fixture, so two `tags:` keys are present.
    expect(tagMatches.length).toBe(2);
    expect(raw).toMatch(/vertical-slice/);
  });

  it('the validator passes (exit 0) on the vertical-slice fixture pair', () => {
    const result = runValidator();
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Planner output schema OK/);
  });
});
