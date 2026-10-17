/**
 * WI-03 (ITEM-2): sanitize mode applies an Edit to the full file.
 *
 * Before the fix, sanitize mode wrote the Edit new_string fragment over the
 * whole target file and backed up only the fragment. These tests pin the fix:
 *   1. An Edit on a 20-line file changes only line 10. The other lines stay.
 *   2. The pre-edit backup is a byte copy of the file before the edit.
 *   3. secret-restore.cjs restores the full file with the real secret.
 *   4. A missing or a non-unique old_string denies and writes nothing.
 *   5. A protected path with `..` denies.
 *   6. A guard config file (.claude/settings.local.json) denies, unchanged.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';
import { createHash } from 'crypto';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const DETECT_HOOK = join(HOOKS_DIR, 'secret-detection.cjs');
const RESTORE_HOOK = join(HOOKS_DIR, 'secret-restore.cjs');

// A fake Anthropic-shaped token. The split keeps the source file clean.
const FAKE_SECRET = 'sk-' + 'ant-' + 'NOT_A_REAL_SECRET_1234567890_FAKE_TEST_VALUE_HERE_xyz';

let tmpProj;
let workDir;

function runHook(hookPath, input, env = {}) {
  const result = spawnSync('node', [hookPath], {
    input: JSON.stringify(input),
    encoding: 'utf8',
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
  const diag = () => `status=${result.status} signal=${result.signal} stderr=${JSON.stringify((result.stderr || '').slice(0, 500))}`;
  if (result.error) throw new Error(`runHook: spawnSync errored: ${diag()}`);
  if (result.status !== 0) throw new Error(`runHook: abnormal exit: ${diag()}`);
  const lines = (result.stdout || '').trim().split('\n').filter(Boolean);
  if (lines.length === 0) throw new Error(`runHook: empty stdout: ${diag()}`);
  return JSON.parse(lines[lines.length - 1]);
}

function decision(r) {
  return r && r.hookSpecificOutput ? r.hookSpecificOutput.permissionDecision : undefined;
}

function twentyLines() {
  const lines = [];
  for (let i = 1; i <= 20; i++) lines.push(i === 10 ? 'const key = "PLACEHOLDER";' : `line ${i} of the file`);
  return lines.join('\n') + '\n';
}

const SANITIZE = { CAGENTS_SECRET_MODE: 'sanitize' };

describe('WI-03: sanitize mode applies Edit to the full file', { timeout: 120000 }, () => {
  let sessionId;
  let backupDir;

  beforeEach(() => {
    tmpProj = mkdtempSync(join(tmpdir(), 'cagents-wi03-proj-'));
    workDir = mkdtempSync(join(tmpdir(), 'cagents-wi03-work-'));
    sessionId = `act_wi03-edit_${process.pid}_${Date.now()}`;
    backupDir = join(tmpProj, 'cagents-memory', '_system', 'secret-backups', sessionId);
  });

  afterEach(() => {
    try { rmSync(workDir, { recursive: true, force: true }); } catch { /* ignore */ }
    try { rmSync(tmpProj, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('round-trip: 20 lines kept, placeholder on line 10, pre-edit backup byte-equal, restore gives full file', () => {
    const target = join(workDir, 'config.js');
    const pre = twentyLines();
    writeFileSync(target, pre);

    const r = runHook(DETECT_HOOK, {
      session_id: sessionId,
      tool_name: 'Edit',
      tool_input: { file_path: target, old_string: '"PLACEHOLDER"', new_string: `"${FAKE_SECRET}"` }
    }, SANITIZE);
    expect(decision(r)).toBe('deny');
    expect(r.hookSpecificOutput.permissionDecisionReason).toMatch(/sanitize/i);

    const after = readFileSync(target, 'utf8');
    const preLines = pre.split('\n');
    const afterLines = after.split('\n');
    expect(afterLines.length).toBe(preLines.length);
    expect(after.endsWith('\n')).toBe(true);
    expect(afterLines.filter((_, i) => i < 20).length).toBe(20);
    for (let i = 0; i < 20; i++) {
      if (i === 9) continue;
      expect(afterLines[i]).toBe(preLines[i]);
    }
    expect(afterLines[9]).toMatch(/^const key = "BLOCK_[0-9a-f]{8}";$/);
    expect(after).not.toContain(FAKE_SECRET);

    // The backup dir holds the restore source and the pre-edit copy.
    const files = readdirSync(backupDir);
    const preEdit = files.filter(f => f.endsWith('.pre-edit.orig'));
    const restoreSrc = files.filter(f => f.endsWith('.orig') && !f.endsWith('.pre-edit.orig'));
    expect(preEdit.length).toBe(1);
    expect(restoreSrc.length).toBe(1);
    expect(readFileSync(join(backupDir, preEdit[0]))).toEqual(Buffer.from(pre));
    const expectedFull = pre.replace('"PLACEHOLDER"', `"${FAKE_SECRET}"`);
    expect(readFileSync(join(backupDir, restoreSrc[0]), 'utf8')).toBe(expectedFull);

    // The manifest names the real line and the backup file.
    const manifest = readFileSync(join(backupDir, 'manifest.yaml'), 'utf8');
    expect(manifest).toContain('line_range: "10"');
    expect(manifest).toContain(`orig: "${restoreSrc[0]}"`);
    expect(manifest).not.toContain(FAKE_SECRET);

    // Stop: secret-restore.cjs restores the full file with the real secret.
    const rr = runHook(RESTORE_HOOK, { session_id: sessionId });
    expect(rr.continue).toBe(true);
    const restored = readFileSync(target, 'utf8');
    expect(restored).toBe(expectedFull);
    expect(restored.split('\n')[9]).toBe(`const key = "${FAKE_SECRET}";`);
    expect(existsSync(join(backupDir, 'manifest.yaml'))).toBe(false);
  });

  it('replace_all edits every occurrence in the full file', () => {
    const target = join(workDir, 'multi.js');
    const pre = 'a = "TOK";\nkeep me\nb = "TOK";\n';
    writeFileSync(target, pre);
    const r = runHook(DETECT_HOOK, {
      session_id: sessionId,
      tool_name: 'Edit',
      tool_input: { file_path: target, old_string: '"TOK"', new_string: `"${FAKE_SECRET}"`, replace_all: true }
    }, SANITIZE);
    expect(decision(r)).toBe('deny');
    const after = readFileSync(target, 'utf8').split('\n');
    expect(after[1]).toBe('keep me');
    expect(after[0]).toMatch(/^a = "BLOCK_[0-9a-f]{8}";$/);
    expect(after[2]).toMatch(/^b = "BLOCK_[0-9a-f]{8}";$/);
  });

  it('MultiEdit edits[] apply in order to the full file', () => {
    const target = join(workDir, 'me.js');
    const pre = 'one\ntwo\nthree\n';
    writeFileSync(target, pre);
    const r = runHook(DETECT_HOOK, {
      session_id: sessionId,
      tool_name: 'MultiEdit',
      tool_input: {
        file_path: target,
        edits: [
          { old_string: 'two', new_string: `k = "${FAKE_SECRET}"` },
          { old_string: 'three', new_string: 'THREE' }
        ]
      }
    }, SANITIZE);
    expect(decision(r)).toBe('deny');
    const after = readFileSync(target, 'utf8').split('\n');
    expect(after[0]).toBe('one');
    expect(after[1]).toMatch(/^k = "BLOCK_[0-9a-f]{8}"$/);
    expect(after[2]).toBe('THREE');
  });

  it('old_string missing: deny, file unchanged, no backup', () => {
    const target = join(workDir, 'missing.js');
    const pre = twentyLines();
    writeFileSync(target, pre);
    const r = runHook(DETECT_HOOK, {
      session_id: sessionId,
      tool_name: 'Edit',
      tool_input: { file_path: target, old_string: 'NOT IN THE FILE', new_string: `"${FAKE_SECRET}"` }
    }, SANITIZE);
    expect(decision(r)).toBe('deny');
    expect(r.hookSpecificOutput.permissionDecisionReason).toMatch(/not found/);
    expect(readFileSync(target, 'utf8')).toBe(pre);
    expect(existsSync(backupDir)).toBe(false);
  });

  it('old_string twice without replace_all: deny, file unchanged', () => {
    const target = join(workDir, 'twice.js');
    const pre = 'x = "DUP";\ny = "DUP";\n';
    writeFileSync(target, pre);
    const r = runHook(DETECT_HOOK, {
      session_id: sessionId,
      tool_name: 'Edit',
      tool_input: { file_path: target, old_string: '"DUP"', new_string: `"${FAKE_SECRET}"` }
    }, SANITIZE);
    expect(decision(r)).toBe('deny');
    expect(r.hookSpecificOutput.permissionDecisionReason).toMatch(/more than one time/);
    expect(readFileSync(target, 'utf8')).toBe(pre);
    expect(existsSync(backupDir)).toBe(false);
  });

  it('protected path with `..` traversal: deny in sanitize mode and in block mode', () => {
    // A raw string: path.join would fold the `..` segments away.
    const traversal = `${workDir}/../../../../../../../../etc/cagents-wi03-probe`;
    expect(traversal.startsWith('/etc/')).toBe(false);
    for (const env of [SANITIZE, {}]) {
      const r = runHook(DETECT_HOOK, {
        session_id: sessionId,
        tool_name: 'Write',
        tool_input: { file_path: traversal, content: 'harmless text with no secret' }
      }, env);
      expect(decision(r)).toBe('deny');
      expect(r.hookSpecificOutput.permissionDecisionReason).toMatch(/protected system path/);
    }
    expect(existsSync('/etc/cagents-wi03-probe')).toBe(false);
  });

  it('<tmp>/.claude/settings.local.json: deny, file unchanged, no backup', () => {
    const dir = join(workDir, '.claude');
    mkdirSync(dir, { recursive: true });
    const target = join(dir, 'settings.local.json');
    const pre = '{\n  "env": {}\n}\n';
    writeFileSync(target, pre);
    for (const tool_input of [
      { file_path: target, content: `{ "env": { "K": "${FAKE_SECRET}" } }\n` },
      { file_path: target, old_string: '"env": {}', new_string: `"env": { "K": "${FAKE_SECRET}" }` }
    ]) {
      const r = runHook(DETECT_HOOK, { session_id: sessionId, tool_name: tool_input.content ? 'Write' : 'Edit', tool_input }, SANITIZE);
      expect(decision(r)).toBe('deny');
      expect(r.hookSpecificOutput.permissionDecisionReason).toMatch(/guard config file or a shell rc file/);
      expect(readFileSync(target, 'utf8')).toBe(pre);
    }
    expect(existsSync(backupDir)).toBe(false);
  });

  it('.claude/hooks/**, .git/hooks/** and shell rc files: deny, nothing written', () => {
    const targets = [
      join(workDir, '.claude', 'hooks', 'x.cjs'),
      join(workDir, '.git', 'hooks', 'pre-commit'),
      join(workDir, '.bashrc'),
      join(workDir, '.zshrc'),
      join(workDir, '.profile')
    ];
    for (const target of targets) {
      const r = runHook(DETECT_HOOK, {
        session_id: sessionId,
        tool_name: 'Write',
        tool_input: { file_path: target, content: `export K="${FAKE_SECRET}"\n` }
      }, SANITIZE);
      expect(decision(r)).toBe('deny');
      expect(existsSync(target)).toBe(false);
    }
    expect(existsSync(backupDir)).toBe(false);
  });

  it('Write tool behavior is unchanged: full content sanitized and backed up', () => {
    const target = join(workDir, 'w.js');
    const content = `const k = "${FAKE_SECRET}";\n`;
    const r = runHook(DETECT_HOOK, {
      session_id: sessionId,
      tool_name: 'Write',
      tool_input: { file_path: target, content }
    }, SANITIZE);
    expect(decision(r)).toBe('deny');
    expect(readFileSync(target, 'utf8')).toMatch(/^const k = "BLOCK_[0-9a-f]{8}";\n$/);
    const files = readdirSync(backupDir).filter(f => f.endsWith('.orig'));
    expect(files.length).toBe(1);
    expect(files[0].endsWith('.pre-edit.orig')).toBe(false);
    expect(readFileSync(join(backupDir, files[0]), 'utf8')).toBe(content);
  });
});

