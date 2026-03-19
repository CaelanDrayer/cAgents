#!/usr/bin/env node
/**
 * Subagent Tracker Hook - Log subagent spawns and track agent chains
 * cAgents V9.16 - Enhanced agent audit trail
 *
 * Logs subagent spawns to active session's workflow/agent_tree.yaml.
 * Also maintains a global agent audit log for cross-session visibility.
 *
 * Key improvements over V9.10:
 * - Fallback session discovery: scans for most-recently-modified session dir
 *   when findActiveSession() returns null (handles the race where status.yaml
 *   hasn't been written yet by the trigger agent)
 * - Global audit log: writes to Agent_Memory/_system/logs/agent_spawns.log
 *   so agent usage is always auditable even when session lookup fails
 * - Enhanced context injection: returns the cagents: agent namespace in
 *   additionalContext so the model can self-report agent type
 * - SubagentStop tracking: registers stop events when available
 *
 * Input (stdin): JSON with agent_type, agent_id from SubagentStart event
 * Output (stdout): JSON with continue status and agent hierarchy context
 */

const fs = require('fs');
const path = require('path');
const { createHook, findActiveSession, safeRead, ensureDir, withFileLock, AGENT_MEMORY_DIR, SESSION_PREFIXES } = require('./hook-utils.cjs');

/**
 * Find the most recently modified session directory as a fallback
 * when findActiveSession() returns null. This handles the race condition
 * where a session dir exists but status.yaml hasn't been written yet.
 */
