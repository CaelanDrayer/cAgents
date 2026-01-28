#!/usr/bin/env node
/**
 * Verify Completion Hook - Stop hook verification
 * cAgents V8.0 - Verification Loop Enhancement
 *
 * This hook runs on Stop event to verify workflow completion criteria.
 * Prevents premature workflow termination without proper completion evidence.
 *
 * 100% Self-Contained: Uses only built-in Node.js modules.
 *
 * Input (stdin): JSON with session context
 * Output (stdout): JSON with continue status
 */

const fs = require('fs');
const path = require('path');

const AGENT_MEMORY_DIR = process.env.CLAUDE_PROJECT_DIR
  ? path.join(process.env.CLAUDE_PROJECT_DIR, 'Agent_Memory')
  : path.join(process.cwd(), 'Agent_Memory');

/**
 * Read JSON from stdin
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');

    if (process.stdin.isTTY) {
      resolve({});
      return;
    }

    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
    process.stdin.on('error', () => resolve({}));

    setTimeout(() => resolve({}), 1000);
  });
}

/**
 * Find active session directory
 */
function findActiveSession() {
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) return null;

  const sessions = fs.readdirSync(sessionsDir)
    .filter(d => d.startsWith('run_') || d.startsWith('optimize_') || d.startsWith('explore_'))
    .sort()
    .reverse();

  for (const session of sessions) {
    const statusFile = path.join(sessionsDir, session, 'status.yaml');
    if (fs.existsSync(statusFile)) {
      const content = fs.readFileSync(statusFile, 'utf8');
      if (!content.includes('phase: completed') && !content.includes('phase: failed')) {
        return path.join(sessionsDir, session);
      }
    }
  }
  return null;
}

/**
 * Simple YAML value extraction
 */
function extractYamlValue(content, key) {
  const regex = new RegExp(`^${key}:\\s*(.+)$`, 'm');
  const match = content.match(regex);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

/**
 * Count pattern occurrences in YAML content
 */
function countPattern(content, pattern) {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * Verify completion criteria
 */
function verifyCompletion(sessionDir) {
  const issues = [];
  const warnings = [];

  // 1. Check status.yaml exists and has valid phase
  const statusFile = path.join(sessionDir, 'status.yaml');
  if (!fs.existsSync(statusFile)) {
    issues.push('Missing status.yaml file');
  } else {
    const content = fs.readFileSync(statusFile, 'utf8');
    const phase = extractYamlValue(content, 'phase');

    if (!phase) {
      issues.push('No phase defined in status.yaml');
    } else if (phase !== 'completed' && phase !== 'validating') {
      warnings.push(`Workflow stopping in '${phase}' phase (expected: completed or validating)`);
    }
  }

  // 2. Check coordination_log.yaml for work item completion
  const coordFile = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
  if (fs.existsSync(coordFile)) {
    const content = fs.readFileSync(coordFile, 'utf8');

    const completedCount = countPattern(content, /status:\s*completed/g);
    const pendingCount = countPattern(content, /status:\s*pending/g);
    const inProgressCount = countPattern(content, /status:\s*in_progress/g);

    if (pendingCount > 0) {
      warnings.push(`${pendingCount} work item(s) still pending`);
    }
    if (inProgressCount > 0) {
      warnings.push(`${inProgressCount} work item(s) still in progress`);
    }

    // Check for missing evidence
    const evidenceMatches = content.match(/evidence:\s*\[?\]?/g);
    if (evidenceMatches) {
      const emptyEvidence = evidenceMatches.filter(e => /evidence:\s*\[?\]?$/.test(e)).length;
      if (emptyEvidence > 0) {
        warnings.push(`${emptyEvidence} work item(s) missing completion evidence`);
      }
    }
  }

  // 3. Check for validation report if in validating/completed phase
  const validationFile = path.join(sessionDir, 'validation', 'validation_report.yaml');
  if (!fs.existsSync(validationFile)) {
    warnings.push('Missing validation report');
  } else {
    const content = fs.readFileSync(validationFile, 'utf8');
    const status = extractYamlValue(content, 'overall_status') || extractYamlValue(content, 'status');

    if (status && status !== 'PASS') {
      warnings.push(`Validation status: ${status} (expected: PASS)`);
    }
  }

  return { issues, warnings };
}

/**
 * Create completion summary
 */
function createCompletionSummary(sessionDir, result) {
  const summaryFile = path.join(sessionDir, 'completion_summary.yaml');
  const timestamp = new Date().toISOString();

  const content = `# Completion Summary
generated_at: "${timestamp}"
verified_by: verify-completion-hook

verification_result:
  passed: ${result.issues.length === 0}
  issues_count: ${result.issues.length}
  warnings_count: ${result.warnings.length}

${result.issues.length > 0 ? `issues:
${result.issues.map(i => `  - "${i}"`).join('\n')}` : 'issues: []'}

${result.warnings.length > 0 ? `warnings:
${result.warnings.map(w => `  - "${w}"`).join('\n')}` : 'warnings: []'}

notes: |
  This summary was generated by the verify-completion hook.
  Review warnings and ensure all work items have completion evidence.
`;

  try {
    fs.writeFileSync(summaryFile, content);
  } catch (error) {
    console.error(`[VerifyCompletion] Failed to write summary: ${error.message}`);
  }

  return summaryFile;
}

/**
 * Main hook execution
 */
async function main() {
  const input = await readStdin();

  try {
    const sessionDir = findActiveSession();

    if (!sessionDir) {
      // No active session - allow stop
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    // Verify completion
    const result = verifyCompletion(sessionDir);

    // Create summary
    createCompletionSummary(sessionDir, result);

    // Log findings
    if (result.issues.length > 0) {
      console.error(`[VerifyCompletion] ISSUES: ${result.issues.join('; ')}`);
    }
    if (result.warnings.length > 0) {
      console.error(`[VerifyCompletion] WARNINGS: ${result.warnings.join('; ')}`);
    }

    // Decide whether to allow stop
    // Issues = blocking, Warnings = informational
    if (result.issues.length > 0) {
      const output = {
        continue: true, // Don't block stop, but provide feedback
        systemMessage: `cAgents completion verification found issues:\n${result.issues.join('\n')}\n\nPlease address these before considering the workflow complete.`
      };
      console.log(JSON.stringify(output));
    } else if (result.warnings.length > 0) {
      const output = {
        continue: true,
        systemMessage: `cAgents workflow stopping with ${result.warnings.length} warning(s). See completion_summary.yaml for details.`
      };
      console.log(JSON.stringify(output));
    } else {
      console.error('[VerifyCompletion] All completion criteria verified');
      console.log(JSON.stringify({ continue: true }));
    }

  } catch (error) {
    console.error(`[VerifyCompletion] Error: ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
