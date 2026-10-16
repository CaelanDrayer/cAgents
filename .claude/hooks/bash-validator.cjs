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
// WI-21 W21-2: a corrupted or overwritten evaluator must not disable the
// guard. If the require throws, every command is denied (fail-closed). An
// `ask` would be dropped under dontAsk, so this is a deny.
let evaluate;
let tokenize;
let mentionsRunner;
let nonWaivableAskReason;
try {
  ({ evaluate, tokenize, mentionsRunner, nonWaivableAskReason } = require('./bash-guard-evaluator.cjs'));
  if (typeof evaluate !== 'function' || typeof tokenize !== 'function') throw new Error('bad exports');
} catch (e) {
  // WI-21 round 2: name the file and line, so the reader can repair it. Bash is
  // blocked until the module loads, so the fix goes through Edit.
  let where = '';
  try {
    const lines = String((e && e.stack) || '').split('\n');
    const hit = lines.find(l => /bash-guard-evaluator\.cjs:\d+/.test(l));
    const m = hit && /(\S*bash-guard-evaluator\.cjs:\d+(?::\d+)?)/.exec(hit);
    where = m ? m[1] : require('path').join(__dirname, 'bash-guard-evaluator.cjs');
  } catch (e2) { where = 'bash-guard-evaluator.cjs'; }
  const loadErr = ((e && e.message) || 'unknown') + ' at ' + where + '. Fix the file with Edit (Bash is blocked until it loads).';
  console.error('[BashValidator] bash-guard-evaluator failed to load, fail-closed deny:', loadErr);
  evaluate = () => ({ deny: true, reason: 'bash-guard-evaluator failed to load (fail-closed): ' + loadErr });
  tokenize = () => { throw new Error('evaluator unavailable'); };
  mentionsRunner = () => true;
}
if (typeof mentionsRunner !== 'function') mentionsRunner = () => true;

// WI-21 W21-3: the session's Bash cwd persists between calls, so `cd` in one
// call and `npm test` / `git status` in the next runs the package.json or .git
// config of that directory. Write(cagents-memory/**) needs no prompt, so a cwd
// inside cagents-memory/ that holds a planted repo marker asks for git and
// test/CI runner commands.
// WI-21 round 2 MF-1: git discovers a gitdir in the cwd AND every parent, and a
// bare-format gitdir needs no `.git` at all: a directory holding HEAD +
// objects/ + refs/ (or a `commondir` / `gitdir` file) is a repo, and its
// config (core.fsmonitor, core.pager, hooks) runs code. So every directory from
// the cwd up to, but not including, the project root is checked for gitdir
// markers. The runner markers (package.json, scripts/, tests/ ...) are checked
// only inside cagents-memory/, where planting needs no prompt.
const GITDIR_MARKERS = ['.git', 'HEAD', 'commondir', 'gitdir'];
const PLANT_MARKERS = ['package.json', '.npmrc', 'scripts', 'tests', 'node_modules', '.gitconfig',
  'vitest.config.js', 'vitest.config.mjs', 'vitest.config.ts', 'vitest.config.cjs', 'vite.config.js', 'vite.config.mjs'];
const PLANTED_CWD_MSG = (cwd, dir, what) => 'The working directory (' + cwd + ') sits under ' + dir + ', which holds ' + what +
  '. git or the test/CI runner would load it, and its config can run code. Run the command from the project root, or confirm.';
