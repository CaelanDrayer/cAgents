#!/usr/bin/env node
/**
 * Verify Completion Hook - Stop hook verification
 * cAgents V9.10 - Refactored
 *
 * Runs on Stop event to verify workflow completion criteria.
 * Also handles stop-workflow cleanup (replaces stop-workflow.sh).
 *
 * Input (stdin): JSON with session context
 * Output (stdout): JSON with continue/block decision
 */

const fs = require('fs');
const path = require('path');
const { createHook, findActiveSession, extractYamlValue, safeRead, countPattern, ensureDir, PROJECT_ROOT } = require('./hook-utils.cjs');

function verifyCompletion(sessionDir) {
  const issues = [];
  const warnings = [];

  // 1. Check status.yaml (supports both phase-based and pipeline_state-based sessions)
  const statusFile = path.join(sessionDir, 'status.yaml');
  const statusContent = safeRead(statusFile);
  if (!statusContent) {
    warnings.push('No status.yaml file (session may not be a cAgents workflow)');
  } else {
    const phase = extractYamlValue(statusContent, 'phase') || extractYamlValue(statusContent, 'current_phase');
    const pipelineState = extractYamlValue(statusContent, 'pipeline_state');

    if (pipelineState) {
      // /org and /run pipeline_state sessions
      const terminalStates = ['COMPLETE', 'VALIDATED', 'completed'];
      const activeStates = ['INIT', 'ANALYZED', 'DELIBERATED', 'BRIEFED', 'EXECUTED', 'PLANNED', 'DECOMPOSED', 'PROMPTS_READY'];
      if (activeStates.includes(pipelineState)) {
        issues.push(`Workflow stopping in '${pipelineState}' pipeline state (expected: COMPLETE or VALIDATED)`);
      } else if (!terminalStates.includes(pipelineState)) {
        warnings.push(`Workflow stopping in '${pipelineState}' pipeline state`);
      }
    } else if (!phase) {
      warnings.push('No phase defined in status.yaml');
    } else if (phase === 'planning' || phase === 'coordinating' || phase === 'executing') {
      issues.push(`Workflow stopping in '${phase}' phase (expected: completed or validating)`);
    } else if (phase !== 'completed' && phase !== 'complete' && phase !== 'validating') {
      warnings.push(`Workflow stopping in '${phase}' phase (expected: complete/completed or validating)`);
    }
  }

  // 2. Check coordination_log.yaml for work item completion
  // For /org sessions, also check integration_report.yaml and per-domain coordination logs
  const coordFile = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
  let coordContent = safeRead(coordFile);

  // For /org sessions: check integration_report.yaml as the primary completion indicator
  const integrationReport = safeRead(path.join(sessionDir, 'integration_report.yaml'));
  if (!coordContent && integrationReport) {
    // /org session with integration report - check for unresolved issues
    const unresolvedCount = countPattern(integrationReport, /status:\s*unresolved/g);
    if (unresolvedCount > 0) warnings.push(`${unresolvedCount} cross-domain issue(s) unresolved in integration report`);
  }

  if (coordContent) {
    const pendingCount = countPattern(coordContent, /status:\s*pending/g);
    const inProgressCount = countPattern(coordContent, /status:\s*in_progress/g);
    if (pendingCount > 0) issues.push(`${pendingCount} work item(s) still pending`);
    if (inProgressCount > 0) issues.push(`${inProgressCount} work item(s) still in progress`);

    const emptyEvidence = countPattern(coordContent, /evidence:\s*(?:\[\]|null|""|'')$/gm);
    if (emptyEvidence > 0) warnings.push(`${emptyEvidence} work item(s) missing completion evidence`);
  }

  // 3. Check validation report (only if session reached a state where validation is expected)
  const validationFile = path.join(sessionDir, 'validation', 'validation_report.yaml');
  const valContent = safeRead(validationFile);
  // Only warn about missing validation if the session has a status.yaml indicating
  // it should have reached validation (terminal or near-terminal states).
  // Early-stage sessions (INIT, PLANNED, DECOMPOSED, etc.) are not expected to have one.
  const statesExpectingValidation = ['COORDINATED', 'VALIDATED', 'COMPLETE', 'completed', 'complete', 'validating'];
  const currentPhase = statusContent
    ? (extractYamlValue(statusContent, 'pipeline_state') || extractYamlValue(statusContent, 'phase') || extractYamlValue(statusContent, 'current_phase'))
    : null;
  const shouldHaveValidation = currentPhase && statesExpectingValidation.includes(currentPhase);
  if (!valContent && shouldHaveValidation) {
    warnings.push('Missing validation report');
  } else if (valContent) {
    const status = extractYamlValue(valContent, 'overall_status') || extractYamlValue(valContent, 'status');
    if (status && status !== 'PASS') warnings.push(`Validation status: ${status} (expected: PASS)`);
  }

  return { issues, warnings };
}

