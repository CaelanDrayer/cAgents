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
  'su ',              // Switch user (space prevents matching 'sudo'/'sum'); also catches 'su -' since 'su ' is a substring of 'su -' (M-1 dedup, v12.12.2)
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

  // F7-1 (audit run_fable-plugin-review_260609_001) — close two named bypass classes.
  // NOTE: static regex still cannot catch all runtime-constructed obfuscation
  // (hex/octal-built command names, multi-line var assembly, env-indirected
  // execution). These two patterns close the two specific gaps the audit named;
  // the documented-limitation note in hook-catalog.md remains accurate.

  // (a) eval of a bare variable — `eval $VAR`, `eval "$VAR"`, `eval ${VAR}`,
  //     `eval "${VAR}"`. This is variable-indirection execution: the command
  //     string is built in a variable and run via eval, defeating literal-string
  //     regexes (e.g. C="rm -rf /"; eval $C). The pre-existing eval pattern only
  //     caught `eval $(...)` command substitution; this catches eval-of-variable.
  //     High-signal obfuscation → Tier 1 deny. Does NOT match `eval $(cmd)` style
  //     (handled above) or eval of a literal string `eval 'ls -la'`.
  { pattern: /\beval\s+["']?\$\{?[A-Za-z_][A-Za-z0-9_]*\}?["']?(\s|;|$)/, label: 'variable-indirection execution via eval (eval of a built command string)' },

  // (b) two-step download-then-exec — a single command string that BOTH
  //     downloads a file with curl/wget AND later pipes a downloaded/script
  //     file into a shell interpreter (bash|sh|zsh|source|.). Catches the
  //     `curl ... -o x.sh; bash x.sh`, `wget -O /tmp/i URL && sh /tmp/i`, and
  //     `curl ... > x.sh; source x.sh` chains that evade the existing
  //     direct-pipe-to-shell pattern (curl|wget | sh). Requires a fetch verb
  //     AND a subsequent shell-exec of a file in the same command → Tier 1 deny.
  { pattern: /\b(curl|wget)\b[^\n]*?(\s-[oO]\b|>>?\s*\S)[^\n]*?(;|&&|\|\||\n)[^\n]*?\b(bash|sh|zsh|source)\b\s+\S/s, label: 'two-step download-then-execute detected (downloaded file later run by a shell)' },
  // (b-alt) reverse order: shell-exec of a file whose download appears earlier
  //     in the chain — `curl URL -o /tmp/x.sh && /tmp/x.sh` where the file is
  //     made executable and run directly. Caught by the fetch+sep+exec shape
  //     above for bash/sh/source; the direct-exec `./x.sh` form is intentionally
  //     left to Tier 2 (see HITL_PATTERNS) because `./build.sh` after a git
  //     clone is common and dual-use.
];

// HITL patterns: borderline-dangerous commands that require user confirmation.
// Each pattern returns permissionDecision: 'ask' with a safe alternative suggestion.
const HITL_PATTERNS = [
  // Git destructive operations (existing)
  { pattern: /git push.*--force/, message: 'Force push may cause data loss. Consider using --force-with-lease for safer force pushes.' },
  { pattern: /git reset --hard/, message: 'Hard reset discards uncommitted changes. Consider git stash to save changes first, or git reset --soft to keep changes staged.' },
  { pattern: /git clean -fdx/, message: 'Git clean -fdx removes untracked AND ignored files. Consider git clean -fd (without -x) to keep ignored files, or git clean -n to preview first.' },
  { pattern: /git clean -fd/, message: 'Git clean -fd deletes untracked files. Consider git clean -n to preview what would be deleted first.' },

  // SQL destructive operations
  { pattern: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i, message: 'DROP TABLE/DATABASE permanently destroys data. Consider renaming the table first (ALTER TABLE ... RENAME), or use DROP ... IF EXISTS with a backup.' },
  { pattern: /\bTRUNCATE\s+TABLE\b/i, message: 'TRUNCATE TABLE removes all rows irrecoverably. Consider DELETE FROM with a WHERE clause for selective removal, or create a backup first.' },
  { pattern: /\bDELETE\s+FROM\b(?!\s.*\bWHERE\b)/is, message: 'DELETE FROM without WHERE clause removes all rows. Add a WHERE clause to target specific rows, or use TRUNCATE if you intend to remove everything.' },

  // Permission escalation
  { pattern: /\bchmod\s+777\b/, message: 'chmod 777 grants read/write/execute to everyone. Consider chmod 755 (owner rwx, others rx) or chmod 700 (owner-only) for better security.' },
  { pattern: /\bchmod\s+-R\s+777\b/, message: 'Recursive chmod 777 makes entire directory trees world-writable. Consider chmod -R 755 or more restrictive permissions.' },
  { pattern: /\bchmod\s+-R\s+666\b/, message: 'Recursive chmod 666 makes files world-writable. Consider chmod -R 644 (owner rw, others read-only).' },
  { pattern: /\bchown\s+-R\s+root\b/, message: 'Recursive chown to root may lock you out of your own files. Verify the target path is correct before proceeding.' },

  // Process management
  { pattern: /\bkill\s+-9\s+-1\b/, message: 'kill -9 -1 sends SIGKILL to ALL your processes. Consider kill -15 (SIGTERM) for graceful shutdown, or target specific PIDs.' },
  { pattern: /\bkillall\s+/, message: 'killall terminates all processes matching a name. Consider using kill with a specific PID from ps aux | grep instead.' },
  { pattern: /\bpkill\s+-9\b/, message: 'pkill -9 sends SIGKILL to matching processes without graceful shutdown. Consider pkill (SIGTERM) first, then pkill -9 only if needed.' },

  // System control
  { pattern: /\b(shutdown|poweroff)\b/, message: 'This will shut down the system. Verify this is the intended target machine. Consider shutdown -c to cancel if triggered accidentally.' },
  { pattern: /\breboot\b/, message: 'This will reboot the system. Verify this is the intended target machine and save all work first.' },
  { pattern: /\bhalt\b/, message: 'halt stops the system immediately. Consider shutdown -h +1 to give users a 1-minute warning.' },

  // Network/firewall
  { pattern: /\biptables\s+-F\b/, message: 'iptables -F flushes all firewall rules, potentially exposing the system. Consider saving rules first with iptables-save, or flush only specific chains.' },
  { pattern: /\bufw\s+disable\b/, message: 'Disabling the firewall exposes all ports. Consider ufw allow/deny for specific ports instead.' },

  // Service management
  { pattern: /\bsystemctl\s+(disable|stop)\s+/, message: 'Stopping/disabling a service may affect system stability. Verify the service name and check dependents with systemctl list-dependencies first.' },

  // Container/Docker cleanup
  { pattern: /\bdocker\s+system\s+prune\s+-a\b/, message: 'docker system prune -a removes ALL unused images, containers, and networks. Consider docker system prune (without -a) to keep tagged images, or docker image prune for images only.' },
  { pattern: /\bdocker\s+volume\s+prune\b/, message: 'docker volume prune deletes all unused volumes and their data. Consider docker volume ls to review volumes first.' },

  // Disk operations
  { pattern: /\bmkswap\b/, message: 'mkswap reformats a partition as swap space, destroying existing data. Verify the target device is correct.' },
  { pattern: /\bfdisk\b/, message: 'fdisk modifies disk partition tables. Verify the target device is correct and back up the partition table first.' },

  // F7-1 (audit run_fable-plugin-review_260609_001) — variable-indirection
  // execution: a bare variable in COMMAND POSITION (start of a command segment),
  // e.g. `C="rm -rf /"; $C` or `... && ${CMD} --flag`. This is dual-use — legit
  // scripts run `$EDITOR file`, `$SHELL -c ...`, `"$PYTHON" script.py` — so it is
  // Tier 2 (ask) rather than Tier 1 (deny). The regex requires the variable to
  // appear at string-start OR immediately after a separator (; && || |) and to
  // be followed by whitespace+token or end-of-string (i.e. used AS a command,
  // not as an argument like `ls $HOME`). It does NOT match command substitution
  // `$(...)` / `${...:-default}` parameter expansion used as an argument, nor a
  // variable consumed as an argument mid-command. Confirm the variable's
  // contents are trusted before running it as a command.
  { pattern: /(^|[;|]|&&|\|\|)\s*["']?\$\{?[A-Za-z_][A-Za-z0-9_]*\}?["']?(\s+\S|\s*$)/, message: 'A variable is being executed as a command (variable-indirection). The variable contents are not visible to static analysis and could expand to a destructive command. Verify the variable holds a trusted command, or inline the literal command instead.' },
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

  // Check for HITL patterns - escalate to user confirmation via 'ask'
  for (const { pattern, message } of HITL_PATTERNS) {
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
