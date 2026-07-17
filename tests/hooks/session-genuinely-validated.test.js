/**
 * Unit tests for hook-utils.cjs `sessionGenuinelyValidated()` — the shared
 * honesty discriminator introduced in v12.47.0 (Phase 2, REC-02/03/06) and
 * tightened in v12.47.1 (reviewer LOW finding: a `failed`/`aborted`
 * coordination_log must NOT count toward "genuinely validated").
 *
 * These are white-box tests that build minimal on-disk session shapes in a
 * tmpdir and call the exported function directly, so the three genuine-validation
 * conditions (success terminal + real non-safety-net PASS report + — for
 * plan-bearing sessions — a successfully-completed coordination_log) are each
 * pinned independently.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { sessionGenuinelyValidated } from '../../.claude/hooks/hook-utils.cjs';

let root;
let dir;

/** Write a file under the session's workflow/ dir (or root for status.yaml). */
function put(rel, content) {
  const full = join(dir, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}

const REAL_PASS_REPORT = [
  'schema_version: "1"',
  'overall_status: PASS',
  'classification: PASS',
  'generated_by: cagents:validator',
  '',
].join('\n');

const COMPLETED_COORD_LOG = [
  'schema_version: "1"',
  'controller: cagents:tech-lead',
  'status: completed',
  '',
].join('\n');

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'genuine-validated-'));
  dir = join(root, 'run_fixture_260717_001');
  mkdirSync(join(dir, 'workflow'), { recursive: true });
});

afterEach(() => {
  try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ }
});

describe('sessionGenuinelyValidated()', () => {
  it('TRUE — success terminal + real PASS report + completed coordination_log (plan-bearing)', () => {
    put('status.yaml', 'pipeline_state: VALIDATED\n');
    put('workflow/plan.yaml', 'plan_id: x\nmission: "m"\n');
    put('workflow/validation_report.yaml', REAL_PASS_REPORT);
    put('workflow/coordination_log.yaml', COMPLETED_COORD_LOG);
    expect(sessionGenuinelyValidated(dir)).toBe(true);
  });

  it('TRUE — no plan.yaml skips the coordination_log requirement', () => {
    put('status.yaml', 'pipeline_state: complete\n');
    put('workflow/validation_report.yaml', REAL_PASS_REPORT);
    expect(sessionGenuinelyValidated(dir)).toBe(true);
  });

  it('FALSE — non-success terminal (INIT stall) even with a PASS report', () => {
    put('status.yaml', 'pipeline_state: INIT\n');
    put('workflow/validation_report.yaml', REAL_PASS_REPORT);
    expect(sessionGenuinelyValidated(dir)).toBe(false);
  });

  it('FALSE — `incomplete` terminal is not a success terminal', () => {
    put('status.yaml', 'pipeline_state: incomplete\n');
    put('workflow/validation_report.yaml', REAL_PASS_REPORT);
    expect(sessionGenuinelyValidated(dir)).toBe(false);
  });

  it('FALSE — hook-fabricated safety-net PASS stub is rejected', () => {
    put('status.yaml', 'pipeline_state: VALIDATED\n');
    put('workflow/validation_report.yaml', [
      'overall_status: PASS',
      'status: PASS',
      'generated_by: verify-completion-hook-safety-net',
      '',
    ].join('\n'));
    expect(sessionGenuinelyValidated(dir)).toBe(false);
  });

  it('FALSE — missing validation_report (no verdict ⇒ not genuine)', () => {
    put('status.yaml', 'pipeline_state: VALIDATED\n');
    expect(sessionGenuinelyValidated(dir)).toBe(false);
  });

  it('ACCEPTS a marker-less genuine PASS (preserves the clean-session contract)', () => {
    put('status.yaml', 'pipeline_state: complete\n');
    put('workflow/validation_report.yaml', 'overall_status: PASS\nstatus: PASS\n');
    expect(sessionGenuinelyValidated(dir)).toBe(true);
  });

  // v12.47.1 precision fix (reviewer LOW finding): a plan-bearing session whose
  // coordination_log recorded a terminal FAILURE must NOT be deemed genuine even
  // if status.yaml + the report look successful.
  it('FALSE — plan-bearing session with a `failed` coordination_log (v12.47.1)', () => {
    put('status.yaml', 'pipeline_state: VALIDATED\n');
    put('workflow/plan.yaml', 'plan_id: x\nmission: "m"\n');
    put('workflow/validation_report.yaml', REAL_PASS_REPORT);
    put('workflow/coordination_log.yaml', 'status: failed\n');
    expect(sessionGenuinelyValidated(dir)).toBe(false);
  });

  it('FALSE — plan-bearing session with an in-progress coordination_log', () => {
    put('status.yaml', 'pipeline_state: complete\n');
    put('workflow/plan.yaml', 'plan_id: x\nmission: "m"\n');
    put('workflow/validation_report.yaml', REAL_PASS_REPORT);
    put('workflow/coordination_log.yaml', 'status: in_progress\n');
    expect(sessionGenuinelyValidated(dir)).toBe(false);
  });

  it('FALSE — null/absent session dir (fail toward "not genuine")', () => {
    expect(sessionGenuinelyValidated(null)).toBe(false);
    expect(sessionGenuinelyValidated(join(root, 'does-not-exist'))).toBe(false);
  });
});
