#!/usr/bin/env node
/**
 * Tool Failure Tracker Hook - Track and analyze tool failures
 * cAgents V9.10 - Refactored
 *
 * Tracks tool failures with tool name, error message, timestamp.
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
    const blocks = existingContent.split(/\n- timestamp:/);
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      const tsMatch = block.match(/timestamp:\s*"([^"]+)"/);
      const toolMatch = block.match(/tool:\s*"([^"]+)"/);
      if (tsMatch && toolMatch && toolMatch[1] === toolName && tsMatch[1] > tenMinAgo) {
        recentCount++;
      }
    }
  }

  // Append new failure
  const safeError = errorMsg.replace(/"/g, "'").replace(/\n/g, ' ');
  const newEntry = `\n- timestamp: "${now}"\n  tool: "${toolName}"\n  error: "${safeError}"\n`;

  if (!existingContent) {
    fs.writeFileSync(failureFile, `# Tool Failure Log\n# Session: ${path.basename(sessionDir)}\n\nfailures:${newEntry}`);
  } else {
    fs.appendFileSync(failureFile, newEntry);
  }

  console.error(`[ToolFailureTracker] ${toolName} failed: ${safeError.slice(0, 80)}`);

  // Pattern detection (2 previous + current = 3)
  if (recentCount >= 2) {
    const suggestion = TOOL_ALTERNATIVES[toolName] || `Tool "${toolName}" has failed ${recentCount + 1} times recently. Consider an alternative approach.`;
    console.error(`[ToolFailureTracker] Pattern: ${recentCount + 1} failures of ${toolName}`);
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUseFailure',
        additionalContext: `Tool failure pattern detected: "${toolName}" has failed ${recentCount + 1} times recently.\n${suggestion}`
      }
    };
  }

  return null;
});
