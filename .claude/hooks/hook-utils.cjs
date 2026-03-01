#!/usr/bin/env node
/**
 * Shared Hook Utilities - Common functions for cAgents hooks
 * cAgents V9.13 - Self-contained plugin via __dirname + ${CLAUDE_PLUGIN_ROOT}
 *
 * Provides:
 * - createHook(handler) - Factory that eliminates per-hook boilerplate
 * - readStdin() - Parse JSON from stdin
 * - findActiveSession(sessionHint?) - Locate the most recent non-completed session (with optional hint to prevent parallel collision)
 * - extractYamlValue() - Extract a value from simple YAML content
 * - safeRead() - Read a file with graceful fallback
 * - countPattern() - Count regex matches in content
 *
 * 100% Self-Contained: Uses only built-in Node.js modules.
 *
 * Path Resolution:
 * - PLUGIN_ROOT: Where cAgents is installed. Uses __dirname (always correct when
 *   hooks are executing) as primary, CLAUDE_PLUGIN_ROOT as fallback.
 * - PROJECT_ROOT: Where the user's project lives (where Agent_Memory/ is created).
 *   Uses CLAUDE_PROJECT_DIR when running as a cross-project plugin, falls back to
 *   PLUGIN_ROOT for local dev (plugin IS the project).
 */

const fs = require('fs');
const path = require('path');

// Resolve plugin root: where cAgents is installed (for finding plugin resources).
// __dirname is .claude/hooks/ -- two levels up is the plugin root. Always correct.
const PLUGIN_ROOT = path.resolve(__dirname, '../..')
  || process.env.CLAUDE_PLUGIN_ROOT
  || process.cwd();

// Resolve project root: the user's project directory (where Agent_Memory/ lives).
// When loaded as a cross-project plugin, CLAUDE_PROJECT_DIR points to the user's project.
// When running locally (plugin IS the project), fall back to PLUGIN_ROOT.
const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR
  || PLUGIN_ROOT;

const AGENT_MEMORY_DIR = path.join(PROJECT_ROOT, 'Agent_Memory');

const SESSION_PREFIXES = ['run_', 'optimize_', 'review_', 'designer_', 'team_', 'org_'];

/**
 * Read JSON from stdin with timeout.
 * Returns parsed object or {} on any failure.
 */
function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    let resolved = false;
    process.stdin.setEncoding('utf8');

    if (process.stdin.isTTY) {
      resolve({});
      return;
    }

    function done(result) {
      if (resolved) return;
      resolved = true;
      resolve(result);
    }

    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try { done(data ? JSON.parse(data) : {}); }
      catch { done({}); }
    });
    process.stdin.on('error', () => done({}));

    setTimeout(() => {
      if (!resolved) console.error('[hook-utils] readStdin timeout after 3s');
      done({});
    }, 3000);
  });
}

/**
 * Read a file safely, returning null on any error.
 */
function safeRead(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  } catch {
    return null;
  }
}

/**
 * Extract a simple key: value from YAML content.
 */
