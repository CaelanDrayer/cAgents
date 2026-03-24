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
 *   [cAgents v10.22.6] idle
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
  return slugParts.join('_');
}

// ---------------------------------------------------------------------------
// 3. Progress bar
//    Returns cyan-colored bar: '█'.repeat(filled) + '░'.repeat(empty) + ' done/total'
//    Returns '' if total is 0
// ---------------------------------------------------------------------------
function progressBar(done, total, width = 5) {
  if (total === 0) return '';
  const filled = Math.round((done / total) * width);
  const empty = width - filled;
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

  // status.yaml -> pipeline_state or phase
  const status = safeRead(path.join(sessionDir, 'status.yaml'));
  if (status) {
    info.state = extractYamlValue(status, 'pipeline_state')
      || extractYamlValue(status, 'phase')
      || extractYamlValue(status, 'current_phase');
  }

  // work_items.yaml -> total work items (count "- id:" lines)
  const workItems = safeRead(path.join(sessionDir, 'workflow', 'work_items.yaml'));
  if (workItems) {
    info.wiTotal = countPattern(workItems, /- id:\s/g);
  }

  // task_list.yaml -> completed count, or fall back to coordination_log
  const taskList = safeRead(path.join(sessionDir, 'team', 'task_list.yaml'));
  if (taskList) {
    info.wiDone = countPattern(taskList, /status:\s*["']?completed/g);
  } else {
    const coordLog = safeRead(path.join(sessionDir, 'workflow', 'coordination_log.yaml'));
    if (coordLog) {
      info.wiDone = countPattern(coordLog, /status:\s*["']?completed/g);
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
    return `${tag} ${C.dim('idle')}`;
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

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { data += chunk; });
  process.stdin.on('end', () => {
    // We read stdin to consume it, but don't depend on its contents
    process.stdout.write(buildStatusLine());
  });
  process.stdin.on('error', () => {
    process.stdout.write(buildStatusLine());
  });

  // Safety timeout — don't hang if stdin never closes
  setTimeout(() => {
    process.stdout.write(buildStatusLine());
    process.exit(0);
  }, 2000);
}

if (require.main === module) {
  main();
}

module.exports = { extractSlug, progressBar, buildStatusLine };
