#!/usr/bin/env node
/**
 * Verify Completion Hook - Stop hook verification
 * cAgents V9.10 - Refactored
 *
 * Runs on Stop event to verify workflow completion criteria.
 * Also handles stop-workflow cleanup (replaces stop-workflow.sh).
 *
 * Input (stdin): JSON with session context
 * Output (stdout): JSON with continue/block decision
 */

const fs = require('fs');
const path = require('path');
const { createHook, findActiveSession, findMostRecentSessionDir, TERMINAL_STATES, isTerminalState, normalizeTerminalState, isSuccessTerminalState, sessionGenuinelyValidated, extractYamlValue, safeRead, countPattern, ensureDir, PROJECT_ROOT, AGENT_MEMORY_DIR, withFileLock, appendSessionEvent } = require('./hook-utils.cjs');

// Guarded js-yaml require — used ONLY by the advisory self-validation recheck (C1).
// Mirrors the team-stop.cjs pattern: a missing js-yaml degrades the recheck to a
// no-op rather than crashing the Stop hook (the recheck is purely advisory).
let _svYaml = null;
try { _svYaml = require('js-yaml'); } catch { _svYaml = null; }

/**
 * Claude Code SDK transcript UUID shape (8-4-4-4-12 lowercase hex). Hook payloads
 * carry these in input.session_id; they are NOT cAgents session directory names.
 * Mirrors SDK_UUID_RE in hook-utils.cjs (not exported there). Used to gate the
 * explicit-hint, terminal-inclusive session resolution so a UUID payload never
 * gets treated as a directory name. Per H1 (run_sessions-hung-single-dir_260602_001).
 */
const SDK_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function isSdkUuidShape(s) {
  return typeof s === 'string' && SDK_UUID_RE.test(s);
}

/**
 * Extract the most recent entered_at timestamp from state_history in status.yaml.
 * Returns age in milliseconds, or null if not determinable.
 */
function getLastTransitionAgeMs(statusContent) {
  // Find all entered_at values and use the last one
  const matches = statusContent.match(/entered_at:\s*"([^"]+)"/g);
  if (!matches || matches.length === 0) return null;
  const lastMatch = matches[matches.length - 1];
  const tsMatch = lastMatch.match(/entered_at:\s*"([^"]+)"/);
  if (!tsMatch) return null;
  try {
    return Date.now() - new Date(tsMatch[1]).getTime();
  } catch { return null; }
}

/**
 * REC-11 (P-5): revision-cycle cap.
 *
 * `revision_cycles` was re-added to status.yaml in REC-11 (it was removed in
 * v12.6.0). The /run state machine increments it each time it routes back to
 * PLANNED on a validator FAIL/REVISE verdict. Read the persisted counter here
 * so the Stop hook can FINALIZE (rather than block into yet another re-plan
 * cycle) once the pipeline has exhausted its revision budget.
 *
 * Returns 0 for an absent/unparseable counter (a session that never revised).
 */
function getRevisionCycles(statusContent) {
  if (!statusContent) return 0;
  const m = statusContent.match(/^\s*revision_cycles:\s*(\d+)\b/m);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * REC-11: the pipeline revision cap from pipeline_config.yaml `revision.max_cycles`
 * (default 3). This is the SAME knob the /run loop and the /goal auto-anchor
 * reconcile to — there is exactly one revision cap, not two. Falls back to 3 if
 * the config is unreadable so the cap is always enforced.
 */
function getMaxRevisionCycles() {
  const DEFAULT = 3;
  try {
    const cfgPath = path.join(AGENT_MEMORY_DIR, '_system', 'config', 'pipeline_config.yaml');
    const raw = safeRead(cfgPath);
    if (raw) {
      const m = raw.match(/^\s*max_cycles:\s*(\d+)\b/m);
      if (m) {
        const v = parseInt(m[1], 10);
        if (Number.isFinite(v) && v > 0) return v;
      }
    }
  } catch { /* fall through to default */ }
  return DEFAULT;
}

/**
 * Check if the expected next-stage agent was spawned for a given pipeline state.
 * Maps pipeline states to expected next-stage agent types and checks agent_tree.yaml.
 *
 * Returns true if:
 *   - The expected next agent is found in agent_tree.yaml (spawned or running), OR
 *   - The pipeline state has no defined next agent (unknown state), OR
 *   - agent_tree.yaml cannot be read (fail-open to avoid false blocks)
 *
 * Returns false if:
 *   - The expected next agent is NOT found in agent_tree.yaml (pipeline stopped mid-execution)
 */
function checkNextStageAgentSpawned(sessionDir, pipelineState) {
  // Map pipeline states to their expected next-stage agent types.
  // v12.6.0: state machine is INIT → ORCHESTRATED → PLANNED → COORDINATED → VALIDATED.
  // PLANNED uses a dynamic controller resolved from plan.yaml (no fixed next agent).
  const nextStageMap = {
    'INIT': 'orchestrator',
    'ORCHESTRATED': 'planner',
    'PLANNED': null, // controller is dynamic — resolved from plan.yaml
    'COORDINATED': 'validator',
  };

  const normalised = pipelineState.toUpperCase();
  if (!(normalised in nextStageMap)) return true; // Unknown state — fail-open

  const expectedAgent = nextStageMap[normalised];

  try {
    const agentTreeFile = path.join(sessionDir, 'workflow', 'agent_tree.yaml');
    const agentTreeContent = safeRead(agentTreeFile);
    if (!agentTreeContent) return true; // No agent_tree.yaml — fail-open

    if (expectedAgent === null) {
      // PLANNED: controller is dynamic. Check if ANY agent was spawned
      // after the state that has no stopped_at yet (i.e., still running).
      // Any running agent suggests the controller is active.
      const hasRunningAgent = /stopped_at:\s*null/.test(agentTreeContent);
      return hasRunningAgent;
    }

    // Check if the expected agent type appears in agent_tree.yaml.
    // Real schema (written by subagent-tracker.cjs via yaml.dump): entries use
    // `type:` and `cagents_type:` keys — NOT `agent_type:` (M-24 bug class;
    // same fix as team-stop.cjs:232-251, v12.12.2). The alternation also
    // tolerates legacy `agent_type:` trees. Values are "cagents:{name}".
    const agentPattern = new RegExp(`^\\s*(?:-\\s*)?(?:agent_type|cagents_type|type):\\s*["']?cagents:${expectedAgent}["']?`, 'im');
    const descriptionPattern = new RegExp(`description:\\s*.*${expectedAgent}`, 'i');
    return agentPattern.test(agentTreeContent) || descriptionPattern.test(agentTreeContent);
  } catch (e) {
    console.error(`[VerifyCompletion] Error checking agent_tree.yaml: ${e.message}`);
    return true; // Fail-open on error
  }
}

/**
 * FIX 2 (OBJ-2, WI-6): shared "actively-working vs abandoned" discriminator.
 *
 * Claude Code fires Stop events between response turns while a synchronous pipeline
 * yields for a background wait. Blocking such a mid-flight session deadlocks it
 * (block -> respond -> block). This helper lets the three block paths (A/B/C) AGREE:
 * a mid-flight incompletion that would push an ISSUE is downgraded to a WARNING when
 * this returns true, and only a genuinely-abandoned session (NOT actively working)
 * still blocks.
 *
 * Returns true when EITHER:
 *   (i)  a still-running spawned CHILD agent exists — an `agents:`-list entry in
 *        workflow/agent_tree.yaml with `stopped_at: null`. This GENERALIZES the
 *        PLANNED-branch running-agent signal in checkNextStageAgentSpawned (:82) but
 *        SCOPES it to the child-agent list region, EXCLUDING the top-level `root:`
 *        block. `root:`'s stopped_at is always null while the session is open, so
 *        matching it would make every abandoned session look active forever and could
 *        NEVER block — which would break the abandoned-still-blocks acceptance
 *        criterion. If agent_tree.yaml is unreadable, running-child is treated as
 *        false (fall through to the heartbeat signal).
 *   (ii) a fresh status heartbeat — now - Date.parse(last_updated_at) < livenessMs,
 *        where livenessMs = CAGENTS_SESSION_LIVENESS_MS (default 60000; mirrors
 *        session-catchup.cjs).
 *
 * On any error the helper returns false ("not actively working" = allow the block).
 * That is the SAFE direction: a broken discriminator never suppresses a genuine
 * abandoned block, it only fails toward blocking.
 */
/**
 * REC-05 stale-child freshness threshold (ms). A `stopped_at: null` child only
 * counts as an actively-working signal when its `spawned_at` is within this
 * window. A controller that backgrounds a child and yields leaves a
 * `stopped_at: null` child that would otherwise mask the stall indefinitely (the
 * controller-background-yield stall + H-9's leaked-null hole). Default 30 min;
 * override with CAGENTS_STALE_CHILD_MS. Deliberately DISTINCT from
 * CAGENTS_SESSION_LIVENESS_MS (the 60s heartbeat window): a spawned child
 * legitimately runs far longer than a status-heartbeat refresh interval, so the
 * two windows are tuned separately.
 */
function staleChildThresholdMs() {
  const v = parseInt(process.env.CAGENTS_STALE_CHILD_MS || '1800000', 10);
  return Number.isNaN(v) ? 1800000 : v; // 30 min default
}

/**
 * REC-04: count spawned child agents in an agent_tree.yaml. Mirrors the
 * delegation-violation counter (§3): depth>=1 entries first, `- id:` list
 * entries as the real-schema fallback. The top-level `root:` block is depth 0 /
 * a `root:` key (not a `- id:` list entry), so it is excluded either way.
 * Returns 0 for an absent/empty tree (`agents: []`).
 */
function countChildAgents(agentTreeContent) {
  if (!agentTreeContent) return 0;
  const depthMatches = agentTreeContent.match(/\bdepth:\s*([1-9]\d*)\b/g);
  let count = depthMatches ? depthMatches.length : 0;
  if (count === 0) {
    const idMatches = agentTreeContent.match(/^\s*- id:/gm);
    count = idMatches ? idMatches.length : 0;
  }
  return count;
}

/**
 * REC-05: does the agent_tree's `agents:` child region contain a FRESH running
 * child? A `stopped_at: null` child counts only when its `spawned_at` is within
 * staleChildThresholdMs(). A child with NO / unparseable `spawned_at` is treated
 * as fresh (fail-toward-working — preserves the pre-REC-05 behavior for trees
 * that omit spawned_at, e.g. a legitimately mid-flight wave teammate). A
 * `stopped_at: null` child whose `spawned_at` is definitively old no longer
 * counts — closing the leaked-null hole that let a backgrounded-and-yielded
 * child mask a stall for hours.
 */
function hasFreshRunningChild(childRegion) {
  if (!childRegion) return false;
  const staleMs = staleChildThresholdMs();
  // Split the child region into per-entry blocks on YAML list-item markers
  // (`  - id:` / `  - agent_id:` …). slice(1) drops the pre-first-marker text.
  const blocks = childRegion.split(/^\s*-\s+/m).slice(1);
  for (const block of blocks) {
    if (!/stopped_at:\s*null/.test(block)) continue; // already stopped — not running
    const spawnMatch = block.match(/spawned_at:\s*"?([^"\n]+?)"?\s*$/m);
    if (!spawnMatch) return true; // no parseable spawn time — preserve old behavior
    const spawnMs = Date.parse(spawnMatch[1]);
    if (Number.isNaN(spawnMs)) return true; // unparseable — preserve old behavior
    if ((Date.now() - spawnMs) < staleMs) return true; // fresh running child
    // else: stale null-stop child — ignore, keep scanning for a fresher one
  }
  return false;
}

