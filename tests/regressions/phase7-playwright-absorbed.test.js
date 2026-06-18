/**
 * Regression test: Phase 7 (v11.1.x) playwright-test-engineer absorption.
 *
 * Updated for v12.consolidation: playwright-test-engineer was absorbed into
 * qa-lead (developer/quality/qa-lead/SKILL.md) as the `playwright` mode.
 * The test now asserts qa-lead exists with the playwright mode and that the
 * resources/playwright.md resource carries the upstream Playwright semantics
 * (Golden Rules, security trust boundary, status protocol).
 *
 * Source corpora (read-only reference):
 *   - example/external-skills/testdino-hq__playwright-skill/SKILL.md (v2.2.0, MIT)
 *   - example/external-skills/jeffallan__claude-skills/skills/playwright-expert/SKILL.md (v1.1.0, MIT)
 *
 * Spec: example/external-skills/IMPLEMENT_AND_VALIDATE_PROMPT.md Section C Phase 7.
 * Background: per CLAUDE.md Bug-Driven Testing mandate, every absorption ships a
 * regression test asserting the new agent file exists with required frontmatter.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
// playwright-test-engineer was absorbed into qa-lead as the `playwright` mode.
const SKILL_PATH = path.join(
  REPO_ROOT,
  'agents',
  'developer',
  'quality',
  'qa-lead',
  'SKILL.md'
);
const PLAYWRIGHT_RESOURCE = path.join(
  REPO_ROOT,
  'agents',
  'developer',
  'quality',
  'qa-lead',
  'resources',
  'playwright.md'
);

function loadFrontmatter(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  // Frontmatter is between the first two '---' lines
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`No YAML frontmatter found at ${filePath}`);
  }
  return { frontmatter: yaml.load(match[1]), body: match[2] };
}

describe('Phase 7: playwright-test-engineer absorption (survivor: qa-lead playwright mode)', () => {
  it('SKILL.md file exists at the canonical archetype path (qa-lead)', () => {
    expect(fs.existsSync(SKILL_PATH)).toBe(true);
  });

  it('frontmatter parses as valid YAML and starts with --- delimiter', () => {
    const raw = fs.readFileSync(SKILL_PATH, 'utf8');
    expect(raw.startsWith('---\n')).toBe(true);
    const { frontmatter } = loadFrontmatter(SKILL_PATH);
    expect(frontmatter).toBeTruthy();
    expect(typeof frontmatter).toBe('object');
  });

  it('declares required v11.1.0 top-level fields (name=qa-lead, archetype=developer, branch=quality)', () => {
    const { frontmatter } = loadFrontmatter(SKILL_PATH);
    expect(frontmatter.name).toBe('qa-lead');
    expect(frontmatter.archetype).toBe('developer');
    expect(frontmatter.branch).toBe('quality');
    expect(typeof frontmatter.description).toBe('string');
    expect(frontmatter.description.length).toBeGreaterThan(10);
    expect(frontmatter.description.length).toBeLessThanOrEqual(1024);
  });

  it('does NOT have a top-level domain field (forbidden in v11.1.0)', () => {
    const { frontmatter } = loadFrontmatter(SKILL_PATH);
    expect(frontmatter.domain).toBeUndefined();
  });

  it('declares metadata.tier and metadata.model', () => {
    const { frontmatter } = loadFrontmatter(SKILL_PATH);
    expect(frontmatter.metadata).toBeTruthy();
    expect(['execution', 'controller']).toContain(frontmatter.metadata.tier);
    expect(typeof frontmatter.metadata.model).toBe('string');
  });

  it('declares playwright absorption via supported_modes.playwright', () => {
    const { frontmatter } = loadFrontmatter(SKILL_PATH);
    expect(frontmatter.metadata).toBeTruthy();
    expect(frontmatter.metadata.supported_modes).toBeTruthy();
    expect(typeof frontmatter.metadata.supported_modes.playwright).toBe('string');
    expect(frontmatter.metadata.supported_modes.playwright).toMatch(/playwright/i);
  });

  it('declares Playwright-relevant capabilities (e2e_testing, browser_automation)', () => {
    const { frontmatter } = loadFrontmatter(SKILL_PATH);
    const caps = frontmatter.metadata?.capabilities || [];
    expect(Array.isArray(caps)).toBe(true);
    expect(caps).toEqual(expect.arrayContaining(['e2e_testing']));
    // At least one of the absorbed playwright capability families must be present
    const expected = ['api_testing', 'visual_regression', 'accessibility_audit', 'browser_automation', 'flaky_test_diagnosis', 'playwright_ci_integration'];
    const overlap = caps.filter((c) => expected.includes(c));
    expect(overlap.length).toBeGreaterThanOrEqual(2);
  });

  it('declares allowed-tools and includes Bash for npx playwright commands', () => {
    const { frontmatter } = loadFrontmatter(SKILL_PATH);
    const tools = frontmatter['allowed-tools'];
    expect(typeof tools).toBe('string');
    expect(tools).toMatch(/\bBash\b/);
    expect(tools).toMatch(/\bRead\b/);
    expect(tools).toMatch(/\bWrite\b/);
  });

  it('resources/playwright.md exists and ports upstream semantics: Golden Rules, web-first assertions, getByRole', () => {
    expect(fs.existsSync(PLAYWRIGHT_RESOURCE)).toBe(true);
    const body = fs.readFileSync(PLAYWRIGHT_RESOURCE, 'utf8');
    // Phase 7 spec requires translating semantic content to cAgents conventions
    expect(body).toMatch(/Golden Rules/i);
    expect(body).toMatch(/getByRole/);
    expect(body).toMatch(/waitForTimeout/);
  });

  it('playwright resource or SKILL.md body declares status-protocol compliance (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED)', () => {
    const resource = fs.existsSync(PLAYWRIGHT_RESOURCE)
      ? fs.readFileSync(PLAYWRIGHT_RESOURCE, 'utf8')
      : '';
    const { body } = loadFrontmatter(SKILL_PATH);
    const combined = body + resource;
    expect(combined).toMatch(/DONE/);
    expect(combined).toMatch(/DONE_WITH_CONCERNS/);
    expect(combined).toMatch(/NEEDS_CONTEXT/);
    expect(combined).toMatch(/BLOCKED/);
  });
});
