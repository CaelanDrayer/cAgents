#!/usr/bin/env node
/**
 * cAgents Status Line
 *
 * Standalone CJS command for Claude Code's status line feature.
 * Reads workspace context from stdin, outputs a single ANSI-colored line to stdout.
 *
 * Output format (active session):
 *   [cAgents v10.22.6] fix-auth │ COORDINATED │ ██░░░ 2/5
 *
 * Output format (idle):
 *   [cAgents v10.22.7] No Active Sessions | Waiting | 0/0
 *
 * State resolution priority (most current first):
 *   1. Latest EVT-N.yaml state_to field (real-time, written after each phase completes)
 *   2. status.yaml pipeline_state (written before each phase starts)
 *   3. status.yaml phase / current_phase (legacy fallback)
 *
 * Progress resolution priority:
 *   1. coordination_log.yaml completed count vs work_items.yaml total (controller phase)
 *   2. EVT file count vs 6 pipeline stages (pre-controller pipeline phases)
 *   3. task_list.yaml completed count (team sessions)
 */

const fs = require('fs');
const path = require('path');

// Import helpers from hook-utils
const {
  findActiveSession,
  safeRead,
  extractYamlValue,
  countPattern,
  PLUGIN_ROOT
} = require('./hook-utils.cjs');

// ANSI color helpers
const C = {
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  magenta: (s) => `\x1b[35m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

// ---------------------------------------------------------------------------
// 1. Version
// ---------------------------------------------------------------------------
function getVersion() {
  if (process.env.CAGENTS_VERSION) return process.env.CAGENTS_VERSION;
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, 'package.json'), 'utf8'));
    return pkg.version || '?';
  } catch {
    return '?';
  }
}

// ---------------------------------------------------------------------------
// 2. Extract slug from session ID
//    "run_fix-auth_260317_001" -> "fix-auth"
//    Splits by '_', drops first element (command type) and last 2 (date, counter)
// ---------------------------------------------------------------------------
function extractSlug(sessionId) {
  const parts = sessionId.split('_');
  // Drop first (command type) and last 2 (date, counter)
  const slugParts = parts.slice(1, parts.length - 2);
  const slug = slugParts.join('_');
  // Truncate long slugs to keep the status line compact
  // 28 chars allows descriptive task names without excessive truncation
  const MAX_SLUG = 28;
  return slug.length > MAX_SLUG ? slug.slice(0, MAX_SLUG - 1) + '…' : slug;
}

// ---------------------------------------------------------------------------
// 2b. Find latest EVT state from events directory
//     Returns { state, evtCount } or { state: null, evtCount: 0 }
//     EVT files: workflow/events/EVT-1.yaml, EVT-2.yaml, ...
//     state_to in the latest EVT is more current than status.yaml (written AFTER phase completes)
//
//     NOTE: Uses fs directly (not safeRead/extractYamlValue) so this function works
//     correctly even in test contexts where hook-utils is stubbed.
// ---------------------------------------------------------------------------
function getLatestEventState(sessionDir) {
  const eventsDir = path.join(sessionDir, 'workflow', 'events');
  try {
    if (!fs.existsSync(eventsDir)) return { state: null, evtCount: 0 };
    const evtFiles = fs.readdirSync(eventsDir)
      .filter(f => /^EVT-\d+\.yaml$/.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0], 10);
        const numB = parseInt(b.match(/\d+/)[0], 10);
        return numB - numA; // descending: latest first
      });
    if (evtFiles.length === 0) return { state: null, evtCount: 0 };
    let state = null;
    try {
      const content = fs.readFileSync(path.join(eventsDir, evtFiles[0]), 'utf8');
      const m = content.match(/^state_to:\s*["']?([^"'\n]+)["']?/m);
      if (m) state = m[1].trim();
    } catch { /* file unreadable */ }
    return { state, evtCount: evtFiles.length };
  } catch {
    return { state: null, evtCount: 0 };
  }
}

// ---------------------------------------------------------------------------
// 3. Progress bar
//    Returns cyan-colored bar: '█'.repeat(filled) + '░'.repeat(empty) + ' done/total'
//    Returns '' if total is 0
// ---------------------------------------------------------------------------
function progressBar(done, total, width = 5) {
  if (total === 0) return '';
  const filled = Math.round((done / total) * width);
  const empty = Math.max(0, width - filled);
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return C.cyan(bar) + ` ${done}/${total}`;
}

// ---------------------------------------------------------------------------
// 4. Session info
// ---------------------------------------------------------------------------
function getSessionInfo() {
  const sessionDir = findActiveSession();
  if (!sessionDir) return null;

  const sessionId = path.basename(sessionDir);
  const info = { id: sessionId, state: null, wiDone: 0, wiTotal: 0 };

  // status.yaml -> pipeline_state or phase (fallback; may be stale during long phases)
  const status = safeRead(path.join(sessionDir, 'status.yaml'));
  if (status) {
    info.state = extractYamlValue(status, 'pipeline_state')
      || extractYamlValue(status, 'phase')
      || extractYamlValue(status, 'current_phase');
  }

  // EVT files -> more current state (written AFTER each phase completes, not before)
  // Priority: latest EVT state_to overrides status.yaml (state machine writes status BEFORE
  // spawning agent; EVT is written AFTER agent returns, giving true current state)
  const { state: evtState, evtCount } = getLatestEventState(sessionDir);
  if (evtState) {
    info.state = evtState;
  }

  // work_items.yaml -> total work items (count "- id:" lines)
  const workItems = safeRead(path.join(sessionDir, 'workflow', 'work_items.yaml'));
  if (workItems) {
    info.wiTotal = countPattern(workItems, /- id:\s/g);
  }

  // Progress counting — priority order:
  // 1. coordination_log.yaml completed count (most accurate during controller phase)
  // 2. task_list.yaml completed count (team sessions)
  // 3. EVT file count vs 6 pipeline stages (pre-controller pipeline progress)
  const coordLog = safeRead(path.join(sessionDir, 'workflow', 'coordination_log.yaml'));
  if (coordLog) {
    info.wiDone = countPattern(coordLog, /status:\s*["']?completed/g);
  } else {
    const taskList = safeRead(path.join(sessionDir, 'team', 'task_list.yaml'));
    if (taskList) {
      info.wiDone = countPattern(taskList, /status:\s*["']?completed/g);
    } else if (evtCount > 0 && info.wiTotal === 0) {
      // No work items yet (pre-decomposition phases) — show pipeline stage progress
      // 6 stages: INIT -> ORCHESTRATED -> PLANNED -> DECOMPOSED -> PROMPTS_READY -> COORDINATED
      info.wiDone = evtCount;
      info.wiTotal = 6;
    }
  }

  return info;
}

// ---------------------------------------------------------------------------
// 5. Build output
// ---------------------------------------------------------------------------
function buildStatusLine() {
  const version = getVersion();
  const session = getSessionInfo();

  const tag = C.cyan(`[cAgents v${version}]`);

  if (!session) {
    return `${tag} ${C.dim('No Active Sessions | Waiting | 0/0')}`;
  }

  const slug = extractSlug(session.id);
  const sep = C.dim('│');
  const parts = [tag, slug];

  if (session.state) {
    parts.push(sep);
    parts.push(C.yellow(session.state));
  }

  const bar = progressBar(session.wiDone, session.wiTotal);
  if (bar) {
    parts.push(sep);
    parts.push(bar);
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Main: read stdin (Claude Code sends workspace JSON), then output status line
// ---------------------------------------------------------------------------
function main() {
  let data = '';

  if (process.stdin.isTTY) {
    process.stdout.write(buildStatusLine());
    return;
  }

  // Guard against double-output: both stdin 'end' and setTimeout can fire.
  // Whichever fires first wins; the other is a no-op.
  let done = false;
  function writeOnce() {
    if (done) return;
    done = true;
    process.stdout.write(buildStatusLine());
  }

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { data += chunk; });
  process.stdin.on('end', () => {
    // We read stdin to consume it, but don't depend on its contents
    writeOnce();
  });
  process.stdin.on('error', () => {
    writeOnce();
  });

  // Safety timeout — don't hang if stdin never closes
  setTimeout(() => {
    writeOnce();
    process.exit(0);
  }, 2000);
}

if (require.main === module) {
  main();
}

module.exports = { extractSlug, progressBar, buildStatusLine, getLatestEventState };
