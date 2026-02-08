#!/usr/bin/env node
/**
 * PreCompact Hook - Save critical state before context compaction
 * cAgents V9.0 - Enhanced with coordination state and resume instructions
 *
 * This hook runs BEFORE Claude Code compacts the context window.
 * It saves critical workflow state that must survive compaction,
 * including controller coordination state and explicit resume instructions.
 *
 * 100% Self-Contained: Uses only built-in Node.js modules.
 *
 * Input (stdin): JSON with session context
 * Output (stdout): JSON with continue status
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
    readStdin: () => Promise.resolve({}),
    findActiveSession: () => null,
    extractYamlValue: () => null,
    safeRead: () => null,
    countPattern: () => 0,
    getTimestampSlug: () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19),
    getWaypointPath: () => '/tmp/wp.yaml',
    parseTaskList: () => []
  };
}

const { readStdin, findActiveSession, extractYamlValue, safeRead, countPattern, getTimestampSlug, getWaypointPath, parseTaskList } = utils;

/**
 * Extract controller coordination state from coordination_log.yaml
 */
function extractCoordinationState(coordContent) {
  if (!coordContent) return null;

  const state = {};

  // Extract controller name
  const controller = extractYamlValue(coordContent, 'controller');
  if (controller) state.controller = controller;

  // Extract coordination status
  const status = extractYamlValue(coordContent, 'status');
  if (status) state.status = status;

  // Count questions asked vs answered
  const questionsAsked = countPattern(coordContent, /question:/g);
  const questionsAnswered = countPattern(coordContent, /answer:/g);
  state.questions_asked = questionsAsked;
  state.questions_answered = questionsAnswered;
  state.questions_pending = Math.max(0, questionsAsked - questionsAnswered);

  // Count work item statuses
  state.work_items = {
    completed: countPattern(coordContent, /status:\s*completed/g),
    in_progress: countPattern(coordContent, /status:\s*in_progress/g),
    pending: countPattern(coordContent, /status:\s*pending/g),
    blocked: countPattern(coordContent, /status:\s*blocked/g)
  };

  // Check if synthesis exists
  state.has_synthesis = coordContent.includes('synthesized_solution:') || coordContent.includes('synthesis:');

  // Check for implementation tasks
  state.has_implementation_tasks = coordContent.includes('implementation_tasks:');

  return state;
}

/**
 * Extract plan objectives from plan.yaml
 */
function extractPlanState(planContent) {
  if (!planContent) return null;

  const state = {};

  const tier = extractYamlValue(planContent, 'tier');
  if (tier) state.tier = tier;

  const domain = extractYamlValue(planContent, 'domain') || extractYamlValue(planContent, 'super_domain');
  if (domain) state.domain = domain;

  // Count objectives
  state.objective_count = countPattern(planContent, /- id:\s*OBJ/g) || countPattern(planContent, /objective/gi);

  return state;
}

/**
 * Extract team state if this is a team session
 */
function extractTeamState(sessionDir) {
  const taskListPath = path.join(sessionDir, 'team', 'task_list.yaml');
  const items = parseTaskList(taskListPath);

  if (items.length === 0) return null;

  const completed = items.filter(i => i.status === 'completed').length;
  const inProgress = items.filter(i => i.status === 'in_progress').length;
  const available = items.filter(i => i.status === 'available' || i.status === 'pending').length;

  return {
    total: items.length,
    completed,
    in_progress: inProgress,
    available,
    percent_complete: Math.round((completed / items.length) * 100)
  };
}

/**
 * Generate explicit resume instructions based on current state
 */
function generateResumeInstructions(phase, coordState, planState, teamState) {
  const instructions = [];

  instructions.push('## Resume Instructions');
  instructions.push('');
  instructions.push('1. Read these files to restore context:');
  instructions.push('   - status.yaml (current phase)');
  instructions.push('   - workflow/plan.yaml (objectives)');
  instructions.push('   - workflow/coordination_log.yaml (Q&A, synthesis, tasks)');

  if (teamState) {
    instructions.push('   - team/task_list.yaml (team work items)');
  }

  instructions.push('');

  switch (phase) {
    case 'routing':
      instructions.push('2. Phase: routing - Classify the request tier and domain');
      instructions.push('3. Next: Run universal-router to classify tier and domain');
      break;

    case 'planning':
      instructions.push('2. Phase: planning - Create plan with objectives and controller assignment');
      instructions.push('3. Next: Run universal-planner to decompose and create plan.yaml');
      break;

    case 'coordinating':
      if (coordState) {
        instructions.push(`2. Phase: coordinating (controller: ${coordState.controller || 'unknown'})`);
        if (coordState.questions_pending > 0) {
          instructions.push(`3. Next: Answer ${coordState.questions_pending} pending question(s) via delegation`);
        } else if (!coordState.has_synthesis) {
          instructions.push('3. Next: Synthesize answers into coherent solution');
        } else if (!coordState.has_implementation_tasks) {
          instructions.push('3. Next: Create implementation tasks from synthesis');
        } else {
          instructions.push('3. Next: Complete remaining implementation tasks');
        }
      } else {
        instructions.push('2. Phase: coordinating - Continue controller coordination');
        instructions.push('3. Next: Check coordination_log.yaml for pending work');
      }
      break;

    case 'executing':
      instructions.push('2. Phase: executing - Monitor controller progress');
      if (coordState) {
        const remaining = coordState.work_items.in_progress + coordState.work_items.pending;
        instructions.push(`3. Next: ${remaining} work item(s) remaining`);
      } else {
        instructions.push('3. Next: Check coordination_log for remaining work items');
      }
      break;

    case 'validating':
      instructions.push('2. Phase: validating - Verify completion criteria');
      instructions.push('3. Next: Run universal-validator to check all work items');
      break;

    default:
      instructions.push(`2. Phase: ${phase} - Check status.yaml for details`);
      instructions.push('3. Next: Determine appropriate action for current phase');
  }

  if (teamState) {
    instructions.push('');
    instructions.push(`4. Team progress: ${teamState.completed}/${teamState.total} items (${teamState.percent_complete}%)`);
    if (teamState.available > 0) {
      instructions.push(`   ${teamState.available} work item(s) available for assignment`);
    }
  }

  return instructions.join('\n');
}

