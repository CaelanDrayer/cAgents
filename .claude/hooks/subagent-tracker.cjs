#!/usr/bin/env node
/**
 * Subagent Tracker Hook - Log subagent spawns and track agent chains
 * cAgents V9.16 - Enhanced agent audit trail
 *
 * Logs subagent spawns to active session's workflow/agent_tree.yaml.
 * Also maintains a global agent audit log for cross-session visibility.
 *
 * Key improvements over V9.10:
 * - Session discovery: hook-utils resolveSession (HS-1). Owned pointer or
 *   marker, explicit prompt SESSION_DIR, explicit pin / env, else null. There
 *   is no newest-session scan.
 * - agent_tree.yaml is derived from the append-only workflow/events.jsonl and
 *   written only through updateYamlLocked (HS-6). Agents never hand-edit it.
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
// Start and stop trackers share session discovery from hook-utils.cjs.
// Neither guesses the newest session: no owned session means global log only.
const { createHook, claimSession, safeRead, ensureDir, withFileLock, AGENT_MEMORY_DIR, appendSessionEvent, resolveSession, LOCK_SKIPPED, writeFileAtomic, updateYamlLocked, agentTreeHeader, reconcileTreeFromEvents, readSessionEvents, fallbackAgentId } = require('./hook-utils.cjs');

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
 * WI-B6 — CANONICAL agent_tree.yaml SCHEMA (one shape, writer and readers agree).
 *
 *   agents:                      <- MANDATORY top-level key, a LIST
 *     - id: "<agent_id>"         <- entries keyed `- id:`
 *       type: "cagents:planner"
 *       parent: "pipeline"
 *       depth: 1
 *       spawned_at: "<iso>"
 *       stopped_at: null
 *       session: "<session_id>"
 *
 * An optional `root:` metadata block MAY precede the list (every reader in
 * verify-completion.cjs explicitly scopes around `root:`), but `agents:` is
 * MANDATORY. A `root:` + `children:` tree with no `agents:` key used to hit the
 * "missing agents: key" guard below and make this tracker silently drop EVERY
 * spawn for the remaining life of the session, while verify-completion.cjs read
 * the same file as "no child agents spawned". One mismatch, blinding the writer
 * and the readers at once, and fail-SILENT in both directions.
 *
 * migrateToCanonicalShape() repairs that shape IN PLACE instead of bailing: it
 * ADDS the missing `agents:` key (it never rewrites or drops `root:`) and folds
 * any `children:` entries into it. Non-destructive, and the minimum change that
 * makes every existing reader work. Returns a human-readable reason string when
 * it migrated, or null when the object was already canonical.
 */
function migrateToCanonicalShape(parsedObj) {
  if (Array.isArray(parsedObj.agents)) return null;

  const notes = [];
  if (parsedObj.agents !== undefined) {
    // `agents:` present but not a list (e.g. a mapping) — preserve, never discard.
    parsedObj.agents_malformed_original = parsedObj.agents;
    notes.push('non-list `agents:` preserved as `agents_malformed_original`');
  }
  parsedObj.agents = [];

  if (Array.isArray(parsedObj.children)) {
    const kept = parsedObj.children.filter((c) => c && typeof c === 'object');
    for (const child of kept) parsedObj.agents.push(child);
    notes.push(`folded ${kept.length} \`children:\` entr${kept.length === 1 ? 'y' : 'ies'} into \`agents:\``);
    delete parsedObj.children;
  }
  if (parsedObj.root !== undefined) notes.push('`root:` block preserved as-is');
  parsedObj.schema_migrated_by = 'subagent-tracker.cjs (WI-B6 canonical `agents:` shape)';

  return notes.length > 0 ? notes.join('; ') : 'added missing `agents:` key';
}

