#!/usr/bin/env node
/**
 * Shared Hook Utilities - Common functions for cAgents hooks
 * cAgents V9.5 - Refactored Hook Infrastructure
 *
 * Provides:
 * - createHook(handler) - Factory that eliminates per-hook boilerplate
 * - readStdin() - Parse JSON from stdin
 * - findActiveSession() - Locate the most recent non-completed session
 * - extractYamlValue() - Extract a value from simple YAML content
 * - safeRead() - Read a file with graceful fallback
 * - countPattern() - Count regex matches in content
 *
 * 100% Self-Contained: Uses only built-in Node.js modules.
 */

const fs = require('fs');
const path = require('path');

// Resolve project root: prefer CLAUDE_PROJECT_DIR (user project with Agent_Memory),
// fall back to CLAUDE_PLUGIN_ROOT (plugin install dir), then cwd.
const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR
  || process.env.CLAUDE_PLUGIN_ROOT
  || process.cwd();

const AGENT_MEMORY_DIR = path.join(PROJECT_ROOT, 'Agent_Memory');

const SESSION_PREFIXES = ['run_', 'optimize_', 'review_', 'designer_', 'team_'];

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
 * Cached per process invocation.
 */
let _cachedActiveSession = undefined;

function findActiveSession() {
  if (_cachedActiveSession !== undefined) return _cachedActiveSession;

  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    _cachedActiveSession = null;
    return null;
  }

  const sessions = fs.readdirSync(sessionsDir)
    .filter(d => SESSION_PREFIXES.some(p => d.startsWith(p)))
    .sort((a, b) => {
      const tsA = a.substring(a.indexOf('_') + 1);
      const tsB = b.substring(b.indexOf('_') + 1);
      return tsB.localeCompare(tsA);
    });

  for (const session of sessions) {
    const statusFile = path.join(sessionsDir, session, 'status.yaml');
    const content = safeRead(statusFile);
    if (!content) continue;

    const phase = extractYamlValue(content, 'phase') || extractYamlValue(content, 'current_phase');
    if (phase && phase !== 'completed' && phase !== 'failed') {
      _cachedActiveSession = path.join(sessionsDir, session);
      return _cachedActiveSession;
    }
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
    .sort()
    .reverse();

  for (const session of teamSessions) {
    const statusFile = path.join(sessionsDir, session, 'status.yaml');
    const content = safeRead(statusFile);
    if (!content) continue;

    const phase = extractYamlValue(content, 'phase');
    if (phase && phase !== 'completed' && phase !== 'failed') {
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
  findAvailableWork
};
