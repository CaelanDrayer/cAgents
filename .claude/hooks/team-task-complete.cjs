#!/usr/bin/env node
/**
 * Team Task Complete Hook - Track task completion in team sessions
 * cAgents V9.5 - Refactored
 *
 * Runs when a task completes (TaskCompleted event) in a team session.
 * Updates task_list.yaml, checks dependencies, tracks progress.
 * TaskCompleted uses exit codes only (per Claude Code docs):
 *   exit 0 = allow task completion
 *   exit 2 = prevent completion, stderr is fed back as feedback
 *
 * Input (stdin): JSON with task_id, task_subject, task_description, teammate_name
 * Output: exit code 0 (allow) or exit code 2 (block with stderr feedback)
 */

const fs = require('fs');
const path = require('path');
const { readStdin, findTeamSession, safeRead, countPattern, ensureDir, getTimestampSlug, parseTaskList, areDependenciesMet } = require('./hook-utils.cjs');

function extractWorkItemId(input) {
  // TaskCompleted provides task_subject, task_description, task_id
  const combined = `${input.task_subject || ''} ${input.task_description || ''}`;
  const match = combined.match(/WI-(\d+)/i);
  if (match) return `WI-${match[1]}`;
  if (input.task_id) return input.task_id;

  // Legacy: check tool_input fields
  const legacyCombined = `${input.tool_input?.description || ''} ${input.tool_input?.prompt || ''}`;
  const legacyMatch = legacyCombined.match(/WI-(\d+)/i);
  if (legacyMatch) return `WI-${legacyMatch[1]}`;

  return null;
}

async function run() {
  try {
    const input = await readStdin();

    const sessionDir = findTeamSession();
    if (!sessionDir) {
      process.exit(0);
      return;
    }

    const workItemId = extractWorkItemId(input);
    if (!workItemId) {
      process.exit(0);
      return;
    }

    const memberName = input.teammate_name || (input.tool_input?.subagent_type || '').split(':').pop() || 'unknown';
    const taskListFile = path.join(sessionDir, 'team', 'task_list.yaml');
    let content = safeRead(taskListFile);
    if (!content) {
      process.exit(0);
      return;
    }

    // Update work item status
    const escapedId = workItemId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const itemPattern = new RegExp(`(- id:\\s*["']?${escapedId}["']?[\\s\\S]*?status:\\s*)\\w+`, 'i');
    if (!itemPattern.test(content)) {
      process.exit(0);
      return;
    }

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
    fs.writeFileSync(path.join(messagesDir, `${tsSlug}_completion_${workItemId}.yaml`),
      `# Task Completion\ntimestamp: "${now}"\nsender: "${memberName}"\nwork_item_id: "${workItemId}"\n`);

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

    console.error(`[TeamTaskComplete] ${workItemId} completed by ${memberName} (${completedCount}/${totalCount})`);

    if (newlyUnblocked.length > 0) {
      console.error(`[TeamTaskComplete] Newly unblocked: ${newlyUnblocked.map(i => i.id).join(', ')}`);
    }
    if (completedCount === totalCount) {
      console.error('[TeamTaskComplete] All work items complete - ready for validation.');
    }

    // TaskCompleted uses exit codes only - exit 0 to allow completion
    process.exit(0);

  } catch (e) {
    console.error(`[TeamTaskComplete] Error: ${e.message}`);
    process.exit(0);  // On error, allow completion
  }
}

run();
