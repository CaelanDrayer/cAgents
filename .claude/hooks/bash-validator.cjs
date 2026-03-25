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
  'sudo ',
  'su ',              // Switch user (space prevents matching 'sudo'/'sum')
  'su -',            // Switch user with login shell
  'crontab'          // Cron persistence mechanism
];

// Regex patterns for more precise matching
const BLOCKED_REGEXES = [
  { pattern: /rm\s+-r[f]?\s+\/\s*$/, label: 'rm -rf /' },          // rm -rf / (root only, not /tmp/foo)
  { pattern: /rm\s+-r[f]?\s+\/[^a-zA-Z]/, label: 'rm -rf /' },     // rm -rf /  (followed by space/pipe/etc, not a path)
  { pattern: /rm\s+-r[f]?\s+~\s*$/, label: 'rm -rf ~' },           // rm -rf ~ (home dir)
  { pattern: /rm\s+-r[f]?\s+~\/\s*$/, label: 'rm -rf ~/' },        // rm -rf ~/ (home dir)

  // Data exfiltration patterns — block commands that send data to external endpoints
  { pattern: /\bcurl\b.*(\s-d[\s=]|\s--data[\s=])/, label: 'curl POST data (exfiltration risk: use curl GET for downloads)' },
  { pattern: /\bwget\b.*--post-file/, label: 'wget --post-file (exfiltration risk: use wget without --post-file for downloads)' },
  { pattern: /(\|\s*(nc|netcat)\s|^\s*(nc|netcat)\s)/, label: 'nc/netcat (data exfiltration risk: pipe or command-start)' },
  { pattern: /\bsocat\b/, label: 'socat (data exfiltration/tunneling risk)' },
  // Obfuscation patterns
  { pattern: /base64\s+-d.*\|\s*(bash|sh)\b/, label: 'command obfuscation detected' },                  // base64 decode piped to shell
  { pattern: /eval\s+["']?\$\(/, label: 'command obfuscation detected' },                                // eval with command substitution (quoted or unquoted)
  { pattern: /python3?\s+-c\b.*\b(os\.system|subprocess)/s, label: 'command obfuscation detected' },    // python3 -c with dangerous imports
  { pattern: /perl\s+-e\b.*\bsystem\b/s, label: 'command obfuscation detected' },                       // perl -e with system call
  { pattern: /\b(curl|wget)\b.*\|\s*(bash|sh|zsh)\b/s, label: 'pipe-to-shell detected (curl/wget piped to shell interpreter)' },  // curl/wget piped to shell
  { pattern: /\bnode\s+-e\b.*\b(child_process|\.exec\(|\.spawn\()/s, label: 'command obfuscation detected' },                     // node -e with child_process/exec/spawn
  { pattern: /\bruby\s+-e\b.*\b(exec|system|`)/s, label: 'command obfuscation detected' },                                        // ruby -e with exec/system/backtick
  { pattern: /\bphp\s+-r\b.*\b(exec|system|shell_exec|passthru)/s, label: 'command obfuscation detected' },                       // php -r with dangerous functions
];

const GIT_WARNING_PATTERNS = [
  { pattern: /git push.*--force/, message: 'Force push may cause data loss' },
  { pattern: /git reset --hard/, message: 'Hard reset may cause data loss' },
  { pattern: /git clean -fdx/, message: 'Git clean -fdx removes untracked and ignored files' },
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
