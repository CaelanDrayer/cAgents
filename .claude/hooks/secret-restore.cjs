#!/usr/bin/env node
/**
 * Secret Restore Hook - Stop event
 * cAgents v12.0.4 (REC-1 from external-skills sample analysis)
 *
 * Companion to secret-detection.cjs sanitize mode. When
 * CAGENTS_SECRET_MODE=sanitize is active, the PreToolUse hook replaces secrets
 * with BLOCK_<hex> placeholders during the session. This Stop hook reads the
 * resulting backup manifest at session end and restores the original
 * (pre-sanitize) file contents.
 *
 * Lifecycle:
 *   1. Read cagents-memory/_system/secret-backups/{session_id}/manifest.yaml
 *   2. For each unique .orig file referenced, restore its contents to
 *      the original file_path.
 *   3. Delete .orig files + the manifest after successful restore.
 *   4. On manifest absence (clean session, no sanitize fired): no-op.
 *   5. Per-entry try/catch — partial failures log but do not fail the Stop.
 *
 * Hard constraints:
 *   - Idempotent: running twice on a clean session does nothing.
 *   - Crash-safe: if Stop never fires, backups remain on disk for manual
 *     recovery. Operator deletes the backup dir after restore.
 *   - Never blocks: always returns {continue: true}.
 *
 * Input (stdin): JSON Stop event payload from Claude Code
 * Output (stdout): JSON {continue: true}
 */

const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const path = require('path');
const { createHook, AGENT_MEMORY_DIR, PROJECT_ROOT, ensureDir } = require('./hook-utils.cjs');

function getSessionIdForRestore(input) {
  // Deterministic chain per .claude/rules/core/hooks.md Concurrency Contract:
  // explicit input.session_id → env var → null.
  // No heuristic fallback — refusing to restore into another instance's session.
  if (input && typeof input.session_id === 'string' && input.session_id) {
    return input.session_id;
  }
  if (process.env.CAGENTS_ACTIVE_SESSION) {
    return process.env.CAGENTS_ACTIVE_SESSION;
  }
  return null;
}

/**
 * Parse the simple manifest YAML format written by secret-detection.cjs.
 * Returns { sessionId, entries[] }. Tolerant of missing or malformed file.
 *
 * WI-7 (session_id binding): the manifest header carries `session_id:` at top
 * level. secret-restore refuses to restore when this id does not match the
 * resolving session — closes H8 (cross-session restore).
 */
function parseManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) return { sessionId: null, entries: [] };
  let content;
  try {
    content = fs.readFileSync(manifestPath, 'utf8');
  } catch {
    return { sessionId: null, entries: [] };
  }
  const entries = [];
  // Extract top-level session_id (header). Use a non-list-anchored match.
  let sessionId = null;
  const headerLines = content.split(/\n\s*-\s+placeholder:/)[0] || '';
  const sidMatch = headerLines.match(/^session_id:\s*"?([^"\n]+)"?/m);
  if (sidMatch) sessionId = sidMatch[1].trim();
  // Split on the per-entry marker "  - placeholder:"
  const blocks = content.split(/\n\s*-\s+placeholder:/);
  for (let i = 1; i < blocks.length; i++) {
    const block = '- placeholder:' + blocks[i];
    const entry = {};
    const placeholderMatch = block.match(/placeholder:\s*"?([^"\n]+)"?/);
    const filePathMatch = block.match(/file_path:\s*"?([^"\n]+)"?/);
    const hashMatch = block.match(/hash:\s*"?([^"\n]+)"?/);
    // P5.5: `orig` records the .orig backup filename for deterministic pairing.
    // Absent on pre-P5.5 manifests (and on `orig: ""`) — restore falls back to
    // the legacy mtime behavior in that case.
    const origMatch = block.match(/orig:\s*"?([^"\n]+)"?/);
    if (placeholderMatch) entry.placeholder = placeholderMatch[1].trim();
    if (filePathMatch) entry.file_path = filePathMatch[1].trim();
    if (hashMatch) entry.hash = hashMatch[1].trim();
    if (origMatch) entry.orig = origMatch[1].trim();
    if (entry.placeholder && entry.file_path) entries.push(entry);
  }
  return { sessionId, entries };
}

