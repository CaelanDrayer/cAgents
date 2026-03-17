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
const { createHook, AGENT_MEMORY_DIR, SESSION_PREFIXES, extractYamlValue, safeRead, countPattern, ensureDir, MAX_SESSION_START_CHARS } = require('./hook-utils.cjs');

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

    // Handle sessions WITHOUT status.yaml: check if instruction.yaml exists (orphaned session)
    if (!content) {
      const instructionFile = path.join(sessionDir, 'instruction.yaml');
      const instContent = safeRead(instructionFile);
      if (instContent) {
        // Orphaned session: has instruction but no status tracking
        const request = extractYamlValue(instContent, 'raw_request') ||
                        extractYamlValue(instContent, 'request') ||
                        'Unknown request';
        incomplete.push({
          session_id: session,
          phase: 'orphaned',
          request: request.substring(0, 100) + (request.length > 100 ? '...' : ''),
          waypoint: null,
          progress: { completed: 0, total: 0 }
        });
      }
      continue;
    }

    const phase = extractYamlValue(content, 'phase') || extractYamlValue(content, 'current_phase') || extractYamlValue(content, 'pipeline_state');
    const terminalStates = ['completed', 'complete', 'failed', 'aborted', 'COMPLETE', 'VALIDATED'];
    if (terminalStates.includes(phase)) continue;

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

  let cagentsContext = 'cAgents V10.17.0 session initialized. Minimum Claude Code version: 2.1.69 (required for hook lifecycle events). Follow the controller-centric delegation pattern. All requests minimum tier 2. Auto-proceed between phases without asking permission. Use cagents:{agent-name} namespace for all Task tool subagent_type references. IMPORTANT: When spawned as a cAgents agent, self-register your agent type in workflow/agent_tree.yaml for audit trail (SubagentStart hook injects instructions).';

  // Context Auto-Check (V10.17.0): Check for product-context.yaml
  // Inspired by impeccable's .impeccable.md auto-check pattern
  try {
    const contextFile = path.join(process.env.CLAUDE_PROJECT_DIR || AGENT_MEMORY_DIR.replace('/Agent_Memory', ''), '.claude', 'context', 'product-context.yaml');
    if (fs.existsSync(contextFile)) {
      // Product context exists - load a summary into the session context
      const contextContent = safeRead(contextFile);
      if (contextContent) {
        const productName = extractYamlValue(contextContent, 'product_name') || extractYamlValue(contextContent, 'name') || '';
        const summary = extractYamlValue(contextContent, 'summary') || extractYamlValue(contextContent, 'description') || '';
        if (productName || summary) {
          cagentsContext += ` Product context loaded: ${productName}${summary ? ' - ' + summary.substring(0, 100) : ''}.`;
        }
      }
    } else {
      // Only suggest /context on first session (check for suggestion marker)
      const markerFile = path.join(AGENT_MEMORY_DIR, '_system', 'context_suggestion_shown');
      if (!fs.existsSync(markerFile)) {
        cagentsContext += ' Tip: Run /context to set up shared product context that persists across sessions.';
        try {
          ensureDir(path.join(AGENT_MEMORY_DIR, '_system'));
          fs.writeFileSync(markerFile, new Date().toISOString());
        } catch { /* best effort */ }
      }
    }
  } catch { /* context check is best-effort */ }

  // Update check (non-blocking, best-effort)
  try {
    const { execSync } = require('child_process');
    const pluginRoot = path.resolve(__dirname, '../..');
    const updateMsg = execSync(
      `bash "${pluginRoot}/scripts/update-check.sh" 2>/dev/null`,
      { timeout: 6000, encoding: 'utf8' }
    ).trim();
    if (updateMsg) {
      cagentsContext = updateMsg + '\n' + cagentsContext;
    }
  } catch (e) {
    // Update check is best-effort, never block session start
  }

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

  // Truncate additionalContext to MAX_SESSION_START_CHARS budget (v10.6.0)
  let fullContext = cagentsContext + '\n\n' + message;
  if (fullContext.length > MAX_SESSION_START_CHARS) {
    fullContext = fullContext.slice(0, MAX_SESSION_START_CHARS - 3) + '...';
  }

  return {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: fullContext
    }
  };
});
