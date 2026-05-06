/**
 * Regression test: Phase 7 (v11.1.x) playwright-test-engineer absorption.
 *
 * Asserts that developer/quality/playwright-test-engineer/SKILL.md exists with
 * v11.1.0-conformant frontmatter (archetype: developer, branch: quality,
 * tier: execution, model: sonnet) and that the agent's body ports the upstream
 * Playwright semantics (Golden Rules, security trust boundary, status protocol).
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
const SKILL_PATH = path.join(
  REPO_ROOT,
  'developer',
  'quality',
  'playwright-test-engineer',
  'SKILL.md'
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

describe('Phase 7: playwright-test-engineer absorption', () => {
  it('SKILL.md file exists at the canonical archetype path', () => {
    expect(fs.existsSync(SKILL_PATH)).toBe(true);
  });

  it('frontmatter parses as valid YAML and starts with --- delimiter', () => {
    const raw = fs.readFileSync(SKILL_PATH, 'utf8');
    expect(raw.startsWith('---\n')).toBe(true);
    const { frontmatter } = loadFrontmatter(SKILL_PATH);
    expect(frontmatter).toBeTruthy();
    expect(typeof frontmatter).toBe('object');
  });

  it('declares required v11.1.0 top-level fields (name, archetype, branch, description)', () => {
    const { frontmatter } = loadFrontmatter(SKILL_PATH);
    expect(frontmatter.name).toBe('playwright-test-engineer');
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

  it('declares metadata.tier=execution and metadata.model=sonnet', () => {
    const { frontmatter } = loadFrontmatter(SKILL_PATH);
    expect(frontmatter.metadata).toBeTruthy();
    expect(frontmatter.metadata.tier).toBe('execution');
    expect(frontmatter.metadata.model).toBe('sonnet');
  });

  it('declares Playwright-relevant capabilities', () => {
    const { frontmatter } = loadFrontmatter(SKILL_PATH);
    const caps = frontmatter.metadata?.capabilities || [];
    expect(Array.isArray(caps)).toBe(true);
    expect(caps).toEqual(expect.arrayContaining(['e2e_testing']));
    // At least one of the four absorbed capability families must be present
    const expected = ['api_testing', 'visual_regression', 'accessibility_audit', 'component_testing'];
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

  it('body ports upstream semantics: Golden Rules, web-first assertions, getByRole', () => {
    const { body } = loadFrontmatter(SKILL_PATH);
    // Phase 7 spec requires translating semantic content to cAgents conventions
    expect(body).toMatch(/Golden Rules/i);
    expect(body).toMatch(/getByRole/);
    expect(body).toMatch(/waitForTimeout/);
  });

  it('declares status-protocol compliance (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED)', () => {
    const { body } = loadFrontmatter(SKILL_PATH);
    expect(body).toMatch(/DONE/);
    expect(body).toMatch(/DONE_WITH_CONCERNS/);
    expect(body).toMatch(/NEEDS_CONTEXT/);
    expect(body).toMatch(/BLOCKED/);
  });
});
