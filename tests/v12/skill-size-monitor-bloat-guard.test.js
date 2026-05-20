/**
 * WI-W4.4 (d): skill-size-monitor bloat-guard regression
 *
 * Asserts the .claude/hooks/skill-size-monitor.cjs hook denies writes of
 * SKILL.md files exceeding the 900-line block threshold. Complementary to
 * the existing tests/hooks/skill-size-monitor.test.js (which already covers
 * the same hook's full behavior matrix) — this v12 test pins the bloat-guard
 * specifically as a v12 contract surface so a future refactor of the hook
 * cannot silently weaken the block.
 *
 * Pattern: spawn the hook with a JSON payload on stdin, parse stdout JSON,
 * assert the response indicates deny (createHook factory translates the
 * `deny: true` shorthand into hookSpecificOutput.permissionDecision='deny').
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const HOOK_PATH = path.join(REPO_ROOT, '.claude', 'hooks', 'skill-size-monitor.cjs');

function runHook(input) {
  const payload = JSON.stringify(input);
  const proc = spawnSync('node', [HOOK_PATH], {
    input: payload,
    encoding: 'utf8',
    timeout: 5000,
  });
  return JSON.parse((proc.stdout || '').trim());
}

function makeContent(lines) {
  return Array(lines).fill('# line').join('\n');
}

describe('WI-W4.4 (d): skill-size-monitor bloat-guard (v12 contract)', () => {
  it('hook source exists at .claude/hooks/skill-size-monitor.cjs', () => {
    expect(fs.existsSync(HOOK_PATH)).toBe(true);
  });

  it('SKILL.md write at 1000 lines (> 900 block threshold) -> deny', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: {
        file_path: '/tmp/v12-test/agent/SKILL.md',
        content: makeContent(1000),
      },
    });
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('deny reason references the block threshold or resources/ split guidance', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: {
        file_path: '/tmp/v12-test/agent/SKILL.md',
        content: makeContent(950),
      },
    });
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    const reason = result.hookSpecificOutput?.permissionDecisionReason || '';
    // The hook's reason mentions either the block threshold value (900) or
    // the resources/ split prescription (or both).
    expect(reason).toMatch(/(900|resources\/|block)/i);
  });

  it('SKILL.md write at 500 lines (under warn threshold) -> pass-through', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: {
        file_path: '/tmp/v12-test/agent/SKILL.md',
        content: makeContent(500),
      },
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
    expect(result.systemMessage).toBeUndefined();
  });

  it('SKILL.md write at 700 lines (between warn and block) -> warn but not deny', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: {
        file_path: '/tmp/v12-test/agent/SKILL.md',
        content: makeContent(700),
      },
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
    expect(result.systemMessage).toBeDefined();
  });

  it('non-SKILL.md file (e.g. README.md) is ignored regardless of size', () => {
    const result = runHook({
      tool_name: 'Write',
      tool_input: {
        file_path: '/tmp/v12-test/agent/README.md',
        content: makeContent(2000),  // huge — should still pass-through
      },
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
    expect(result.systemMessage).toBeUndefined();
  });

  it('non-Write/Edit tool (e.g. Read) is ignored', () => {
    const result = runHook({
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/v12-test/agent/SKILL.md' },
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
  });
});
