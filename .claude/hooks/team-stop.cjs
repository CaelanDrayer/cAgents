#!/usr/bin/env node
/**
 * Team Stop Hook - Cleanup and archive team session
 * cAgents V9.0 - Agent Teams Integration
 *
 * This hook runs when a team session ends to finalize metrics,
 * archive results, and cleanup resources.
 *
 * 100% Self-Contained: Uses only built-in Node.js modules.
 *
 * Input (stdin): JSON with session context
 * Output (stdout): JSON with system message
 */

// CRITICAL: Wrap everything in try-catch for plugin resilience
try {

const fs = require('fs');
const path = require('path');

// Try to load hook-utils, fall back to inline implementations
let utils;
try {
  utils = require('./hook-utils.cjs');
} catch {
  // Minimal inline fallbacks for plugin mode
  utils = {
    AGENT_MEMORY_DIR: path.join(process.cwd(), 'Agent_Memory'),
    SESSION_PREFIXES: ['run_', 'optimize_', 'review_', 'designer_', 'team_'],
    readStdin: () => Promise.resolve({}),
    extractYamlValue: () => null,
    safeRead: () => null,
    countPattern: () => 0,
    ensureDir: (d) => { try { fs.mkdirSync(d, { recursive: true }); } catch {} return d; }
  };
}

const { readStdin, AGENT_MEMORY_DIR, safeRead, extractYamlValue, countPattern, ensureDir } = utils;

/**
 * Find active team session
 */
function findTeamSession(input) {
  // Check if session_id is provided
  if (input.session_id && input.session_id.startsWith('team_')) {
    const sessionDir = path.join(AGENT_MEMORY_DIR, 'sessions', input.session_id);
    if (fs.existsSync(sessionDir)) {
      return sessionDir;
    }
  }

  // Find most recent team session
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) return null;

  const teamSessions = fs.readdirSync(sessionsDir)
    .filter(d => d.startsWith('team_'))
    .sort()
    .reverse();

  // Prefer non-completed sessions, but fall back to most recent
  for (const session of teamSessions) {
    const statusFile = path.join(sessionsDir, session, 'status.yaml');
    const content = safeRead(statusFile);
    if (!content) continue;
    const phase = extractYamlValue(content, 'phase');
    if (phase && phase !== 'completed' && phase !== 'failed') {
      return path.join(sessionsDir, session);
    }
  }
  // Fallback: return most recent if all completed (for final cleanup)
  return teamSessions.length > 0
    ? path.join(sessionsDir, teamSessions[0])
    : null;
}

/**
 * Calculate final metrics
 */
function calculateFinalMetrics(sessionDir) {
  const metricsDir = path.join(sessionDir, 'team', 'metrics');
  const taskListFile = path.join(sessionDir, 'team', 'task_list.yaml');
  const timingFile = path.join(metricsDir, 'timing.yaml');
  const parallelismFile = path.join(metricsDir, 'parallelism.yaml');

  const metrics = {
    items_completed: 0,
    items_total: 0,
    duration_seconds: 0,
    speedup_factor: 0
  };

  // Get task list stats
  const taskContent = safeRead(taskListFile);
  if (taskContent) {
    const completedMatch = taskContent.match(/completed:\s*(\d+)/);
    const totalMatch = taskContent.match(/total:\s*(\d+)/);
    if (completedMatch) metrics.items_completed = parseInt(completedMatch[1], 10);
    if (totalMatch) metrics.items_total = parseInt(totalMatch[1], 10);
  }

  // Get timing stats
  const timingContent = safeRead(timingFile);
  if (timingContent) {
    const startMatch = timingContent.match(/started_at:\s*"([^"]+)"/);
    if (startMatch) {
      const startTime = new Date(startMatch[1]);
      const endTime = new Date();
      metrics.duration_seconds = Math.round((endTime - startTime) / 1000);
    }
  }

  // Get parallelism stats
  const parallelismContent = safeRead(parallelismFile);
  if (parallelismContent) {
    const speedupMatch = parallelismContent.match(/speedup_factor:\s*([\d.]+)/);
    if (speedupMatch) metrics.speedup_factor = parseFloat(speedupMatch[1]);
  }

  return metrics;
}

/**
 * Finalize timing metrics
 */
function finalizeTimingMetrics(sessionDir) {
  const timingFile = path.join(sessionDir, 'team', 'metrics', 'timing.yaml');
  const content = safeRead(timingFile);

  if (content) {
    // Update completed_at
    const now = new Date().toISOString();
    let updated = content.replace(
      /completed_at:\s*null/,
      `completed_at: "${now}"`
    );

    // Calculate duration
    const startMatch = content.match(/started_at:\s*"([^"]+)"/);
    if (startMatch) {
      const startTime = new Date(startMatch[1]);
      const duration = Math.round((new Date() - startTime) / 1000);
      updated = updated.replace(
        /total_duration_seconds:\s*\d+/,
        `total_duration_seconds: ${duration}`
      );
    }

    fs.writeFileSync(timingFile, updated);
  }
}

/**
 * Update status to completed
 */
function updateStatusToCompleted(sessionDir, metrics) {
  const statusFile = path.join(sessionDir, 'status.yaml');
  let content = safeRead(statusFile);

  if (content) {
    const now = new Date().toISOString();

    // Update phase to completed
    content = content.replace(
      /phase:\s*\w+/,
      'phase: completed'
    );

    // Update completed_at
    content = content.replace(
      /completed_at:\s*null/,
      `completed_at: "${now}"`
    );

    // Update result
    const success = metrics.items_completed === metrics.items_total && metrics.items_total > 0;
    content = content.replace(
      /result:\s*null/,
      `result: ${success ? 'success' : 'partial'}`
    );

    fs.writeFileSync(statusFile, content);
  }
}

/**
 * Generate session summary
 */
function generateSummary(sessionDir, metrics) {
  const sessionId = path.basename(sessionDir);

  let summary = `## Team Session Complete: ${sessionId}\n\n`;
  summary += `**Work Items**: ${metrics.items_completed}/${metrics.items_total} completed\n`;
  summary += `**Duration**: ${metrics.duration_seconds} seconds\n`;

  if (metrics.speedup_factor > 1) {
    summary += `**Speedup**: ${metrics.speedup_factor.toFixed(1)}x faster than sequential\n`;
  }

  summary += `\n**Session Directory**: Agent_Memory/sessions/${sessionId}/\n`;
  summary += `**Outputs**: Agent_Memory/sessions/${sessionId}/outputs/\n`;

  return summary;
}

/**
 * Main hook execution
 */
async function main() {
  const input = await readStdin();

  try {
    const sessionDir = findTeamSession(input);

    if (!sessionDir) {
      // No team session, nothing to do
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    // Calculate final metrics
    const metrics = calculateFinalMetrics(sessionDir);

    // Finalize timing
    finalizeTimingMetrics(sessionDir);

    // Update status
    updateStatusToCompleted(sessionDir, metrics);

    // Generate summary
    const summary = generateSummary(sessionDir, metrics);

    console.error(`[TeamStop] Finalized team session ${path.basename(sessionDir)}`);
    console.error(`[TeamStop] ${metrics.items_completed}/${metrics.items_total} items completed`);

    console.log(JSON.stringify({
      continue: true,
      systemMessage: summary
    }));

  } catch (error) {
    console.error(`[TeamStop] Error: ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
  }
}

main();

} catch (e) {
  // Top-level catch for plugin resilience - always output valid JSON
  console.log(JSON.stringify({ continue: true }));
}
