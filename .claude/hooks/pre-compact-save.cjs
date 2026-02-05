#!/usr/bin/env node
/**
 * PreCompact Hook - Save critical state before context compaction
 * cAgents V8.0 - Hook System Enhancement
 *
 * This hook runs BEFORE Claude Code compacts the context window.
 * It saves critical workflow state that must survive compaction.
 *
 * 100% Self-Contained: Uses only built-in Node.js modules.
 *
 * Input (stdin): JSON with session context
 * Output (stdout): JSON with continue status
 */

// CRITICAL: Wrap everything in try-catch for plugin resilience
try {

const fs = require('fs');
const path = require('path');

// Try to load hook-utils, fall back to inline implementations
let utils;
try {
  utils = require('./hook-utils.cjs');
} catch {
  // Minimal inline fallbacks for plugin mode
  utils = {
    readStdin: () => Promise.resolve({}),
    findActiveSession: () => null,
    extractYamlValue: () => null,
    safeRead: () => null,
    countPattern: () => 0,
    getTimestampSlug: () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19),
    getWaypointPath: () => '/tmp/wp.yaml'
  };
}

const { readStdin, findActiveSession, extractYamlValue, safeRead, countPattern, getTimestampSlug, getWaypointPath } = utils;

/**
 * Create waypoint snapshot.
 * Uses timestamp-based IDs to avoid scanning the directory for numbering.
 */
function createWaypoint(sessionDir) {
  const timestamp = new Date();
  const tsSlug = getTimestampSlug(timestamp);
  const waypointId = `WP-compact-${tsSlug}`;
  const waypointFile = getWaypointPath(sessionDir, 'compact', timestamp);

  // Gather state from various files
  const statusFile = path.join(sessionDir, 'status.yaml');
  const coordFile = path.join(sessionDir, 'workflow', 'coordination_log.yaml');

  const statusContent = safeRead(statusFile);
  const phase = statusContent ? (extractYamlValue(statusContent, 'phase') || 'unknown') : 'unknown';

  let workItemsCompleted = [];
  let workItemsPending = [];

  const coordContent = safeRead(coordFile);
  if (coordContent) {
    const completedCount = countPattern(coordContent, /status:\s*completed/g);
    const pendingCount = countPattern(coordContent, /status:\s*pending/g);
    if (completedCount) workItemsCompleted = [`${completedCount} items`];
    if (pendingCount) workItemsPending = [`${pendingCount} items`];
  }

  // Create waypoint content
  const isoTimestamp = timestamp.toISOString();
  const waypointContent = `# Waypoint created by PreCompact hook
id: ${waypointId}
type: pre_compact
phase: ${phase}
work_items_completed: [${workItemsCompleted.join(', ')}]
work_items_pending: [${workItemsPending.join(', ')}]
created_at: "${isoTimestamp}"
trigger: context_compaction
next_action: "Resume from ${phase} phase after context restored"

# Recovery hints
recovery:
  read_files:
    - ${path.relative(sessionDir, statusFile)}
    - ${path.relative(sessionDir, coordFile)}
  resume_phase: ${phase}

# Context snapshot
snapshot:
  session_dir: "${sessionDir}"
  timestamp: "${isoTimestamp}"
`;

  fs.writeFileSync(waypointFile, waypointContent);
  return waypointId;
}

/**
 * Main hook execution
 */
async function main() {
  await readStdin();

  try {
    const sessionDir = findActiveSession();

    if (sessionDir) {
      const waypointId = createWaypoint(sessionDir);
      console.error(`[PreCompact] Saved waypoint ${waypointId} to ${sessionDir}`);

      console.log(JSON.stringify({
        continue: true,
        systemMessage: `cAgents: Workflow state saved (${waypointId}). Context will be compacted.`
      }));
    } else {
      console.log(JSON.stringify({ continue: true }));
    }
  } catch (error) {
    console.error(`[PreCompact] Error: ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
  }
}

main();

} catch (e) {
  // Top-level catch for plugin resilience - always output valid JSON
  console.log(JSON.stringify({ continue: true }));
}
