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
const yaml = require('js-yaml');
// GAP-4 fix: import findMostRecentSessionDir from hook-utils.cjs (shared with subagent-stop-tracker.cjs).
// This ensures start and stop events use identical session discovery logic,
// including env-var fast path (Pass 0) and nested org subdir scanning.
const { createHook, findActiveSession, findMostRecentSessionDir, safeRead, ensureDir, withFileLock, AGENT_MEMORY_DIR } = require('./hook-utils.cjs');

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

  // Strategy 4: Use status.yaml phase and known agent names to infer parent role
  // Known enrichment agents are pipeline-level (parent = 'pipeline')
  const ENRICHMENT_AGENTS = ['orchestrator', 'planner', 'decomposer', 'prompt-engineer', 'validator',
    'universal-planner', 'universal-router', 'universal-validator', 'universal-executor', 'universal-self-correct'];
  const agentBaseName = subagentType.replace(/^cagents:/, '');
  if (ENRICHMENT_AGENTS.includes(agentBaseName)) {
    return 'pipeline';
  }

  // Check status.yaml phase/pipeline_state to infer role context
  const statusFile = path.join(sessionDir, 'status.yaml');
  const statusContent = safeRead(statusFile);
  if (statusContent) {
    const phaseMatch = statusContent.match(/(?:phase|pipeline_state):\s*["']?([^"'\n]+)["']?/);
    if (phaseMatch) {
      const phase = phaseMatch[1].trim().toUpperCase();
      // Early pipeline phases: agent is likely an enrichment agent, parent = 'pipeline'
      if (['INIT', 'ORCHESTRATED', 'PLANNED', 'DECOMPOSED', 'PROMPTS_READY'].includes(phase)) {
        return 'pipeline';
      }
      // Execution phases: agent is likely spawned by a controller
      if (['COORDINATED', 'COORDINATING', 'EXECUTING'].includes(phase)) {
        // Try to find the most recent controller from agent_tree
        const treeFile = path.join(sessionDir, 'workflow', 'agent_tree.yaml');
        const treeContent = safeRead(treeFile);
        if (treeContent) {
          // Find the last agent with a controller-like cagents_type
          const controllerMatches = [...treeContent.matchAll(/id:\s*["']?([^"'\n]+)["']?[\s\S]*?cagents_type:\s*["']?cagents:([^"'\n]+)["']?/g)];
          const CONTROLLER_NAMES = ['engineering-manager', 'architect', 'narrative-director', 'story-architect',
            'operations-manager', 'product-owner', 'strategic-planner', 'marketing-strategist', 'campaign-manager',
            'hr-manager', 'talent-acquisition-manager', 'customer-success-manager', 'general-counsel',
            'support-director', 'compliance-officer'];
          for (let i = controllerMatches.length - 1; i >= 0; i--) {
            const matchedName = controllerMatches[i][2].trim();
            if (CONTROLLER_NAMES.includes(matchedName)) {
              return controllerMatches[i][1].trim();
            }
          }
          // No known controller found, but we're in execution phase — use 'controller' as generic parent
          return 'controller';
        }
      }
    }
  }

  // Default: most agents are pipeline agents, 'pipeline' is more accurate than 'root'
  return 'pipeline';
}

