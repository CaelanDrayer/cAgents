import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Session Hierarchy Tests
 *
 * Validates:
 * 1. Parent session ID extraction logic from --session flag paths
 * 2. /team SKILL.md contains Session Hierarchy documentation section
 * 3. /team SKILL.md (strategic mode) nesting diagram is accurate
 *    (no /run via Skill, has execution agents via Agent)
 *
 * v12.2.0: /org was absorbed into /team strategic mode. The historical
 * /org-specific assertions are now exercised against /team SKILL.md (which
 * houses the strategic-mode wave loop) and its strategic-mode reference docs.
 *
 * Related issues: ISSUE-001, ISSUE-002, ISSUE-004
 */

// ============================================================
// Helper: extractParentSessionId
// Mirrors the extraction logic documented in /team SKILL.md Step 2a
// ============================================================
function extractParentSessionId(sessionFlag) {
  if (!sessionFlag) return null;
  const parts = sessionFlag.split('/');
  const sessionsIndex = parts.indexOf('sessions');
  if (sessionsIndex === -1) return null;
  const candidate = parts[sessionsIndex + 1];
  if (!candidate || candidate.trim() === '') return null;
  return candidate;
}

describe('Parent Session ID Extraction', () => {
  it('extracts session ID from a full team->engineering path', () => {
    const input = 'cagents-memory/sessions/team_launch-product_260317_001/engineering';
    expect(extractParentSessionId(input)).toBe('team_launch-product_260317_001');
  });

  it('extracts session ID from a team session path with trailing slash', () => {
    const input = 'cagents-memory/sessions/team_bar_260317_001/';
    // split('/') on trailing slash produces ['cagents-memory','sessions','team_bar_260317_001','']
    // sessions is at index 1, candidate is at index 2 = 'team_bar_260317_001'
    expect(extractParentSessionId(input)).toBe('team_bar_260317_001');
  });

  it('returns null for null input', () => {
    expect(extractParentSessionId(null)).toBe(null);
  });

  it('returns null for empty string input', () => {
    expect(extractParentSessionId('')).toBe(null);
  });

  it('returns null for path without sessions/ segment', () => {
    const input = 'cagents-memory/other/team_foo_260317_001/engineering';
    expect(extractParentSessionId(input)).toBe(null);
  });

  it('extracts session ID from an absolute path', () => {
    const input = '/home/user/cAgents/cagents-memory/sessions/team_foo_260317_002/business';
    expect(extractParentSessionId(input)).toBe('team_foo_260317_002');
  });

  it('handles path with only sessions/ and a session ID (no subdirectory)', () => {
    const input = 'cagents-memory/sessions/team_foo_260317_001';
    expect(extractParentSessionId(input)).toBe('team_foo_260317_001');
  });

  it('extracts from paths with different session type prefixes', () => {
    expect(extractParentSessionId('cagents-memory/sessions/act_fix-auth_260317_001/subdir'))
      .toBe('act_fix-auth_260317_001');
    expect(extractParentSessionId('cagents-memory/sessions/review_audit_260317_001/subdir'))
      .toBe('review_audit_260317_001');
    expect(extractParentSessionId('cagents-memory/sessions/designer_ui_260317_001/subdir'))
      .toBe('designer_ui_260317_001');
  });
});

