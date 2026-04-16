#!/usr/bin/env node
/**
 * cAgents Status Line
 *
 * Standalone CJS command for Claude Code's status line feature.
 * Parses the official JSON session data from stdin (model, context_window, cost,
 * rate_limits, session_id, etc.) and merges it with cAgents session state
 * (pipeline phase, work item progress, domain) for a combined status line.
 *
 * Output format (active session):
 *   [cAgents v10.25.9] Opus | fix-auth | COORDINATED | ██░░░ 2/5 | 42% ctx | $0.12
 *
 * Output format (idle):
 *   [cAgents v10.25.9] Opus | idle | 8% ctx | $0.03
 *
 * Official stdin JSON schema (from Claude Code):
 *   model.id, model.display_name
 *   context_window.used_percentage, context_window.remaining_percentage
 *   cost.total_cost_usd, cost.total_duration_ms
 *   rate_limits.five_hour.used_percentage, rate_limits.seven_day.used_percentage
 *   session_id, workspace.current_dir, version
 *   See https://code.claude.com/docs/en/statusline.md for full schema.
 *
 * cAgents session state (from Agent_Memory files):
 *   Pipeline phase (from EVT files or status.yaml)
 *   Work item progress (from coordination_log.yaml / work_items.yaml)
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
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
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
// 2. Parse stdin JSON from Claude Code
//    Returns parsed object or {} if unavailable/malformed
// ---------------------------------------------------------------------------
function parseStdinData(raw) {
  if (!raw || !raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// 3. Extract official Claude Code fields from stdin JSON
//    All fields use safe access with fallbacks for null/missing values
// ---------------------------------------------------------------------------
function extractClaudeCodeData(data) {
  return {
    modelName: data.model?.display_name || null,
    modelId: data.model?.id || null,
    contextPct: Math.floor(data.context_window?.used_percentage ?? -1),
    contextRemaining: Math.floor(data.context_window?.remaining_percentage ?? -1),
    contextSize: data.context_window?.context_window_size || null,
    costUsd: data.cost?.total_cost_usd ?? null,
    durationMs: data.cost?.total_duration_ms ?? null,
    linesAdded: data.cost?.total_lines_added ?? 0,
    linesRemoved: data.cost?.total_lines_removed ?? 0,
    rateLimitFiveHr: data.rate_limits?.five_hour?.used_percentage ?? null,
    rateLimitSevenDay: data.rate_limits?.seven_day?.used_percentage ?? null,
    sessionId: data.session_id || null,
    sessionName: data.session_name || null,
    ccVersion: data.version || null,
    cwd: data.workspace?.current_dir || data.cwd || null,
  };
}

// ---------------------------------------------------------------------------
// 4. Extract slug from session ID
//    "run_fix-auth_260317_001" -> "fix-auth"
// ---------------------------------------------------------------------------
function extractSlug(sessionId) {
  const parts = sessionId.split('_');
  const slugParts = parts.slice(1, parts.length - 2);
  const slug = slugParts.join('_');
  const MAX_SLUG = 28;
  return slug.length > MAX_SLUG ? slug.slice(0, MAX_SLUG - 1) + '\u2026' : slug;
}

// ---------------------------------------------------------------------------
// 4b. Find latest EVT state from events directory
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
        return numB - numA;
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
// 5. Progress bar
// ---------------------------------------------------------------------------
function progressBar(done, total, width = 5) {
  if (total === 0) return '';
  const filled = Math.round((done / total) * width);
  const empty = Math.max(0, width - filled);
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
  return C.cyan(bar) + ` ${done}/${total}`;
}

// ---------------------------------------------------------------------------
// 6. Format cost as compact USD string
// ---------------------------------------------------------------------------
function formatCost(costUsd) {
  if (costUsd === null || costUsd === undefined) return null;
  if (costUsd < 0.01) return '$' + costUsd.toFixed(3);
  if (costUsd < 1) return '$' + costUsd.toFixed(2);
  return '$' + costUsd.toFixed(2);
}

// ---------------------------------------------------------------------------
// 7. Format context percentage with color coding
// ---------------------------------------------------------------------------
function formatContextPct(pct) {
  if (pct < 0) return null;
  const label = `${pct}% ctx`;
  if (pct >= 80) return C.red(label);
  if (pct >= 60) return C.yellow(label);
  return C.dim(label);
}

// ---------------------------------------------------------------------------
// 8. Session info (cAgents-specific state from Agent_Memory)
// ---------------------------------------------------------------------------
function getSessionInfo() {
  const sessionDir = findActiveSession();
  if (!sessionDir) return null;

  const sessionId = path.basename(sessionDir);
  const info = { id: sessionId, state: null, wiDone: 0, wiTotal: 0 };

  // status.yaml -> pipeline_state or phase
  const status = safeRead(path.join(sessionDir, 'status.yaml'));
  if (status) {
    info.state = extractYamlValue(status, 'pipeline_state')
      || extractYamlValue(status, 'phase')
      || extractYamlValue(status, 'current_phase');
  }

  // EVT files -> more current state
  const { state: evtState, evtCount } = getLatestEventState(sessionDir);
  if (evtState) {
    info.state = evtState;
  }

  // work_items.yaml -> total work items
  const workItems = safeRead(path.join(sessionDir, 'workflow', 'work_items.yaml'));
  if (workItems) {
    info.wiTotal = countPattern(workItems, /- id:\s/g);
  }

  // Progress counting
  const coordLog = safeRead(path.join(sessionDir, 'workflow', 'coordination_log.yaml'));
  if (coordLog) {
    info.wiDone = countPattern(coordLog, /status:\s*["']?completed/g);
  } else {
    const taskList = safeRead(path.join(sessionDir, 'team', 'task_list.yaml'));
    if (taskList) {
      info.wiDone = countPattern(taskList, /status:\s*["']?completed/g);
    } else if (evtCount > 0 && info.wiTotal === 0) {
      info.wiDone = evtCount;
      info.wiTotal = 6;
    }
  }

  return info;
}

// ---------------------------------------------------------------------------
// 9. Build output — merges Claude Code stdin data with cAgents session state
// ---------------------------------------------------------------------------
function buildStatusLine(stdinData) {
  const version = getVersion();
  const cc = extractClaudeCodeData(stdinData || {});
  const session = getSessionInfo();

  const tag = C.cyan(`[cAgents v${version}]`);
  const sep = C.dim('\u2502');
  const parts = [tag];

  // Model name from official stdin data
  if (cc.modelName) {
    parts.push(cc.modelName);
  }

  if (session) {
    // cAgents session slug
    const slug = extractSlug(session.id);
    parts.push(sep);
    parts.push(slug);

    // Pipeline state
    if (session.state) {
      parts.push(sep);
      parts.push(C.yellow(session.state));
    }

    // Work item progress bar
    const bar = progressBar(session.wiDone, session.wiTotal);
    if (bar) {
      parts.push(sep);
      parts.push(bar);
    }
  } else {
    parts.push(sep);
    parts.push(C.dim('idle'));
  }

  // Context window percentage from official stdin data
  const ctxLabel = formatContextPct(cc.contextPct);
  if (ctxLabel) {
    parts.push(sep);
    parts.push(ctxLabel);
  }

  // Cost from official stdin data
  const costLabel = formatCost(cc.costUsd);
  if (costLabel) {
    parts.push(sep);
    parts.push(C.dim(costLabel));
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Main: read stdin JSON from Claude Code, then output merged status line
// ---------------------------------------------------------------------------
function main() {
  // TTY mode (manual testing): no stdin available
  if (process.stdin.isTTY) {
    process.stdout.write(buildStatusLine({}));
    return;
  }

  let data = '';
  let done = false;

  function writeOnce() {
    if (done) return;
    done = true;
    const parsed = parseStdinData(data);
    process.stdout.write(buildStatusLine(parsed));
  }

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { data += chunk; });
  process.stdin.on('end', () => {
    writeOnce();
  });
  process.stdin.on('error', () => {
    writeOnce();
  });

  // Safety timeout -- don't hang if stdin never closes
  setTimeout(() => {
    writeOnce();
    process.exit(0);
  }, 2000);
}

if (require.main === module) {
  main();
}

module.exports = { extractSlug, progressBar, buildStatusLine, getLatestEventState, parseStdinData, extractClaudeCodeData, formatCost, formatContextPct };