createHook('SubagentTracker', async (input) => {
  // SubagentStart provides agent_id and agent_type per Claude Code docs
  // agent_type is the agent name from Claude Code (e.g., "Explore", "Plan",
  // or custom agent names from .claude/agents/ or plugins)
  const subagentType = input.agent_type || 'unknown';
  const agentId = input.agent_id || `agent_${Date.now()}`;
  const now = new Date().toISOString();

  // Filter out test agents (test_* IDs) to prevent polluting real session agent trees
  if (/^test_/.test(agentId)) {
    console.error(`[SubagentTracker] Skipping test agent: ${agentId}`);
    return null;
  }

  // Try to find active session, with fallback to most-recent-modified
  let sessionDir = findActiveSession(input.session_id);
  if (!sessionDir) {
    sessionDir = findMostRecentSessionDir();
    if (sessionDir) {
      console.error(`[SubagentTracker] findActiveSession returned null, using fallback: ${path.basename(sessionDir)}`);
    }
  }

  // Pass 3: Prompt-based session resolution (Fix C from bug report)
  // When Task-spawned subagents carry SESSION_DIR or CAGENTS_SESSION_ID in their prompt,
  // parse that hint to reliably resolve the correct session directory.
  // This handles the case where CAGENTS_ACTIVE_SESSION env var is not inherited by
  // Task-spawned subprocesses (teammates, execution agents, reviewers).
  if (!sessionDir) {
    const promptText = ((input.tool_input || {}).prompt || '');
    const sessionMatch =
      promptText.match(/SESSION[_ ]DIR[:\s]+([^\s\n]+)/i) ||
      promptText.match(/CAGENTS_SESSION_ID[:\s]+([^\s\n]+)/i);
    if (sessionMatch) {
      const hint = sessionMatch[1].replace(/["']/g, '').trim();
      // hint may be a full path (e.g. Agent_Memory/sessions/team_foo_260317_001) or just a name
      const sessionName = path.basename(hint);
      const candidateDir = path.join(AGENT_MEMORY_DIR, 'sessions', sessionName);
      if (fs.existsSync(candidateDir)) {
        sessionDir = candidateDir;
        console.error(`[SubagentTracker] Resolved session from prompt hint: ${sessionName}`);
      } else {
        console.error(`[SubagentTracker] Prompt hint session not found on disk: ${sessionName}`);
      }
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

  // Warn when cagents_type could not be determined from any source
  if (!cagentsType) {
    const fallbackDesc = (input.tool_input || {}).description || input.description || 'none';
    console.error(`[SubagentTracker] WARNING: cagents_type undetermined for agent ${agentId} (fallback description: "${fallbackDesc}"). Spawn this agent with subagent_type: 'cagents:{name}' for full audit trail.`);
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
    const isFreshFile = !existingContent;

    // Parse existing file with js-yaml (REQ-002: YAML-aware dedup and append)
    let parsedObj = { agents: [] };
    if (!isFreshFile) {
      try {
        const parsed = yaml.load(existingContent);
        if (parsed === null || parsed === undefined) {
          // File exists but is empty — treat as fresh
          parsedObj = { agents: [] };
        } else if (typeof parsed !== 'object' || !parsed.agents) {
          console.error(`[SubagentTracker] agent_tree.yaml missing agents: key — skipping append`);
          return -1;
        } else {
          parsedObj = parsed;
        }
      } catch (parseErr) {
        console.error(`[SubagentTracker] Malformed agent_tree.yaml — skipping append: ${parseErr.message}`);
        return -1;
      }
    }

    // Dedup check using parsed object (REQ-002: replace string.includes with parsed lookup)
    if (parsedObj.agents.some(a => a.id === agentId)) {
      console.error(`[SubagentTracker] Skipping duplicate entry for agent ${agentId}`);
      return -1; // sentinel: skip
    }

    // Compute depth from parent's depth using parsed object (root = 0)
    if (parentAgent && parentAgent !== 'root' && parsedObj.agents.length > 0) {
      const parentEntry = parsedObj.agents.find(a => a.id === parentAgent);
      if (parentEntry && typeof parentEntry.depth === 'number') {
        depth = parentEntry.depth + 1;
      } else {
        depth = 1; // Parent exists but no depth field yet (legacy entry), assume depth 1
      }
    }

    // Build new agent entry as a JS object (REQ-002: object-based entry, not YAML string)
    const entry = {
      id: agentId,
      type: subagentType,
      parent: parentAgent,
      depth,
      spawned_at: now,
      stopped_at: null,
      session: path.basename(sessionDir)
    };
    if (cagentsType) {
      entry.cagents_type = cagentsType;
      entry.short_role = shortRole;
    }

    // Push new entry into parsed object and write full file back
    parsedObj.agents.push(entry);

    if (isFreshFile) {
      // Write with header comment for fresh files
      const headerComment = `# Agent Tree - cAgents Audit Trail\n# Session: ${path.basename(sessionDir)}\n# Generated by subagent-tracker.cjs hook\n# NOTE: 'type' reflects Claude Code's agent_type field. For cAgents plugin agents,\n# this may show as 'general-purpose' rather than the cagents:{name} namespace.\n# The 'cagents_type' field below (when present) captures the self-reported agent name.\n# See also: Agent_Memory/_system/logs/agent_spawns.log for the global audit trail.\n\n`;
      fs.writeFileSync(treeFile, headerComment + yaml.dump(parsedObj));
    } else {
      // Write full file back using yaml.dump (drops original header comments, acceptable)
      fs.writeFileSync(treeFile, yaml.dump(parsedObj));
    }

    return parsedObj.agents.length;
  });

  if (total === -1) return null; // dedup: already recorded

  console.error(`[SubagentTracker] Spawned ${subagentType} (id: ${agentId}, session: ${path.basename(sessionDir)})`);

  // Return context injection with agent info (cagents_type is now auto-populated at spawn time via PC-01)
  const roleInfo = cagentsType ? ` (${shortRole})` : '';
  // F-15: Only ask for self-registration when cagents_type was NOT already captured by the hook.
  // When the hook already wrote cagents_type (from subagent_type param or description parsing),
  // asking the agent to self-register causes duplicate cagents_type fields in agent_tree.yaml
  // because the hook writes structured YAML but self-registration appends raw YAML lines.
  const selfRegisterPrompt = cagentsType
    ? '' // Already captured — do NOT ask for self-registration
    : ` IMPORTANT: If you are a cAgents agent (spawned with subagent_type "cagents:{name}"), self-register by appending your cagents agent name to ${treeFile} using this format:\n    cagents_type: "cagents:{your-name}"\n    role_description: "{what you are doing}"\nAppend these two lines after the last spawned_at line for your agent_id "${agentId}". WARNING: First check if your entry already has a cagents_type field — if it does, do NOT add another one.`;
  return {
    hookSpecificOutput: {
      hookEventName: 'SubagentStart',
      additionalContext: `Agent tree: ${total} agents spawned in session ${path.basename(sessionDir)} (latest: ${subagentType}${roleInfo}, id: ${agentId}, depth: ${depth}).${selfRegisterPrompt}`
    }
  };
});
