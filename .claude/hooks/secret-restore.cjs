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
const path = require('path');
const { createHook, AGENT_MEMORY_DIR, ensureDir } = require('./hook-utils.cjs');

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
    if (placeholderMatch) entry.placeholder = placeholderMatch[1].trim();
    if (filePathMatch) entry.file_path = filePathMatch[1].trim();
    if (hashMatch) entry.hash = hashMatch[1].trim();
    if (entry.placeholder && entry.file_path) entries.push(entry);
  }
  return { sessionId, entries };
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

createHook('SecretRestore', async (input) => {
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

  for (const filePath of filePathsToRestore) {
    // Find any .orig file — for the current implementation, each file_path
    // has exactly one .orig per sanitize-event. We pick the most recent.
    let candidateOrig = null;
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

    if (!candidateOrig) {
      failed.push({ file_path: filePath, reason: 'no .orig file found' });
      continue;
    }

    try {
      const origContent = fs.readFileSync(candidateOrig, 'utf8');
      const targetDir = path.dirname(filePath);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(filePath, origContent);
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
    try { fs.unlinkSync(path.join(backupDir, origFile)); } catch { /* best-effort */ }
  }
  try { fs.unlinkSync(manifestPath); } catch { /* best-effort */ }
  try { fs.rmdirSync(backupDir); } catch { /* best-effort */ }

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
});
