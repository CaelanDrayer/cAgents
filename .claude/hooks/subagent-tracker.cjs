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
 * - Global audit log: writes to cagents-memory/_system/logs/agent_spawns.log
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
// WI-2 (run_improve-skills-hooks_260703_001): js-yaml is the sole declared
// external dependency and node_modules is git-ignored — a plugin install
// without `npm install` must not crash this hook at load time (run-hook.cjs's
// require() is unwrapped). Guarded require; graceful degraded path below
// skips the agent_tree.yaml mutation when the module is absent.
let yaml = null;
try { yaml = require('js-yaml'); } catch { yaml = null; }
// GAP-4 fix: import findMostRecentSessionDir from hook-utils.cjs (shared with subagent-stop-tracker.cjs).
// This ensures start and stop events use identical session discovery logic,
// including env-var fast path (Pass 0) and nested org subdir scanning.
const { createHook, findActiveSession, findMostRecentSessionDir, safeRead, ensureDir, withFileLock, AGENT_MEMORY_DIR, upsertSdkSessionMap, appendSessionEvent } = require('./hook-utils.cjs');

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
 * When a controller spawns an agent via Agent tool, the hook can match
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
  // Pre-v12.0.0 decomposer + prompt-crafting agents were absorbed into 'planner'.
  const ENRICHMENT_AGENTS = ['orchestrator', 'planner', 'validator',
    'router', 'execution-monitor', 'self-correct'];
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
      if (['INIT', 'ORCHESTRATED', 'PLANNED'].includes(phase)) {
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
          const CONTROLLER_NAMES = ['tech-lead', 'architect', 'narrative-director', 'story-architect',
            'operations-manager', 'product-owner', 'strategic-planner', 'marketing-strategist',
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

  // Try to find active session, with fallback to most-recent-modified.
  // WI-3: track whether the resolution came from a TRUSTWORTHY path. Pass 1
  // (findActiveSession) resolves via the SDK-UUID map / env-var / promptHint — all
  // trustworthy — so it may seed the map. Pass 2 (findMostRecentSessionDir) is the
  // newest-session heuristic, which can resolve to the WRONG session under two
  // concurrent same-dir sessions; seeding from it would reintroduce the exact
  // OBJ-1 concurrency bug, so it MUST NOT seed the map (confidentSeed stays false).
  let sessionDir = findActiveSession(input.session_id);
  let confidentSeed = !!sessionDir; // Pass 1 = map/env/promptHint → trustworthy
  if (!sessionDir) {
    sessionDir = findMostRecentSessionDir();
    if (sessionDir) {
      // Pass 2 = newest-session heuristic → NOT trustworthy; leave confidentSeed false.
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
      // hint may be a full path (e.g. cagents-memory/sessions/team_foo_260317_001) or just a name
      const sessionName = path.basename(hint);
      const candidateDir = path.join(AGENT_MEMORY_DIR, 'sessions', sessionName);
      if (fs.existsSync(candidateDir)) {
        sessionDir = candidateDir;
        confidentSeed = true; // Pass 3 = explicit prompt hint → trustworthy, may seed the map
        console.error(`[SubagentTracker] Resolved session from prompt hint: ${sessionName}`);
      } else {
        console.error(`[SubagentTracker] Prompt hint session not found on disk: ${sessionName}`);
      }
    }
  }

  // C-03/C-04: Infer parent from session context instead of relying on input.parent_agent
  // Claude Code does NOT provide parent_agent in SubagentStart events, so we infer it
  const parentAgent = inferParentAgent(sessionDir, subagentType, agentId);

  // Build a global audit log entry regardless of session state.
  // REC-10 (v12.51.0): log the RESOLVED session basename (a human-readable
  // act_slug_date, greppable across the audit trail) instead of the raw SDK
  // transcript UUID that arrives as input.session_id. Keep a short UUID tail
  // (last 8 hex) as a correlatable fallback so a `session=unknown` line is still
  // tied back to its transcript. sessionDir is fully resolved (all 3 passes) or
  // null here; when null the label falls back to the full UUID (never the bare
  // literal `unknown` unless the UUID is also absent).
  const sessionLabel = sessionDir ? path.basename(sessionDir) : (input.session_id || 'unknown');
  const sdkTail = input.session_id ? String(input.session_id).slice(-8) : 'unknown';
  const auditEntry = `${now} | agent_id=${agentId} | type=${subagentType} | parent=${parentAgent} | session=${sessionLabel} | sdk_uuid=${sdkTail}`;
  appendToGlobalAuditLog(auditEntry);

  if (!sessionDir) {
    console.error(`[SubagentTracker] No session found for agent ${agentId} (type: ${subagentType})`);
    // Still return context even without session tracking
    return {
      hookSpecificOutput: {
        hookEventName: 'SubagentStart',
        additionalContext: `Agent spawned: ${subagentType} (id: ${agentId}). No active session found for tracking. IMPORTANT: When you are a cAgents agent spawned via Agent tool with subagent_type "cagents:{name}", please write your agent name to the session workflow/agent_tree.yaml if a session path is provided in your prompt.`
      }
    };
  }

  // WI-3: sessionDir is now confirmed non-null (the guard above returned on null).
  // Seed the SDK-UUID → session map ONLY from a trustworthy resolution (Pass 1 =
  // map/env/promptHint, or Pass 3 = explicit prompt hint). NEVER seed when only the
  // newest-session heuristic (Pass 2) resolved — that path can bind a UUID to the
  // WRONG session under concurrent same-dir sessions and would reintroduce the
  // OBJ-1 concurrency bug. This closes the seed loop: the first hook that resolves
  // via env/promptHint/marker seeds the map, and every subsequent UUID-only hook
  // then resolves deterministically via the map (findActiveSession is map-first).
  // The upsert is already internally fail-open; the belt-and-suspenders try/catch
  // guarantees a map-write failure NEVER blocks or alters spawn tracking (AC#4).
  if (confidentSeed && sessionDir && input.session_id) {
    try { upsertSdkSessionMap(input.session_id, sessionDir); }
    catch (e) { console.error('[SubagentTracker] map upsert non-fatal: ' + (e && e.message)); }
  }

  // WI-2: graceful degradation when js-yaml is unavailable (plugin install
  // without `npm install`). The spawn is already recorded in the global audit
  // log above; the agent_tree.yaml mutation requires YAML parse/dump, so skip
  // it and emit a plain single {continue: true} JSON instead of crashing.
  if (!yaml) {
    console.error(`[SubagentTracker] js-yaml unavailable — skipping agent_tree.yaml mutation for agent ${agentId} (spawn recorded in global audit log only)`);
    return { continue: true };
  }

  const workflowDir = ensureDir(path.join(sessionDir, 'workflow'));
  const treeFile = path.join(workflowDir, 'agent_tree.yaml');

  // C-04: Extract cagents_type from multiple sources
  // Priority: (1) subagentType if it starts with 'cagents:', (2) input.subagent_type from Agent tool,
  // (3) parse the task description/prompt for cagents: prefix
  let cagentsType = '';
  if (subagentType.startsWith('cagents:')) {
    cagentsType = subagentType;
  } else if (input.subagent_type && input.subagent_type.startsWith('cagents:')) {
    cagentsType = input.subagent_type;
  } else {
    // Try to extract from tool_input (Agent tool passes subagent_type)
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

  // PC-11: Derive short_role from cagents_type (e.g., "cagents:tech-lead" -> "Engineering Manager")
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

    // Compute depth from parent's depth using parsed object (root = 0).
    // WI-3 (run_improve-skills-hooks_260703_001): this branch was previously
    // gated on the agents list being non-empty, so the FIRST entry appended to
    // a fresh or empty tree always got depth 0 — even for sentinel parents.
    // Downstream, verify-completion.cjs counts depth>=1 entries for the
    // DELEGATION VIOLATION check, so such sessions could be spuriously flagged.
    // Sentinel depths now apply regardless of list emptiness; a real parent ID
    // that isn't found in the tree (including the empty-tree case) falls back
    // to depth 1.
    if (parentAgent && parentAgent !== 'root') {
      // Map known sentinel parent values to fixed depths before tree lookup.
      // inferParentAgent() returns these sentinels when no real agent ID is found:
      //   'pipeline' -> depth 1 (enrichment agents are direct children of the pipeline)
      //   'controller' -> depth 2 (execution agents spawned by a generic controller)
      const SENTINEL_DEPTH_MAP = { pipeline: 1, controller: 2 };
      if (SENTINEL_DEPTH_MAP.hasOwnProperty(parentAgent)) {
        depth = SENTINEL_DEPTH_MAP[parentAgent];
      } else {
        const parentEntry = parsedObj.agents.find(a => a.id === parentAgent);
        if (parentEntry && typeof parentEntry.depth === 'number') {
          depth = parentEntry.depth + 1;
        } else {
          depth = 1; // Parent not in tree (empty tree or legacy entry without depth) — assume depth 1
        }
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
      const headerComment = `# Agent Tree - cAgents Audit Trail\n# Session: ${path.basename(sessionDir)}\n# Generated by subagent-tracker.cjs hook\n# NOTE: 'type' reflects Claude Code's agent_type field. For cAgents plugin agents,\n# this may show as 'general-purpose' rather than the cagents:{name} namespace.\n# The 'cagents_type' field below (when present) captures the self-reported agent name.\n# See also: cagents-memory/_system/logs/agent_spawns.log for the global audit trail.\n\n`;
      fs.writeFileSync(treeFile, headerComment + yaml.dump(parsedObj));
    } else {
      // Write full file back using yaml.dump (drops original header comments, acceptable)
      fs.writeFileSync(treeFile, yaml.dump(parsedObj));
    }

    return parsedObj.agents.length;
  });

  if (total === -1) return null; // dedup: already recorded

  // REC-16 (v12.51.0): structured per-session lifecycle event (fail-open,
  // lock-protected, session-scoped — sessionDir was resolved via the
  // deterministic chain above). One `spawn` line per newly-tracked agent.
  appendSessionEvent(sessionDir, {
    type: 'spawn',
    agent_id: agentId,
    agent_type: cagentsType || subagentType,
    parent: parentAgent,
    depth
  });

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
