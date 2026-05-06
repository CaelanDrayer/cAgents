// Phase 10 (V11.1.12): post-write-validator.cjs SKILL.md schema validation regression test
// Asserts:
//   (a) Writing a SKILL.md missing 'archetype:' triggers a warning systemMessage
//   (b) Writing a valid SKILL.md returns no skill-schema warning
//   (c) Writing a non-SKILL.md file is unaffected by skill-schema validation
//   (d) Writing a SKILL.md under .claude/skills/ (user-skill) is NOT validated as an agent
//
// Refs:
//   - .claude/hooks/post-write-validator.cjs § "SKILL.md schema validation"
//   - cagents-memory/sessions/team_continue-cagents-w6_260505_001/workflow/work_items.yaml TASK-10
//   - example/external-skills/RESUME_W6_PARTIAL_PROMPT.md § Section F

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const HOOK_PATH = join(process.cwd(), '.claude', 'hooks', 'post-write-validator.cjs');

function runHook(input, env = {}) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ...env } }
  );
  return JSON.parse(result.trim());
}

const VALID_SKILL_MD = `---
name: test-agent
archetype: developer
branch: backend
description: "Test agent for hook regression."
metadata:
  tier: execution
  version: "1.0.0"
  model: sonnet
allowed-tools: Read Write
---

# Test Agent

Body content.
`;

const INVALID_NO_ARCHETYPE = `---
name: test-agent
description: "Missing archetype field."
metadata:
  tier: execution
  version: "1.0.0"
---

# Test Agent
`;

describe('post-write-validator.cjs SKILL.md schema validation (Phase 10)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'skill-schema-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('(a) writes a SKILL.md missing archetype: triggers a warning systemMessage', () => {
    const dir = join(tmpDir, 'developer', 'backend', 'test-agent');
    mkdirSync(dir, { recursive: true });
    const skillFile = join(dir, 'SKILL.md');
    writeFileSync(skillFile, INVALID_NO_ARCHETYPE);

    const result = runHook(
      { tool_name: 'Write', tool_input: { file_path: skillFile } },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );

    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeDefined();
    expect(result.systemMessage).toContain('[skill-schema]');
    expect(result.systemMessage).toContain('archetype');
  });

  it('(b) writes a valid SKILL.md returns no skill-schema warning', () => {
    const dir = join(tmpDir, 'developer', 'backend', 'test-agent');
    mkdirSync(dir, { recursive: true });
    const skillFile = join(dir, 'SKILL.md');
    writeFileSync(skillFile, VALID_SKILL_MD);

    const result = runHook(
      { tool_name: 'Write', tool_input: { file_path: skillFile } },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );

    expect(result.continue).toBe(true);
    // Either no systemMessage at all, or one that does NOT contain [skill-schema]
    if (result.systemMessage) {
      expect(result.systemMessage).not.toContain('[skill-schema]');
    }
  });

  it('(c) writes a non-SKILL.md file is unaffected by skill-schema validation', () => {
    const dir = join(tmpDir, 'developer', 'backend', 'test-agent');
    mkdirSync(dir, { recursive: true });
    const otherFile = join(dir, 'README.md');
    writeFileSync(otherFile, '# Just a README\n\nNot a SKILL.md.\n');

    const result = runHook(
      { tool_name: 'Write', tool_input: { file_path: otherFile } },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );

    expect(result.continue).toBe(true);
    if (result.systemMessage) {
      expect(result.systemMessage).not.toContain('[skill-schema]');
    }
  });

  it('(d) writes a SKILL.md under .claude/skills/ (user-skill) is NOT validated as an agent', () => {
    const dir = join(tmpDir, '.claude', 'skills', 'my-user-skill');
    mkdirSync(dir, { recursive: true });
    const skillFile = join(dir, 'SKILL.md');
    // Use frontmatter that would FAIL agent schema (no archetype) - but should be accepted as user-skill
    writeFileSync(skillFile, INVALID_NO_ARCHETYPE);

    const result = runHook(
      { tool_name: 'Write', tool_input: { file_path: skillFile } },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );

    expect(result.continue).toBe(true);
    if (result.systemMessage) {
      expect(result.systemMessage).not.toContain('[skill-schema]');
    }
  });
});
