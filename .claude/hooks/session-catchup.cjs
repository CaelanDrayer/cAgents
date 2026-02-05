#!/usr/bin/env node
/**
 * Session Catchup Hook - Resume incomplete sessions
 * cAgents V8.0 - Session Recovery System
 *
 * This hook runs on SessionStart to detect and offer resumption
 * of incomplete sessions from previous runs.
 *
 * 100% Self-Contained: Uses only built-in Node.js modules.
 *
 * Input (stdin): JSON with session context
 * Output (stdout): JSON with system message for resumption
 */

// CRITICAL: Wrap everything in try-catch for plugin resilience
// This ensures hooks don't break Claude Code when running as a plugin
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
    AGENT_MEMORY_DIR: path.join(process.cwd(), 'Agent_Memory'),
    SESSION_PREFIXES: ['run_', 'optimize_', 'review_', 'designer_'],
    readStdin: () => Promise.resolve({}),
    extractYamlValue: () => null,
    safeRead: () => null,
    countPattern: () => 0,
    ensureDir: (d) => { try { fs.mkdirSync(d, { recursive: true }); } catch {} return d; }
  };
}

const { readStdin, AGENT_MEMORY_DIR, SESSION_PREFIXES, extractYamlValue, safeRead, countPattern, ensureDir } = utils;

/**
 * Find incomplete sessions
 */
function findIncompleteSessions() {
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) return [];

  const incomplete = [];
  const sessions = fs.readdirSync(sessionsDir)
    .filter(d => SESSION_PREFIXES.some(p => d.startsWith(p)))
    .sort()
    .reverse();

  for (const session of sessions.slice(0, 10)) {
    const sessionDir = path.join(sessionsDir, session);
    const statusFile = path.join(sessionDir, 'status.yaml');

    const content = safeRead(statusFile);
    if (!content) continue;

    const phase = extractYamlValue(content, 'phase') || extractYamlValue(content, 'current_phase');

    // Skip completed or failed sessions
    if (phase === 'completed' || phase === 'failed' || phase === 'aborted') continue;

    // This session is incomplete
    const instructionFile = path.join(sessionDir, 'instruction.yaml');
    let request = 'Unknown request';

    const instContent = safeRead(instructionFile);
    if (instContent) {
      request = extractYamlValue(instContent, 'raw_request') ||
                extractYamlValue(instContent, 'request') ||
                'Unknown request';
    }

    // Get waypoint info if available
    const waypointsDir = path.join(sessionDir, 'waypoints');
    let latestWaypoint = null;

    if (fs.existsSync(waypointsDir)) {
      const waypoints = fs.readdirSync(waypointsDir)
        .filter(f => f.startsWith('wp-'))
        .sort()
        .reverse();

      if (waypoints.length > 0) {
        const wpContent = safeRead(path.join(waypointsDir, waypoints[0]));
        if (wpContent) {
          latestWaypoint = {
            id: extractYamlValue(wpContent, 'id'),
            phase: extractYamlValue(wpContent, 'phase'),
            type: extractYamlValue(wpContent, 'type')
          };
        }
      }
    }

    // Get progress info
    const coordFile = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
    let progress = { completed: 0, total: 0 };

    const coordContent = safeRead(coordFile);
    if (coordContent) {
      progress.completed = countPattern(coordContent, /status:\s*completed/g);
      const pending = countPattern(coordContent, /status:\s*pending/g);
      const inProgress = countPattern(coordContent, /status:\s*in_progress/g);
      progress.total = progress.completed + pending + inProgress;
    }

    incomplete.push({
      session_id: session,
      session_dir: sessionDir,
      phase,
      request: request.substring(0, 100) + (request.length > 100 ? '...' : ''),
      waypoint: latestWaypoint,
      progress
    });
  }

  return incomplete;
}

/**
 * Format session info for display
 */
function formatSessionInfo(session) {
  let info = `- **${session.session_id}**\n`;
  info += `  Request: "${session.request}"\n`;
  info += `  Phase: ${session.phase}`;

  if (session.progress.total > 0) {
    info += ` (${session.progress.completed}/${session.progress.total} items)`;
  }

  if (session.waypoint) {
    info += `\n  Last waypoint: ${session.waypoint.id} (${session.waypoint.type})`;
  }

  return info;
}

/**
 * Create resume instructions
 */
function createResumeInstructions(sessions) {
  if (sessions.length === 0) return null;

  let message = '## Incomplete Sessions Detected\n\n';
  message += 'The following sessions were interrupted and can be resumed:\n\n';

  sessions.forEach((session) => {
    message += formatSessionInfo(session) + '\n\n';
  });

  message += '### Resume Options\n\n';
  message += '- `/resume` - Resume the most recent incomplete session\n';
  message += '- `/resume <session_id>` - Resume a specific session\n';
  message += '- Continue with a new request to start fresh\n';

  return message;
}

/**
 * Main hook execution
 */
async function main() {
  await readStdin();

  try {
    const incomplete = findIncompleteSessions();

    if (incomplete.length > 0) {
      const message = createResumeInstructions(incomplete);

      // Write incomplete sessions to a temp file for /resume command
      const stateFile = path.join(AGENT_MEMORY_DIR, '_system', 'incomplete_sessions.json');
      ensureDir(path.dirname(stateFile));

      fs.writeFileSync(stateFile, JSON.stringify({
        detected_at: new Date().toISOString(),
        sessions: incomplete
      }, null, 2));

      console.error(`[SessionCatchup] Found ${incomplete.length} incomplete session(s)`);

      console.log(JSON.stringify({
        continue: true,
        systemMessage: message
      }));
    } else {
      console.log(JSON.stringify({ continue: true }));
    }

  } catch (error) {
    console.error(`[SessionCatchup] Error: ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
  }
}

main();

} catch (e) {
  // Top-level catch for plugin resilience - always output valid JSON
  console.log(JSON.stringify({ continue: true }));
}