// WI-17 (write-then-exec): the backup dir sits under cagents-memory/, and a
// permission rule lets an agent write there with no prompt. A planted manifest
// plus a planted .orig would make this Stop hook write any content to any
// path, a hook file included, outside the permission system. A restore target
// is accepted only when the manifest entries can be true:
//   - each placeholder is BLOCK_<8 hex> and its hash field equals the hex;
//   - the target is a regular file (not a symlink) that holds a placeholder
//     recorded for it, which is what sanitize mode left on disk;
//   - the .orig backup is a regular file (not a symlink).
// A file holds a BLOCK_<hex> placeholder only after sanitize mode wrote it,
// so a planted manifest cannot name a hook, a settings file or a dotfile.
const PLACEHOLDER_RE = /^BLOCK_([0-9a-f]{8})$/;

// WI-17 round 2 (F3): "the target holds a BLOCK_<hex> placeholder" is not
// proof that sanitize wrote it. Any file that records agent-chosen text can
// hold one: a commit message lands in .git/logs/HEAD and .git/COMMIT_EDITMSG.
// So a restore target must also sit in an allowed place:
//   - its resolved path (parent symlinks followed) is under the project root
//     or the OS temp dir;
//   - no path segment is a VCS, tool-config, hook or dependency directory;
//   - its basename is not a shell rc / settings / hooks / package file.
// The write itself goes through one fd opened with O_NOFOLLOW, and the fd's
// dev/ino must equal the lstat taken at check time. That closes the race in
// which the checked file is swapped for a symlink (or another file) between
// the check and the write. A file with more than one hard link is refused,
// since a write to it would also change a file outside the allowed places.
const PROTECTED_SEGMENTS = new Set([
  '.git', '.hg', '.svn', '.claude', '.claude-plugin', '.husky', '.github',
  '.gitlab', '.vscode', '.idea', 'node_modules', '.ssh', '.gnupg', '.config',
  '.local', '.cache',
]);
const PROTECTED_BASENAME_RE = /^(?:settings(?:\.[\w-]+)?\.json|hooks\.json|plugin\.json|marketplace\.json|package(?:-lock)?\.json|\.(?:bash(?:rc|_profile|_login|_logout)|profile|zshrc|zprofile|zshenv|zlogin|envrc|npmrc|yarnrc(?:\.yml)?|gitconfig|gitattributes|gitmodules|mcp\.json)|Makefile|CLAUDE\.md)$/;

function realOrNull(p) {
  try { return fs.realpathSync(p); } catch { return null; }
}

// Returns { reason } on refusal, else { real } (the resolved target path).
function restorePathCheck(filePath) {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) return { reason: 'target path is not absolute' };
  const dir = realOrNull(path.dirname(filePath));
  if (!dir) return { reason: 'target directory does not resolve' };
  const base = path.basename(filePath);
  const real = path.join(dir, base);
  const roots = [realOrNull(PROJECT_ROOT), realOrNull(os.tmpdir())].filter(Boolean);
  const root = roots.find(r => real.startsWith(r.endsWith(path.sep) ? r : r + path.sep));
  if (!root) return { reason: 'target is outside the project root' };
  const segs = path.relative(root, real).split(path.sep);
  if (segs.slice(0, -1).some(seg => PROTECTED_SEGMENTS.has(seg))) return { reason: 'target is under a protected directory' };
  if (PROTECTED_BASENAME_RE.test(base)) return { reason: 'target is a protected config file' };
  return { real };
}

