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
// WI-2 (session run_bash-guard-evaluator_260708_001): sound tokenize-and-
// canonicalize evaluator library (pure — NOT a hook). evaluate(rawCommand)
// returns null (safe) | ask verdict | { deny, reason }. It never throws by
// contract, but the call site below STILL wraps it fail-closed because
// createHook's own catch fails OPEN ({continue:true}).
//
// REC-08 (v12.50.0): `tokenize` is now imported too — the legacy obfuscation
// belt uses it to confirm an obfuscation match reflects a REAL command-position
// interpreter invocation, not the interpreter's name buried inside quoted data.
const { evaluate, tokenize } = require('./bash-guard-evaluator.cjs');

// Simple string patterns (checked via includes). These are multi-char literal
// shapes that only ever appear in the dangerous form — substring-matching them
// is safe (e.g. ':(){ :|:& };:' cannot collide with a benign token).
const BLOCKED_STRINGS = [
  ':(){ :|:& };:',   // Fork bomb
  '> /dev/sda',
  'dd if=/dev/zero'
];

// B3/B4 (v12.18.0): command-name patterns that MUST be matched as whole words,
// not bare substrings. The old approach (`command.includes('mkfs')`,
// `.includes('su ')`, `.includes('crontab')`) hard-denied benign commands whose
// text merely CONTAINED these as substrings — e.g. a `node -e` string mentioning
// "mkfsutil", a path like "issue ", or "crontab-ui --help". Word-boundary regex
// matches the actual command name only. `\b` is the standard word boundary;
// for `su` we additionally require it to appear in command position (start of a
// command segment, after `;`/`&&`/`||`/`|`, or after `sudo`/`env` etc.) so that
// substrings inside larger words (`issue`, `mkfsutil`) and option-args (`--user`)
// never match, while real `su`, `su -`, `su root` are caught.
const BLOCKED_REGEXES = [
  // mkfs and any mkfs.<fstype> variant (mkfs, mkfs.ext4, mkfs.xfs) — whole word.
  { pattern: /\bmkfs(\.[a-z0-9]+)?\b/, label: 'mkfs (filesystem format — destroys data)' },
  // sudo / doas / pkexec — privilege escalation (B4 adds doas + pkexec).
  // Whole word so 'sudoku', 'pseudoas', 'pkexecutil' don't match.
  { pattern: /\bsudo\b/, label: 'sudo (privilege escalation)' },
  { pattern: /\bdoas\b/, label: 'doas (privilege escalation)' },
  { pattern: /\bpkexec\b/, label: 'pkexec (privilege escalation)' },
  // crontab — cron persistence mechanism. Whole word so 'crontab-ui' (a package
  // name) is still caught (it begins with the crontab command) but 'mycrontab'
  // or 'crontabs/' inside a path is not.
  { pattern: /\bcrontab\b/, label: 'crontab (cron persistence mechanism)' },
  // su — switch user. Must be in COMMAND POSITION: at string start, or right
  // after a command separator (; && || |), optionally preceded by a privilege
  // wrapper. Requires a following space/dash/end so 'sum', 'sudo', 'issue',
  // 'mkfsutil' never match, while `su`, `su -`, `su root`, `... ; su -` do.
  { pattern: /(^|[;|&]\s*)su(\s|$)/, label: 'su (switch user)' },

  // ── existing precise patterns ──────────────────────────────────────────────
  { pattern: /rm\s+-r[f]?\s+\/\s*$/, label: 'rm -rf /' },          // rm -rf / (root only, not /tmp/foo)
  { pattern: /rm\s+-r[f]?\s+\/[^a-zA-Z]/, label: 'rm -rf /' },     // rm -rf /  (followed by space/pipe/etc, not a path)
  { pattern: /rm\s+-r[f]?\s+~\s*$/, label: 'rm -rf ~' },           // rm -rf ~ (home dir)
  { pattern: /rm\s+-r[f]?\s+~\/\s*$/, label: 'rm -rf ~/' },        // rm -rf ~/ (home dir)

  // Data exfiltration patterns — block commands that send data to external endpoints
  { pattern: /\bcurl\b.*(\s-d[\s=]|\s--data[\s=])/, label: 'curl POST data (exfiltration risk: use curl GET for downloads)' },
  { pattern: /\bwget\b.*--post-file/, label: 'wget --post-file (exfiltration risk: use wget without --post-file for downloads)' },
  { pattern: /(\|\s*(nc|netcat)\s|^\s*(nc|netcat)\s)/, label: 'nc/netcat (data exfiltration risk: pipe or command-start)' },
  { pattern: /\bsocat\b/, label: 'socat (data exfiltration/tunneling risk)' },
  // Obfuscation patterns.
  //
  // REC-08 (v12.50.0) — these `.*`-spanning patterns are OBFUSCATION-class: they
  // match the flagged token ANYWHERE in the whitespace-collapsed raw string,
  // including inside quoted data / heredocs / `echo`/`grep` arguments. That made
  // them quote-blind and produced live false-positives (e.g. `echo 'python3 -c
  // "os.system(1)"'`, `grep -rn 'node -e child_process' src/` — data, not
  // invocations — were hard-denied). Each obfuscation entry now carries an `obf`
  // array of the command basenames whose REAL command-position presence
  // legitimizes the match; the belt confirms one of them is a standalone command
  // WORD (via the evaluator's tokenizer) before denying, so quoted-data mentions
  // no longer block. The sound evaluator (Stage 1) remains the primary guard and
  // still denies every REAL obfuscated invocation on its own.
  { pattern: /base64\s+-d.*\|\s*(bash|sh)\b/, label: 'command obfuscation detected', obf: ['base64'] },                  // base64 decode piped to shell
  { pattern: /eval\s+["']?\$\(/, label: 'command obfuscation detected', obf: ['eval'] },                                  // eval with command substitution (quoted or unquoted)
  { pattern: /python3?\s+-c\b.*\b(os\.system|subprocess)/s, label: 'command obfuscation detected', obf: ['python', 'python2', 'python3'] },    // python3 -c with dangerous imports
  { pattern: /perl\s+-e\b.*\bsystem\b/s, label: 'command obfuscation detected', obf: ['perl'] },                          // perl -e with system call
  { pattern: /\b(curl|wget)\b.*\|\s*(bash|sh|zsh)\b/s, label: 'pipe-to-shell detected (curl/wget piped to shell interpreter)', obf: ['curl', 'wget'] },  // curl/wget piped to shell
  { pattern: /\bnode\s+-e\b.*\b(child_process|\.exec\(|\.spawn\()/s, label: 'command obfuscation detected', obf: ['node', 'nodejs'] },          // node -e with child_process/exec/spawn
  { pattern: /\bruby\s+-e\b.*\b(exec|system|`)/s, label: 'command obfuscation detected', obf: ['ruby'] },                                       // ruby -e with exec/system/backtick
  { pattern: /\bphp\s+-r\b.*\b(exec|system|shell_exec|passthru)/s, label: 'command obfuscation detected', obf: ['php'] },                       // php -r with dangerous functions

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
  { pattern: /\beval\s+["']?\$\{?[A-Za-z_][A-Za-z0-9_]*\}?["']?(\s|;|$)/, label: 'variable-indirection execution via eval (eval of a built command string)', obf: ['eval'] },

  // (b) two-step download-then-exec — a single command string that BOTH
  //     downloads a file with curl/wget AND later pipes a downloaded/script
  //     file into a shell interpreter (bash|sh|zsh|source|.). Catches the
  //     `curl ... -o x.sh; bash x.sh`, `wget -O /tmp/i URL && sh /tmp/i`, and
  //     `curl ... > x.sh; source x.sh` chains that evade the existing
  //     direct-pipe-to-shell pattern (curl|wget | sh). Requires a fetch verb
  //     AND a subsequent shell-exec of a file in the same command → Tier 1 deny.
  { pattern: /\b(curl|wget)\b[^\n]*?(\s-[oO]\b|>>?\s*\S)[^\n]*?(;|&&|\|\||\n)[^\n]*?\b(bash|sh|zsh|source)\b\s+\S/s, label: 'two-step download-then-execute detected (downloaded file later run by a shell)', obf: ['curl', 'wget'] },
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

// REC-08 (v12.50.0) — command-position confirmation for the obfuscation-class belt.
// Returns a Set of the basenames of every argv token that is a single bare WORD
// (no internal whitespace) across all tokenized segments. A quoted multi-word
// argument — e.g. an `echo`/`grep`/heredoc argument that merely MENTIONS an
// interpreter invocation as data — canonicalizes to ONE whitespace-bearing token,
// so its inner "python3"/"node"/"ruby" text never enters this set. An obfuscation
// belt match is only honored when one of its `obf` command names is present here,
// i.e. the interpreter actually appears in command position (its own token,
// including after a wrapper like `env`/`sudo`), not buried inside quoted data.
//
// This can only ever NARROW a belt deny to allow (it is consulted after the raw
// regex already matched); it never adds a deny, so no true positive can regress
// from it — every real invocation keeps the interpreter as a standalone token.
// Fail-CLOSED: on a tokenize error return null and the caller keeps the deny
// (never relax the guard on un-parseable input; the evaluator already fail-closes
// such input in Stage 1 anyway).
//
// v12.50.1 (R2 nested-shell fix): a shell interpreter with a `-c` string —
// `sh -c "PAYLOAD"`, `bash -c '…'` — EXECUTES PAYLOAD as a shell command, so
// PAYLOAD's OWN command-position words are real command words one level down.
// Without this, `sh -c "python3 -c 'os.system(1)'"` canonicalizes the whole
// payload to one whitespace-bearing `-c` argument token, so `python3` was never a
// standalone word → the belt skipped the deny → an interpreter-obfuscation ACE
// that the pre-REC-08 belt DID block leaked. We recurse the `-c` payload (bounded
// depth) and fold in its command words, so `sh -c "python3 -c os.system"` is
// confirmed → still denied, while `echo 'python3 …'` / `sh -c "echo 'python3 …'"`
// (data, not executed as an interpreter) stay allowed — the recursion only adds a
// word for a REAL command-position interpreter inside the executed payload.
const SHELL_INTERPRETERS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'ash']);
const MAX_SHELL_C_DEPTH = 3; // sh -c "sh -c '…'" nesting cap

function standaloneCommandWords(rawCommand, _depth) {
  const depth = _depth || 0;
  let segments;
  try { segments = tokenize(rawCommand).segments; }
  catch (e) { return null; }
  const words = new Set();
  for (const seg of segments) {
    const argv = seg.argv || [];
    for (const t of argv) {
      const c = t && t.canon;
      if (c && !/\s/.test(c)) {
        const base = c.split('/').pop() || c;
        if (base) words.add(base);
      }
    }
    // Recurse a shell interpreter's `-c` payload (its interior is executed).
    if (depth < MAX_SHELL_C_DEPTH && argv.length >= 2) {
      const head = argv[0].canon;
      const headBase = (head && !/\s/.test(head)) ? (head.split('/').pop() || head) : '';
      if (SHELL_INTERPRETERS.has(headBase)) {
        for (let k = 1; k < argv.length - 1; k++) {
          if (argv[k].canon === '-c') {
            const payload = argv[k + 1] && argv[k + 1].canon;
            if (payload) {
              const inner = standaloneCommandWords(payload, depth + 1);
              if (inner) { for (const w of inner) words.add(w); }
            }
            break;
          }
        }
      }
    }
  }
  return words;
}

// REC-09 (v12.50.0) — CAGENTS_BASH_GUARD mode override (parity with
// CAGENTS_DELEGATION_ENFORCEMENT). 'block' (default/unset) = current behavior;
// 'warn' = downgrade OBFUSCATION-class belt denials to `ask` (the catastrophic
// literals — fork bomb, rm -rf /, mkfs, sudo, exfil — and the ALWAYS-ON sound
// evaluator (Stage 1) STAY hard-deny); 'off' = skip the legacy deny belt entirely
// (the sound evaluator still runs, so the guard is never fully disarmed). Any
// unrecognized value fails CLOSED to 'block'.
function resolveGuardMode() {
  const raw = (process.env.CAGENTS_BASH_GUARD || 'block').toLowerCase().trim();
  return (raw === 'warn' || raw === 'off') ? raw : 'block';
}

createHook('BashValidator', async (input) => {
  const toolInput = input.tool_input || {};

  // RAW command — the evaluator MUST see the un-collapsed string. Whitespace
  // collapsing destroys Class B evidence ($IFS field-splitting, tab-obfuscated
  // tokens), so only the LEGACY belt below uses the collapsed copy.
  const rawCommand = (toolInput.command || '');
  if (!rawCommand.trim()) return null;

  // REC-09: mode override. Only 'warn'/'off' relax the LEGACY belt below; the
  // Stage-1 evaluator ALWAYS runs regardless of mode (never fully disarmed).
  const guardMode = resolveGuardMode();

  // ── STAGE 1: sound evaluator on the RAW command — FAIL-CLOSED ─────────────
  // evaluate() has its own internal try/catch → deny, but this explicit
  // try/catch is still required: if evaluate itself is broken (bad require,
  // unexpected throw), createHook's outer catch would fail OPEN
  // ({continue:true}), silently disabling the guard. Emulates the fail-closed
  // gates in write-edit-dispatch.cjs makeDispatchHandler.
  let evalVerdict = null;
  try {
    evalVerdict = evaluate(rawCommand);
  } catch (e) {
    console.error('[BashValidator] evaluator threw — fail-closed deny:', e && e.message);
    return { deny: true, reason: 'bash-guard-evaluator error (fail-closed)' };
  }
  // Most-restrictive: a PROVABLY-destructive evaluator deny short-circuits
  // immediately. A FAIL-CLOSED deny (evalVerdict.failClosed — the evaluator could
  // not PARSE the command, e.g. an apostrophe/unbalanced quote inside a heredoc or
  // $(...)) does NOT hard-block: we defer to the raw-string catastrophic belt below
  // (which needs no parse and still hard-denies any real rm -rf / / fork-bomb /
  // exfil literal), and if the belt + HITL patterns are all silent we soft-fail to
  // a confirmation `ask` at the tail. This keeps benign-but-unparseable commands
  // (multi-line commit messages, complex quoting) from being hard-denied while the
  // catastrophic floor is preserved. See docs/SECURITY_BASH_GUARD_THREAT_MODEL.md §5.3.
  let evalFailClosed = false;
  if (evalVerdict && evalVerdict.deny) {
    if (evalVerdict.failClosed) {
      evalFailClosed = true;
      console.error(`[BashValidator] evaluator could not parse command (fail-closed): ${evalVerdict.reason} — deferring to catastrophic belt; will soft-fail to ask if the belt is silent`);
    } else {
      console.error(`[BashValidator] BLOCKED (evaluator): ${evalVerdict.reason}`);
      return evalVerdict;
    }
  }
  // A (non-fail-closed) evaluator ask verdict is held until after the legacy
  // BLOCKED (deny) checks below — deny > ask — then returned before the HITL loop.

  // ── STAGE 2/3: legacy belt on the whitespace-collapsed copy ───────────────
  const command = rawCommand.replace(/\t/g, ' ').replace(/\s+/g, ' ');

  // REC-09: 'off' skips the entire legacy DENY belt (BLOCKED_STRINGS +
  // BLOCKED_REGEXES). The Stage-1 evaluator already ran and still denies every
  // catastrophic shape (fork bomb, rm -rf /, dd, mkfs, exfil, Class A–E …), so
  // 'off' relaxes only the redundant legacy belt, never the sound floor. The
  // HITL loop and the evaluator's `ask` verdict below still surface under 'off'.
  //
  // EXCEPTION — fail-closed input: when the evaluator could NOT parse the command
  // (evalFailClosed), the sound Stage-1 floor is UNAVAILABLE for it, so the belt is
  // the ONLY remaining catastrophic floor. Run the belt for such input even under
  // 'off' — otherwise an un-parseable `rm -rf /` / fork bomb would soft-fail to ask
  // (→ auto-allow under bypassPermissions) with no floor at all. This is what makes
  // the "catastrophic literals hard-denied in all modes" guarantee true.
  if (guardMode !== 'off' || evalFailClosed) {
    // Check for blocked string patterns (literal catastrophic shapes — always raw)
    for (const pattern of BLOCKED_STRINGS) {
      if (command.includes(pattern)) {
        console.error(`[BashValidator] BLOCKED: ${pattern}`);
        return { deny: true, reason: `Blocked dangerous command: ${pattern}` };
      }
    }

    // Check for blocked regex patterns (more precise matching).
    // REC-08: obfuscation-class entries (those carrying `obf`) are confirmed
    // against the tokenizer's command-position words before denying, so a match
    // that lives only inside quoted data (an `echo`/`grep`/heredoc argument) does
    // NOT block. Literal-shape entries (no `obf` — mkfs/sudo/su/rm/exfil) match
    // the raw string exactly as before.
    let cmdWords; // lazily tokenized once, only if an obf pattern matches
    for (const { pattern, label, obf } of BLOCKED_REGEXES) {
      if (!pattern.test(command)) continue;

      if (obf) {
        if (cmdWords === undefined) cmdWords = standaloneCommandWords(rawCommand);
        // cmdWords === null => tokenize failed => fail-closed: keep the deny.
        const confirmed = (cmdWords === null) || obf.some((c) => cmdWords.has(c));
        if (!confirmed) {
          // Matched only inside quoted data (not a real command-position
          // invocation) — this is the quote-blind over-block; skip it.
          console.error(`[BashValidator] obfuscation match in quoted data (not command position) — allowing: ${label}`);
          continue;
        }

        // REC-09: under 'warn', downgrade a confirmed obfuscation-class deny to a
        // one-keystroke HITL `ask`. Catastrophic literals (no `obf`) below/above
        // and the Stage-1 evaluator stay hard-deny.
        if (guardMode === 'warn') {
          console.error(`[BashValidator] WARN (CAGENTS_BASH_GUARD=warn, downgraded to ask): ${label}`);
          return {
            hookSpecificOutput: {
              hookEventName: 'PreToolUse',
              permissionDecision: 'ask',
              permissionDecisionReason: `Potential ${label}. CAGENTS_BASH_GUARD=warn downgraded this obfuscation-class block to a confirmation — verify the command is trusted before approving.`
            }
          };
        }
      }

      console.error(`[BashValidator] BLOCKED: ${label}`);
      return { deny: true, reason: `Blocked dangerous command: ${label}` };
    }
  }

  // Check for HITL patterns - escalate to user confirmation via 'ask'.
  // MOST-RESTRICTIVE resolution (deny > ask > null): no deny fired (evaluator
  // deny and legacy BLOCKED denies returned above). When BOTH the legacy belt
  // and the evaluator produce an ask, the verdicts are equally restrictive —
  // the legacy match returns first because its curated safe-alternative
  // message is the richer user-facing reason. When the legacy belt is silent,
  // the evaluator's ask is returned below (never silently dropped).
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

  // Legacy belt fully silent: surface a genuine evaluator ASK verdict, if any
  // (ask > null — an evaluator ask must not be dropped just because no legacy
  // pattern matched). A FAIL-CLOSED deny has no hookSpecificOutput and is handled
  // by the soft-fail block below, NOT here — returning it here would re-introduce
  // the hard block we are deferring.
  if (evalVerdict && evalVerdict.hookSpecificOutput) {
    const evalReason = evalVerdict.hookSpecificOutput.permissionDecisionReason;
    console.error(`[BashValidator] WARNING (evaluator): ${evalReason}`);
    return evalVerdict;
  }

  // Fail-closed soft-fail: the evaluator could not parse this command, but the
  // catastrophic belt (raw-string rm -rf / / fork-bomb / mkfs / sudo / exfil …) and
  // the HITL patterns were all silent — so it matched NOTHING known-destructive.
  // Rather than hard-deny an un-analyzable-but-benign-looking command (the common
  // cause is an apostrophe or unbalanced quote inside a heredoc / $(...), e.g. a
  // multi-line git commit message), downgrade to a one-keystroke confirmation `ask`.
  // Caveat (documented residual, threat-model §7.6): an `ask` auto-resolves to allow
  // under bypassPermissions, so a command that is BOTH un-parseable AND destructive-
  // in-a-way-only-the-evaluator-would-catch (a belt-missed subpath like rm -rf /etc,
  // obfuscated into un-tokenizability) would auto-allow there. The catastrophic
  // literals remain hard-denied by the belt in all modes.
  if (evalFailClosed) {
    const reason =
      'The command safety guard could not fully parse this command (commonly an ' +
      'apostrophe or unbalanced quote inside a heredoc or $(...)). It did not match ' +
      'any known-destructive pattern. Confirm the command is safe before approving.';
    console.error(`[BashValidator] WARNING (fail-closed soft-fail → ask): ${evalVerdict.reason}`);
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: reason
      }
    };
  }

  return null;
});
