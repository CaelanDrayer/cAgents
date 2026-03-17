#!/usr/bin/env node
/**
 * PreCompact Hook - Save critical state before context compaction
 * cAgents V9.10 - Refactored
 *
 * Saves critical workflow state that must survive compaction,
 * including controller coordination state and resume instructions.
 *
 * Input (stdin): JSON with session context
 * Output (stdout): JSON with continue status
 */

const fs = require('fs');
const path = require('path');
const { createHook, findActiveSession, extractYamlValue, safeRead, countPattern, getTimestampSlug, getWaypointPath, parseTaskList } = require('./hook-utils.cjs');

function extractCoordinationState(coordContent) {
  if (!coordContent) return null;
  const state = {};
  const controller = extractYamlValue(coordContent, 'controller');
  if (controller) state.controller = controller;
  const status = extractYamlValue(coordContent, 'status');
  if (status) state.status = status;

  state.questions_asked = countPattern(coordContent, /question:/g);
  state.questions_answered = countPattern(coordContent, /answer:/g);
  state.questions_pending = Math.max(0, state.questions_asked - state.questions_answered);

  state.work_items = {
    completed: countPattern(coordContent, /status:\s*completed/g),
    in_progress: countPattern(coordContent, /status:\s*in_progress/g),
    pending: countPattern(coordContent, /status:\s*pending/g),
    blocked: countPattern(coordContent, /status:\s*blocked/g)
  };

  state.has_synthesis = coordContent.includes('synthesized_solution:') || coordContent.includes('synthesis:');
  state.has_implementation_tasks = coordContent.includes('implementation_tasks:');
  return state;
}

function getNextAction(phase, coordState) {
  if (phase === 'coordinating' && coordState) {
    if (coordState.questions_pending > 0) return `Answer ${coordState.questions_pending} pending questions`;
    if (!coordState.has_synthesis) return 'Synthesize answers into solution';
    if (!coordState.has_implementation_tasks) return 'Create implementation tasks';
    return 'Complete remaining implementation tasks';
  }
  const actions = {
    routing: 'Classify tier and domain',
    planning: 'Create plan with objectives',
    coordinating: 'Continue controller coordination',
    executing: 'Monitor execution progress',
    validating: 'Verify completion criteria'
  };
  return actions[phase] || `Resume from ${phase} phase`;
}

