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

    setTimeout(() => resolve({}), 1000);
  });
}

/**
 * Simple YAML value extraction
 */
function extractYamlValue(content, key) {
  const regex = new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?`, 'm');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Find incomplete sessions
 */
function findIncompleteSessions() {
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) return [];

  const incomplete = [];
  const sessions = fs.readdirSync(sessionsDir)
    .filter(d => d.startsWith('run_') || d.startsWith('optimize_') || d.startsWith('explore_') || d.startsWith('review_'))
    .sort()
    .reverse();

  for (const session of sessions.slice(0, 10)) { // Check last 10 sessions
    const sessionDir = path.join(sessionsDir, session);
    const statusFile = path.join(sessionDir, 'status.yaml');

    if (!fs.existsSync(statusFile)) continue;

    try {
      const content = fs.readFileSync(statusFile, 'utf8');
      const phase = extractYamlValue(content, 'phase');

      // Skip completed or failed sessions
      if (phase === 'completed' || phase === 'failed' || phase === 'aborted') continue;

      // This session is incomplete
      const instructionFile = path.join(sessionDir, 'instruction.yaml');
      let request = 'Unknown request';

      if (fs.existsSync(instructionFile)) {
        const instContent = fs.readFileSync(instructionFile, 'utf8');
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
          const wpContent = fs.readFileSync(path.join(waypointsDir, waypoints[0]), 'utf8');
          latestWaypoint = {
            id: extractYamlValue(wpContent, 'id'),
            phase: extractYamlValue(wpContent, 'phase'),
            type: extractYamlValue(wpContent, 'type')
          };
        }
      }

      // Get progress info
      const coordFile = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
      let progress = { completed: 0, total: 0 };

      if (fs.existsSync(coordFile)) {
        const coordContent = fs.readFileSync(coordFile, 'utf8');
        const completedMatches = coordContent.match(/status:\s*completed/g);
        const pendingMatches = coordContent.match(/status:\s*pending/g);
        const inProgressMatches = coordContent.match(/status:\s*in_progress/g);

        progress.completed = completedMatches ? completedMatches.length : 0;
        progress.total = progress.completed +
                        (pendingMatches ? pendingMatches.length : 0) +
                        (inProgressMatches ? inProgressMatches.length : 0);
      }

      incomplete.push({
        session_id: session,
        session_dir: sessionDir,
        phase,
        request: request.substring(0, 100) + (request.length > 100 ? '...' : ''),
        waypoint: latestWaypoint,
        progress
      });

    } catch (error) {
      console.error(`[SessionCatchup] Error reading session ${session}: ${error.message}`);
    }
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

  sessions.forEach((session, index) => {
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
  const input = await readStdin();

  try {
    const incomplete = findIncompleteSessions();

    if (incomplete.length > 0) {
      const message = createResumeInstructions(incomplete);

      // Write incomplete sessions to a temp file for /resume command
      const stateFile = path.join(AGENT_MEMORY_DIR, '_system', 'incomplete_sessions.json');
      const stateDir = path.dirname(stateFile);

      if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
      }

      fs.writeFileSync(stateFile, JSON.stringify({
        detected_at: new Date().toISOString(),
        sessions: incomplete
      }, null, 2));

      console.error(`[SessionCatchup] Found ${incomplete.length} incomplete session(s)`);

      const output = {
        continue: true,
        systemMessage: message
      };
      console.log(JSON.stringify(output));
    } else {
      console.log(JSON.stringify({ continue: true }));
    }

  } catch (error) {
    console.error(`[SessionCatchup] Error: ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
