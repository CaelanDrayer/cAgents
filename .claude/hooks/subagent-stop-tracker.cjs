#!/usr/bin/env node
/**
 * Subagent Stop Tracker Hook - Log when subagents finish
 * cAgents V10.24.2 - YAML-aware agent tree updates (fixes 69.2% orphan rate)
 *
 * Runs on SubagentStop to record agent completion in agent_tree.yaml
 * and the global audit log. This completes the audit trail started
 * by subagent-tracker.cjs (SubagentStart).
 *
 * FIX: Uses js-yaml parse/dump (matching subagent-tracker.cjs) instead of
 * string/regex matching which failed because yaml.dump() produces unquoted
 * values (id: abc123) but the old code searched for double-quoted values
 * (id: "abc123"), causing stopped_at/completion_summary/duration_seconds
 * to never be written.
 *
 * Input (stdin): JSON with agent_type, agent_id from SubagentStop event
 * Output (stdout): JSON with continue status
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
// GAP-4 fix: import findMostRecentSessionDir from hook-utils.cjs (shared with subagent-tracker.cjs).
// This ensures start and stop events use identical session discovery logic,
// including env-var fast path (Pass 0) and nested org subdir scanning.
const { createHook, findActiveSession, findMostRecentSessionDir, safeRead, ensureDir, withFileLock, AGENT_MEMORY_DIR } = require('./hook-utils.cjs');

/**
 * Build a structured completion_summary object from the last assistant message.
 * PC-12: outcome, key_decisions, and detail fields.
 */
function buildCompletionSummary(lastMessage) {
  if (!lastMessage) return null;
  const firstSentence = lastMessage.split(/[.!?\n]/)[0].trim().slice(0, 100);
  const outcome = firstSentence || 'Completed';
  const decisionLines = lastMessage.split('\n')
    .filter(l => /^\s*[-*\d]/.test(l))
    .map(l => l.replace(/^\s*[-*\d.]+\s*/, '').trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 3);
  return {
    outcome,
    key_decisions: decisionLines.length > 0 ? decisionLines : [],
    detail: lastMessage.slice(0, 300)
  };
}

