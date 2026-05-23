/**
 * LP-22 (v12.x): subagent-stop-tracker writes one-liner to MEMORY.md on pattern fire
 *
 * Asserts the .claude/hooks/subagent-stop-tracker.cjs hook appends a one-line
 * pattern entry to MEMORY.md when a SubagentStop event's last_assistant_message
 * matches one of the heuristic patterns:
 *   - "depth-1 stripping"
 *   - "graceful degradation"
 *   - "BLOCKED escalation"
 *
 * Uses CAGENTS_TEST_MEMORY_PATH env var to redirect the append target to a temp
 * file so the test doesn't pollute the user's real auto-memory.
 *
 * Pattern: spawn the hook with a JSON payload on stdin + env override, then
 * read the temp MEMORY.md and assert the one-liner is present (or absent for
 * non-matching cases). Cap is 200 chars max.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const HOOK_PATH = path.join(REPO_ROOT, '.claude', 'hooks', 'subagent-stop-tracker.cjs');

let tmpDir;
let tmpMemoryPath;

function runHook(input, env = {}) {
  const payload = JSON.stringify(input);
  const proc = spawnSync('node', [HOOK_PATH], {
    input: payload,
    encoding: 'utf8',
    timeout: 5000,
    env: { ...process.env, ...env },
  });
  let parsed = null;
  try { parsed = JSON.parse((proc.stdout || '').trim()); } catch { /* hook may write malformed if crashed */ }
  return { proc, parsed };
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lp22-memory-'));
  tmpMemoryPath = path.join(tmpDir, 'MEMORY.md');
  // Seed file so we can detect append (vs create) — also exercises append path
  fs.writeFileSync(tmpMemoryPath, '# Test MEMORY.md\n\n');
});

afterEach(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe('LP-22: subagent-stop-tracker MEMORY.md append on pattern fire', () => {
  it('hook source exists at .claude/hooks/subagent-stop-tracker.cjs', () => {
    expect(fs.existsSync(HOOK_PATH)).toBe(true);
  });

  it('appends one-liner when last_assistant_message contains "depth-1 stripping"', () => {
    runHook(
      {
        agent_type: 'cagents:test-agent',
        agent_id: 'test-agent-001',
        session_id: 'lp22-test',
        last_assistant_message:
          'Encountered depth-1 stripping when trying Agent tool. Falling back to direct execution.',
      },
      { CAGENTS_TEST_MEMORY_PATH: tmpMemoryPath },
    );
    const content = fs.readFileSync(tmpMemoryPath, 'utf8');
    // Original seed must still be present
    expect(content).toMatch(/^# Test MEMORY\.md/);
    // A new one-liner must have been appended
    const newLines = content.split('\n').filter(l => l.startsWith('- '));
    expect(newLines.length).toBeGreaterThanOrEqual(1);
    // The appended one-liner mentions the pattern slug
    expect(content).toMatch(/depth-1 stripping/i);
  });

  it('appends one-liner when last_assistant_message contains "graceful degradation"', () => {
    runHook(
      {
        agent_type: 'cagents:test-agent',
        agent_id: 'test-agent-002',
        session_id: 'lp22-test',
        last_assistant_message:
          'Used graceful degradation path because Agent tool was stripped at depth 1.',
      },
      { CAGENTS_TEST_MEMORY_PATH: tmpMemoryPath },
    );
    const content = fs.readFileSync(tmpMemoryPath, 'utf8');
    expect(content).toMatch(/graceful degradation/i);
  });

  it('appends one-liner when last_assistant_message contains "BLOCKED escalation"', () => {
    runHook(
      {
        agent_type: 'cagents:test-agent',
        agent_id: 'test-agent-003',
        session_id: 'lp22-test',
        last_assistant_message:
          'Status: BLOCKED escalation — dependency missing, surfacing to user.',
      },
      { CAGENTS_TEST_MEMORY_PATH: tmpMemoryPath },
    );
    const content = fs.readFileSync(tmpMemoryPath, 'utf8');
    expect(content).toMatch(/BLOCKED escalation/i);
  });

  it('does NOT append when last_assistant_message contains no pattern keyword', () => {
    const before = fs.readFileSync(tmpMemoryPath, 'utf8');
    runHook(
      {
        agent_type: 'cagents:test-agent',
        agent_id: 'test-agent-004',
        session_id: 'lp22-test',
        last_assistant_message: 'All work items completed successfully. Status: DONE.',
      },
      { CAGENTS_TEST_MEMORY_PATH: tmpMemoryPath },
    );
    const after = fs.readFileSync(tmpMemoryPath, 'utf8');
    expect(after).toBe(before);
  });

  it('appended one-liner is at most 200 chars (single line)', () => {
    const longMessage =
      'graceful degradation encountered: ' + 'x'.repeat(2000);
    runHook(
      {
        agent_type: 'cagents:test-agent',
        agent_id: 'test-agent-005',
        session_id: 'lp22-test',
        last_assistant_message: longMessage,
      },
      { CAGENTS_TEST_MEMORY_PATH: tmpMemoryPath },
    );
    const content = fs.readFileSync(tmpMemoryPath, 'utf8');
    const newLines = content
      .split('\n')
      .filter(l => l.startsWith('- '));
    expect(newLines.length).toBeGreaterThanOrEqual(1);
    for (const line of newLines) {
      expect(line.length).toBeLessThanOrEqual(200);
    }
  });

  it('does not append when last_assistant_message is empty', () => {
    const before = fs.readFileSync(tmpMemoryPath, 'utf8');
    runHook(
      {
        agent_type: 'cagents:test-agent',
        agent_id: 'test-agent-006',
        session_id: 'lp22-test',
        last_assistant_message: '',
      },
      { CAGENTS_TEST_MEMORY_PATH: tmpMemoryPath },
    );
    const after = fs.readFileSync(tmpMemoryPath, 'utf8');
    expect(after).toBe(before);
  });

  it('creates MEMORY.md if missing and pattern fires', () => {
    // Delete the seed so the file does not yet exist
    fs.rmSync(tmpMemoryPath);
    expect(fs.existsSync(tmpMemoryPath)).toBe(false);
    runHook(
      {
        agent_type: 'cagents:test-agent',
        agent_id: 'test-agent-007',
        session_id: 'lp22-test',
        last_assistant_message: 'Pattern: depth-1 stripping observed in this run.',
      },
      { CAGENTS_TEST_MEMORY_PATH: tmpMemoryPath },
    );
    expect(fs.existsSync(tmpMemoryPath)).toBe(true);
    const content = fs.readFileSync(tmpMemoryPath, 'utf8');
    expect(content).toMatch(/depth-1 stripping/i);
  });
});
