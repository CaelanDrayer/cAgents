import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for V11.2.11 (Q-006 / F-docs-003).
 *
 * Bug: .claude/rules/quality/resources/validation-checklist-29.md is 126 lines
 *      and ships 23 ASPIRATIONAL checks (Phases 1-3) into every agent's
 *      context on every session, alongside the 5 active Phase-4 checks
 *      (checks 25-29). The 23 aspirational checks are documented as
 *      "not yet enforced" and depend on agent behavior that does not happen
 *      in practice. The file lives under .claude/rules/quality/, so it is
 *      auto-loaded into context — paying 121 lines of context budget for
 *      checks that do not run.
 *
 * Root cause: The 29-check framework was designed as a target architecture
 *      but only 5 checks were ever wired up to hooks. The graduation
 *      roadmap acknowledges this but the aspirational content remained
 *      in-context rather than being moved to docs/ (which does not
 *      auto-load).
 *
 * Test added: this file. Asserts the active validation-checklist file is
 *      under 100 lines, mentions exactly the 5 active checks (25-29),
 *      contains no "ASPIRATIONAL" substring, and has no Current Enforcement
 *      Status / Graduation Roadmap sections. Also asserts the aspirational
 *      content moved verbatim into docs/FUTURE_VALIDATION_FRAMEWORK.md.
 *
 * Failing-before evidence: at HEAD (v11.2.10), the file is 126 lines and
 *      contains 9 occurrences of "ASPIRATIONAL".
 * Passing-after evidence: after the trim, the file is < 100 lines, has zero
 *      "ASPIRATIONAL" tokens, and the deferred content lives in
 *      docs/FUTURE_VALIDATION_FRAMEWORK.md.
 *
 * Could have caught by: unit test on validation-checklist file structure.
 */

const ROOT = process.cwd();
const ACTIVE_FILE = '.claude/rules/quality/resources/validation-checklist-29.md';
const FUTURE_DOC = 'docs/FUTURE_VALIDATION_FRAMEWORK.md';

describe('Q-006 regression: validation-checklist active file is trim', () => {
  const activePath = join(ROOT, ACTIVE_FILE);
  const activeContent = readFileSync(activePath, 'utf8');
  const activeLines = activeContent.split('\n');

  it('active validation-checklist file is < 100 lines', () => {
    expect(
      activeLines.length,
      `${ACTIVE_FILE} has ${activeLines.length} lines. Active enforcement covers ` +
      `only 5 checks (25-29). The 23 aspirational checks (Phases 1-3) belong in ` +
      `docs/FUTURE_VALIDATION_FRAMEWORK.md, which does not auto-load into agent ` +
      `context. Trim the active file to under 100 lines.`,
    ).toBeLessThan(100);
  });

  it('active file contains no "ASPIRATIONAL" token', () => {
    const occurrences = activeContent.split('ASPIRATIONAL').length - 1;
    expect(
      occurrences,
      `${ACTIVE_FILE} contains ${occurrences} occurrence(s) of "ASPIRATIONAL". ` +
      `The active file should describe only enforced checks. Aspirational ` +
      `content belongs in docs/FUTURE_VALIDATION_FRAMEWORK.md.`,
    ).toBe(0);
  });

  it('active file mentions each of the 5 active checks (25-29)', () => {
    for (const checkId of ['25', '26', '27', '28', '29']) {
      expect(
        activeContent.includes(checkId),
        `${ACTIVE_FILE} must mention active check #${checkId}. The active 5 ` +
        `checks (25-29) are the Phase-4 cross-cutting checks enforced by hooks.`,
      ).toBe(true);
    }
  });

  it('active file does not contain Current Enforcement Status section', () => {
    expect(
      activeContent.includes('Current Enforcement Status'),
      `${ACTIVE_FILE} still contains a "Current Enforcement Status" section. ` +
      `That section belongs in docs/FUTURE_VALIDATION_FRAMEWORK.md (where the ` +
      `aspirational checks are catalogued). The active file should describe ` +
      `enforced checks only, with no graduation/status metadata.`,
    ).toBe(false);
  });

  it('active file does not contain Graduation Roadmap section', () => {
    expect(
      activeContent.includes('Graduation Roadmap'),
      `${ACTIVE_FILE} still contains a "Graduation Roadmap" section. The ` +
      `roadmap describes how aspirational checks would graduate to enforced ` +
      `status — it belongs in docs/FUTURE_VALIDATION_FRAMEWORK.md.`,
    ).toBe(false);
  });

  it('active file heading clarifies it represents active enforcement', () => {
    // Accept any heading variant that signals "active" / "enforced" scope
    // rather than the legacy "29-Check Comprehensive Validation Framework
    // (Aspirational)" framing.
    const firstHeading = activeLines.find((line) => line.startsWith('# '));
    expect(
      firstHeading,
      `${ACTIVE_FILE} must have a top-level heading.`,
    ).toBeDefined();
    expect(
      /active|enforced/i.test(firstHeading),
      `${ACTIVE_FILE} top-level heading is "${firstHeading}". It must signal ` +
      `that the file describes the active/enforced subset (e.g., "Active ` +
      `Validation Checklist (5 checks)"). Drop the "(Aspirational)" framing — ` +
      `aspirational content now lives in docs/FUTURE_VALIDATION_FRAMEWORK.md.`,
    ).toBe(true);
  });

  it('docs/FUTURE_VALIDATION_FRAMEWORK.md exists and contains the aspirational content', () => {
    const futurePath = join(ROOT, FUTURE_DOC);
    expect(
      existsSync(futurePath),
      `${FUTURE_DOC} must exist. The 23 aspirational checks (Phases 1-3 of ` +
      `the original framework) were moved out of the auto-loaded rules tree ` +
      `into docs/ so they no longer cost agent context on every session.`,
    ).toBe(true);

    const futureContent = readFileSync(futurePath, 'utf8');

    // Spot-check that the aspirational content actually moved (not just an
    // empty placeholder file).
    for (const phase of ['Phase 1', 'Phase 2', 'Phase 3']) {
      expect(
        futureContent.includes(phase),
        `${FUTURE_DOC} must contain "${phase}" — the aspirational checks are ` +
        `organized by phase. If this assertion fails the content move was ` +
        `incomplete.`,
      ).toBe(true);
    }

    // The Current Enforcement Status and Graduation Roadmap tables moved here.
    for (const section of ['Current Enforcement Status', 'Graduation Roadmap']) {
      expect(
        futureContent.includes(section),
        `${FUTURE_DOC} must contain the "${section}" section — it was moved ` +
        `verbatim from the active file.`,
      ).toBe(true);
    }
  });
});
