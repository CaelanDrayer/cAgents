#!/usr/bin/env node
/**
 * Teammate Idle Handler Hook - Suggest available work or stop idle teammates
 * cAgents V10.5.0 - Refactored to createHook(), supports continue:false + stopReason
 *
 * When a teammate goes idle:
 *   - If work items are available: suggest them (continue:true + systemMessage)
 *   - If all work items completed: stop the teammate (continue:false + stopReason)
 *   - Otherwise: pass-through (allow idle normally)
 */

const path = require('path');
const { createHook, findTeamSession, findAvailableWork, parseTaskList } = require('./hook-utils.cjs');

createHook('TeammateIdle', async (input) => {
  const teamName = input.team_name || '';
  const teammateName = input.teammate_name || 'teammate';

  const sessionDir = findTeamSession(input);
  if (!sessionDir) return null;

  const taskListPath = path.join(sessionDir, 'team', 'task_list.yaml');
  const available = findAvailableWork(taskListPath);

  if (available.length > 0) {
    const suggestions = available.slice(0, 3)
      .map(item => `- ${item.id}: ${item.name || 'Unnamed task'}`)
      .join('\n');

    const teamLabel = teamName ? `[${teamName}] ` : '';
    console.error(`[TeammateIdle] ${teamLabel}${teammateName} idle, ${available.length} items available`);

    return {
      continue: true,
      systemMessage: `${available.length} work item(s) available:\n${suggestions}\n\nClaim a work item to continue.`
    };
  }

  // Check if all items are completed
  const allItems = parseTaskList(taskListPath);
  const allCompleted = allItems.length > 0 && allItems.every(i => i.status === 'completed');

  if (allCompleted) {
    const teamLabel = teamName ? `[${teamName}] ` : '';
    console.error(`[TeammateIdle] ${teamLabel}${teammateName} idle, all ${allItems.length} work items completed`);
    return {
      continue: false,
      stopReason: `All work items completed (${allItems.length}/${allItems.length}) - team session finished`
    };
  }

  const teamLabel = teamName ? `[${teamName}] ` : '';
  console.error(`[TeammateIdle] ${teamLabel}${teammateName} idle, no available work`);
  return null;
});