function extractYamlValue(content, key) {
  const regex = new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?`, 'm');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Count regex pattern matches in content.
 */
function countPattern(content, pattern) {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * Find the most recent active (non-completed, non-failed) session directory.
 * Cached per process invocation (cache is keyed by sessionHint to support
 * multiple concurrent teammates).
 *
 * @param {string} [sessionHint] - Optional session_id hint (e.g., from hook input).
 *   When provided and the session exists + is active, returns it immediately.
 *   This prevents the "findActiveSession collision" bug where multiple
 *   parallel teammates' hooks all write to the same session.
 */
let _cachedActiveSession = undefined;
let _cachedHint = undefined;

function findActiveSession(sessionHint) {
  // If we have a hint and it differs from cached, invalidate cache
  if (sessionHint && sessionHint !== _cachedHint) {
    _cachedActiveSession = undefined;
    _cachedHint = sessionHint;
  }

  if (_cachedActiveSession !== undefined) return _cachedActiveSession;

  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    _cachedActiveSession = null;
    return null;
  }

  // If a session hint is provided, try it first (avoids collision between parallel teammates)
  if (sessionHint) {
    const hintDir = path.join(sessionsDir, sessionHint);
    if (fs.existsSync(hintDir)) {
      const statusFile = path.join(hintDir, 'status.yaml');
      const content = safeRead(statusFile);
      if (content) {
        const phase = extractYamlValue(content, 'phase') || extractYamlValue(content, 'current_phase') || extractYamlValue(content, 'pipeline_state');
        const terminalStates = ['completed', 'complete', 'failed', 'aborted', 'COMPLETE', 'VALIDATED'];
        if (phase && !terminalStates.includes(phase)) {
          _cachedActiveSession = hintDir;
          return _cachedActiveSession;
        }
      }
      // Even if no status.yaml yet (session just created), trust the hint
      if (fs.existsSync(hintDir)) {
        _cachedActiveSession = hintDir;
        return _cachedActiveSession;
      }
    }
  }

  const sessions = fs.readdirSync(sessionsDir)
    .filter(d => SESSION_PREFIXES.some(p => d.startsWith(p)))
    .sort((a, b) => {
      const tsA = a.substring(a.indexOf('_') + 1);
      const tsB = b.substring(b.indexOf('_') + 1);
      return tsB.localeCompare(tsA);
    });

  // First pass: look for sessions with status.yaml in a non-terminal phase
  for (const session of sessions) {
    const statusFile = path.join(sessionsDir, session, 'status.yaml');
    const content = safeRead(statusFile);
    if (!content) continue;

    const phase = extractYamlValue(content, 'phase') || extractYamlValue(content, 'current_phase') || extractYamlValue(content, 'pipeline_state');
    const terminalStates = ['completed', 'complete', 'failed', 'aborted', 'COMPLETE', 'VALIDATED'];
    if (phase && !terminalStates.includes(phase)) {
      _cachedActiveSession = path.join(sessionsDir, session);
      return _cachedActiveSession;
    }
  }

  // Second pass: look for recently-created sessions without status.yaml
  // (handles the race condition where trigger agent hasn't written status.yaml yet)
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  for (const session of sessions) {
    const sessionPath = path.join(sessionsDir, session);
    const statusFile = path.join(sessionPath, 'status.yaml');
    if (safeRead(statusFile)) continue; // Already checked in first pass

    try {
      const stat = fs.statSync(sessionPath);
      if (stat.mtimeMs > fiveMinutesAgo) {
        console.error(`[findActiveSession] Found recent session without status.yaml: ${session}`);
        _cachedActiveSession = sessionPath;
        return _cachedActiveSession;
      }
    } catch { /* skip */ }
  }

  _cachedActiveSession = null;
  return null;
}

/**
 * Find the most recent active team session.
 * @param {object} input - Hook input (may contain session_id)
 * @returns {string|null} Session directory path or null
 */
function findTeamSession(input = {}) {
  // Check if session_id is provided
  if (input.session_id && input.session_id.startsWith('team_')) {
    const sessionDir = path.join(AGENT_MEMORY_DIR, 'sessions', input.session_id);
    if (fs.existsSync(sessionDir)) return sessionDir;
  }

  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) return null;

  const teamSessions = fs.readdirSync(sessionsDir)
    .filter(d => d.startsWith('team_'))
    .sort((a, b) => {
      const tsA = a.substring(a.indexOf('_') + 1);
      const tsB = b.substring(b.indexOf('_') + 1);
      return tsB.localeCompare(tsA);
    });

  for (const session of teamSessions) {
    const statusFile = path.join(sessionsDir, session, 'status.yaml');
    const content = safeRead(statusFile);
    if (!content) continue;

    const phase = extractYamlValue(content, 'phase') || extractYamlValue(content, 'pipeline_state');
    const terminalStates = ['completed', 'complete', 'failed', 'aborted', 'COMPLETE', 'VALIDATED'];
    if (phase && !terminalStates.includes(phase)) {
      return path.join(sessionsDir, session);
    }
  }

  return null;
}

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

/**
 * Generate a filesystem-safe timestamp slug.
 * Example: "2026-02-05_09-46-24"
 */
function getTimestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

/**
 * Get a waypoint file path in a session's waypoints directory.
 */
function getWaypointPath(sessionDir, type, date = new Date()) {
  const waypointsDir = ensureDir(path.join(sessionDir, 'waypoints'));
  const slug = getTimestampSlug(date);
  return path.join(waypointsDir, `wp-${type}-${slug}.yaml`);
}

/**
 * Assign a grade based on score and thresholds.
 */
function assignGrade(score, thresholds = { excellent: 85, pass: 65 }) {
  if (score >= thresholds.excellent) return 'EXCELLENT';
  if (score >= thresholds.pass) return 'PASS';
  return 'FAIL';
}

/**
 * Calculate total score from a breakdown object, floored at 0.
 */
function calculateScore(breakdown) {
  return Math.max(0, Object.values(breakdown).reduce((a, b) => a + b, 0));
}

/**
 * Parse a simple YAML task list file and return items array.
 */
function parseTaskList(filePath) {
  const content = safeRead(filePath);
  if (!content) return [];

  const items = [];
  const itemBlocks = content.split(/\n\s*- id:\s*/);

  for (let i = 1; i < itemBlocks.length; i++) {
    const block = '- id: ' + itemBlocks[i];
    const item = {};

    const idMatch = block.match(/id:\s*["']?([^"'\n]+)["']?/);
    if (idMatch) item.id = idMatch[1].trim();

    const nameMatch = block.match(/name:\s*["']?([^"'\n]+)["']?/);
    if (nameMatch) item.name = nameMatch[1].trim();

    const statusMatch = block.match(/status:\s*["']?([^"'\n]+)["']?/);
    if (statusMatch) item.status = statusMatch[1].trim();

    const claimedMatch = block.match(/claimed_by:\s*["']?([^"'\n]+)["']?/);
    if (claimedMatch) item.claimed_by = claimedMatch[1].trim();

    const depsMatch = block.match(/dependencies:\s*\[([^\]]*)\]/);
    if (depsMatch) {
      item.dependencies = depsMatch[1]
        .split(',')
        .map(d => d.trim().replace(/["']/g, ''))
        .filter(Boolean);
    } else {
      item.dependencies = [];
    }

    if (item.id) items.push(item);
  }

  return items;
}

/**
 * Check if a work item's dependencies are all completed.
 */
function areDependenciesMet(item, allItems) {
  if (!item.dependencies || item.dependencies.length === 0) return true;
  return item.dependencies.every(depId => {
    const dep = allItems.find(i => i.id === depId);
    return dep && dep.status === 'completed';
  });
}

/**
 * Find available (unclaimed, unblocked) work items from a task list file.
 */
function findAvailableWork(taskListPath) {
  const items = parseTaskList(taskListPath);
  if (items.length === 0) return [];
  return items.filter(item =>
    (item.status === 'available' || item.status === 'pending') &&
    !item.claimed_by &&
    areDependenciesMet(item, items)
  );
}

// ============================================================
// Structured Error Format (What / Why / Fix)
// ============================================================
// Provides consistent, actionable error messages across all hooks.
// Every error message answers three questions:
//   1. WHAT happened (the observable problem)
//   2. WHY it happened (root cause or context)
//   3. FIX: how to resolve it (concrete action)
// ============================================================

/**
 * Format a structured error message with What/Why/Fix sections.
 *
 * @param {object} opts - Error details
 * @param {string} opts.what - What happened (the problem)
 * @param {string} opts.why - Why it happened (root cause)
 * @param {string} opts.fix - How to fix it (concrete action)
 * @param {string} [opts.hook] - Hook name for attribution
 * @returns {string} Formatted error message
 */
function formatError({ what, why, fix, hook }) {
  const parts = [];
  if (hook) parts.push(`[${hook}]`);
  parts.push(`WHAT: ${what}`);
  parts.push(`WHY: ${why}`);
  parts.push(`FIX: ${fix}`);
  return parts.join('\n');
}

/**
 * Create a structured deny response for PreToolUse hooks.
 *
 * @param {object} opts - Error details (same as formatError)
 * @returns {object} Hook deny response with formatted reason
 */
function denyWithReason({ what, why, fix, hook }) {
  return { deny: true, reason: formatError({ what, why, fix, hook }) };
}

/**
 * Create a structured warning (continue with systemMessage).
 *
 * @param {object} opts - Warning details (same as formatError)
 * @returns {object} Hook continue response with formatted systemMessage
 */
function warnWithReason({ what, why, fix, hook }) {
  return { continue: true, systemMessage: formatError({ what, why, fix, hook }) };
}

// ============================================================
// createHook() Factory
// ============================================================
// Eliminates per-hook boilerplate: try-catch wrapping, stdin reading,
// JSON output, error handling. Each hook only needs to provide a handler
// function: async (input) => result.
//
// Result can be:
//   - null/undefined: outputs {"continue": true}
//   - { continue: true, systemMessage: "..." }
//   - { decision: "block", reason: "..." }
//   - { deny: true, reason: "..." } (for PreToolUse hooks)
//   - Any valid hook response object
// ============================================================

/**
 * Create and run a hook with standard boilerplate.
 *
 * @param {string} name - Hook name for logging (e.g., "SessionCatchup")
 * @param {function} handler - async (input) => result object
 */
function createHook(name, handler) {
  async function run() {
    try {
      const input = await readStdin();

      try {
        const result = await handler(input);

        if (!result) {
          console.log(JSON.stringify({ continue: true }));
          return;
        }

        // Shorthand: { deny: true, reason: "..." } -> full PreToolUse deny response
        if (result.deny) {
          console.log(JSON.stringify({
            hookSpecificOutput: {
              hookEventName: 'PreToolUse',
              permissionDecision: 'deny',
              permissionDecisionReason: result.reason || 'Blocked by hook'
            }
          }));
          return;
        }

        // Shorthand: { allow: true, reason: "..." } -> full allow response
        // Supports both PreToolUse (permissionDecision) and PermissionRequest (decision.behavior)
        if (result.allow) {
          const hookEvent = result.hookEvent || 'PreToolUse';
          if (hookEvent === 'PermissionRequest') {
            console.log(JSON.stringify({
              hookSpecificOutput: {
                hookEventName: 'PermissionRequest',
                decision: {
                  behavior: 'allow'
                }
              }
            }));
          } else {
            console.log(JSON.stringify({
              hookSpecificOutput: {
                hookEventName: hookEvent,
                permissionDecision: 'allow',
                permissionDecisionReason: result.reason || 'Allowed by hook'
              }
            }));
          }
          return;
        }

        console.log(JSON.stringify(result));

      } catch (error) {
        console.error(`[${name}] Error: ${error.message}`);
        console.log(JSON.stringify({ continue: true }));
      }

    } catch (e) {
      // Fatal error (e.g., stdin read failure)
      console.log(JSON.stringify({ continue: true }));
    }
  }

  run();
}

module.exports = {
  PROJECT_ROOT,
  PLUGIN_ROOT,
  AGENT_MEMORY_DIR,
  SESSION_PREFIXES,
  createHook,
  readStdin,
  safeRead,
  extractYamlValue,
  countPattern,
  findActiveSession,
  findTeamSession,
  ensureDir,
  getTimestampSlug,
  getWaypointPath,
  assignGrade,
  calculateScore,
  parseTaskList,
  areDependenciesMet,
  findAvailableWork,
  formatError,
  denyWithReason,
  warnWithReason
};
