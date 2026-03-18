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
const { createHook, findTeamSession, findAvailableWork, parseTaskList, safeRead, extractYamlValue } = require('./hook-utils.cjs');

/**
 * Detect current wave from teammate name or task metadata.
 * Teammate names follow pattern: w{K}-task-{N}-{controller}
 */
function detectCurrentWave(teammateName, taskListPath) {
  // Try to extract wave from teammate name pattern (w1-task-3-engineering-manager)
  const waveMatch = (teammateName || '').match(/^w(\d+)-/);
  if (waveMatch) return parseInt(waveMatch[1], 10);

  // Fallback: check the most recently in_progress task's wave metadata
  const content = safeRead(taskListPath);
  if (content) {
    const waveMatches = [...content.matchAll(/wave:\s*(\d+)/g)];
    if (waveMatches.length > 0) {
      // Return the highest wave number that has in_progress items
      const waves = waveMatches.map(m => parseInt(m[1], 10));
      return Math.max(...waves);
    }
  }

  return null; // Unknown wave
}

createHook('TeammateIdle', async (input) => {
  const teamName = input.team_name || '';
  const teammateName = input.teammate_name || 'teammate';

  const sessionDir = findTeamSession(input);
  if (!sessionDir) return null;

  const taskListPath = path.join(sessionDir, 'team', 'task_list.yaml');
  const allAvailable = findAvailableWork(taskListPath);

  // H-10: Filter by current wave to prevent cross-wave item suggestions
  const currentWave = detectCurrentWave(teammateName, taskListPath);
  let available = allAvailable;
  if (currentWave !== null && allAvailable.length > 0) {
    // Filter to only items from the current wave
    const content = safeRead(taskListPath) || '';
    available = allAvailable.filter(item => {
      // Check if item's block contains a matching wave field
      const itemPattern = new RegExp(`id:\\s*["']?${item.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?[\\s\\S]*?(?=\\n\\s*- id:|$)`);
      const itemBlock = content.match(itemPattern);
      if (itemBlock) {
        const waveMatch = itemBlock[0].match(/wave:\s*(\d+)/);
        if (waveMatch) return parseInt(waveMatch[1], 10) === currentWave;
      }
      return true; // If no wave info, include it
    });
  }

  if (available.length > 0) {
    const suggestions = available.slice(0, 3)
      .map(item => `- ${item.id}: ${item.name || 'Unnamed task'}`)
      .join('\n');

    const teamLabel = teamName ? `[${teamName}] ` : '';
    const waveInfo = currentWave !== null ? ` (wave ${currentWave})` : '';
    console.error(`[TeammateIdle] ${teamLabel}${teammateName} idle${waveInfo}, ${available.length} items available`);

    return {
      continue: true,
      systemMessage: `${available.length} work item(s) available${waveInfo}:\n${suggestions}\n\nClaim a work item to continue.`
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
