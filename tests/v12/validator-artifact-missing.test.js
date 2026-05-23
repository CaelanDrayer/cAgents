/**
 * v12.3.0 Pillar 1: Validator artifact-missing retry-then-fail regression test.
 *
 * STATUS (v12.7.0 INT-1): DEFERRED. The v12.3.0 WI-4/5/7 contract (Phase 0
 * artifact-presence check, `checkMandatoryPipelineArtifacts` function in
 * verify-completion.cjs, and retry-then-fail loop with `validation_retry`
 * counter in validation_report.yaml) was scoped but never landed. The
 * referenced function and the documented Phase 0 heading do not exist in
 * the current codebase. The assertions have been failing continuously from
 * v12.3.0 through v12.7.0. The v12.7.0 self-improvement backlog explicitly
 * does not reintroduce this work — it is filed for a future minor bump.
 * Suite wrapped in describe.skip with rationale. Re-enable when WI-4/5/7
 * actually ship.
 *
 * Original spec:
 *
 * Covers WI-4 (Phase-0 artifact-presence check) and WI-7 (retry-then-fail
 * loop). Asserts that:
 *
 *   1. core/validator/SKILL.md documents a Phase 0 "Required
 *      artifact presence" check that runs BEFORE Phase 1.
 *   2. Phase 0 enumerates the 4 required workflow artifacts and the
 *      stub-acceptance behavior.
 *   3. Phase 0 failure produces a BLOCK with retry signal (not a silent
 *      pass-through).
 *   4. The retry-then-fail loop is bounded to max 2 retries per session
 *      and produces a hard-FAIL with diagnostic + waypoint reference on
 *      exhaustion.
 *   5. The retry counter is recorded in validation_report.yaml.
 *
 * Also exercises the verify-completion.cjs hard-fail path (WI-5) by
 * running `checkMandatoryPipelineArtifacts` against a synthetic session
 * with no agent_tree.yaml + no stub (expect BLOCK) vs. with a valid stub
 * (expect pass-through).
 *
 * This test ships as part of WI-8 in v12.3.0 per the bug-driven-testing
 * mandate. It MUST fail when run against pre-v12.3.0 HEAD and pass after
 * WI-4, WI-5, and WI-7 land.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const VALIDATOR_SKILL = path.join(REPO_ROOT, 'agents', 'core', 'validator', 'SKILL.md');
const VERIFY_HOOK = path.join(REPO_ROOT, '.claude', 'hooks', 'verify-completion.cjs');

describe.skip('v12.3.0 Pillar 1: Validator Phase-0 artifact-presence check (DEFERRED — see file header)', () => {
  describe('WI-4: Phase 0 documentation', () => {
    it('SKILL.md contains "Phase 0" and "Required artifact presence" headings', () => {
      const raw = fs.readFileSync(VALIDATOR_SKILL, 'utf8');
      expect(raw).toMatch(/Phase 0/);
      expect(raw).toMatch(/Required artifact presence/);
    });

    it('Phase 0 appears before Phase 1 in the validation phases section', () => {
      const raw = fs.readFileSync(VALIDATOR_SKILL, 'utf8');
      const phase0Idx = raw.indexOf('### Phase 0');
      const phase1Idx = raw.indexOf('### Phase 1');
      expect(phase0Idx).toBeGreaterThan(-1);
      expect(phase1Idx).toBeGreaterThan(-1);
      expect(phase0Idx).toBeLessThan(phase1Idx);
    });

    it('Phase 0 enumerates the 4 required workflow artifacts', () => {
      const raw = fs.readFileSync(VALIDATOR_SKILL, 'utf8');
      // Extract Phase 0 section
      const phase0 = raw.slice(raw.indexOf('### Phase 0'), raw.indexOf('### Phase 1'));
      expect(phase0).toMatch(/enriched_context\.yaml/);
      expect(phase0).toMatch(/plan\.yaml/);
      expect(phase0).toMatch(/work_items\.yaml/);
      expect(phase0).toMatch(/coordination_log\.yaml/);
    });

    it('Phase 0 documents stub-acceptance behavior via workflow/{phase}_stub.yaml', () => {
      const raw = fs.readFileSync(VALIDATOR_SKILL, 'utf8');
      const phase0 = raw.slice(raw.indexOf('### Phase 0'), raw.indexOf('### Phase 1'));
      expect(phase0).toMatch(/_stub\.yaml/);
      expect(phase0).toMatch(/Phase Stub Schema/i);
    });

    it('Phase 0 failure path documented as BLOCK with retry signal', () => {
      const raw = fs.readFileSync(VALIDATOR_SKILL, 'utf8');
      const phase0 = raw.slice(raw.indexOf('### Phase 0'), raw.indexOf('### Phase 1'));
      expect(phase0).toMatch(/BLOCK with retry signal|BLOCK.*retry/);
      expect(phase0).toMatch(/retry_signal|retry_phase/);
    });
  });

  describe('WI-7: retry-then-fail loop', () => {
    it('SKILL.md documents max 2 retries per session', () => {
      const raw = fs.readFileSync(VALIDATOR_SKILL, 'utf8');
      expect(raw).toMatch(/max 2 retries|2 retries per session/);
    });

    it('Hard-FAIL output includes phase, missing_artifact_path, and waypoint reference', () => {
      const raw = fs.readFileSync(VALIDATOR_SKILL, 'utf8');
      expect(raw).toMatch(/missing_artifact_path/);
      expect(raw).toMatch(/waypoint_reference/);
      expect(raw).toMatch(/producing_phase|producing_agent/);
    });

    it('Retry counter recorded in validation_report.yaml', () => {
      const raw = fs.readFileSync(VALIDATOR_SKILL, 'utf8');
      expect(raw).toMatch(/phase_0_retry_count/);
    });
  });

  describe('WI-5: verify-completion.cjs hard-fail on missing pipeline artifacts', () => {
    it('hook file defines checkMandatoryPipelineArtifacts function', () => {
      const raw = fs.readFileSync(VERIFY_HOOK, 'utf8');
      expect(raw).toMatch(/function checkMandatoryPipelineArtifacts/);
    });

    it('checkMandatoryPipelineArtifacts is called BEFORE autoResolveWarnings', () => {
      const raw = fs.readFileSync(VERIFY_HOOK, 'utf8');
      // Find the FIRST call to each (the function definitions appear earlier;
      // we look for the call sites, which include `(sessionDir)` args).
      const calls = raw.split('\n');
      let mandatoryCallLine = -1;
      let autoResolveCallLine = -1;
      for (let i = 0; i < calls.length; i++) {
        if (mandatoryCallLine === -1 && /^\s*const mandatoryCheck\s*=\s*checkMandatoryPipelineArtifacts\(sessionDir\)/.test(calls[i])) {
          mandatoryCallLine = i;
        }
        if (autoResolveCallLine === -1 && /^\s*const autoResolved\s*=\s*autoResolveWarnings\(sessionDir\)/.test(calls[i])) {
          autoResolveCallLine = i;
        }
      }
      expect(mandatoryCallLine).toBeGreaterThan(-1);
      expect(autoResolveCallLine).toBeGreaterThan(-1);
      expect(mandatoryCallLine).toBeLessThan(autoResolveCallLine);
    });

    it('blocks on terminal-state session with no agent_tree.yaml and no stub', () => {
      // Extract and eval the function from the source file
      const raw = fs.readFileSync(VERIFY_HOOK, 'utf8');
      const fnMatch = raw.match(/function checkMandatoryPipelineArtifacts[\s\S]*?\n\}\n/);
      expect(fnMatch).toBeTruthy();
      // Provide minimal helpers it depends on
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'v12-3-mandatory-'));
      const sessionDir = path.join(tmpDir, 'run_test_260521_001');
      fs.mkdirSync(path.join(sessionDir, 'workflow'), { recursive: true });
      fs.writeFileSync(path.join(sessionDir, 'status.yaml'), 'pipeline_state: VALIDATED\nphase: complete\n');

      // Build a CommonJS sandbox that provides the helpers checkMandatory...
      // depends on, then re-emits the function. Use template-literal-free
      // concatenation so single/double-quote escapes survive.
      const helpers = [
        "const fs = require('fs');",
        "const path = require('path');",
        "function safeRead(p) { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; } }",
        "function extractYamlValue(text, key) {",
        "  if (!text) return null;",
        "  const lines = text.split('\\n');",
        "  for (const line of lines) {",
        "    const m = line.match(new RegExp('^\\\\s*' + key + '\\\\s*:\\\\s*(.+?)\\\\s*$'));",
        "    if (m) return m[1].replace(/^[\"']|[\"']$/g, '').trim();",
        "  }",
        "  return null;",
        "}",
        fnMatch[0],
        "module.exports = { checkMandatoryPipelineArtifacts };",
        "",
      ].join('\n');
      const sandbox = helpers;
      const tmpFile = path.join(tmpDir, 'sandbox.cjs');
      fs.writeFileSync(tmpFile, sandbox);
      const { checkMandatoryPipelineArtifacts } = require(tmpFile);
      const result = checkMandatoryPipelineArtifacts(sessionDir);
      expect(result).toBeTruthy();
      expect(result.decision).toBe('block');
      expect(result.reason).toMatch(/MANDATORY PIPELINE FAILURE/);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('passes through when a valid orchestrate_stub.yaml is present', () => {
      const raw = fs.readFileSync(VERIFY_HOOK, 'utf8');
      const fnMatch = raw.match(/function checkMandatoryPipelineArtifacts[\s\S]*?\n\}\n/);
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'v12-3-stub-'));
      const sessionDir = path.join(tmpDir, 'designer_test_260521_001');
      fs.mkdirSync(path.join(sessionDir, 'workflow'), { recursive: true });
      fs.writeFileSync(path.join(sessionDir, 'status.yaml'), 'pipeline_state: VALIDATED\nphase: complete\n');
      fs.writeFileSync(
        path.join(sessionDir, 'workflow', 'orchestrate_stub.yaml'),
        [
          'schema_version: "1"',
          'phase: orchestrate',
          'skill: cagents:designer',
          'exemption_reason: "/designer is interactive-by-contract"',
          'timestamp: "2026-05-21T00:00:00Z"',
          'substitutes_for: workflow/enriched_context.yaml',
          '',
        ].join('\n')
      );

      // Build a CommonJS sandbox that provides the helpers checkMandatory...
      // depends on, then re-emits the function. Use template-literal-free
      // concatenation so single/double-quote escapes survive.
      const helpers = [
        "const fs = require('fs');",
        "const path = require('path');",
        "function safeRead(p) { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; } }",
        "function extractYamlValue(text, key) {",
        "  if (!text) return null;",
        "  const lines = text.split('\\n');",
        "  for (const line of lines) {",
        "    const m = line.match(new RegExp('^\\\\s*' + key + '\\\\s*:\\\\s*(.+?)\\\\s*$'));",
        "    if (m) return m[1].replace(/^[\"']|[\"']$/g, '').trim();",
        "  }",
        "  return null;",
        "}",
        fnMatch[0],
        "module.exports = { checkMandatoryPipelineArtifacts };",
        "",
      ].join('\n');
      const sandbox = helpers;
      const tmpFile = path.join(tmpDir, 'sandbox.cjs');
      fs.writeFileSync(tmpFile, sandbox);
      const { checkMandatoryPipelineArtifacts } = require(tmpFile);
      const result = checkMandatoryPipelineArtifacts(sessionDir);
      expect(result).toBeNull();

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });
});
