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

/**
 * Extract the most recent entered_at timestamp from state_history in status.yaml.
 * Returns age in milliseconds, or null if not determinable.
 */
function getLastTransitionAgeMs(statusContent) {
  // Find all entered_at values and use the last one
  const matches = statusContent.match(/entered_at:\s*"([^"]+)"/g);
  if (!matches || matches.length === 0) return null;
  const lastMatch = matches[matches.length - 1];
  const tsMatch = lastMatch.match(/entered_at:\s*"([^"]+)"/);
  if (!tsMatch) return null;
  try {
    return Date.now() - new Date(tsMatch[1]).getTime();
  } catch { return null; }
}

/**
 * Finalize agent lifecycle data for terminal sessions.
 * Sets stopped_at on the lead agent in agent_tree.yaml and computes
 * the final duration_ms in the last state_history entry of status.yaml.
 */
function finalizeSessionLifecycle(sessionDir) {
  const statusFile = path.join(sessionDir, 'status.yaml');
  const statusContent = safeRead(statusFile);
  if (!statusContent) return;

  // Only finalize for terminal sessions
  const pipelineState = extractYamlValue(statusContent, 'pipeline_state');
  const phase = extractYamlValue(statusContent, 'phase') || extractYamlValue(statusContent, 'current_phase');
  const currentState = pipelineState || phase;
  const terminalStates = ['complete', 'completed', 'COMPLETE', 'VALIDATED', 'failed'];
  if (!currentState || !terminalStates.includes(currentState)) return;

  const now = new Date().toISOString();

  // (a) Set stopped_at for lead agent in agent_tree.yaml
  try {
    const agentTreeFile = path.join(sessionDir, 'workflow', 'agent_tree.yaml');
    const agentTreeContent = safeRead(agentTreeFile);
    if (agentTreeContent) {
      // Find the first agent entry and check if stopped_at is null
      const firstAgentMatch = agentTreeContent.match(/(- agent_id:\s*[^\n]+[\s\S]*?stopped_at:\s*)null/);
      if (firstAgentMatch) {
        const updated = agentTreeContent.replace(
          firstAgentMatch[0],
          firstAgentMatch[1] + '"' + now + '"'
        );
        fs.writeFileSync(agentTreeFile, updated);
        console.error(`[VerifyCompletion] Set lead agent stopped_at: ${now}`);
      }
    }
  } catch (e) {
    console.error(`[VerifyCompletion] Error setting stopped_at: ${e.message}`);
  }

  // (b) Compute final duration_ms in last state_history entry
  try {
    // Find the last state_history entry with duration_ms: null
    const lastNullDuration = statusContent.match(/[\s\S]*(entered_at:\s*"([^"]+)"[\s\S]*?duration_ms:\s*)null/);
    if (lastNullDuration) {
      const enteredAt = lastNullDuration[2];
      const durationMs = Date.now() - new Date(enteredAt).getTime();
      if (durationMs >= 0 && durationMs < 24 * 60 * 60 * 1000) { // sanity: < 24h
        const updated = statusContent.replace(
          lastNullDuration[0],
          lastNullDuration[0].replace(
            lastNullDuration[1] + 'null',
            lastNullDuration[1] + String(durationMs)
          )
        );
        fs.writeFileSync(statusFile, updated);
        console.error(`[VerifyCompletion] Set final duration_ms: ${durationMs}`);
      }
    }
  } catch (e) {
    console.error(`[VerifyCompletion] Error computing duration_ms: ${e.message}`);
  }
}

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
      const activeStates = ['INIT', 'ANALYZED', 'DELIBERATED', 'BRIEFED', 'EXECUTED', 'PLANNED', 'DECOMPOSED', 'PROMPTS_READY', 'COORDINATED'];
      if (activeStates.includes(pipelineState)) {
        // Check if pipeline is actively running (recent state transition).
        // Claude Code fires Stop events between response turns while waiting
        // for background agents. If the last state transition was recent,
        // the pipeline is actively running — warn instead of block to avoid
        // the annoying block→respond→block loop.
        const lastTransitionAge = getLastTransitionAgeMs(statusContent);
        const thirtyMinutes = 30 * 60 * 1000;
        if (lastTransitionAge !== null && lastTransitionAge < thirtyMinutes) {
          // Pipeline actively running — downgrade to warning (no block)
          const ageMin = Math.round(lastTransitionAge / 60000);
          console.error(`[VerifyCompletion] Pipeline in '${pipelineState}' but actively running (last transition ${ageMin}min ago) — warning only`);
          warnings.push(`Pipeline actively running in '${pipelineState}' state (last transition ${ageMin}min ago)`);
        } else {
          // Pipeline may be stuck (no recent transitions) — block
          issues.push(`Workflow stopping in '${pipelineState}' pipeline state (expected: COMPLETE or VALIDATED)`);
        }
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

  // 2. Sentinel Gate Factchecking (V10.17.0)
  // Verify that claimed deliverables actually exist on disk.
  const coordFileForSentinel = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
  const coordForSentinel = safeRead(coordFileForSentinel);
  if (coordForSentinel) {
    // Extract files_created and files_modified claims
    const filesClaimed = [];
    const createdMatches = coordForSentinel.match(/files_created:\s*\n((?:\s+-\s+[^\n]+\n?)*)/g);
    const modifiedMatches = coordForSentinel.match(/files_modified:\s*\n((?:\s+-\s+[^\n]+\n?)*)/g);
    const outputMatches = coordForSentinel.match(/output(?:_file|_path|s)?:\s*["']?([^\s"'\n]+)/g);

    const extractPaths = (matches) => {
      if (!matches) return;
      for (const block of matches) {
        const lines = block.split('\n');
        for (const line of lines) {
          const pathMatch = line.match(/^\s+-\s+["']?([^\s"'\n]+)/);
          if (pathMatch) {
            const p = pathMatch[1].trim();
            if (p && !p.startsWith('files_') && p.includes('/')) filesClaimed.push(p);
          }
        }
      }
    };

    extractPaths(createdMatches);
    extractPaths(modifiedMatches);
    if (outputMatches) {
      for (const m of outputMatches) {
        const p = m.replace(/output(?:_file|_path|s)?:\s*["']?/, '').trim();
        if (p && p.includes('/')) filesClaimed.push(p);
      }
    }

    // Verify claimed files exist
    let missingFiles = 0;
    const missingList = [];
    for (const claimed of filesClaimed) {
      // Resolve relative to session dir or project root
      const candidates = [
        path.resolve(sessionDir, claimed),
        path.resolve(PROJECT_ROOT, claimed),
      ];
      const exists = candidates.some(c => fs.existsSync(c));
      if (!exists) {
        missingFiles++;
        if (missingList.length < 5) missingList.push(claimed);
      }
    }

    if (missingFiles > 0) {
      warnings.push(`Sentinel gate: ${missingFiles} claimed deliverable(s) not found on disk: ${missingList.join(', ')}${missingFiles > 5 ? '...' : ''}`);
    }
  }

  // 3. Check coordination_log.yaml for work item completion
  // (renumbered from 2 after sentinel gate insertion)
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

  // 4. Check validation report (only if session reached a state where validation is expected)
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

  // Ensure pipeline_state is terminal so finalizeSessionLifecycle can run.
  // Many sessions (especially /org) exit with pipeline_state still at "init"
  // because the agent didn't update status.yaml before stopping.
  try {
    const statusFile2 = path.join(sessionDir, 'status.yaml');
    const statusRaw = safeRead(statusFile2);
    if (statusRaw) {
      const curPipeline = extractYamlValue(statusRaw, 'pipeline_state');
      const curPhase = extractYamlValue(statusRaw, 'phase') || extractYamlValue(statusRaw, 'current_phase');
      const curVal = curPipeline || curPhase;
      const alreadyTerminal = ['complete', 'completed', 'COMPLETE', 'VALIDATED', 'failed'];
      if (!curVal || !alreadyTerminal.includes(curVal)) {
        const finalState = result.issues.length === 0 ? 'complete' : 'failed';
        const field = curPipeline !== undefined ? 'pipeline_state' : (curPhase !== undefined ? 'phase' : 'pipeline_state');
        const patched = statusRaw.replace(
          new RegExp(`(${field}:\\s*)\\S+`),
          `$1${finalState}`
        );
        if (patched !== statusRaw) {
          fs.writeFileSync(statusFile2, patched);
          console.error(`[VerifyCompletion] Updated ${field} to "${finalState}" in status.yaml`);
        }
      }
    }
  } catch (e) {
    console.error(`[VerifyCompletion] Error updating pipeline_state: ${e.message}`);
  }

  // Finalize agent lifecycle data (stopped_at, duration_ms) for terminal sessions
  finalizeSessionLifecycle(sessionDir);

  // PC-09: Plan-Scoped Learning Capture (V10.17.0)
  // Write learnings.yaml at session end to capture structured learnings
  try {
    const planFile = path.join(sessionDir, 'workflow', 'plan.yaml');
    const planContent = safeRead(planFile);
    const coordFile2 = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
    const coordContent2 = safeRead(coordFile2);

    const learnings = [];

    // Extract decisions from coordination log
    if (coordContent2) {
      // Look for patterns that indicate decisions or issues
      const synthesisMatch = coordContent2.match(/synthesized_solution:[\s\S]*?(?=\n[a-z_]+:|$)/);
      if (synthesisMatch) {
        learnings.push({
          type: 'decision',
          content: 'Synthesis approach captured in coordination_log.yaml',
          source: 'coordination_log'
        });
      }

      // Count revision rounds (indicates difficulty areas)
      const revisionCount = countPattern(coordContent2, /revision_round:/g);
      if (revisionCount > 0) {
        learnings.push({
          type: 'issue',
          content: `${revisionCount} revision round(s) needed - indicates areas of difficulty`,
          source: 'coordination_log'
        });
      }
    }

    // Check for failed items (things that didn't work)
    const failedItems = path.join(sessionDir, 'workflow', 'failed_items.yaml');
    if (fs.existsSync(failedItems)) {
      learnings.push({
        type: 'failure',
        content: 'Some work items failed - see workflow/failed_items.yaml',
        source: 'failed_items'
      });
    }

    // Extract domain and tier from plan
    let domain = 'unknown';
    let tier = 'unknown';
    if (planContent) {
      domain = extractYamlValue(planContent, 'domain') || extractYamlValue(planContent, 'super_domain') || 'unknown';
      tier = extractYamlValue(planContent, 'tier') || 'unknown';
    }

    if (learnings.length > 0 || planContent) {
      const learningsFile = path.join(sessionDir, 'learnings.yaml');
      const learningsContent = `# Session Learnings
# Auto-generated by verify-completion.cjs (V10.17.0)
generated_at: "${new Date().toISOString()}"
session_id: "${path.basename(sessionDir)}"
domain: "${domain}"
tier: "${tier}"
completion_status: "${result.issues.length === 0 ? 'completed' : 'failed'}"

learnings:
${learnings.map(l => `  - type: "${l.type}"
    content: "${l.content.replace(/"/g, '\\"')}"
    source: "${l.source}"`).join('\n')}

# Patterns discovered during execution
patterns:
  warnings_count: ${result.warnings.length}
  issues_count: ${result.issues.length}
${result.warnings.length > 0 ? `  warning_types:\n${result.warnings.map(w => `    - "${w.substring(0, 100).replace(/"/g, '\\"')}"`).join('\n')}` : '  warning_types: []'}
`;
      try { fs.writeFileSync(learningsFile, learningsContent); } catch {}
    }
  } catch (e) {
    console.error(`[VerifyCompletion] Learning capture error: ${e.message}`);
  }

  // PC-08: Always write completion_summary.yaml with status field
  // Status: completed (no issues), failed (issues found), interrupted (other)
  ensureDir(sessionDir);
  const summaryFile = path.join(sessionDir, 'completion_summary.yaml');
  const timestamp = new Date().toISOString();
  const completionStatus = result.issues.length === 0 ? 'completed' : 'failed';
  const content = `# Completion Summary
generated_at: "${timestamp}"
verified_by: verify-completion-hook
status: ${completionStatus}

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

  // Four Questions hallucination self-check + task cleanup reminder
  // These questions force the agent to verify its own claims before stopping,
  // catching hallucinated completions and fabricated evidence.
  const fourQuestions = [
    'SELF-CHECK before stopping:',
    '1. Did I ACTUALLY make every change I claim, or did I only plan/describe them?',
    '2. Did I verify my changes work (ran tests, checked syntax), or am I assuming they do?',
    '3. Are the file paths and evidence I cited real things I observed, or did I fabricate them?',
    '4. Is there any task I said I would do but quietly skipped or deferred?',
    '',
    'If any answer reveals a gap, address it before stopping.',
    'Also: call TaskList and mark all your in_progress/pending tasks as completed or deleted via TaskUpdate.'
  ].join('\n');

  return {
    continue: true,
    systemMessage: fourQuestions
  };
});
