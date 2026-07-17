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
const { createHook, AGENT_MEMORY_DIR, SESSION_PREFIXES, TERMINAL_STATES, isTerminalState, extractYamlValue, safeRead, countPattern, ensureDir, MAX_SESSION_START_CHARS, findActiveSession } = require('./hook-utils.cjs');

/**
 * Liveness check (WI-4, session run_concurrent-session-hooks_260602_001):
 *
 * A session is considered LIVE (and therefore filtered OUT of the resume
 * offer) when any of:
 *   1. status.yaml mtime is within CAGENTS_SESSION_LIVENESS_MS (default 60s)
 *   2. session.pid file points to a still-running PID (`kill -0`)
 *   3. last_updated_at heartbeat field is within livenessThresholdMs
 *
 * The default threshold is 60s; tests override via CAGENTS_SESSION_LIVENESS_MS.
 */
function getLivenessThresholdMs() {
  const v = parseInt(process.env.CAGENTS_SESSION_LIVENESS_MS || '60000', 10);
  return Number.isFinite(v) && v >= 0 ? v : 60000;
}

function isSessionLive(sessionDir) {
  const threshold = getLivenessThresholdMs();
  const now = Date.now();

  // Check 1: session.pid file → kill -0 liveness.
  try {
    const pidPath = path.join(sessionDir, 'session.pid');
    if (fs.existsSync(pidPath)) {
      const pidContent = fs.readFileSync(pidPath, 'utf8').trim();
      const pid = parseInt(pidContent, 10);
      if (Number.isFinite(pid) && pid > 0) {
        try {
          process.kill(pid, 0); // Signal 0: liveness probe.
          return true;
        } catch (e) {
          if (e.code === 'EPERM') return true; // process exists, foreign owner — treat as live
          // ESRCH → process dead, fall through to other checks
        }
      }
    }
  } catch { /* fall through */ }

  // Check 2: status.yaml mtime within threshold.
  try {
    const statusFile = path.join(sessionDir, 'status.yaml');
    if (fs.existsSync(statusFile)) {
      const stat = fs.statSync(statusFile);
      if (now - stat.mtimeMs < threshold) return true;
    }
  } catch { /* fall through */ }

  // Check 3: last_updated_at heartbeat field within threshold.
  try {
    const statusContent = safeRead(path.join(sessionDir, 'status.yaml'));
    if (statusContent) {
      const heartbeat = extractYamlValue(statusContent, 'last_updated_at');
      if (heartbeat) {
        const parsed = Date.parse(heartbeat);
        if (!isNaN(parsed) && now - parsed < threshold) return true;
      }
    }
  } catch { /* fall through */ }

  return false;
}

// REC-15 (v12.51.0): fixture/test session marker. Matches a `test`/`fixture`
// token delimited by `_`/`-`/start/end (e.g. team_test-stop_260317_999,
// run_test_login, ..._fixture_...) but NOT an incidental substring inside a real
// slug (latest, contest, fastest, greatest). Fixture sessions created by the
// vitest suite linger in the git-ignored cagents-memory/sessions/ and must never
// pollute the resume offer / newest-active resolution (the prompt-router
// consolidation footgun flake).
const FIXTURE_SESSION_RE = /(^|[_-])(test|fixture)s?([_-]|$)/i;

