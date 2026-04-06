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
const { createHook, findTeamSession, safeRead, countPattern, ensureDir, getTimestampSlug, parseTaskList, areDependenciesMet, withFileLock } = require('./hook-utils.cjs');

function extractWorkItemId(input) {
  // Primary: use task_id directly from official TaskCompleted schema
  if (input.task_id) return input.task_id;

  // Fallback: check tool_input fields (for recovery from corrupted state)
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
  const taskSubject = input.task_subject || workItemId;
  const now = new Date().toISOString();

  // Persist task completion to session task_list.yaml with file lock for concurrent safety
  let completedCount = 0;
  let totalCount = 0;

  withFileLock(taskListFile, () => {
    let content = safeRead(taskListFile);

    if (!content) {
      // File doesn't exist — create it with header and first completion entry
      ensureDir(path.join(sessionDir, 'team'));
      content = [
        '# Task List',
        'summary:',
        '  total: 1',
        '  completed: 1',
        '  in_progress: 0',
        '  available: 0',
        `  updated_at: "${now}"`,
        '',
        'completions:',
        `  - task_id: "${workItemId}"`,
        `    subject: "${taskSubject}"`,
        '    status: completed',
        `    completed_at: "${now}"`,
        ''
      ].join('\n');
      fs.writeFileSync(taskListFile, content);
      completedCount = 1;
      totalCount = 1;
      return;
    }

    // Try to update existing entry in structured items list
    const escapedId = workItemId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const itemPattern = new RegExp(`(- id:\\s*["']?${escapedId}["']?[\\s\\S]*?status:\\s*)\\w+`, 'i');

    if (itemPattern.test(content)) {
      // Update existing entry status
      content = content.replace(itemPattern, '$1completed');
      const completedAtPattern = new RegExp(`(- id:\\s*["']?${escapedId}["']?[\\s\\S]*?completed_at:\\s*)(?:null|"[^"]*")`, 'i');
      content = content.replace(completedAtPattern, `$1"${now}"`);
    } else {
      // Entry not found in structured list — append to completions section
      if (content.includes('completions:')) {
        content = content.replace(/(completions:\n)/, `$1  - task_id: "${workItemId}"\n    subject: "${taskSubject}"\n    status: completed\n    completed_at: "${now}"\n`);
      } else {
        content += `\ncompletions:\n  - task_id: "${workItemId}"\n    subject: "${taskSubject}"\n    status: completed\n    completed_at: "${now}"\n`;
      }
    }

    // Update summary counts
    completedCount = countPattern(content, /status:\s*completed/gi);
    const inProgressCount = countPattern(content, /status:\s*in_progress/gi);
    const availableCount = countPattern(content, /status:\s*available/gi);
    const pendingCount = countPattern(content, /status:\s*pending/gi);
    const blockedCount = countPattern(content, /status:\s*blocked/gi);
    totalCount = completedCount + inProgressCount + availableCount + pendingCount + blockedCount;

    content = content.replace(/completed:\s*\d+/, `completed: ${completedCount}`);
    content = content.replace(/in_progress:\s*\d+/, `in_progress: ${inProgressCount}`);
    content = content.replace(/available:\s*\d+/, `available: ${availableCount}`);
    content = content.replace(/updated_at:\s*"[^"]+"/, `updated_at: "${now}"`);

    fs.writeFileSync(taskListFile, content);
  });

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
