#!/usr/bin/env node
/**
 * Goal Evaluator Logger Hook - Stop event
 * cAgents V11.3.0 (REC-4 from goal.md integration analysis)
 *
 * Captures the latest /goal evaluator reason and appends it to the active
 * session's workflow/goal_evaluator_log.yaml. The captured reasons become a
 * free second-opinion signal that cagents:self-correct consumes
 * during revision routing.
 *
 * Activation:
 *   - Only logs when /goal is detected as active in the input payload.
 *   - No-op when /goal inactive or no active cAgents session.
 *   - Never blocks (returns continue: true unconditionally).
 *
 * Detection signals for active /goal (in input from Stop hook payload):
 *   - input.goal.active === true
 *   - input.goal_state.active === true
 *   - input.goal.condition (string present)
 *
 * Latest evaluator reason field (input):
 *   - input.goal.evaluator_reason
 *   - input.goal_state.evaluator_reason
 *   - input.goal.last_reason
 *
 * Output file: {SESSION_DIR}/workflow/goal_evaluator_log.yaml (append-only)
 *
 * Input (stdin): JSON Stop event payload from Claude Code
 * Output (stdout): JSON {continue: true} (non-blocking)
 */

const fs = require('fs');
const path = require('path');
const { createHook, findActiveSession, withFileLock } = require('./hook-utils.cjs');

/**
 * Extract /goal state from the Stop hook input payload.
 * Tolerates multiple shapes the harness may emit.
 *
 * Returns { active: boolean, condition: string|null, reason: string|null,
 *           turn: number|null, evaluator_verdict: string|null }
 */
function extractGoalState(input) {
  const goal = input.goal || input.goal_state || {};
  const active = goal.active === true || typeof goal.condition === 'string';
  const reason = goal.evaluator_reason || goal.last_reason || goal.reason || null;
  const condition = typeof goal.condition === 'string' ? goal.condition : null;
  const turn = typeof goal.turn === 'number' ? goal.turn
    : typeof goal.turns_evaluated === 'number' ? goal.turns_evaluated
    : null;
  const verdict = goal.evaluator_verdict || goal.verdict || null;
  return { active, condition, reason, turn, evaluator_verdict: verdict };
}

/**
 * Serialize a YAML log entry without pulling in a YAML library.
 * The format mirrors append-only log files used elsewhere in cAgents
 * (e.g., workflow/file_changes.log) but emits valid YAML list entries.
 */
function formatLogEntry({ timestamp, condition, reason, turn, verdict }) {
  // YAML-safe quoting: escape backslashes and double quotes in strings.
  const q = (s) => {
    if (s === null || s === undefined) return 'null';
    const escaped = String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escaped}"`;
  };
  const lines = [
    `- timestamp: ${q(timestamp)}`,
    `  condition: ${q(condition)}`,
    `  evaluator_reason: ${q(reason)}`,
    `  turn: ${turn === null ? 'null' : turn}`,
    `  verdict: ${q(verdict)}`,
  ];
  return lines.join('\n') + '\n';
}

createHook('GoalEvaluatorLogger', async (input) => {
  const goal = extractGoalState(input);
  if (!goal.active || !goal.reason) {
    // No active /goal or no reason to capture — no-op.
    return null;
  }

  const sessionDir = findActiveSession(input.session_id);
  if (!sessionDir) {
    // No active cAgents session — no-op (e.g., bare /goal outside a /run).
    return null;
  }

  try {
    const workflowDir = path.join(sessionDir, 'workflow');
    if (!fs.existsSync(workflowDir)) {
      fs.mkdirSync(workflowDir, { recursive: true });
    }
    const logFile = path.join(workflowDir, 'goal_evaluator_log.yaml');

    // Initialize file with header on first write so the file is valid YAML.
    if (!fs.existsSync(logFile)) {
      const header = '# /goal evaluator reason log (V11.3.0)\n'
        + '# Appended by .claude/hooks/goal-evaluator-logger.cjs on Stop events\n'
        + '# Consumed by cagents:self-correct as revision signal\n'
        + 'entries:\n';
      fs.writeFileSync(logFile, header);
    }

    const entry = formatLogEntry({
      timestamp: new Date().toISOString(),
      condition: goal.condition,
      reason: goal.reason,
      turn: goal.turn,
      verdict: goal.evaluator_verdict,
    });

    // Append with two-space indent so each entry sits under `entries:`.
    // WI-5: lock around append to prevent interleaving from concurrent hook procs.
    const indented = entry.split('\n').map((l) => l ? '  ' + l : l).join('\n');
    withFileLock(logFile, () => { fs.appendFileSync(logFile, indented); });
  } catch (error) {
    // Log to stderr but never block — this is purely advisory signal capture.
    console.error(`[GoalEvaluatorLogger] Failed to append: ${error.message}`);
  }

  return null; // Non-blocking
});