/**
 * WI-B6 Part 2 — record a spawn that was DENIED, FAILED, or happened but could
 * not be tracked. Before this, ONLY a successful AND successfully-recorded spawn
 * could ever appear in agent_tree.yaml, so a blocked spawn left no trace by
 * construction — the exact symptom under diagnosis was invisible by design.
 *
 * Records land in a `spawn_failures:` list, deliberately NOT in `agents:`, with
 * field names chosen to be INVISIBLE to every existing reader regex in
 * verify-completion.cjs / team-stop.cjs:
 *   - `- attempt_id:`    does not match /^\s*- id:/gm            (child counters)
 *   - `attempted_depth:` does not match /\bdepth:\s*[1-9]\d*\b/  (no word boundary
 *                        between `_` and `d`, so the depth counter cannot see it)
 *   - `attempted_type:`  does not match the anchored
 *                        `^\s*(?:-\s*)?(?:agent_type|cagents_type|type):` probe
 *   - never emits `stopped_at: null`, so hasFreshRunningChild() can never read a
 *     denial as a live child that masks a stall.
 * A denied spawn must never be able to fake delegation, satisfy a pipeline-advance
 * check, or suppress a stall warning. It is EVIDENCE, not credit.
 *
 * Fails OPEN and LOUD at every layer: the global audit log is attempted first and
 * works even with no session and no js-yaml; an unparseable tree is left BYTE-
 * INTACT (never overwritten) and the record degrades to audit-log-only.
 * Returns true when the record reached agent_tree.yaml, false when it degraded.
 */
function recordSpawnFailure(sessionDir, rec) {
  const recordedAt = rec.recorded_at || new Date().toISOString();
  const status = rec.status || 'failed';
  const attemptId = rec.attempt_id || `attempt_${Date.now()}`;
  const attemptedType = rec.attempted_type || 'unknown';
  const reason = rec.reason || 'unspecified';
  const sessionLabel = sessionDir ? path.basename(sessionDir) : (rec.session_label || 'unknown');

  // Layer 1: global audit log — ALWAYS attempted; survives a null session and a
  // missing js-yaml, so a denial is never wholly untraceable.
  appendToGlobalAuditLog(
    `${recordedAt} | SPAWN_${String(status).toUpperCase()} | attempt_id=${attemptId} | ` +
    `type=${attemptedType} | session=${sessionLabel} | reason=${reason}`
  );

  // Layer 2: per-session structured lifecycle event (internally fail-open).
  if (sessionDir) {
    try {
      appendSessionEvent(sessionDir, {
        type: `spawn_${status}`,
        attempt_id: attemptId,
        agent_type: attemptedType,
        reason
      });
    } catch (e) {
      console.error(`[SubagentTracker] spawn-failure session event non-fatal: ${e && e.message}`);
    }
  }

  // Layer 3: agent_tree.yaml `spawn_failures:` — needs a session AND js-yaml.
  if (!sessionDir || !yaml) {
    console.error(`[SubagentTracker] SPAWN ${String(status).toUpperCase()} (audit-log-only, ${sessionDir ? 'js-yaml unavailable' : 'no session'}): ${attemptedType} — ${reason}`);
    return false;
  }

  try {
    const treeFile = path.join(sessionDir, 'workflow', 'agent_tree.yaml');
    const wrote = withFileLock(treeFile, () => {
      let obj = { agents: [] };
      const existing = safeRead(treeFile);
      if (existing) {
        let parsed;
        try {
          parsed = yaml.load(existing);
        } catch (parseErr) {
          // Unparseable tree: leave it BYTE-INTACT rather than clobbering a
          // human's or another writer's data. Degrade to audit-log-only, loudly.
          console.error(`[SubagentTracker] agent_tree.yaml unparseable — spawn_failures record degraded to audit-log-only: ${parseErr.message}`);
          return false;
        }
        if (parsed && typeof parsed === 'object') obj = parsed;
      }
      const migrationNote = migrateToCanonicalShape(obj);
      if (migrationNote) {
        console.error(`[SubagentTracker] agent_tree.yaml migrated to canonical \`agents:\` shape while recording a spawn failure (${migrationNote})`);
      }
      if (!Array.isArray(obj.spawn_failures)) obj.spawn_failures = [];
      const dup = obj.spawn_failures.some((f) => f && f.attempt_id === attemptId && f.reason === reason);
      if (!dup) {
        obj.spawn_failures.push({
          attempt_id: attemptId,
          attempted_type: attemptedType,
          status,
          reason,
          recorded_at: recordedAt,
          attempted_depth: typeof rec.attempted_depth === 'number' ? rec.attempted_depth : null,
          source: rec.source || 'subagent-tracker.cjs'
        });
      }
      writeFileAtomic(treeFile, yaml.dump(obj));
      return true;
    }, { onTimeout: 'skip', maxRetries: 50 });
    if (wrote === LOCK_SKIPPED) {
      console.error(`[SubagentTracker] agent_tree.yaml lock busy — spawn_failures record degraded to audit-log-only: ${attemptedType} — ${reason}`);
      return false;
    }
    if (wrote) {
      console.error(`[SubagentTracker] SPAWN ${String(status).toUpperCase()} recorded in agent_tree.yaml spawn_failures: ${attemptedType} — ${reason}`);
    }
    return !!wrote;
  } catch (e) {
    console.error(`[SubagentTracker] Failed to record spawn failure (audit log still holds it): ${e.message}`);
    return false;
  }
}

