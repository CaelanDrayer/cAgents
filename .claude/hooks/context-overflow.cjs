#!/usr/bin/env node
/**
 * ContextOverflow Hook - Save exhaustion checkpoint when context limit is reached
 * cAgents V8.0 - Hook System Enhancement
 *
 * This hook fires when the context limit is reached. It saves an exhaustion
 * checkpoint and creates a continuation_needed.yaml for recovery.
 *
 * 100% Self-Contained: Uses only built-in Node.js modules.
 *
 * Input (stdin): JSON with session context
 * Output (stdout): JSON with continue status and system message
 */

const fs = require('fs');
const path = require('path');

const AGENT_MEMORY_DIR = process.env.CLAUDE_PROJECT_DIR
  ? path.join(process.env.CLAUDE_PROJECT_DIR, 'Agent_Memory')
  : path.join(process.cwd(), 'Agent_Memory');

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    if (process.stdin.isTTY) { resolve({}); return; }
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({}); }
    });
    process.stdin.on('error', () => resolve({}));
    setTimeout(() => resolve({}), 1000);
  });
}

function extractYamlValue(content, key) {
  const regex = new RegExp(`^${key}:\\s*(.+)$`, 'm');
  const match = content.match(regex);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

function safeRead(filePath) {
  try { return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null; }
  catch { return null; }
}

function findActiveSession() {
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) return null;
  const sessions = fs.readdirSync(sessionsDir)
    .filter(d => d.startsWith('run_') || d.startsWith('optimize_') || d.startsWith('review_') || d.startsWith('designer_'))
    .sort().reverse();
  for (const session of sessions) {
    const statusFile = path.join(sessionsDir, session, 'status.yaml');
    const content = safeRead(statusFile);
    if (content && !content.includes('phase: completed') && !content.includes('phase: failed')) {
      return path.join(sessionsDir, session);
    }
  }
  return null;
}

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
    const pendingCount = (coordLog.match(/status:\s*pending/g) || []).length;
    const inProgressCount = (coordLog.match(/status:\s*in_progress/g) || []).length;
    if (pendingCount) items.push(`${pendingCount} pending work items`);
    if (inProgressCount) items.push(`${inProgressCount} in-progress work items`);
  }
  return items;
}

function createExhaustionCheckpoint(sessionDir) {
  const waypointsDir = path.join(sessionDir, 'waypoints');
  fs.mkdirSync(waypointsDir, { recursive: true });

  const timestamp = new Date().toISOString();
  const tsSlug = timestamp.replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const wpFile = path.join(waypointsDir, `wp-exhaustion-${tsSlug}.yaml`);

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