function realOr(p) {
  const path = require('path');
  try { return require('fs').realpathSync(p); } catch (e) { return path.resolve(p); }
}
// WI-21 round 3 (L-R2-4, MF-R2-1): a git worktree of THIS project is trusted.
// Its root holds a `.git` FILE whose `gitdir:` resolves (realpath) to
// <root>/.git/worktrees/<name>, and that admin dir's own `gitdir` file points
// back at this `.git`. The admin dir lives under <root>/.git, which an agent
// cannot write without a prompt, so a planted `.git` file cannot fake the
// back-pointer. Returns true only for that exact shape.
function isLegitWorktreeRoot(d, root) {
  const path = require('path');
  const fs = require('fs');
  try {
    const dotgit = path.join(d, '.git');
    const st = fs.lstatSync(dotgit);
    if (!st.isFile()) return false;
    const m = /^gitdir:\s*(.+?)\s*$/m.exec(fs.readFileSync(dotgit, 'utf8'));
    if (!m) return false;
    const admin = realOr(path.resolve(d, m[1]));
    const wtBase = path.join(root, '.git', 'worktrees') + path.sep;
    if (!admin.startsWith(wtBase)) return false;
    if (path.dirname(admin) + path.sep !== wtBase) return false;
    const back = fs.readFileSync(path.join(admin, 'gitdir'), 'utf8').trim();
    return realOr(path.dirname(path.resolve(admin, back))) === realOr(d);
  } catch (e) { return false; }
}
// Gitdir markers other than a `.git` entry (a legit worktree root has a .git
// file but none of these).
function otherGitdirMarker(d) {
  const path = require('path');
  const fs = require('fs');
  const has = (m) => fs.existsSync(path.join(d, m));
  const g = GITDIR_MARKERS.filter(x => x !== '.git').find(has);
  return g || (has('config') && has('objects') ? 'config + objects/' : null);
}
// WI-21 round 4 MF-R3-2: true when a path component is named cagents-memory.
function hasMemoryComponent(p) {
  return typeof p === 'string' && p.split(require('path').sep).includes('cagents-memory');
}
const OUTSIDE_ROOT_MSG = (cwd) => 'The working directory (' + cwd + ') is outside the project root and is not a git worktree of this project. ' +
  'git or the test/CI runner would load the package.json, scripts/ or git config found there, and that config can run code. Run the command from the project root, or confirm.';