createHook('SubagentStopTracker', async (input) => {
  const subagentType = input.agent_type || 'unknown';
  const agentId = input.agent_id || 'unknown';
  const now = new Date().toISOString();

  // Capture last assistant message summary for auditability (truncated to 500 chars)
  const lastMessage = (input.last_assistant_message || '').slice(0, 500).replace(/\n/g, ' ').trim();

  // Append to global audit log (includes summary)
  try {
    const logsDir = ensureDir(path.join(AGENT_MEMORY_DIR, '_system', 'logs'));
    const logFile = path.join(logsDir, 'agent_spawns.log');
    const summaryPart = lastMessage ? ` | summary=${lastMessage.slice(0, 200)}` : '';
    fs.appendFileSync(logFile, `${now} | agent_id=${agentId} | type=${subagentType} | event=stop | session=${input.session_id || 'unknown'}${summaryPart}\n`);
  } catch (err) {
    console.error(`[SubagentStopTracker] Failed to write audit log: ${err.message}`);
  }

  // Find session to update agent_tree.yaml
  let sessionDir = findActiveSession(input.session_id);
  if (!sessionDir) {
    sessionDir = findMostRecentSessionDir();
  }

  if (!sessionDir) {
    console.error(`[SubagentStopTracker] No session found for agent ${agentId} stop event`);
    return null;
  }

  const treeFile = path.join(sessionDir, 'workflow', 'agent_tree.yaml');

  // Lock the tree file for the entire read-modify-write cycle to prevent
  // race conditions when multiple agents stop concurrently.
  withFileLock(treeFile, () => {
    const existingContent = safeRead(treeFile);

    if (!existingContent) {
      console.error(`[SubagentStopTracker] agent_tree.yaml not found or empty for agent ${agentId}, logging stop event only`);
      return;
    }

    // Parse YAML using js-yaml (matches subagent-tracker.cjs which writes via yaml.dump).
    // This fixes the YAML matching bug: subagent-tracker writes unquoted values (e.g., id: abc123)
    // but the old code searched for double-quoted values (e.g., id: "abc123"), always failing.
    // js-yaml.load() handles both quoted and unquoted formats, providing backward compatibility.
    let parsedObj;
    try {
      parsedObj = yaml.load(existingContent);
    } catch (parseErr) {
      console.error(`[SubagentStopTracker] Malformed agent_tree.yaml — cannot update: ${parseErr.message}`);
      return;
    }

    if (!parsedObj || !Array.isArray(parsedObj.agents)) {
      console.error(`[SubagentStopTracker] agent_tree.yaml missing agents array for agent ${agentId}, logging stop event only`);
      return;
    }

    // Find the matching agent entry by id (works for both quoted and unquoted YAML formats)
    const agentEntry = parsedObj.agents.find(a => a.id === agentId);

    if (!agentEntry) {
      console.error(`[SubagentStopTracker] Agent ${agentId} not found in agent_tree.yaml, logging stop event only`);
      return;
    }

    // Already has a stopped_at? Skip to avoid double-recording.
    if (agentEntry.stopped_at && agentEntry.stopped_at !== null) {
      console.error(`[SubagentStopTracker] Agent ${agentId} already has stopped_at, skipping`);
      return;
    }

    // Update the agent entry fields
    agentEntry.stopped_at = now;

    // PC-12: Structured completion_summary
    const summary = buildCompletionSummary(lastMessage);
    if (summary) {
      agentEntry.completion_summary = summary;
    }

    // Calculate duration from spawned_at if available
    if (agentEntry.spawned_at) {
      const spawnedAt = new Date(agentEntry.spawned_at);
      const stoppedAt = new Date(now);
      const durationMs = stoppedAt - spawnedAt;
      if (!isNaN(durationMs) && durationMs >= 0) {
        agentEntry.duration_seconds = Math.round(durationMs / 1000);
      }
    }

    // Write back using yaml.dump (consistent with subagent-tracker.cjs)
    fs.writeFileSync(treeFile, yaml.dump(parsedObj));
    console.error(`[SubagentStopTracker] Agent ${agentId} (${subagentType}) stopped`);
  });

  // --- Agent performance JSONL logging ---
  try {
    const knowledgeDir = path.join(AGENT_MEMORY_DIR, '_knowledge', 'learning');
    fs.mkdirSync(knowledgeDir, { recursive: true });

    // Read agent_tree to extract duration and cagents_type for this agent (using YAML parser)
    let durationSeconds = null;
    let cagentsType = null;
    if (sessionDir) {
      const treeContent = safeRead(path.join(sessionDir, 'workflow', 'agent_tree.yaml'));
      if (treeContent) {
        try {
          const treeObj = yaml.load(treeContent);
          if (treeObj && Array.isArray(treeObj.agents)) {
            const entry = treeObj.agents.find(a => a.id === agentId);
            if (entry) {
              if (typeof entry.duration_seconds === 'number') durationSeconds = entry.duration_seconds;
              if (entry.cagents_type) cagentsType = String(entry.cagents_type).trim();
            }
          }
        } catch {
          // Fallback: if YAML parse fails for perf logging, just skip — non-fatal
        }
      }
    }

    const sessionName = sessionDir ? path.basename(sessionDir) : (input.session_id || 'unknown');
    const perfEntry = {
      agent_type: subagentType,
      cagents_type: cagentsType || null,
      duration_seconds: durationSeconds,
      session_id: sessionName,
      completion_summary: (lastMessage || '').slice(0, 200),
      timestamp: now
    };

    const perfFile = path.join(knowledgeDir, 'agent_performance.jsonl');
    fs.appendFileSync(perfFile, JSON.stringify(perfEntry) + '\n');
  } catch (err) {
    console.error(`[SubagentStopTracker] Performance logging failed (non-fatal): ${err.message}`);
  }

  return null;
});
