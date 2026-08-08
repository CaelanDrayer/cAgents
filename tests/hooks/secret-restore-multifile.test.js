/**
 * P5.5 regression — deterministic multi-file sanitize restore (content-swap bug).
 *
 * BUG (pre-fix): secret-restore.cjs pairs each manifest file_path with the
 * HIGHEST-mtime .orig file across ALL remaining .orig files. With >= 2 files
 * sanitized under CAGENTS_SECRET_MODE=sanitize, file A can be restored with file
 * B's original content (a content-swap) because mtime ordering != file_path
 * ordering.
 *
 * FIX (two parts):
 *   1. secret-detection.cjs sanitize mode records the .orig filename in each
 *      manifest entry (`orig:` field).
 *   2. secret-restore.cjs pairs file_path -> its recorded .orig DETERMINISTICALLY
 *      via the manifest `orig` field, falling back to the legacy mtime behavior
 *      only for pre-P5.5 manifests (entries with no `orig`).
 *
 * FAILING-BEFORE / PASSING-AFTER:
 *   - Block A (deterministic): a manual manifest with orig fields + controlled
 *     mtimes (origB newer than origA). Pre-fix restore ignores `orig` and pairs
 *     by mtime -> fileA gets origB content -> SWAP -> assertion FAILS. Post-fix
 *     it pairs by the recorded orig -> each file restored to its own content.
 *   - Block B: real sanitize writes a manifest WITHOUT `orig:` pre-fix
 *     (assertion FAILS) and WITH `orig:` post-fix; end-to-end two-file restore
 *     returns each file's own content.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const DETECT_HOOK = join(HOOKS_DIR, 'secret-detection.cjs');
const RESTORE_HOOK = join(HOOKS_DIR, 'secret-restore.cjs');
// AGENT_MEMORY_DIR resolves to an absolute path from PROJECT_ROOT (not cwd).
const BACKUP_BASE = join(process.cwd(), 'cagents-memory', '_system', 'secret-backups');

// Anthropic-shaped fake secrets (split; the /fake_/i placeholder marker keeps
// the hook from self-blocking on THIS test source). Two DISTINCT secrets.
const SECRET_A = 'sk-' + 'ant-' + 'FAKE_TEST_AAAAAAAAAA_1234567890_NOT_REAL_VALUE_A_xyz';
const SECRET_B = 'sk-' + 'ant-' + 'FAKE_TEST_BBBBBBBBBB_0987654321_NOT_REAL_VALUE_B_xyz';

function runHook(hookPath, input, env = {}) {
  const result = spawnSync('node', [hookPath], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    // 60000 (was 5000): spawnSync does NOT throw on timeout — on a killed spawn
    // `lines[lines.length-1] || '{}'` silently yielded {} (a misleading verdict
    // fed to `.hookSpecificOutput`/`.continue` assertions). Raise the budget and
    // FAIL LOUD on abnormal termination instead.
    timeout: 60000,
    env: { ...process.env, NODE_ENV: 'test', VITEST: 'true', CAGENTS_HOOK_DEDUP_DISABLE: '1', ...env },
  });
  // secret-detection.cjs / secret-restore.cjs (via createHook) ALWAYS exit 0 with
  // one JSON line on stdout (a deny verdict is exit-0 JSON too), so any abnormal
  // termination is a spawn misfire.
  const diag = () => `status=${result.status} signal=${result.signal} error=${result.error ? result.error.message : 'none'} stdout=${JSON.stringify((result.stdout || '').slice(0, 200))} stderr=${JSON.stringify((result.stderr || '').slice(0, 500))}`;
  if (result.error) throw new Error(`secret-restore runHook: spawnSync errored — ${diag()}`);
  if (result.status === null) throw new Error(`secret-restore runHook: hook killed (timeout/signal) — ${diag()}`);
  if (result.status !== 0) throw new Error(`secret-restore runHook: hook exited non-zero — ${diag()}`);
  const lines = (result.stdout || '').trim().split('\n').filter(Boolean);
  if (lines.length === 0) throw new Error(`secret-restore runHook: empty stdout — ${diag()}`);
  try { return JSON.parse(lines[lines.length - 1]); }
  catch (e) { throw new Error(`secret-restore runHook: last stdout line not valid JSON — ${e.message} — ${diag()}`); }
}

describe('P5.5: deterministic multi-file sanitize restore', { timeout: 30000 }, () => {
  let tempDir;
  let backupDir;
  let sessionId;

  beforeEach(() => {
    sessionId = `act_test-multifile_${process.pid}_${Date.now()}_001`;
    tempDir = join(tmpdir(), `cagents-multifile-${process.pid}-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    backupDir = join(BACKUP_BASE, sessionId);
    mkdirSync(backupDir, { recursive: true });
  });

  afterEach(() => {
    try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
    try { rmSync(backupDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  // ── Block A: deterministic — restore MUST use recorded orig, not mtime ──────
  it('restores each file to ITS OWN original (no mtime-driven content swap)', () => {
    const fileA = join(tempDir, 'a.json');
    const fileB = join(tempDir, 'b.json');
    const ORIG_A = 'ORIGINAL_FILE_A_CONTENT\n';
    const ORIG_B = 'ORIGINAL_FILE_B_CONTENT\n';

    // On-disk sanitized versions (what restore overwrites).
    writeFileSync(fileA, 'SANITIZED_A BLOCK_aaaaaaaa\n');
    writeFileSync(fileB, 'SANITIZED_B BLOCK_bbbbbbbb\n');

    // Two .orig backups with DISTINCT contents.
    const origAName = 'aaaa000000000000.orig';
    const origBName = 'bbbb000000000000.orig';
    const origAPath = join(backupDir, origAName);
    const origBPath = join(backupDir, origBName);
    writeFileSync(origAPath, ORIG_A, { mode: 0o600 });
    writeFileSync(origBPath, ORIG_B, { mode: 0o600 });

    // Force origB to be NEWER than origA so the legacy mtime pairing picks origB
    // first for fileA -> swap. Deterministic regardless of write timing.
    const now = Date.now() / 1000;
    utimesSync(origAPath, now - 100, now - 100); // older
    utimesSync(origBPath, now, now);             // newer

    // Manifest with deterministic file_path -> orig pairing (the P5.5 format).
    const manifest = [
      'schema_version: "1"',
      `session_id: "${sessionId}"`,
      'entries:',
      '  - placeholder: "BLOCK_aaaaaaaa"',
      `    file_path: "${fileA}"`,
      '    line_range: "1"',
      '    hash: "aaaaaaaa"',
      '    secret_type: "Anthropic API Key"',
      '    severity: "critical"',
      '    captured_at: "2026-07-17T00:00:00Z"',
      `    orig: "${origAName}"`,
      '  - placeholder: "BLOCK_bbbbbbbb"',
      `    file_path: "${fileB}"`,
      '    line_range: "1"',
      '    hash: "bbbbbbbb"',
      '    secret_type: "Anthropic API Key"',
      '    severity: "critical"',
      '    captured_at: "2026-07-17T00:00:01Z"',
      `    orig: "${origBName}"`,
      '',
    ].join('\n');
    writeFileSync(join(backupDir, 'manifest.yaml'), manifest);

    const res = runHook(RESTORE_HOOK, { session_id: sessionId });
    expect(res.continue).toBe(true); // never blocks

    // The core assertion: NO swap. Each file got its OWN original content.
    expect(readFileSync(fileA, 'utf8')).toBe(ORIG_A);
    expect(readFileSync(fileB, 'utf8')).toBe(ORIG_B);
  });

  // ── Block B: writer records `orig` + end-to-end two-file restore ────────────
  it('sanitize writer records the .orig filename in each manifest entry', () => {
    const file = join(tempDir, 'writer.json');
    writeFileSync(file, `const k = "${SECRET_A}";`);

    const res = runHook(
      DETECT_HOOK,
      { session_id: sessionId, tool_name: 'Write', tool_input: { file_path: file, content: `const k = "${SECRET_A}";` } },
      { CAGENTS_SECRET_MODE: 'sanitize' }
    );
    expect(res.hookSpecificOutput.permissionDecision).toBe('deny');

    const manifestText = readFileSync(join(backupDir, 'manifest.yaml'), 'utf8');
    // Post-fix: the manifest carries an `orig:` field (pre-fix it does not).
    const origMatch = manifestText.match(/^\s*orig:\s*"?([^"\n]+)"?/m);
    expect(origMatch, 'manifest entry must record the .orig filename').not.toBeNull();
    // The recorded orig must point at an existing .orig backup.
    expect(existsSync(join(backupDir, origMatch[1].trim()))).toBe(true);
  });

  it('end-to-end: two sanitized files each restore to their own original content', () => {
    const fileA = join(tempDir, 'e2e-a.json');
    const fileB = join(tempDir, 'e2e-b.json');
    const CONTENT_A = `const a = "${SECRET_A}"; // file A marker AAA`;
    const CONTENT_B = `const b = "${SECRET_B}"; // file B marker BBB`;
    writeFileSync(fileA, CONTENT_A);
    writeFileSync(fileB, CONTENT_B);

    // Sanitize A then B (B's .orig ends up newer — the swap trigger pre-fix).
    runHook(DETECT_HOOK, { session_id: sessionId, tool_name: 'Write', tool_input: { file_path: fileA, content: CONTENT_A } }, { CAGENTS_SECRET_MODE: 'sanitize' });
    runHook(DETECT_HOOK, { session_id: sessionId, tool_name: 'Write', tool_input: { file_path: fileB, content: CONTENT_B } }, { CAGENTS_SECRET_MODE: 'sanitize' });

    // Both files were sanitized on disk (BLOCK_ placeholder, no raw secret).
    expect(readFileSync(fileA, 'utf8')).not.toContain(SECRET_A);
    expect(readFileSync(fileB, 'utf8')).not.toContain(SECRET_B);

    runHook(RESTORE_HOOK, { session_id: sessionId });

    // Each restored to its OWN original (marker AAA in A, BBB in B — no swap).
    const restoredA = readFileSync(fileA, 'utf8');
    const restoredB = readFileSync(fileB, 'utf8');
    expect(restoredA).toBe(CONTENT_A);
    expect(restoredB).toBe(CONTENT_B);
    expect(restoredA).toContain('marker AAA');
    expect(restoredB).toContain('marker BBB');
  });
});
