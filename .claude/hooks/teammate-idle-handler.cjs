#!/usr/bin/env node
/**
 * Teammate Idle Handler Hook - Suggest available work for idle teammates
 * cAgents V9.5 - Refactored
 *
 * Reads team task list and suggests available work items.
 *
 * Input (stdin): JSON with teammate_name from TeammateIdle event
 * Output (stdout): JSON with work suggestions
 */

const path = require('path');
const { createHook, findTeamSession, findAvailableWork } = require('./hook-utils.cjs');

createHook('TeammateIdle', async (input) => {
  const teammateName = input.teammate_name || 'teammate';

  const sessionDir = findTeamSession();
  if (!sessionDir) return null;

  const taskListPath = path.join(sessionDir, 'team', 'task_list.yaml');
  const available = findAvailableWork(taskListPath);

  if (available.length === 0) {
    console.error(`[TeammateIdle] ${teammateName} idle, no available work`);
    return null;
  }

  const suggestions = available.slice(0, 3)
    .map(item => `- ${item.id}: ${item.name || 'Unnamed task'}`)
    .join('\n');

  console.error(`[TeammateIdle] ${teammateName} idle, ${available.length} items available`);

  return {
    continue: true,
    systemMessage: `Teammate "${teammateName}" is idle. ${available.length} work item(s) available:\n${suggestions}\n\nClaim a work item to continue.`
  };
});
