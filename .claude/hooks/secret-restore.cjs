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
//
// WI-03: an Edit also leaves `<hash>.pre-edit.orig`, a byte copy of the file
// before the Edit. It is never a restore source.
const PRE_EDIT_SUFFIX = '.pre-edit.orig';

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

// WI-03b r2: the Stop hook has a 10 s timeout, and a killed hook writes
// nothing. So one budget per restore run bounds all the hashing. The SEARCH
// for earlier secrets is the refs match, the anchored scan and the budget
// scan. The SEARCH stops at `search`: 3 s or RESTORE_HASH_BUDGET hashes,
// shared across every placeholder and every .orig. Restore then takes the
// partial path, which writes what was found and keeps every unused .orig. The base match and the
// final check stop at `hard` (6 s); a file not checked by then is skipped
// and keeps every backup.
const RESTORE_SEARCH_MS = 3000;
const RESTORE_HARD_MS = 6000;
const RESTORE_HASH_BUDGET = 400000;
function makeBudget() {
  const t = Date.now();
  return { search: t + RESTORE_SEARCH_MS, hard: t + RESTORE_HARD_MS, hashes: 0, spent: false, hardSpent: false };
}
// Charge one hash. Returns false when the budget is spent: the search budget
// by default, the hard deadline when `hard` is true.
function charge(budget, hard) {
  if (!budget) return true;
  if (hard ? budget.hardSpent : budget.spent) return false;
  budget.hashes++;
  if ((budget.hashes & 255) === 0) {
    const now = Date.now();
    if (now > budget.hard) budget.hardSpent = true;
    if (now > budget.search) budget.spent = true;
  }
  if (budget.hashes > RESTORE_HASH_BUDGET) budget.spent = true;
  return hard ? !budget.hardSpent : !budget.spent;
}
function searchLeft(budget) {
  if (!budget) return true;
  if (!budget.spent && Date.now() > budget.search) budget.spent = true;
  return !budget.spent;
}

// When `orig` equals `current` with each BLOCK_<hex> put back as above,
// return a Map of placeholder hex -> secret token. A placeholder that stood
// for itself adds no entry. Else return null. Also return null when `budget`
// runs out: the search budget, or the hard deadline when `hard` is true.
function matchSanitized(current, orig, budget, hard) {
  if (typeof current !== 'string' || typeof orig !== 'string') return null;
  const parts = current.split(/(BLOCK_[0-9a-f]{8})/);
  if ((parts.length - 1) / 2 > MAX_PLACEHOLDERS) return null;
  let steps = 0;
  let out = false;
  const memo = new Set();
  const picks = new Map();
  function at(pi, oi) {
    if (out || ++steps > MATCH_STEP_BUDGET) return false;
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
      if (end - oi < SECRET_TOKEN_MIN) continue;
      if (!charge(budget, hard)) { out = true; return false; }
      if (sha8(orig.slice(oi, end)) === hex && at(pi + 1, end)) {
        if (!picks.has(hex)) picks.set(hex, orig.slice(oi, end));
        return true;
      }
    }
    return false;
  }
  return at(0, 0) && !out ? picks : null;
}

// True when `orig` equals `current` with each BLOCK_<hex> put back as above.
function origMatchesSanitized(current, orig) {
  return matchSanitized(current, orig) !== null;
}

// WI-03b: a later sanitize of the same file can rewrite the whole file (a
// Write). Then no saved copy shows the sanitized form that an earlier .orig
// matches. Find each wanted secret in that .orig by its hash instead. Try
// each plain token substring of 8 to 512 chars. The step budget caps the
// work; a secret that is not found stays a placeholder and its .orig stays.
const SCAN_STEP_BUDGET = 65536;
function scanForSecrets(text, wanted, budget) {
  const found = new Map();
  if (typeof text !== 'string' || wanted.size === 0) return found;
  let steps = 0;
  for (let i = 0; i < text.length && found.size < wanted.size; i++) {
    if (!SECRET_TOKEN_CHAR_RE.test(text[i])) continue;
    const limit = Math.min(text.length, i + SECRET_TOKEN_MAX);
    for (let end = i + 1; end <= limit && SECRET_TOKEN_CHAR_RE.test(text[end - 1]); end++) {
      if (end - i < SECRET_TOKEN_MIN) continue;
      if (++steps > SCAN_STEP_BUDGET || !charge(budget)) return found;
      const hex = sha8(text.slice(i, end));
      if (wanted.has(hex) && !found.has(hex)) found.set(hex, text.slice(i, end));
    }
  }
  return found;
}