//
// WI-03b: two sanitized writes to the same file in one session. Before the
// fix, restore took the .orig of the FIRST manifest entry. It refused that
// .orig, because it did not match the current file. Then cleanup deleted the
// second .orig. The second secret was lost.
const FAKE_SECRET_2 = 'sk-' + 'ant-' + 'SECOND_NOT_REAL_SECRET_0987654321_FAKE_TEST_VALUE_abc';

function twoSlotFile() {
  const lines = [];
  for (let i = 1; i <= 12; i++) {
    if (i === 3) lines.push('const a = "SLOT_A";');
    else if (i === 9) lines.push('const b = "SLOT_B";');
    else lines.push(`line ${i} of the file`);
  }
  return lines.join('\n') + '\n';
}

function origFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.orig')).sort();
}

describe('WI-03b: two sanitized writes to the same file', { timeout: 120000 }, () => {
  let sessionId;
  let backupDir;

  beforeEach(() => {
    tmpProj = mkdtempSync(join(tmpdir(), 'cagents-wi03b-proj-'));
    workDir = mkdtempSync(join(tmpdir(), 'cagents-wi03b-work-'));
    sessionId = `act_wi03b-edit_${process.pid}_${Date.now()}`;
    backupDir = join(tmpProj, 'cagents-memory', '_system', 'secret-backups', sessionId);
  });

  afterEach(() => {
    try { rmSync(workDir, { recursive: true, force: true }); } catch { /* ignore */ }
    try { rmSync(tmpProj, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  function editTwice(target) {
    for (const [oldS, secret] of [['"SLOT_A"', FAKE_SECRET], ['"SLOT_B"', FAKE_SECRET_2]]) {
      const r = runHook(DETECT_HOOK, {
        session_id: sessionId,
        tool_name: 'Edit',
        tool_input: { file_path: target, old_string: oldS, new_string: `"${secret}"` }
      }, SANITIZE);
      expect(decision(r)).toBe('deny');
    }
    const after = readFileSync(target, 'utf8');
    expect(after).not.toContain(FAKE_SECRET);
    expect(after).not.toContain(FAKE_SECRET_2);
    expect(after.split('\n')[2]).toMatch(/^const a = "BLOCK_[0-9a-f]{8}";$/);
    expect(after.split('\n')[8]).toMatch(/^const b = "BLOCK_[0-9a-f]{8}";$/);
    // 2 restore sources + 2 pre-edit copies.
    expect(origFiles(backupDir).length).toBe(4);
    return after;
  }

  it('two Edits on one file: restore puts back both secrets and consumes every backup', () => {
    const target = join(workDir, 'two.js');
    const pre = twoSlotFile();
    writeFileSync(target, pre);
    editTwice(target);

    const rr = runHook(RESTORE_HOOK, { session_id: sessionId });
    expect(rr.continue).toBe(true);
    const expected = pre.replace('"SLOT_A"', `"${FAKE_SECRET}"`).replace('"SLOT_B"', `"${FAKE_SECRET_2}"`);
    expect(readFileSync(target, 'utf8')).toBe(expected);
    expect(origFiles(backupDir)).toEqual([]);
    expect(existsSync(join(backupDir, 'manifest.yaml'))).toBe(false);
  });

  it('two Writes on one file (the second keeps the first placeholder): both secrets restored', () => {
    const target = join(workDir, 'ww.js');
    const r1 = runHook(DETECT_HOOK, {
      session_id: sessionId,
      tool_name: 'Write',
      tool_input: { file_path: target, content: `const a = "${FAKE_SECRET}";\n` }
    }, SANITIZE);
    expect(decision(r1)).toBe('deny');
    const s1 = readFileSync(target, 'utf8');
    expect(s1).toMatch(/^const a = "BLOCK_[0-9a-f]{8}";\n$/);
    //
    // The model rewrites the whole file and copies the placeholder through.
    const r2 = runHook(DETECT_HOOK, {
      session_id: sessionId,
      tool_name: 'Write',
      tool_input: { file_path: target, content: `${s1}// new line\nconst b = "${FAKE_SECRET_2}";\n` }
    }, SANITIZE);
    expect(decision(r2)).toBe('deny');

    runHook(RESTORE_HOOK, { session_id: sessionId });
    expect(readFileSync(target, 'utf8')).toBe(`const a = "${FAKE_SECRET}";\n// new line\nconst b = "${FAKE_SECRET_2}";\n`);
    expect(origFiles(backupDir)).toEqual([]);
  });

  it('file changed after the second sanitize: refuse, file unchanged, every .orig kept', () => {
    const target = join(workDir, 'changed.js');
    writeFileSync(target, twoSlotFile());
    const sanitized = editTwice(target);
    const before = origFiles(backupDir);
    const beforeBytes = before.map(f => readFileSync(join(backupDir, f)));

    // The user edits the file after the sanitize.
    const userEdited = sanitized + 'user line added later\n';
    writeFileSync(target, userEdited);

    runHook(RESTORE_HOOK, { session_id: sessionId });
    expect(readFileSync(target, 'utf8')).toBe(userEdited);
    expect(origFiles(backupDir)).toEqual(before);
    before.forEach((f, i) => expect(readFileSync(join(backupDir, f))).toEqual(beforeBytes[i]));
  });

  it('legacy manifest with no orig field: the mtime fallback skips *.pre-edit.orig', () => {
    const target = join(workDir, 'legacy.js');
    const pre = twoSlotFile();
    writeFileSync(target, pre);
    const r = runHook(DETECT_HOOK, {
      session_id: sessionId,
      tool_name: 'Edit',
      tool_input: { file_path: target, old_string: '"SLOT_A"', new_string: `"${FAKE_SECRET}"` }
    }, SANITIZE);
    expect(decision(r)).toBe('deny');
    const manifestPath = join(backupDir, 'manifest.yaml');
    writeFileSync(manifestPath, readFileSync(manifestPath, 'utf8').replace(/^\s*orig:.*\n/mg, ''));
    expect(readFileSync(manifestPath, 'utf8')).not.toMatch(/orig:/);
    // Make the pre-edit copy the newest file in the backup dir.
    const preEdit = origFiles(backupDir).find(f => f.endsWith('.pre-edit.orig'));
    const future = new Date(Date.now() + 60000);
    utimesSync(join(backupDir, preEdit), future, future);

    runHook(RESTORE_HOOK, { session_id: sessionId });
    expect(readFileSync(target, 'utf8')).toBe(pre.replace('"SLOT_A"', `"${FAKE_SECRET}"`));
  });

  //
  // Revision 1: the hash scan ran out of budget on a long file. The scan is
  // now anchored on the text next to the placeholder.
  function writeAfterWrite(target, prefix) {
    const r1 = runHook(DETECT_HOOK, {
      session_id: sessionId,
      tool_name: 'Write',
      tool_input: { file_path: target, content: `${prefix}const a = "${FAKE_SECRET}";\n` }
    }, SANITIZE);
    expect(decision(r1)).toBe('deny');
    const s1 = readFileSync(target, 'utf8');
    expect(s1).not.toContain(FAKE_SECRET);
    expect(s1).toMatch(/const a = "BLOCK_[0-9a-f]{8}";\n$/);
    const r2 = runHook(DETECT_HOOK, {
      session_id: sessionId,
      tool_name: 'Write',
      tool_input: { file_path: target, content: `${s1}const b = "${FAKE_SECRET_2}";\n` }
    }, SANITIZE);
    expect(decision(r2)).toBe('deny');
    return readFileSync(target, 'utf8');
  }

  it('Write after Write with a >=30KB path-heavy prefix: both secrets restored', () => {
    const lines = [];
    for (let i = 0; i < 520; i++) lines.push(`const v${i} = require("some/long/module/path/name_${i}.js");`);
    const prefix = lines.join('\n') + '\n';
    expect(prefix.length).toBeGreaterThanOrEqual(30000);
    const target = join(workDir, 'big.js');
    writeAfterWrite(target, prefix);

    runHook(RESTORE_HOOK, { session_id: sessionId });
    expect(readFileSync(target, 'utf8')).toBe(`${prefix}const a = "${FAKE_SECRET}";\nconst b = "${FAKE_SECRET_2}";\n`);
    expect(origFiles(backupDir)).toEqual([]);
  });

  it('Write after Write with a 2KB base64 line before the secret: both secrets restored', () => {
    const unit = 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODk+/';
    const blob = unit.repeat(Math.ceil(2048 / unit.length)).slice(0, 2048);
    const prefix = `// data\nconst blob = "${blob}";\n`;
    const target = join(workDir, 'b64.js');
    writeAfterWrite(target, prefix);

    runHook(RESTORE_HOOK, { session_id: sessionId });
    expect(readFileSync(target, 'utf8')).toBe(`${prefix}const a = "${FAKE_SECRET}";\nconst b = "${FAKE_SECRET_2}";\n`);
    expect(origFiles(backupDir)).toEqual([]);
  });

  it('refused Write after Write: the kept-backup count equals the .orig files on disk', () => {
    const target = join(workDir, 'kept.js');
    const s2 = writeAfterWrite(target, '// head\n');
    const userEdited = s2 + 'user line added later\n';
    writeFileSync(target, userEdited);
    const kept = origFiles(backupDir);
    expect(kept.length).toBe(2); // two Write .orig files, no pre-edit copy

    const res = spawnSync('node', [RESTORE_HOOK], {
      input: JSON.stringify({ session_id: sessionId }),
      encoding: 'utf8',
      timeout: 60000,
      env: { ...process.env, NODE_ENV: 'test', VITEST: 'true', CAGENTS_HOOK_DEDUP_DISABLE: '1', CLAUDE_PROJECT_DIR: tmpProj }
    });
    expect(res.status).toBe(0);
    expect(readFileSync(target, 'utf8')).toBe(userEdited);
    expect(origFiles(backupDir)).toEqual(kept);
    const m = /kept (\d+) \.orig backup\(s\)/.exec(res.stderr || '');
    expect(m, `stderr=${JSON.stringify((res.stderr || '').slice(0, 500))}`).not.toBeNull();
    expect(Number(m[1])).toBe(kept.length);
    expect(res.stderr).not.toContain(FAKE_SECRET);
    expect(res.stderr).not.toContain(FAKE_SECRET_2);
  });

  //
  // WI-03b r2: the Stop hook has a 10 s timeout. 255 copies of one
  // placeholder that no search can find must not scale the restore time.
  it('255 copies of one unfindable placeholder: restore ends in < 5 s, partial, other secret restored', () => {
    const target = join(workDir, 'many.js');
    const run = 'A'.repeat(500);
    const first = Array.from({ length: 40 }, () => `x = "${run}"`).join('\n') + `\ny = ${FAKE_SECRET}\n`;
    const r1 = runHook(DETECT_HOOK, { session_id: sessionId, tool_name: 'Write', tool_input: { file_path: target, content: first } }, SANITIZE);
    expect(decision(r1)).toBe('deny');
    const h1 = createHash('sha256').update(FAKE_SECRET).digest('hex').slice(0, 8);
    const second = Array.from({ length: 255 }, () => `x = "BLOCK_${h1}"`).join('\n') + `\nz = "${FAKE_SECRET_2}"\n`;
    const r2 = runHook(DETECT_HOOK, { session_id: sessionId, tool_name: 'Write', tool_input: { file_path: target, content: second } }, SANITIZE);
    expect(decision(r2)).toBe('deny');
    expect(readFileSync(target, 'utf8')).not.toContain(FAKE_SECRET_2);
    expect(origFiles(backupDir).length).toBe(2);

    const t0 = Date.now();
    const res = spawnSync('node', [RESTORE_HOOK], {
      input: JSON.stringify({ session_id: sessionId }),
      encoding: 'utf8',
      timeout: 60000,
      env: { ...process.env, NODE_ENV: 'test', VITEST: 'true', CAGENTS_HOOK_DEDUP_DISABLE: '1', CLAUDE_PROJECT_DIR: tmpProj }
    });
    const ms = Date.now() - t0;
    expect(res.status).toBe(0);
    expect(ms).toBeLessThan(5000);
    const after = readFileSync(target, 'utf8');
    // S2 is back; the 255 placeholders of S1 stay as they are.
    expect(after).toBe(second);
    expect(after.split(`BLOCK_${h1}`).length - 1).toBe(255);
    // The first Write .orig gave no secret, so it is kept; the second is used.
    expect(origFiles(backupDir).length).toBe(1);
    expect(res.stderr).toMatch(/partial restore/);
    expect(res.stderr).not.toContain(FAKE_SECRET);
    expect(res.stderr).not.toContain(FAKE_SECRET_2);
  });
});
