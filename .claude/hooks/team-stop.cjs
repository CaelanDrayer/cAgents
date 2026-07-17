#!/usr/bin/env node
/**
 * Session Stop Hook - Cleanup agent trees for ALL session types + team metrics
 * cAgents V10.24.3 - Extended from team-only to all session types
 *
 * Runs on SessionEnd to:
 * 1. Clean up agent_tree.yaml for ANY active session (run_*, team_*, org_*, designer_*, etc.)
 *    by marking unstopped agents with stopped_at timestamps and computing durations.
 * 2. Finalize team-specific metrics and update status (team_* sessions only).
 *
 * NOTE: SessionEnd hooks have configurable timeout via CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS.
 * All writeFileSync calls are individually try-catch guarded for resilience
 * against partial failures or context truncation.
 *
 * Input (stdin): JSON with session context
 * Output (stdout): JSON with system message
 */

// -----------------------------------------------------------------------------
// TEAM-COORDINATION SCOPE NOTE (v12.42.0). Teams are IMPLICIT since Claude Code
// 2.1.178 (TeamCreate/TeamDelete were removed). This hook's TEAM-TEAMMATE
// COORDINATION handling — the per-teammate timing/parallelism metrics and team
// status finalization (Phase 3, team_* sessions only) — supports the OPTIONAL
// experimental named-background-teammate path (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1)
// and is a NO-OP on the DEFAULT concurrent-Agent wave model, which uses no named
// teammates.
//
// IMPORTANT — do NOT treat the whole hook as a no-op: the remaining phases are a
// UNIVERSAL SessionEnd routine that runs for EVERY session type (run_*, team_*,
// designer_*, etc.) and the default path DOES depend on them — Phase 1 agent-tree
// cleanup, Phase 2 execution_summary.yaml generation, Phase 4 pattern-extractor
// throttle, and Phase 5 SDK-UUID pointer unlink. Those must keep running on the
// default path; only Phase 3's team-teammate metrics are experimental-path-scoped.
// No behavior is changed by this note.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
// Defensive: js-yaml is a declared dependency but guard against missing install
let yaml;
try { yaml = require('js-yaml'); } catch { yaml = null; }
const { createHook, findTeamSession, findActiveSession, safeRead, extractYamlValue, countPattern, withFileLock, ensureDir, AGENT_MEMORY_DIR, removeSdkPointer, sessionGenuinelyValidated } = require('./hook-utils.cjs');

// Defensive: REC-01 terminal-state normalizer (v12.46.0). Guarded in the same
// try/catch style as the js-yaml require above so an older hook-utils.cjs without
// these exports can't crash teardown. Consumed only to keep team-stop's inline
// terminal vocabulary consistent (Phase 2 owns the actual status-default derivation).
let _normalizeTerminalState;
try { ({ normalizeTerminalState: _normalizeTerminalState } = require('./hook-utils.cjs')); } catch { _normalizeTerminalState = null; }
const _normTerminal = (s) => (typeof _normalizeTerminalState === 'function' ? _normalizeTerminalState(s) : (typeof s === 'string' ? s.trim() : s));

// SDK transcript UUID shape (8-4-4-4-12 hex). Matches the per-session
// {sessionDir}/session.sdk_id marker written by the map-writer hooks (WI-3/WI-4).
const SDK_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// =============================================================================
// P1-4: Pattern Extractor Runtime Wiring (24h throttle)
// =============================================================================

/**
 * Resolve the cagents-memory root, honoring CAGENTS_TEST_ROOT for sandboxed tests.
 * Production path is repo-root/cagents-memory; this file lives at
 * .claude/hooks/team-stop.cjs so repo-root = ../../..
 */
function resolveMemoryRoot() {
  if (process.env.CAGENTS_TEST_ROOT) {
    return path.join(process.env.CAGENTS_TEST_ROOT, 'cagents-memory');
  }
  return path.join(__dirname, '..', '..', 'cagents-memory');
}

/**
 * Resolve the pattern-extractor.cjs path. CAGENTS_PATTERN_EXTRACTOR_OVERRIDE
 * is honored so tests can swap in a stub script.
 */
function resolveExtractorPath() {
  if (process.env.CAGENTS_PATTERN_EXTRACTOR_OVERRIDE) {
    return process.env.CAGENTS_PATTERN_EXTRACTOR_OVERRIDE;
  }
  return path.join(__dirname, '..', '..', 'scripts', 'knowledge', 'pattern-extractor.cjs');
}

