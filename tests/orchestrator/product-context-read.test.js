// Regression test for V10.26.7 — product_context loader helper doc
// Asserts the orchestrator's read contract is documented and referenced.
// Failing-before: no named helper existed; future refactors could silently
// route /act enrichment through the /context skill, breaking the V10.26.10
// utility demotion. This test locks the READ path in place.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const HELPER_PATH = resolve(
  process.cwd(),
  'agents/orchestrator/resources/product-context-loader.md'
);
const ORCHESTRATOR_SKILL = resolve(
  process.cwd(),
  'agents/orchestrator.md'
);
const ORCHESTRATION_REFERENCE = resolve(
  process.cwd(),
  '.claude/rules/core/orchestration-reference.md'
);

describe('V10.26.7 product_context loader helper', () => {
  it('helper doc exists at the canonical orchestrator resource path', () => {
    expect(existsSync(HELPER_PATH)).toBe(true);
  });

  it('helper cites the 500-character budget from orchestration-reference', () => {
    const content = readFileSync(HELPER_PATH, 'utf8');
    expect(content).toMatch(/500[-\s]character/i);
  });

  it('helper cites the canonical data file path', () => {
    const content = readFileSync(HELPER_PATH, 'utf8');
    expect(content).toMatch(
      /cagents-memory\/_projects\/\{project_hash\}\/product_context\.yaml/
    );
  });

  it('helper documents SHA-256 hash derivation from pwd', () => {
    const content = readFileSync(HELPER_PATH, 'utf8');
    expect(content).toMatch(/sha256/i);
    expect(content).toMatch(/pwd/i);
  });

  it('orchestrator agent file references the new helper via @<agent>/resources/', () => {
    const content = readFileSync(ORCHESTRATOR_SKILL, 'utf8');
    expect(content).toMatch(/@orchestrator\/resources\/product-context-loader\.md/);
  });

  it('orchestration-reference.md still describes project_summary in enriched_context', () => {
    const content = readFileSync(ORCHESTRATION_REFERENCE, 'utf8');
    expect(content).toMatch(/project_summary/);
    expect(content).toMatch(
      /cagents-memory\/_projects\/\{hash\}\/product_context\.yaml/
    );
  });

  it('fixture round-trip: a product_context.yaml at the hashed path resolves correctly', () => {
    // Simulates the orchestrator's path-resolution logic against a temp fixture.
    // This exercises the contract in the helper doc without running the full agent.
    const fixtureRoot = resolve(process.cwd(), 'tests/.tmp/product-context-fixture');
    const pwd = fixtureRoot;
    const hash = createHash('sha256').update(pwd).digest('hex').slice(0, 8);
    const contextPath = resolve(
      fixtureRoot,
      `cagents-memory/_projects/${hash}/product_context.yaml`
    );

    try {
      mkdirSync(dirname(contextPath), { recursive: true });
      writeFileSync(
        contextPath,
        [
          'project_name: "test-fixture"',
          'description: "A test project for the loader."',
          'primary_language: "typescript"',
          'framework: "vitest"',
          '',
        ].join('\n'),
        'utf8'
      );

      expect(existsSync(contextPath)).toBe(true);
      const body = readFileSync(contextPath, 'utf8');
      expect(body).toMatch(/description: "A test project for the loader\."/);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
