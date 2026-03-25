#!/usr/bin/env node
/**
 * PostCompact Hook - Re-inject workflow context after context compaction
 * cAgents V10.23.0
 *
 * After context compaction discards the conversation history, this hook
 * re-injects key workflow state so the model can resume without disorientation.
 *
 * Reads from the active session:
 *   - workflow/plan.yaml   -> mission, domain
 *   - status.yaml          -> current phase
 *   - workflow/coordination_log.yaml -> work item progress
 *
 * Output: systemMessage under 500 tokens restoring goal + phase + work status.
 * Returns null (no-op) when no active session is found.
 */

const path = require('path');
const { createHook, findActiveSession, extractYamlValue, safeRead, countPattern } = require('./hook-utils.cjs');

createHook('PostCompactRestore', async (input) => {
  const sessionDir = findActiveSession(input.session_id);
  if (!sessionDir) return null;

  // Read plan.yaml for mission and domain
  const planContent = safeRead(path.join(sessionDir, 'workflow', 'plan.yaml'));
  const mission = planContent
    ? (extractYamlValue(planContent, 'mission') || extractYamlValue(planContent, 'request') || null)
    : null;
  const domain = planContent
    ? (extractYamlValue(planContent, 'domain') || extractYamlValue(planContent, 'super_domain') || null)
    : null;

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

  lines.push('Resume from current phase. Read plan.yaml + coordination_log.yaml if context is needed.');

  return {
    continue: true,
    systemMessage: lines.join('\n')
  };
});
