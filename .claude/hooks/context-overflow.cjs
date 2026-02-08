#!/usr/bin/env node
/**
 * ContextOverflow Hook - Save exhaustion checkpoint when context limit is reached
 * cAgents V9.0 - Hook System Enhancement
 *
 * This hook fires when the context limit is reached. It saves an exhaustion
 * checkpoint and creates a continuation_needed.yaml for recovery.
 *
 * 100% Self-Contained: Uses only built-in Node.js modules.
 *
 * Input (stdin): JSON with session context
 * Output (stdout): JSON with continue status and system message
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
    findActiveSession: () => null,
    extractYamlValue: () => null,
    safeRead: () => null,
    countPattern: () => 0,
    ensureDir: (d) => { try { fs.mkdirSync(d, { recursive: true }); } catch {} return d; },
    getTimestampSlug: (d = new Date()) => d.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19),
    getWaypointPath: (sessionDir, type, date = new Date()) => {
      const waypointsDir = path.join(sessionDir, 'waypoints');
      try { fs.mkdirSync(waypointsDir, { recursive: true }); } catch {}
      const slug = (date || new Date()).toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
      return path.join(waypointsDir, `wp-${type}-${slug}.yaml`);
    }
  };
}

const { readStdin, findActiveSession, extractYamlValue, safeRead, countPattern, ensureDir, getTimestampSlug, getWaypointPath } = utils;

function gatherPendingWork(sessionDir) {
  const items = [];
  const taskPlan = safeRead(path.join(sessionDir, 'task_plan.md'));
  if (taskPlan) {
    const pending = taskPlan.match(/^- \[ \] .+$/gm);
    if (pending) pending.forEach(line => items.push(line.replace('- [ ] ', '').trim()));
    return items;
  }
  const coordLog = safeRead(path.join(sessionDir, 'workflow', 'coordination_log.yaml'));
  if (coordLog) {
    const pendingCount = countPattern(coordLog, /status:\s*pending/g);
    const inProgressCount = countPattern(coordLog, /status:\s*in_progress/g);
    if (pendingCount) items.push(`${pendingCount} pending work items`);
    if (inProgressCount) items.push(`${inProgressCount} in-progress work items`);
  }
  return items;
}

function createExhaustionCheckpoint(sessionDir) {
  const now = new Date();
  const timestamp = now.toISOString();
  const tsSlug = getTimestampSlug(now);
  const wpFile = getWaypointPath(sessionDir, 'exhaustion', now);

  const statusContent = safeRead(path.join(sessionDir, 'status.yaml'));
  const phase = statusContent ? (extractYamlValue(statusContent, 'phase') || 'unknown') : 'unknown';
  const pendingWork = gatherPendingWork(sessionDir);

  const pendingYaml = pendingWork.length > 0
    ? pendingWork.map(w => `  - "${w.replace(/"/g, '\\"')}"`).join('\n')
    : '  - "none detected"';

  const content = `# Exhaustion checkpoint - context overflow
id: wp-exhaustion-${tsSlug}
type: exhaustion
phase: ${phase}
created_at: "${timestamp}"
trigger: context_overflow

pending_work:
${pendingYaml}

recovery:
  read_files:
    - task_plan.md
    - findings.md
    - progress.md
    - workflow/coordination_log.yaml
  resume_phase: ${phase}
  action: split_remaining_into_micro_tasks

snapshot:
  session_dir: "${sessionDir}"
  timestamp: "${timestamp}"
`;
  fs.writeFileSync(wpFile, content);

  const contFile = path.join(sessionDir, 'continuation_needed.yaml');
  const contContent = `reason: context_overflow
checkpoint_path: "${wpFile}"
suggested_action: split_and_retry
created_at: "${timestamp}"
`;
  fs.writeFileSync(contFile, contContent);

  return wpFile;
}

async function main() {
  await readStdin();
  try {
    const sessionDir = findActiveSession();
    if (sessionDir) {
      const wpPath = createExhaustionCheckpoint(sessionDir);
      console.error(`[ContextOverflow] Exhaustion checkpoint saved to ${wpPath}`);
      console.log(JSON.stringify({
        continue: true,
        systemMessage: `Context limit reached. Checkpoint saved at ${wpPath}. Invoke universal-self-correct with correction_type: context_overflow to split remaining work into micro-tasks and continue.`
      }));
    } else {
      console.log(JSON.stringify({ continue: true }));
    }
  } catch (error) {
    console.error(`[ContextOverflow] Error: ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
  }
}

main();

} catch (e) {
  // Top-level catch for plugin resilience - always output valid JSON
  console.log(JSON.stringify({ continue: true }));
}
