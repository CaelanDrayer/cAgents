#!/usr/bin/env node
/**
 * Team Task Complete Hook - Track task completion in team sessions
 * cAgents V9.0 - TaskCompleted Handler (Enhanced)
 *
 * This hook runs when a task completes in a team session.
 * Updates task_list.yaml status, checks if dependencies are unblocked,
 * notifies team lead of completion, and tracks progress.
 *
 * 100% Self-Contained: Uses only built-in Node.js modules.
 *
 * Input (stdin): JSON with task completion context
 * Output (stdout): JSON with continue status
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
    ensureDir: (d) => { try { fs.mkdirSync(d, { recursive: true }); } catch {} return d; },
    getTimestampSlug: (d = new Date()) => d.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19),
    parseTaskList: () => [],
    areDependenciesMet: () => true
  };
}

const { readStdin, AGENT_MEMORY_DIR, safeRead, extractYamlValue, countPattern, ensureDir, getTimestampSlug, parseTaskList, areDependenciesMet } = utils;

/**
 * Find active team session
 */
function findTeamSession() {
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) return null;

  const teamSessions = fs.readdirSync(sessionsDir)
    .filter(d => d.startsWith('team_'))
    .sort()
    .reverse();

  // Find active (non-completed) team session
  for (const session of teamSessions) {
    const statusFile = path.join(sessionsDir, session, 'status.yaml');
    const content = safeRead(statusFile);
    if (!content) continue;

    const phase = extractYamlValue(content, 'phase');
    if (phase && phase !== 'completed' && phase !== 'failed') {
      return path.join(sessionsDir, session);
    }
  }

  return null;
}

/**
 * Extract work item ID from task description or prompt
 */