function plantedCwdMessage(input, rawCommand) {
  let cwd = null;
  try {
    const path = require('path');
    const fs = require('fs');
    const rootRaw = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..');
    cwd = input && typeof input.cwd === 'string' && input.cwd ? input.cwd : null;
    if (!cwd || !rootRaw) return null;
    const root = realOr(rootRaw);
    const rc = realOr(cwd);
    // Normal case: the cwd is the project root, whose own .git is trusted.
    if (rc === root) return null;
    if (!mentionsRunner(rawCommand)) return null;
    const zone = path.join(root, 'cagents-memory');
    if (!rc.startsWith(root + path.sep)) {
      // WI-21 round 3 MF-R2-1: outside the project root (the scratchpad, /tmp)
      // nothing is trusted. Allow only inside a legit worktree of this project,
      // and only when no directory from the cwd up to that worktree root holds
      // another gitdir marker.
      for (let d = rc; ; d = path.dirname(d)) {
        if (fs.existsSync(path.join(d, '.git'))) {
          if (!isLegitWorktreeRoot(d, root) || otherGitdirMarker(d)) return OUTSIDE_ROOT_MSG(cwd);
          // WI-21 round 4 MF-R3-2: a worktree whose path has a cagents-memory
          // component sits where Write(cagents-memory/**) could plant files.
          if (hasMemoryComponent(d)) return OUTSIDE_ROOT_MSG(cwd);
          return null;
        }
        // Below the worktree root, a gitdir marker or a runner marker (a
        // nested package.json, scripts/ ...) is a plant.
        if (otherGitdirMarker(d) || PLANT_MARKERS.some(m => fs.existsSync(path.join(d, m)))) return OUTSIDE_ROOT_MSG(cwd);
        if (path.dirname(d) === d) return OUTSIDE_ROOT_MSG(cwd);
      }
    }
    for (let d = rc; d !== root && d.startsWith(root + path.sep); d = path.dirname(d)) {
      const has = (m) => fs.existsSync(path.join(d, m));
      // WI-21 round 4 MF-R3-2: Write(cagents-memory/**) resolves against the
      // CURRENT cwd, so <root>/docs/cagents-memory/... or
      // <root>/.claude/worktrees/<n>/cagents-memory/... can be planted without
      // a prompt too. Any directory whose path below the root has a component
      // named cagents-memory is in the plant zone.
      const inZone = d === zone || d.startsWith(zone + path.sep) || hasMemoryComponent(path.relative(root, d));
      const og = otherGitdirMarker(d);
      if (og) return PLANTED_CWD_MSG(cwd, d, 'a git directory marker (' + og + ')');
      // WI-21 round 3 L-R2-4: a legit worktree (e.g. .claude/worktrees/<name>)
      // is not a plant. Never trusted inside cagents-memory/.
      if (has('.git') && (inZone || !isLegitWorktreeRoot(d, root))) return PLANTED_CWD_MSG(cwd, d, 'a git directory marker (.git)');
      if (inZone) {
        const pm = PLANT_MARKERS.find(has);
        if (pm) return PLANTED_CWD_MSG(cwd, d, pm);
      }
      if (path.dirname(d) === d) break;
    }
  } catch (e) {
    // Fail closed: if the check itself breaks, a runner or git command asks.
    try { if (mentionsRunner(rawCommand)) return 'The guard could not check the working directory (' + cwd + ') for a planted repo. Confirm the command.'; } catch (e2) { /* ignore */ }
    return null;
  }
  return null;
}

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
  // K1/W1: force push is judged by the evaluator on the git push argv
  // (gitHistoryMessage), which also covers -f, +refspec, --mirror and --delete.
  // A raw `git push.*--force` regex here asked on data such as
  // `grep "git push --force" log`, so it was removed.
  { pattern: /git reset --hard/, message: 'Hard reset discards uncommitted changes. Consider git stash to save changes first, or git reset --soft to keep changes staged.' },
  { pattern: /git clean -fdx/, message: 'Git clean -fdx removes untracked AND ignored files. Consider git clean -fd (without -x) to keep ignored files, or git clean -n to preview first.' },
  { pattern: /git clean -fd/, message: 'Git clean -fd deletes untracked files. Consider git clean -n to preview what would be deleted first.' },

  // SQL destructive operations

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
// FU-4 (v12.77.0): the settings key cagents.bash_guard sets the mode too
// (`{"cagents": {"bash_guard": "off"}}` in .claude/settings.local.json or
// .claude/settings.json of the project, then the plugin settings.json). The
// env var wins. An unknown value in either place fails closed to 'block'.
const GUARD_MODES = new Set(['block', 'warn', 'off']);
function guardModeOf(v) {
  const raw = String(v).toLowerCase().trim();
  return GUARD_MODES.has(raw) ? raw : 'block';
}
function settingsGuardMode() {
  const path = require('path');
  const fs = require('fs');
  const files = [];
  if (process.env.CLAUDE_PROJECT_DIR) {
    files.push(path.join(process.env.CLAUDE_PROJECT_DIR, '.claude', 'settings.local.json'));
    files.push(path.join(process.env.CLAUDE_PROJECT_DIR, '.claude', 'settings.json'));
  }
  files.push(path.join(__dirname, '..', 'settings.json'));
  for (const f of files) {
    let j;
    try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { continue; }
    const v = j && j.cagents && typeof j.cagents === 'object' && j.cagents.bash_guard !== undefined
      ? j.cagents.bash_guard : (j ? j['cagents.bash_guard'] : undefined);
    if (v !== undefined && v !== null) return guardModeOf(v);
  }
  return null;
}
function resolveGuardMode() {
  const env = process.env.CAGENTS_BASH_GUARD;
  if (env !== undefined && String(env).trim() !== '') return guardModeOf(env);
  return settingsGuardMode() || 'block';
}
// FU-4 (v12.77.0): every ask names the opt-out.
const OPT_OUT_SUFFIX = 'Opt out: set CAGENTS_BASH_GUARD=off (asks) or =warn; see docs/HOOK_OPT_OUTS.md';
function withOptOut(reason) {
  const r = String(reason || 'requires confirmation');
  return r.includes('CAGENTS_BASH_GUARD=off') ? r : r.replace(/\s*$/, '') + ' ' + OPT_OUT_SUFFIX;
}

