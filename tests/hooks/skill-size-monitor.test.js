import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'skill-size-monitor.cjs');
const TMP_DIR = join(process.cwd(), 'tests', 'fixtures', 'tmp_ssm');

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, CLAUDE_PROJECT_DIR: TMP_DIR } }
  );
  return JSON.parse(result.trim());
}

function makeContent(lines) {
  // Generate content with exactly N lines (N-1 newlines).
  return Array(lines).fill('# line').join('\n');
}

describe('skill-size-monitor.cjs', () => {
  beforeEach(() => {
    mkdirSync(TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    try { rmSync(TMP_DIR, { recursive: true, force: true }); } catch {}
  });

  it('hook file should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('100-line SKILL.md write -> hook returns continue:true with no warning', () => {
    const skillPath = join(TMP_DIR, 'SKILL.md');
    const content = makeContent(100);
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: skillPath, content }
    });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeUndefined();
    // No deny
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
  });

  it('700-line SKILL.md write -> hook returns systemMessage referencing line count', () => {
    const skillPath = join(TMP_DIR, 'SKILL.md');
    const content = makeContent(700);
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: skillPath, content }
    });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeDefined();
    // Should mention the line count or "warn"
    expect(result.systemMessage).toMatch(/700|warn/i);
    // Not a deny
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
  });

  it('1000-line SKILL.md write -> hook returns deny with reason mentioning resources/ or block threshold', () => {
    const skillPath = join(TMP_DIR, 'SKILL.md');
    const content = makeContent(1000);
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: skillPath, content }
    });
    // createHook factory turns deny shorthand into hookSpecificOutput.permissionDecision='deny'
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    const reason = result.hookSpecificOutput?.permissionDecisionReason || '';
    expect(reason).toMatch(/resources\/|block threshold/i);
  });

  it('non-SKILL.md file write -> hook returns pass-through (continue:true, no warning, no deny)', () => {
    const filePath = join(TMP_DIR, 'file.md');
    const content = makeContent(2000);  // Even at 2000 lines, non-SKILL.md should be ignored
    const result = runHook({
      tool_name: 'Write',
      tool_input: { file_path: filePath, content }
    });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeUndefined();
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
  });
});
