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

const fs = require('fs');
const path = require('path');

const AGENT_MEMORY_DIR = process.env.CLAUDE_PROJECT_DIR
  ? path.join(process.env.CLAUDE_PROJECT_DIR, 'Agent_Memory')
  : path.join(process.cwd(), 'Agent_Memory');

/**
 * Read JSON from stdin
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');

    if (process.stdin.isTTY) {
      resolve({});
      return;
    }

    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
    process.stdin.on('error', () => resolve({}));

    // Timeout after 1 second
    setTimeout(() => resolve({}), 1000);
  });
}

/**
 * Find active session directory
 */
function findActiveSession() {
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) return null;

  const sessions = fs.readdirSync(sessionsDir)
    .filter(d => d.startsWith('run_') || d.startsWith('optimize_') || d.startsWith('explore_'))
    .sort()
    .reverse();

  for (const session of sessions) {
    const statusFile = path.join(sessionsDir, session, 'status.yaml');
    if (fs.existsSync(statusFile)) {
      const content = fs.readFileSync(statusFile, 'utf8');
      // Check if session is active (not completed or failed)
      if (!content.includes('phase: completed') && !content.includes('phase: failed')) {
        return path.join(sessionsDir, session);
      }
    }
  }
  return null;
}

/**
 * Extract YAML value (simple parser - no external deps)
 */
function extractYamlValue(content, key) {
  const regex = new RegExp(`^${key}:\\s*(.+)$`, 'm');
  const match = content.match(regex);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

/**
 * Create waypoint snapshot
 */
function createWaypoint(sessionDir) {
  const waypointsDir = path.join(sessionDir, 'waypoints');
  if (!fs.existsSync(waypointsDir)) {
    fs.mkdirSync(waypointsDir, { recursive: true });
  }

  // Find next waypoint number
  const existing = fs.readdirSync(waypointsDir)
    .filter(f => f.startsWith('wp-'))
    .map(f => parseInt(f.replace('wp-', '').replace('.yaml', ''), 10))
    .filter(n => !isNaN(n));

  const nextNum = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  const waypointId = `WP-${String(nextNum).padStart(3, '0')}`;
  const waypointFile = path.join(waypointsDir, `wp-${String(nextNum).padStart(3, '0')}.yaml`);

  // Gather state from various files
  let phase = 'unknown';
  let workItemsCompleted = [];
  let workItemsPending = [];

  // Read status.yaml
  const statusFile = path.join(sessionDir, 'status.yaml');
  if (fs.existsSync(statusFile)) {
    const content = fs.readFileSync(statusFile, 'utf8');
    phase = extractYamlValue(content, 'phase') || 'unknown';
  }

  // Read coordination_log.yaml for work item status
  const coordFile = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
  if (fs.existsSync(coordFile)) {
    const content = fs.readFileSync(coordFile, 'utf8');
    // Simple extraction of completed/pending work items
    const completedMatch = content.match(/status:\s*completed/g);
    const pendingMatch = content.match(/status:\s*pending/g);
    if (completedMatch) workItemsCompleted = [`${completedMatch.length} items`];
    if (pendingMatch) workItemsPending = [`${pendingMatch.length} items`];
  }

  // Create waypoint content
  const timestamp = new Date().toISOString();
  const waypointContent = `# Waypoint created by PreCompact hook
id: ${waypointId}
type: pre_compact
phase: ${phase}
work_items_completed: [${workItemsCompleted.join(', ')}]
work_items_pending: [${workItemsPending.join(', ')}]
created_at: "${timestamp}"
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
  timestamp: "${timestamp}"
`;

  fs.writeFileSync(waypointFile, waypointContent);
  return waypointId;
}

/**
 * Main hook execution
 */
async function main() {
  const input = await readStdin();

  try {
    const sessionDir = findActiveSession();

    if (sessionDir) {
      const waypointId = createWaypoint(sessionDir);
      console.error(`[PreCompact] Saved waypoint ${waypointId} to ${sessionDir}`);

      // Output success with system message
      const output = {
        continue: true,
        systemMessage: `cAgents: Workflow state saved (${waypointId}). Context will be compacted.`
      };
      console.log(JSON.stringify(output));
    } else {
      // No active session, nothing to save
      console.log(JSON.stringify({ continue: true }));
    }
  } catch (error) {
    console.error(`[PreCompact] Error: ${error.message}`);
    // Don't block compaction on error
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