// Returns { reason } on refusal, else { real, st } for the bound write.
function restoreTargetCheck(filePath, entries) {
  const mine = entries.filter(e => e.file_path === filePath);
  for (const e of mine) {
    const m = PLACEHOLDER_RE.exec(e.placeholder || '');
    if (!m) return { reason: 'placeholder is not BLOCK_<8 hex>' };
    if (e.hash && e.hash !== m[1]) return { reason: 'hash does not match the placeholder' };
  }
  const pc = restorePathCheck(filePath);
  if (pc.reason) return pc;
  let st;
  try { st = fs.lstatSync(pc.real); } catch { return { reason: 'target does not exist' }; }
  try { if (fs.lstatSync(filePath).isSymbolicLink()) return { reason: 'target is not a regular file' }; } catch { return { reason: 'target does not exist' }; }
  if (!st.isFile()) return { reason: 'target is not a regular file' };
  if (st.nlink > 1) return { reason: 'target has more than one hard link' };
  let current;
  try { current = readNoFollow(pc.real, st); } catch (e) { return { reason: `target is not readable (${e.code || e.message})` }; }
  // Overlapping findings can nest one placeholder inside another, so the final
  // file can hold only some of them. One recorded placeholder is enough.
  if (!mine.some(e => current.includes(e.placeholder))) return { reason: 'target does not hold a recorded placeholder' };
  return { real: pc.real, st };
}

// WI-17 round 3 (F3): the place checks above say WHERE restore may write,
// not WHAT. A planted manifest plus a planted .orig could still overwrite a
// file that already holds BLOCK_<hex> (the repo ships test files that do)
// with any content, and an allow-listed test runner would then execute it.
// So the .orig must be exactly what sanitize mode replaced: the current
// target content with each BLOCK_<hex> placeholder put back as a substring s
// where
//   (a) sha256(s).hex.slice(0, 8) equals the placeholder hex, which is how
//       secret-detection.cjs sanitizeContent() derives it; and
//   (b) s is a plain secret token (SECRET_TOKEN_RE: no quote, whitespace,
//       paren, semicolon, backtick, `$`, brace or angle bracket).
// A placeholder may also stand for itself (a file that carried a literal
// BLOCK_<hex> before sanitize). Anything else is refused.
const SECRET_TOKEN_CHAR_RE = /[A-Za-z0-9_\-+\/=.:@%~]/;
const SECRET_TOKEN_MIN = 8;
const SECRET_TOKEN_MAX = 512;
const MAX_PLACEHOLDERS = 256;
const MATCH_STEP_BUDGET = 262144; // 2^18 matcher steps; not a token budget

function sha8(s) {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 8);
}

// True when `orig` equals `current` with each BLOCK_<hex> put back as above.
function origMatchesSanitized(current, orig) {
  if (typeof current !== 'string' || typeof orig !== 'string') return false;
  const parts = current.split(/(BLOCK_[0-9a-f]{8})/);
  if ((parts.length - 1) / 2 > MAX_PLACEHOLDERS) return false;
  let steps = 0;
  const memo = new Set();
  function at(pi, oi) {
    if (++steps > MATCH_STEP_BUDGET) return false;
    if (pi === parts.length) return oi === orig.length;
    const key = pi + ':' + oi;
    if (memo.has(key)) return false;
    memo.add(key);
    const part = parts[pi];
    if (pi % 2 === 0) {
      return orig.startsWith(part, oi) && at(pi + 1, oi + part.length);
    }
    const hex = part.slice(6);
    if (orig.startsWith(part, oi) && at(pi + 1, oi + part.length)) return true;
    let end = oi;
    const limit = Math.min(orig.length, oi + SECRET_TOKEN_MAX);
    while (end < limit && SECRET_TOKEN_CHAR_RE.test(orig[end])) {
      end++;
      if (end - oi >= SECRET_TOKEN_MIN && sha8(orig.slice(oi, end)) === hex && at(pi + 1, end)) return true;
    }
    return false;
  }
  return at(0, 0);
}

// Back-compat name used by older callers/tests: reason string or null.
function restoreTargetRejection(filePath, entries) {
  const r = restoreTargetCheck(filePath, entries);
  return r.reason || null;
}

function sameInode(a, b) {
  return a.dev === b.dev && a.ino === b.ino;
}

// Read a regular file through one O_NOFOLLOW fd. When `expect` is given, the
// fd must be that inode.
function readNoFollow(p, expect) {
  const fd = fs.openSync(p, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const fst = fs.fstatSync(fd);
    if (!fst.isFile()) throw Object.assign(new Error('not a regular file'), { code: 'ENOTREG' });
    if (expect && !sameInode(fst, expect)) throw Object.assign(new Error('file changed since check'), { code: 'ECHANGED' });
    return fs.readFileSync(fd, 'utf8');
  } finally {
    fs.closeSync(fd);
  }
}

