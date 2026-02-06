#!/usr/bin/env node
/**
 * Shared Hook Utilities - Common functions for cAgents hooks
 * cAgents V8.0 - DRY Hook Infrastructure
 *
 * Provides shared utilities used across all CJS hooks:
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

const AGENT_MEMORY_DIR = process.env.CLAUDE_PROJECT_DIR
  ? path.join(process.env.CLAUDE_PROJECT_DIR, 'Agent_Memory')
  : path.join(process.cwd(), 'Agent_Memory');

const SESSION_PREFIXES = ['run_', 'optimize_', 'review_', 'designer_', 'team_'];

/**
 * Read JSON from stdin with timeout
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
      catch (e) { done({}); }
    });
    process.stdin.on('error', () => done({}));

    setTimeout(() => done({}), 3000);
  });
}

/**
 * Read a file safely, returning null on any error
 */
function safeRead(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  } catch {
    return null;
  }
}

/**
 * Extract a simple key: value from YAML content
 */
function extractYamlValue(content, key) {
  const regex = new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?`, 'm');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Count regex pattern matches in content
 */
function countPattern(content, pattern) {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * Find the most recent active (non-completed, non-failed) session directory.
 * Result is cached per process invocation for performance (avoids repeated dir scans).
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
    .sort()
    .reverse();

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
 * Ensure a directory exists, creating it recursively if needed
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

/**
 * Generate a filesystem-safe timestamp slug from a Date
 * Example: "2026-02-05_09-46-24"
 */
function getTimestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

/**
 * Get a waypoint file path in a session's waypoints directory
 */
function getWaypointPath(sessionDir, type, date = new Date()) {
  const waypointsDir = ensureDir(path.join(sessionDir, 'waypoints'));
  const slug = getTimestampSlug(date);
  return path.join(waypointsDir, `wp-${type}-${slug}.yaml`);
}

/**
 * Assign a grade based on score and thresholds
 */
function assignGrade(score, thresholds = { excellent: 85, pass: 65 }) {
  if (score >= thresholds.excellent) return 'EXCELLENT';
  if (score >= thresholds.pass) return 'PASS';
  return 'FAIL';
}

/**
 * Calculate total score from a breakdown object, floored at 0
 */
function calculateScore(breakdown) {
  return Math.max(0, Object.values(breakdown).reduce((a, b) => a + b, 0));
}

module.exports = {
  AGENT_MEMORY_DIR,
  SESSION_PREFIXES,
  readStdin,
  safeRead,
  extractYamlValue,
  countPattern,
  findActiveSession,
  ensureDir,
  getTimestampSlug,
  getWaypointPath,
  assignGrade,
  calculateScore
};