createHook('PreCompact', async (input) => {
  const sessionDir = findActiveSession(input.session_id);
  if (!sessionDir) return null;

  const timestamp = new Date();
  const tsSlug = getTimestampSlug(timestamp);
  const waypointId = `WP-compact-${tsSlug}`;
  const waypointFile = getWaypointPath(sessionDir, 'compact', timestamp);

  const statusContent = safeRead(path.join(sessionDir, 'status.yaml'));
  let phase = statusContent
    ? (extractYamlValue(statusContent, 'phase') || extractYamlValue(statusContent, 'current_phase') || extractYamlValue(statusContent, 'pipeline_state'))
    : null;

  // If status.yaml didn't yield a phase, infer from available workflow artifacts
  if (!phase) {
    const coordFile = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
    const planFile = path.join(sessionDir, 'workflow', 'plan.yaml');
    const decompFile = path.join(sessionDir, 'workflow', 'decomposition.yaml');
    if (safeRead(coordFile)) {
      phase = 'coordinating';
    } else if (safeRead(decompFile) || safeRead(planFile)) {
      phase = 'planning';
    } else if (safeRead(path.join(sessionDir, 'instruction.yaml'))) {
      phase = 'routing';
    } else {
      phase = 'unknown';
    }
    console.error(`[PreCompact] Phase inferred from artifacts: ${phase}`);
  }

  const coordContent = safeRead(path.join(sessionDir, 'workflow', 'coordination_log.yaml'));
  const coordState = extractCoordinationState(coordContent);

  const planContent = safeRead(path.join(sessionDir, 'workflow', 'plan.yaml'));
  const tier = planContent ? extractYamlValue(planContent, 'tier') : null;
  const domain = planContent ? (extractYamlValue(planContent, 'domain') || extractYamlValue(planContent, 'super_domain')) : null;

  // Team state
  const taskItems = parseTaskList(path.join(sessionDir, 'team', 'task_list.yaml'));
  const teamState = taskItems.length > 0 ? {
    total: taskItems.length,
    completed: taskItems.filter(i => i.status === 'completed').length,
    in_progress: taskItems.filter(i => i.status === 'in_progress').length,
    available: taskItems.filter(i => i.status === 'available' || i.status === 'pending').length
  } : null;

  let waypointContent = `# Waypoint created by PreCompact hook
id: ${waypointId}
type: pre_compact
phase: ${phase}
created_at: "${timestamp.toISOString()}"
trigger: context_compaction
`;

  if (tier || domain) {
    waypointContent += `\nplan:\n  tier: ${tier || 'unknown'}\n  domain: ${domain || 'unknown'}\n`;
  }

  if (coordState) {
    waypointContent += `\ncoordination:\n  controller: ${coordState.controller || 'unknown'}\n  status: ${coordState.status || 'unknown'}\n  questions_pending: ${coordState.questions_pending}\n  has_synthesis: ${coordState.has_synthesis}\n  work_items:\n    completed: ${coordState.work_items.completed}\n    in_progress: ${coordState.work_items.in_progress}\n    pending: ${coordState.work_items.pending}\n`;
  }

  if (teamState) {
    waypointContent += `\nteam:\n  total_items: ${teamState.total}\n  completed: ${teamState.completed}\n  in_progress: ${teamState.in_progress}\n  available: ${teamState.available}\n`;
  }

  // 5-Question Reboot Check (inspired by planning-with-files Manus pattern)
  // Answers: Where am I? Where am I going? What's the goal? What have I learned? What have I done?
  // planContent already declared above (line 92) - reuse it
  const goal = planContent ? (extractYamlValue(planContent, 'mission') || extractYamlValue(planContent, 'request') || 'See plan.yaml') : 'No plan.yaml found';

  const remainingPhases = [];
  if (phase === 'routing' || phase === 'INIT') remainingPhases.push('planning', 'coordinating', 'executing', 'validating');
  else if (phase === 'planning' || phase === 'ORCHESTRATED' || phase === 'PLANNED') remainingPhases.push('coordinating', 'executing', 'validating');
  else if (phase === 'coordinating' || phase === 'PROMPTS_READY' || phase === 'DECOMPOSED') remainingPhases.push('executing', 'validating');
  else if (phase === 'executing' || phase === 'COORDINATED') remainingPhases.push('validating');

  const findingsPath = path.join(sessionDir, 'findings.md');
  const findingsContent = safeRead(findingsPath);
  const hasFindings = findingsContent && findingsContent.length > 50;

  const progressPath = path.join(sessionDir, 'progress.md');
  const progressContent = safeRead(progressPath);
  const hasProgress = progressContent && progressContent.length > 50;

  waypointContent += `\nreboot_check:\n  where_am_i: "${phase}"\n  where_going: "${remainingPhases.length > 0 ? remainingPhases.join(' -> ') : 'validation/complete'}"\n  whats_the_goal: "${goal.replace(/"/g, '\\"').substring(0, 200)}"\n  what_learned: "${hasFindings ? 'See findings.md' : 'No findings captured yet'}"\n  what_done: "${hasProgress ? 'See progress.md' : coordState ? `${coordState.work_items.completed} items completed` : 'Check coordination_log.yaml'}"\n`;

  waypointContent += `\nrecovery:\n  read_files:\n    - status.yaml\n    - workflow/plan.yaml\n    - workflow/coordination_log.yaml\n  resume_phase: ${phase}\n  next_action: "${getNextAction(phase, coordState)}"\n`;

  fs.writeFileSync(waypointFile, waypointContent);
  console.error(`[PreCompact] Saved waypoint ${waypointId} (phase: ${phase})`);

  return {
    continue: true,
    systemMessage: `cAgents: Workflow state saved (${waypointId}, phase: ${phase}). Read the waypoint file after compaction to restore context.`
  };
});
