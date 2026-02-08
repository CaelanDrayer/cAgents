#!/usr/bin/env node
/**
 * Teammate Idle Handler Hook - Suggest available work for idle teammates
 * cAgents V9.0 - TeammateIdle Handler
 *
 * Reads team task list from active session's team/task_list.yaml.
 * Finds available (unclaimed) work items.
 * Returns system message suggesting available work.
 *
 * 100% Self-Contained: Uses only built-in Node.js modules.
 *
 * Input (stdin): JSON with teammate context
 * Output (stdout): JSON with continue status and work suggestions
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
    readStdin: () => Promise.resolve({}),
    safeRead: () => null,
    extractYamlValue: () => null,
    findAvailableWork: () => []
  };
}

const { readStdin, AGENT_MEMORY_DIR, safeRead, extractYamlValue, findAvailableWork } = utils;

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
 * Main hook execution
 */
async function main() {
  const input = await readStdin();

  try {
    const teammateName = input.teammate_name || input.agent_name || 'teammate';

    const sessionDir = findTeamSession();
    if (!sessionDir) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    const taskListPath = path.join(sessionDir, 'team', 'task_list.yaml');
    const available = findAvailableWork(taskListPath);

    if (available.length > 0) {
      const suggestions = available.slice(0, 3).map(item =>
        `- ${item.id}: ${item.name || 'Unnamed task'}`
      ).join('\n');

      console.error(`[TeammateIdle] ${teammateName} idle, ${available.length} items available`);
      console.log(JSON.stringify({
        continue: true,
        systemMessage: `Teammate "${teammateName}" is idle. ${available.length} work item(s) available:\n${suggestions}\n\nClaim a work item to continue.`
      }));
    } else {
      console.error(`[TeammateIdle] ${teammateName} idle, no available work`);
      console.log(JSON.stringify({ continue: true }));
    }

  } catch (error) {
    console.error(`[TeammateIdle] Error: ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
  }
}

main();

} catch (e) {
  // Top-level catch for plugin resilience - always output valid JSON
  console.log(JSON.stringify({ continue: true }));
}
