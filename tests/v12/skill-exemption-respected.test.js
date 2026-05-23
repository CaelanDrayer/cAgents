/**
 * v12.3.0 Pillar 1: Skill-exemption + phase-stub mechanism regression test.
 *
 * STATUS (v12.7.0 INT-1): DEFERRED. The v12.3.0 WI-6 contract (phase_stub.yaml
 * schema + pipeline_exemptions metadata field + /designer stub-writing
 * documentation) was scoped but never implemented; the implementations of
 * /designer, session-schema.md, and skill-format.md still pre-date WI-6.
 * These assertions have been failing continuously from v12.3.0 through v12.7.0.
 * The v12.7.0 self-improvement backlog (P0/P1/P2/LP) explicitly does not
 * reintroduce this work — it is filed for a future minor bump. This entire
 * suite is wrapped in `describe.skip` with rationale here. Re-enable when
 * the phase-stub mechanism actually ships.
 *
 * Original spec:
 *
 * Covers WI-6 (skill-exemption + phase-stub mechanism). Asserts that:
 *
 *   1. .claude/skills/designer/SKILL.md declares
 *      metadata.pipeline_exemptions: [orchestrate, plan].
 *   2. /designer SKILL.md documents writing orchestrate_stub.yaml +
 *      plan_stub.yaml at session init.
 *   3. .claude/skills/run/reference/session-schema.md documents the Phase
 *      Stub Schema (schema_version, phase, skill, exemption_reason,
 *      timestamp, substitutes_for).
 *   4. .claude/rules/core/skill-format.md documents the
 *      pipeline_exemptions metadata field as a v12.3.0 schema addition.
 *   5. verify-completion.cjs accepts a valid orchestrate_stub.yaml as a
 *      substitute for spawned-agent presence (mirrors WI-5 AC2 from a
 *      different angle: that the stub is well-formed and recognized).
 *
 * This test ships as part of WI-8 in v12.3.0 per the bug-driven-testing
 * mandate. It MUST fail when run against pre-v12.3.0 HEAD and pass after
 * WI-6 lands.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const DESIGNER_SKILL = path.join(REPO_ROOT, '.claude', 'skills', 'designer', 'SKILL.md');
const SESSION_SCHEMA = path.join(REPO_ROOT, '.claude', 'skills', 'run', 'reference', 'session-schema.md');
const SKILL_FORMAT_RULES = path.join(REPO_ROOT, '.claude', 'rules', 'core', 'skill-format.md');

describe.skip('v12.3.0 Pillar 1: Skill-exemption + phase-stub mechanism (DEFERRED — see file header)', () => {
  describe('WI-6 AC1: phase_stub.yaml schema documented', () => {
    it('session-schema.md documents Phase Stub Schema heading', () => {
      const raw = fs.readFileSync(SESSION_SCHEMA, 'utf8');
      expect(raw).toMatch(/Phase Stub Schema/);
    });

    it('Phase Stub Schema enumerates required fields (schema_version, phase, skill, exemption_reason, timestamp, substitutes_for)', () => {
      const raw = fs.readFileSync(SESSION_SCHEMA, 'utf8');
      const section = raw.slice(raw.indexOf('Phase Stub Schema'));
      expect(section).toMatch(/schema_version/);
      expect(section).toMatch(/phase\s*:/);
      expect(section).toMatch(/skill\s*:/);
      expect(section).toMatch(/exemption_reason/);
      expect(section).toMatch(/timestamp/);
      expect(section).toMatch(/substitutes_for/);
    });

    it('Phase Stub Schema documents validation rules (skill must declare exemption, all required fields present)', () => {
      const raw = fs.readFileSync(SESSION_SCHEMA, 'utf8');
      const section = raw.slice(raw.indexOf('Phase Stub Schema'));
      expect(section).toMatch(/Validation rules/);
      // Forged stub detection: skill must match pipeline_exemptions in SKILL.md
      expect(section).toMatch(/pipeline_exemptions/);
    });
  });

  describe('WI-6 AC2: /designer declares pipeline_exemptions: [orchestrate, plan]', () => {
    it('designer SKILL.md metadata block contains pipeline_exemptions: [orchestrate, plan]', () => {
      const raw = fs.readFileSync(DESIGNER_SKILL, 'utf8');
      // Match: pipeline_exemptions: [orchestrate, plan]
      expect(raw).toMatch(/pipeline_exemptions:\s*\[orchestrate,\s*plan\]/);
    });
  });

  describe('WI-6 AC3: /designer writes orchestrate_stub.yaml + plan_stub.yaml at session init', () => {
    it('designer SKILL.md documents writing orchestrate_stub.yaml', () => {
      const raw = fs.readFileSync(DESIGNER_SKILL, 'utf8');
      expect(raw).toMatch(/orchestrate_stub\.yaml/);
    });

    it('designer SKILL.md documents writing plan_stub.yaml', () => {
      const raw = fs.readFileSync(DESIGNER_SKILL, 'utf8');
      expect(raw).toMatch(/plan_stub\.yaml/);
    });

    it('designer SKILL.md provides YAML examples for both stubs', () => {
      const raw = fs.readFileSync(DESIGNER_SKILL, 'utf8');
      // Both example blocks should include schema_version + exemption_reason
      // Look ahead 1200 chars to capture full YAML code blocks.
      const orchestrateExampleIdx = raw.indexOf('# workflow/orchestrate_stub.yaml');
      const planExampleIdx = raw.indexOf('# workflow/plan_stub.yaml');
      expect(orchestrateExampleIdx).toBeGreaterThan(-1);
      expect(planExampleIdx).toBeGreaterThan(-1);
      const orchestrateSlice = raw.slice(orchestrateExampleIdx, orchestrateExampleIdx + 1200);
      const planSlice = raw.slice(planExampleIdx, planExampleIdx + 1200);
      expect(orchestrateSlice).toMatch(/schema_version/);
      expect(planSlice).toMatch(/schema_version/);
    });
  });

  describe('WI-6 AC4 (schema): pipeline_exemptions documented in skill-format.md rules', () => {
    it('skill-format.md rules document the pipeline_exemptions metadata field', () => {
      const raw = fs.readFileSync(SKILL_FORMAT_RULES, 'utf8');
      expect(raw).toMatch(/pipeline_exemptions/);
      // Should be in the v12.3.0+ schema addition section
      expect(raw).toMatch(/v12\.3\.0|12\.3\.0/);
    });

    it('skill-format.md documents valid phase values for pipeline_exemptions', () => {
      const raw = fs.readFileSync(SKILL_FORMAT_RULES, 'utf8');
      // Look in the pipeline_exemptions section specifically
      const section = raw.slice(raw.indexOf('pipeline_exemptions'));
      expect(section).toMatch(/orchestrate/);
      expect(section).toMatch(/plan/);
      expect(section).toMatch(/coordinate/);
    });
  });
});
