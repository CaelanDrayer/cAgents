#!/usr/bin/env node
/**
 * Attention Injection Hook - Refresh goals before tool operations
 * cAgents V10.3.0 - PreToolUse hook for combating goal drift
 *
 * Inspired by planning-with-files' Manus-style attention manipulation:
 * Before Write/Edit/Bash operations during active sessions, injects
 * plan objectives as additionalContext to keep goals in the attention window.
 *
 * This combats the "lost in the middle" effect where original goals fade
 * from attention after many tool calls.
 *
 * Input (stdin): JSON with tool_name, tool_input from PreToolUse event
 * Output (stdout): JSON with allow + systemMessage containing plan objectives
 */

const fs = require('fs');
const path = require('path');
const { createHook, findActiveSession, safeRead, extractYamlValue, AGENT_MEMORY_DIR, MAX_ATTENTION_CHARS } = require('./hook-utils.cjs');

// Tool call counter for strategic compaction suggestions (v10.6.0)
// Tracks calls per session to suggest /compact at phase transitions.
const COMPACTION_THRESHOLD = 50; // Suggest compaction after this many tool calls
const toolCallCountFile = path.join(AGENT_MEMORY_DIR, '_system', 'tool_call_count.json');

function getToolCallCount(sessionId) {
  try {
    const data = safeRead(toolCallCountFile);
    if (data) {
      const counts = JSON.parse(data);
      return counts[sessionId] || 0;
    }
  } catch { /* ignore */ }
  return 0;
}

function incrementToolCallCount(sessionId) {
  let counts = {};
  try {
    const data = safeRead(toolCallCountFile);
    if (data) counts = JSON.parse(data);
  } catch { /* ignore */ }
  counts[sessionId] = (counts[sessionId] || 0) + 1;
  try {
    const dir = path.dirname(toolCallCountFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(toolCallCountFile, JSON.stringify(counts));
  } catch { /* ignore */ }
  return counts[sessionId];
}

/**
 * Extract concise objectives from plan.yaml content.
 * Returns first ~20 meaningful lines (mission, objectives, controller).
 */
function extractPlanSummary(planContent) {
  if (!planContent) return null;

  const lines = planContent.split('\n');
  const summary = [];
  let lineCount = 0;

  for (const line of lines) {
    // Skip empty lines and comments at start
    if (lineCount === 0 && (!line.trim() || line.trim().startsWith('#'))) continue;

    // Stop at 20 meaningful lines
    if (lineCount >= 20) break;

    // Skip verbose sections (implementation_steps details, etc.)
    if (line.match(/^\s{4,}/) && lineCount > 10) continue;

    summary.push(line);
    lineCount++;
  }

  return summary.length > 0 ? summary.join('\n') : null;
}

createHook('AttentionInjection', async (input) => {
  const toolName = input.tool_name || '';

  // Only inject for Write, Edit, Bash operations
  if (!['Write', 'Edit', 'Bash'].includes(toolName)) return null;

  const sessionDir = findActiveSession(input.session_id);
  if (!sessionDir) return null;

  // Check if session has a plan.yaml (active pipeline)
  const planPath = path.join(sessionDir, 'workflow', 'plan.yaml');
  const planContent = safeRead(planPath);
  if (!planContent) return null;

  // Extract key fields
  const mission = extractYamlValue(planContent, 'mission') || extractYamlValue(planContent, 'request');
  const domain = extractYamlValue(planContent, 'domain') || extractYamlValue(planContent, 'super_domain');
  const controller = extractYamlValue(planContent, 'primary') || extractYamlValue(planContent, 'controller');

  // Build concise goal reminder
  const planSummary = extractPlanSummary(planContent);
  if (!planSummary && !mission) return null;

  let reminder = '[cAgents Goal Refresh]';
  if (mission) reminder += `\nMission: ${mission}`;
  if (domain) reminder += ` | Domain: ${domain}`;
  if (controller) reminder += ` | Controller: ${controller}`;

  // Check coordination progress if available
  const coordPath = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
  const coordContent = safeRead(coordPath);
  if (coordContent) {
    const status = extractYamlValue(coordContent, 'status');
    if (status) reminder += `\nCoordination: ${status}`;
  }

  // Only inject if we have meaningful content
  if (reminder === '[cAgents Goal Refresh]') return null;

  // Strategic compaction suggestion (v10.6.0)
  // Track tool calls and suggest /compact at phase transitions
  const sessionId = path.basename(sessionDir);
  const callCount = incrementToolCallCount(sessionId);

  if (callCount > 0 && callCount % COMPACTION_THRESHOLD === 0) {
    // Check if we're at a phase transition (status just changed)
    const statusContent = safeRead(path.join(sessionDir, 'status.yaml'));
    const currentPhase = statusContent
      ? (extractYamlValue(statusContent, 'pipeline_state') || extractYamlValue(statusContent, 'phase'))
      : null;

    if (currentPhase) {
      reminder += `\n[Compaction hint: ${callCount} tool calls in session. Consider /compact if context feels crowded.]`;
    }
  }

  // Truncate to MAX_ATTENTION_CHARS budget (v10.6.0)
  if (reminder.length > MAX_ATTENTION_CHARS) {
    reminder = reminder.slice(0, MAX_ATTENTION_CHARS - 3) + '...';
  }

  return {
    continue: true,
    systemMessage: reminder
  };
});