function sessionActivelyWorking(sessionDir, statusContent) {
  try {
    // (i) Running child agent — FRESHNESS-GATED (REC-05). Scope to the child
    //     `agents:` region ONLY, excluding the top-level `root:` block (its
    //     stopped_at is null for the whole open session). A `stopped_at: null`
    //     child counts as "working" only if its spawned_at is within
    //     staleChildThresholdMs(); a hours-old backgrounded-and-yielded child no
    //     longer masks the stall.
    // (REC-04) Also count spawned children so a fresh heartbeat cannot rescue a
    //     0-child session (its own init write IS the heartbeat).
    let runningChild = false;
    let childCount = 0;
    try {
      const agentTreeContent = safeRead(path.join(sessionDir, 'workflow', 'agent_tree.yaml'));
      if (agentTreeContent) {
        const parts = agentTreeContent.split(/^agents:/m);
        const childRegion = parts.length > 1 ? parts[1] : '';
        runningChild = hasFreshRunningChild(childRegion);
        childCount = countChildAgents(agentTreeContent);
      }
    } catch {
      runningChild = false; // unreadable tree -> fall to the heartbeat signal
      childCount = 0;
    }

    // (ii) Fresh heartbeat: last_updated_at within the liveness window.
    let freshHeartbeat = false;
    if (statusContent) {
      const hbMatch = statusContent.match(/last_updated_at:\s*"?([^"\n]+)"?/);
      if (hbMatch) {
        const livenessMs = parseInt(process.env.CAGENTS_SESSION_LIVENESS_MS || '60000', 10);
        const hbMs = Date.parse(hbMatch[1]);
        if (!isNaN(hbMs)) {
          freshHeartbeat = (Date.now() - hbMs) < livenessMs;
        }
      }
    }

    // REC-04 0-child gate: a session with NO spawned children and no (fresh)
    // running child has done no work — its fresh heartbeat is just its own INIT
    // write and MUST NOT rescue it. Return false so the INIT-stall block fires
    // and the session is labeled `incomplete`, not `complete`. When a running
    // child exists, childCount is necessarily >= 1, so this gate never fires for
    // an actively-spawning session.
    if (!runningChild && childCount === 0) {
      return false;
    }

    return runningChild || freshHeartbeat;
  } catch (e) {
    console.error(`[VerifyCompletion] sessionActivelyWorking error (treating as not-working): ${e.message}`);
    return false;
  }
}

/**
 * Finalize agent lifecycle data for terminal sessions.
 * Sets stopped_at on the lead agent in agent_tree.yaml and computes
 * the final duration_ms in the last state_history entry of status.yaml.
 */
function finalizeSessionLifecycle(sessionDir) {
  const statusFile = path.join(sessionDir, 'status.yaml');
  const statusContent = safeRead(statusFile);
  if (!statusContent) return;

  // Only finalize for terminal sessions
  const pipelineState = extractYamlValue(statusContent, 'pipeline_state');
  const phase = extractYamlValue(statusContent, 'phase') || extractYamlValue(statusContent, 'current_phase');
  const currentState = pipelineState || phase;
  if (!currentState || !isTerminalState(currentState)) return;

  const now = new Date().toISOString();

  // (a) Set stopped_at for lead agent in agent_tree.yaml
  try {
    const agentTreeFile = path.join(sessionDir, 'workflow', 'agent_tree.yaml');
    const agentTreeContent = safeRead(agentTreeFile);
    if (agentTreeContent) {
      // Find the first agent list entry (`- id:` — the real schema written by
      // subagent-tracker.cjs; the previous `- agent_id:` key never matched,
      // M-24 bug class) and finalize the first null stopped_at at-or-after it.
      // The `root:` block precedes the agents list, so its stopped_at is
      // deliberately untouched (root lifecycle belongs to team-stop.cjs Phase 1).
      const firstAgentMatch = agentTreeContent.match(/(- id:\s*[^\n]+[\s\S]*?stopped_at:\s*)null/);
      if (firstAgentMatch) {
        const updated = agentTreeContent.replace(
          firstAgentMatch[0],
          firstAgentMatch[1] + '"' + now + '"'
        );
        fs.writeFileSync(agentTreeFile, updated);
        console.error(`[VerifyCompletion] Set lead agent stopped_at: ${now}`);
      }
    }
  } catch (e) {
    console.error(`[VerifyCompletion] Error setting stopped_at: ${e.message}`);
  }

  // (b) Compute final duration_ms in last state_history entry
  // Fallback: use Date.now() as stopped_at when absent; started_at = entered_at.
  // Never produce NaN or negative values.
  try {
    // Find the last state_history entry with duration_ms: null
    const lastNullDuration = statusContent.match(/[\s\S]*(entered_at:\s*"([^"]+)"[\s\S]*?duration_ms:\s*)null/);
    if (lastNullDuration) {
      const enteredAt = lastNullDuration[2];
      const startMs = new Date(enteredAt).getTime();
      // Fallback: if started_at (entered_at) is valid, use Date.now() as stopped_at
      const stoppedMs = Date.now();
      const durationMs = !isNaN(startMs) && startMs > 0
        ? Math.max(0, stoppedMs - startMs)
        : 0; // Cannot compute duration without valid start time — default to 0
      if (durationMs < 24 * 60 * 60 * 1000) { // sanity: < 24h
        const updated = statusContent.replace(
          lastNullDuration[0],
          lastNullDuration[0].replace(
            lastNullDuration[1] + 'null',
            lastNullDuration[1] + String(durationMs)
          )
        );
        fs.writeFileSync(statusFile, updated);
        console.error(`[VerifyCompletion] Set final duration_ms: ${durationMs}`);
      }
    }
  } catch (e) {
    console.error(`[VerifyCompletion] Error computing duration_ms: ${e.message}`);
  }
}

/**
 * VALIDATED→complete safety net.
 *
 * When a session's pipeline_state or phase is 'validated' or 'VALIDATED',
 * the pipeline has passed validation but the agent stopped before writing the
 * final 'complete' transition.  This function patches status.yaml to:
 *   1. Compute duration_ms for the current (VALIDATED) state_history entry.
 *   2. Append a new state_history entry for 'complete'.
 *   3. Update pipeline_state / phase to 'complete'.
 *
 * For non-terminal mid-execution states (prompts_ready, coordinated) the
 * function only logs a note — those indicate the pipeline genuinely stopped
 * mid-execution and should NOT be auto-completed.
 *
 * Must run BEFORE verifyCompletion() so the session is in a terminal state
 * when the completion checks execute.
 */
function applyValidatedToCompleteTransition(sessionDir) {
  const statusFile = path.join(sessionDir, 'status.yaml');
  const raw = safeRead(statusFile);
  if (!raw) return;

  const pipelineState = extractYamlValue(raw, 'pipeline_state');
  const phase = extractYamlValue(raw, 'phase') || extractYamlValue(raw, 'current_phase');
  const currentState = pipelineState || phase;
  if (!currentState) return;

  const normalised = currentState.toLowerCase();

  // Note non-terminal mid-execution states (but do NOT auto-complete them)
  const midExecutionStates = ['prompts_ready', 'coordinated'];
  if (midExecutionStates.includes(normalised)) {
    console.error(
      `[VerifyCompletion] Session stopped in mid-execution state '${currentState}' — ` +
      `this indicates the pipeline genuinely stopped before completion. Not auto-completing.`
    );
    return;
  }

  // Only auto-complete VALIDATED sessions
  if (normalised !== 'validated') return;

  const now = new Date();
  const nowISO = now.toISOString();
  const sessionName = path.basename(sessionDir);

  console.error(`[VerifyCompletion] VALIDATED→complete safety net triggered for ${sessionName}`);

  // Use file lock to prevent concurrent hooks from double-patching
  const lockPath = statusFile + '-validated-transition';
  withFileLock(lockPath, () => {
    // Re-read inside lock (another process may have already patched)
    let content = safeRead(statusFile);
    if (!content) return;

    const reCheckState = extractYamlValue(content, 'pipeline_state') || extractYamlValue(content, 'phase') || extractYamlValue(content, 'current_phase');
    if (!reCheckState || reCheckState.toLowerCase() !== 'validated') {
      console.error(`[VerifyCompletion] State already changed to '${reCheckState}' by another process, skipping`);
      return;
    }

    // (a) Compute duration_ms for the last state_history entry (the VALIDATED entry).
    //     Find the last entered_at with duration_ms: null.
    const lastNullDuration = content.match(
      /[\s\S]*(entered_at:\s*"([^"]+)"[\s\S]*?duration_ms:\s*)null/
    );
    if (lastNullDuration) {
      const enteredAt = lastNullDuration[2];
      const startMs = new Date(enteredAt).getTime();
      if (!isNaN(startMs) && startMs > 0) {
        const durationMs = Math.max(0, now.getTime() - startMs);
        if (durationMs < 24 * 60 * 60 * 1000) { // sanity: < 24h
          content = content.replace(
            lastNullDuration[0],
            lastNullDuration[0].replace(
              lastNullDuration[1] + 'null',
              lastNullDuration[1] + String(durationMs)
            )
          );
          console.error(`[VerifyCompletion] Set VALIDATED duration_ms: ${durationMs}`);
        }
      }
    }

    // (b) Append a new state_history entry for 'complete'.
    //     Insert before the end of the state_history block (before the next top-level key or EOF).
    //     Compute duration_ms from the previous state's entered_at to avoid leaving null.
    let completeDurationMs = 0;
    const allEnteredAts = content.match(/entered_at:\s*"([^"]+)"/g);
    if (allEnteredAts && allEnteredAts.length > 0) {
      const lastEnteredAtMatch = allEnteredAts[allEnteredAts.length - 1].match(/entered_at:\s*"([^"]+)"/);
      if (lastEnteredAtMatch) {
        const prevMs = new Date(lastEnteredAtMatch[1]).getTime();
        if (!isNaN(prevMs) && prevMs > 0) {
          completeDurationMs = Math.max(0, now.getTime() - prevMs);
        }
      }
    }
    const completeEntry =
      `  - state: complete\n` +
      `    entered_at: "${nowISO}"\n` +
      `    duration_ms: ${completeDurationMs}`;

    // Strategy: find the last state_history entry's duration_ms line and append after it.
    // The last duration_ms line in state_history is the one we just patched (or the last one).
    const durationLines = [...content.matchAll(/^(\s+duration_ms:\s*\S+)$/gm)];
    if (durationLines.length > 0) {
      const lastDurationMatch = durationLines[durationLines.length - 1];
      const insertPos = lastDurationMatch.index + lastDurationMatch[0].length;
      content = content.slice(0, insertPos) + '\n' + completeEntry + content.slice(insertPos);
    } else {
      // Fallback: append at the end of state_history by finding it
      const shIndex = content.indexOf('state_history:');
      if (shIndex !== -1) {
        // Append at end of file (state_history is typically the last block)
        content = content.trimEnd() + '\n' + completeEntry + '\n';
      }
    }

    // (c) Update pipeline_state or phase to 'complete'.
    const stateField = pipelineState ? 'pipeline_state' : 'phase';
    content = content.replace(
      new RegExp(`(${stateField}:\\s*)\\S+`),
      `$1complete`
    );

    // (d) Update updated_at timestamp if present
    if (content.includes('updated_at:')) {
      content = content.replace(
        /(updated_at:\s*)"[^"]*"/,
        `$1"${nowISO}"`
      );
    }

    fs.writeFileSync(statusFile, content);
    console.error(`[VerifyCompletion] Successfully transitioned ${sessionName} from VALIDATED to complete`);
  });
}

/**
 * Auto-resolve fixable warnings before verifyCompletion() scores them.
 *
 * Runs AFTER applyValidatedToCompleteTransition but BEFORE verifyCompletion.
 * Creates stub files for missing artifacts that would otherwise produce
 * warnings, but ONLY when the session is in a terminal state. This is a
 * safety net — the primary mechanism should be the pipeline writing these
 * files itself (see /run SKILL.md Step 4).
 *
 * NEVER auto-resolves:
 *   - Pending/in_progress work items (blocking issues)
 *   - Non-terminal pipeline state (blocking issues)
 *   - Delegation violations (protocol violation warnings)
 *   - Missing coordination_log.yaml (blocking when plan exists)
 *   - Sentinel gate fact-check failures (deliverable verification)
 */
