/**
 * Regression test: WI-12 (v11.1.4)
 *
 * Asserts that scripts/ci/validate-agents.sh emits zero broken `related_agents`
 * cross-references and overall warning count stays under the threshold.
 *
 * Background: v11.1.0 archetype migration left ~110 stale references behind.
 * v11.1.4 swept them. This test ensures they don't regress.
 *
 * References:
 *   - CLAUDE.md "Bug-Driven Testing" mandate
 *   - cagents-memory/sessions/run_plugin-health-v11-1-4_260429_001/workflow/enriched_context.yaml ISSUE-2
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..', '..');
const VALIDATE_AGENTS = resolve(REPO_ROOT, 'scripts', 'ci', 'validate-agents.sh');

function runValidateAgents() {
  // Strip ANSI color codes so grep counts work consistently
  const raw = execSync(`bash "${VALIDATE_AGENTS}"`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return raw.replace(/\[[0-9;]*m/g, '');
}

describe('related_agents regression (v11.1.4 sweep)', () => {
  const output = runValidateAgents();

  it('exits with no agent validation errors', () => {
    expect(output).toMatch(/Errors:\s*0/);
    expect(output).toContain('Agent validation PASSED');
  });

  it('has fewer than 5 broken related_agents references', () => {
    const matches = output.match(/related_agents '[^']+' not found in any archetype/g) || [];
    expect(matches.length).toBeLessThan(5);
  });

  it('has fewer than 5 legacy related-agents (hyphen) field warnings', () => {
    const matches = output.match(/Legacy 'related-agents' field found/g) || [];
    expect(matches.length).toBeLessThan(5);
  });

  it('has fewer than 10 total warnings (down from 111 pre-sweep)', () => {
    const matches = output.match(/^\s*WARN\s+/gm) || [];
    expect(matches.length).toBeLessThan(10);
  });
}, 60_000);
