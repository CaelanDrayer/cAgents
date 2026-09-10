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
const { createHook, findActiveSession, findMostRecentSessionDir, resolveSdkUuidOwner, safeRead, ensureDir, withFileLock, AGENT_MEMORY_DIR, upsertSdkSessionMap, appendSessionEvent } = require('./hook-utils.cjs');

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
      fs.writeFileSync(treeFile, yaml.dump(obj));
      return true;
    });
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
    try { failDir = findActiveSession(payload.session_id) || findMostRecentSessionDir(); }
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
  const agentId = input.agent_id || `agent_${Date.now()}`;
  const now = new Date().toISOString();

  // Filter out test agents (test_* IDs) to prevent polluting real session agent trees
  if (/^test_/.test(agentId)) {
    console.error(`[SubagentTracker] Skipping test agent: ${agentId}`);
    return null;
  }

  // ---- Session resolution: EVIDENCE FIRST, GUESS LAST (ENG-OBS-2, v12.70.0) ----
  //
  // WI-3: track whether the resolution came from a TRUSTWORTHY path. Trustworthy
  // passes may seed the SDK-UUID map; the newest-session GUESS must never seed it
  // (that would reintroduce the OBJ-1 concurrency bug by binding a UUID to a
  // session it does not own).
  //
  // ORDER MATTERS, and it used to be WRONG. The newest-session heuristic ran
  // BEFORE the explicit prompt hint, and it almost always returns *something*
  // (any non-terminal session dir on disk qualifies) — so the hint pass below was
  // effectively DEAD CODE: a guess shadowed the one piece of hard evidence in the
  // payload. Observed consequence in act_subagent-token-budget_260909_001: every
  // SubagentStart record for this session was written into
  // designer_census-postcut_260805_001, a five-week-stale sibling, whose mtime
  // each write then refreshed — so it kept winning the newest-session race. 116
  // agents accumulated in the wrong tree while this session's agent_tree.yaml sat
  // at `agents: []`, which read as "the tracker never wrote" when in truth it
  // wrote constantly, next door.
  //
  // Passes, strongest evidence first:
  //   1. findActiveSession    — SDK-UUID map / env-var      (deterministic)
  //   2. resolveSdkUuidOwner  — pointer OWNERSHIP, terminal-agnostic (deterministic)
  //   3. prompt hint          — explicit SESSION_DIR in the spawn prompt (explicit)
  //   4. newest-session       — LAST-RESORT GUESS, and labelled as one downstream
  let resolutionPass = null;
  let sessionDir = findActiveSession(input.session_id);
  if (sessionDir) resolutionPass = 'map/env';

  // Pass 2: OWNERSHIP. The pointer map records which session a transcript UUID
  // belongs to; `findActiveSession` discards that fact when the target's
  // status.yaml happens to read terminal. For deciding WHERE TO FILE A RECORD,
  // ownership is the right question and liveness is irrelevant — a pessimistic
  // label (`incomplete` on a still-running session) must not divert this
  // session's audit trail into a stranger's directory. See the
  // `resolveSdkUuidOwner` JSDoc for why this is additive rather than a
  // relaxation of the existing liveness gate.
  if (!sessionDir) {
    sessionDir = resolveSdkUuidOwner(input.session_id);
    if (sessionDir) {
      resolutionPass = 'uuid-owner';
      console.error(`[SubagentTracker] resolved via pointer OWNERSHIP (target reads terminal but owns this transcript): ${path.basename(sessionDir)}`);
    }
  }

  // Pass 3: Prompt-based resolution. Task-spawned subagents carry SESSION_DIR or
  // CAGENTS_SESSION_ID in their prompt; that hint is explicit evidence and must
  // outrank the newest-session guess below. (It exists because
  // CAGENTS_ACTIVE_SESSION is not inherited by Task-spawned subprocesses.)
  if (!sessionDir) {
    const promptText = ((input.tool_input || {}).prompt || '');
    const sessionMatch =
      promptText.match(/SESSION[_ ]DIR[:=\s]+([^\s\n]+)/i) ||
      promptText.match(/CAGENTS_SESSION_ID[:=\s]+([^\s\n]+)/i) ||
      promptText.match(/SESSION[:=\s]+([^\s\n]*cagents-memory\/sessions\/[^\s\n]+)/i);
    if (sessionMatch) {
      const hint = sessionMatch[1].replace(/["']/g, '').trim();
      // hint may be a full path (e.g. cagents-memory/sessions/team_foo_260317_001) or just a name
      const sessionName = path.basename(hint);
      const candidateDir = path.join(AGENT_MEMORY_DIR, 'sessions', sessionName);
      if (fs.existsSync(candidateDir)) {
        sessionDir = candidateDir;
        resolutionPass = 'prompt-hint';
        console.error(`[SubagentTracker] Resolved session from prompt hint: ${sessionName}`);
      } else {
        console.error(`[SubagentTracker] Prompt hint session not found on disk: ${sessionName}`);
      }
    }
  }

  // Pass 4: LAST-RESORT GUESS. Kept (removing it would lose tracking for
  // non-cAgents spawns that carry no hint at all) but demoted below every
  // evidence-based pass, and surfaced as a guess in additionalContext so a
  // misattributed tree is visible TO THE MODEL instead of silently authoritative.
  if (!sessionDir) {
    sessionDir = findMostRecentSessionDir();
    if (sessionDir) {
      resolutionPass = 'newest-session-guess';
      console.error(`[SubagentTracker] no deterministic resolution; GUESSING newest session: ${path.basename(sessionDir)} — this record may be filed against the wrong session.`);
    }
  }

  // Only deterministic/explicit passes may seed the UUID map. The guess must not.
  const confidentSeed = resolutionPass !== null && resolutionPass !== 'newest-session-guess';

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
      reason: 'no active session resolved (all 4 resolution passes returned null: map/env, uuid-owner, prompt-hint, newest-session-guess)',
      source: 'subagent-tracker.cjs:no-session'
    });
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
        } else if (typeof parsed !== 'object') {
          // Scalar/array root — not a tree we can extend without destroying it.
          console.error(`[SubagentTracker] agent_tree.yaml root is not a mapping — skipping append`);
          schemaMigrationNote = 'agent_tree.yaml root is not a YAML mapping';
          return -1;
        } else {
          // WI-B6: a tree with no top-level `agents:` key (the `root:`/`children:`
          // init shape) used to bail here and SILENTLY drop every spawn for the
          // rest of the session. Self-heal instead: add the missing `agents:` key,
          // fold any `children:` in, and keep going. Fails OPEN (the spawn IS
          // recorded) and LOUD (stderr + surfaced in additionalContext below).
          schemaMigrationNote = migrateToCanonicalShape(parsed);
          if (schemaMigrationNote) {
            console.error(`[SubagentTracker] agent_tree.yaml was NOT in the canonical \`agents:\` shape — migrated in place (${schemaMigrationNote}). Every reader in verify-completion.cjs scans a top-level \`agents:\` list; the pre-migration shape recorded ZERO spawns and read as "no child agents spawned".`);
          }
          parsedObj = parsed;
        }
      } catch (parseErr) {
        // Leave the malformed file BYTE-INTACT (never clobber another writer's
        // data) but never let the dropped spawn go untraced — WI-B6.
        console.error(`[SubagentTracker] Malformed agent_tree.yaml — skipping append: ${parseErr.message}`);
        schemaMigrationNote = `agent_tree.yaml is malformed YAML (${parseErr.message})`;
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

  if (total === -1) {
    // -1 covers dedup (benign — already recorded) AND the genuine skip paths
    // (non-mapping root, malformed YAML). WI-B6: only a genuine skip earns a
    // failure record; a dedup is not a lost spawn.
    if (schemaMigrationNote) {
      recordSpawnFailure(sessionDir, {
        attempt_id: agentId,
        attempted_type: cagentsType || subagentType,
        status: 'untracked',
        reason: schemaMigrationNote,
        attempted_depth: depth,
        source: 'subagent-tracker.cjs:tree-unusable'
      });
      return {
        hookSpecificOutput: {
          hookEventName: 'SubagentStart',
          additionalContext: `WARNING (cAgents audit trail): this spawn (${subagentType}, id: ${agentId}) could NOT be recorded in workflow/agent_tree.yaml — ${schemaMigrationNote}. Every downstream reader counts spawns from a top-level \`agents:\` list, so this session will under-report delegation until the file is repaired. The attempt IS logged in cagents-memory/_system/logs/agent_spawns.log.`
        }
      };
    }
    return null; // dedup: already recorded
  }

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
  // ENG-OBS-2 (RF-5 doctrine: every degrade is visible TO THE MODEL). When no
  // deterministic pass resolved the session, this record was filed against a
  // GUESS. Say so, rather than presenting a possibly-misattributed tree as fact.
  const guessNotice = resolutionPass === 'newest-session-guess'
    ? ` NOTE: this session was GUESSED (newest non-terminal session on disk) because no SDK-UUID map entry, pointer owner, or SESSION_DIR prompt hint resolved \u2014 the record above may be filed against the WRONG session. Include SESSION_DIR in spawn prompts to make this deterministic.`
    : '';

  const selfRegisterPrompt = cagentsType
    ? '' // Already captured — do NOT ask for self-registration
    : ` IMPORTANT: If you are a cAgents agent (spawned with subagent_type "cagents:{name}"), self-register by appending your cagents agent name to ${treeFile} using this format:\n    cagents_type: "cagents:{your-name}"\n    role_description: "{what you are doing}"\nAppend these two lines after the last spawned_at line for your agent_id "${agentId}". WARNING: First check if your entry already has a cagents_type field — if it does, do NOT add another one.`;
  // WI-B6: a schema repair is reported to the MODEL, not just to stderr. A
  // silently-repaired instrument is still a silent instrument.
  const migrationNotice = schemaMigrationNote
    ? ` NOTE: workflow/agent_tree.yaml was not in the canonical \`agents:\` list shape and was migrated in place (${schemaMigrationNote}). Spawns attempted before the migration were LOST, so this session earlier delegation counts are under-reported.`
    : '';
  return {
    hookSpecificOutput: {
      hookEventName: 'SubagentStart',
      additionalContext: `Agent tree: ${total} agents spawned in session ${path.basename(sessionDir)} (latest: ${subagentType}${roleInfo}, id: ${agentId}, depth: ${depth}).${guessNotice}${migrationNotice}${selfRegisterPrompt}`
    }
  };
});
