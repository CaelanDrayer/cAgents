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
const { createHook, findActiveSession, TERMINAL_STATES, extractYamlValue, safeRead, countPattern, ensureDir, PROJECT_ROOT } = require('./hook-utils.cjs');

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
  if (!currentState || !TERMINAL_STATES.includes(currentState)) return;

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
  // Fallback: use Date.now() as stopped_at when absent; started_at = entered_at.
  // Never produce NaN or negative values.
  try {
    // Find the last state_history entry with duration_ms: null
    const lastNullDuration = statusContent.match(/[\s\S]*(entered_at:\s*"([^"]+)"[\s\S]*?duration_ms:\s*)null/);
    if (lastNullDuration) {
      const enteredAt = lastNullDuration[2];
      const startMs = new Date(enteredAt).getTime();
      // Fallback: if started_at (entered_at) is valid, use Date.now() as stopped_at
      const stoppedMs = Date.now();
      const durationMs = !isNaN(startMs) && startMs > 0
        ? Math.max(0, stoppedMs - startMs)
        : 0; // Cannot compute duration without valid start time — default to 0
      if (durationMs < 24 * 60 * 60 * 1000) { // sanity: < 24h
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
      } else if (!TERMINAL_STATES.includes(pipelineState)) {
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

  // 2. Delegation violation check (V10.22.6)
  // If the session stopped in a pre-COORDINATED state with no agent_tree.yaml
  // child entries (depth 0), flag it as a delegation violation.
  // This detects self-handling bypasses: the model stopped without spawning any agents.
  // Exception: sessions that reached VALIDATED/COMPLETE are not flagged (clean completion).
  const PRE_COORDINATED_STATES_VC = ['INIT', 'ORCHESTRATED', 'PLANNED', 'DECOMPOSED', 'PROMPTS_READY'];
  const agentTreeFile = path.join(sessionDir, 'workflow', 'agent_tree.yaml');
  const agentTreeContent = safeRead(agentTreeFile);
  if (statusContent) {
    const pipelineStateForVC = extractYamlValue(statusContent, 'pipeline_state');
    // Only check if session stopped in a pre-COORDINATED state (not naturally completed)
    if (pipelineStateForVC && PRE_COORDINATED_STATES_VC.includes(pipelineStateForVC)) {
      // Check agent_tree.yaml for child agents (depth > 0)
      // agent_tree.yaml entries with depth > 0 indicate agents were spawned
      let childAgentCount = 0;
      if (agentTreeContent) {
        // Count entries with depth: 1 or higher (depth: 0 is the pipeline root itself)
        const depthMatches = agentTreeContent.match(/\bdepth:\s*([1-9]\d*)\b/g);
        childAgentCount = depthMatches ? depthMatches.length : 0;

        // Fallback: count agent_id entries beyond the first (first is the /run root)
        if (childAgentCount === 0) {
          const agentIdMatches = agentTreeContent.match(/\bagent_id:\s*[^\s\n]+/g);
          childAgentCount = agentIdMatches ? Math.max(0, agentIdMatches.length - 1) : 0;
        }
      }

      if (childAgentCount === 0) {
        const sessionName = path.basename(sessionDir);
        warnings.push(
          `DELEGATION VIOLATION: Session '${sessionName}' stopped in '${pipelineStateForVC}' state ` +
          `with no child agents spawned. This indicates the pipeline was not executed — ` +
          `work was self-handled or the session was abandoned before delegation. ` +
          `Expected: agent_tree.yaml with depth>0 entries showing spawned orchestrator/planner/controller agents.`
        );
        console.error(`[VerifyCompletion] Delegation violation detected: ${sessionName} stopped in ${pipelineStateForVC} with no spawned agents`);
      }
    }
  }

  // 3. Sentinel Gate Factchecking (V10.17.0)
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

  // 4. Check coordination_log.yaml for work item completion
  // (renumbered from 2 after sentinel gate insertion, then from 3 after delegation check)
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
  const validationFile = path.join(sessionDir, 'workflow', 'validation_report.yaml');
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

  // 5. Check execution_summary.yaml exists (REQ-012)
  // /run SKILL.md Step 4 item 3 mandates this file even on failure or interruption.
  if (shouldHaveValidation && !fs.existsSync(path.join(sessionDir, 'workflow', 'execution_summary.yaml'))) {
    warnings.push('Missing workflow/execution_summary.yaml (required at pipeline completion per /run Step 4)');
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
      if (!curVal || !TERMINAL_STATES.includes(curVal)) {
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

  // PC-10: Structured session outcome JSONL (V10.23.0)
  // Append a single JSON line per session to a rolling JSONL file for analytics.
  // Failures here must never break the verify-completion hook.
  try {
    const learningDir = path.join(AGENT_MEMORY_DIR, '_knowledge', 'learning');
    fs.mkdirSync(learningDir, { recursive: true });

    // Extract domain and tier from plan.yaml
    let outcomeDomain = 'unknown';
    let outcomeTier = 'unknown';
    try {
      const planForOutcome = safeRead(path.join(sessionDir, 'workflow', 'plan.yaml'));
      if (planForOutcome) {
        outcomeDomain = extractYamlValue(planForOutcome, 'domain') || extractYamlValue(planForOutcome, 'super_domain') || 'unknown';
        outcomeTier = extractYamlValue(planForOutcome, 'tier') || 'unknown';
      }
    } catch { /* plan read failed — use defaults */ }

    // Pipeline state from status.yaml
    const statusForOutcome = safeRead(path.join(sessionDir, 'status.yaml'));
    const outcomePipelineState = statusForOutcome
      ? (extractYamlValue(statusForOutcome, 'pipeline_state') || extractYamlValue(statusForOutcome, 'phase') || 'unknown')
      : 'unknown';

    // Duration: first entered_at in state_history to now
    let outcomeDurationMs = null;
    if (statusForOutcome) {
      const firstEnteredMatch = statusForOutcome.match(/entered_at:\s*"([^"]+)"/);
      if (firstEnteredMatch) {
        try {
          const startMs = new Date(firstEnteredMatch[1]).getTime();
          if (!isNaN(startMs) && startMs > 0) {
            outcomeDurationMs = Math.max(0, Date.now() - startMs);
          }
        } catch { /* timestamp parse failed */ }
      }
    }

    // Agent count from agent_tree.yaml
    let outcomeAgentCount = 0;
    try {
      const atContent = safeRead(path.join(sessionDir, 'workflow', 'agent_tree.yaml'));
      if (atContent) {
        const agentMatches = atContent.match(/agent_id:/g);
        outcomeAgentCount = agentMatches ? agentMatches.length : 0;
      }
    } catch { /* agent tree read failed */ }

    // Work item count from work_items.yaml
    let outcomeWorkItemCount = 0;
    try {
      const wiContent = safeRead(path.join(sessionDir, 'workflow', 'work_items.yaml'));
      if (wiContent) {
        const wiMatches = wiContent.match(/- id:/g) || wiContent.match(/- task_id:/g);
        outcomeWorkItemCount = wiMatches ? wiMatches.length : 0;
      }
    } catch { /* work items read failed */ }

    // Revision count from workflow/events/ (FAIL or REVISE events)
    let outcomeRevisionCount = 0;
    try {
      const eventsDir = path.join(sessionDir, 'workflow', 'events');
      if (fs.existsSync(eventsDir)) {
        const eventFiles = fs.readdirSync(eventsDir).filter(f => f.endsWith('.yaml'));
        for (const ef of eventFiles) {
          const evContent = safeRead(path.join(eventsDir, ef));
          if (evContent && (/\bFAIL\b/.test(evContent) || /\bREVISE\b/.test(evContent))) {
            outcomeRevisionCount++;
          }
        }
      }
    } catch { /* events read failed */ }

    const outcome = {
      session_id: path.basename(sessionDir),
      domain: outcomeDomain,
      tier: outcomeTier,
      pipeline_state: outcomePipelineState,
      duration_ms: outcomeDurationMs,
      agent_count: outcomeAgentCount,
      work_item_count: outcomeWorkItemCount,
      pass_fail: result.issues.length === 0 ? 'pass' : 'fail',
      revision_count: outcomeRevisionCount,
      warning_count: result.warnings.length,
      issue_count: result.issues.length,
      timestamp: new Date().toISOString()
    };

    const jsonlPath = path.join(learningDir, 'session_outcomes.jsonl');
    fs.appendFileSync(jsonlPath, JSON.stringify(outcome) + '\n');
    console.error(`[VerifyCompletion] Session outcome appended to ${path.relative(PROJECT_ROOT, jsonlPath)}`);
  } catch (e) {
    console.error(`[VerifyCompletion] Session outcome JSONL error (non-fatal): ${e.message}`);
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