function extractWorkItemId(input) {
  const description = input.tool_input?.description || '';
  const prompt = input.tool_input?.prompt || '';
  const combined = `${description} ${prompt}`;

  // Look for WI-XXX pattern
  const match = combined.match(/WI-(\d+)/i);
  if (match) return `WI-${match[1]}`;

  // Look for work_item_id in prompt
  const idMatch = combined.match(/work_item_id:\s*["']?([^"'\s]+)/i);
  if (idMatch) return idMatch[1];

  return null;
}

/**
 * Update task list with completion
 */
function updateTaskList(sessionDir, workItemId, memberName, output) {
  const taskListFile = path.join(sessionDir, 'team', 'task_list.yaml');
  let content = safeRead(taskListFile);

  if (!content) return false;

  // Find and update the work item
  // Escape regex special characters in workItemId to prevent ReDoS
  const escapedId = workItemId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const itemPattern = new RegExp(
    `(- id:\\s*["']?${escapedId}["']?[\\s\\S]*?status:\\s*)\\w+`,
    'i'
  );

  if (!itemPattern.test(content)) return false;

  const now = new Date().toISOString();

  // Update status to completed
  content = content.replace(itemPattern, '$1completed');

  // Update completed_at if field exists (handles null or any previous value)
  const completedAtPattern = new RegExp(
    `(- id:\\s*["']?${escapedId}["']?[\\s\\S]*?completed_at:\\s*)(?:null|"[^"]*")`,
    'i'
  );
  content = content.replace(completedAtPattern, `$1"${now}"`);

  // Update summary counts
  const completedCount = countPattern(content, /status:\s*completed/gi);
  const inProgressCount = countPattern(content, /status:\s*in_progress/gi);
  const availableCount = countPattern(content, /status:\s*available/gi);
  const claimedCount = countPattern(content, /status:\s*claimed/gi);
  const totalCount = completedCount + inProgressCount + availableCount + claimedCount;

  // Update summary section
  content = content.replace(
    /completed:\s*\d+/,
    `completed: ${completedCount}`
  );
  content = content.replace(
    /in_progress:\s*\d+/,
    `in_progress: ${inProgressCount}`
  );
  content = content.replace(
    /available:\s*\d+/,
    `available: ${availableCount}`
  );
  content = content.replace(
    /claimed:\s*\d+/,
    `claimed: ${claimedCount}`
  );

  // Update updated_at
  content = content.replace(
    /updated_at:\s*"[^"]+"/,
    `updated_at: "${now}"`
  );

  fs.writeFileSync(taskListFile, content);

  return { completedCount, totalCount };
}

/**
 * Record completion message
 */
function recordCompletionMessage(sessionDir, workItemId, memberName) {
  const messagesDir = path.join(sessionDir, 'team', 'messages');
  ensureDir(messagesDir);

  const timestamp = getTimestampSlug();
  const messageFile = path.join(messagesDir, `${timestamp}_completion_${workItemId}.yaml`);

  const message = `# Task Completion Message
# Auto-generated by team-task-complete.cjs

id: msg_${timestamp}_${memberName || 'unknown'}
timestamp: "${new Date().toISOString()}"
sender: "${memberName || 'team-member'}"
recipient: "team-lead"
type: completion

content:
  subject: "Work item ${workItemId} completed"
  body: "Task completed successfully"
  work_item_id: "${workItemId}"
  completed_at: "${new Date().toISOString()}"
`;

  fs.writeFileSync(messageFile, message);
}

/**
 * Update timing metrics
 */
function updateTimingMetrics(sessionDir, workItemId, memberName) {
  const timingFile = path.join(sessionDir, 'team', 'metrics', 'timing.yaml');
  let content = safeRead(timingFile);

  if (!content) return;

  const now = new Date().toISOString();

  // Add work item timing entry
  // Find work_items section and append
  if (content.includes('work_items: {}')) {
    content = content.replace(
      'work_items: {}',
      `work_items:\n  ${workItemId}:\n    completed_at: "${now}"\n    member: "${memberName || 'unknown'}"`
    );
  } else if (content.includes('work_items:')) {
    // Append to existing work_items
    content = content.replace(
      /(work_items:[\s\S]*?)(\n\w|$)/,
      `$1\n  ${workItemId}:\n    completed_at: "${now}"\n    member: "${memberName || 'unknown'}"$2`
    );
  }

  fs.writeFileSync(timingFile, content);
}

/**
 * Main hook execution
 */
async function main() {
  const input = await readStdin();

  try {
    // Only process Task tool completions
    if (input.tool_name !== 'Task') {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    const sessionDir = findTeamSession();

    if (!sessionDir) {
      // No active team session
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    // Extract work item ID
    const workItemId = extractWorkItemId(input);
    if (!workItemId) {
      // Not a work item task
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    // Extract member name from subagent_type
    const subagentType = input.tool_input?.subagent_type || '';
    const memberName = subagentType.split(':').pop() || 'unknown';

    // Update task list
    const result = updateTaskList(sessionDir, workItemId, memberName, input.tool_output);

    if (result) {
      // Record completion message
      recordCompletionMessage(sessionDir, workItemId, memberName);

      // Update timing metrics
      updateTimingMetrics(sessionDir, workItemId, memberName);

      // Check for newly unblocked dependencies
      const taskListPath = path.join(sessionDir, 'team', 'task_list.yaml');
      const allItems = parseTaskList(taskListPath);
      const newlyUnblocked = allItems.filter(item =>
        (item.status === 'available' || item.status === 'pending') &&
        !item.claimed_by &&
        item.dependencies &&
        item.dependencies.includes(workItemId) &&
        areDependenciesMet(item, allItems)
      );

      console.error(`[TeamTaskComplete] ${workItemId} completed by ${memberName}`);
      console.error(`[TeamTaskComplete] Progress: ${result.completedCount}/${result.totalCount}`);

      // Build system message for team lead
      let systemMsg = `Work item ${workItemId} completed by ${memberName}. Progress: ${result.completedCount}/${result.totalCount}.`;

      if (newlyUnblocked.length > 0) {
        const unblockedList = newlyUnblocked.map(i => i.id).join(', ');
        systemMsg += ` Newly unblocked: ${unblockedList}.`;
        console.error(`[TeamTaskComplete] Unblocked: ${unblockedList}`);
      }

      if (result.completedCount === result.totalCount) {
        systemMsg += ' All work items complete - ready for validation.';
        console.error('[TeamTaskComplete] All work items complete!');
      }

      console.log(JSON.stringify({
        continue: true,
        systemMessage: systemMsg
      }));
    } else {
      console.log(JSON.stringify({ continue: true }));
    }

  } catch (error) {
    console.error(`[TeamTaskComplete] Error: ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
  }
}

main();

} catch (e) {
  // Top-level catch for plugin resilience - always output valid JSON
  console.log(JSON.stringify({ continue: true }));
}