// WI-03b r1: anchored scan. The text next to a placeholder in the current
// file was copied from the sanitized file. Thus it is also next to the secret
// in the earlier .orig. For each wanted BLOCK_<hex>, take up to 64 chars of
// context before it, cut at the previous placeholder. Find that context in
// `text`. Hash only the token substrings that start right after it
// (<= 505 hashes per hit). Else do the same with the context after it,
// hashing substrings that end right before it. Each anchor tries at most
// ANCHOR_HITS_MAX occurrences. The budget scan above stays the last fallback.
const ANCHOR_LENS = [64, 32, 16];
const ANCHOR_HITS_MAX = 32;
// WI-03b r2: each wanted hex is searched at most ANCHOR_MARKS_PER_HEX of its
// marks, and an anchor already tried for that hex is not tried again. So 255
// copies of one placeholder cost about one search, not 255.
const ANCHOR_MARKS_PER_HEX = 4;
// An after-anchor shorter than this is common text (`";\n`), so its first
// hits are unrelated. It is skipped and the budget is kept for other work.
const AFTER_ANCHOR_MIN = 8;
function anchoredScan(current, text, wanted, budget) {
  const found = new Map();
  if (typeof current !== 'string' || typeof text !== 'string' || wanted.size === 0) return found;
  const re = /BLOCK_([0-9a-f]{8})/g;
  const marks = [];
  let m;
  while ((m = re.exec(current)) !== null) marks.push({ hex: m[1], start: m.index, end: m.index + m[0].length });
  const hits = (anchor) => {
    const out = [];
    for (let p = text.indexOf(anchor); p >= 0 && out.length < ANCHOR_HITS_MAX; p = text.indexOf(anchor, p + 1)) out.push(p);
    return out;
  };
  const tryForward = (s, hex) => {
    const limit = Math.min(text.length, s + SECRET_TOKEN_MAX);
    for (let end = s + 1; end <= limit && SECRET_TOKEN_CHAR_RE.test(text[end - 1]); end++) {
      if (end - s < SECRET_TOKEN_MIN) continue;
      if (!charge(budget)) return null;
      if (sha8(text.slice(s, end)) === hex) return text.slice(s, end);
    }
    return null;
  };
  const tryBackward = (e, hex) => {
    const limit = Math.max(0, e - SECRET_TOKEN_MAX);
    for (let s = e - 1; s >= limit && SECRET_TOKEN_CHAR_RE.test(text[s]); s--) {
      if (e - s < SECRET_TOKEN_MIN) continue;
      if (!charge(budget)) return null;
      if (sha8(text.slice(s, e)) === hex) return text.slice(s, e);
    }
    return null;
  };
  const marksTried = new Map();
  const anchorsTried = new Set();
  // Returns true when this (hex, side, anchor) was not tried before.
  const fresh = (hex, side, a) => {
    const key = hex + side + a;
    if (anchorsTried.has(key)) return false;
    anchorsTried.add(key);
    return true;
  };
  for (let k = 0; k < marks.length && found.size < wanted.size; k++) {
    if (!searchLeft(budget)) break;
    const { hex, start, end } = marks[k];
    if (!wanted.has(hex) || found.has(hex)) continue;
    const n = marksTried.get(hex) || 0;
    if (n >= ANCHOR_MARKS_PER_HEX) continue;
    marksTried.set(hex, n + 1);
    const prevEnd = k > 0 ? marks[k - 1].end : 0;
    const nextStart = k + 1 < marks.length ? marks[k + 1].start : current.length;
    let tok = null;
    if (start === 0 && fresh(hex, '^', '')) tok = tryForward(0, hex);
    let last = null;
    for (const len of ANCHOR_LENS) {
      if (tok) break;
      const a = current.slice(Math.max(prevEnd, start - len), start);
      if (a.length === 0 || a === last) continue;
      last = a;
      if (!fresh(hex, '<', a)) continue;
      for (const p of hits(a)) { tok = tryForward(p + a.length, hex); if (tok) break; }
    }
    if (!tok && end === current.length && fresh(hex, '$', '')) tok = tryBackward(text.length, hex);
    last = null;
    for (const len of ANCHOR_LENS) {
      if (tok) break;
      const a = current.slice(end, Math.min(nextStart, end + len));
      if (a.length < AFTER_ANCHOR_MIN || a === last) continue;
      last = a;
      if (!fresh(hex, '>', a)) continue;
      for (const p of hits(a)) { tok = tryBackward(p, hex); if (tok) break; }
    }
    if (tok) found.set(hex, tok);
  }
  return found;
}