function findMostRecentSessionDir() {
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) return null;

  let bestDir = null;
  let bestMtime = 0;
  let entries = [];

  try {
    entries = fs.readdirSync(sessionsDir)
      .filter(d => SESSION_PREFIXES.some(p => d.startsWith(p)));

    for (const entry of entries) {
      const fullPath = path.join(sessionsDir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && stat.mtimeMs > bestMtime) {
          // Skip sessions that are clearly completed/aborted
          const statusFile = path.join(fullPath, 'status.yaml');
          const statusContent = safeRead(statusFile);
          if (statusContent) {
            const phaseMatch = statusContent.match(/(?:phase|pipeline_state):\s*(\S+)/);
            if (phaseMatch) {
              const phase = phaseMatch[1];
              if (phase === 'completed' || phase === 'complete' || phase === 'failed' || phase === 'aborted' || phase === 'COMPLETE' || phase === 'VALIDATED') {
                continue; // Skip finished sessions
              }
            }
          }
          // No status.yaml or non-terminal phase: eligible
          bestMtime = stat.mtimeMs;
          bestDir = fullPath;
        }
      } catch { /* skip unreadable entries */ }
    }
  } catch { /* sessions dir unreadable */ }

  // Also scan org session subdirectories for nested team/domain sessions
  // (e.g., org_xxx/engineering/ when /team runs inside /org)
  const orgDirs = (bestDir ? [] : entries).filter(d => d.startsWith('org_'));
  for (const orgDir of orgDirs) {
    const orgPath = path.join(sessionsDir, orgDir);
    try {
      const subdirs = fs.readdirSync(orgPath).filter(d => {
        try { return fs.statSync(path.join(orgPath, d)).isDirectory(); } catch { return false; }
      });
      for (const subdir of subdirs) {
        const nestedPath = path.join(orgPath, subdir);
        try {
          const stat = fs.statSync(nestedPath);
          if (stat.mtimeMs > bestMtime) {
            const statusContent = safeRead(path.join(nestedPath, 'status.yaml'));
            if (statusContent) {
              const phaseMatch = statusContent.match(/(?:phase|pipeline_state):\s*(\S+)/);
              if (phaseMatch) {
                const phase = phaseMatch[1];
                if (phase === 'completed' || phase === 'complete' || phase === 'failed' || phase === 'aborted' || phase === 'COMPLETE' || phase === 'VALIDATED') continue;
              }
            }
            bestMtime = stat.mtimeMs;
            bestDir = nestedPath;
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  return bestDir;
}

/**
 * Append a line to the global agent spawns audit log.
 * This ensures agent usage is always tracked even when session lookup fails.
 */
function appendToGlobalAuditLog(entry) {
  try {
    const logsDir = ensureDir(path.join(AGENT_MEMORY_DIR, '_system', 'logs'));
    const logFile = path.join(logsDir, 'agent_spawns.log');

    // Rotate if > 1MB
    try {
      const stat = fs.statSync(logFile);
      if (stat.size > 1024 * 1024) {
        const rotated = logFile.replace('.log', `_${new Date().toISOString().slice(0, 10)}.log`);
        fs.renameSync(logFile, rotated);
      }
    } catch { /* file doesn't exist yet, that's fine */ }

    fs.appendFileSync(logFile, entry + '\n');
  } catch (err) {
    console.error(`[SubagentTracker] Failed to write audit log: ${err.message}`);
  }
}

/**
 * Infer parent agent from pending_spawns.yaml or coordination_log.yaml.
 * When a controller spawns an agent via Task tool, the hook can match
 * by checking pending spawns or the most recently active controller.
 */
function inferParentAgent(sessionDir, subagentType, agentId) {
  if (!sessionDir) return 'root';

  // Strategy 1: Check pending_spawns.yaml (written by controllers before spawning)
  const pendingFile = path.join(sessionDir, 'workflow', 'pending_spawns.yaml');
  const pendingContent = safeRead(pendingFile);
  if (pendingContent) {
    // Match by subagent_type or description fragment
    const typePattern = new RegExp(`agent_type:\\s*["']?${subagentType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?`);
    const typeMatch = pendingContent.match(typePattern);
    if (typeMatch) {
      // Extract parent_id from the matching block
      const blockStart = pendingContent.lastIndexOf('- ', typeMatch.index);
      const block = pendingContent.slice(blockStart, typeMatch.index + typeMatch[0].length + 200);
      const parentMatch = block.match(/parent_id:\s*["']?([^"'\n]+)["']?/);
      if (parentMatch) return parentMatch[1].trim();
    }
  }

  // Strategy 2: Check coordination_log.yaml for the most recent controller
  const coordLog = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
  const coordContent = safeRead(coordLog);
  if (coordContent) {
    const controllerMatch = coordContent.match(/controller:\s*["']?cagents:([^"'\n]+)["']?/);
    if (controllerMatch) {
      // Find the controller's agent_id in the tree
      const treeFile = path.join(sessionDir, 'workflow', 'agent_tree.yaml');
      const treeContent = safeRead(treeFile);
      if (treeContent) {
        const controllerName = controllerMatch[1].trim();
        const idMatch = treeContent.match(new RegExp(`cagents_type:\\s*["']?cagents:${controllerName}["']?[\\s\\S]*?(?=\\n  - id:|$)`));
        if (idMatch) {
          // Walk backwards to find the id field
          const blockStart = treeContent.lastIndexOf('  - id:', treeContent.indexOf(idMatch[0]));
          const block = treeContent.slice(blockStart, blockStart + 200);
          const agentIdMatch = block.match(/id:\s*["']([^"']+)["']/);
          if (agentIdMatch) return agentIdMatch[1];
        }
      }
    }
  }

  // Strategy 3: Check child_controllers.yaml for team sessions
  const childControllersFile = path.join(sessionDir, 'workflow', 'child_controllers.yaml');
  const childContent = safeRead(childControllersFile);
  if (childContent) {
    // The most recently added controller is likely the parent
    const allNames = [...childContent.matchAll(/name:\s*["']?([^"'\n]+)["']?/g)];
    if (allNames.length > 0) {
      const lastControllerName = allNames[allNames.length - 1][1].trim();
      const treeFile = path.join(sessionDir, 'workflow', 'agent_tree.yaml');
      const treeContent = safeRead(treeFile);
      if (treeContent) {
        // Search by the controller name pattern in agent entries
        const namePattern = new RegExp(`role_description:.*${lastControllerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
        const nameMatch = treeContent.match(namePattern);
        if (nameMatch) {
          const blockStart = treeContent.lastIndexOf('  - id:', treeContent.indexOf(nameMatch[0]));
          const block = treeContent.slice(blockStart, blockStart + 200);
          const agentIdMatch = block.match(/id:\s*["']([^"']+)["']/);
          if (agentIdMatch) return agentIdMatch[1];
        }
      }
    }
  }

  return 'root';
}

createHook('SubagentTracker', async (input) => {
  // SubagentStart provides agent_id and agent_type per Claude Code docs
  // agent_type is the agent name from Claude Code (e.g., "Explore", "Plan",
  // or custom agent names from .claude/agents/ or plugins)
  const subagentType = input.agent_type || 'unknown';
  const agentId = input.agent_id || `agent_${Date.now()}`;
  const now = new Date().toISOString();

  // Try to find active session, with fallback to most-recent-modified
  let sessionDir = findActiveSession(input.session_id);
  if (!sessionDir) {
    sessionDir = findMostRecentSessionDir();
    if (sessionDir) {
      console.error(`[SubagentTracker] findActiveSession returned null, using fallback: ${path.basename(sessionDir)}`);
    }
  }

  // C-03/C-04: Infer parent from session context instead of relying on input.parent_agent
  // Claude Code does NOT provide parent_agent in SubagentStart events, so we infer it
  const parentAgent = inferParentAgent(sessionDir, subagentType, agentId);

  // Build a global audit log entry regardless of session state
  const auditEntry = `${now} | agent_id=${agentId} | type=${subagentType} | parent=${parentAgent} | session=${input.session_id || 'unknown'}`;
  appendToGlobalAuditLog(auditEntry);

  if (!sessionDir) {
    console.error(`[SubagentTracker] No session found for agent ${agentId} (type: ${subagentType})`);
    // Still return context even without session tracking
    return {
      hookSpecificOutput: {
        hookEventName: 'SubagentStart',
        additionalContext: `Agent spawned: ${subagentType} (id: ${agentId}). No active session found for tracking. IMPORTANT: When you are a cAgents agent spawned via Task tool with subagent_type "cagents:{name}", please write your agent name to the session workflow/agent_tree.yaml if a session path is provided in your prompt.`
      }
    };
  }

  const workflowDir = ensureDir(path.join(sessionDir, 'workflow'));
  const treeFile = path.join(workflowDir, 'agent_tree.yaml');

  // C-04: Extract cagents_type from multiple sources
  // Priority: (1) subagentType if it starts with 'cagents:', (2) input.subagent_type from Task tool,
  // (3) parse the task description/prompt for cagents: prefix
  let cagentsType = '';
  if (subagentType.startsWith('cagents:')) {
    cagentsType = subagentType;
  } else if (input.subagent_type && input.subagent_type.startsWith('cagents:')) {
    cagentsType = input.subagent_type;
  } else {
    // Try to extract from tool_input (Task tool passes subagent_type)
    const toolInput = input.tool_input || {};
    if (toolInput.subagent_type && toolInput.subagent_type.startsWith('cagents:')) {
      cagentsType = toolInput.subagent_type;
    } else {
      // Parse description for cagents: pattern
      const desc = toolInput.description || input.description || '';
      const cagentsMatch = desc.match(/cagents:([a-z][a-z0-9-]*)/);
      if (cagentsMatch) cagentsType = `cagents:${cagentsMatch[1]}`;
    }
  }

  // PC-11: Derive short_role from cagents_type (e.g., "cagents:engineering-manager" -> "Engineering Manager")
  let shortRole = '';
  if (cagentsType) {
    shortRole = cagentsType.replace('cagents:', '')
      .split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // PC-10: Compute depth — hoisted to outer scope so it's accessible in the return
  let depth = 0;

  // Lock the tree file for the entire read-check-write cycle to prevent
  // race conditions when multiple agents spawn concurrently (see PC-01 bug report).
  const total = withFileLock(treeFile, () => {
    const existingContent = safeRead(treeFile);

    // Dedup check: skip if this agent ID is already recorded (SubagentStart can fire multiple times per spawn)
    if (existingContent && existingContent.includes(`id: "${agentId}"`)) {
      console.error(`[SubagentTracker] Skipping duplicate entry for agent ${agentId}`);
      return -1; // sentinel: skip
    }

    // Compute depth from parent's depth in the tree file (root = 0)
    if (parentAgent && parentAgent !== 'root' && existingContent) {
      const parentBlockRegex = new RegExp(`id: "${parentAgent}"[\\s\\S]*?depth:\\s*(\\d+)`);
      const parentMatch = existingContent.match(parentBlockRegex);
      if (parentMatch) {
        depth = parseInt(parentMatch[1], 10) + 1;
      } else {
        depth = 1; // Parent exists but no depth field yet (legacy entry), assume depth 1
      }
    }

    // Build agent tree entry with all fields
    // PC-02: Include stopped_at: null explicitly for active agents
    let newEntry = `  - id: "${agentId}"\n    type: "${subagentType}"\n    parent: "${parentAgent}"\n    depth: ${depth}\n    spawned_at: "${now}"\n    stopped_at: null\n    session: "${path.basename(sessionDir)}"\n`;
    if (cagentsType) {
      newEntry += `    cagents_type: "${cagentsType}"\n`;
      newEntry += `    short_role: "${shortRole}"\n`;
    }

    if (!existingContent) {
      fs.writeFileSync(treeFile, `# Agent Tree - cAgents Audit Trail\n# Session: ${path.basename(sessionDir)}\n# Generated by subagent-tracker.cjs hook\n# NOTE: 'type' reflects Claude Code's agent_type field. For cAgents plugin agents,\n# this may show as 'general-purpose' rather than the cagents:{name} namespace.\n# The 'cagents_type' field below (when present) captures the self-reported agent name.\n# See also: Agent_Memory/_system/logs/agent_spawns.log for the global audit trail.\n\nagents:\n${newEntry}`);
    } else {
      fs.appendFileSync(treeFile, newEntry);
    }

    // Count existing agents
    const typeMatches = (existingContent || '').match(/id: "/g) || [];
    return typeMatches.length + 1;
  });

  if (total === -1) return null; // dedup: already recorded

  console.error(`[SubagentTracker] Spawned ${subagentType} (id: ${agentId}, session: ${path.basename(sessionDir)})`);

  // Return context injection with agent info (cagents_type is now auto-populated at spawn time via PC-01)
  const roleInfo = cagentsType ? ` (${shortRole})` : '';
  return {
    hookSpecificOutput: {
      hookEventName: 'SubagentStart',
      additionalContext: `Agent tree: ${total} agents spawned in session ${path.basename(sessionDir)} (latest: ${subagentType}${roleInfo}, id: ${agentId}, depth: ${depth}). IMPORTANT: If you are a cAgents agent (spawned with subagent_type "cagents:{name}"), self-register by appending your cagents agent name to ${treeFile} using this format:\n    cagents_type: "cagents:{your-name}"\n    role_description: "{what you are doing}"\nAppend these two lines after the last spawned_at line for your agent_id "${agentId}".`
    }
  };
});