// Overwrite the checked target through one O_NOFOLLOW fd bound to the inode
// that was checked. No O_CREAT: the file must still exist.
function writeBound(real, expect, content) {
  const fd = fs.openSync(real, fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW);
  try {
    const fst = fs.fstatSync(fd);
    if (!fst.isFile() || !sameInode(fst, expect) || fst.nlink > 1) {
      throw Object.assign(new Error('target changed between check and write'), { code: 'ECHANGED' });
    }
    fs.ftruncateSync(fd, 0);
    const buf = Buffer.from(content, 'utf8');
    let off = 0;
    while (off < buf.length) off += fs.writeSync(fd, buf, off, buf.length - off, off);
  } finally {
    fs.closeSync(fd);
  }
}

function logRestoreEvent(logEntry) {
  try {
    const logDir = ensureDir(path.join(AGENT_MEMORY_DIR, '_system', 'logs'));
    const date = new Date().toISOString().slice(0, 10);
    const logFile = path.join(logDir, `secret-restore_${date}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  } catch (e) {
    console.error(`[SecretRestore] log write failed: ${e.message}`);
  }
}

async function restoreHandler(input) {
  const sessionId = getSessionIdForRestore(input);
  if (!sessionId) {
    // No session context — nothing to restore.
    return null;
  }

  const backupDir = path.join(AGENT_MEMORY_DIR, '_system', 'secret-backups', sessionId);
  const manifestPath = path.join(backupDir, 'manifest.yaml');

  if (!fs.existsSync(manifestPath)) {
    // Clean session — no sanitize fired during this session. No-op.
    return null;
  }

  const { sessionId: manifestSessionId, entries } = parseManifest(manifestPath);

  // WI-7: strict session_id binding. If the manifest carries a session_id
  // (post-v12.15.0 manifests do; pre-v12.15.0 manifests do not) AND it does
  // not match the resolving session, refuse to restore. This closes H8.
  if (manifestSessionId && manifestSessionId !== sessionId) {
    console.error(`[SecretRestore] manifest session_id mismatch: manifest="${manifestSessionId}" resolved="${sessionId}"; skipping (no file writes).`);
    return null;
  }

  if (entries.length === 0) {
    // Manifest exists but is empty/malformed — clean up anyway.
    try { fs.unlinkSync(manifestPath); } catch { /* best-effort */ }
    return null;
  }

  let backedUpFiles;
  try {
    backedUpFiles = fs.readdirSync(backupDir).filter(f => f.endsWith('.orig'));
  } catch {
    backedUpFiles = [];
  }

  const restored = [];
  const failed = [];

  // Group manifest entries by file_path so we know which file_paths to
  // restore. For each file_path, find a .orig file whose contents we can
  // restore. Since each Write/Edit produces one .orig, and the manifest
  // entries reference the same file_path, we restore each file_path once.
  const filePathsToRestore = [...new Set(entries.map(e => e.file_path))];
  // .orig files recorded for a refused target are kept for manual recovery.
  const keepOrigs = new Set();

  for (const filePath of filePathsToRestore) {
    let candidateOrig = null;

    const check = restoreTargetCheck(filePath, entries);
    if (check.reason) {
      failed.push({ file_path: filePath, reason: `refused: ${check.reason}` });
      console.error(`[SecretRestore] refused restore of ${filePath}: ${check.reason}`);
      for (const e of entries) if (e.file_path === filePath && e.orig) keepOrigs.add(path.basename(e.orig));
      continue;
    }

    // P5.5: deterministic pairing. Prefer the .orig filename this file_path
    // recorded in the manifest (`orig` field). This fixes the content-swap bug
    // where >=2 sanitized files were paired by highest-mtime instead of by
    // identity, so file A could be restored with file B's original content.
    const entryWithOrig = entries.find(e => e.file_path === filePath && e.orig);
    if (entryWithOrig) {
      const recordedName = path.basename(entryWithOrig.orig);
      const recordedPath = path.join(backupDir, recordedName);
      if (backedUpFiles.includes(recordedName) && fs.existsSync(recordedPath)) {
        candidateOrig = recordedPath;
      }
    }

    // Back-compat fallback: a pre-P5.5 manifest (no `orig` field) OR a recorded
    // .orig that went missing. Pick the highest-mtime remaining .orig (the
    // legacy single-file behavior — correct when there is exactly one .orig).
    if (!candidateOrig) {
      let candidateMtime = 0;
      for (const origFile of backedUpFiles) {
        const fullOrigPath = path.join(backupDir, origFile);
        try {
          const stat = fs.statSync(fullOrigPath);
          if (stat.mtimeMs > candidateMtime) {
            candidateMtime = stat.mtimeMs;
            candidateOrig = fullOrigPath;
          }
        } catch { /* skip */ }
      }
    }

    if (!candidateOrig) {
      failed.push({ file_path: filePath, reason: 'no .orig file found' });
      continue;
    }

    try {
      const ost = fs.lstatSync(candidateOrig);
      if (!ost.isFile()) {
        failed.push({ file_path: filePath, reason: 'refused: .orig backup is not a regular file' });
        continue;
      }
      const origContent = readNoFollow(candidateOrig, ost);
      // F3 round 3: the .orig must be the sanitized target with only secret
      // tokens put back. Re-read the target through the bound fd so the
      // compared content is the content about to be overwritten.
      const current = readNoFollow(check.real, check.st);
      if (!origMatchesSanitized(current, origContent)) {
        failed.push({ file_path: filePath, reason: 'refused: .orig is not the target with secret tokens restored' });
        console.error(`[SecretRestore] refused restore of ${filePath}: .orig is not the target with secret tokens restored`);
        keepOrigs.add(path.basename(candidateOrig));
        continue;
      }
      // F3: one fd, O_NOFOLLOW, bound to the inode checked above.
      writeBound(check.real, check.st, origContent);
      restored.push({ file_path: filePath, orig: candidateOrig });
      // Remove the .orig file we just consumed so a second sanitize on the
      // same file_path doesn't restore the wrong version.
      try {
        fs.unlinkSync(candidateOrig);
        backedUpFiles = backedUpFiles.filter(f => path.join(backupDir, f) !== candidateOrig);
      } catch { /* best-effort */ }
    } catch (e) {
      failed.push({ file_path: filePath, reason: e.message });
    }
  }

  // Clean up: remove any remaining .orig files + manifest.
  for (const origFile of backedUpFiles) {
    if (keepOrigs.has(origFile)) continue;
    try { fs.unlinkSync(path.join(backupDir, origFile)); } catch { /* best-effort */ }
  }
  // The manifest goes either way. Stop fires at each turn end, so a kept
  // manifest would refuse again each time. The log names each kept .orig.
  try { fs.unlinkSync(manifestPath); } catch { /* best-effort */ }
  try { fs.rmdirSync(backupDir); } catch { /* best-effort: a kept .orig leaves it non-empty */ }
  if (keepOrigs.size > 0) {
    console.error(`[SecretRestore] kept ${keepOrigs.size} .orig backup(s) of refused target(s) in ${backupDir} for manual recovery.`);
  }

  logRestoreEvent({
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    restored_count: restored.length,
    failed_count: failed.length,
    restored,
    failed
  });

  if (failed.length > 0) {
    console.error(`[SecretRestore] session=${sessionId} restored=${restored.length} failed=${failed.length}`);
  } else if (restored.length > 0) {
    console.error(`[SecretRestore] session=${sessionId} restored=${restored.length} file(s) from backup`);
  }

  return null;
}

// CAGENTS_DISPATCH_IMPORT: a test imports the helpers without the Stop run.
if (!process.env.CAGENTS_DISPATCH_IMPORT) createHook('SecretRestore', restoreHandler);

module.exports = { restoreHandler, origMatchesSanitized, restorePathCheck, restoreTargetCheck, restoreTargetRejection, writeBound, readNoFollow };
