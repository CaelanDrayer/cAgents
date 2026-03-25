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
const { createHook, AGENT_MEMORY_DIR, SESSION_PREFIXES, TERMINAL_STATES, extractYamlValue, safeRead, countPattern, ensureDir, MAX_SESSION_START_CHARS, findActiveSession } = require('./hook-utils.cjs');

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

    // Handle sessions WITHOUT status.yaml: check for instruction.yaml or strategic_brief.yaml
    if (!content) {
      const instructionFile = path.join(sessionDir, 'instruction.yaml');
      const briefFile = path.join(sessionDir, 'strategic_brief.yaml');
      const instContent = safeRead(instructionFile);
      const briefContent = !instContent ? safeRead(briefFile) : null;

      if (instContent) {
        // Orphaned session: has instruction but no status tracking.
        // Validate required instruction.yaml fields before offering resume (REQ-011).
        const sessionIdField = extractYamlValue(instContent, 'session_id');
        const requestField = extractYamlValue(instContent, 'raw_request') || extractYamlValue(instContent, 'request');
        const createdAtField = extractYamlValue(instContent, 'created_at');
        const commandField = extractYamlValue(instContent, 'command');

        const missingFields = [];
        if (!sessionIdField) missingFields.push('session_id');
        if (!requestField) missingFields.push('request');
        if (!createdAtField) missingFields.push('created_at');
        if (!commandField) missingFields.push('command');

        const isCorrupted = missingFields.length > 0;
        incomplete.push({
          session_id: session,
          phase: isCorrupted ? '[CORRUPTED]' : 'orphaned',
          request: isCorrupted
            ? `[CORRUPTED] Missing fields: ${missingFields.join(', ')}`
            : (requestField || 'Unknown request').substring(0, 100) + ((requestField || '').length > 100 ? '...' : ''),
          waypoint: null,
          progress: { completed: 0, total: 0 }
        });
      } else if (briefContent) {
        // Session with strategic_brief.yaml but no instruction.yaml (e.g., /org sessions)
        const mission = extractYamlValue(briefContent, 'mission') || 'Unknown mission';
        incomplete.push({
          session_id: session,
          phase: 'orphaned',
          request: mission.substring(0, 100) + (mission.length > 100 ? '...' : ''),
          waypoint: null,
          progress: { completed: 0, total: 0 }
        });
      }
      continue;
    }

    const phase = extractYamlValue(content, 'phase') || extractYamlValue(content, 'current_phase') || extractYamlValue(content, 'pipeline_state');
    if (TERMINAL_STATES.includes(phase)) continue;

    const instructionFile = path.join(sessionDir, 'instruction.yaml');
    const briefFile = path.join(sessionDir, 'strategic_brief.yaml');
    let request = 'Unknown request';
    const instContent = safeRead(instructionFile);
    if (instContent) {
      // Validate required instruction.yaml fields before offering resume (REQ-011).
      const sessionIdField = extractYamlValue(instContent, 'session_id');
      const requestField = extractYamlValue(instContent, 'raw_request') || extractYamlValue(instContent, 'request');
      const createdAtField = extractYamlValue(instContent, 'created_at');
      const commandField = extractYamlValue(instContent, 'command');

      const missingFields = [];
      if (!sessionIdField) missingFields.push('session_id');
      if (!requestField) missingFields.push('request');
      if (!createdAtField) missingFields.push('created_at');
      if (!commandField) missingFields.push('command');

      request = missingFields.length > 0
        ? `[CORRUPTED] Missing: ${missingFields.join(', ')}`
        : requestField;
    } else {
      // Fallback: extract mission from strategic_brief.yaml (common for /org sessions)
      const briefContent = safeRead(briefFile);
      if (briefContent) {
        request = extractYamlValue(briefContent, 'mission') || 'Unknown request';
      }
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
  // AGENTPATH_ISSUE_ID injection (REQ-030):
  // When AgentPath spawns a session with an associated issue, it sets this env var.
  // If the active session's instruction.yaml exists and lacks issue_id, inject it.
  const agentpathIssueId = process.env.AGENTPATH_ISSUE_ID;
  if (agentpathIssueId) {
    try {
      const activeDir = findActiveSession(input && input.session_id);
      if (activeDir) {
        const instructionFile = path.join(activeDir, 'instruction.yaml');
        const instContent = safeRead(instructionFile);
        if (instContent && !instContent.includes('issue_id:')) {
          fs.writeFileSync(instructionFile, instContent.trimEnd() + `\nissue_id: "${agentpathIssueId}"\n`);
          console.error(`[SessionCatchup] Injected issue_id=${agentpathIssueId} into instruction.yaml`);
        }
      }
    } catch (e) {
      console.error(`[SessionCatchup] issue_id injection error: ${e.message}`);
    }
  }

  const incomplete = findIncompleteSessions();

  let cagentsContext = 'cAgents V10.24.1 session initialized. Minimum Claude Code version: 2.1.69 (required for hook lifecycle events). Follow the controller-centric delegation pattern. All requests minimum tier 2. Auto-proceed between phases without asking permission. Use cagents:{agent-name} namespace for all Task tool subagent_type references. IMPORTANT: When spawned as a cAgents agent, self-register your agent type in workflow/agent_tree.yaml for audit trail (SubagentStart hook injects instructions). IMPORTANT: When invoking any skill (/run, /team, /org, /review, /optimize, /designer, /debug), your FIRST action must be creating the session directory and writing status.yaml. Do NOT explore the codebase, spawn agents, or analyze the request before session init. IMPORTANT: /org, /run, and /team NEVER handle tasks themselves. They ALWAYS delegate to subagents via Task tool. No exceptions, no matter how simple the request.';

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
    const { spawn } = require('child_process');
    const pluginRoot = path.resolve(__dirname, '../..');
    const systemDir = path.join(AGENT_MEMORY_DIR, '_system');
    const tsFile = path.join(systemDir, '.update-check-ts');
    const resultFile = path.join(systemDir, '.update-check-result');

    // Show cached result from previous run
    try {
      if (fs.existsSync(resultFile)) {
        const cached = fs.readFileSync(resultFile, 'utf8').trim();
        if (cached) {
          cagentsContext = cached + '\n' + cagentsContext;
        }
      }
    } catch { /* best effort */ }

    // Spawn at most once per calendar day
    const todayUtc = new Date().toISOString().slice(0, 10);
    let alreadyRanToday = false;
    try {
      if (fs.existsSync(tsFile)) {
        alreadyRanToday = fs.readFileSync(tsFile, 'utf8').trim() === todayUtc;
      }
    } catch { /* best effort */ }

    if (!alreadyRanToday) {
      try {
        ensureDir(systemDir);
        fs.writeFileSync(tsFile, todayUtc);
        const child = spawn('bash', [
          '-c',
          `"${pluginRoot}/scripts/update-check.sh" > "${resultFile}" 2>/dev/null`
        ], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
      } catch { /* best effort */ }
    }
  } catch (e) {
    // Update check is best-effort, never block session start
  }

  // Learning Pattern Loading (V10.23.0): Load top patterns from _knowledge/patterns/
  try {
    const patternsDir = path.join(AGENT_MEMORY_DIR, '_knowledge', 'patterns');
    if (fs.existsSync(patternsDir)) {
      const patternFiles = [
        'success-patterns.yaml',
        'coordination-patterns.yaml',
        'decomposition-patterns.yaml'
      ];
      const topPatterns = [];

      for (const file of patternFiles) {
        try {
          const content = safeRead(path.join(patternsDir, file));
          if (!content) continue;

          // Extract pattern entries using regex (lightweight, no YAML dep required)
          const entries = [];
          const nameRegex = /^\s*-?\s*name:\s*["']?([^"'\n]+)["']?\s*$/gm;
          const scoreRegex = /^\s*impact_score:\s*([\d.]+)\s*$/gm;
          const descRegex = /^\s*description:\s*["']?([^"'\n]+)["']?\s*$/gm;

          let nameMatch, scoreMatch, descMatch;
          const names = [];
          const scores = [];
          const descs = [];
          while ((nameMatch = nameRegex.exec(content)) !== null) names.push(nameMatch[1].trim());
          while ((scoreMatch = scoreRegex.exec(content)) !== null) scores.push(parseFloat(scoreMatch[1]));
          while ((descMatch = descRegex.exec(content)) !== null) descs.push(descMatch[1].trim());

          const count = Math.min(names.length, scores.length);
          for (let i = 0; i < count; i++) {
            entries.push({ name: names[i], score: scores[i], desc: descs[i] || '' });
          }

          // Sort by impact_score descending, take top 3
          entries.sort((a, b) => b.score - a.score);
          topPatterns.push(...entries.slice(0, 3));
        } catch { /* skip individual file errors */ }
      }

      if (topPatterns.length > 0) {
        // Deduplicate by name, re-sort, take top 3 overall
        const seen = new Set();
        const unique = topPatterns.filter(p => {
          if (seen.has(p.name)) return false;
          seen.add(p.name);
          return true;
        });
        unique.sort((a, b) => b.score - a.score);
        const top = unique.slice(0, 3);

        let summary = ' Learning patterns:';
        for (const p of top) {
          const desc = p.desc ? ` (${p.desc.substring(0, 60)})` : '';
          summary += ` ${p.name}${desc};`;
        }
        // Cap at 500 chars
        if (summary.length > 500) summary = summary.substring(0, 497) + '...';
        cagentsContext += summary;
      }
    }
  } catch { /* pattern loading is best-effort, never block session start */ }

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