/**
 * Create enhanced waypoint snapshot
 */
function createWaypoint(sessionDir) {
  const timestamp = new Date();
  const tsSlug = getTimestampSlug(timestamp);
  const waypointId = `WP-compact-${tsSlug}`;
  const waypointFile = getWaypointPath(sessionDir, 'compact', timestamp);

  // Gather state from various files
  const statusFile = path.join(sessionDir, 'status.yaml');
  const coordFile = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
  const planFile = path.join(sessionDir, 'workflow', 'plan.yaml');

  const statusContent = safeRead(statusFile);
  const phase = statusContent ? (extractYamlValue(statusContent, 'phase') || 'unknown') : 'unknown';

  const coordContent = safeRead(coordFile);
  const coordState = extractCoordinationState(coordContent);

  const planContent = safeRead(planFile);
  const planState = extractPlanState(planContent);

  const teamState = extractTeamState(sessionDir);

  // Generate resume instructions
  const resumeInstructions = generateResumeInstructions(phase, coordState, planState, teamState);

  // Create waypoint content
  const isoTimestamp = timestamp.toISOString();

  let waypointContent = `# Waypoint created by PreCompact hook
# cAgents V9.0 - Enhanced with coordination state
id: ${waypointId}
type: pre_compact
phase: ${phase}
created_at: "${isoTimestamp}"
trigger: context_compaction
`;

  // Plan state
  if (planState) {
    waypointContent += `
plan:
  tier: ${planState.tier || 'unknown'}
  domain: ${planState.domain || 'unknown'}
  objectives: ${planState.objective_count || 0}
`;
  }

  // Coordination state
  if (coordState) {
    waypointContent += `
coordination:
  controller: ${coordState.controller || 'unknown'}
  status: ${coordState.status || 'unknown'}
  questions_asked: ${coordState.questions_asked}
  questions_answered: ${coordState.questions_answered}
  questions_pending: ${coordState.questions_pending}
  has_synthesis: ${coordState.has_synthesis}
  has_implementation_tasks: ${coordState.has_implementation_tasks}
  work_items:
    completed: ${coordState.work_items.completed}
    in_progress: ${coordState.work_items.in_progress}
    pending: ${coordState.work_items.pending}
    blocked: ${coordState.work_items.blocked}
`;
  }

  // Team state
  if (teamState) {
    waypointContent += `
team:
  total_items: ${teamState.total}
  completed: ${teamState.completed}
  in_progress: ${teamState.in_progress}
  available: ${teamState.available}
  percent_complete: ${teamState.percent_complete}
`;
  }

  // Recovery section
  waypointContent += `
recovery:
  read_files:
    - status.yaml
    - workflow/plan.yaml
    - workflow/coordination_log.yaml`;

  if (teamState) {
    waypointContent += `
    - team/task_list.yaml`;
  }

  waypointContent += `
  resume_phase: ${phase}
  next_action: "${getNextAction(phase, coordState)}"

snapshot:
  session_dir: "${sessionDir}"
  timestamp: "${isoTimestamp}"

${resumeInstructions}
`;

  fs.writeFileSync(waypointFile, waypointContent);
  return { waypointId, resumeInstructions, phase };
}

/**
 * Get concise next action description
 */
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

/**
 * Main hook execution
 */
async function main() {
  await readStdin();

  try {
    const sessionDir = findActiveSession();

    if (sessionDir) {
      const { waypointId, phase } = createWaypoint(sessionDir);
      console.error(`[PreCompact] Saved enhanced waypoint ${waypointId} (phase: ${phase})`);

      console.log(JSON.stringify({
        continue: true,
        systemMessage: `cAgents: Workflow state saved (${waypointId}, phase: ${phase}). Read the waypoint file after compaction to restore context and resume.`
      }));
    } else {
      console.log(JSON.stringify({ continue: true }));
    }
  } catch (error) {
    console.error(`[PreCompact] Error: ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
  }
}

main();

} catch (e) {
  // Top-level catch for plugin resilience - always output valid JSON
  console.log(JSON.stringify({ continue: true }));
}
