#!/usr/bin/env node
/**
 * Team Task Complete Hook - Track task completion in team sessions
 * cAgents V10.5.0 - Refactored to createHook(), supports continue:false + stopReason
 *
 * Runs when a task completes (TaskCompleted event) in a team session.
 * Updates task_list.yaml, checks dependencies, tracks progress.
 * When all work items are completed, returns continue:false to stop the teammate.
 */

const fs = require('fs');
const path = require('path');
const { createHook, findTeamSession, safeRead, countPattern, ensureDir, getTimestampSlug, parseTaskList, areDependenciesMet } = require('./hook-utils.cjs');

function extractWorkItemId(input) {
  // Primary: use task_id directly from official TaskCompleted schema
  if (input.task_id) return input.task_id;

  // Fallback: extract WI-xxx or TASK-xxx pattern from task_subject or task_description
  const combined = `${input.task_subject || ''} ${input.task_description || ''}`;
  const match = combined.match(/(?:WI|TASK)-(\d+)/i);
  if (match) return `${match[0].split('-')[0].toUpperCase()}-${match[1]}`;

  // Legacy fallback: check tool_input fields
  const legacyCombined = `${input.tool_input?.description || ''} ${input.tool_input?.prompt || ''}`;
  const legacyMatch = legacyCombined.match(/(?:WI|TASK)-(\d+)/i);
  if (legacyMatch) return `${legacyMatch[0].split('-')[0].toUpperCase()}-${legacyMatch[1]}`;

  return null;
}

createHook('TeamTaskComplete', async (input) => {
  const teamName = input.team_name || '';

  const sessionDir = findTeamSession(input);
  if (!sessionDir) return null;

  const workItemId = extractWorkItemId(input);
  if (!workItemId) return null;

  const memberName = input.teammate_name || (input.tool_input?.subagent_type || '').split(':').pop() || 'unknown';
  const taskListFile = path.join(sessionDir, 'team', 'task_list.yaml');
  let content = safeRead(taskListFile);
  if (!content) return null;

  // Update work item status
  const escapedId = workItemId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const itemPattern = new RegExp(`(- id:\\s*["']?${escapedId}["']?[\\s\\S]*?status:\\s*)\\w+`, 'i');
  if (!itemPattern.test(content)) return null;

  const now = new Date().toISOString();
  content = content.replace(itemPattern, '$1completed');

  // Update completed_at
  const completedAtPattern = new RegExp(`(- id:\\s*["']?${escapedId}["']?[\\s\\S]*?completed_at:\\s*)(?:null|"[^"]*")`, 'i');
  content = content.replace(completedAtPattern, `$1"${now}"`);

  // Update summary counts
  const completedCount = countPattern(content, /status:\s*completed/gi);
  const inProgressCount = countPattern(content, /status:\s*in_progress/gi);
  const availableCount = countPattern(content, /status:\s*available/gi);
  const totalCount = completedCount + inProgressCount + availableCount;

  content = content.replace(/completed:\s*\d+/, `completed: ${completedCount}`);
  content = content.replace(/in_progress:\s*\d+/, `in_progress: ${inProgressCount}`);
  content = content.replace(/available:\s*\d+/, `available: ${availableCount}`);
  content = content.replace(/updated_at:\s*"[^"]+"/, `updated_at: "${now}"`);

  fs.writeFileSync(taskListFile, content);

  // Record completion message
  const messagesDir = ensureDir(path.join(sessionDir, 'team', 'messages'));
  const tsSlug = getTimestampSlug();
  const teamLabel = teamName ? `team: "${teamName}"\n` : '';
  fs.writeFileSync(path.join(messagesDir, `${tsSlug}_completion_${workItemId}.yaml`),
    `# Task Completion\ntimestamp: "${now}"\nsender: "${memberName}"\nwork_item_id: "${workItemId}"\n${teamLabel}`);

  // Update timing metrics
  const timingFile = path.join(sessionDir, 'team', 'metrics', 'timing.yaml');
  let timingContent = safeRead(timingFile);
  if (timingContent) {
    if (timingContent.includes('work_items: {}')) {
      timingContent = timingContent.replace('work_items: {}',
        `work_items:\n  ${workItemId}:\n    completed_at: "${now}"\n    member: "${memberName}"`);
    } else if (timingContent.includes('work_items:')) {
      timingContent = timingContent.replace(/(work_items:[\s\S]*?)(\n\w|$)/,
        `$1\n  ${workItemId}:\n    completed_at: "${now}"\n    member: "${memberName}"$2`);
    }
    fs.writeFileSync(timingFile, timingContent);
  }

  // Check for newly unblocked dependencies
  const allItems = parseTaskList(taskListFile);
  const newlyUnblocked = allItems.filter(item =>
    (item.status === 'available' || item.status === 'pending') &&
    !item.claimed_by &&
    item.dependencies?.includes(workItemId) &&
    areDependenciesMet(item, allItems)
  );

  const teamLabel2 = teamName ? `[${teamName}] ` : '';
  console.error(`[TeamTaskComplete] ${teamLabel2}${workItemId} completed by ${memberName} (${completedCount}/${totalCount})`);

  if (newlyUnblocked.length > 0) {
    console.error(`[TeamTaskComplete] Newly unblocked: ${newlyUnblocked.map(i => i.id).join(', ')}`);
  }

  // All work items complete — signal teammate to stop
  if (completedCount === totalCount && totalCount > 0) {
    console.error('[TeamTaskComplete] All work items complete — signaling teammate stop.');
    return {
      continue: false,
      stopReason: `All work items completed (${completedCount}/${totalCount}) — team session finished`
    };
  }

  // Report unblocked items
  if (newlyUnblocked.length > 0) {
    const ids = newlyUnblocked.map(i => i.id).join(', ');
    return {
      continue: true,
      systemMessage: `${workItemId} completed. Unblocked: ${ids}. (${completedCount}/${totalCount} done)`
    };
  }

  return {
    continue: true,
    systemMessage: `${workItemId} completed (${completedCount}/${totalCount} done)`
  };
});
