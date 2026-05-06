/**
 * Regression test: Phase 8 — claude-code-owasp absorption (v11.1.x)
 *
 * Asserts that the OWASP security advisor was successfully absorbed from
 * example/external-skills/agamm__claude-code-owasp/ into the cAgents archetype
 * tree as a developer/quality execution agent (distinct from the existing
 * developer/infrastructure/security-lead controller).
 *
 * Failing-before / passing-after contract:
 *   - Before Phase 8: developer/quality/security-owasp/SKILL.md does NOT exist.
 *     This test fails because the file_exists assertion fails.
 *   - After Phase 8: the file exists with valid v11.1.0 frontmatter and the
 *     ported OWASP semantic content. This test passes.
 *
 * References:
 *   - example/external-skills/IMPLEMENT_AND_VALIDATE_PROMPT.md § Section C Phase 8
 *   - example/external-skills/agamm__claude-code-owasp/.claude/skills/owasp-security/SKILL.md (read-only source corpus)
 *   - .claude/rules/core/skill-format.md (v11.1.0 frontmatter contract)
 *   - CLAUDE.md "Bug-Driven Testing" mandate
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..', '..');
const SKILL_PATH = resolve(
  REPO_ROOT,
  'developer',
  'quality',
  'security-owasp',
  'SKILL.md'
);

function readSkill() {
  return readFileSync(SKILL_PATH, 'utf8');
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return match[1];
}

describe('Phase 8 — claude-code-owasp absorbed as developer/quality/security-owasp', () => {
  it('SKILL.md file exists at the expected archetype-tree path', () => {
    expect(existsSync(SKILL_PATH)).toBe(true);
    expect(statSync(SKILL_PATH).isFile()).toBe(true);
  });

  it('frontmatter declares v11.1.0 archetype/branch correctly', () => {
    const fm = extractFrontmatter(readSkill());
    expect(fm).not.toBeNull();
    expect(fm).toMatch(/^name:\s*security-owasp\b/m);
    expect(fm).toMatch(/^archetype:\s*developer\b/m);
    expect(fm).toMatch(/^branch:\s*quality\b/m);
    // v11.1.0 explicitly REMOVED top-level domain: — must not appear at top level
    expect(fm).not.toMatch(/^domain:/m);
  });

  it('declares execution tier (distinct from security-lead controller)', () => {
    const content = readSkill();
    expect(content).toMatch(/tier:\s*execution\b/);
    // Must NOT be a controller (security-lead already owns that role)
    expect(content).not.toMatch(/tier:\s*controller\b/);
  });

  it('allowed-tools field is present and read-only-friendly (no Agent/Edit/Write)', () => {
    const fm = extractFrontmatter(readSkill());
    expect(fm).toMatch(/^allowed-tools:.*\bRead\b/m);
    expect(fm).toMatch(/^allowed-tools:.*\bGrep\b/m);
    // Audit-focused agent should not directly Edit/Write/spawn
    const allowedToolsLine = fm.split('\n').find((l) => l.startsWith('allowed-tools:'));
    expect(allowedToolsLine).not.toMatch(/\bAgent\b/);
    expect(allowedToolsLine).not.toMatch(/\bEdit\b/);
    expect(allowedToolsLine).not.toMatch(/\bWrite\b/);
  });

  it('semantic content ports OWASP Top 10:2025 framework', () => {
    const content = readSkill();
    expect(content).toMatch(/OWASP Top 10:2025/);
    // Spot-check that key A0X categories were ported
    expect(content).toMatch(/A01\b.*Broken Access Control/);
    expect(content).toMatch(/A05\b.*Injection/);
    expect(content).toMatch(/A07\b.*Auth Failures/);
  });

  it('semantic content ports LLM Top 10 (2025) framework', () => {
    const content = readSkill();
    expect(content).toMatch(/LLM01\b.*Prompt Injection/);
    expect(content).toMatch(/LLM05\b.*Improper Output Handling/);
    expect(content).toMatch(/LLM10\b.*Unbounded Consumption/);
  });

  it('semantic content ports Agentic AI security (2026) framework', () => {
    const content = readSkill();
    expect(content).toMatch(/ASI01\b.*Goal Hijack/);
    expect(content).toMatch(/ASI02\b.*Tool Misuse/);
    expect(content).toMatch(/ASI10\b.*Rogue Agents/);
  });

  it('semantic content includes ASVS 5.0 tier mapping', () => {
    const content = readSkill();
    expect(content).toMatch(/ASVS 5\.0/);
    expect(content).toMatch(/L1\b/);
    expect(content).toMatch(/L2\b/);
    expect(content).toMatch(/L3\b/);
  });

  it('clearly distinguishes scope from security-lead controller', () => {
    const content = readSkill();
    // Must reference security-lead to disambiguate, and call out the audit-vs-coordination split
    expect(content).toMatch(/security-lead/);
  });

  it('does not modify the read-only corpus source', () => {
    const corpusPath = resolve(
      REPO_ROOT,
      'example',
      'external-skills',
      'agamm__claude-code-owasp',
      '.claude',
      'skills',
      'owasp-security',
      'SKILL.md'
    );
    expect(existsSync(corpusPath)).toBe(true);
    // Sanity: corpus header still has the original `name: owasp-security` (untouched)
    const corpus = readFileSync(corpusPath, 'utf8');
    expect(corpus).toMatch(/^name:\s*owasp-security\b/m);
  });
});
