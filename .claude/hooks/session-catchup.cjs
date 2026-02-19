#!/usr/bin/env node
/**
 * Session Catchup Hook - Resume incomplete sessions
 * cAgents V9.10 - Refactored
 *
 * Runs on SessionStart to detect and offer resumption of incomplete sessions.
 * Also initializes session state (replaces on-session-start.sh).
 *
 * Input (stdin): JSON with session context
 * Output (stdout): JSON with system message for resumption
 */

const fs = require('fs');
const path = require('path');
const { createHook, AGENT_MEMORY_DIR, SESSION_PREFIXES, extractYamlValue, safeRead, countPattern, ensureDir } = require('./hook-utils.cjs');

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
    if (phase === 'completed' || phase === 'complete' || phase === 'failed' || phase === 'aborted') continue;

    const instructionFile = path.join(sessionDir, 'instruction.yaml');
    let request = 'Unknown request';
    const instContent = safeRead(instructionFile);
    if (instContent) {
      request = extractYamlValue(instContent, 'raw_request') ||
                extractYamlValue(instContent, 'request') ||
                'Unknown request';
    }

    // Get waypoint info
    const waypointsDir = path.join(sessionDir, 'waypoints');
    let latestWaypoint = null;
    if (fs.existsSync(waypointsDir)) {
      const waypoints = fs.readdirSync(waypointsDir).filter(f => f.startsWith('wp-')).sort().reverse();
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
      phase,
      request: request.substring(0, 100) + (request.length > 100 ? '...' : ''),
      waypoint: latestWaypoint,
      progress
    });
  }

  return incomplete;
}

createHook('SessionCatchup', async (input) => {
  const incomplete = findIncompleteSessions();

  const cagentsContext = 'cAgents V9.13 session initialized. Follow the controller-centric delegation pattern. All requests minimum tier 2. Auto-proceed between phases without asking permission.';

  if (incomplete.length === 0) {
    return {
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: cagentsContext
      }
    };
  }

  // Save state for /resume command
  const stateFile = path.join(AGENT_MEMORY_DIR, '_system', 'incomplete_sessions.json');
  ensureDir(path.dirname(stateFile));
  fs.writeFileSync(stateFile, JSON.stringify({
    detected_at: new Date().toISOString(),
    sessions: incomplete
  }, null, 2));

  console.error(`[SessionCatchup] Found ${incomplete.length} incomplete session(s)`);

  let message = '## Incomplete Sessions Detected\n\n';
  message += 'The following sessions were interrupted and can be resumed:\n\n';

  for (const session of incomplete) {
    message += `- **${session.session_id}**\n`;
    message += `  Request: "${session.request}"\n`;
    message += `  Phase: ${session.phase}`;
    if (session.progress.total > 0) {
      message += ` (${session.progress.completed}/${session.progress.total} items)`;
    }
    if (session.waypoint) {
      message += `\n  Last waypoint: ${session.waypoint.id} (${session.waypoint.type})`;
    }
    message += '\n\n';
  }

  message += '### Resume Options\n\n';
  message += '- Use `/run --resume <session_id>` to resume a specific session\n';
  message += '- Continue with a new request to start fresh\n';

  return {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: cagentsContext + '\n\n' + message
    }
  };
});