const SENTINEL_THROTTLE_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Conditionally spawn pattern-extractor.cjs after team metrics finalize.
 *
 * Throttle: if `_knowledge/patterns/.last-extracted` was touched <24h ago,
 * skip and log "throttled". Otherwise spawn the extractor detached/unref'd
 * (fire-and-forget — never blocks team-stop) and touch the sentinel.
 *
 * Errors are swallowed — team-stop must never fail because of extraction.
 *
 * @returns {string} Status string for systemMessage: 'invoked', 'throttled',
 *   'no-extractor', or 'error: <msg>'
 */
function maybeExtractPatterns() {
  try {
    const memoryRoot = resolveMemoryRoot();
    const patternsDir = path.join(memoryRoot, '_knowledge', 'patterns');
    const sentinelPath = path.join(patternsDir, '.last-extracted');
    const extractorPath = resolveExtractorPath();

    // Check extractor exists (precondition)
    if (!fs.existsSync(extractorPath)) {
      console.error(`[SessionStop] pattern-extractor not found at ${extractorPath} — skipping`);
      return 'no-extractor';
    }

    // Sentinel throttle: skip if <24h old
    if (fs.existsSync(sentinelPath)) {
      try {
        const mtimeMs = fs.statSync(sentinelPath).mtimeMs;
        const ageMs = Date.now() - mtimeMs;
        if (ageMs < SENTINEL_THROTTLE_MS) {
          const hoursAgo = (ageMs / 3600000).toFixed(1);
          console.error(`[SessionStop] pattern-extractor throttled (last run ${hoursAgo}h ago, <24h)`);
          return 'throttled';
        }
      } catch (e) {
        console.error(`[SessionStop] sentinel stat failed: ${e.message} — proceeding with extraction`);
      }
    }

    // Ensure patterns dir exists before sentinel write
    try {
      ensureDir(patternsDir);
    } catch (e) {
      console.error(`[SessionStop] failed to ensure patterns dir: ${e.message}`);
    }

    // Spawn extractor detached + unref'd — fire-and-forget
    try {
      const child = spawn('node', [extractorPath, 'extract', '--save'], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      // Touch sentinel immediately so concurrent team-stops don't double-fire
      fs.writeFileSync(sentinelPath, new Date().toISOString() + '\n');
      console.error(`[SessionStop] pattern-extractor spawned (pid=${child.pid})`);
      return 'invoked';
    } catch (e) {
      console.error(`[SessionStop] pattern-extractor spawn failed: ${e.message}`);
      return `error: ${e.message}`;
    }
  } catch (e) {
    // Outer catch — never let extraction failures propagate
    console.error(`[SessionStop] maybeExtractPatterns outer error: ${e.message}`);
    return `error: ${e.message}`;
  }
}

/**
 * Clean up agent_tree.yaml: mark all unstopped agents with stopped_at,
 * compute duration_seconds from spawned_at, and set a cleanup summary.
 * Uses js-yaml for proper YAML parsing instead of regex replacement.
 *
 * @param {string} sessionDir - Session directory path
 * @param {string} now - ISO timestamp for stopped_at
 * @returns {number} Number of agents cleaned up
 */
function cleanupAgentTree(sessionDir, now) {
  const treeFile = path.join(sessionDir, 'workflow', 'agent_tree.yaml');
  const treeContent = safeRead(treeFile);
  if (!treeContent) return 0;

  // Quick check: if no unstopped agents, skip parsing
  if (!treeContent.includes('stopped_at: null')) return 0;

  let cleanedCount = 0;

  withFileLock(treeFile, () => {
    // Re-read inside lock to avoid TOCTOU race
    const lockedContent = safeRead(treeFile);
    if (!lockedContent || !lockedContent.includes('stopped_at: null')) return;

    let parsed;
    try {
      if (!yaml) throw new Error('js-yaml not available');
      parsed = yaml.load(lockedContent);
    } catch (parseErr) {
      console.error(`[SessionStop] Malformed agent_tree.yaml or js-yaml unavailable — falling back to regex cleanup: ${parseErr.message}`);
      // Fallback: regex replacement (original M-07 behavior)
      const cleaned = lockedContent.replace(/stopped_at: null/g, `stopped_at: "${now}"`);
      try { fs.writeFileSync(treeFile, cleaned); } catch (e) {
        console.error(`[SessionStop] Failed regex fallback write: ${e.message}`);
      }
      return;
    }

    if (!parsed || !Array.isArray(parsed.agents)) return;

    const nowMs = new Date(now).getTime();

    for (const agent of parsed.agents) {
      if (agent.stopped_at === null || agent.stopped_at === undefined) {
        agent.stopped_at = now;
        agent.completion_summary = 'Session ended — stop event cleanup';

        // Compute duration from spawned_at if available
        if (agent.spawned_at) {
          const spawnedMs = new Date(agent.spawned_at).getTime();
          if (!isNaN(spawnedMs) && spawnedMs > 0) {
            agent.duration_seconds = Math.max(0, Math.round((nowMs - spawnedMs) / 1000));
          }
        }

        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      try {
        fs.writeFileSync(treeFile, yaml.dump(parsed));
      } catch (e) {
        console.error(`[SessionStop] Failed to write cleaned agent_tree: ${e.message}`);
      }
    }
  });

  return cleanedCount;
}

/**
 * Generate a minimal execution_summary.yaml from status.yaml + agent_tree.yaml
 * if one does not already exist. Works for all session types.
 *
 * @param {string} sessionDir - Session directory path
 * @param {string} now - ISO timestamp
 */
function generateExecutionSummary(sessionDir, now) {
  const summaryPath = path.join(sessionDir, 'workflow', 'execution_summary.yaml');
  // Don't overwrite skill-generated summaries
  if (fs.existsSync(summaryPath)) return;

  const statusContent = safeRead(path.join(sessionDir, 'status.yaml'));
  if (!statusContent) return;

  // Extract fields from status.yaml
  const sessionId = extractYamlValue(statusContent, 'session_id') || path.basename(sessionDir);
  const pipelineState = extractYamlValue(statusContent, 'pipeline_state');
  const phase = extractYamlValue(statusContent, 'phase');
  const finalState = pipelineState || phase || 'unknown';
  const createdAt = extractYamlValue(statusContent, 'created_at');
  const result = extractYamlValue(statusContent, 'result');

  // Determine status string.
  // REC-03 honesty (v12.47.0): the default is NOT an unconditional `completed`.
  // A 0-agent / mid-flight stall (e.g. an INIT session that never spawned the
  // orchestrator) previously defaulted to `completed`, laundering a stall into a
  // success. Now only a GENUINELY-validated session (a real, non-safety-net PASS
  // report + — for plan-bearing sessions — a completed coordination_log) is
  // `completed`; everything else is `incomplete`. Explicit `failed`/`partial`
  // signals from status.yaml still win first. Shares the exact honesty
  // discriminator with verify-completion.cjs (single source of truth in
  // hook-utils.cjs) so the two hooks can never disagree.
  let status;
  if (result === 'failed' || _normTerminal(finalState) === 'failed') {
    status = 'failed';
  } else if (result === 'partial') {
    status = 'partial';
  } else if (sessionGenuinelyValidated(sessionDir, statusContent)) {
    status = 'completed';
  } else {
    status = 'incomplete';
  }

  // Count agents from agent_tree.yaml.
  // Fix M-24 (audit team_hooks-review_260602_001): subagent-tracker.cjs writes
  // entries as `- id:` (not `- agent_id:`), so the previous regex always returned 0.
  // Preferred fix is yaml.load (eliminates a class of regex-fragility bugs);
  // falls back to a corrected `- id:` regex if yaml is unavailable.
  let agentCount = 0;
  const treeContent = safeRead(path.join(sessionDir, 'workflow', 'agent_tree.yaml'));
  if (treeContent) {
    try {
      if (yaml) {
        const parsedTree = yaml.load(treeContent);
        if (parsedTree && Array.isArray(parsedTree.agents)) {
          agentCount = parsedTree.agents.length;
        }
      } else {
        throw new Error('js-yaml not available');
      }
    } catch (_e) {
      // Fallback regex matches the actual key written by subagent-tracker.cjs
      const matches = treeContent.match(/^\s*- id:/gm);
      agentCount = matches ? matches.length : 0;
    }
  }

  // Compute duration
  let durationSeconds = 0;
  if (createdAt) {
    const startMs = new Date(createdAt).getTime();
    if (!isNaN(startMs) && startMs > 0) {
      durationSeconds = Math.max(0, Math.round((Date.now() - startMs) / 1000));
    }
  }

  const summaryYaml = [
    `session_id: "${sessionId}"`,
    `final_state: ${finalState}`,
    `status: ${status}`,
    `agent_count: ${agentCount}`,
    `duration_seconds: ${durationSeconds}`,
    `started_at: "${createdAt || now}"`,
    `completed_at: "${now}"`,
    `generated_by: session-stop-hook`,
  ].join('\n') + '\n';

  try {
    ensureDir(path.join(sessionDir, 'workflow'));
    fs.writeFileSync(summaryPath, summaryYaml);
    console.error(`[SessionStop] Generated execution_summary.yaml for ${path.basename(sessionDir)}`);
  } catch (e) {
    console.error(`[SessionStop] Failed to write execution_summary.yaml: ${e.message}`);
  }
}

/**
 * WI-5 (reaping / GC): explicit unlink of the finishing session's own
 * SDK-UUID -> session pointer at finalization.
 *
 * Reads the per-session marker {sessionDir}/session.sdk_id (written best-effort
 * by the map-writer hooks/skills). If it holds an SDK-UUID-shaped value, unlink
 * that UUID's global pointer under cagents-memory/_system/sdk_session_map/ via
 * removeSdkPointer() so the registry does not retain a dead pointer once this
 * session ends. The per-session marker itself self-cleans with the session
 * directory, so it is intentionally left in place.
 *
 * Fail-open contract: this NEVER throws and NEVER blocks teardown. Every file op
 * is individually try/catch-guarded, so a mid-run SessionEnd cancellation (Claude
 * Code teardown) cannot corrupt state — worst case the pointer is reaped later by
 * the lazy-reap path inside resolveSdkUuidToSession.
 *
 * @param {string} sessionDir - The finishing session's directory, already
 *   resolved by team-stop for its own finalization. NOT a newest-session guess.
 */
function reapSdkPointer(sessionDir) {
  try {
    if (!sessionDir) return;
    const markerPath = path.join(sessionDir, 'session.sdk_id');
    let uuid;
    try {
      uuid = fs.readFileSync(markerPath, 'utf8').trim();
    } catch {
      return; // no marker (or unreadable) — nothing to reap
    }
    if (!SDK_UUID_RE.test(uuid)) return; // not an SDK UUID — no-op
    // removeSdkPointer is itself SDK_UUID_RE-guarded, idempotent, lock-protected,
    // and never throws.
    removeSdkPointer(uuid);
    console.error(`[SessionStop] Reaped SDK pointer for ${path.basename(sessionDir)} (${uuid})`);
  } catch (e) {
    // Fail-open: teardown must never fail because pointer reaping did.
    try { console.error(`[SessionStop] SDK pointer reap skipped: ${e.message}`); } catch { /* ignore */ }
  }
}

createHook('SessionEnd', async (input) => {
  const now = new Date().toISOString();
  let summary = '';

  // --- Phase 1: Agent tree cleanup for ANY session type ---
  // SessionEnd legitimately operates on terminal sessions (finalizing). Resolve
  // session strictly from input.session_id when present (bypassing the
  // non-terminal-only filter in findActiveSession's deterministic chain).
  // Falls back to findActiveSession({fallbackHeuristic:true}) when no hint —
  // SessionEnd does need to find SOME session to finalize.
  let anySession = null;
  if (input.session_id) {
    const direct = path.join(AGENT_MEMORY_DIR, 'sessions', input.session_id);
    if (fs.existsSync(direct)) {
      anySession = direct;
    }
  }
  if (!anySession) {
    anySession = findActiveSession({ fallbackHeuristic: true });
  }
  let agentTreeSessionDir = null;

  if (anySession) {
    agentTreeSessionDir = anySession;
    const cleanedCount = cleanupAgentTree(anySession, now);
    if (cleanedCount > 0) {
      console.error(`[SessionStop] Cleaned ${cleanedCount} unstopped agent(s) in ${path.basename(anySession)}`);
      summary += `Agent tree cleanup: ${cleanedCount} agent(s) marked stopped in ${path.basename(anySession)}\n`;
    }
  }

  // --- Phase 1b: Generate execution_summary.yaml if missing (ALL session types) ---
  if (anySession) {
    generateExecutionSummary(anySession, now);
  }

  // --- Phase 1c: WI-5 reaping — unlink this finishing session's own SDK pointer ---
  // Explicit unlink at finalization so the sdk_session_map/ registry does not
  // retain a dead pointer. Reuses the sessionDir team-stop already resolved for
  // its own finalization (no newest-session heuristic). Fail-open — never blocks
  // teardown. Runs for ALL session types (run_/team_/designer_), since the
  // pointer is created for any of them.
  if (anySession) {
    reapSdkPointer(anySession);
  }

  // --- Phase 2: Team-specific metrics and status (team_* sessions only) ---
  const teamSessionDir = findTeamSession(input);
  if (!teamSessionDir) {
    // No team session — return agent tree cleanup summary if any
    if (summary) {
      return { continue: true, systemMessage: summary };
    }
    return null;
  }

  // If team session differs from the session already cleaned, also clean its agent tree
  if (teamSessionDir !== agentTreeSessionDir) {
    const teamCleaned = cleanupAgentTree(teamSessionDir, now);
    if (teamCleaned > 0) {
      console.error(`[SessionStop] Cleaned ${teamCleaned} unstopped agent(s) in team session ${path.basename(teamSessionDir)}`);
    }
  }

  const metricsDir = path.join(teamSessionDir, 'team', 'metrics');

  // Calculate metrics
  const metrics = { items_completed: 0, items_total: 0, duration_seconds: 0, speedup_factor: 0 };

  const taskContent = safeRead(path.join(teamSessionDir, 'team', 'task_list.yaml'));
  if (taskContent) {
    const completedMatch = taskContent.match(/completed:\s*(\d+)/);
    const totalMatch = taskContent.match(/total:\s*(\d+)/);
    if (completedMatch) metrics.items_completed = parseInt(completedMatch[1], 10);
    if (totalMatch) metrics.items_total = parseInt(totalMatch[1], 10);
  }

  // Finalize timing
  const timingFile = path.join(metricsDir, 'timing.yaml');
  const timingContent = safeRead(timingFile);
  if (timingContent) {
    const startMatch = timingContent.match(/started_at:\s*"([^"]+)"/);
    if (startMatch) {
      const startMs = new Date(startMatch[1]).getTime();
      // Guard against NaN/negative: only compute if startMs is a valid timestamp
      if (!isNaN(startMs) && startMs > 0) {
        const elapsed = Math.round((Date.now() - startMs) / 1000);
        metrics.duration_seconds = elapsed >= 0 ? elapsed : 0;
      }
    }
    // Validate structure before overwriting: apply defaults for missing fields
    let updated = timingContent;
    if (!updated.includes('completed_at:')) {
      updated += `\ncompleted_at: "${now}"`;
    } else {
      updated = updated.replace(/completed_at:\s*null/, `completed_at: "${now}"`);
    }
    if (!updated.includes('total_duration_seconds:')) {
      updated += `\ntotal_duration_seconds: ${metrics.duration_seconds}`;
    } else {
      updated = updated.replace(/total_duration_seconds:\s*\d+/, `total_duration_seconds: ${metrics.duration_seconds}`);
    }
    try { fs.writeFileSync(timingFile, updated); } catch (e) {
      console.error(`[SessionStop] Failed to write timing: ${e.message}`);
    }
  }

  // Get speedup factor
  const parallelismContent = safeRead(path.join(metricsDir, 'parallelism.yaml'));
  if (parallelismContent) {
    const speedupMatch = parallelismContent.match(/speedup_factor:\s*([\d.]+)/);
    if (speedupMatch) metrics.speedup_factor = parseFloat(speedupMatch[1]);
  }

  // Update status
  const statusFile = path.join(teamSessionDir, 'status.yaml');
  let statusContent = safeRead(statusFile);
  if (statusContent) {
    const success = metrics.items_total > 0 ? (metrics.items_completed === metrics.items_total) : true;
    statusContent = statusContent
      .replace(/^phase:\s*\w+/m, 'phase: completed')
      .replace(/^pipeline_state:\s*\S+/m, 'pipeline_state: VALIDATED')
      .replace(/completed_at:\s*null/, `completed_at: "${now}"`)
      .replace(/result:\s*null/, `result: ${success ? 'success' : 'partial'}`);
    try { fs.writeFileSync(statusFile, statusContent); } catch (e) {
      console.error(`[SessionStop] Failed to write status: ${e.message}`);
    }
  }

  console.error(`[SessionStop] Finalized ${path.basename(teamSessionDir)}: ${metrics.items_completed}/${metrics.items_total}`);

  summary += `## Team Session Complete: ${path.basename(teamSessionDir)}\n\n`;
  summary += `**Work Items**: ${metrics.items_completed}/${metrics.items_total} completed\n`;
  summary += `**Duration**: ${metrics.duration_seconds} seconds\n`;
  if (metrics.speedup_factor > 1) {
    summary += `**Speedup**: ${metrics.speedup_factor.toFixed(1)}x faster than sequential\n`;
  }

  // --- Phase 3: P1-4 pattern extraction (24h throttle, fire-and-forget) ---
  const extractionStatus = maybeExtractPatterns();
  if (extractionStatus === 'invoked') {
    summary += `**Pattern extraction**: spawned (background)\n`;
  } else if (extractionStatus === 'throttled') {
    summary += `**Pattern extraction**: throttled (last run <24h ago)\n`;
  }

  return { continue: true, systemMessage: summary };
});
