#!/usr/bin/env node
/**
 * PostCompact Hook - Log workflow context to disk after context compaction
 * cAgents v12.11.0+ (thinking-400 fix, session run_team-thinking-400_260531_001)
 *
 * After context compaction discards the conversation history, this hook
 * logs key workflow state to disk so the model can resume by reading
 * plan.yaml + coordination_log.yaml directly.
 *
 * Reads from the active session:
 *   - workflow/plan.yaml   -> mission, domain
 *   - status.yaml          -> current phase
 *   - workflow/coordination_log.yaml -> work item progress
 *
 * Output: Returns { continue: true } (no systemMessage) to avoid violating
 * the Anthropic API thinking-block immutability contract. Previously emitted
 * a systemMessage that could attach to the just-rewritten assistant turn's
 * content array, modifying its thinking blocks in violation of the API.
 *
 * Resume path: the model reads plan.yaml + coordination_log.yaml after
 * compaction; the file write at cagents-memory/_system/logs/post-compact_*.log
 * preserves the advisory restore-text for audit/troubleshooting.
 *
 * Returns null (no-op) when no active session is found.
 */

const fs = require('fs');
const path = require('path');
const { createHook, findActiveSession, extractYamlValue, safeRead, countPattern, ensureDir, AGENT_MEMORY_DIR } = require('./hook-utils.cjs');

createHook('PostCompactRestore', async (input) => {
  const sessionDir = findActiveSession(input.session_id);
  if (!sessionDir) return null;

  // Read plan.yaml for mission and domain
  const planContent = safeRead(path.join(sessionDir, 'workflow', 'plan.yaml'));

  // Fallback: read strategic_brief.yaml for org/review sessions that lack plan.yaml
  let briefContent = null;
  if (!planContent) {
    briefContent = safeRead(path.join(sessionDir, 'workflow', 'strategic_brief.yaml'))
      || safeRead(path.join(sessionDir, 'strategic_brief.yaml'));
  }
  function extractBriefField(content, key) {
    const regex = new RegExp(`^\\s+${key}:\\s*["']?([^"'\\n]+)["']?`, 'm');
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }

  const mission = planContent
    ? (extractYamlValue(planContent, 'mission') || extractYamlValue(planContent, 'request') || null)
    : (briefContent ? extractBriefField(briefContent, 'mission') : null);
  const domain = planContent
    ? (extractYamlValue(planContent, 'domain') || extractYamlValue(planContent, 'super_domain') || null)
    : (briefContent ? (extractBriefField(briefContent, 'domain') || extractBriefField(briefContent, 'super_domain')) : null);

  // Read status.yaml for current phase
  const statusContent = safeRead(path.join(sessionDir, 'status.yaml'));
  const phase = statusContent
    ? (extractYamlValue(statusContent, 'phase') ||
       extractYamlValue(statusContent, 'current_phase') ||
       extractYamlValue(statusContent, 'pipeline_state') ||
       null)
    : null;

  // Read coordination_log.yaml for work item counts
  const coordContent = safeRead(path.join(sessionDir, 'workflow', 'coordination_log.yaml'));
  let workSummary = null;
  if (coordContent) {
    const completed = countPattern(coordContent, /status:\s*completed/g);
    const inProgress = countPattern(coordContent, /status:\s*in_progress/g);
    const pending = countPattern(coordContent, /status:\s*pending/g);
    const controller = extractYamlValue(coordContent, 'controller');
    const coordStatus = extractYamlValue(coordContent, 'status');
    workSummary = { completed, inProgress, pending, controller, coordStatus };
  }

  // Build compact re-injection message (target: under 500 tokens)
  const lines = ['[cAgents: Context restored after compaction]'];

  if (mission) {
    lines.push(`Goal: ${mission.substring(0, 150)}`);
  }
  if (domain || phase) {
    const parts = [];
    if (domain) parts.push(`domain=${domain}`);
    if (phase) parts.push(`phase=${phase}`);
    lines.push(`State: ${parts.join(', ')}`);
  }
  if (workSummary) {
    const total = workSummary.completed + workSummary.inProgress + workSummary.pending;
    if (workSummary.controller) {
      lines.push(`Controller: ${workSummary.controller}`);
    }
    if (total > 0) {
      lines.push(`Work items: ${workSummary.completed} done, ${workSummary.inProgress} in progress, ${workSummary.pending} pending`);
    }
    if (workSummary.coordStatus) {
      lines.push(`Coordination: ${workSummary.coordStatus}`);
    }
  }

  lines.push(`Resume from current phase. Read ${planContent ? 'plan.yaml' : 'strategic_brief.yaml'} + coordination_log.yaml if context is needed.`);

  // thinking-400 fix (run_team-thinking-400_260531_001): write advisory restore
  // text to disk instead of returning a systemMessage. PostCompact systemMessage
  // could attach to the just-rewritten assistant turn's content array, violating
  // the Anthropic API thinking-block immutability contract. The model resumes by
  // reading plan.yaml + coordination_log.yaml directly after compaction.
  try {
    const logsDir = ensureDir(path.join(AGENT_MEMORY_DIR, '_system', 'logs'));
    const dateSlug = new Date().toISOString().slice(0, 10);
    const logFile = path.join(logsDir, `post-compact_${dateSlug}.log`);
    fs.appendFileSync(logFile, `\n--- ${new Date().toISOString()} session=${path.basename(sessionDir)} ---\n${lines.join('\n')}\n`);
  } catch { /* best effort - never block compaction recovery */ }

  return { continue: true };
});
