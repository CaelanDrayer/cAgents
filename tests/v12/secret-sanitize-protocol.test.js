/**
 * v12.0.4 (REC-1): Secret sanitize-and-restore protocol regression tests.
 *
 * Covers:
 *   1. Default mode (no env var) preserves pre-v12.0.4 block behavior.
 *   2. CAGENTS_SECRET_MODE=sanitize produces BLOCK_<hex> placeholder + a
 *      backup manifest entry, writes sanitized content to disk.
 *   3. secret-restore.cjs restores original content from the manifest.
 *   4. Restore on no manifest is a no-op (doesn't crash).
 *   5. Hashes (not secret values) are stored in the manifest.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, mkdirSync, mkdtempSync, rmSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const DETECT_HOOK = join(HOOKS_DIR, 'secret-detection.cjs');
const RESTORE_HOOK = join(HOOKS_DIR, 'secret-restore.cjs');

// Use a clearly-fake placeholder that matches the regex pattern shape but is
// obviously not a real secret. We split to avoid push-protection false positives.
// Pattern target: sk-ant-* (Anthropic API Key) — 40+ chars after prefix.
const FAKE_SECRET = 'sk-' + 'ant-' + 'NOT_A_REAL_SECRET_1234567890_FAKE_TEST_VALUE_HERE_xyz';

// HS-5: every hook spawn gets CLAUDE_PROJECT_DIR=<mkdtemp project>, so the
// backups and the secret-restore log never reach the real repo cagents-memory/.
let tmpProj;

function runHook(hookPath, input, env = {}) {
  const inputJson = JSON.stringify(input);
  const result = spawnSync('node', [hookPath], {
    input: inputJson,
    encoding: 'utf8',
    // 60000 (was 5000): spawnSync does NOT throw on timeout — on a killed spawn
    // `lines[lines.length-1] || '{}'` silently yielded {} (a misleading verdict
    // fed to `.hookSpecificOutput.permissionDecision`/`.continue` assertions).
    // Raise the budget and FAIL LOUD on abnormal termination instead.
    timeout: 60000,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      VITEST: 'true',
      CAGENTS_HOOK_DEDUP_DISABLE: '1',
      CLAUDE_PROJECT_DIR: tmpProj,
      ...env
    }
  });
  // secret-detection.cjs / secret-restore.cjs (via createHook) ALWAYS exit 0 with
  // one JSON line on stdout (a deny verdict is exit-0 JSON too), so any abnormal
  // termination is a spawn misfire.
  const diag = () => `status=${result.status} signal=${result.signal} error=${result.error ? result.error.message : 'none'} stdout=${JSON.stringify((result.stdout || '').slice(0, 200))} stderr=${JSON.stringify((result.stderr || '').slice(0, 500))}`;
  if (result.error) throw new Error(`secret-sanitize runHook: spawnSync errored — ${diag()}`);
  if (result.status === null) throw new Error(`secret-sanitize runHook: hook killed (timeout/signal) — ${diag()}`);
  if (result.status !== 0) throw new Error(`secret-sanitize runHook: hook exited non-zero — ${diag()}`);
  // Parse last JSON line of stdout (hooks emit exactly one JSON line).
  const lines = (result.stdout || '').trim().split('\n').filter(Boolean);
  if (lines.length === 0) throw new Error(`secret-sanitize runHook: empty stdout — ${diag()}`);
  const lastLine = lines[lines.length - 1];
  try {
    return JSON.parse(lastLine);
  } catch (e) {
    throw new Error(`secret-sanitize runHook: last stdout line not valid JSON — ${e.message} — ${diag()}`);
  }
}

describe('v12.0.4: secret sanitize-and-restore protocol', { timeout: 30000 }, () => {
  let tempDir;
  let tempFilePath;
  let backupBaseDir;
  const sessionId = `act_test-sanitize_${Date.now()}_001`;

  beforeEach(() => {
    tempDir = join(tmpdir(), `cagents-sanitize-test-${process.pid}-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    tempFilePath = join(tempDir, 'config.json');
    // Backup dir lives under the temp project's cagents-memory/_system/secret-backups/
    tmpProj = mkdtempSync(join(tmpdir(), 'cagents-secret-'));
    backupBaseDir = join(
      tmpProj,
      'cagents-memory',
      '_system',
      'secret-backups',
      sessionId
    );
  });

  afterEach(() => {
    try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
    try { rmSync(tmpProj, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('default mode (no env var) blocks secret writes (pre-v12.0.4 behavior preserved)', () => {
    const result = runHook(DETECT_HOOK, {
      session_id: sessionId,
      tool_name: 'Write',
      tool_input: {
        file_path: tempFilePath,
        content: `const apiKey = "${FAKE_SECRET}";`
      }
    });
    expect(result.hookSpecificOutput).toBeDefined();
    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    // Block-mode reason should NOT mention sanitize/BLOCK_
    expect(result.hookSpecificOutput.permissionDecisionReason).not.toMatch(/sanitize/i);
    // The target file should NOT have been written in block mode.
    expect(existsSync(tempFilePath)).toBe(false);
  });

  it('sanitize mode produces BLOCK_<hex> placeholder + backup manifest entry', () => {
    const result = runHook(
      DETECT_HOOK,
      {
        session_id: sessionId,
        tool_name: 'Write',
        tool_input: {
          file_path: tempFilePath,
          content: `const apiKey = "${FAKE_SECRET}";`
        }
      },
      { CAGENTS_SECRET_MODE: 'sanitize' }
    );

    // Still denies the original Write (so the model's secret payload doesn't
    // overwrite our sanitized version) — but the reason references sanitize.
    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toMatch(/sanitize/i);

    // The sanitized file should exist on disk with a BLOCK_<hex> placeholder.
    expect(existsSync(tempFilePath)).toBe(true);
    const written = readFileSync(tempFilePath, 'utf8');
    expect(written).toMatch(/BLOCK_[a-f0-9]{8}/);
    // The original secret value should NOT appear in the sanitized file.
    expect(written).not.toContain(FAKE_SECRET);

    // The backup dir + manifest should exist.
    const manifestPath = join(backupBaseDir, 'manifest.yaml');
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = readFileSync(manifestPath, 'utf8');
    expect(manifest).toMatch(/placeholder:\s*"BLOCK_[a-f0-9]{8}"/);
    expect(manifest).toMatch(/hash:\s*"[a-f0-9]{8}"/);
    // Manifest MUST NOT contain the secret value itself.
    expect(manifest).not.toContain(FAKE_SECRET);

    // At least one .orig backup file should exist with 0600 perms.
    const origFiles = readdirSync(backupBaseDir).filter(f => f.endsWith('.orig'));
    expect(origFiles.length).toBeGreaterThan(0);
    const origPath = join(backupBaseDir, origFiles[0]);
    const origStat = statSync(origPath);
    // Mask off file-type bits, compare permission bits.
    const perms = origStat.mode & 0o777;
    expect(perms).toBe(0o600);
  });

  it('secret-restore.cjs restores original content from manifest', () => {
    // 1. Sanitize first (creates the backup).
    runHook(
      DETECT_HOOK,
      {
        session_id: sessionId,
        tool_name: 'Write',
        tool_input: {
          file_path: tempFilePath,
          content: `const apiKey = "${FAKE_SECRET}";`
        }
      },
      { CAGENTS_SECRET_MODE: 'sanitize' }
    );

    // Sanity: sanitized version is on disk.
    expect(readFileSync(tempFilePath, 'utf8')).toMatch(/BLOCK_/);

    // 2. Run the restore hook (simulates Stop event).
    const restoreResult = runHook(RESTORE_HOOK, { session_id: sessionId });
    expect(restoreResult.continue).toBe(true);

    // 3. The file should now contain the original secret content.
    const restored = readFileSync(tempFilePath, 'utf8');
    expect(restored).toContain(FAKE_SECRET);
    expect(restored).not.toMatch(/BLOCK_[a-f0-9]{8}/);

    // 4. Manifest should be cleaned up.
    const manifestPath = join(backupBaseDir, 'manifest.yaml');
    expect(existsSync(manifestPath)).toBe(false);
  });

  it('restore on no manifest is a no-op (does not crash)', () => {
    const noManifestSession = `act_no-manifest_${Date.now()}_002`;
    const result = runHook(RESTORE_HOOK, { session_id: noManifestSession });
    expect(result.continue).toBe(true);
    // No errors, no file mutations.
  });

  it('restore is idempotent: second call on clean session is a no-op', () => {
    // 1. Sanitize + restore (drains the manifest).
    runHook(
      DETECT_HOOK,
      {
        session_id: sessionId,
        tool_name: 'Write',
        tool_input: {
          file_path: tempFilePath,
          content: `const k = "${FAKE_SECRET}";`
        }
      },
      { CAGENTS_SECRET_MODE: 'sanitize' }
    );
    runHook(RESTORE_HOOK, { session_id: sessionId });

    // File now has the original secret restored.
    const afterFirst = readFileSync(tempFilePath, 'utf8');
    expect(afterFirst).toContain(FAKE_SECRET);

    // 2. Second restore call: no manifest, no-op.
    const result = runHook(RESTORE_HOOK, { session_id: sessionId });
    expect(result.continue).toBe(true);

    // File contents unchanged.
    const afterSecond = readFileSync(tempFilePath, 'utf8');
    expect(afterSecond).toBe(afterFirst);
  });
  // WI-17 round 4 (L3): a generic `api_key="..."` group that begins before a
  // vendor token and stops at its `.` overlaps the vendor finding. Dropping the
  // later span left the vendor body in clear; the spans must merge into one
  // placeholder, and the merged token must still round-trip through restore.
  it('sanitize merges overlapping spans (no vendor-token tail left in clear) and restores', () => {
    const body = 'Q7rT2vX9pL4mN8sK1wE5yU3iO6aZ0cB'.repeat(3).slice(0, 90);
    const lead = 'Ab3Cd5Ef7Gh9Ij1Kl2Mn';
    const content = 'api_key="' + lead + 'hv' + 's.' + body + '"';
    runHook(
      DETECT_HOOK,
      { session_id: sessionId, tool_name: 'Write', tool_input: { file_path: tempFilePath, content } },
      { CAGENTS_SECRET_MODE: 'sanitize' }
    );
    const written = readFileSync(tempFilePath, 'utf8');
    expect(written).toMatch(/^api_key="BLOCK_[a-f0-9]{8}"$/);
    expect(written).not.toContain(body.slice(0, 20));
    expect(written).not.toContain(lead);

    const restoreResult = runHook(RESTORE_HOOK, { session_id: sessionId });
    expect(restoreResult.continue).toBe(true);
    expect(readFileSync(tempFilePath, 'utf8')).toBe(content);
  });
});
