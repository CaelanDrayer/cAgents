#!/usr/bin/env node
/**
 * Teammate Idle Handler Hook - Suggest available work for idle teammates
 * cAgents V9.31 - Aligned with official Claude Code TeammateIdle schema
 *
 * Reads team task list and suggests available work items.
 * TeammateIdle uses exit codes only (per Claude Code docs):
 *   exit 0 = allow teammate to go idle
 *   exit 2 = prevent idle, stderr is fed back as feedback
 *
 * Official TeammateIdle input schema fields:
 *   team_name      - Name of the team (primary identifier)
 *   teammate_name  - Name of the idle teammate
 * Output: exit code + stderr feedback (stdout JSON is ignored by TeammateIdle)
 */

const path = require('path');
const { readStdin, findTeamSession, findAvailableWork } = require('./hook-utils.cjs');

async function run() {
  try {
    const input = await readStdin();
    const teamName = input.team_name || '';
    const teammateName = input.teammate_name || 'teammate';

    const sessionDir = findTeamSession(input);
    if (!sessionDir) {
      process.exit(0);  // No team session, allow idle
      return;
    }

    const taskListPath = path.join(sessionDir, 'team', 'task_list.yaml');
    const available = findAvailableWork(taskListPath);

    if (available.length === 0) {
      const teamLabel = teamName ? `[${teamName}] ` : '';
      console.error(`[TeammateIdle] ${teamLabel}${teammateName} idle, no available work`);
      process.exit(0);  // Allow idle
      return;
    }

    const suggestions = available.slice(0, 3)
      .map(item => `- ${item.id}: ${item.name || 'Unnamed task'}`)
      .join('\n');

    const teamLabel = teamName ? `[${teamName}] ` : '';
    console.error(`[TeammateIdle] ${teamLabel}${teammateName} idle, ${available.length} items available`);

    // Exit 2 = prevent idle, stderr feedback is sent to the teammate
    process.stderr.write(`${available.length} work item(s) available:\n${suggestions}\n\nClaim a work item to continue.\n`);
    process.exit(2);

  } catch (e) {
    console.error(`[TeammateIdle] Error: ${e.message}`);
    process.exit(0);  // On error, allow idle
  }
}

run();