/**
 * WI-B6 Part 2 — standalone failure-record CLI.
 *
 * This hook is registered for SubagentStart ONLY, and SubagentStart never fires
 * for a spawn that was DENIED at the PreToolUse|Agent gate. So the denial has to
 * be handed to us. This entry point lets any PreToolUse gate record one in a
 * single line, without importing this module (importing it would execute the
 * hook):
 *
 *   spawnSync('node', [path.join(__dirname, 'subagent-tracker.cjs'),
 *     '--record-failure', JSON.stringify({
 *       attempt_id, attempted_type, status: 'denied', reason, session_dir })],
 *     { timeout: 3000 });
 *
 * Guarded on argv, which never carries this flag under run-hook.cjs's require()
 * path, so normal SubagentStart behavior is byte-for-byte untouched.
 */
const failureFlagIdx = process.argv.indexOf('--record-failure');
if (failureFlagIdx !== -1) {
  let payload = {};
  try {
    payload = JSON.parse(process.argv[failureFlagIdx + 1] || '{}');
  } catch (e) {
    console.error(`[SubagentTracker] --record-failure: malformed JSON payload: ${e.message}`);
    process.exit(2);
  }
  let failDir = payload.session_dir || null;
  if (!failDir) {
    // No newest-session guess. An unresolved failure goes to the global log only.
    try { failDir = resolveSession(payload, { purpose: 'record', claimHint: false }) || null; }
    catch { failDir = null; }
  }
  const recorded = recordSpawnFailure(failDir, payload);
  process.stdout.write(JSON.stringify({ continue: true, recorded }) + '\n');
  process.exit(0);
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
  // HS-6: ONE fallback-id scheme (hook-utils fallbackAgentId: anon_<type>_<ts>_<pid>).
  // The stop hook closes the oldest open anon_<type>_ row when agent_id is absent.
  const agentId = input.agent_id || fallbackAgentId(subagentType);
  const now = new Date().toISOString();

  // Filter out test agents (test_* IDs) to prevent polluting real session agent trees
  if (/^test_/.test(agentId)) {
    console.error(`[SubagentTracker] Skipping test agent: ${agentId}`);
    return null;
  }

  // ---- Session resolution: evidence only (HS-1) ----
  // hook-utils resolveSession, purpose 'record' (terminal-agnostic): owned
  // pointer/marker -> explicit prompt SESSION_DIR -> explicit pin / env -> null.
  // There is no newest-session guess. A spawn with no owned session goes to the
  // global log only. A session owned by another UUID is never returned.
  // SubagentStart carries no prompt; the spawn prompt's SESSION_DIR is claimed
  // earlier, at PreToolUse Agent (session-init-gate claimFromAnyWrite).
  const sessionDir = resolveSession(input, { purpose: 'record' });

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
    // WI-B6: an untrackable spawn used to vanish from the audit trail with only
    // a stderr line. Leave a reasoned trace in the global log instead.
    recordSpawnFailure(null, {
      attempt_id: agentId,
      attempted_type: subagentType,
      status: 'untracked',
      reason: 'no owned session resolved (map/env, uuid-owner and prompt-hint passes returned null or a foreign session)',
      source: 'subagent-tracker.cjs:no-session'
    });
    // Still return context even without session tracking
    return {
      hookSpecificOutput: {
        hookEventName: 'SubagentStart',
        additionalContext: `Agent spawned: ${subagentType} (id: ${agentId}). No owned cAgents session resolved; the spawn is in _system/logs/agent_spawns.log. Do NOT edit workflow/agent_tree.yaml by hand (hooks own it).`
      }
    };
  }

  // WI-3: sessionDir is non-null here, and it came from one of the three
  // deterministic passes with any foreign-owned session already dropped. Seed
  // ownership with claimSession, so later UUID-only hooks resolve via the map.
  // claimSession never overwrites a foreign marker and is a no-op for a
  // non-UUID session_id. The try/catch keeps a write failure from blocking
  // spawn tracking.
  if (sessionDir && input.session_id) {
    try { claimSession(sessionDir, input.session_id); }
    catch (e) { console.error('[SubagentTracker] claim non-fatal: ' + (e && e.message)); }
  }

  // WI-2: graceful degradation when js-yaml is unavailable (plugin install
  // without `npm install`). The spawn is already recorded in the global audit
  // log above; the agent_tree.yaml mutation requires YAML parse/dump, so skip
  // it and emit a plain single {continue: true} JSON instead of crashing.
  if (!yaml) {
    console.error(`[SubagentTracker] js-yaml unavailable — skipping agent_tree.yaml mutation for agent ${agentId} (spawn recorded in global audit log only)`);
    // WI-B6: reasoned trace. recordSpawnFailure early-returns before touching
    // agent_tree.yaml when yaml is null, so the degraded contract pinned by
    // tests/hooks/js-yaml-guarded-require.test.js (stdout exactly {continue:true},
    // no agent_tree.yaml created) is preserved byte-for-byte.
    recordSpawnFailure(sessionDir, {
      attempt_id: agentId,
      attempted_type: subagentType,
      status: 'untracked',
      reason: 'js-yaml unavailable — agent_tree.yaml mutation skipped',
      source: 'subagent-tracker.cjs:no-js-yaml'
    });
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
  // WI-B6: set when the tree was not in the canonical `agents:` shape. Surfaced
  // to the MODEL in additionalContext so a schema problem is never stderr-only.
  let schemaMigrationNote = null;

  // HS-6: events.jsonl is the append-only source of truth; agent_tree.yaml is
  // derived from it through updateYamlLocked (lock that SKIPS on timeout, never
  // an unlocked write; tolerant parse with quarantine + rebuild; tmp+rename).
  // Every locked write reconciles rows a lock-skipped writer left in events.
  const hasSpawnEvent = () => readSessionEvents(sessionDir).some(e => e.type === 'spawn' && e.agent_id === agentId);
  const writeSpawnEvent = () => {
    const row = { id: agentId, type: subagentType, parent: parentAgent, depth, spawned_at: now, stopped_at: null,
      session: path.basename(sessionDir) };
    if (cagentsType) { row.cagents_type = cagentsType; row.short_role = shortRole; }
    appendSessionEvent(sessionDir, { type: 'spawn', agent_id: agentId, agent_type: cagentsType || subagentType,
      parent: parentAgent, depth, row });
  };
  const total = updateYamlLocked(treeFile, yaml, (parsedObj, ctx) => {
    if (ctx.recovered) {
      schemaMigrationNote = `agent_tree.yaml was unparseable and was rebuilt from events.jsonl (bad copy kept as ${ctx.recovered})`;
    } else {
      const note = migrateToCanonicalShape(parsedObj);
      if (note) {
        schemaMigrationNote = note;
        console.error(`[SubagentTracker] agent_tree.yaml was NOT in the canonical \`agents:\` shape — migrated in place (${note}).`);
      }
    }
    if (parsedObj.agents.some(a => a && a.id === agentId) || hasSpawnEvent()) {
      console.error(`[SubagentTracker] Skipping duplicate entry for agent ${agentId}`);
      reconcileTreeFromEvents(parsedObj, sessionDir);
      return -1; // dedup (double registration): already recorded
    }
    // Depth from the parent (root = 0). Sentinel parents map to fixed depths
    // even on an empty tree (WI-3); an unknown real parent falls back to 1.
    if (parentAgent && parentAgent !== 'root') {
      const SENTINEL_DEPTH_MAP = { pipeline: 1, controller: 2 };
      if (SENTINEL_DEPTH_MAP.hasOwnProperty(parentAgent)) depth = SENTINEL_DEPTH_MAP[parentAgent];
      else {
        const parentEntry = parsedObj.agents.find(a => a && a.id === parentAgent);
        depth = (parentEntry && typeof parentEntry.depth === 'number') ? parentEntry.depth + 1 : 1;
      }
    }
    writeSpawnEvent();
    reconcileTreeFromEvents(parsedObj, sessionDir); // adds this row + any row a skipped writer left
    return parsedObj.agents.length;
  }, { header: agentTreeHeader(sessionDir) });

  if (total === LOCK_SKIPPED) {
    // Lock busy past budget: record the spawn in events.jsonl only; the next
    // locked writer reconciles it into agent_tree.yaml.
    if (!hasSpawnEvent()) {
      depth = parentAgent === 'controller' ? 2 : 1;
      writeSpawnEvent();
    }
    console.error(`[SubagentTracker] agent_tree.yaml lock busy; spawn ${agentId} recorded in events.jsonl (reconciled on next write)`);
    return null;
  }
  if (total === -1) return null; // dedup: already recorded
  if (schemaMigrationNote) console.error(`[SubagentTracker] ${schemaMigrationNote}`);

  console.error(`[SubagentTracker] Spawned ${subagentType} (id: ${agentId}, session: ${path.basename(sessionDir)})`);

  // Return context injection with agent info (cagents_type is auto-populated at spawn time via PC-01)
  const roleInfo = cagentsType ? ` (${shortRole})` : '';
  // HS-6: agents never hand-edit agent_tree.yaml (the old F-15 self-register
  // prompt asked them to append raw YAML lines, which broke the tree). The hook
  // owns the file; say so instead.
  const selfRegisterPrompt = ' agent_tree.yaml is hook-owned: do not edit it by hand.';
  // WI-B6: a schema repair is reported to the MODEL, not just to stderr. A
  // silently-repaired instrument is still a silent instrument.
  const migrationNotice = schemaMigrationNote
    ? ` NOTE: workflow/agent_tree.yaml was not in the canonical \`agents:\` list shape and was migrated in place (${schemaMigrationNote}). Spawns attempted before the migration were LOST, so this session earlier delegation counts are under-reported.`
    : '';
  return {
    hookSpecificOutput: {
      hookEventName: 'SubagentStart',
      additionalContext: `Agent tree: ${total} agents spawned in session ${path.basename(sessionDir)} (latest: ${subagentType}${roleInfo}, id: ${agentId}, depth: ${depth}).${migrationNotice}${selfRegisterPrompt}`
    }
  };
});