function autoResolveWarnings(sessionDir) {
  const resolved = [];

  const statusFile = path.join(sessionDir, 'status.yaml');
  const statusContent = safeRead(statusFile);
  if (!statusContent) return resolved;

  const pipelineState = extractYamlValue(statusContent, 'pipeline_state');
  const phase = extractYamlValue(statusContent, 'phase') || extractYamlValue(statusContent, 'current_phase');
  const currentState = pipelineState || phase;
  if (!currentState) return resolved;

  // Determine if session reached a state where validation artifacts are expected.
  const statesExpectingValidation = ['COORDINATED', 'VALIDATED', 'COMPLETE', 'completed', 'complete', 'validating'];
  const shouldHaveValidation = statesExpectingValidation.includes(currentState);

  // Auto-resolve only when the session is TERMINAL or has reached a
  // validation-expecting state (a stalled COORDINATED/VALIDATED run that Stop is
  // finalizing). A genuinely early session (INIT/ORCHESTRATED/PLANNED) is left
  // untouched so no stub is fabricated for it. (Before REC-02 the gate required a
  // TERMINAL state, so a stalled COORDINATED session got NO honest stubs at all.)
  if (!isTerminalState(currentState) && !shouldHaveValidation) return resolved;

  // REC-02/06 honesty: a session is genuinely validated only when it carries a
  // real (non-safety-net) PASS report — nothing this hook fabricates can satisfy
  // it. The stubs below are therefore honest by construction: a genuine session
  // already has its real report (so no stub is created), and every stub the safety
  // net writes is for a NON-genuine session and MUST NOT claim PASS / completed.
  const genuine = sessionGenuinelyValidated(sessionDir, statusContent);

  const sessionId = path.basename(sessionDir);
  const now = new Date().toISOString();

  // 1. Auto-create missing execution_summary.yaml (resolves check 7)
  const execSummaryFile = path.join(sessionDir, 'workflow', 'execution_summary.yaml');
  if (shouldHaveValidation && !fs.existsSync(execSummaryFile)) {
    try {
      const domain = (() => {
        const planContent = safeRead(path.join(sessionDir, 'workflow', 'plan.yaml'));
        return planContent ? (extractYamlValue(planContent, 'domain') || 'unknown') : 'unknown';
      })();
      const stub = `# Auto-generated by autoResolveWarnings() safety net
# The pipeline should write this file in Step 4 — this stub prevents a warning.
session_id: "${sessionId}"
final_state: "${currentState}"
status: "${genuine ? 'completed' : 'incomplete'}"
domain: "${domain}"
generated_by: verify-completion-hook-safety-net
generated_at: "${now}"
`;
      ensureDir(path.join(sessionDir, 'workflow'));
      fs.writeFileSync(execSummaryFile, stub);
      resolved.push('execution_summary.yaml');
      console.error(`[AutoResolve] Created stub execution_summary.yaml for ${sessionId}`);
    } catch (e) {
      console.error(`[AutoResolve] Failed to create execution_summary.yaml: ${e.message}`);
    }
  }

  // 2. Auto-create missing validation_report.yaml (resolves check 6)
  const validationFile = path.join(sessionDir, 'workflow', 'validation_report.yaml');
  if (shouldHaveValidation && !fs.existsSync(validationFile)) {
    try {
      // REC-02 honesty: a hook-created stub is NEVER a genuine validator verdict.
      // The stub is only written when the real report is MISSING, so `genuine` is
      // false here by construction — the classification is UNKNOWN, not a
      // fabricated PASS. (Gated on `genuine` for symmetry with the exec-summary
      // stub; it resolves to UNKNOWN whenever this stub is created.)
      const stubStatus = genuine ? 'PASS' : 'UNKNOWN';
      const stub = `# Auto-generated by autoResolveWarnings() safety net
# The validator agent should write this file — this stub prevents a warning.
overall_status: ${stubStatus}
status: ${stubStatus}
generated_by: verify-completion-hook-safety-net
generated_at: "${now}"
note: "Auto-generated stub — no validator agent ran for this session."
`;
      ensureDir(path.join(sessionDir, 'workflow'));
      fs.writeFileSync(validationFile, stub);
      resolved.push('validation_report.yaml');
      console.error(`[AutoResolve] Created stub validation_report.yaml for ${sessionId}`);
    } catch (e) {
      console.error(`[AutoResolve] Failed to create validation_report.yaml: ${e.message}`);
    }
  }

  // 3 + 4. P0-3 (v12.7.x): coordination_log.yaml is NO LONGER mutated by this hook.
  //
  // Prior to P0-3, this block auto-appended empty `self_validation:` and
  // `validation_checkpoints:` placeholders to coordination_log.yaml whenever
  // controllers had not produced them. That pattern created false claims —
  // a stamped "Placeholder — controller did not record ..." entry looked like
  // self-validation data but contained no actual evidence. Honest absence is
  // strictly preferable to a stamped no-op.
  //
  // The hook MUST NOT write to coordination_log.yaml. Instead, emit a stderr
  // warning naming the missing fields so the gap is visible to operators
  // (the verifyCompletion checks below will also surface this in warnings).
  //
  // See `.claude/rules/core/resources/execution-self-validation.md` for the
  // v12.0.0 "5 agent-self-reported checks (verifier hook deferred)" contract.
  const coordLogFile = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
  const coordContent = safeRead(coordLogFile);
  if (coordContent) {
    const missingFields = [];
    if (!coordContent.includes('self_validation')) missingFields.push('self_validation');
    if (!coordContent.includes('pre_execution')) missingFields.push('validation_checkpoints.pre_execution');
    if (!coordContent.includes('mid_execution')) missingFields.push('validation_checkpoints.mid_execution');
    if (missingFields.length > 0) {
      console.error(
        '[verify-completion] coordination_log.yaml missing fields: ' +
        missingFields.join(', ') +
        '. Hook will not stamp placeholders (P0-3).'
      );
    }
  }

  if (resolved.length > 0) {
    console.error(`[AutoResolve] Resolved ${resolved.length} warning source(s) for ${sessionId}: ${resolved.join(', ')}`);
  }

  return resolved;
}

/**
 * Team-artifact enforcement (Phase 10, A8-01).
 *
 * Fires ONLY for `team_*` sessions that reached TERMINAL SUCCESS — i.e.
 * `result: success` AND a terminal pipeline_state (VALIDATED, or the
 * VALIDATED→complete safety-net's `complete`/`completed`/`COMPLETE`). The
 * `result === 'success'` guard is load-bearing: it excludes `failed`/`aborted`
 * AND any in-flight team session (which carries `result: pending`/null), so a
 * NON-terminal team run — phase EXECUTING/COORDINATED/ENRICHING/INIT, or a
 * terminal-but-not-success run — passes through untouched. This guard MUST NOT
 * fire mid-session; otherwise it would block every Stop turn of a live /team run
 * (including the audit session that is producing this very change).
 *
 *   - BLOCK (issues[])   when workflow/coordination_log.yaml is missing.
 *   - WARN  (warnings[] + console.error, never blocks) when a wave run
 *     (an `outputs/wave-N` dir exists) skipped its spawn briefs (no
 *     `spawn_brief.md` under any wave dir) or its gate validations
 *     (no `workflow/gate_validations` dir).
 */
function checkTeamArtifacts(sessionDir, statusContent) {
  const issues = [];
  const warnings = [];
  const sessionName = path.basename(sessionDir);
  if (!sessionName.startsWith('team_') || !statusContent) return { issues, warnings };

  const result = extractYamlValue(statusContent, 'result');
  const state = extractYamlValue(statusContent, 'pipeline_state')
    || extractYamlValue(statusContent, 'phase')
    || extractYamlValue(statusContent, 'current_phase');

  // Terminal SUCCESS gate. Non-terminal team sessions are NOT touched.
  const isTerminalSuccess = result === 'success' && state && isTerminalState(state);
  if (!isTerminalSuccess) return { issues, warnings };

  // BLOCK: coordination_log.yaml is mandatory for a completed team run.
  if (!fs.existsSync(path.join(sessionDir, 'workflow', 'coordination_log.yaml'))) {
    issues.push(
      `Team session '${sessionName}' reached terminal success (result: success) but ` +
      `workflow/coordination_log.yaml is MISSING. The /team lead MUST produce a ` +
      `coordination_log.yaml (e.g. via cagents:coord-log-writer, which assembles it from ` +
      `on-disk artifacts) before stopping — or set result: partial if the run did not ` +
      `fully complete. Without it the team run is unauditable.`
    );
  }

  // WARN (never block): a wave run that skipped its spawn briefs or gate validations.
  let waveDirs = [];
  try {
    const outputsDir = path.join(sessionDir, 'outputs');
    if (fs.existsSync(outputsDir)) {
      waveDirs = fs.readdirSync(outputsDir).filter(d => {
        if (!/^wave[-_]/i.test(d)) return false;
        try { return fs.statSync(path.join(outputsDir, d)).isDirectory(); } catch { return false; }
      });
    }
  } catch { /* best effort */ }

  if (waveDirs.length > 0) {
    const outputsDir = path.join(sessionDir, 'outputs');
    const anySpawnBrief = waveDirs.some(d => fs.existsSync(path.join(outputsDir, d, 'spawn_brief.md')));
    if (!anySpawnBrief) {
      const msg = `Team session '${sessionName}' has ${waveDirs.length} wave output dir(s) but no ` +
        `outputs/wave-*/spawn_brief.md — the wave run appears to have skipped its spawn briefs.`;
      warnings.push(msg);
      console.error(`[VerifyCompletion] ${msg}`);
    }
    if (!fs.existsSync(path.join(sessionDir, 'workflow', 'gate_validations'))) {
      const msg = `Team session '${sessionName}' has wave output dir(s) but no ` +
        `workflow/gate_validations/ — the wave run appears to have skipped its GATE validations.`;
      warnings.push(msg);
      console.error(`[VerifyCompletion] ${msg}`);
    }
  }

  return { issues, warnings };
}

