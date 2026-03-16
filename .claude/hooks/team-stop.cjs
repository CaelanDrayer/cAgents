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
      metrics.duration_seconds = Math.round((new Date() - new Date(startMatch[1])) / 1000);
    }
    let updated = timingContent
      .replace(/completed_at:\s*null/, `completed_at: "${now}"`)
      .replace(/total_duration_seconds:\s*\d+/, `total_duration_seconds: ${metrics.duration_seconds}`);
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
    const success = metrics.items_completed === metrics.items_total && metrics.items_total > 0;
    statusContent = statusContent
      .replace(/phase:\s*\w+/, 'phase: completed')
      .replace(/completed_at:\s*null/, `completed_at: "${now}"`)
      .replace(/result:\s*null/, `result: ${success ? 'success' : 'partial'}`);
    try { fs.writeFileSync(statusFile, statusContent); } catch (e) {
      console.error(`[TeamStop] Failed to write status: ${e.message}`);
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
