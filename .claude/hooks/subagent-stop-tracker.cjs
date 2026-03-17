#!/usr/bin/env node
/**
 * Subagent Stop Tracker Hook - Log when subagents finish
 * cAgents V9.16 - New hook for agent audit trail
 *
 * Runs on SubagentStop to record agent completion in agent_tree.yaml
 * and the global audit log. This completes the audit trail started
 * by subagent-tracker.cjs (SubagentStart).
 *
 * Input (stdin): JSON with agent_type, agent_id from SubagentStop event
 * Output (stdout): JSON with continue status
 */

const fs = require('fs');
const path = require('path');
const { createHook, findActiveSession, safeRead, ensureDir, withFileLock, AGENT_MEMORY_DIR, SESSION_PREFIXES } = require('./hook-utils.cjs');

/**
 * Find the most recently modified session directory as a fallback.
 * Same logic as subagent-tracker.cjs.
 */
function findMostRecentSessionDir() {
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) return null;

  let bestDir = null;
  let bestMtime = 0;

  try {
    const entries = fs.readdirSync(sessionsDir)
      .filter(d => SESSION_PREFIXES.some(p => d.startsWith(p)));

    for (const entry of entries) {
      const fullPath = path.join(sessionsDir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && stat.mtimeMs > bestMtime) {
          const statusFile = path.join(fullPath, 'status.yaml');
          const statusContent = safeRead(statusFile);
          if (statusContent) {
            const phaseMatch = statusContent.match(/phase:\s*(\S+)/);
            if (phaseMatch) {
              const phase = phaseMatch[1];
              if (phase === 'completed' || phase === 'complete' || phase === 'failed' || phase === 'aborted') {
                continue;
              }
            }
          }
          bestMtime = stat.mtimeMs;
          bestDir = fullPath;
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  return bestDir;
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

    if (existingContent && existingContent.includes(`id: "${agentId}"`)) {
      // Already has a stopped_at for this agent? Skip.
      const agentBlockRegex = new RegExp(`id: "${agentId}"[\\s\\S]*?(?=\\n  - id:|$)`);
      const agentBlock = existingContent.match(agentBlockRegex);
      if (agentBlock && agentBlock[0].includes('stopped_at:') && !agentBlock[0].includes('stopped_at: null')) {
        console.error(`[SubagentStopTracker] Agent ${agentId} already has stopped_at, skipping`);
        return;
      }

      // Find the agent's block and update stopped_at (which may be null from spawn).
      // Replace stopped_at: null with the real timestamp, or insert if missing.
      const lines = existingContent.split('\n');
      const newLines = [];
      let foundAgent = false;
      let lastFieldIndex = -1;
      let insertedStop = false;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(`id: "${agentId}"`)) {
          foundAgent = true;
          lastFieldIndex = i;
        } else if (foundAgent && !insertedStop) {
          // Replace stopped_at: null with real timestamp
          if (lines[i].match(/^\s+stopped_at:\s*null/)) {
            newLines.push(`    stopped_at: "${now}"`);
            insertedStop = true;
            foundAgent = false;
            continue; // skip the null line
          }
          if (lines[i].match(/^    \S/) && !lines[i].match(/^  - /)) {
            lastFieldIndex = i;
          } else {
            // We've passed the agent's fields - insert stopped_at
            newLines.push(`    stopped_at: "${now}"`);
            insertedStop = true;
            foundAgent = false;
          }
        }
        newLines.push(lines[i]);
      }

      // If agent was the last entry in the file
      if (foundAgent && !insertedStop) {
        newLines.push(`    stopped_at: "${now}"`);
        insertedStop = true;
      }

      if (insertedStop) {
        // PC-12: Structured completion_summary with outcome field
        const summaryLines = [];
        if (lastMessage) {
          const firstSentence = lastMessage.split(/[.!?\n]/)[0].trim().slice(0, 100);
          const outcome = firstSentence || 'Completed';
          summaryLines.push(`    completion_summary:`);
          summaryLines.push(`      outcome: "${outcome.replace(/"/g, '\\"')}"`);
          summaryLines.push(`      detail: "${lastMessage.replace(/"/g, '\\"').slice(0, 300)}"`);
        }
        // Calculate duration from spawned_at if available
        const spawnedMatch = newLines.join('\n').match(new RegExp(`id: "${agentId}"[\\s\\S]*?spawned_at: "([^"]+)"`));
        if (spawnedMatch) {
          const spawnedAt = new Date(spawnedMatch[1]);
          const stoppedAt = new Date(now);
          const durationMs = stoppedAt - spawnedAt;
          const durationSec = Math.round(durationMs / 1000);
          summaryLines.push(`    duration_seconds: ${durationSec}`);
        }
        if (summaryLines.length > 0) {
          const stopIndex = newLines.findIndex(l => l.includes(`stopped_at: "${now}"`));
          if (stopIndex >= 0) {
            newLines.splice(stopIndex + 1, 0, ...summaryLines);
          }
        }
        fs.writeFileSync(treeFile, newLines.join('\n'));
        console.error(`[SubagentStopTracker] Agent ${agentId} (${subagentType}) stopped`);
      } else {
        // Fallback: append at end (PC-12: structured completion_summary)
        let extra = '';
        if (lastMessage) {
          const firstSentence = lastMessage.split(/[.!?\n]/)[0].trim().slice(0, 100);
          const outcome = firstSentence || 'Completed';
          extra = `\n    completion_summary:\n      outcome: "${outcome.replace(/"/g, '\\"')}"\n      detail: "${lastMessage.replace(/"/g, '\\"').slice(0, 300)}"`;
        }
        fs.appendFileSync(treeFile, `    stopped_at: "${now}"${extra}\n`);
        console.error(`[SubagentStopTracker] Agent ${agentId} (${subagentType}) stopped (appended)`);
      }
    } else {
      console.error(`[SubagentStopTracker] Agent ${agentId} not found in agent_tree.yaml, logging stop event only`);
    }
  });

  return null;
});
