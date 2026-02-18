#!/usr/bin/env node
/**
 * Bash Validator Hook - Block dangerous commands
 * cAgents V9.10 - New (replaces pre-bash.sh)
 *
 * Validates bash commands before execution for safety.
 * Blocks destructive operations, warns about risky git commands.
 *
 * Input (stdin): JSON with tool_input.command, tool_input.description
 * Output (stdout): JSON with permission decision
 */

const { createHook } = require('./hook-utils.cjs');

const BLOCKED_PATTERNS = [
  'rm -rf /',
  'rm -rf ~',
  ':(){ :|:& };:',   // Fork bomb
  '> /dev/sda',
  'dd if=/dev/zero',
  'mkfs',
  'sudo '
];

const GIT_WARNING_PATTERNS = [
  { pattern: /git push.*--force/, message: 'Force push may cause data loss' },
  { pattern: /git reset --hard/, message: 'Hard reset may cause data loss' },
  { pattern: /git clean -fd/, message: 'Git clean may delete untracked files' }
];

createHook('BashValidator', async (input) => {
  const toolInput = input.tool_input || {};
  const command = (toolInput.command || '').replace(/\t/g, ' ').replace(/\s+/g, ' ');

  if (!command) return null;

  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (command.includes(pattern)) {
      console.error(`[BashValidator] BLOCKED: ${pattern}`);
      return { deny: true, reason: `Blocked dangerous command: ${pattern}` };
    }
  }

  // Check for warning patterns - escalate to user confirmation via 'ask'
  for (const { pattern, message } of GIT_WARNING_PATTERNS) {
    if (pattern.test(command)) {
      console.error(`[BashValidator] WARNING: ${message}`);
      return {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason: message
        }
      };
    }
  }

  return null;
});
