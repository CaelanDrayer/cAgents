#!/usr/bin/env node
/**
 * Team Stop Hook - Cleanup and archive team session
 * cAgents V9.10 - Refactored (also replaces on-session-end.sh cleanup)
 *
 * Runs on SessionEnd to finalize team metrics and update status.
 *
 * NOTE: When a user cancels a session, Claude Code may terminate this hook
 * before it completes, producing "Hook cancelled" in the output. This is
 * expected behavior — no data is lost or corrupted. All writeFileSync calls
 * are individually try-catch guarded to handle partial teardown gracefully.
 *
 * Input (stdin): JSON with session context
 * Output (stdout): JSON with system message
 */

const fs = require('fs');
const path = require('path');
const { createHook, findTeamSession, safeRead, extractYamlValue, countPattern } = require('./hook-utils.cjs');

createHook('TeamStop', async (input) => {
  const sessionDir = findTeamSession(input);
  if (!sessionDir) return null;

  const metricsDir = path.join(sessionDir, 'team', 'metrics');
  const now = new Date().toISOString();

  // Calculate metrics
  const metrics = { items_completed: 0, items_total: 0, duration_seconds: 0, speedup_factor: 0 };

  const taskContent = safeRead(path.join(sessionDir, 'team', 'task_list.yaml'));
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
      console.error(`[TeamStop] Failed to write timing: ${e.message}`);
    }
  }

  // Get speedup factor
  const parallelismContent = safeRead(path.join(metricsDir, 'parallelism.yaml'));
  if (parallelismContent) {
    const speedupMatch = parallelismContent.match(/speedup_factor:\s*([\d.]+)/);
    if (speedupMatch) metrics.speedup_factor = parseFloat(speedupMatch[1]);
  }

  // Update status
  const statusFile = path.join(sessionDir, 'status.yaml');
  let statusContent = safeRead(statusFile);
  if (statusContent) {
    const success = metrics.items_total > 0 ? (metrics.items_completed === metrics.items_total) : true;
    statusContent = statusContent
      .replace(/^phase:\s*\w+/m, 'phase: completed')
      .replace(/^pipeline_state:\s*\S+/m, 'pipeline_state: VALIDATED')
      .replace(/completed_at:\s*null/, `completed_at: "${now}"`)
      .replace(/result:\s*null/, `result: ${success ? 'success' : 'partial'}`);
    try { fs.writeFileSync(statusFile, statusContent); } catch (e) {
      console.error(`[TeamStop] Failed to write status: ${e.message}`);
    }
  }

  // M-07: Mark all agents with stopped_at: null as stopped (cleanup for unreliable SubagentStop)
  const treeFile = path.join(sessionDir, 'workflow', 'agent_tree.yaml');
  const treeContent = safeRead(treeFile);
  if (treeContent && treeContent.includes('stopped_at: null')) {
    const cleaned = treeContent.replace(/stopped_at: null/g, `stopped_at: "${now}"`);
    try { fs.writeFileSync(treeFile, cleaned); } catch (e) {
      console.error(`[TeamStop] Failed to clean up agent_tree: ${e.message}`);
    }
  }

  console.error(`[TeamStop] Finalized ${path.basename(sessionDir)}: ${metrics.items_completed}/${metrics.items_total}`);

  let summary = `## Team Session Complete: ${path.basename(sessionDir)}\n\n`;
  summary += `**Work Items**: ${metrics.items_completed}/${metrics.items_total} completed\n`;
  summary += `**Duration**: ${metrics.duration_seconds} seconds\n`;
  if (metrics.speedup_factor > 1) {
    summary += `**Speedup**: ${metrics.speedup_factor.toFixed(1)}x faster than sequential\n`;
  }

  return { continue: true, systemMessage: summary };
});