function findIncompleteSessions() {
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) return [];

  const incomplete = [];
  // REC-15 (v12.51.0): sort candidate sessions newest-first by DIRECTORY MTIME
  // (as intended) rather than lexicographically by dir name. The old
  // `.sort().reverse()` sorted the whole name, so the slug dominated the date
  // (team_zzz_260101 outranked run_aaa_260716) and genuinely-newest incomplete
  // sessions fell outside the top-10 slice. Also drop test-fixture sessions so
  // stale vitest fixtures can never appear in the resume offer.
  const sessions = fs.readdirSync(sessionsDir)
    .filter(d => SESSION_PREFIXES.some(p => d.startsWith(p)))
    .filter(d => !FIXTURE_SESSION_RE.test(d))
    .map(d => ({
      d,
      m: (() => { try { return fs.statSync(path.join(sessionsDir, d)).mtimeMs; } catch { return 0; } })()
    }))
    .sort((a, b) => b.m - a.m)
    .map(x => x.d);

  for (const session of sessions.slice(0, 10)) {
    const sessionDir = path.join(sessionsDir, session);

    // WI-4: skip LIVE sessions (belonging to another Claude Code instance).
    if (isSessionLive(sessionDir)) {
      continue;
    }

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
        // Session with strategic_brief.yaml but no instruction.yaml (e.g., /team strategic mode sessions or legacy org_* sessions)
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
    if (isTerminalState(phase)) continue;

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
      // Fallback: extract mission from strategic_brief.yaml (common for /team strategic mode sessions and legacy org_* sessions)
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
  // v12.6.0: external-UI issue-id injection block removed.
  // Sessions are now internal-only; no external visualizer injects issue IDs.

  const incomplete = findIncompleteSessions();

  // v12.1.2: the standalone improve skill was folded into /run via the
  // first-word keyword router (`/run improve|review|optimize X`). The live
  // skill set is /run, /team, /designer, /helper — the guidance below must
  // only ever name those four (WI-5, session run_improve-skills-hooks_260703_001).
  // Earlier history: V11.0 removed /review, /optimize, /context, /debug.
  let cagentsContext = 'cAgents V12.55.0 session initialized. Minimum Claude Code version: 2.1.69 (required for hook lifecycle events). Follow the controller-centric delegation pattern. All requests minimum tier 2. Auto-proceed between phases without asking permission. Use cagents:{agent-name} namespace for all Agent tool subagent_type references. IMPORTANT: When spawned as a cAgents agent, self-register your agent type in workflow/agent_tree.yaml for audit trail (SubagentStart hook injects instructions). IMPORTANT: When invoking any skill (/run, /team, /designer, /helper), your FIRST action must be creating the session directory and writing status.yaml. Do NOT explore the codebase, spawn agents, or analyze the request before session init. IMPORTANT: /run and /team NEVER handle tasks themselves. They ALWAYS delegate to subagents via Agent tool. No exceptions, no matter how simple the request. For review/optimize work, use the /run keyword router: /run review <target>, /run optimize <target>, or /run improve <target> (v12.1.2 — the standalone improve skill was folded into /run). For cross-domain strategic work, use /team strategic mode. Tip: use /helper for skill guidance and command selection.';

  // Context Auto-Check (V10.17.0; path corrected in WI-5, session
  // run_improve-skills-hooks_260703_001): the CANONICAL product-context
  // location is cagents-memory/_projects/{project_hash}/product_context.yaml
  // (see .claude/skills/run/SKILL.md — the orchestrator reads it during INIT
  // enrichment). The pre-v12 .claude/context/product-context.yaml location is
  // checked ONLY as an explicit legacy fallback for existing installs.
  try {
    let contextFile = null;

    // Canonical: cagents-memory/_projects/{project_hash}/product_context.yaml
    try {
      const projectsDir = path.join(AGENT_MEMORY_DIR, '_projects');
      if (fs.existsSync(projectsDir)) {
        for (const entry of fs.readdirSync(projectsDir)) {
          const candidate = path.join(projectsDir, entry, 'product_context.yaml');
          if (fs.existsSync(candidate)) {
            contextFile = candidate;
            break;
          }
        }
      }
    } catch { /* canonical lookup is best-effort */ }

    // LEGACY FALLBACK ONLY: .claude/context/product-context.yaml (pre-v12
    // location). Read-side back-compat for installs that created it before
    // the canonical _projects path existed; never suggested for new files.
    if (!contextFile) {
      const legacyFile = path.join(process.env.CLAUDE_PROJECT_DIR || AGENT_MEMORY_DIR.replace('/cagents-memory', ''), '.claude', 'context', 'product-context.yaml');
      if (fs.existsSync(legacyFile)) contextFile = legacyFile;
    }

    if (contextFile) {
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
      // V11.0: removed `/context` skill suggestion (the skill was removed in
      // V11.0.0 and following the suggestion would fail). The tip points at
      // the canonical _projects path consumed by the orchestrator.
      // Marker writes retained for back-compat (no-op for new sessions).
      const markerFile = path.join(AGENT_MEMORY_DIR, '_system', 'context_suggestion_shown');
      if (!fs.existsSync(markerFile)) {
        cagentsContext += ' Tip: Create cagents-memory/_projects/{project_hash}/product_context.yaml to share product context across sessions (the orchestrator reads it during INIT enrichment).';
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
