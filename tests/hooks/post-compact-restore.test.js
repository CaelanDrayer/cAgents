import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

/**
 * post-compact-restore.cjs — contract updated by thinking-block 400 fix
 * (run_team-thinking-400_260531_001, commit 53e6ca7a).
 *
 * Previous contract: emit a top-level systemMessage with goal/state/work-items.
 * New contract: write the same advisory text to
 *   cagents-memory/_system/logs/post-compact_{YYYY-MM-DD}.log
 * and return { continue: true } (no systemMessage). The Anthropic API
 * thinking-block immutability contract forbids emitting systemMessage on
 * PostCompact because it can attach to the just-rewritten assistant turn's
 * content array.
 *
 * Tests assert the new contract: continue:true, no systemMessage, log file
 * written with goal/domain/phase/work-item content.
 */

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'post-compact-restore.cjs');
const TEST_SESSION = 'act_test-post-compact_260317_999';

function runHook(input, env = {}) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ...env } }
  );
  return JSON.parse(result.trim());
}

function readLatestLog(tmpDir) {
  const logsDir = join(tmpDir, 'cagents-memory', '_system', 'logs');
  if (!existsSync(logsDir)) return '';
  const files = readdirSync(logsDir).filter(f => f.startsWith('post-compact_'));
  if (files.length === 0) return '';
  // Read all matching files concatenated (one is enough in practice)
  return files.map(f => readFileSync(join(logsDir, f), 'utf8')).join('\n');
}

describe('post-compact-restore.cjs', () => {
  let tmpDir;
  let sessionDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'post-compact-restore-test-'));
    sessionDir = join(tmpDir, 'cagents-memory', 'sessions', TEST_SESSION);
    mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
    writeFileSync(join(sessionDir, 'status.yaml'), 'phase: coordinating\n');
    writeFileSync(
      join(sessionDir, 'workflow', 'plan.yaml'),
      'mission: "Build auth system"\ndomain: engineering\ntier: 3\n'
    );
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return continue true with no active session', () => {
    rmSync(sessionDir, { recursive: true, force: true });
    const result = runHook({}, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeUndefined();
  });

  it('thinking-block contract: returns continue:true with no systemMessage', () => {
    const result = runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeUndefined();
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('writes mission from plan.yaml to disk log instead of systemMessage', () => {
    runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const log = readLatestLog(tmpDir);
    expect(log).toContain('Build auth system');
  });

  it('writes domain to disk log', () => {
    runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const log = readLatestLog(tmpDir);
    expect(log).toContain('engineering');
  });

  it('writes current phase to disk log', () => {
    runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const log = readLatestLog(tmpDir);
    expect(log).toContain('coordinating');
  });

  it('writes work item counts to disk log when coordination_log exists', () => {
    writeFileSync(
      join(sessionDir, 'workflow', 'coordination_log.yaml'),
      [
        'schema_version: "1"',
        'controller: cagents:tech-lead',
        'status: in_progress',
        'implementation_tasks:',
        '  - task_id: WI-1',
        '    status: completed',
        '  - task_id: WI-2',
        '    status: in_progress',
        '  - task_id: WI-3',
        '    status: pending',
      ].join('\n')
    );
    runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const log = readLatestLog(tmpDir);
    expect(log).toContain('1 done');
    expect(log).toContain('in progress');
    expect(log).toContain('1 pending');
  });

  it('writes controller name to disk log when coordination_log exists', () => {
    writeFileSync(
      join(sessionDir, 'workflow', 'coordination_log.yaml'),
      'schema_version: "1"\ncontroller: cagents:tech-lead\nstatus: completed\n'
    );
    runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const log = readLatestLog(tmpDir);
    expect(log).toContain('cagents:tech-lead');
  });

  it('disk log entry stays under 2000 chars per invocation', () => {
    writeFileSync(
      join(sessionDir, 'workflow', 'coordination_log.yaml'),
      'schema_version: "1"\ncontroller: cagents:tech-lead\nstatus: in_progress\n'
    );
    runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const log = readLatestLog(tmpDir);
    // Single entry should be well under 800 chars (matches old systemMessage budget).
    // Allow some envelope for the timestamp/session-id header line.
    expect(log.length).toBeLessThan(1500);
  });

  it('works without coordination_log.yaml — log still has Goal', () => {
    runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const log = readLatestLog(tmpDir);
    expect(log).toContain('Goal');
  });

  it('works without plan.yaml — log still has phase info', () => {
    rmSync(join(sessionDir, 'workflow', 'plan.yaml'));
    runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const log = readLatestLog(tmpDir);
    expect(log).toContain('coordinating');
  });

  it('writes resume instruction to disk log', () => {
    runHook({ session_id: TEST_SESSION }, { CLAUDE_PROJECT_DIR: tmpDir });
    const log = readLatestLog(tmpDir);
    expect(log).toContain('Resume');
  });
});