createHook('VerifyCompletion', async (input) => {
  // Prevent infinite loops: if stop_hook_active, allow stop
  if (input && input.stop_hook_active) {
    console.error('[VerifyCompletion] stop_hook_active=true, allowing stop');
    return null;
  }

  const sessionDir = findActiveSession(input.session_id);
  if (!sessionDir) return null;

  // Skip stale sessions (>24h old) - they're abandoned, not actively running
  const statusFile = path.join(sessionDir, 'status.yaml');
  const statusContent = safeRead(statusFile);
  if (statusContent) {
    const updatedAt = extractYamlValue(statusContent, 'updated_at') || extractYamlValue(statusContent, 'created_at');
    if (updatedAt) {
      const sessionAge = Date.now() - new Date(updatedAt).getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (sessionAge > twentyFourHours) {
        console.error(`[VerifyCompletion] Skipping stale session (${Math.round(sessionAge / 3600000)}h old): ${path.basename(sessionDir)}`);
        return null;
      }
    }
  } else {
    // No status.yaml -- use directory mtime as fallback staleness check.
    // Sessions without status.yaml were never properly initialized (pipeline
    // failed before writing status.yaml). Skip verification entirely since
    // there's nothing meaningful to verify.
    try {
      const stat = fs.statSync(sessionDir);
      const dirAge = Date.now() - stat.mtimeMs;
      console.error(`[VerifyCompletion] Session has no status.yaml (dir age: ${Math.round(dirAge / 60000)}min): ${path.basename(sessionDir)}`);
    } catch { /* ignore */ }
    console.error(`[VerifyCompletion] Skipping session without status.yaml: ${path.basename(sessionDir)}`);
    return null;
  }

  const result = verifyCompletion(sessionDir);

  // Write completion summary
  ensureDir(sessionDir);
  const summaryFile = path.join(sessionDir, 'completion_summary.yaml');
  const timestamp = new Date().toISOString();
  const content = `# Completion Summary
generated_at: "${timestamp}"
verified_by: verify-completion-hook

verification_result:
  passed: ${result.issues.length === 0}
  issues_count: ${result.issues.length}
  warnings_count: ${result.warnings.length}

${result.issues.length > 0 ? `issues:\n${result.issues.map(i => `  - "${i}"`).join('\n')}` : 'issues: []'}

${result.warnings.length > 0 ? `warnings:\n${result.warnings.map(w => `  - "${w}"`).join('\n')}` : 'warnings: []'}
`;
  try { fs.writeFileSync(summaryFile, content); } catch {}

  if (result.issues.length > 0) {
    console.error(`[VerifyCompletion] ISSUES: ${result.issues.join('; ')}`);
    return {
      decision: 'block',
      reason: `cAgents completion verification found issues:\n${result.issues.join('\n')}\n\nSee ${path.relative(PROJECT_ROOT, summaryFile)} for details. Please address these before stopping.`
    };
  }

  if (result.warnings.length > 0) {
    console.error(`[VerifyCompletion] WARNINGS: ${result.warnings.join('; ')}`);
    return {
      continue: true,
      systemMessage: `cAgents workflow stopping with ${result.warnings.length} warning(s). See ${path.relative(PROJECT_ROOT, summaryFile)} for details.`
    };
  }

  console.error('[VerifyCompletion] All completion criteria verified');

  // Always remind to clean up tasks (the hook cannot check TaskList directly,
  // but the systemMessage prompts the agent to do so before stopping)
  return {
    continue: true,
    systemMessage: 'Before stopping: call TaskList and mark all your in_progress/pending tasks as completed or deleted via TaskUpdate. Never leave stale tasks behind.'
  };
});
