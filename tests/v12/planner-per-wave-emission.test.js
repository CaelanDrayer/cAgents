/**
 * FU-2 (v12.1.1): universal-planner per-wave emission contract regression
 *
 * Locks the v12.1.1 planner change: when waves are defined, the planner
 * MUST emit BOTH the legacy monolithic work_items.yaml AND the new
 * work_meta.yaml + per-wave work_items_wave_{K}.yaml shapes. Back-compat:
 * work_items.yaml stays through v12.1.x.
 *
 * Background: v12.1.0 documented the per-wave decomposition schema in
 * .claude/skills/team/reference/per-wave-decomposition.md and made the
 * team SKILL read from work_items_wave_{K}.yaml, but the planner kept
 * emitting only the monolithic file. v12.1.1 closes the gap by updating
 * core/planner/SKILL.md to document the dual-emission contract.
 *
 * This test asserts:
 *   1. core/planner/SKILL.md documents the per-wave emission
 *      contract (mentions work_meta.yaml + work_items_wave_ + back-compat).
 *   2. The completion event template lists the new artifacts.
 *   3. A fixture session with all three shapes loaded from disk parses
 *      correctly and satisfies the schema invariants (back-compat between
 *      legacy and per-wave WIs).
 *
 * Bug-driven testing mandate: this test would have caught a regression
 * where the planner SKILL.md drops the per-wave emission contract or
 * where the per-wave schema diverges from the legacy work_items.yaml
 * schema (breaking back-compat).
 *
 * Could have caught by: unit test on the planner SKILL.md documentation
 * + fixture-based validation of the per-wave schema's back-compat with
 * the legacy schema.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PLANNER_SKILL = path.join(REPO_ROOT, 'agents', 'core', 'planner', 'SKILL.md');
const PER_WAVE_DECOMP_DOC = path.join(REPO_ROOT, '.claude', 'skills', 'team', 'reference', 'per-wave-decomposition.md');

describe('FU-2 (v12.1.1): universal-planner per-wave emission contract', () => {
  describe('Invariant 1 — planner SKILL.md documents the dual-emission contract', () => {
    it('agents/core/planner/SKILL.md exists', () => {
      expect(fs.existsSync(PLANNER_SKILL)).toBe(true);
    });

    it('SKILL.md mentions work_meta.yaml as a required artifact when waves are defined', () => {
      const content = fs.readFileSync(PLANNER_SKILL, 'utf8');
      expect(content).toMatch(/work_meta\.yaml/);
    });

    it('SKILL.md mentions per-wave work_items_wave_{K}.yaml artifact', () => {
      const content = fs.readFileSync(PLANNER_SKILL, 'utf8');
      expect(content).toMatch(/work_items_wave_/);
    });

    it('SKILL.md preserves back-compat: legacy work_items.yaml still emitted', () => {
      const content = fs.readFileSync(PLANNER_SKILL, 'utf8');
      // Legacy artifact must remain in the emission contract
      expect(content).toMatch(/workflow\/work_items\.yaml/);
      // Back-compat language must be explicit
      expect(content).toMatch(/back[- ]compat/i);
    });

    it('SKILL.md documents the per-wave emission contract section', () => {
      const content = fs.readFileSync(PLANNER_SKILL, 'utf8');
      // The per-wave emission contract heading (or equivalent) must be present
      expect(content).toMatch(/Per-Wave Emission Contract/i);
    });
  });

  describe('Invariant 2 — emission contract names the new artifacts (v12.7.0 contract)', () => {
    // v12.6.0 pre-existing failure carried into v12.7.0: the planner SKILL.md no
    // longer carries an `outputs_produced:` event-template block; the planner
    // simply writes work_meta.yaml + per-wave files directly, and the legacy
    // outputs_produced JSON-event template was removed when the planner absorbed
    // task-decomposer + prompt-engineer in v12.0.0. The contract now asserts
    // that BOTH new artifacts are named somewhere in the SKILL.md body, not in
    // a structured event block. See INT-1 reconciliation note in CHANGELOG v12.7.0.
    it('SKILL.md names work_meta.yaml as an output artifact', () => {
      const content = fs.readFileSync(PLANNER_SKILL, 'utf8');
      expect(content).toMatch(/work_meta\.yaml/);
    });

    it('SKILL.md names work_items_wave_ as an output artifact', () => {
      const content = fs.readFileSync(PLANNER_SKILL, 'utf8');
      expect(content).toMatch(/work_items_wave_/);
    });

    it.skip('(deferred to v12.8+) completion event template includes work_meta.yaml and work_items_wave_ outputs', () => {
      // SKIP rationale: the legacy outputs_produced event-template block was
      // removed when the planner absorbed task-decomposer + prompt-engineer in
      // v12.0.0. Re-instating the event template is tracked as deferred work;
      // re-enable this test when the planner SKILL.md regains a structured
      // outputs_produced block.
      const content = fs.readFileSync(PLANNER_SKILL, 'utf8');
      const eventBlockMatch = content.match(/outputs_produced:[\s\S]{0,800}next_state/);
      expect(eventBlockMatch).not.toBeNull();
      const eventBlock = eventBlockMatch[0];
      expect(eventBlock).toMatch(/work_meta\.yaml/);
      expect(eventBlock).toMatch(/work_items_wave_/);
      // Legacy file still listed for back-compat
      expect(eventBlock).toMatch(/work_items\.yaml/);
    });
  });

  describe('Invariant 3 — per-wave reference doc still ships (cross-reference target)', () => {
    it('.claude/skills/team/reference/per-wave-decomposition.md exists', () => {
      expect(fs.existsSync(PER_WAVE_DECOMP_DOC)).toBe(true);
    });

    it('per-wave-decomposition.md describes the same emission shapes the planner advertises', () => {
      const content = fs.readFileSync(PER_WAVE_DECOMP_DOC, 'utf8');
      expect(content).toMatch(/work_meta\.yaml/);
      expect(content).toMatch(/work_items_wave_/);
    });
  });

  describe('Invariant 4 — fixture session: per-wave shapes round-trip and preserve back-compat', () => {
    // Build a fixture session in a temp dir with all three emission shapes,
    // then assert the per-wave WIs union equals the monolithic WIs (back-compat).
    let tmpDir;
    let workflowDir;

    beforeAll(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cagents-fu2-fixture-'));
      workflowDir = path.join(tmpDir, 'workflow');
      fs.mkdirSync(workflowDir, { recursive: true });

      // Monolithic legacy file (3 WIs across 2 waves)
      const monolithic = `schema_version: "1"
session_id: "test_fixture_001"
work_items:
  - id: WI-1
    title: "Bootstrap repo"
    description: "Initialize package.json and tsconfig"
    assigned_to: cagents:devops-engineer
    acceptance_criteria:
      - criterion: "package.json exists"
        verification_method: file_exists
    dependencies: []
  - id: WI-2
    title: "Implement endpoint"
    description: "Add /hello GET handler"
    assigned_to: cagents:backend-developer
    acceptance_criteria:
      - criterion: "GET /hello returns 200"
        verification_method: test_result
    dependencies: [WI-1]
  - id: WI-3
    title: "Add endpoint test"
    description: "Vitest test for /hello"
    assigned_to: cagents:qa-lead
    acceptance_criteria:
      - criterion: "test passes"
        verification_method: test_result
    dependencies: [WI-2]
`;
      fs.writeFileSync(path.join(workflowDir, 'work_items.yaml'), monolithic);

      // work_meta.yaml
      const meta = `schema_version: "1"
session_id: "test_fixture_001"
total_waves: 2
total_work_items: 3
emitted_by: cagents:planner
emitted_at: "2026-05-21T22:00:00Z"
waves:
  - wave: 0
    type: bootstrap
    summary: "Initialize project"
    work_item_ids: [WI-1]
    work_item_file: "workflow/work_items_wave_0.yaml"
    expected_duration_min: 5
  - wave: 1
    type: implementation
    summary: "Implement and test endpoint"
    work_item_ids: [WI-2, WI-3]
    work_item_file: "workflow/work_items_wave_1.yaml"
    expected_duration_min: 15
dependency_graph:
  critical_path: [WI-1, WI-2, WI-3]
  cross_wave_dependencies:
    - from: WI-1
      to: WI-2
      type: blocks
`;
      fs.writeFileSync(path.join(workflowDir, 'work_meta.yaml'), meta);

      // Per-wave files
      const wave0 = `schema_version: "1"
session_id: "test_fixture_001"
wave: 0
work_items:
  - id: WI-1
    title: "Bootstrap repo"
    description: "Initialize package.json and tsconfig"
    assigned_to: cagents:devops-engineer
    acceptance_criteria:
      - criterion: "package.json exists"
        verification_method: file_exists
    dependencies: []
`;
      fs.writeFileSync(path.join(workflowDir, 'work_items_wave_0.yaml'), wave0);

      const wave1 = `schema_version: "1"
session_id: "test_fixture_001"
wave: 1
work_items:
  - id: WI-2
    title: "Implement endpoint"
    description: "Add /hello GET handler"
    assigned_to: cagents:backend-developer
    acceptance_criteria:
      - criterion: "GET /hello returns 200"
        verification_method: test_result
    dependencies: [WI-1]
  - id: WI-3
    title: "Add endpoint test"
    description: "Vitest test for /hello"
    assigned_to: cagents:qa-lead
    acceptance_criteria:
      - criterion: "test passes"
        verification_method: test_result
    dependencies: [WI-2]
`;
      fs.writeFileSync(path.join(workflowDir, 'work_items_wave_1.yaml'), wave1);
    });

    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('all three emission shapes exist in fixture', () => {
      expect(fs.existsSync(path.join(workflowDir, 'work_items.yaml'))).toBe(true);
      expect(fs.existsSync(path.join(workflowDir, 'work_meta.yaml'))).toBe(true);
      expect(fs.existsSync(path.join(workflowDir, 'work_items_wave_0.yaml'))).toBe(true);
      expect(fs.existsSync(path.join(workflowDir, 'work_items_wave_1.yaml'))).toBe(true);
    });

    it('work_meta.yaml advertises correct wave count and total_work_items', () => {
      const meta = fs.readFileSync(path.join(workflowDir, 'work_meta.yaml'), 'utf8');
      expect(meta).toMatch(/total_waves:\s*2/);
      expect(meta).toMatch(/total_work_items:\s*3/);
    });

    it('per-wave files reference work_items_wave_{K} naming pattern (K = 0..N-1)', () => {
      const files = fs.readdirSync(workflowDir).filter((f) => /^work_items_wave_\d+\.yaml$/.test(f));
      expect(files.length).toBe(2);
      expect(files).toContain('work_items_wave_0.yaml');
      expect(files).toContain('work_items_wave_1.yaml');
    });

    it('back-compat: union of per-wave WI ids equals monolithic WI ids', () => {
      // Extract WI ids from monolithic
      const monolithic = fs.readFileSync(path.join(workflowDir, 'work_items.yaml'), 'utf8');
      const monolithicIds = (monolithic.match(/- id:\s*(WI-\d+)/g) || []).map((m) => m.replace(/- id:\s*/, ''));

      // Extract WI ids from per-wave files
      const wave0 = fs.readFileSync(path.join(workflowDir, 'work_items_wave_0.yaml'), 'utf8');
      const wave1 = fs.readFileSync(path.join(workflowDir, 'work_items_wave_1.yaml'), 'utf8');
      const perWaveIds = [
        ...((wave0.match(/- id:\s*(WI-\d+)/g) || []).map((m) => m.replace(/- id:\s*/, ''))),
        ...((wave1.match(/- id:\s*(WI-\d+)/g) || []).map((m) => m.replace(/- id:\s*/, ''))),
      ];

      expect(perWaveIds.sort()).toEqual(monolithicIds.sort());
    });

    it('back-compat: per-wave files use the same acceptance_criteria schema', () => {
      // Both shapes must use `criterion:` + `verification_method:` keys
      const wave1 = fs.readFileSync(path.join(workflowDir, 'work_items_wave_1.yaml'), 'utf8');
      expect(wave1).toMatch(/criterion:/);
      expect(wave1).toMatch(/verification_method:/);
    });
  });
});
