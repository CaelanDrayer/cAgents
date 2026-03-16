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

// Simple string patterns (checked via includes)
const BLOCKED_STRINGS = [
  ':(){ :|:& };:',   // Fork bomb
  '> /dev/sda',
  'dd if=/dev/zero',
  'mkfs',
  'sudo '
];

// Regex patterns for more precise matching
const BLOCKED_REGEXES = [
  { pattern: /rm\s+-r[f]?\s+\/\s*$/, label: 'rm -rf /' },          // rm -rf / (root only, not /tmp/foo)
  { pattern: /rm\s+-r[f]?\s+\/[^a-zA-Z]/, label: 'rm -rf /' },     // rm -rf /  (followed by space/pipe/etc, not a path)
  { pattern: /rm\s+-r[f]?\s+~\s*$/, label: 'rm -rf ~' },           // rm -rf ~ (home dir)
  { pattern: /rm\s+-r[f]?\s+~\/\s*$/, label: 'rm -rf ~/' },        // rm -rf ~/ (home dir)
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

  // Check for blocked string patterns
  for (const pattern of BLOCKED_STRINGS) {
    if (command.includes(pattern)) {
      console.error(`[BashValidator] BLOCKED: ${pattern}`);
      return { deny: true, reason: `Blocked dangerous command: ${pattern}` };
    }
  }

  // Check for blocked regex patterns (more precise matching)
  for (const { pattern, label } of BLOCKED_REGEXES) {
    if (pattern.test(command)) {
      console.error(`[BashValidator] BLOCKED: ${label}`);
      return { deny: true, reason: `Blocked dangerous command: ${label}` };
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
