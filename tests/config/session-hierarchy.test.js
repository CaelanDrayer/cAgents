import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Session Hierarchy Tests
 *
 * Validates:
 * 1. Parent session ID extraction logic from --session flag paths
 * 2. /team SKILL.md contains Session Hierarchy documentation section
 * 3. /org SKILL.md nesting diagram is accurate (no /run via Skill, has execution agents via Task)
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
  it('extracts session ID from a full org->engineering path', () => {
    const input = 'Agent_Memory/sessions/org_launch-product_260317_001/engineering';
    expect(extractParentSessionId(input)).toBe('org_launch-product_260317_001');
  });

  it('extracts session ID from a team session path with trailing slash', () => {
    const input = 'Agent_Memory/sessions/team_bar_260317_001/';
    // split('/') on trailing slash produces ['Agent_Memory','sessions','team_bar_260317_001','']
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
    const input = 'Agent_Memory/other/org_foo_260317_001/engineering';
    expect(extractParentSessionId(input)).toBe(null);
  });

  it('extracts session ID from an absolute path', () => {
    const input = '/home/user/cAgents/Agent_Memory/sessions/org_foo_260317_002/business';
    expect(extractParentSessionId(input)).toBe('org_foo_260317_002');
  });

  it('handles path with only sessions/ and a session ID (no subdirectory)', () => {
    const input = 'Agent_Memory/sessions/org_foo_260317_001';
    expect(extractParentSessionId(input)).toBe('org_foo_260317_001');
  });

  it('extracts from paths with different session type prefixes', () => {
    expect(extractParentSessionId('Agent_Memory/sessions/run_fix-auth_260317_001/subdir'))
      .toBe('run_fix-auth_260317_001');
    expect(extractParentSessionId('Agent_Memory/sessions/review_audit_260317_001/subdir'))
      .toBe('review_audit_260317_001');
    expect(extractParentSessionId('Agent_Memory/sessions/designer_ui_260317_001/subdir'))
      .toBe('designer_ui_260317_001');
  });
});

// ============================================================
// /team SKILL.md documentation contracts
// ============================================================
describe('/team SKILL.md documentation', () => {
  const teamSkill = readFileSync(
    join(process.cwd(), '.claude', 'skills', 'team', 'SKILL.md'),
    'utf8'
  );

  it('contains a Session Hierarchy section', () => {
    expect(teamSkill).toContain('## Session Hierarchy');
  });

  it('documents that /team creates team_ sessions (not run_)', () => {
    // Check both the assertion about team_ and the explicit NOT run_ statement
    expect(teamSkill).toContain('team_*');
    expect(teamSkill).toMatch(/does NOT create.*run_|NOT create.*run_\*/);
  });

  it('documents the max 2-level hierarchy constraint', () => {
    expect(teamSkill).toMatch(/2-level|two-level|max 2 levels|max 2-level/i);
  });

  it('documents controllers tracked via agent_tree.yaml', () => {
    expect(teamSkill).toContain('agent_tree.yaml');
  });

  it('documents child_controllers.yaml manifest', () => {
    expect(teamSkill).toContain('child_controllers.yaml');
  });

  it('contains Parent Session Extraction subsection in Step 2a', () => {
    expect(teamSkill).toContain('Parent Session Extraction');
  });

  it('has updated instruction.yaml template with EXTRACTED_PARENT_SESSION_ID', () => {
    expect(teamSkill).toContain('EXTRACTED_PARENT_SESSION_ID');
  });

  it('documents the extraction logic for the --session flag path', () => {
    // Should mention splitting by / to find sessions/ segment
    expect(teamSkill).toMatch(/split.*sessions|sessions.*split/i);
  });
});

// ============================================================
// /org SKILL.md nesting diagram contracts
// ============================================================
describe('/org SKILL.md nesting diagram', () => {
  const orgSkill = readFileSync(
    join(process.cwd(), '.claude', 'skills', 'org', 'SKILL.md'),
    'utf8'
  );

  it('nesting diagram does NOT show /run via Skill as a level', () => {
    // The old incorrect diagram had '/run via Skill (level 0 fork)'
    // This should no longer appear in the nesting model diagram
    expect(orgSkill).not.toContain('/run via Skill (level 0 fork)');
  });

  it('nesting diagram shows execution agents via Task', () => {
    expect(orgSkill).toContain('execution agents via Task');
  });

  it('nesting diagram shows level 2 for execution agents', () => {
    expect(orgSkill).toContain('level 2');
  });

  it('contains a note about the 2-level nesting constraint', () => {
    expect(orgSkill).toMatch(/2-level.*nesting|nesting.*2-level/i);
  });

  it('Step 7 description does not reference /run invocation by teammates', () => {
    // Old text: "each teammate to invoke /run without nesting issues"
    expect(orgSkill).not.toContain('each teammate to invoke /run');
  });
});