async function validate(input) {
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
  if (!evalVerdict) {
    const pm = plantedCwdMessage(input, rawCommand);
    if (pm) evalVerdict = { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: pm } };
  }
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
  // (not a guaranteed stop under bypassPermissions) with no floor at all. This is what makes
  // the "catastrophic literals hard-denied in all modes" guarantee true.
  // FU-12 (v12.77.0): 'off' still runs the literal-shape belt (BLOCKED_STRINGS
  // and every BLOCKED_REGEXES entry with no `obf`: mkfs, sudo, doas, pkexec,
  // su, crontab, rm -rf / and ~, curl/wget/nc/socat exfil). The evaluator
  // does not deny every one of them (`rm -r /` with no -f allows there), so a
  // skipped belt turned a deny into an allow. Only the obfuscation-class
  // entries (`obf`) relax under 'off'.
  const beltOff = guardMode === 'off' && !evalFailClosed;
  {
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
      if (beltOff && obf) continue;
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
  // Caveat (documented residual, threat-model §7 item 6): the Claude Code docs do
  // not say what a hook `ask` does under bypassPermissions. The WI-027 audit
  // measured a median 76 s wait, so in practice a human answers the prompt, but the
  // docs do not promise it. Under dontAsk this hook drops the ask (see below) and the
  // allow and deny rules decide. A headless -p run denies an ask. So a command that is
  // BOTH un-parseable AND destructive in a way only the evaluator would catch (a
  // belt-missed subpath like rm -rf /etc, obfuscated into un-tokenizability) is not
  // guaranteed to stop. The catastrophic literals remain hard-denied by the belt in
  // all modes.
  if (evalFailClosed) {
    let reason =
      'The command safety guard could not fully parse this command (commonly an ' +
      'apostrophe or unbalanced quote inside a heredoc or $(...)). It did not match ' +
      'any known-destructive pattern. Confirm the command is safe before approving.';
    // H4: quoted heredoc bodies are already skipped as data. The usual cause
    // that remains is a body line equal to the terminator word (a nested
    // `<<'EOF'` inside a Python string). Bash also ends the heredoc at that
    // line and runs the rest as shell, so the ask stays. Name the cause.
    const hd = heredocEarlyEnd(rawCommand);
    if (hd) {
      reason += ' A heredoc body line equals its terminator "' + hd + '", so bash ends the heredoc ' +
        'there and runs the remaining lines as shell. Use a unique terminator word.';
    }
    console.error(`[BashValidator] WARNING (fail-closed soft-fail → ask): ${evalVerdict.reason}`);
    return {
      keepAskWhenOff: true,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: reason
      }
    };
  }

  return null;
}

// H4: return W when a heredoc opened with terminator W has a body line that
// opens a second heredoc with the same W before the first W line. Bash ends
// the outer heredoc at that first W line. The test only shapes the message.
// It never changes a verdict.
function heredocEarlyEnd(cmd) {
  const lines = String(cmd || '').split('\n');
  const opener = /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/g;
  for (let i = 0; i < lines.length; i++) {
    opener.lastIndex = 0;
    let m;
    while ((m = opener.exec(lines[i])) !== null) {
      const word = m[2];
      const reopen = new RegExp('<<-?\\s*([\'"]?)' + word + '\\1(?![A-Za-z0-9_])');
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === word) break;
        if (reopen.test(lines[j])) return word;
      }
    }
  }
  return null;
}

function isAskVerdict(verdict) {
  return !!(verdict && verdict.hookSpecificOutput &&
    verdict.hookSpecificOutput.permissionDecision === 'ask');
}

// Under permission_mode 'dontAsk' nobody can answer a prompt (headless
// subagents), so a hook `ask` just fails the tool call. Drop the ask and let
// the session's permission policy (allow/deny rules) decide. Deny verdicts
// are unaffected — the catastrophic floor holds in every mode.
//
// FU-4 (v12.77.0): CAGENTS_BASH_GUARD=off turns an ask into an allow and
// writes one stderr line. A deny stays a deny in every mode. The one ask that
// 'off' keeps is the fail-closed soft-fail: the evaluator could not parse the
// command, so the sound floor did not judge it. Every ask that remains names
// the opt-out.
async function decide(input) {
  const verdict = await validate(input);
  if (!isAskVerdict(verdict)) return verdict;
  const reason = verdict.hookSpecificOutput.permissionDecisionReason;
  if (input.permission_mode === 'dontAsk') {
    console.error(`[BashValidator] dontAsk mode — deferring to permission policy: ${reason}`);
    return null;
  }
  if (!verdict.keepAskWhenOff && resolveGuardMode() === 'off') {
    // FU-12 (v12.77.0): a loader or shell-init setting (LD_PRELOAD, BASH_ENV,
    // NODE_OPTIONS ...) and a write to the guard's own config stay asks.
    let keep = null;
    try { keep = typeof nonWaivableAskReason === 'function' ? nonWaivableAskReason((input.tool_input || {}).command) : null; }
    catch (e) { keep = 'guard could not classify the ask (fail-closed)'; }
    if (!keep) {
      console.error(`[BashValidator] CAGENTS_BASH_GUARD=off: allowed a command that would ask: ${reason}`);
      return null;
    }
    console.error(`[BashValidator] CAGENTS_BASH_GUARD=off: kept a non-waivable ask: ${keep}`);
    return { hookSpecificOutput: Object.assign({}, verdict.hookSpecificOutput, { permissionDecisionReason: keep + ' (' + reason + ')' }) };
  }
  return {
    hookSpecificOutput: Object.assign({}, verdict.hookSpecificOutput, { permissionDecisionReason: withOptOut(reason) })
  };
}

createHook('BashValidator', decide);
