/**
 * Regression test: Phase 8 — claude-code-owasp absorption (v11.1.x)
 *
 * Updated for v12.consolidation: security-owasp was absorbed into
 * security-engineer (developer/infrastructure/security-engineer/SKILL.md) as
 * the `owasp-audit` mode. The test now asserts security-engineer exists with
 * the owasp-audit mode and that resources/owasp-audit.md carries the upstream
 * OWASP semantic content.
 *
 * Failing-before / passing-after contract:
 *   - Before Phase 8: developer/quality/security-owasp/SKILL.md did NOT exist.
 *   - After Phase 8 + v12.consolidation: security-engineer at
 *     developer/infrastructure/security-engineer/ carries the OWASP content.
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
// security-owasp absorbed into security-engineer as the owasp-audit mode.
const SKILL_PATH = resolve(
  REPO_ROOT,
  'agents',
  'developer',
  'infrastructure',
  'security-engineer',
  'SKILL.md'
);
const OWASP_RESOURCE = resolve(
  REPO_ROOT,
  'agents',
  'developer',
  'infrastructure',
  'security-engineer',
  'resources',
  'owasp-audit.md'
);

function readSkill() {
  return readFileSync(SKILL_PATH, 'utf8');
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return match[1];
}

function readCombined() {
  const skillContent = readSkill();
  const resourceContent = existsSync(OWASP_RESOURCE)
    ? readFileSync(OWASP_RESOURCE, 'utf8')
    : '';
  return skillContent + '\n' + resourceContent;
}

describe('Phase 8 — claude-code-owasp absorbed as security-engineer owasp-audit mode', () => {
  it('SKILL.md file exists at the expected archetype-tree path (security-engineer)', () => {
    expect(existsSync(SKILL_PATH)).toBe(true);
    expect(statSync(SKILL_PATH).isFile()).toBe(true);
  });

  it('frontmatter declares v11.1.0 archetype/branch correctly', () => {
    const fm = extractFrontmatter(readSkill());
    expect(fm).not.toBeNull();
    expect(fm).toMatch(/^name:\s*security-engineer\b/m);
    expect(fm).toMatch(/^archetype:\s*developer\b/m);
    expect(fm).toMatch(/^branch:\s*infrastructure\b/m);
    // v11.1.0 explicitly REMOVED top-level domain: — must not appear at top level
    expect(fm).not.toMatch(/^domain:/m);
  });

  it('declares security tier (controller covering owasp coordination)', () => {
    const content = readSkill();
    // security-engineer is a controller; security-owasp execution was merged in
    expect(content).toMatch(/tier:\s*(controller|execution)\b/);
  });

  it('declares owasp-audit absorption via supported_modes.owasp-audit', () => {
    const content = readSkill();
    expect(content).toMatch(/owasp-audit/);
    // The supported_modes block must document the absorption
    expect(content).toMatch(/security-owasp/);
  });

  it('allowed-tools field is present and includes Read and Grep', () => {
    const fm = extractFrontmatter(readSkill());
    expect(fm).toMatch(/^allowed-tools:.*\bRead\b/m);
    expect(fm).toMatch(/^allowed-tools:.*\bGrep\b/m);
  });

  it('resources/owasp-audit.md exists', () => {
    expect(existsSync(OWASP_RESOURCE)).toBe(true);
  });

  it('semantic content ports OWASP Top 10:2025 framework', () => {
    const content = readCombined();
    expect(content).toMatch(/OWASP Top 10:2025/);
    // Spot-check that key A0X categories were ported
    expect(content).toMatch(/A01\b.*Broken Access Control/);
    expect(content).toMatch(/A05\b.*Injection/);
    expect(content).toMatch(/A07\b.*Auth Failures/);
  });

  it('semantic content ports LLM Top 10 (2025) framework', () => {
    const content = readCombined();
    expect(content).toMatch(/LLM01\b.*Prompt Injection/);
    expect(content).toMatch(/LLM05\b.*Improper Output Handling/);
    expect(content).toMatch(/LLM10\b.*Unbounded Consumption/);
  });

  it('semantic content ports Agentic AI security (2026) framework', () => {
    const content = readCombined();
    expect(content).toMatch(/ASI01\b.*Goal Hijack/);
    expect(content).toMatch(/ASI02\b.*Tool Misuse/);
    expect(content).toMatch(/ASI10\b.*Rogue Agents/);
  });

  it('semantic content includes ASVS 5.0 tier mapping', () => {
    const content = readCombined();
    expect(content).toMatch(/ASVS 5\.0/);
    expect(content).toMatch(/L1\b/);
    expect(content).toMatch(/L2\b/);
    expect(content).toMatch(/L3\b/);
  });

  it('does not modify the read-only corpus source', () => {
    // v12.8.0 (eef900a7) "streamline root" moved example/ under
    // _archive/repo_root_scratch/. The read-only corpus now lives there.
    const corpusPath = resolve(
      REPO_ROOT,
      '_archive',
      'repo_root_scratch',
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