function verifyCompletion(sessionDir) {
  const issues = [];
  const warnings = [];

  // 1. Check status.yaml (supports both phase-based and pipeline_state-based sessions)
  const statusFile = path.join(sessionDir, 'status.yaml');
  const statusContent = safeRead(statusFile);
  if (!statusContent) {
    warnings.push('No status.yaml file (session may not be a cAgents workflow)');
  } else {
    const phase = extractYamlValue(statusContent, 'phase') || extractYamlValue(statusContent, 'current_phase');
    const pipelineState = extractYamlValue(statusContent, 'pipeline_state');

    if (pipelineState) {
      // /run pipeline_state sessions (also handles legacy org_* sessions)
      const activeStates = ['INIT', 'ORCHESTRATED', 'ANALYZED', 'DELIBERATED', 'BRIEFED', 'EXECUTED', 'PLANNED', 'COORDINATED'];
      if (activeStates.includes(pipelineState)) {
        // Check if pipeline is actively running (recent state transition).
        // Claude Code fires Stop events between response turns while waiting
        // for background agents. If the last state transition was recent,
        // the pipeline is actively running — warn instead of block to avoid
        // the annoying block→respond→block loop.
        const lastTransitionAge = getLastTransitionAgeMs(statusContent);
        const thirtyMinutes = 30 * 60 * 1000;
        if (lastTransitionAge !== null && lastTransitionAge < thirtyMinutes) {
          // Pipeline recently active — but check if expected next-stage agent was spawned.
          // If not, the pipeline genuinely stopped mid-execution (not actively transitioning).
          const nextStageSpawned = checkNextStageAgentSpawned(sessionDir, pipelineState);
          const ageMin = Math.round(lastTransitionAge / 60000);
          // FIX 2 (OBJ-2, WI-6): only block when BOTH the next-stage agent is absent AND
          // the session is not actively working (no running child agent AND stale
          // heartbeat). A running child agent or a fresh heartbeat means a synchronous
          // pipeline is mid-flight / yielding for a background wait — warn, don't deadlock.
          if (!nextStageSpawned && !sessionActivelyWorking(sessionDir, statusContent)) {
            // No next-stage agent found in agent_tree.yaml AND not actively working — pipeline stopped mid-execution
            console.error(`[VerifyCompletion] Pipeline in '${pipelineState}' — no next-stage agent spawned and not actively working (last transition ${ageMin}min ago) — BLOCKING`);
            issues.push(`Pipeline stopped in '${pipelineState}' state with no next-stage agent spawned. The pipeline exited the loop but did not advance. Expected next agent not found in agent_tree.yaml.`);
          } else {
            // Next-stage agent exists OR session actively working — pipeline is actively running
            console.error(`[VerifyCompletion] Pipeline in '${pipelineState}' but actively running (last transition ${ageMin}min ago) — warning only`);
            warnings.push(`Pipeline actively running in '${pipelineState}' state (last transition ${ageMin}min ago)`);
          }
        } else {
          // No recent state transition. FIX 2 (OBJ-2, WI-6): block only when the session
          // is NOT actively working. A fresh heartbeat or a running child agent means the
          // session is legitimately mid-flight even past the 30-minute transition window.
          if (!sessionActivelyWorking(sessionDir, statusContent)) {
            issues.push(`Workflow stopping in '${pipelineState}' pipeline state (expected: COMPLETE or VALIDATED)`);
          } else {
            console.error(`[VerifyCompletion] Pipeline in '${pipelineState}' with no recent transition but actively working (running child agent or fresh heartbeat) — warning only`);
            warnings.push(`Pipeline actively working in '${pipelineState}' state despite no recent state transition`);
          }
        }
      } else if (!isTerminalState(pipelineState)) {
        warnings.push(`Workflow stopping in '${pipelineState}' pipeline state`);
      }
    } else if (!phase) {
      warnings.push('No phase defined in status.yaml');
    } else if (phase === 'planning' || phase === 'coordinating' || phase === 'executing') {
      issues.push(`Workflow stopping in '${phase}' phase (expected: completed or validating)`);
    } else {
      // Team session pre-execution detection (V10.25.1; re-anchored for the
      // concurrent-Agent DEFAULT model, v12.42.0).
      // When a team_ session has phase INIT/ENRICHING/ENRICHED and enrichment
      // artifacts exist (plan.yaml or work_items.yaml), the session completed
      // enrichment but coordination is incomplete. Teams are now IMPLICIT — the
      // TeamCreate/TeamDelete tools were removed in Claude Code 2.1.178, so there
      // is no team-creation step to gate on. Instead, verify WAVE/SPAWN EVIDENCE:
      // sessionActivelyWorking() below treats a session that is actively spawning
      // wave teammates (a running child agent in agent_tree.yaml) OR has a fresh
      // heartbeat as mid-flight and downgrades to a WARNING; only a genuinely
      // abandoned enrichment-complete session (no running child, stale heartbeat)
      // still blocks.
      const sessionName = path.basename(sessionDir);
      const isTeamSession = sessionName.startsWith('team_');
      const teamPreExecPhases = ['INIT', 'ENRICHING', 'ENRICHED'];
      const hasEnrichmentArtifacts = fs.existsSync(path.join(sessionDir, 'workflow', 'plan.yaml'))
        || fs.existsSync(path.join(sessionDir, 'workflow', 'work_items.yaml'));
      const noCoordLog = !fs.existsSync(path.join(sessionDir, 'workflow', 'coordination_log.yaml'));

      if (hasEnrichmentArtifacts && noCoordLog) {
        // Any session (team or run) that has enrichment artifacts but no coordination_log
        // is mid-pipeline. FIX 2 (OBJ-2, WI-6): block only when the session is NOT actively
        // working; a running child agent or a fresh heartbeat means the pipeline is
        // mid-flight (a block would deadlock a background wait) — warn instead.
        const sessionType = isTeamSession ? 'Team' : 'Pipeline';
        const enrichMsg =
          `${sessionType} session '${sessionName}' stopping in '${phase}' phase after enrichment completed. ` +
          `Enrichment artifacts exist (plan.yaml/work_items.yaml) but coordination is incomplete. ` +
          `You MUST continue executing the pipeline. Do NOT stop here.`;
        if (sessionActivelyWorking(sessionDir, statusContent)) {
          warnings.push(enrichMsg);
          console.error(`[VerifyCompletion] Enrichment-complete session actively working — warning only: ${sessionName}`);
        } else {
          issues.push(enrichMsg);
        }
      } else if (normalizeTerminalState(phase) !== 'complete' && phase !== 'validating' && phase !== 'TEAM_CREATED') {
        // normalizeTerminalState folds completed/COMPLETE/FINALIZED -> complete;
        // validating + TEAM_CREATED stay explicit non-terminal "ok to stop" states.
        warnings.push(`Workflow stopping in '${phase}' phase (expected: complete/completed or validating)`);
      }
    }
  }

  // 2. Coordination log presence enforcement (F-01)
  // If plan.yaml exists (indicating a /run or /team session with a planning phase),
  // and the session has progressed past coordinating, coordination_log.yaml MUST exist.
  // Skip this check for legacy org_* sessions and /review sessions which don't use plan.yaml.
  const planFile = path.join(sessionDir, 'workflow', 'plan.yaml');
  const hasPlan = fs.existsSync(planFile);
  if (hasPlan) {
    const coordLogForEnforcement = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
    const hasCoordLog = fs.existsSync(coordLogForEnforcement);
    if (!hasCoordLog) {
      // Only enforce if we're past the coordinating phase
      const postCoordinatingStates = [
        'executing', 'EXECUTED', 'validating', 'VALIDATED',
        'coordinated', 'COORDINATED', 'completed', 'complete', 'COMPLETE',
        'failed', 'aborted'
      ];
      const currentStateForCoord = statusContent
        ? (extractYamlValue(statusContent, 'pipeline_state') || extractYamlValue(statusContent, 'phase') || extractYamlValue(statusContent, 'current_phase'))
        : null;
      if (currentStateForCoord && postCoordinatingStates.includes(currentStateForCoord)) {
        // FIX 2 (OBJ-2, WI-6): a missing coordination_log in a post-coordinating state is
        // only a hard block when the session is abandoned. If a child agent is still
        // running or the heartbeat is fresh, the controller is mid-flight writing it —
        // warn instead of block so a synchronous background wait is not deadlocked.
        const coordMsg =
          `coordination_log.yaml is missing but plan.yaml exists and session is in '${currentStateForCoord}' state. ` +
          `Controllers MUST write coordination_log.yaml to document their decision-making. ` +
          `Without it, the controller's work is unauditable.`;
        if (sessionActivelyWorking(sessionDir, statusContent)) {
          warnings.push(coordMsg);
          console.error(`[VerifyCompletion] coordination_log missing but session actively working — warning only: ${path.basename(sessionDir)}`);
        } else {
          issues.push(coordMsg);
        }
      }
    }
  }

  // 3. Delegation violation check (V10.22.6)
  // If the session stopped in a pre-COORDINATED state with no agent_tree.yaml
  // child entries (depth 0), flag it as a delegation violation.
  // This detects self-handling bypasses: the model stopped without spawning any agents.
  // Exception: sessions that reached VALIDATED/COMPLETE are not flagged (clean completion).
  const PRE_COORDINATED_STATES_VC = ['INIT', 'ORCHESTRATED', 'PLANNED'];
  const agentTreeFile = path.join(sessionDir, 'workflow', 'agent_tree.yaml');
  const agentTreeContent = safeRead(agentTreeFile);
  if (statusContent) {
    const pipelineStateForVC = extractYamlValue(statusContent, 'pipeline_state');
    // Only check if session stopped in a pre-COORDINATED state (not naturally completed)
    if (pipelineStateForVC && PRE_COORDINATED_STATES_VC.includes(pipelineStateForVC)) {
      // Check agent_tree.yaml for child agents (depth > 0)
      // agent_tree.yaml entries with depth > 0 indicate agents were spawned
      let childAgentCount = 0;
      if (agentTreeContent) {
        // Count entries with depth: 1 or higher (depth: 0 is the pipeline root itself)
        const depthMatches = agentTreeContent.match(/\bdepth:\s*([1-9]\d*)\b/g);
        childAgentCount = depthMatches ? depthMatches.length : 0;

        // Fallback: count `- id:` list entries (the real schema written by
        // subagent-tracker.cjs — M-24 bug class; the previous `agent_id:` key
        // never matched, so this fallback always returned 0). The /run root is
        // a separate `root:` block (keyed `agent:`, not a `- id:` list entry),
        // so every `- id:` match IS a spawned child — no -1 offset needed.
        if (childAgentCount === 0) {
          const idMatches = agentTreeContent.match(/^\s*- id:/gm);
          childAgentCount = idMatches ? idMatches.length : 0;
        }
      }

      if (childAgentCount === 0) {
        const sessionName = path.basename(sessionDir);
        const delegationMsg =
          `DELEGATION VIOLATION: Session '${sessionName}' stopped in '${pipelineStateForVC}' state ` +
          `with no child agents spawned. This indicates the pipeline was not executed — ` +
          `work was self-handled or the session was abandoned before delegation. ` +
          `Expected: agent_tree.yaml with depth>0 entries showing spawned orchestrator/planner/controller agents.`;

        // REC-13: promote the delegation-violation check from a WARNING to a
        // hard BLOCK so the aggressive-delegation contract is enforced at the
        // Stop gate — but ONLY for a genuinely-abandoned self-handled session.
        // This runs AFTER the live/active discriminator so a legitimately
        // mid-flight or just-started session NEVER deadlocks. Three guards, all
        // of which must be clear for the block to fire:
        //   1. !sessionActivelyWorking — no FRESH running child AND no fresh
        //      heartbeat (subsumes REC-04's 0-child gate + REC-05's stale-child
        //      freshness gate).
        //   2. NOT recently transitioned — a session that changed state <30min
        //      ago is still advancing (Path A's warn window); a just-INIT
        //      session with no heartbeat yet is not hard-blocked here.
        //   3. No graceful-degradation sentinel — a session whose
        //      coordination_log documents the Agent-tool-absent fallback
        //      (see .claude/rules/core/teams.md § Nesting-Ceiling Degradation)
        //      degraded legitimately and is never hard-blocked.
        const activelyWorkingVC = sessionActivelyWorking(sessionDir, statusContent);
        const lastTxAgeVC = getLastTransitionAgeMs(statusContent);
        const recentlyTransitionedVC = lastTxAgeVC !== null && lastTxAgeVC < (30 * 60 * 1000);
        const coordForDegradationVC = safeRead(path.join(sessionDir, 'workflow', 'coordination_log.yaml'));
        const gracefulDegradationVC = !!coordForDegradationVC
          && coordForDegradationVC.includes('Agent/subagent-spawn tool was not available');

        if (!activelyWorkingVC && !recentlyTransitionedVC && !gracefulDegradationVC) {
          issues.push(delegationMsg);
          console.error(`[VerifyCompletion] Delegation violation (BLOCKING — genuinely abandoned): ${sessionName} stopped in ${pipelineStateForVC} with no spawned agents`);
        } else {
          warnings.push(delegationMsg);
          console.error(`[VerifyCompletion] Delegation violation (warning — mid-flight or degraded): ${sessionName} stopped in ${pipelineStateForVC} with no spawned agents`);
        }
      }
    }
  }

  // 3b. Controller self-handling detection (V10.25.3)
  // If coordination_log.yaml exists with status: completed, verify that the controller
  // actually spawned execution agents (depth >= 2 in agent_tree.yaml).
  // This catches controllers that do all work directly instead of delegating.
  const coordLogForSelfCheck = safeRead(path.join(sessionDir, 'workflow', 'coordination_log.yaml'));
  if (coordLogForSelfCheck) {
    const coordStatusForSelfCheck = extractYamlValue(coordLogForSelfCheck, 'status');

    if (coordStatusForSelfCheck === 'completed') {
      // Count depth >= 2 agents (execution agents spawned by controllers)
      let executorCount = 0;
      if (agentTreeContent) {
        const depth2Matches = agentTreeContent.match(/\bdepth:\s*([2-9]\d*)\b/g);
        executorCount = depth2Matches ? depth2Matches.length : 0;
      }

      if (executorCount === 0) {
        // Check for self-handling rationalization phrases in coordination_log
        const selfHandlingPhrases = [
          'executed all changes directly',
          'handled directly',
          'implemented directly',
          'did the work myself',
          'self-handled',
          'without delegating',
          'rather than spawning'
        ];
        const hasSelfHandlingAdmission = selfHandlingPhrases.some(phrase =>
          coordLogForSelfCheck.toLowerCase().includes(phrase.toLowerCase())
        );

        const sessionName = path.basename(sessionDir);

        // PHASE-N1 (V11.1.13; comments repositioned in v12.17.0): context-aware
        // severity downgrade for /team graceful-degradation.
        //
        // v12.17.0 repositioning: the "Agent tool stripped at depth >= 1" behavior
        // this downgrade was originally written for is NO LONGER the default.
        // Claude Code 2.1.172+ lets subagents spawn their own subagents up to 5
        // levels deep, with the Agent tool present at every level (verified on CC
        // 2.1.173 in session run_deep-nesting-enablement_260611_001). Graceful
        // degradation is now a DEFENSIVE FALLBACK that fires only when the Agent
        // tool is genuinely absent — at the actual nesting ceiling (a subagent at
        // depth 5 cannot spawn depth 6) or if a future/older harness regresses the
        // capability. See .claude/rules/playbooks/pat-graceful-degradation-depth1.md
        // (§ Status: REPOSITIONED in v12.17.0).
        //
        // The DETECTION LOGIC below is unchanged and still valid for the fallback
        // case: when a controller runs under a /team session AND its coordination_log
        // documents — via the sentinel sentence — that the Agent/subagent-spawn tool
        // was verifiably unavailable, the "0 executors spawned" warning is downgraded
        // from "protocol violation" to "graceful degradation (acceptable)". This
        // prevents the hook from flagging legitimate fallback direct-execution as a
        // violation.
        //
        // Trigger conditions (BOTH must hold):
        //   1. session dir basename begins with "team_"
        //   2. coordination_log contains the literal sentence
        //      "Agent/subagent-spawn tool was not available"
        //      (the PRESERVED fallback sentinel — keyed on identically pre- and
        //       post-v12.17.0)
        //
        // See: cagents-memory/_knowledge/agent-tool-depth1-stripping.md (historical)
        // Note: sessionName (= path.basename(sessionDir)) is the session_id
        // by construction; no need to thread the hook input down here.
        const isTeamSession = sessionName.startsWith('team_');
        const hasGracefulDegradationMarker = coordLogForSelfCheck.includes(
          'Agent/subagent-spawn tool was not available'
        );

        let message;
        if (isTeamSession && hasGracefulDegradationMarker) {
          message = `CONTROLLER SELF-HANDLED VIA GRACEFUL DEGRADATION (acceptable in /team mode): ` +
            `Session '${sessionName}' has coordination_log with status: completed ` +
            `and 0 execution agents spawned, but the coordination_log explicitly documents — via the fallback ` +
            `sentinel — that the Agent/subagent-spawn tool was verifiably absent ` +
            `(see .claude/rules/core/teams.md § Nesting-Ceiling Degradation, repositioned in v12.17.0). ` +
            `Direct execution + self-validation per the nesting-ceiling fallback rule is acceptable here.`;
          console.error(`[VerifyCompletion] Graceful-degradation marker recognized for /team session: ${sessionName}`);
        } else {
          message = `CONTROLLER SELF-HANDLING (protocol violation): Session '${sessionName}' has coordination_log with status: completed ` +
            `but no execution agents were spawned (0 agents at depth >= 2 in agent_tree.yaml). ` +
            `Controllers MUST delegate to execution agents via Agent tool — direct implementation is a protocol violation.` +
            (hasSelfHandlingAdmission ? ' The coordination_log contains an explicit admission of self-handling.' : '');
          console.error(`[VerifyCompletion] Controller self-handling detected: ${sessionName} completed coordination with 0 executors`);
        }

        warnings.push(message);
      }
    }
  }

  // 4. Sentinel Gate Factchecking (V10.17.0)
  // Verify that claimed deliverables actually exist on disk.
  const coordFileForSentinel = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
  const coordForSentinel = safeRead(coordFileForSentinel);
  if (coordForSentinel) {
    // Extract files_created and files_modified claims
    const filesClaimed = [];
    const createdMatches = coordForSentinel.match(/files_created:\s*\n((?:\s+-\s+[^\n]+\n?)*)/g);
    const modifiedMatches = coordForSentinel.match(/files_modified:\s*\n((?:\s+-\s+[^\n]+\n?)*)/g);
    const outputMatches = coordForSentinel.match(/output(?:_file|_path|s)?:\s*["']?([^\s"'\n]+)/g);

    const extractPaths = (matches) => {
      if (!matches) return;
      for (const block of matches) {
        const lines = block.split('\n');
        for (const line of lines) {
          const pathMatch = line.match(/^\s+-\s+["']?([^\s"'\n]+)/);
          if (pathMatch) {
            const p = pathMatch[1].trim();
            if (p && !p.startsWith('files_')) filesClaimed.push(p);
          }
        }
      }
    };

    extractPaths(createdMatches);
    extractPaths(modifiedMatches);
    if (outputMatches) {
      for (const m of outputMatches) {
        const p = m.replace(/output(?:_file|_path|s)?:\s*["']?/, '').trim();
        if (p) filesClaimed.push(p);
      }
    }

    // Verify claimed files exist
    let missingFiles = 0;
    const missingList = [];
    for (const claimed of filesClaimed) {
      // Resolve relative to session dir or project root
      const candidates = [
        path.resolve(sessionDir, claimed),
        path.resolve(PROJECT_ROOT, claimed),
      ];
      const exists = candidates.some(c => fs.existsSync(c));
      if (!exists) {
        missingFiles++;
        if (missingList.length < 5) missingList.push(claimed);
      }
    }

    if (missingFiles > 0) {
      warnings.push(`Sentinel gate: ${missingFiles} claimed deliverable(s) not found on disk: ${missingList.join(', ')}${missingFiles > 5 ? '...' : ''}`);
    }
  }

  // 5. Check coordination_log.yaml for work item completion
  // (renumbered from 2 after sentinel gate insertion, then from 3 after delegation check, then from 4 after coord_log enforcement)
  // For legacy org_* sessions, also check integration_report.yaml and per-domain coordination logs
  const coordFile = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
  let coordContent = safeRead(coordFile);

  // For legacy org_* sessions: check integration_report.yaml as the primary completion indicator
  const integrationReport = safeRead(path.join(sessionDir, 'integration_report.yaml'));
  if (!coordContent && integrationReport) {
    // Legacy org_* session with integration report - check for unresolved issues
    const unresolvedCount = countPattern(integrationReport, /status:\s*unresolved/g);
    if (unresolvedCount > 0) warnings.push(`${unresolvedCount} cross-domain issue(s) unresolved in integration report`);
  }

  if (coordContent) {
    const pendingCount = countPattern(coordContent, /status:\s*pending/g);
    const inProgressCount = countPattern(coordContent, /status:\s*in_progress/g);
    if (pendingCount > 0) issues.push(`${pendingCount} work item(s) still pending`);
    if (inProgressCount > 0) issues.push(`${inProgressCount} work item(s) still in progress`);

    const emptyEvidence = countPattern(coordContent, /evidence:\s*(?:\[\]|null|""|'')$/gm);
    if (emptyEvidence > 0) warnings.push(`${emptyEvidence} work item(s) missing completion evidence`);
  }

  // 6. Check validation report (only if session reached a state where validation is expected)
  const validationFile = path.join(sessionDir, 'workflow', 'validation_report.yaml');
  const valContent = safeRead(validationFile);
  // Only warn about missing validation if the session has a status.yaml indicating
  // it should have reached validation (terminal or near-terminal states).
  // Early-stage sessions (INIT, ORCHESTRATED, PLANNED) are not expected to have one.
  const statesExpectingValidation = ['COORDINATED', 'VALIDATED', 'COMPLETE', 'completed', 'complete', 'validating'];
  const currentPhase = statusContent
    ? (extractYamlValue(statusContent, 'pipeline_state') || extractYamlValue(statusContent, 'phase') || extractYamlValue(statusContent, 'current_phase'))
    : null;
  const shouldHaveValidation = currentPhase && statesExpectingValidation.includes(currentPhase);
  if (!valContent && shouldHaveValidation) {
    warnings.push('Missing validation report');
  } else if (valContent) {
    const status = extractYamlValue(valContent, 'overall_status') || extractYamlValue(valContent, 'status');
    if (status && status !== 'PASS') warnings.push(`Validation status: ${status} (expected: PASS)`);
  }

  // 7. Check execution_summary.yaml exists and was written by /run (REQ-012)
  // /run SKILL.md Step 4 item 4.3 mandates this file even on failure or interruption.
  const execSummaryPath = path.join(sessionDir, 'workflow', 'execution_summary.yaml');
  if (shouldHaveValidation) {
    if (!fs.existsSync(execSummaryPath)) {
      warnings.push('Missing workflow/execution_summary.yaml (required at pipeline completion per /run Step 4)');
    } else {
      // 7b. Check if execution_summary was auto-generated by the hook safety net
      // rather than written by /run itself. An auto-generated stub means /run
      // skipped Step 4 (Report Results) — the most common pipeline completion failure.
      const execSummaryContent = safeRead(execSummaryPath);
      if (execSummaryContent) {
        const generatedBy = extractYamlValue(execSummaryContent, 'generated_by');
        if (generatedBy && generatedBy.includes('safety-net')) {
          warnings.push(
            'execution_summary.yaml was auto-generated by the verify-completion hook safety net, ' +
            'not by /run Step 4. This means /run stopped after VALIDATED without executing its ' +
            'MANDATORY Step 4 (Report Results). The stub contains minimal information. ' +
            '/run MUST write execution_summary.yaml itself with full pipeline metrics.'
          );
          console.error(`[VerifyCompletion] Step 4 skip detected: execution_summary.yaml was auto-generated for ${path.basename(sessionDir)}`);
        }
      }
    }
  }

  // ====================================================================
  // V10.23.0 Enhanced Validation Checks (A through E)
  // These checks add deeper validation without blocking — warnings only.
  // ====================================================================
  let totalChecks = 7; // Base checks (1-7 above, including coord_log enforcement)
  const coordLogPath = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
  const coordLogContent = safeRead(coordLogPath);

  // Check A: Evidence Completeness Scoring (V10.23.0)
  // Score each completed work item's evidence on a 0-3 scale:
  // 0 = no evidence, 1 = vague ("looks good"), 2 = specific but unverifiable, 3 = file:line citations
  totalChecks++;
  if (coordLogContent) {
    const vaguePatterns = ['looks good', 'seems correct', 'probably works', 'should be fine', 'appears to work', 'implemented as expected'];
    const specificPatterns = [/\w+\.\w+:\d+/, /src\//, /tests?\s+pass/i, /\d+\/\d+\s+pass/i];

    // Extract evidence blocks from implementation_tasks entries
    const evidenceBlocks = [];
    const taskSections = coordLogContent.split(/- task_id:/);
    for (let i = 1; i < taskSections.length; i++) {
      const section = taskSections[i];
      // Only score completed items
      if (/status:\s*completed/i.test(section)) {
        const evidenceMatch = section.match(/evidence:\s*(?:\|[\s\S]*?)(?=\n\s*\w+:|$)|evidence:\s*"([^"]*)"|evidence:\s*'([^']*)'|evidence:\s*([^\n]+)/);
        evidenceBlocks.push(evidenceMatch ? (evidenceMatch[1] || evidenceMatch[2] || evidenceMatch[3] || evidenceMatch[0]) : '');
      }
    }

    if (evidenceBlocks.length > 0) {
      let totalScore = 0;
      for (const evidence of evidenceBlocks) {
        if (!evidence || evidence.trim() === '' || evidence.trim() === '[]' || evidence.trim() === 'null') {
          // Score 0: no evidence
          totalScore += 0;
        } else if (vaguePatterns.some(vp => evidence.toLowerCase().includes(vp))) {
          // Score 1: vague evidence
          totalScore += 1;
        } else if (specificPatterns.some(sp => sp.test(evidence))) {
          // Score 3: file:line citations or specific test results
          totalScore += 3;
        } else {
          // Score 2: specific but unverifiable
          totalScore += 2;
        }
      }
      const avgScore = totalScore / evidenceBlocks.length;
      if (avgScore < 2.0) {
        warnings.push(`Evidence quality: average score ${avgScore.toFixed(1)}/3.0 across ${evidenceBlocks.length} completed item(s). ` +
          `Score < 2.0 indicates vague or missing evidence. Provide file:line citations and test results for higher confidence.`);
      }
    }
  }

  // Check B: Acceptance Criteria Coverage (V10.23.0)
  // Verify that coordination_log has evidence for EVERY acceptance criterion, not just some
  totalChecks++;
  const workItemsPath = path.join(sessionDir, 'workflow', 'work_items.yaml');
  const workItemsContent = safeRead(workItemsPath);
  if (workItemsContent && coordLogContent) {
    // Count acceptance criteria in work_items.yaml
    const acMatches = workItemsContent.match(/acceptance_criteria:/g);
    const totalCriteria = acMatches ? acMatches.length : 0;

    // Count individual criterion entries (lines starting with - under acceptance_criteria)
    const criterionLines = workItemsContent.match(/acceptance_criteria:\s*\n((?:\s+-\s+[^\n]+\n?)*)/g);
    let totalCriterionItems = 0;
    if (criterionLines) {
      for (const block of criterionLines) {
        const items = block.match(/^\s+-\s+/gm);
        totalCriterionItems += items ? items.length : 0;
      }
    }

    // Count evidence entries in coordination_log.yaml
    const evidenceEntries = coordLogContent.match(/evidence:/g);
    const totalEvidence = evidenceEntries ? evidenceEntries.length : 0;

    // Also count individual criterion-level evidence (MET/NOT MET/PARTIAL)
    const criterionResults = coordLogContent.match(/\b(?:MET|NOT MET|PARTIAL)\b/g);
    const totalCriterionResults = criterionResults ? criterionResults.length : 0;

    if (totalCriteria > 0 && totalEvidence < totalCriteria) {
      const coverage = Math.round((totalEvidence / totalCriteria) * 100);
      warnings.push(`Acceptance criteria coverage: ${totalEvidence}/${totalCriteria} work items have evidence (${coverage}%). ` +
        `Every work item should have documented evidence of criteria being met.`);
    }

    if (totalCriterionItems > 0 && totalCriterionResults > 0 && totalCriterionResults < totalCriterionItems) {
      const coverage = Math.round((totalCriterionResults / totalCriterionItems) * 100);
      warnings.push(`Criterion-level coverage: ${totalCriterionResults}/${totalCriterionItems} individual criteria have MET/NOT MET/PARTIAL status (${coverage}%).`);
    }
  }

  // Check C: Schema Validation for Workflow YAML (V10.23.0)
  // Verify required fields in key workflow files
  totalChecks++;
  const schemaChecks = [
    { file: 'workflow/plan.yaml', required: ['mission', 'objectives', 'controller_assignment'] },
    { file: 'workflow/coordination_log.yaml', required: ['schema_version', 'controller', 'status'] },
    { file: 'workflow/execution_summary.yaml', required: ['session_id', 'final_state', 'status'] },
  ];
  for (const check of schemaChecks) {
    const filePath = path.join(sessionDir, check.file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const field of check.required) {
        if (!content.includes(field + ':')) {
          warnings.push(`Schema: ${check.file} missing required field '${field}'`);
        }
      }
    }
  }

  // Check D: Self-Validation Report (V10.23.0)
  // Verify execution agents included self-validation in their responses
  totalChecks++;
  if (coordLogContent) {
    if (!coordLogContent.includes('self_validation') && !coordLogContent.includes('validation_checkpoints')) {
      warnings.push('No self-validation reports found in coordination_log. Execution agents may not have run self-validation checklist.');
    }
  }

  // Check E: Validation Checkpoint Presence (V10.23.0)
  // Verify that pre-execution and mid-execution checkpoints were recorded
  totalChecks++;
  if (coordLogContent) {
    if (!coordLogContent.includes('pre_execution')) {
      warnings.push('No pre-execution validation checkpoint found. Controller may have skipped input validation.');
    }
    if (!coordLogContent.includes('mid_execution')) {
      warnings.push('No mid-execution checkpoint found. Controller may have skipped progress validation.');
    }
  }

  // Team-artifact enforcement (Phase 10, A8-01) — terminal-success team_* only.
  // BLOCK on missing coordination_log; WARN on skipped wave briefs/gates.
  const teamArtifacts = checkTeamArtifacts(sessionDir, statusContent);
  for (const i of teamArtifacts.issues) issues.push(i);
  for (const w of teamArtifacts.warnings) warnings.push(w);

  // Validation summary
  const validationSummary = `Completion validation: ${totalChecks} checks run, ${warnings.length} warnings`;
  console.error(`[VerifyCompletion] ${validationSummary}`);

  return { issues, warnings };
}

// ====================================================================
// C1 (advisory-first): WARN-only self-validation recheck at Stop.
//
// Mechanizes the two DETERMINISTICALLY-checkable checks from
// .claude/rules/core/resources/execution-self-validation.md:
//   Check 2 (file existence): every claimed-existing file path really exists.
//   Check 3 (guard exit codes): every claimed guard ran with exit_code === 0
//                               (a missing exit_code on a claimed guard is a
//                               mismatch too).
//
// This is PURELY ADVISORY. It is invoked for its side effects AFTER
// verifyCompletion() has already computed the block/allow/warn verdict, it
// NEVER contributes to issues[]/warnings[], and its return value is discarded
// by the handler. The Stop hook's returned decision is therefore byte-identical
// whether or not this pass runs. Findings surface via console.error (stderr ->
// user verbose mode) and a NEW file workflow/self_validation_recheck.yaml. The
// whole thing is wrapped so it can NEVER throw out of the hook.
// ====================================================================

/**
 * Recursively find any self-validation artifact files under a directory
 * (outputs/**\/self-validation.yaml, from graceful-degradation / status-protocol
 * writers). Bounded, best-effort, never throws.
 */
function findSelfValidationFiles(dir) {
  const found = [];
  const stack = [dir];
  let guard = 0;
  while (stack.length && guard < 5000) {
    guard++;
    const cur = stack.pop();
    let entries;
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const ent of entries) {
      const full = path.join(cur, ent.name);
      try {
        if (ent.isDirectory()) {
          stack.push(full);
        } else if (ent.isFile() && /^self[-_]validation\.ya?ml$/i.test(ent.name)) {
          found.push(full);
        }
      } catch { /* skip unreadable entry */ }
    }
  }
  return found;
}

/**
 * Persist the advisory recheck findings to workflow/self_validation_recheck.yaml.
 * A brand-new file — this function NEVER mutates coordination_log.yaml,
 * completion_summary.yaml, or any decision-bearing artifact.
 */
function writeRecheckReport(sessionDir, report) {
  try {
    ensureDir(path.join(sessionDir, 'workflow'));
    const outPath = path.join(sessionDir, 'workflow', 'self_validation_recheck.yaml');
    const lines = [
      '# Self-Validation Recheck (C1 — advisory / WARN-only)',
      '# Mechanical recheck of execution-self-validation.md Check 2 (file existence)',
      '# and Check 3 (guard exit codes) by verify-completion.cjs at Stop.',
      '# ADVISORY ONLY: this file does NOT block the Stop hook or alter its decision.',
      `generated_at: "${new Date().toISOString()}"`,
      `session_id: "${path.basename(sessionDir)}"`,
      'advisory: true',
      `blocks_checked: ${report.checked}`,
      `file_claims_checked: ${report.file_claims}`,
      `guard_claims_checked: ${report.guard_claims}`,
      `mismatch_count: ${report.mismatches.length}`,
    ];
    if (report.sources.length > 0) {
      lines.push('sources:');
      for (const s of report.sources) lines.push(`  - "${s}"`);
    } else {
      lines.push('sources: []');
    }
    if (report.mismatches.length > 0) {
      lines.push('mismatches:');
      for (const m of report.mismatches) {
        lines.push(`  - type: "${m.type}"`);
        if (m.path !== undefined) lines.push(`    path: "${String(m.path).replace(/"/g, '\\"')}"`);
        if (m.guard !== undefined) lines.push(`    guard: "${String(m.guard).replace(/"/g, '\\"')}"`);
        if (m.exit_code !== undefined) lines.push(`    exit_code: ${JSON.stringify(m.exit_code)}`);
        if (m.task) lines.push(`    task: "${String(m.task).replace(/"/g, '\\"')}"`);
        lines.push(`    source: "${m.source}"`);
      }
    } else {
      lines.push('mismatches: []');
    }
    fs.writeFileSync(outPath, lines.join('\n') + '\n');
  } catch (e) {
    console.error(`[VerifyCompletion] self-validation recheck write failed (non-fatal): ${e && e.message}`);
  }
}

/**
 * Gather self_validation claims from the session's on-disk artifacts and
 * mechanically recheck Check 2 (file existence) and Check 3 (guard exit codes).
 *
 * Sources (read-only):
 *   (a) workflow/coordination_log.yaml -> implementation_tasks[].self_validation
 *   (b) outputs/**\/self-validation.yaml (block at top level OR under `self_validation:`)
 *
 * @param {string} sessionDir - absolute session directory path
 * @returns {{checked:number, file_claims:number, guard_claims:number,
 *            mismatches:Array<object>, sources:string[]}}
 */
function recheckSelfValidation(sessionDir) {
  const report = { checked: 0, file_claims: 0, guard_claims: 0, mismatches: [], sources: [] };
  try {
    if (!_svYaml) return report; // js-yaml unavailable — advisory feature degrades to a no-op

    const blocks = []; // { source, sv, ref }

    // (a) coordination_log.yaml implementation_tasks[].self_validation
    const coordRaw = safeRead(path.join(sessionDir, 'workflow', 'coordination_log.yaml'));
    if (coordRaw) {
      let coordDoc = null;
      try { coordDoc = _svYaml.load(coordRaw); } catch { coordDoc = null; }
      const tasks = coordDoc && (coordDoc.implementation_tasks || coordDoc.implementationTasks);
      if (Array.isArray(tasks)) {
        for (const t of tasks) {
          if (t && typeof t === 'object' && t.self_validation && typeof t.self_validation === 'object') {
            blocks.push({ source: 'workflow/coordination_log.yaml', sv: t.self_validation, ref: t.task_id || t.id || null });
          }
        }
      }
    }

    // (b) outputs/**\/self-validation.yaml
    for (const svFile of findSelfValidationFiles(path.join(sessionDir, 'outputs'))) {
      const raw = safeRead(svFile);
      if (!raw) continue;
      let doc = null;
      try { doc = _svYaml.load(raw); } catch { doc = null; }
      if (!doc || typeof doc !== 'object') continue;
      const sv = (doc.self_validation && typeof doc.self_validation === 'object') ? doc.self_validation : doc;
      let rel;
      try { rel = path.relative(sessionDir, svFile); } catch { rel = svFile; }
      blocks.push({ source: rel, sv, ref: doc.task_id || doc.id || null });
    }

    for (const { source, sv, ref } of blocks) {
      report.checked++;
      if (!report.sources.includes(source)) report.sources.push(source);

      // Check 2: file existence — every claimed-existing path must exist on disk.
      const fe = sv.file_existence || sv.fileExistence;
      const claimed = fe && (fe.files_claimed_to_exist || fe.filesClaimedToExist);
      if (Array.isArray(claimed)) {
        for (const entry of claimed) {
          const p = (entry && typeof entry === 'object')
            ? (entry.path || entry.file)
            : (typeof entry === 'string' ? entry : null);
          if (!p || typeof p !== 'string') continue;
          report.file_claims++;
          // Resolve relative to sessionDir OR PROJECT_ROOT (mirrors the sentinel gate).
          const candidates = [path.resolve(sessionDir, p), path.resolve(PROJECT_ROOT, p)];
          const exists = candidates.some(c => { try { return fs.existsSync(c); } catch { return false; } });
          if (!exists) {
            report.mismatches.push({ type: 'file_missing', path: p, source, task: ref });
          }
        }
      }

      // Check 3: guard exit codes — every claimed guard must have exit_code === 0.
      const guards = sv.guard_results || sv.guardResults;
      if (Array.isArray(guards)) {
        for (const g of guards) {
          if (!g || typeof g !== 'object') continue;
          report.guard_claims++;
          const name = g.name || g.command || 'unknown';
          const hasExit = Object.prototype.hasOwnProperty.call(g, 'exit_code')
            || Object.prototype.hasOwnProperty.call(g, 'exitCode');
          const exit = g.exit_code !== undefined ? g.exit_code : g.exitCode;
          if (!hasExit || exit === null || exit === undefined) {
            report.mismatches.push({ type: 'guard_missing_exit_code', guard: name, source, task: ref });
          } else if (Number(exit) !== 0) {
            report.mismatches.push({ type: 'guard_nonzero_exit', guard: name, exit_code: exit, source, task: ref });
          }
        }
      }
    }

    if (report.checked > 0) {
      if (report.mismatches.length > 0) {
        const summary = report.mismatches.map(m =>
          m.type === 'file_missing' ? `missing file ${m.path}`
            : m.type === 'guard_nonzero_exit' ? `guard ${m.guard} exit_code ${m.exit_code}`
              : `guard ${m.guard} missing exit_code`
        ).join('; ');
        console.error(
          `[VerifyCompletion] self-validation recheck (advisory, WARN-only): ` +
          `${report.mismatches.length} mismatch(es) across ${report.checked} block(s) — ${summary}`
        );
      } else {
        console.error(`[VerifyCompletion] self-validation recheck (advisory): ${report.checked} block(s) verified, 0 mismatches`);
      }
      writeRecheckReport(sessionDir, report);
    }
  } catch (e) {
    // NEVER throw out of the Stop hook — advisory pass only.
    console.error(`[VerifyCompletion] self-validation recheck error (non-fatal, advisory): ${e && e.message}`);
  }
  return report;
}

createHook('VerifyCompletion', async (input) => {
  // Prevent infinite loops: if stop_hook_active, allow stop
  if (input && input.stop_hook_active) {
    console.error('[VerifyCompletion] stop_hook_active=true, allowing stop');
    return null;
  }

  let sessionDir = findActiveSession(input.session_id);
  // Explicit-hint, terminal-inclusive resolution (concurrency contract,
  // pat-concurrent-session-hooks.md § Stop/SessionEnd fallback). verify-completion
  // is a Stop hook that legitimately finalizes a TERMINAL session: by the time it
  // fires, the skill has usually written pipeline_state: complete, so the default
  // findActiveSession() chain refuses to resolve (it returns null for terminal
  // sessions). Under two concurrent same-directory sessions, falling straight
  // through to findMostRecentSessionDir() would bind this hook to whichever
  // session was touched last — the WRONG session (the H1/H3 cross-session leak).
  // When the Stop payload carries an explicit cAgents-shaped session_id naming an
  // existing directory, resolve THAT directory directly (terminal or not) so the
  // hook stays bound to its own session regardless of sibling-session mtimes.
  if (!sessionDir && input && input.session_id && !isSdkUuidShape(input.session_id)) {
    const hintedDir = path.join(AGENT_MEMORY_DIR, 'sessions', input.session_id);
    if (fs.existsSync(hintedDir)) {
      sessionDir = hintedDir;
      console.error(`[VerifyCompletion] findActiveSession returned null (session terminal); resolving explicit session_id hint directly: ${path.basename(sessionDir)}`);
    }
  }
  // Fallback: no usable explicit hint (e.g. SDK UUID payload, or no session_id).
  // Use findMostRecentSessionDir with includeTerminal to find recently-completed
  // sessions for lifecycle finalization. This path is only reached when the hook
  // has no session-specific binding to honor.
  if (!sessionDir) {
    sessionDir = findMostRecentSessionDir({ includeTerminal: true });
    if (sessionDir) {
      console.error(`[VerifyCompletion] findActiveSession returned null and no resolvable session_id hint, using terminal-inclusive fallback: ${path.basename(sessionDir)}`);
    }
  }
  if (!sessionDir) return null;

  // Skip stale sessions (>24h old) - they're abandoned, not actively running
  const statusFile = path.join(sessionDir, 'status.yaml');
  const statusContent = safeRead(statusFile);
  if (statusContent) {
    const updatedAt = extractYamlValue(statusContent, 'last_updated_at')
      || extractYamlValue(statusContent, 'updated_at')
      || extractYamlValue(statusContent, 'started_at')
      || extractYamlValue(statusContent, 'created_at');
    if (updatedAt) {
      const sessionAge = Date.now() - new Date(updatedAt).getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (sessionAge > twentyFourHours) {
        console.error(`[VerifyCompletion] Skipping stale session (${Math.round(sessionAge / 3600000)}h old): ${path.basename(sessionDir)}`);
        return null;
      }
    }
  } else {
    // No status.yaml -- use directory mtime as fallback staleness check.
    // Sessions without status.yaml were never properly initialized (pipeline
    // failed before writing status.yaml). Skip verification entirely since
    // there's nothing meaningful to verify.
    try {
      const stat = fs.statSync(sessionDir);
      const dirAge = Date.now() - stat.mtimeMs;
      console.error(`[VerifyCompletion] Session has no status.yaml (dir age: ${Math.round(dirAge / 60000)}min): ${path.basename(sessionDir)}`);
    } catch { /* ignore */ }
    console.error(`[VerifyCompletion] Skipping session without status.yaml: ${path.basename(sessionDir)}`);
    return null;
  }

  // VALIDATED→complete safety net: if the session is in VALIDATED state,
  // transition it to 'complete' before running verification checks.
  // This ensures the session is in a terminal state when checked.
  applyValidatedToCompleteTransition(sessionDir);

  // Auto-resolve fixable warnings before scoring.
  // Creates stub files for missing artifacts that would otherwise produce
  // warnings. This is a safety net — /run Step 4 should write these files.
  const autoResolved = autoResolveWarnings(sessionDir);

  const result = verifyCompletion(sessionDir);

  // Ensure pipeline_state is terminal so finalizeSessionLifecycle can run.
  // Many sessions (especially legacy org_* sessions) exit with pipeline_state still at "init"
  // because the agent didn't update status.yaml before stopping.
  try {
    const statusFile2 = path.join(sessionDir, 'status.yaml');
    const statusRaw = safeRead(statusFile2);
    if (statusRaw) {
      const curPipeline = extractYamlValue(statusRaw, 'pipeline_state');
      const curPhase = extractYamlValue(statusRaw, 'phase') || extractYamlValue(statusRaw, 'current_phase');
      const curVal = curPipeline || curPhase;
      if (!curVal || !isTerminalState(curVal)) {
        // REC-02 honesty: a NON-terminal session at Stop is finalized to
        // `complete` ONLY when it is genuinely validated (a real, non-safety-net
        // PASS report + — for plan-bearing sessions — a completed
        // coordination_log). Otherwise it is `incomplete` — NEVER laundered to
        // `complete`/`failed` by a zero-issues count. Genuinely-validated
        // sessions never reach here: applyValidatedToCompleteTransition() has
        // already stamped them `complete` (a terminal state), so the
        // `!isTerminalState(curVal)` guard above skips them.
        const finalState = sessionGenuinelyValidated(sessionDir, statusRaw) ? 'complete' : 'incomplete';
        const field = curPipeline !== undefined ? 'pipeline_state' : (curPhase !== undefined ? 'phase' : 'pipeline_state');
        const patched = statusRaw.replace(
          new RegExp(`(${field}:\\s*)\\S+`),
          `$1${finalState}`
        );
        if (patched !== statusRaw) {
          fs.writeFileSync(statusFile2, patched);
          console.error(`[VerifyCompletion] Updated ${field} to "${finalState}" in status.yaml`);
        }
      }
    }
  } catch (e) {
    console.error(`[VerifyCompletion] Error updating pipeline_state: ${e.message}`);
  }

  // Finalize agent lifecycle data (stopped_at, duration_ms) for terminal sessions
  finalizeSessionLifecycle(sessionDir);

  // C1 (advisory-first): WARN-only self-validation recheck. Runs AFTER the verdict
  // in `result` is already computed and does NOT feed back into it — the return
  // value is intentionally discarded. This keeps the hook's returned block/allow/
  // warn decision byte-identical while surfacing Check-2/Check-3 mismatches via
  // stderr + workflow/self_validation_recheck.yaml. Wrapped so it never throws.
  recheckSelfValidation(sessionDir);

  // REC-06 honesty gate: compute genuine-validation ONCE from the now-final
  // status.yaml (after applyValidatedToCompleteTransition + the force-terminal
  // patch have settled it) and reuse it for EVERY learning-capture site below.
  // A stall that a safety net laundered into a terminal state must never be
  // recorded as a success — no `successes:`, no `completion_status: completed`,
  // pass_fail: incomplete, genuinely_validated: false.
  const genuinelyValidated = sessionGenuinelyValidated(sessionDir, safeRead(statusFile));

  // PC-09: Plan-Scoped Learning Capture (V10.17.0)
  // Write learnings.yaml at session end to capture structured learnings
  try {
    const planFile = path.join(sessionDir, 'workflow', 'plan.yaml');
    const planContent = safeRead(planFile);
    const coordFile2 = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
    const coordContent2 = safeRead(coordFile2);

    const learnings = [];

    // Extract decisions from coordination log
    if (coordContent2) {
      // Look for patterns that indicate decisions or issues
      const synthesisMatch = coordContent2.match(/synthesized_solution:[\s\S]*?(?=\n[a-z_]+:|$)/);
      if (synthesisMatch) {
        learnings.push({
          type: 'decision',
          content: 'Synthesis approach captured in coordination_log.yaml',
          source: 'coordination_log'
        });
      }

      // Count revision rounds (indicates difficulty areas)
      const revisionCount = countPattern(coordContent2, /revision_round:/g);
      if (revisionCount > 0) {
        learnings.push({
          type: 'issue',
          content: `${revisionCount} revision round(s) needed - indicates areas of difficulty`,
          source: 'coordination_log'
        });
      }
    }

    // Check for failed items (things that didn't work)
    const failedItems = path.join(sessionDir, 'workflow', 'failed_items.yaml');
    if (fs.existsSync(failedItems)) {
      learnings.push({
        type: 'failure',
        content: 'Some work items failed - see workflow/failed_items.yaml',
        source: 'failed_items'
      });
    }

    // Extract domain and tier from plan
    let domain = 'unknown';
    let tier = 'unknown';
    if (planContent) {
      domain = extractYamlValue(planContent, 'domain') || extractYamlValue(planContent, 'super_domain') || 'unknown';
      tier = extractYamlValue(planContent, 'tier') || 'unknown';
    }

    if (learnings.length > 0 || planContent) {
      const learningsFile = path.join(sessionDir, 'learnings.yaml');
      const learningsContent = `# Session Learnings
# Auto-generated by verify-completion.cjs (V10.17.0)
generated_at: "${new Date().toISOString()}"
session_id: "${path.basename(sessionDir)}"
domain: "${domain}"
tier: "${tier}"
completion_status: "${genuinelyValidated ? 'completed' : 'incomplete'}"

learnings:
${learnings.map(l => `  - type: "${l.type}"
    content: "${l.content.replace(/"/g, '\\"')}"
    source: "${l.source}"`).join('\n')}

# Patterns discovered during execution
patterns:
  warnings_count: ${result.warnings.length}
  issues_count: ${result.issues.length}
${result.warnings.length > 0 ? `  warning_types:\n${result.warnings.map(w => `    - "${w.substring(0, 100).replace(/"/g, '\\"')}"`).join('\n')}` : '  warning_types: []'}
`;
      try { fs.writeFileSync(learningsFile, learningsContent); } catch {}
    }
  } catch (e) {
    console.error(`[VerifyCompletion] Learning capture error: ${e.message}`);
  }

  // LP-24: Learn-from-success emission (v12.7.x)
  // When validation_report.yaml verdict is PASS, write workflow/learnings.yaml
  // with a structured `successes:` list. This is symmetric to the failure
  // warnings collected above — successful patterns deserve the same
  // structured capture so future analytics can harvest them.
  //
  // CRITICAL: this block MUST NOT mutate coordination_log.yaml (P0-3
  // contract). It only reads coordination_log + validation_report and writes
  // a brand-new file at workflow/learnings.yaml.
  //
  // Schema:
  //   successes:
  //     - pattern: "<short label>"
  //       evidence_link: "<relative workflow file path>"
  //       session_id: "<basename>"
  try {
    const validationFileLP24 = path.join(sessionDir, 'workflow', 'validation_report.yaml');
    const valContentLP24 = safeRead(validationFileLP24);
    if (valContentLP24) {
      const verdictLP24 = extractYamlValue(valContentLP24, 'overall_status')
        || extractYamlValue(valContentLP24, 'status');
      // REC-06: only harvest `successes:` from a GENUINELY-validated session.
      // A hook-fabricated safety-net PASS reads `overall_status: PASS` too, so
      // the raw verdict alone is not enough — gate on the honesty discriminator
      // so a laundered stall writes NO success learning.
      if (verdictLP24 === 'PASS' && genuinelyValidated) {
        const sessionIdLP24 = path.basename(sessionDir);
        const successes = [];

        // Pattern 1: validation_report.yaml verdict PASS
        successes.push({
          pattern: 'validation_verdict_pass',
          evidence_link: 'workflow/validation_report.yaml',
        });

        // Pattern 2: self-validation present in coordination_log
        const coordLogForLP24 = safeRead(path.join(sessionDir, 'workflow', 'coordination_log.yaml'));
        if (coordLogForLP24) {
          if (coordLogForLP24.includes('self_validation')) {
            successes.push({
              pattern: 'self_validation_recorded',
              evidence_link: 'workflow/coordination_log.yaml',
            });
          }
          if (coordLogForLP24.includes('pre_execution') && coordLogForLP24.includes('mid_execution')) {
            successes.push({
              pattern: 'validation_checkpoints_complete',
              evidence_link: 'workflow/coordination_log.yaml',
            });
          }
          // Pattern 3: graceful-degradation marker recognized (depth-1 stripping)
          if (coordLogForLP24.includes('Agent/subagent-spawn tool was not available')) {
            successes.push({
              pattern: 'graceful_degradation_documented',
              evidence_link: 'workflow/coordination_log.yaml',
            });
          }
        }

        // Pattern 4: zero warnings (clean PASS)
        if (result.warnings.length === 0 && result.issues.length === 0) {
          successes.push({
            pattern: 'clean_completion_no_warnings',
            evidence_link: 'completion_summary.yaml',
          });
        }

        const successesYaml = successes
          .map((s) =>
            `  - pattern: "${s.pattern}"\n` +
            `    evidence_link: "${s.evidence_link}"\n` +
            `    session_id: "${sessionIdLP24}"`
          )
          .join('\n');

        const lp24LearningsPath = path.join(sessionDir, 'workflow', 'learnings.yaml');
        const lp24Content =
          `# Session Learnings (LP-24: learn from success)\n` +
          `# Auto-generated by verify-completion.cjs on validation PASS.\n` +
          `# Schema: successes: [{pattern, evidence_link, session_id}]\n` +
          `generated_at: "${new Date().toISOString()}"\n` +
          `session_id: "${sessionIdLP24}"\n` +
          `verdict: PASS\n` +
          `\n` +
          `successes:\n${successesYaml}\n`;

        try {
          ensureDir(path.dirname(lp24LearningsPath));
          fs.writeFileSync(lp24LearningsPath, lp24Content);
          console.error(`[VerifyCompletion] LP-24: wrote workflow/learnings.yaml with ${successes.length} success(es)`);
        } catch (lp24WriteErr) {
          console.error(`[VerifyCompletion] LP-24 write failed (non-fatal): ${lp24WriteErr.message}`);
        }
      }
    }
  } catch (lp24Err) {
    console.error(`[VerifyCompletion] LP-24 emission error (non-fatal): ${lp24Err.message}`);
  }

  // PC-10: Structured session outcome JSONL (V10.23.0)
  // Append a single JSON line per session to a rolling JSONL file for analytics.
  // Failures here must never break the verify-completion hook.
  try {
    const learningDir = path.join(AGENT_MEMORY_DIR, '_knowledge', 'learning');
    fs.mkdirSync(learningDir, { recursive: true });

    // Extract domain and tier from plan.yaml
    let outcomeDomain = 'unknown';
    let outcomeTier = 'unknown';
    try {
      const planForOutcome = safeRead(path.join(sessionDir, 'workflow', 'plan.yaml'));
      if (planForOutcome) {
        outcomeDomain = extractYamlValue(planForOutcome, 'domain') || extractYamlValue(planForOutcome, 'super_domain') || 'unknown';
        outcomeTier = extractYamlValue(planForOutcome, 'tier') || 'unknown';
      }
    } catch { /* plan read failed — use defaults */ }

    // Pipeline state from status.yaml
    const statusForOutcome = safeRead(path.join(sessionDir, 'status.yaml'));
    const outcomePipelineState = statusForOutcome
      ? (extractYamlValue(statusForOutcome, 'pipeline_state') || extractYamlValue(statusForOutcome, 'phase') || 'unknown')
      : 'unknown';

    // Duration: first entered_at in state_history to now
    let outcomeDurationMs = null;
    if (statusForOutcome) {
      const firstEnteredMatch = statusForOutcome.match(/entered_at:\s*"([^"]+)"/);
      if (firstEnteredMatch) {
        try {
          const startMs = new Date(firstEnteredMatch[1]).getTime();
          if (!isNaN(startMs) && startMs > 0) {
            outcomeDurationMs = Math.max(0, Date.now() - startMs);
          }
        } catch { /* timestamp parse failed */ }
      }
    }

    // Agent count from agent_tree.yaml. Entries are keyed `- id:` (the real
    // schema written by subagent-tracker.cjs — M-24 bug class; the previous
    // `agent_id:` regex never matched, so agent_count was ALWAYS 0). Same
    // parsing pattern as the team-stop.cjs M-24 fallback (v12.12.2).
    let outcomeAgentCount = 0;
    try {
      const atContent = safeRead(path.join(sessionDir, 'workflow', 'agent_tree.yaml'));
      if (atContent) {
        const agentMatches = atContent.match(/^\s*- id:/gm);
        outcomeAgentCount = agentMatches ? agentMatches.length : 0;
      }
    } catch { /* agent tree read failed */ }

    // Work item count from work_items.yaml
    let outcomeWorkItemCount = 0;
    try {
      const wiContent = safeRead(path.join(sessionDir, 'workflow', 'work_items.yaml'));
      if (wiContent) {
        const wiMatches = wiContent.match(/- id:/g) || wiContent.match(/- task_id:/g);
        outcomeWorkItemCount = wiMatches ? wiMatches.length : 0;
      }
    } catch { /* work items read failed */ }

    // Revision count: previously counted FAIL/REVISE files in workflow/events/,
    // a directory removed in v12.6.0 (see the post-write-validator.cjs events
    // note) — the reader was dead and always produced a fabricated 0. A
    // FAIL/REVISE revision count is not currently derivable from disk here, so
    // emit null (honestly "not tracked") rather than a fake 0.
    const outcomeRevisionCount = null;

    const outcome = {
      session_id: path.basename(sessionDir),
      domain: outcomeDomain,
      tier: outcomeTier,
      pipeline_state: outcomePipelineState,
      duration_ms: outcomeDurationMs,
      agent_count: outcomeAgentCount,
      work_item_count: outcomeWorkItemCount,
      // REC-06: three-way pass/fail/incomplete gated on genuine validation, plus
      // an explicit genuinely_validated flag for honest downstream filtering. A
      // non-genuine session (INIT/COORDINATED stall, or a fabricated safety-net
      // PASS) records `incomplete`, never a fake `pass`.
      pass_fail: genuinelyValidated ? (result.issues.length === 0 ? 'pass' : 'fail') : 'incomplete',
      genuinely_validated: genuinelyValidated,
      revision_count: outcomeRevisionCount,
      warning_count: result.warnings.length,
      issue_count: result.issues.length,
      timestamp: new Date().toISOString()
    };

    const jsonlPath = path.join(learningDir, 'session_outcomes.jsonl');
    fs.appendFileSync(jsonlPath, JSON.stringify(outcome) + '\n');
    console.error(`[VerifyCompletion] Session outcome appended to ${path.relative(PROJECT_ROOT, jsonlPath)}`);

    // REC-16 (v12.51.0): structured per-session lifecycle events for the Stop
    // gate. `outcome` records the terminal roll-up beside session_outcomes.jsonl;
    // `gate` records this Stop hook's block/allow decision. Both are emitted here
    // where the outcome-scope vars are live (outcomePipelineState / *AgentCount /
    // *WorkItemCount). Fail-open + lock-protected + session-scoped.
    appendSessionEvent(sessionDir, {
      type: 'outcome',
      pass_fail: outcome.pass_fail,
      work_item_count: outcomeWorkItemCount,
      agent_count: outcomeAgentCount
    });
    appendSessionEvent(sessionDir, {
      type: 'gate',
      decision: result.issues.length > 0 ? 'block' : 'pass',
      pipeline_state: outcomePipelineState,
      issues: result.issues.length,
      warnings: result.warnings.length
    });
  } catch (e) {
    console.error(`[VerifyCompletion] Session outcome JSONL error (non-fatal): ${e.message}`);
  }

  // PC-08: Always write completion_summary.yaml with status field
  // Status: completed (no issues), failed (issues found), interrupted (other)
  ensureDir(sessionDir);
  const summaryFile = path.join(sessionDir, 'completion_summary.yaml');
  const timestamp = new Date().toISOString();
  const completionStatus = result.issues.length === 0 ? 'completed' : 'failed';
  const content = `# Completion Summary
generated_at: "${timestamp}"
verified_by: verify-completion-hook
status: ${completionStatus}

verification_result:
  passed: ${result.issues.length === 0}
  issues_count: ${result.issues.length}
  warnings_count: ${result.warnings.length}

${result.issues.length > 0 ? `issues:\n${result.issues.map(i => `  - "${i}"`).join('\n')}` : 'issues: []'}

${result.warnings.length > 0 ? `warnings:\n${result.warnings.map(w => `  - "${w}"`).join('\n')}` : 'warnings: []'}
`;
  try { fs.writeFileSync(summaryFile, content); } catch {}

  // REC-11 (P-5): revision-cycle cap enforcement.
  // When the persisted revision_cycles counter (status.yaml) has reached
  // max_cycles (pipeline_config.yaml revision.max_cycles, default 3), the
  // pipeline has exhausted its revision budget. Blocking the session here would
  // force /run to route back to PLANNED and re-plan AGAIN — the "re-plan forever"
  // defect. Instead FINALIZE honestly: the force-terminal patch above has already
  // stamped a non-genuine session `incomplete` (never a fabricated PASS/complete —
  // respecting the REC-02 honesty gate), so allow the stop and surface a
  // user-facing escalation (pipeline_config.yaml revision.escalation: user_hitl).
  // A genuinely-validated session never reaches the cap carrying issues (it
  // PASSED and produced 0 issues), so this override only fires on a real
  // budget-exhausted stall.
  const revisionCycles = getRevisionCycles(statusContent);
  const maxCycles = getMaxRevisionCycles();
  if (result.issues.length > 0 && revisionCycles >= maxCycles) {
    console.error(
      `[VerifyCompletion] Revision cap reached (${revisionCycles}/${maxCycles}) — FINALIZING as incomplete + escalating to user, NOT blocking into another re-plan cycle: ${path.basename(sessionDir)}`
    );
    return {
      continue: true,
      systemMessage:
        `cAgents pipeline exhausted its revision budget (${revisionCycles}/${maxCycles} cycles) without a genuine validation PASS. ` +
        `Per pipeline_config.yaml revision.escalation: user_hitl, the session is FINALIZED as INCOMPLETE and escalated to you — ` +
        `it is NOT re-planned again (max_revision_cycles reached). Unresolved: ${result.issues.join('; ')}. ` +
        `See ${path.relative(PROJECT_ROOT, summaryFile)}. Resume with \`/run --resume ${path.basename(sessionDir)}\` after addressing the blockers.`
    };
  }

  if (result.issues.length > 0) {
    console.error(`[VerifyCompletion] ISSUES: ${result.issues.join('; ')}`);
    return {
      decision: 'block',
      reason: `cAgents completion verification found issues:\n${result.issues.join('\n')}\n\nSee ${path.relative(PROJECT_ROOT, summaryFile)} for details. Please address these before stopping.`
    };
  }

  if (result.warnings.length > 0) {
    console.error(`[VerifyCompletion] WARNINGS: ${result.warnings.join('; ')}`);
    return {
      continue: true,
      systemMessage: `cAgents workflow stopping with ${result.warnings.length} warning(s). See ${path.relative(PROJECT_ROOT, summaryFile)} for details.`
    };
  }

  console.error('[VerifyCompletion] All completion criteria verified');

  // Four Questions hallucination self-check + task cleanup reminder
  // These questions force the agent to verify its own claims before stopping,
  // catching hallucinated completions and fabricated evidence.
  const fourQuestions = [
    'SELF-CHECK before stopping:',
    '1. Did I ACTUALLY make every change I claim, or did I only plan/describe them?',
    '2. Did I verify my changes work (ran tests, checked syntax), or am I assuming they do?',
    '3. Are the file paths and evidence I cited real things I observed, or did I fabricate them?',
    '4. Is there any task I said I would do but quietly skipped or deferred?',
    '',
    'If any answer reveals a gap, address it before stopping.',
    'Also: call TaskList and mark all your in_progress/pending tasks as completed or deleted via TaskUpdate.'
  ].join('\n');

  return {
    continue: true,
    systemMessage: fourQuestions
  };
});