// Put each known secret back in place of its placeholder.
function fillPlaceholders(current, secrets) {
  return current.split(/(BLOCK_[0-9a-f]{8})/)
    .map((part, i) => (i % 2 === 1 && secrets.has(part.slice(6)) ? secrets.get(part.slice(6)) : part))
    .join('');
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
  // The .orig files of a refused or partly restored target are kept for manual
  // recovery, each with its `<hash>.pre-edit.orig` copy.
  const keepOrigs = new Set();
  const keep = (name) => {
    keepOrigs.add(name);
    if (!name.endsWith(PRE_EDIT_SUFFIX)) keepOrigs.add(name.replace(/\.orig$/, PRE_EDIT_SUFFIX));
  };
  const isRestoreSource = (f) => f.endsWith('.orig') && !f.endsWith(PRE_EDIT_SUFFIX);
  // WI-03b r2: one budget for the whole run, across every file and .orig.
  const budget = makeBudget();

  for (const filePath of filePathsToRestore) {
    const mine = entries.filter(e => e.file_path === filePath);
    // WI-03b: every .orig recorded for this file_path, in manifest order.
    // Each sanitized Write or Edit of the file adds one.
    const recorded = [...new Set(mine.filter(e => e.orig).map(e => path.basename(e.orig)))]
      .filter(isRestoreSource);

    const check = restoreTargetCheck(filePath, entries);
    if (check.reason) {
      failed.push({ file_path: filePath, reason: `refused: ${check.reason}` });
      console.error(`[SecretRestore] refused restore of ${filePath}: ${check.reason}`);
      recorded.forEach(keep);
      continue;
    }

    // P5.5: deterministic pairing by the recorded `orig` names. That fixes the
    // content-swap bug where >=2 sanitized files were paired by highest mtime,
    // so file A could get file B's original content.
    let origNames = recorded.filter(n => backedUpFiles.includes(n));

    // Back-compat fallback: a pre-P5.5 manifest (no `orig` field) OR recorded
    // .orig files that went missing. Pick the highest-mtime remaining .orig
    // (the legacy single-file behavior). A `*.pre-edit.orig` copy is never a
    // restore source, so it is not a candidate.
    if (origNames.length === 0) {
      let candidateMtime = 0;
      let candidate = null;
      for (const origFile of backedUpFiles.filter(isRestoreSource)) {
        try {
          const stat = fs.statSync(path.join(backupDir, origFile));
          if (stat.mtimeMs > candidateMtime) {
            candidateMtime = stat.mtimeMs;
            candidate = origFile;
          }
        } catch { /* skip */ }
      }
      if (candidate) origNames = [candidate];
    }

    if (origNames.length === 0) {
      failed.push({ file_path: filePath, reason: 'no .orig file found' });
      continue;
    }

    // WI-03b r2: past the hard deadline, do not start another file. Keep its
    // backups; the next Stop restores it.
    if (Date.now() > budget.hard) budget.hardSpent = true;
    if (budget.hardSpent) {
      failed.push({ file_path: filePath, reason: 'skipped: time budget spent' });
      console.error(`[SecretRestore] skipped restore of ${filePath}: time budget spent; backups kept.`);
      origNames.forEach(keep);
      continue;
    }

    try {
      const readBackup = (name) => {
        const p = path.join(backupDir, name);
        let st;
        try { st = fs.lstatSync(p); } catch { return null; }
        if (!st.isFile()) return null;
        try { return readNoFollow(p, st); } catch { return null; }
      };
      const origs = origNames.map(name => ({ name, content: readBackup(name) }));
      // F3 round 3: re-read the target through the bound fd, so the compared
      // content is the content about to be overwritten.
      const current = readNoFollow(check.real, check.st);

      // The base is the LAST .orig that is exactly the current file with
      // secret tokens put back. When none matches, the file changed after the
      // sanitize (or a backup was planted): refuse and keep every backup.
      let baseIdx = -1;
      let secrets = null;
      for (let i = origs.length - 1; i >= 0; i--) {
        const m = origs[i].content === null ? null : matchSanitized(current, origs[i].content, budget, true);
        if (m) { baseIdx = i; secrets = m; break; }
        if (budget.hardSpent) break;
      }
      if (baseIdx < 0) {
        const reason = budget.hardSpent
          ? 'skipped: time budget spent'
          : origs.some(o => o.content === null)
            ? 'refused: .orig backup is not a regular file'
            : 'refused: .orig is not the target with secret tokens restored';
        failed.push({ file_path: filePath, reason });
        console.error(`[SecretRestore] ${reason.startsWith('skipped') ? 'skipped' : 'refused'} restore of ${filePath}: ${reason.replace(/^(?:refused|skipped): /, '')}`);
        origNames.forEach(keep);
        continue;
      }

      // A placeholder of an earlier sanitize is still in the file as
      // BLOCK_<hex>. Chain the earlier .orig files, newest first. An Edit
      // left `<hash>.pre-edit.orig`, the file before that Edit, which is the
      // sanitized form that the previous .orig matches. Else find the secret
      // in the .orig by its hash. Only placeholders that this file_path
      // recorded are filled, and the final content is checked again below.
      const recordedHex = new Set(mine.map(e => (PLACEHOLDER_RE.exec(e.placeholder || '') || [])[1]).filter(Boolean));
      // refs[j] is the pre-edit copy of origs[j], or null. The pre-edit copy
      // of origs[i + 1] is the usual match for origs[i]. Thus the hook tries it
      // first. WI-03b r2: this keeps a chain of N Edits at O(N) matches.
      const refs = new Array(origs.length).fill(null);
      for (let i = baseIdx; i >= 1; i--) {
        refs[i] = readBackup(origs[i].name.replace(/\.orig$/, PRE_EDIT_SUFFIX));
      }
      const refOrder = (i) => {
        const out = [];
        if (refs[i + 1] != null) out.push(refs[i + 1]);
        for (let j = baseIdx; j >= 1; j--) if (j !== i + 1 && refs[j] != null) out.push(refs[j]);
        return out;
      };
      const used = new Set([origs[baseIdx].name]);
      for (let i = baseIdx - 1; i >= 0; i--) {
        const o = origs[i];
        if (o.content === null) continue;
        const wanted = new Set(mine.filter(e => path.basename(e.orig || '') === o.name)
          .map(e => (PLACEHOLDER_RE.exec(e.placeholder || '') || [])[1])
          .filter(h => h && !secrets.has(h)));
        if (wanted.size === 0) continue;
        // WI-03b r2: one shared search budget. When it is spent, stop the
        // search; the partial path below writes what was found.
        if (!searchLeft(budget)) break;
        let got = null;
        for (const ref of refOrder(i)) {
          if (!searchLeft(budget)) break;
          const m = matchSanitized(ref, o.content, budget);
          if (m) { got = m; break; }
        }
        if (!got) {
          got = anchoredScan(current, o.content, wanted, budget);
          const rest = new Set([...wanted].filter(h => !got.has(h)));
          if (rest.size > 0 && searchLeft(budget)) for (const [h, t] of scanForSecrets(o.content, rest, budget)) got.set(h, t);
        }
        let added = false;
        for (const [hex, tok] of got) {
          if (wanted.has(hex) && !secrets.has(hex)) { secrets.set(hex, tok); added = true; }
        }
        if (added) used.add(o.name);
      }
      for (const hex of [...secrets.keys()]) if (!recordedHex.has(hex)) secrets.delete(hex);

      const restoredContent = fillPlaceholders(current, secrets);
      // The same F3 check as before, on the content about to be written.
      if (!origMatchesSanitized(current, restoredContent)) {
        failed.push({ file_path: filePath, reason: 'refused: .orig is not the target with secret tokens restored' });
        console.error(`[SecretRestore] refused restore of ${filePath}: .orig is not the target with secret tokens restored`);
        origNames.forEach(keep);
        continue;
      }
      // F3: one fd, O_NOFOLLOW, bound to the inode checked above.
      writeBound(check.real, check.st, restoredContent);
      restored.push({ file_path: filePath, orig: path.join(backupDir, origs[baseIdx].name), chained: used.size });

      // A recorded placeholder that is still in the file was not restored.
      // Keep every .orig that did not give a secret, so no secret is lost.
      const left = [...recordedHex].filter(h => restoredContent.includes(`BLOCK_${h}`) && !secrets.has(h));
      if (left.length > 0) {
        failed.push({ file_path: filePath, reason: `partial: ${left.length} placeholder(s) not restored` });
        console.error(`[SecretRestore] partial restore of ${filePath}: ${left.length} placeholder(s) not restored; backups kept.`);
        origNames.filter(n => !used.has(n)).forEach(keep);
      }
      // Remove the consumed .orig files and their pre-edit copies. Then a
      // second sanitize on the same file_path does not restore a stale one.
      for (const name of origNames) {
        if (keepOrigs.has(name)) continue;
        for (const f of [name, name.replace(/\.orig$/, PRE_EDIT_SUFFIX)]) {
          try { fs.unlinkSync(path.join(backupDir, f)); } catch { /* best-effort */ }
          backedUpFiles = backedUpFiles.filter(b => b !== f);
        }
      }
    } catch (e) {
      failed.push({ file_path: filePath, reason: e.message });
      // An error must not lose a backup either.
      origNames.forEach(keep);
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
  // Count only the kept names that are on disk. The keep() function also adds the
  // `<hash>.pre-edit.orig` name of a Write .orig, which has no such copy.
  let keptOnDisk = 0;
  for (const name of keepOrigs) {
    try { if (fs.lstatSync(path.join(backupDir, name)).isFile()) keptOnDisk++; } catch { /* not on disk */ }
  }
  if (keptOnDisk > 0) {
    console.error(`[SecretRestore] kept ${keptOnDisk} .orig backup(s) of refused target(s) in ${backupDir} for manual recovery.`);
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
