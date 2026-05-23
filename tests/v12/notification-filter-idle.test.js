/**
 * LP-15 (v12.7.x self-improvement): notification.cjs filters idle_prompt noise.
 *
 * Audit found that `idle_prompt` notifications accounted for 75%+ of the
 * notification log volume — these are emitted every time Claude Code goes
 * idle and provide no diagnostic value to cAgents (we have our own
 * teammate-idle-handler.cjs for the work-routing path). The fix:
 * `notification.cjs` early-returns without logging when the inbound
 * payload's `notification_type` (or `type`) is `idle_prompt`.
 *
 * Other notification types (e.g., `permission_prompt`) MUST still log.
 *
 * Test contract (failing-before / passing-after per CLAUDE.md mandate):
 *   1. Feeding `idle_prompt` → returns `{ continue: true }` and writes NO
 *      line to today's `notifications_<YYYY-MM-DD>.log`.
 *   2. Feeding `permission_prompt` → returns `{ continue: true }` AND
 *      writes one line to today's log.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const HOOK_PATH = path.join(REPO_ROOT, '.claude', 'hooks', 'notification.cjs');

function todayLogPath(projectDir) {
  const dateStr = new Date().toISOString().split('T')[0];
  return path.join(projectDir, 'cagents-memory', '_system', 'logs', `notifications_${dateStr}.log`);
}

function runHook(payload, projectDir) {
  // hook-utils.cjs resolves AGENT_MEMORY_DIR from CLAUDE_PROJECT_DIR, so
  // point that env var at our tmp dir to isolate log writes from the real
  // cagents-memory/ tree.
  const env = { ...process.env, CLAUDE_PROJECT_DIR: projectDir };
  // CLAUDE_PLUGIN_ROOT is checked first if present and contains CLAUDE.md;
  // unset it so the PROJECT_ROOT fallback (CLAUDE_PROJECT_DIR) wins for
  // the AGENT_MEMORY_DIR resolution.
  delete env.CLAUDE_PLUGIN_ROOT;
  const result = spawnSync('node', [HOOK_PATH], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env,
  });
  return result;
}

describe('LP-15: notification.cjs filters idle_prompt', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cagents-notif-test-'));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('idle_prompt notifications produce continue:true with NO log write', () => {
    const result = runHook({
      notification_type: 'idle_prompt',
      message: 'Claude is idle',
      session_id: 'test-session',
    }, tmpDir);

    expect(result.status).toBe(0);
    let parsed;
    try { parsed = JSON.parse(result.stdout); }
    catch { throw new Error(`Invalid JSON stdout: ${result.stdout}\nstderr: ${result.stderr}`); }
    expect(parsed.continue).toBe(true);

    // No log file should have been created (early return before mkdir+append).
    const logFile = todayLogPath(tmpDir);
    expect(fs.existsSync(logFile)).toBe(false);
  });

  it('permission_prompt notifications still log one line', () => {
    const result = runHook({
      notification_type: 'permission_prompt',
      message: 'Permission needed',
      session_id: 'test-session',
    }, tmpDir);

    expect(result.status).toBe(0);
    let parsed;
    try { parsed = JSON.parse(result.stdout); }
    catch { throw new Error(`Invalid JSON stdout: ${result.stdout}\nstderr: ${result.stderr}`); }
    expect(parsed.continue).toBe(true);

    const logFile = todayLogPath(tmpDir);
    expect(fs.existsSync(logFile)).toBe(true);
    const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean);
    expect(lines.length).toBe(1);
    const entry = JSON.parse(lines[0]);
    expect(entry.type).toBe('permission_prompt');
    expect(entry.message).toBe('Permission needed');
  });

  it('idle_prompt under the alternate `type` field is also filtered', () => {
    // notification.cjs reads both `input.notification_type` AND `input.type` —
    // the filter must cover both paths.
    const result = runHook({
      type: 'idle_prompt',
      message: 'Claude is idle (alt field)',
      session_id: 'test-session',
    }, tmpDir);

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.continue).toBe(true);
    expect(fs.existsSync(todayLogPath(tmpDir))).toBe(false);
  });
});
