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
const { createHook, findActiveSession, safeRead, extractYamlValue, withFileLock, AGENT_MEMORY_DIR, MAX_ATTENTION_CHARS } = require('./hook-utils.cjs');

// Tool call counter for strategic compaction suggestions (v10.6.0)
// Tracks calls per session to suggest /compact at phase transitions.
const COMPACTION_THRESHOLD = 50; // Suggest compaction after this many tool calls
const toolCallCountFile = path.join(AGENT_MEMORY_DIR, '_system', 'tool_call_count.json');

// Injection cooldown: minimum tool calls between systemMessage injections (v10.22.6)
// Prevents attention spam on every Write/Edit/Bash call during high-frequency workflows.
const INJECTION_COOLDOWN = 5; // Minimum tool calls between injections
const injectionCooldownFile = path.join(AGENT_MEMORY_DIR, '_system', 'injection_cooldown.json');

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
  return withFileLock(toolCallCountFile, () => {
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
  });
}

function incrementInjectionCooldown(sessionId) {
  return withFileLock(injectionCooldownFile, () => {
    let counts = {};
    try {
      const data = safeRead(injectionCooldownFile);
      if (data) counts = JSON.parse(data);
    } catch { /* ignore */ }
    // If undefined (first call for session), start at INJECTION_COOLDOWN + 1 so the
    // very first injection fires immediately. After reset, subsequent calls increment
    // from 0, reaching INJECTION_COOLDOWN on the 5th call.
    counts[sessionId] = counts[sessionId] === undefined
      ? INJECTION_COOLDOWN + 1
      : counts[sessionId] + 1;
    try {
      const dir = path.dirname(injectionCooldownFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(injectionCooldownFile, JSON.stringify(counts));
    } catch { /* ignore */ }
    return counts[sessionId];
  });
}

function resetInjectionCooldown(sessionId) {
  withFileLock(injectionCooldownFile, () => {
    let counts = {};
    try {
      const data = safeRead(injectionCooldownFile);
      if (data) counts = JSON.parse(data);
    } catch { /* ignore */ }
    counts[sessionId] = 0;
    try {
      const dir = path.dirname(injectionCooldownFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(injectionCooldownFile, JSON.stringify(counts));
    } catch { /* ignore */ }
  });
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

/**
 * Strip control characters (char codes < 32) from a string and cap at maxLen.
 * Prevents injection of escape sequences or ANSI codes from plan.yaml fields.
 */
function sanitizeField(value, maxLen = 200) {
  if (!value) return value;
  // eslint-disable-next-line no-control-regex
  const stripped = value.replace(/[\x00-\x1F\x7F]/g, '');
  return stripped.length > maxLen ? stripped.slice(0, maxLen) : stripped;
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

  // Fallback: read strategic_brief.yaml for org/review sessions that lack plan.yaml
  let briefContent = null;
  if (!planContent) {
    briefContent = safeRead(path.join(sessionDir, 'workflow', 'strategic_brief.yaml'))
      || safeRead(path.join(sessionDir, 'strategic_brief.yaml'));
    if (!briefContent) return null;
  }

  // Helper to extract indented fields from strategic_brief.yaml
  function extractBriefField(content, key) {
    const regex = new RegExp(`^\\s+${key}:\\s*["']?([^"'\\n]+)["']?`, 'm');
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }

  // Extract key fields — sanitize to prevent control char injection, cap at 200 chars each
  const mission = sanitizeField(
    planContent
      ? (extractYamlValue(planContent, 'mission') || extractYamlValue(planContent, 'request'))
      : extractBriefField(briefContent, 'mission')
  );
  const domain = sanitizeField(
    planContent
      ? (extractYamlValue(planContent, 'domain') || extractYamlValue(planContent, 'super_domain'))
      : extractBriefField(briefContent, 'domain')
  );
  const controller = sanitizeField(
    planContent
      ? (extractYamlValue(planContent, 'primary') || extractYamlValue(planContent, 'controller'))
      : extractBriefField(briefContent, 'controller')
  );

  // Build concise goal reminder
  const planSummary = planContent ? extractPlanSummary(planContent) : null;
  if (!planSummary && !mission) return null;

  let reminder = '[cAgents Goal Refresh]';
  if (mission) reminder += `\nMission: ${mission}`;
  if (domain) reminder += ` | Domain: ${domain}`;
  if (controller) reminder += ` | Controller: ${controller}`;

  // Check coordination progress if available
  const coordPath = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
  const coordContent = safeRead(coordPath);
  if (coordContent) {
    const rawStatus = extractYamlValue(coordContent, 'status');
    const status = sanitizeField(rawStatus);
    if (status) reminder += `\nCoordination: ${status}`;
  }

  // Delegation mandate injection for pre-COORDINATED states (V10.22.6)
  // Pipeline states before COORDINATED are phases where agents have not yet been spawned.
  // Injecting a delegation reminder during these phases prevents self-handling rationalizations
  // on every Write/Edit/Bash call before the controller gets to work.
  const PRE_COORDINATED_STATES = ['INIT', 'ORCHESTRATED', 'PLANNED', 'DECOMPOSED', 'PROMPTS_READY'];
  const statusPath = path.join(sessionDir, 'status.yaml');
  const statusContent = safeRead(statusPath);
  if (statusContent) {
    const pipelineState = extractYamlValue(statusContent, 'pipeline_state');
    if (pipelineState && PRE_COORDINATED_STATES.includes(pipelineState)) {
      reminder += '\n[DELEGATION MANDATE] Pipeline state: ' + pipelineState + '. ' +
        'Self-handling is FORBIDDEN. ALL work must be delegated to subagents via the Task tool. ' +
        'Do NOT write code, edit files, or implement anything directly. ' +
        'Spawn the next pipeline agent and wait for its output.';
    }
  }

  // Only inject if we have meaningful content
  if (reminder === '[cAgents Goal Refresh]') return null;

  // Strategic compaction suggestion (v10.6.0)
  // Track tool calls and suggest /compact at phase transitions
  const sessionId = path.basename(sessionDir);
  const callCount = incrementToolCallCount(sessionId);

  // Injection cooldown (v10.22.6): skip systemMessage if fewer than INJECTION_COOLDOWN
  // calls have elapsed since the last injection. Prevents attention spam on busy workflows.
  const callsSinceLastInjection = await incrementInjectionCooldown(sessionId);
  if (callsSinceLastInjection < INJECTION_COOLDOWN) {
    return null;
  }

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

  // Reset injection cooldown — we're injecting now. Next INJECTION_COOLDOWN calls will be skipped.
  resetInjectionCooldown(sessionId);

  return {
    continue: true,
    systemMessage: reminder
  };
});
