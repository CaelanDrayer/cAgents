#!/usr/bin/env node
/**
 * Tool Failure Tracker Hook - Track and analyze tool failures
 * cAgents V10.22.1 - Standardized schema
 *
 * Tracks tool failures with standardized schema:
 *   tool, file_path, error, timestamp, agent_id, recoverable
 * Detects failure patterns (3+ failures of same tool = suggest alternative).
 *
 * Input (stdin): JSON with tool_name, error from PostToolUseFailure event
 * Output (stdout): JSON with continue status and recovery suggestions
 */

const fs = require('fs');
const path = require('path');
const { createHook, findActiveSession, safeRead, ensureDir } = require('./hook-utils.cjs');

const TOOL_ALTERNATIVES = {
  'Bash': 'Consider using Read/Write/Glob/Grep dedicated tools instead of shell commands.',
  'Write': 'Check file path permissions. Try writing to Agent_Memory/ instead.',
  'Edit': 'Verify the old_string matches exactly. Try Read first to confirm content.',
  'Task': 'Check subagent_type is valid. Try a simpler prompt or different agent.',
  'WebFetch': 'URL may be unreachable. Try WebSearch or check URL format.',
  'Glob': 'Pattern may be too specific. Try a broader glob pattern.',
  'Grep': 'Pattern may have regex issues. Try a simpler pattern or different path.'
};

// V10.18.0: Crash Recovery Taxonomy - classify failures by type for targeted recovery
const FAILURE_TAXONOMY = {
  syntax_error: {
    patterns: [/SyntaxError/i, /ParseError/i, /Unexpected token/i, /Invalid syntax/i, /YAML.*invalid/i, /JSON.*parse/i],
    recovery: 'Fix immediately using the error message. Syntax errors are deterministic.',
    retry_limit: -1  // unlimited - always fixable
  },
  runtime_error: {
    patterns: [/TypeError/i, /ReferenceError/i, /RangeError/i, /Cannot read prop/i, /undefined is not/i, /null reference/i],
    recovery: 'Analyze stack trace. Check for null/undefined values. Add defensive guards.',
    retry_limit: 3
  },
  resource_exhaustion: {
    patterns: [/ENOMEM/i, /out of memory/i, /heap.*limit/i, /context.*too long/i, /ENOSPC/i, /disk.*full/i],
    recovery: 'Revert changes. Try a smaller approach: fewer files, less content, chunked operations.',
    retry_limit: 1
  },
  timeout: {
    patterns: [/ETIMEDOUT/i, /timeout/i, /timed out/i, /deadline exceeded/i, /ESOCKETTIMEDOUT/i],
    recovery: 'Kill the operation. Revert partial changes. Decompose into smaller sub-tasks.',
    retry_limit: 1
  },
  external_dependency: {
    patterns: [/ECONNREFUSED/i, /ENOTFOUND/i, /502|503|504/i, /network.*error/i, /API.*unavailable/i, /rate.*limit/i],
    recovery: 'Skip this work item and log for later retry. Do not block on external services.',
    retry_limit: 0
  }
};

function classifyFailure(errorMsg) {
  for (const [type, config] of Object.entries(FAILURE_TAXONOMY)) {
    for (const pattern of config.patterns) {
      if (pattern.test(errorMsg)) {
        return { type, recovery: config.recovery, retry_limit: config.retry_limit };
      }
    }
  }
  return { type: 'unknown', recovery: 'Investigate the error. Check logs for context.', retry_limit: 2 };
}

createHook('ToolFailureTracker', async (input) => {
  if (!input.tool_name) return null;

  const toolName = input.tool_name;
  const errorMsg = (input.error || input.tool_output || '').toString().slice(0, 200);
  const now = new Date().toISOString();

  const sessionDir = findActiveSession(input.session_id);
  if (!sessionDir) return null;

  const workflowDir = ensureDir(path.join(sessionDir, 'workflow'));
  const failureFile = path.join(workflowDir, 'tool_failures.yaml');

  // Parse existing failures for pattern detection
  const existingContent = safeRead(failureFile);
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  let recentCount = 0;
  if (existingContent) {
    const blocks = existingContent.split(/\n- tool:/);
    for (let i = 1; i < blocks.length; i++) {
      const block = '- tool:' + blocks[i];
      const tsMatch = block.match(/timestamp:\s*"([^"]+)"/);
      const toolMatch = block.match(/tool:\s*"([^"]+)"/);
      if (tsMatch && toolMatch && toolMatch[1] === toolName && tsMatch[1] > tenMinAgo) {
        recentCount++;
      }
    }
  }

  // Determine if failure is recoverable based on taxonomy
  const classification = classifyFailure(errorMsg);
  const isRecoverable = classification.retry_limit !== 0;

  // Extract agent_id from input context (SubagentStart provides this)
  const agentId = input.agent_id || input.session_id || 'unknown';

  // Extract file_path from tool_input if available (Write/Edit tools provide this)
  const filePath = (input.tool_input && input.tool_input.file_path) || null;

  // Append new failure with standardized schema
  const safeError = errorMsg.replace(/"/g, "'").replace(/\n/g, ' ');
  const filePathLine = filePath ? `\n  file_path: "${filePath.replace(/"/g, "'")}"` : '';
  const newEntry = `\n- tool: "${toolName}"${filePathLine}\n  error: "${safeError}"\n  timestamp: "${now}"\n  agent_id: "${agentId}"\n  recoverable: ${isRecoverable}\n`;

  if (!existingContent) {
    fs.writeFileSync(failureFile, `# Tool Failure Log\n# Session: ${path.basename(sessionDir)}\n\nfailures:${newEntry}`);
  } else {
    fs.appendFileSync(failureFile, newEntry);
  }

  console.error(`[ToolFailureTracker] ${toolName} failed: ${safeError.slice(0, 80)}`);

  // Pattern detection (2 previous + current = 3)
  if (recentCount >= 2) {
    const suggestion = TOOL_ALTERNATIVES[toolName] || `Tool "${toolName}" has failed ${recentCount + 1} times recently. Consider an alternative approach.`;
    const taxonomyHint = classification.type !== 'unknown'
      ? `\nFailure type: ${classification.type} (retry limit: ${classification.retry_limit === -1 ? 'unlimited' : classification.retry_limit})\nRecovery: ${classification.recovery}`
      : '';
    console.error(`[ToolFailureTracker] Pattern: ${recentCount + 1} failures of ${toolName} [${classification.type}]`);
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUseFailure',
        additionalContext: `Tool failure pattern detected: "${toolName}" has failed ${recentCount + 1} times recently.\n${suggestion}${taxonomyHint}`
      }
    };
  }

  // Even on first failure, provide taxonomy hint for recognized types
  if (classification.type !== 'unknown') {
    return {
      continue: true,
      systemMessage: `Failure classified as ${classification.type}. ${classification.recovery}`
    };
  }

  return null;
});
