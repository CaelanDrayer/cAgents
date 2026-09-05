// PHASE-N1 (V11.1.13): controller Agent-tool audit regression test.
// Asserts that the 7 canonical controllers all declare `Agent` in their
// allowed-tools field. This locks the audit conclusion against future
// regressions: if a controller drops Agent from its allowed-tools, this
// test fails immediately.
//
// Background: the depth-1 plugin-subagent Agent-tool stripping bug
// (see cagents-memory/_knowledge/agent-tool-depth1-stripping.md) is an
// upstream Claude Code limitation, NOT a cAgents config issue. We
// confirm cAgents config is correct by verifying every controller
// SKILL.md declares Agent in allowed-tools as expected.
//
// Refs:
//   - example/external-skills/RESUME_W7_FINAL_PROMPT.md § Section F (PHASE-N1 spec)
//   - .claude/rules/core/teams.md § Known Harness Limitation
//   - cagents-memory/_knowledge/agent-tool-depth1-stripping.md

import { describe, test, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// The 7 canonical controllers (updated for v12.consolidation).
// backend-lead and frontend-lead were removed in the consolidation;
// replaced with security-engineer and marketing-strategist.
// If a controller is renamed or relocated, update this list.
const CANONICAL_CONTROLLERS = [
  'agents/tech-lead.md',
  'agents/architect.md',
  'agents/security-engineer.md',
  'agents/qa-lead.md',
  'agents/operations-manager.md',
  'agents/marketing-strategist.md',
  'agents/hr-manager.md',
];

function getAllowedToolsLine(content) {
  // Match the top-level frontmatter `allowed-tools:` line, NOT any
  // mention of the field name in the body.
  if (!content.startsWith('---\n')) return null;
  const end = content.indexOf('\n---', 4);
  if (end < 0) return null;
  const frontmatter = content.slice(4, end);
  for (const line of frontmatter.split('\n')) {
    if (line.startsWith('allowed-tools:')) return line;
  }
  return null;
}

describe('PHASE-N1 (V11.1.13): canonical controllers declare Agent in allowed-tools', () => {
  test('All 7 canonical controller SKILL.md files exist', () => {
    for (const rel of CANONICAL_CONTROLLERS) {
      const p = join(ROOT, rel);
      expect(existsSync(p), `Missing canonical controller: ${rel}`).toBe(true);
    }
  });

  test('Each canonical controller declares Agent in allowed-tools', () => {
    const failures = [];
    for (const rel of CANONICAL_CONTROLLERS) {
      const p = join(ROOT, rel);
      const content = readFileSync(p, 'utf8');
      const line = getAllowedToolsLine(content);
      if (!line) {
        failures.push(`${rel}: missing allowed-tools field in frontmatter`);
        continue;
      }
      // Substring match on the value side after `allowed-tools:` — we
      // accept any whitespace, any other tool prefixes/suffixes.
      const value = line.slice('allowed-tools:'.length);
      // Word-boundary match to avoid matching "Agentic" or similar.
      if (!/\bAgent\b/.test(value)) {
        failures.push(`${rel}: allowed-tools does not declare Agent. Line: ${line.trim()}`);
      }
    }
    expect(failures, `Controllers missing Agent declaration:\n${failures.join('\n')}`).toEqual([]);
  });

  test('Audit conclusion: all canonical controllers correctly declare Agent (per PHASE-N1)', () => {
    // This is a higher-level assertion that the bug is upstream, not config.
    // It captures the AUDIT VERDICT from PHASE-N1: cAgents declares Agent
    // correctly in every controller; if the runtime strips it anyway, that
    // is platform behavior, not a config issue.
    const declared = CANONICAL_CONTROLLERS.filter(rel => {
      const content = readFileSync(join(ROOT, rel), 'utf8');
      const line = getAllowedToolsLine(content);
      return line && /\bAgent\b/.test(line.slice('allowed-tools:'.length));
    });
    expect(
      declared.length,
      `PHASE-N1 audit verdict: expected all ${CANONICAL_CONTROLLERS.length} controllers to declare Agent, got ${declared.length}`
    ).toBe(CANONICAL_CONTROLLERS.length);
  });
});