// ============================================================
// /team documentation contracts (SKILL.md body + reference docs)
//
// Per Three-Tier Progressive Disclosure (.claude/rules/core/skill-format.md),
// detailed content lives under .claude/skills/team/reference/ and is referenced
// from SKILL.md via @reference/X.md links. The hierarchy-specific content sits
// in reference/parent-session-extraction.md; SKILL.md keeps only the headline
// link and short summary so the body stays under the size ceiling.
// ============================================================
describe('/team documentation (SKILL.md + reference docs)', () => {
  const teamSkill = readFileSync(
    join(process.cwd(), '.claude', 'skills', 'team', 'SKILL.md'),
    'utf8'
  );
  const teamParentSessionDoc = readFileSync(
    join(process.cwd(), '.claude', 'skills', 'team', 'reference', 'parent-session-extraction.md'),
    'utf8'
  );

  it('SKILL.md contains a Session Hierarchy section (or links to the reference doc)', () => {
    expect(
      teamSkill.includes('## Session Hierarchy') ||
        teamSkill.includes('@reference/parent-session-extraction.md') ||
        teamSkill.includes('parent-session-extraction.md'),
      'team SKILL.md should either contain a Session Hierarchy section or @-link the reference doc'
    ).toBe(true);
  });

  it('documents that /team creates team_ sessions (not act_)', () => {
    // Either SKILL.md or the reference doc must state this contract.
    const combined = teamSkill + '\n' + teamParentSessionDoc;
    expect(combined).toContain('team_*');
    expect(combined).toMatch(/does NOT create.*act_|NOT create.*act_\*/);
  });

  it('documents the max 2-level hierarchy constraint', () => {
    const combined = teamSkill + '\n' + teamParentSessionDoc;
    expect(combined).toMatch(/2-level|two-level|max 2 levels|max 2-level/i);
  });

  it('documents controllers tracked via agent_tree.yaml', () => {
    const combined = teamSkill + '\n' + teamParentSessionDoc;
    expect(combined).toContain('agent_tree.yaml');
  });

  it('documents child_controllers.yaml manifest', () => {
    const combined = teamSkill + '\n' + teamParentSessionDoc;
    expect(combined).toContain('child_controllers.yaml');
  });

  it('contains Parent Session Extraction subsection', () => {
    const combined = teamSkill + '\n' + teamParentSessionDoc;
    expect(combined).toContain('Parent Session Extraction');
  });

  it('has updated instruction.yaml template with EXTRACTED_PARENT_SESSION_ID', () => {
    const combined = teamSkill + '\n' + teamParentSessionDoc;
    expect(combined).toContain('EXTRACTED_PARENT_SESSION_ID');
  });

  it('documents the extraction logic for the --session flag path', () => {
    // Should mention splitting by / to find sessions/ segment
    const combined = teamSkill + '\n' + teamParentSessionDoc;
    expect(combined).toMatch(/split.*sessions|sessions.*split/i);
  });
});

// ============================================================
// /team strategic mode nesting diagram contracts (v12.2.0)
//
// Pre-v12.2.0 these assertions lived against /org SKILL.md. v12.2.0 absorbed
// /org into /team strategic mode; the nesting-model contract now lives in
// /team SKILL.md + .claude/skills/team/reference/architecture.md.
// ============================================================
describe('/team strategic mode nesting diagram (replaces /org)', () => {
  const teamArchitecture = readFileSync(
    join(process.cwd(), '.claude', 'skills', 'team', 'reference', 'architecture.md'),
    'utf8'
  );

  it('nesting diagram does NOT show /run via Skill as a teammate-level fork', () => {
    // The old incorrect /org diagram had '/run via Skill (level 0 fork)' for teammates.
    // /team architecture explicitly documents why no Skill("run") fork is used.
    expect(teamArchitecture).not.toContain('/run via Skill (level 0 fork)');
  });

  it('nesting model documents execution agents via Agent tool', () => {
    expect(teamArchitecture).toMatch(/execution agents.*via Agent/);
  });

  it('nesting model documents the 5-level depth budget (teammate -> execution agents, Agent available)', () => {
    // As of CC 2.1.172 / v12.17.0 subagents can nest up to 5 levels deep.
    // architecture.md documents this budget and that teammates delegate to
    // execution agents via the Agent tool.
    expect(teamArchitecture).toMatch(/5-level depth budget|up to 5 subagent generations|5 levels|5-level/i);
    expect(teamArchitecture).toMatch(/execution agents via Agent/i);
  });

  it('explicitly forbids teammates from invoking /run via Skill', () => {
    // /team architecture must explain why teammates DON'T invoke /run via Skill.
    expect(teamArchitecture).toMatch(/no Skill\("run"\) fork|teammates do NOT invoke \/run|Why no Skill/i);
  });
});
