#!/usr/bin/env node
/**
 * Team Start Hook - Initialize team monitoring
 * cAgents V9.5 - Refactored
 *
 * Runs on SubagentStart to initialize team-specific tracking and monitoring.
 *
 * Input (stdin): JSON with session context
 * Output (stdout): JSON with system message
 */

const fs = require('fs');
const path = require('path');
const { createHook, findTeamSession, ensureDir } = require('./hook-utils.cjs');

createHook('TeamStart', async (input) => {
  const sessionDir = findTeamSession(input);
  if (!sessionDir) return null;

  const teamDir = path.join(sessionDir, 'team');
  const metricsDir = path.join(teamDir, 'metrics');
  ensureDir(teamDir);
  ensureDir(path.join(teamDir, 'messages'));
  ensureDir(metricsDir);

  // Initialize timing metrics if not exists
  const timingFile = path.join(metricsDir, 'timing.yaml');
  if (!fs.existsSync(timingFile)) {
    fs.writeFileSync(timingFile, `# Team Timing Metrics
session_id: ${path.basename(sessionDir)}
started_at: "${new Date().toISOString()}"
completed_at: null
total_duration_seconds: 0

phases:
  planning:
    started_at: null
    completed_at: null
  team_execution:
    started_at: null
    completed_at: null
  validation:
    started_at: null
    completed_at: null

work_items: {}
`);
  }

  // Initialize parallelism metrics if not exists
  const parallelismFile = path.join(metricsDir, 'parallelism.yaml');
  if (!fs.existsSync(parallelismFile)) {
    fs.writeFileSync(parallelismFile, `# Team Parallelism Metrics
session_id: ${path.basename(sessionDir)}

analysis:
  total_items: 0
  parallelizable_items: 0
  parallelism_score: 0.0

utilization:
  peak_concurrent_members: 0
  efficiency_score: 0.0

speedup:
  estimated_sequential_time: 0
  actual_parallel_time: 0
  speedup_factor: 0.0
`);
  }

  const teamsAvailable = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1';
  console.error(`[TeamStart] Initialized team monitoring for ${path.basename(sessionDir)}`);

  return {
    continue: true,
    systemMessage: teamsAvailable
      ? 'Team session initialized with full Agent Teams support.'
      : 'Team session initialized in fallback mode (parallel Tasks).'
  };
});
