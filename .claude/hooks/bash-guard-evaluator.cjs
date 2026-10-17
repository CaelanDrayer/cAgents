'use strict';
/**
 * bash-guard-evaluator.cjs — GuardFall tokenize-and-canonicalize evaluator.
 *
 * PURE LIBRARY (NOT a hook — does not call createHook). Required by
 * bash-validator.cjs (WI-2), which wraps evaluate() in a fail-closed try/catch.
 *
 * Standalone Contract: Node built-ins only. Zero third-party dependencies.
 * The only require()s in this file are Node built-ins (none are actually
 * needed) or './'-relative — nothing else, by design.
 *
 * Spec: docs/SECURITY_BASH_GUARD_THREAT_MODEL.md §5 — five ordered components,
 * most-restrictive short-circuit (first deny wins), deny-not-ask for true
 * bypass classes:
 *   1. TOKENIZE (quote-removal + $IFS field-split canonicalization; fail-closed)
 *   2. VARIABLE-EXPANSION detection
 *   3. COMMAND-SUBSTITUTION recursion (incl. inside double quotes)
 *   4. PIPE-DESTINATION check (decoder/fetch -> interpreter = deny)
 *   5. CANONICAL-TOKEN-ANCHORED disabled list (legacy superset + Class-E +
 *      sensitive-path guard)
 *
 * WI-P1 (§5.1/§7 argv[0] wrapper-bypass closure, session
 * run_audit-remediation_260717_001): component 5's structured checks were
 * anchored on basename(argv[0]) === 'rm'/'dd'/'find'/'sed'/'install'/'chmod'.
 * A transparent wrapper (nice/env/timeout/nohup/ionice/setsid/stdbuf/time/
 * command/exec) or a leading NAME=VALUE assignment prefix occupies argv[0]
 * instead, so the real command was never inspected. resolveEffectiveCommand()
 * now resolves past a leading run of assignment tokens and known transparent
 * wrappers before those SIX specific checks run (rm-family, dd, find, sed,
 * install, chmod — NOT the eval/python|node|perl|ruby|php -c|-e obfuscation
 * checks, which stay argv[0]-anchored on purpose so the existing REC-08/
 * REC-09 belt-only env/backtick warn->ask / off->allow downgrade semantics
 * are untouched). checkDisabledList also now recurses a shell interpreter's
 * `-c '<payload>'` argument through the evaluator (bounded depth, mirroring
 * the existing $(...)/backtick recursion), and isDangerousPath recognizes
 * any '~/...' path, the bare root-glob '/*', and '/home' as protected —
 * closing the sh -c transport and home-glob/subdir destruction bypass shapes.
 *
 * Verdict model (external shapes returned by evaluate()):
 *   provably-safe        -> null           (proceed to normal permission flow)
 *   ambiguous/dual-use   -> { hookSpecificOutput: { hookEventName:'PreToolUse',
 *                              permissionDecision:'ask', permissionDecisionReason } }
 *   provably-destructive -> { deny: true, reason }
 *
 * evaluate() NEVER throws: any un-analyzable input returns deny (fail-closed).
 */

// ── caps (fail-closed on overflow) ──────────────────────────────────────────
const MAX_LEN = 20000;        // input length cap
const MAX_SUBST_DEPTH = 12;   // paren-nesting cap inside a single $(...)
const MAX_RECURSION = 8;      // evaluate() recursion cap (command substitution)

// ── path classification helpers ─────────────────────────────────────────────

function isSensitivePath(p) {
  if (!p) return false;
  const s = String(p);
  // dotenv files: .env, .env.local, config/.env
  if (/(^|\/)\.env(\.[\w-]+)?$/.test(s) && !/\.(example|sample|template|dist|defaults)$/.test(s)) return true;
  // PEM material
  if (/\.pem$/.test(s)) return true;
  // private SSH key basenames (NOT *.pub public keys)
  if (/(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/.test(s)) return true;
  // credential/config directories (tilde- or slash-anchored)
  if (/(^|\/|~)\.ssh(\/|$)/.test(s)) return true;
  if (/(^|\/|~)\.aws(\/|$)/.test(s)) return true;
  if (/(^|\/|~)\.gnupg(\/|$)/.test(s)) return true;
  if (/(^|\/|~)\.kube(\/|$)/.test(s)) return true;
  if (/(^|\/|~)\.netrc$/.test(s)) return true;
  if (/(^|\/|~)\.config\/gcloud(\/|$)/.test(s)) return true;
  // system secret files
  if (/^\/etc\/(shadow|passwd|sudoers|gshadow|master\.passwd)(\/|$)/.test(s)) return true;
  return false;
}

// System roots whose deletion/overwrite is (almost) never legitimate for an
// agent. Deliberately EXCLUDES /tmp so temp paths stay allow. /home IS
// included (WI-P1): a recursive-force delete anywhere under a multi-user home
// tree is never legitimate for an agent, so it is treated like the other
// protected roots (matches bare '/home' AND any subdir/subpath beneath it,
// same as '/etc' already did). Any '~'-anchored path (bare '~', '~/', a glob
// under it '~/*', or a named subdir '~/Documents') is also protected (WI-P1
// broadening from the prior bare-'~'/'~/' -only check) — the entire home
// directory tree is treated as protected, not just its root. The bare
// root-glob '/*' is protected too, independent of any specific root name.
function isDangerousPath(p) {
  if (!p) return false;
  const s = String(p);
  if (s === '/') return true;
  if (s === '/*') return true;
  if (/^~(\/.*)?$/.test(s)) return true;
  if (/^\/(etc|usr|bin|sbin|lib|lib64|boot|sys|proc|dev|root|var|opt|home)(\/|$)/.test(s)) return true;
  if (isSensitivePath(s)) return true;
  return false;
}

function isBlockDevice(p) {
  return /^\/dev\/(sd|hd|nvme|vd|mmcblk|loop|disk|dm-|xvd|nbd)[a-z0-9]*/.test(String(p || ''));
}

function basename(v) {
  const s = String(v || '');
  const parts = s.split('/');
  return parts[parts.length - 1] || s;
}

// ── WI-P1: transparent wrapper / assignment-prefix resolution ──────────────
// A destructive command can be smuggled past the argv[0]-anchored structured
// checks in checkDisabledList by prefixing it with an env-var assignment
// (`FOO=bar rm -rf /etc`) or a transparent wrapper that re-execs its own argv
// unchanged (`nice rm -rf /etc`, `timeout 5 dd of=/dev/sda`). resolveEffective
// Command() walks past a leading run of assignment tokens and known wrappers
// (consuming each wrapper's own flags/operands) to land on the argv bash will
// actually execve(). Deliberately consulted ONLY by the rm/dd/find/sed/
// install/chmod checks and the shell -c recursion below — NOT by the eval /
// python|node|perl|ruby|php -c|-e obfuscation checks, which stay argv[0]-
// anchored on purpose so the existing REC-08/REC-09 belt-only env/backtick
// warn->ask / off->allow downgrade semantics are untouched.
const WRAPPER_CMDS = new Set([
  'env', 'nice', 'ionice', 'nohup', 'setsid', 'stdbuf', 'timeout', 'time', 'command', 'exec', 'builtin'
]);
// Short/long options that consume a SEPARATE next token as their value (for
// the wrappers above). Options not listed are assumed value-less, or to carry
// their value combined (e.g. -oL, -n10, --chdir=DIR) — see the combined-form
// detection in resolveEffectiveCommand.
const WRAPPER_VALUE_OPTS = {
  env: new Set(['-u', '--unset', '-C', '--chdir', '-S', '--split-string', '-a', '--argv0']),
  nice: new Set(['-n', '--adjustment']),
  ionice: new Set(['-c', '--class', '-n', '--classdata', '-p', '--pid']),
  stdbuf: new Set(['-i', '--input', '-o', '--output', '-e', '--error']),
  timeout: new Set(['-s', '--signal', '-k', '--kill-after']),
  // H1/REV1: `exec -a NAME cmd` - NAME is argv[0] for cmd, not the command.
  exec: new Set(['-a'])
};

function resolveEffectiveCommand(argv) {
  const n = argv.length;
  let i = 0;
  while (i < n) {
    const tok = argv[i];
    // Leading NAME=VALUE assignment: only a real literal counts (not a
    // variable-substitution token that happens to canonicalize with an '=').
    if (tok.litLen > 0 && tok.varCount === 0 && tok.substCount === 0 &&
        /^[A-Za-z_][A-Za-z0-9_]*=/.test(tok.canon)) {
      i++; continue;
    }
    const base = basename(tok.canon);
    if (WRAPPER_CMDS.has(base)) {
      i++;
      const valueOpts = WRAPPER_VALUE_OPTS[base] || new Set();
      let sawDuration = false;
      while (i < n) {
        const t = argv[i];
        const v = t.canon;
        if (v !== '-' && /^-/.test(v)) {
          i++;
          const isLongEq = /^--[A-Za-z-]+=/.test(v);
          const isShortCombined = !/^--/.test(v) && v.length > 2 && /^-[A-Za-z]/.test(v);
          if (!isLongEq && !isShortCombined && valueOpts.has(v)) i++;
          continue;
        }
        // `timeout DURATION cmd...` — the first non-option token after
        // `timeout` is a bare duration operand, not the command; skip it once.
        if (base === 'timeout' && !sawDuration) { sawDuration = true; i++; continue; }
        break;
      }
      continue; // may chain further (e.g. `env FOO=1 nice -n 5 rm ...`)
    }
    break; // not an assignment, not a wrapper -> this is the resolved command
  }
  return argv.slice(i);
}

// Shell interpreters whose `-c '<payload>'` argument is EXECUTED, not merely
// passed as data — the payload is recursed through the evaluator (bounded
// depth) so a destructive command hidden in the payload is not invisible to
// component 5 (mirrors the existing $(...)/backtick recursion in
// checkCommandSubstitution).
const SHELL_INTERPRETERS_EVAL = new Set(['sh', 'bash', 'zsh', 'dash']);
const MAX_SHELL_C_DEPTH = 3;

const INTERPRETERS = new Set([
  'sh', 'bash', 'zsh', 'dash', 'ksh', 'ash', 'csh', 'tcsh', 'fish',
  'python', 'python2', 'python3', 'perl', 'ruby', 'node', 'nodejs',
  'php', 'lua', 'tclsh'
]);
function isInterpreter(cmd) { return INTERPRETERS.has(cmd); }

function isDestructiveFileCmd(cmd) { return /^(rm|rmdir|shred|unlink|srm|wipe)$/.test(cmd); }

function isReader(cmd) {
  return /^(cat|head|tail|less|more|od|xxd|base64|base32|strings|nl|tac|cut|awk|grep|egrep|fgrep|sed|cp|dd|sort|uniq|wc|hexdump)$/.test(cmd);
}

// ── token flag helpers ──────────────────────────────────────────────────────
function isPureVar(t)          { return t && t.litLen === 0 && t.varCount === 1 && t.substCount === 0; }
function isCmdSubstPosition(t)  { return t && t.litLen === 0 && t.substCount >= 1; }

function hasRecursiveForce(argv) {
  let r = false, f = false;
  for (const t of argv) {
    const v = t.canon;
    if (/^-[a-z]+$/i.test(v)) {                 // combined short flags like -rf
      if (/r/.test(v) && /f/.test(v)) return true;
      if (/[rR]/.test(v)) r = true;
      if (/f/.test(v)) f = true;
    }
    if (v === '-r' || v === '-R' || v === '--recursive') r = true;
    if (v === '-f' || v === '--force') f = true;
  }
  return r && f;
}

// A destructive argv when the command name itself is computed/unknown:
// a recursive-force flag AND a literal dangerous path target.
function isVisiblyDestructiveArgv(args) {
  if (!hasRecursiveForce(args)) return false;
  return args.some(t => t.litLen > 0 && isDangerousPath(t.canon));
}

// ── ANSI-C ($'...') decoding ────────────────────────────────────────────────
function decodeAnsiC(s) {
  return String(s).replace(
    /\\(x[0-9A-Fa-f]{1,2}|u[0-9A-Fa-f]{1,4}|[0-7]{1,3}|n|t|r|a|b|f|v|e|\\|'|"|0)/g,
    (m, g) => {
      if (g[0] === 'x') return String.fromCharCode(parseInt(g.slice(1), 16));
      if (g[0] === 'u') return String.fromCharCode(parseInt(g.slice(1), 16));
      if (/^[0-7]+$/.test(g)) return String.fromCharCode(parseInt(g, 8) & 0xff);
      const map = { n: '\n', t: '\t', r: '\r', a: '\x07', b: '\b', f: '\f', v: '\v', e: '\x1b', '\\': '\\', "'": "'", '"': '"', '0': '\0' };
      return Object.prototype.hasOwnProperty.call(map, g) ? map[g] : m;
    }
  );
}

// Read the heredoc delimiter word that follows a `<<` at str[k], and return the
// index of the newline ENDING that heredoc's terminator line (or -1 when the
// delimiter is computed/absent and the body extent is therefore unknowable, and
// str.length when the heredoc is unterminated and so runs to EOF). Shared shape
// with tokenize()'s consumeHeredocs: the terminator must stand alone on its
// line, and `<<-` additionally strips leading TABS.
function oddTrailingBackslash(line) {
  const m = /\\+$/.exec(line);
  return !!m && m[0].length % 2 === 1;
}
function skipHeredocFrom(str, k) {
  let strip = false;
  if (str[k] === '-') { strip = true; k++; }
  while (k < str.length && (str[k] === ' ' || str[k] === '\t')) k++;
  let delim = '', q = null, quoted = false;
  while (k < str.length) {
    const c = str[k];
    if (q) { if (c === q) { q = null; k++; continue; } delim += c; k++; continue; }
    if (c === "'" || c === '"') { q = c; quoted = true; k++; continue; }
    if (c === '\\') quoted = true;
    if (c === '$' || c === '`') return -1;          // computed delimiter -> unknowable
    if (/[\s;|&()<>]/.test(c)) break;
    delim += c; k++;
  }
  if (delim === '') return -1;
  const nl = str.indexOf('\n', k);
  if (nl < 0) return -1;                            // no body at all on this line
  let p = nl + 1;
  while (p <= str.length) {
    let le = str.indexOf('\n', p);
    if (le < 0) le = str.length;
    let line = str.slice(p, le);
    if (line.endsWith('\r')) line = line.slice(0, -1);
    // WI-20 F4: an unquoted heredoc joins `\<newline>` before the terminator
    // compare, as bash does (`E\` + `OF` ends the body).
    while (!quoted && oddTrailingBackslash(line) && le < str.length) {
      let le2 = str.indexOf('\n', le + 1);
      if (le2 < 0) le2 = str.length;
      let nxt = str.slice(le + 1, le2);
      if (nxt.endsWith('\r')) nxt = nxt.slice(0, -1);
      line = line.slice(0, -1) + nxt; le = le2;
    }
    const cand = strip ? line.replace(/^\t+/, '') : line;
    if (cand === delim) return le;                  // index of the terminator's newline
    if (le >= str.length) break;
    p = le + 1;
  }
  return str.length;                                // unterminated -> body runs to EOF
}

// Extract a balanced $(...) starting at str[i] === '(' . Quote-aware,
// heredoc-aware, depth-capped. Returns { inner, end } (end = index AFTER the ')').
//
// Heredoc-awareness matters because this scanner is the OTHER half of the
// apostrophe false positive fixed in tokenize(): for the shape
// `git commit -m "$(cat <<'EOF' ... EOF)"`, a prose apostrophe in the heredoc
// body ("the model's unit test") flipped this scanner into single-quote mode,
// desynced paren matching, and threw 'unbalanced command substitution' — which
// fail-closed the whole benign command to a confirmation prompt (the motivating
// report behind threat-model 5.3). Skipping the body here is sound for the same
// reason it is in tokenize(): bash never lexes a heredoc body as shell. The body
// text stays INSIDE the returned `inner`, so the substitution is still recursed
// through the evaluator in full — a heredoc feeding a shell is unaffected.
function extractParen(str, i) {
  let depth = 0, inq = null;
  for (let j = i; j < str.length; j++) {
    const ch = str[j];
    if (inq) {
      if (ch === '\\' && inq === '"') { j++; continue; }
      if (ch === inq) inq = null;
      continue;
    }
    if (ch === '<' && str[j + 1] === '<' && str[j + 2] !== '<') {
      const skipTo = skipHeredocFrom(str, j + 2);
      if (skipTo >= 0) { j = skipTo; continue; }     // resume after the terminator line
      continue;                                      // unknowable -> scan as before
    }
    if (ch === "'" || ch === '"') { inq = ch; continue; }
    if (ch === '(') { depth++; if (depth > MAX_SUBST_DEPTH) throw new Error('substitution depth exceeded'); }
    else if (ch === ')') { depth--; if (depth === 0) return { inner: str.slice(i + 1, j), end: j + 1 }; }
  }
  throw new Error('unbalanced command substitution');
}

// WI-20 G3: the $(...) and `...` inners of text that bash expands without
// tokenizing it as shell words (an unquoted heredoc body, a ${...} operand).
// An unbalanced inner is returned as the rest of the text, so it is still judged.
function substInnersOf(text) {
  const out = [];
  for (let j = 0; j < text.length; j++) {
    const ch = text[j];
    if (ch === '\\') { j++; continue; }
    if (ch === '$' && text[j + 1] === '(') {
      try { const r = extractParen(text, j + 1); out.push(r.inner); j = r.end - 1; }
      catch (e) { out.push(text.slice(j + 2)); break; }
      continue;
    }
    if (ch === '`') {
      let k = j + 1, buf = '';
      while (k < text.length && text[k] !== '`') { if (text[k] === '\\') { buf += text[k + 1] || ''; k += 2; continue; } buf += text[k]; k++; }
      out.push(buf); j = k;
    }
  }
  return out;
}

// Handle a `$` at position i. ctx.appendLit/addVar/addSubst/splitField mutate
// the current token. inDouble => we are inside a double-quoted context.
// Returns the index to resume scanning at.
function readDollar(str, i, ctx, inDouble) {
  const n = str[i + 1];
  if (n === '(') {
    const { inner, end } = extractParen(str, i + 1);
    ctx.addSubst(inner);
    return end;
  }
  if (n === '{') {
    let j = i + 2, depth = 1, buf = '';
    while (j < str.length && depth > 0) {
      const ch = str[j];
      if (ch === '{') { depth++; buf += ch; }
      else if (ch === '}') { depth--; if (depth === 0) { j++; break; } buf += ch; }
      else buf += ch;
      j++;
    }
    if (depth !== 0) throw new Error('unbalanced ${');
    const nameMatch = buf.match(/^([A-Za-z_][A-Za-z0-9_]*)/);
    const name = nameMatch ? nameMatch[1] : '';
    if (!inDouble && /^IFS$/.test(buf)) ctx.splitField();
    else ctx.addVar(name);
    // WI-20 G3/N2: `${x:-$(cmd)}` runs cmd. Record the inner substitutions so
    // checkCommandSubstitution judges them.
    if (/\$\(|`/.test(buf)) for (const inner of substInnersOf(buf)) ctx.addSubst(inner, true);
    return j;
  }
  if (n === "'" && !inDouble) {           // $'...' ANSI-C quoting
    let j = i + 2, buf = '';
    while (j < str.length) {
      const ch = str[j];
      if (ch === '\\') { buf += str[j] + (str[j + 1] || ''); j += 2; continue; }
      if (ch === "'") { j++; break; }
      buf += ch; j++;
    }
    ctx.appendLit(decodeAnsiC(buf));
    return j;
  }
  if (n && /[A-Za-z_]/.test(n)) {          // $VAR
    let j = i + 1, name = '';
    while (j < str.length && /[A-Za-z0-9_]/.test(str[j])) { name += str[j]; j++; }
    if (!inDouble && name === 'IFS') ctx.splitField();
    else ctx.addVar(name);
    return j;
  }
  if (n && /[@*#?$!0-9-]/.test(n)) {        // special params ($@, $1, $$, ...)
    ctx.addVar('_special_');
    return i + 2;
  }
  ctx.appendLit('$');                       // lone $
  return i + 1;
}

// ── the lexer ───────────────────────────────────────────────────────────────
// Returns { segments } where each segment = { argv:[token], redirects:[{op,target}], op, ifsSplit }.
// A token = { canon, litLen, varCount, substCount, substInners }.
// Throws on un-parseable / over-length / over-depth input (evaluate() -> deny).
function tokenize(command) {
  if (typeof command !== 'string') throw new Error('command must be a string');
  if (command.length > MAX_LEN) throw new Error('command exceeds maximum length');

  const str = command;
  const len = str.length;
  const segments = [];
  let curArgv = [];
  let curRedirects = [];
  let curToken = null;
  let pendingRedirect = null;
  let curIfsSplit = false;   // segment was assembled via unquoted $IFS/${IFS} field-split
  let pendingHeredocStrip = false;  // the pending << was written <<- (strip leading tabs)
  const heredocQueue = [];          // heredocs declared on the current line, in bash's read order

  function freshToken() { return { canon: '', litLen: 0, varCount: 0, substCount: 0, substInners: [], varNames: [] }; }
  // start/end: the token's span in `str` (H2/REV1 rebuilds the command string
  // with a resolved `$NAME` spliced in at exactly this span).
  function ensureToken() { if (!curToken) { curToken = freshToken(); curToken.start = i; } }
  function endToken() {
    if (!curToken) return;
    const t = curToken;
    t.end = i;
    // WI-21 round 2: the token's source text, for quote-shape checks.
    if (Number.isInteger(t.start)) t.raw = str.slice(t.start, i);
    curToken = null;
    if (pendingRedirect) {
      // The word after << is the terminator. Queue it (with the segment index it
      // belongs to) so the newline handler can skip that heredoc's body. A
      // delimiter that is itself computed (<<$X) is NOT queued: we cannot know
      // where the body ends, so the old fail-closed behaviour is kept.
      if (pendingRedirect === '<<') {
        if (t.varCount === 0 && t.substCount === 0) {
          const rawDelim = Number.isInteger(t.start) ? str.slice(t.start, i) : '';
          heredocQueue.push({ delim: t.canon, strip: pendingHeredocStrip, ownerIdx: segments.length,
            quoted: /['"\\]/.test(rawDelim) });
        }
        pendingHeredocStrip = false;
      }
      curRedirects.push({ op: pendingRedirect, target: t }); pendingRedirect = null;
    }
    else curArgv.push(t);
  }
  function endSegment(op) {
    endToken();
    if (curArgv.length || curRedirects.length) {
      segments.push({ argv: curArgv, redirects: curRedirects, op: op || null, ifsSplit: curIfsSplit });
    }
    curArgv = [];
    curRedirects = [];
    curIfsSplit = false;
  }

  // Skip the BODY of every heredoc declared on the line just ended. A heredoc
  // body is DATA: bash feeds it to the command on stdin and never tokenizes it
  // as shell source. Leaving it in the token stream meant one odd apostrophe in
  // a commit message ("it's") threw 'unterminated single quote' and fail-closed
  // the whole benign command to `ask`. Skipping is SOUND for exactly the reason
  // the '#' comment skip above is sound — bash does not execute this text — and
  // the terminator rule matches bash precisely (the delimiter must stand alone
  // on its line; <<- additionally strips leading TABS; an unterminated heredoc
  // runs to EOF). The ONE shape where a body IS executed — `bash <<'EOF'`, where
  // the shell reads the body as its own script — is not lost: the body is
  // recorded on the segment and recursed through the evaluator in
  // checkDisabledList, exactly like a `-c` payload.
  function consumeHeredocs(nlIdx) {
    let p = (str[nlIdx] === '\r' && str[nlIdx + 1] === '\n') ? nlIdx + 2 : nlIdx + 1;
    while (heredocQueue.length) {
      const hd = heredocQueue.shift();
      const owner = segments[hd.ownerIdx] || segments[segments.length - 1] || null;
      const bodyStart = p;
      let bodyEnd = len, after = len;
      let q = p;
      while (q < len) {
        let lineEnd = str.indexOf('\n', q);
        if (lineEnd < 0) lineEnd = len;
        let line = str.slice(q, lineEnd);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        // WI-20 F4: unquoted heredoc -> join `\<newline>` before the compare
        // (bash does), so a forged terminator cannot hide the next lines.
        while (!hd.quoted && oddTrailingBackslash(line) && lineEnd < len) {
          let le2 = str.indexOf('\n', lineEnd + 1);
          if (le2 < 0) le2 = len;
          let nxt = str.slice(lineEnd + 1, le2);
          if (nxt.endsWith('\r')) nxt = nxt.slice(0, -1);
          line = line.slice(0, -1) + nxt; lineEnd = le2;
        }
        const cand = hd.strip ? line.replace(/^\t+/, '') : line;
        if (cand === hd.delim) { bodyEnd = q; after = Math.min(lineEnd + 1, len); break; }
        q = lineEnd + 1;
      }
      if (owner) (owner.heredocs || (owner.heredocs = [])).push({ delim: hd.delim, body: str.slice(bodyStart, bodyEnd), quoted: !!hd.quoted });
      p = after;
    }
    return p;
  }

  const ctx = {
    appendLit(s) { ensureToken(); curToken.canon += s; curToken.litLen += s.length; },
    addVar(name) { ensureToken(); curToken.varCount++; curToken.varNames.push(name || ''); },
    addSubst(inner, param) { ensureToken(); curToken.substCount++; curToken.substInners.push(inner);
      if (param) (curToken.paramInners || (curToken.paramInners = [])).push(inner); },
    splitField() { curIfsSplit = true; endToken(); }
  };

  let i = 0;
  while (i < len) {
    const c = str[i];

    // unquoted whitespace -> token boundary
    if (c === ' ' || c === '\t') { endToken(); i++; continue; }
    if (c === '\n' || c === '\r') {
      endSegment(';');
      if (heredocQueue.length) { i = consumeHeredocs(i); continue; }
      i++; continue;
    }

    // '#' begins a comment ONLY at a word boundary — bash ignores a word that
    // begins with '#' and everything after it on that line. We are at a word
    // boundary exactly when no token is currently being accumulated
    // (curToken === null, i.e. we're right after start-of-input, whitespace, or
    // a control/redirect operator). A '#' in the MIDDLE of a word (foo#bar, a
    // URL fragment, $VAR#suffix) stays literal, matching bash. Modeling the
    // comment here prevents a stray quote/apostrophe INSIDE a trailing comment
    // (e.g. `... # this won't work`) from being misread as an unterminated
    // single quote and fail-closing the whole benign command to DENY. Skipping
    // it is also SOUND, not a bypass: bash never executes text after a
    // word-start '#', so the guard still inspects exactly the argv bash runs —
    // everything BEFORE the '#' is fully tokenized and analyzed as usual. Leave
    // i on the terminating '\n' so the newline handler above closes the segment.
    if (c === '#' && curToken === null) {
      while (i < len && str[i] !== '\n') i++;
      continue;
    }

    // backslash escape (unquoted)
    if (c === '\\') {
      const nx = str[i + 1];
      if (nx === undefined) { ctx.appendLit('\\'); i++; continue; }
      if (nx === '\n') { i += 2; continue; }         // line continuation
      ctx.appendLit(nx); i += 2; continue;           // literal next char (quote removal)
    }

    // single quotes: literal, no expansion, no escapes
    if (c === "'") {
      ensureToken();
      const close = str.indexOf("'", i + 1);
      if (close < 0) throw new Error('unterminated single quote');
      ctx.appendLit(str.slice(i + 1, close));
      i = close + 1; continue;
    }

    // double quotes: allow $ / backtick expansion and \ escapes of $ ` " \
    if (c === '"') {
      ensureToken();
      let j = i + 1, closed = false;
      while (j < len) {
        const ch = str[j];
        if (ch === '"') { closed = true; j++; break; }
        if (ch === '\\') {
          const nx = str[j + 1];
          if (nx === '$' || nx === '`' || nx === '"' || nx === '\\') { ctx.appendLit(nx); j += 2; continue; }
          if (nx === '\n') { j += 2; continue; }
          ctx.appendLit('\\'); j++; continue;
        }
        if (ch === '$') { j = readDollar(str, j, ctx, true); continue; }
        if (ch === '`') {
          let k = j + 1, buf = '';
          while (k < len) {
            if (str[k] === '\\') { buf += str[k + 1] || ''; k += 2; continue; }
            if (str[k] === '`') { k++; break; }
            buf += str[k]; k++;
          }
          ctx.addSubst(buf); j = k; continue;
        }
        ctx.appendLit(ch); j++;
      }
      if (!closed) throw new Error('unterminated double quote');
      i = j; continue;
    }

    // dollar expansions (unquoted)
    if (c === '$') { i = readDollar(str, i, ctx, false); continue; }

    // backtick command substitution (unquoted)
    if (c === '`') {
      ensureToken();
      let k = i + 1, buf = '';
      let closed = false;
      while (k < len) {
        if (str[k] === '\\') { buf += str[k + 1] || ''; k += 2; continue; }
        if (str[k] === '`') { closed = true; k++; break; }
        buf += str[k]; k++;
      }
      if (!closed) throw new Error('unterminated backtick');
      ctx.addSubst(buf); i = k; continue;
    }

    // control operators
    if (c === '|') {
      if (str[i + 1] === '|') { endSegment('||'); i += 2; continue; }
      endSegment('|'); i++; continue;
    }
    if (c === '&') {
      if (str[i + 1] === '&') { endSegment('&&'); i += 2; continue; }
      if (str[i + 1] === '>') {                        // &> redirect (stdout+stderr)
        endToken(); pendingRedirect = '&>'; i += 2; continue;
      }
      endSegment('&'); i++; continue;
    }
    if (c === ';') {
      if (str[i + 1] === ';') { endSegment(';'); i += 2; continue; }
      endSegment(';'); i++; continue;
    }
    if (c === '(' || c === ')') { endSegment(c); i++; continue; }

    // WI-20 G3/N2: process substitution `<(cmd)` / `>(cmd)` runs cmd and is a
    // filename word. Record it as a substitution so its inner is judged.
    if ((c === '<' || c === '>') && str[i + 1] === '(') {
      endToken();
      ensureToken();
      const { inner, end } = extractParen(str, i + 1);
      ctx.addSubst(inner);
      curToken.procSubst = true;
      i = end; continue;
    }
    // redirects
    if (c === '>') {
      endToken();
      if (str[i + 1] === '>') { pendingRedirect = '>>'; i += 2; }
      else if (str[i + 1] === '&') { pendingRedirect = '>&'; i += 2; }
      else { pendingRedirect = '>'; i++; }
      continue;
    }
    if (c === '<') {
      endToken();
      if (str[i + 1] === '<') {
        // <<< is a HERESTRING (its word is data on the same line, no body to
        // skip); <<- is a heredoc whose terminator may be tab-indented.
        if (str[i + 2] === '<') { pendingRedirect = '<<<'; i += 3; }
        else if (str[i + 2] === '-') { pendingRedirect = '<<'; pendingHeredocStrip = true; i += 3; }
        else { pendingRedirect = '<<'; pendingHeredocStrip = false; i += 2; }
      }
      else { pendingRedirect = '<'; i++; }
      continue;
    }

    // ordinary literal character
    ctx.appendLit(c);
    i++;
  }

  endSegment(null);
  return { segments };
}

// ── canonical string builder (for legacy-superset regex matching) ───────────
function buildCanonical(segments) {
  const parts = [];
  for (const seg of segments) {
    const av = seg.argv.map(t => t.canon).filter(x => x !== '').join(' ');
    let s = av;
    for (const r of seg.redirects) {
      s += ' ' + r.op + ' ' + (r.target ? r.target.canon : '');
    }
    s = s.trim();
    if (s !== '') parts.push(s);
    if (seg.op) parts.push(seg.op);
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

// ── verdict sentinels (internal) ────────────────────────────────────────────
function D(reason) { return { kind: 'deny', reason }; }
function A(reason) { return { kind: 'ask', reason }; }
// DF — a FAIL-CLOSED deny: the evaluator could not *parse* the input (un-tokenizable
// / un-canonicalizable), so it can prove NEITHER safety NOR destruction. It is still
// a deny at the evaluator level (the pure-library contract stays conservative), but
// it carries `failClosed: true` so the calling hook can distinguish "I couldn't
// analyze this benign-looking command" from "I PROVED this command is destructive".
// bash-validator.cjs uses the flag to soft-fail an un-analyzable command to a
// confirmation `ask` (after the catastrophic raw-string belt still hard-denies any
// known-destructive literal) instead of hard-blocking it. This does NOT apply to an
// evaluator DEFECT (a component throwing, or evaluate() itself throwing) — those stay
// hard denies (machinery-broken = fail hard), only an input-parse failure is soft.
function DF(reason) { return { kind: 'deny', reason, failClosed: true }; }

// ── fork bomb (raw pre-check — tokenization would mangle :(){...};: ) ────────
function isForkBomb(raw) {
  const s = String(raw).replace(/\s+/g, '');
  // NAME(){NAME|NAME&};NAME  (self-referential recursive pipe-into-background)
  if (/([\w:.]+)\(\)\{\1\|\1&?\};\1/.test(s)) return true;
  // looser catch: a self-pipe :|: inside a function-def-and-call shape
  if (/\(\)\{[^}]*\|[^}]*&[^}]*\};/.test(s) && /(:\|:|(\w)\|\2)/.test(s)) return true;
  return false;
}

// ── Component 2: variable-expansion detection ───────────────────────────────
// A leading NAME=VALUE token, used to resolve a later `$NAME` back to the
// literal it was assigned in the SAME command string (see checkVariableExpansion).
const INLINE_ASSIGN_RE = /^([A-Za-z_][A-Za-z0-9_]*)=([\s\S]*)$/;

// Words that can open a segment in front of the real command (`then rm ...`,
// `do $C`, `{ reboot; }`, `! cmd`). commandPosition() skips them so a command
// inside if/while/for bodies and brace groups is judged like a top-level one.
// R1: `if`/`while`/`until`/`(` added so `if rm -rf /etc; then` and
// `while rm ...; do` are judged too. skipLeadKeywords() drops ONLY those words
// (no wrapper/assignment resolution), for the argv[0]-anchored checks that must
// keep their raw-wrapper semantics; commandPosition() also resolves wrappers.
// WI-20 G3: `coproc cmd`, `coproc NAME { cmd; }` and `function NAME { cmd; }`
// run cmd, so their lead words are skipped too.
const LEAD_KEYWORDS = new Set(['if', 'while', 'until', 'do', 'then', 'else', 'elif', '{', '(', '!', 'time', 'coproc']);
function skipLeadKeywords(argv) {
  let k = 0;
  while (k < argv.length - 1 && argv[k].varCount === 0 && argv[k].substCount === 0 &&
         (LEAD_KEYWORDS.has(argv[k].canon) || argv[k].canon === 'function')) {
    const w = argv[k].canon;
    if ((w === 'function' || w === 'coproc') && k + 3 < argv.length && argv[k + 2].canon === '{') { k += 3; continue; }
    if (w === 'function') break;
    k++;
    // H1/REV2: the `time` keyword takes -p (and --) before the command.
    if (argv[k - 1].canon === 'time') while (k < argv.length - 1 && (argv[k].canon === '-p' || argv[k].canon === '--')) k++;
  }
  return k ? argv.slice(k) : argv;
}
function commandPosition(argv) {
  return resolveEffectiveCommand(skipLeadKeywords(argv));
}

// H2/S2a: compound-command words and variable-writing builtins. When any of
// them is present the command string can rebind a variable in a way a plain
// left-to-right scan cannot follow (loop variables, conditional bodies, read,
// eval, source, declare/export with a computed value ...), so no assignment is
// trusted as a literal.
const COMPOUND_WORDS = new Set(['if', 'then', 'else', 'elif', 'fi', 'while', 'until', 'do', 'done', 'for',
  'case', 'esac', 'select', 'function', 'coproc', '{', '}', '[[', ']]']);
// WI-8 REV1: wait -p NAME writes a variable too.
const VAR_WRITER_CMDS = new Set(['eval', 'source', '.', 'read', 'mapfile', 'readarray', 'declare', 'typeset',
  'local', 'export', 'readonly', 'let', 'getopts', 'unset', 'builtin', 'enable', 'alias', 'wait']);

// Count the places NAME appears in the raw command OTHER than as a plain
// `$NAME` / `${NAME}` read. The single literal assignment is one such place;
// any second one (`read NAME`, `for NAME in`, `NAME+=x`, `${NAME:=x}`,
// `((NAME++))`, `N=NAME; read $N`, a heredoc body ...) is a possible rebind.
function bareMentions(raw, name) {
  const stripped = raw.replace(new RegExp('\\$\\{' + name + '\\}|\\$' + name + '(?![A-Za-z0-9_])', 'g'), '');
  const m = stripped.match(new RegExp('(?<![A-Za-z0-9_])' + name + '(?![A-Za-z0-9_])', 'g'));
  return m ? m.length : 0;
}

// S2a: NAME -> { value, idx } for variables whose value at every later
// `$NAME` is PROVABLY the literal assigned once, unconditionally, in the
// current shell. Anything that could rebind, unset or scope the variable
// (a second mention, a subshell/function/compound command, a writer builtin,
// a pipeline/background/conditional assignment, a glob in the command word, IFS
// changes) drops the entry, and the caller falls back to `ask`.
function buildLiteralAssignMap(segments, raw) {
  const out = new Map();
  if (/(?<![A-Za-z0-9_])IFS(?![A-Za-z0-9_])/.test(raw)) return out;
  const cand = new Map();
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.op === '(' || seg.op === ')') return new Map();
    if (!seg.argv.length) continue;
    const a0 = seg.argv[0];
    if (a0.varCount === 0 && a0.substCount === 0 && COMPOUND_WORDS.has(a0.canon)) return new Map();
    // The writer check reads the COMMAND word only (past keywords, wrappers and
    // prefix assignments): `.` or `read` as a plain argument (`grep x .`) is data.
    const cp = commandPosition(seg.argv);
    const c0 = cp.length && cp[0].varCount === 0 && cp[0].substCount === 0 ? basename(cp[0].canon) : '';
    if (VAR_WRITER_CMDS.has(c0)) return new Map();
    if (c0 === 'printf' && cp.some(t => t.canon === '-v' || /^-v./.test(t.canon))) return new Map();
    const allAssign = seg.argv.every(t => t.litLen > 0 && t.varCount === 0 && t.substCount === 0 && INLINE_ASSIGN_RE.test(t.canon));
    if (!allAssign) continue;
    const prevOp = i > 0 ? segments[i - 1].op : null;
    const unconditional = (prevOp === null || prevOp === ';') && seg.op !== '|' && seg.op !== '&';
    for (const t of seg.argv) {
      const m = INLINE_ASSIGN_RE.exec(t.canon);
      // A glob in the FIRST word would pick the command name from the file list.
      // A glob in a later word is an argument, judged as a literal like any
      // typed argument.
      const firstWord = m[2].trim().split(/[ \t\n]+/)[0] || '';
      if (cand.has(m[1]) || !unconditional || /[*?[]/.test(firstWord)) { cand.set(m[1], null); continue; }
      cand.set(m[1], { value: m[2], idx: i });
    }
  }
  for (const [name, entry] of cand) {
    if (entry && bareMentions(raw, name) === 1) out.set(name, entry);
  }
  return out;
}

// H5: a variable assigned `$(mktemp ...)` holds a path that mktemp just made.
// It is a temp path, so `T=$(mktemp -d); rm -rf "$T"` does not ask. The rules:
//  - The token is exactly NAME=$(mktemp ARGS) or NAME=`mktemp ARGS`. ARGS hold
//    no substitution, redirect, pipe or second command.
//  - NAME has one mention in the raw command (bareMentions), so no second
//    assignment, read, loop variable or ${NAME:=x} can rebind it.
//  - The assignment comes before the first compound word, subshell or function
//    in the string, so it cannot sit in a conditional body.
//  - The assignment is not in a pipe or in the background. After `&&` it
//    counts only for commands that the same `&&` chain guards.
//  - A writer builtin (eval, source, read, declare, export ...) anywhere voids
//    the map, because it can rebind NAME where the scan cannot see.
//  - IFS anywhere voids the map.
// An unquoted $NAME is word-split and globbed. It is trusted only when the
// mktemp args are literal path-safe words, the command does not mention
// TMPDIR, and the hook's own TMPDIR is path-safe. Otherwise only "$NAME"
// counts. A mktemp failure gives an empty value: `rm -rf "$T"` and
// `rm -rf $T` with an empty T delete nothing. A target with a suffix
// (`$T/x`, `$T/*`) is not a pure variable and is not covered here.
const PATH_SAFE_RE = /^[A-Za-z0-9._\/=:@%+-]+$/;
function mktempInner(inner) {
  let segs;
  try { segs = tokenize(String(inner || '')).segments; } catch (e) { return null; }
  if (segs.length !== 1) return null;
  const s = segs[0];
  if (s.op || s.redirects.length || !s.argv.length) return null;
  const a0 = s.argv[0];
  if (a0.varCount || a0.substCount || !/^(\/usr)?(\/bin\/)?mktemp$/.test(a0.canon)) return null;
  let safe = true;
  for (const t of s.argv.slice(1)) {
    if (t.substCount) return null;
    // WI-8 REV2: only the options that make mktemp print a path. --version,
    // --help or an unknown option print text that is not a path.
    if (/^-/.test(t.canon) && !/^-[dqutp]+$/.test(t.canon) &&
        !/^--(directory|dry-run|quiet|tmpdir(=.*)?|suffix(=.*)?)$/.test(t.canon)) return null;
    if (t.varCount || t.litLen === 0 || !PATH_SAFE_RE.test(t.canon)) safe = false;
  }
  return { argsSafe: safe };
}
function buildTempAssignMap(segments, raw) {
  const out = new Map();
  const src = String(raw || '');
  if (/(?<![A-Za-z0-9_])IFS(?![A-Za-z0-9_])/.test(src)) return out;
  const envTmp = process.env.TMPDIR;
  const envSafe = envTmp === undefined || envTmp === '' || PATH_SAFE_RE.test(envTmp);
  const tmpdirMentioned = /(?<![A-Za-z0-9_])TMPDIR(?![A-Za-z0-9_])/.test(src);
  // WI-8 REV1: a PATH change can make `mktemp` a different program.
  if (/(?<![A-Za-z0-9_])PATH(?![A-Za-z0-9_])/.test(src)) return out;
  const cand = new Map();
  let open = true;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.op === '(' || seg.op === ')') open = false;
    if (!seg.argv.length) continue;
    const a0 = seg.argv[0];
    if (a0.varCount === 0 && a0.substCount === 0 && COMPOUND_WORDS.has(a0.canon)) open = false;
    const cp = commandPosition(seg.argv);
    const c0 = cp.length && cp[0].varCount === 0 && cp[0].substCount === 0 ? basename(cp[0].canon) : '';
    if (VAR_WRITER_CMDS.has(c0)) return new Map();
    if (c0 === 'printf' && cp.some(t => t.canon === '-v' || /^-v./.test(t.canon))) return new Map();
    if (!open) continue;
    const allAssign = seg.argv.every(t => t.litLen > 0 && t.varCount === 0 && INLINE_ASSIGN_RE.test(t.canon));
    if (!allAssign) continue;
    const prevOp = i > 0 ? segments[i - 1].op : null;
    const pipedOrBg = seg.op === '|' || seg.op === '&';
    for (const t of seg.argv) {
      const m = INLINE_ASSIGN_RE.exec(t.canon);
      const name = m[1];
      if (cand.has(name)) { cand.set(name, null); continue; }
      const isMk = t.substCount === 1 && m[2] === '' && t.litLen === name.length + 1;
      const info = isMk ? mktempInner(t.substInners[0]) : null;
      if (!info || pipedOrBg || !(prevOp === null || prevOp === ';' || prevOp === '&&')) { cand.set(name, null); continue; }
      cand.set(name, { idx: i, chained: prevOp === '&&', unquotedSafe: info.argsSafe && envSafe && !tmpdirMentioned });
    }
  }
  for (const [name, entry] of cand) {
    if (entry && bareMentions(src, name) === 1) out.set(name, entry);
  }
  return out;
}
// The temp entry covers segment si when the assignment ran before it on every
// path: an unconditional assignment, or an `&&` chain with no other operator
// between the assignment and segment si.
function tempCovers(entry, si, segments) {
  if (!entry || entry.idx >= si) return false;
  if (!entry.chained) return true;
  for (let k = entry.idx; k < si; k++) if (segments[k].op !== '&&') return false;
  return true;
}
// True when token t is a pure $NAME / ${NAME} read whose name is a temp path
// at segment si, quoted or (when safe) unquoted.
function isTempVarToken(t, si, segments, temp, raw) {
  if (!isPureVar(t)) return false;
  const name = (t.varNames && t.varNames[0]) || '';
  const entry = name ? temp.get(name) : null;
  if (!tempCovers(entry, si, segments)) return false;
  if (entry.unquotedSafe) return true;
  if (!Number.isInteger(t.start) || !Number.isInteger(t.end)) return false;
  const span = String(raw || '').slice(t.start, t.end);
  return span === '"$' + name + '"' || span === '"${' + name + '}"';
}

// K1/W1/W3: git operations that destroy history or remote refs. Each check
// reads the argv of a segment whose command word is git, so the same words in
// grep, echo or commit-message data do not ask.
// WI-21 round 5 MF-R4-1: true when the word is not provably the literal text it
// spells. That is any variable, parameter expansion, command/process
// substitution or arithmetic expansion ANYWHERE in the word (also mixed with
// literal text: "x$@", x"${A[@]}", w$X, H$X), a backslash-newline, an unquoted
// brace expansion ({w,-f} {1..3}), a tilde at the start, and an unquoted glob
// that can match a name starting with "-" (* ?f -[f] @(...)). The tokenizer
// keeps only the literal part in t.canon, so every git and runner rule calls
// this before it trusts t.canon. Unknown text is true (fail closed).
function rawHasExpansion(raw) {
  if (typeof raw !== 'string' || raw === '') return false;
  if (raw.includes('\\\n')) return true;
  // WI-21 round 6 L-R5-1: ANSI-C $'..' and locale $"..." quoting decode escapes
  // ($'\x2d' is "-"), and the glob check below cannot see through them
  // ($'-'* matches -f). Any word that holds either form is unknown.
  if (raw.includes("$'") || raw.includes('$"')) return true;
  let prefix = '';      // the literal text before the first unquoted glob
  let braceDepth = 0;
  let i = 0;
  const n = raw.length;
  const dollarExpands = (j) => { const c = raw[j + 1]; return c !== undefined && /[({A-Za-z_@*#?$!0-9-]/.test(c); };
  if (raw[0] === '~') return true;
  while (i < n) {
    const c = raw[i];
    if (c === '\\') { prefix += raw[i + 1] || ''; i += 2; continue; }
    if (c === "'") {
      const e = raw.indexOf("'", i + 1);
      if (e === -1) return true;
      prefix += raw.slice(i + 1, e); i = e + 1; continue;
    }
    if (c === '$' && raw[i + 1] === "'") {
      let j = i + 2;
      while (j < n && raw[j] !== "'") j += raw[j] === '\\' ? 2 : 1;
      if (j >= n) return true;
      prefix += 'x'; i = j + 1; continue;
    }
    if (c === '"' || (c === '$' && raw[i + 1] === '"')) {
      let j = c === '"' ? i + 1 : i + 2;
      while (j < n && raw[j] !== '"') {
        if (raw[j] === '\\') { prefix += raw[j + 1] || ''; j += 2; continue; }
        if (raw[j] === '`') return true;
        if (raw[j] === '$' && dollarExpands(j)) return true;
        prefix += raw[j]; j++;
      }
      if (j >= n) return true;
      i = j + 1; continue;
    }
    if (c === '`') return true;
    if (c === '$' && dollarExpands(i)) return true;
    if ((c === '<' || c === '>') && raw[i + 1] === '(') return true;
    if (c === '{') { braceDepth++; prefix += c; i++; continue; }
    if (c === '}') { if (braceDepth > 0) braceDepth--; prefix += c; i++; continue; }
    if (braceDepth > 0 && (c === ',' || (c === '.' && raw[i + 1] === '.'))) return true;
    if (c === '*' || c === '?' || c === '[' || (/[@!+]/.test(c) && raw[i + 1] === '(')) {
      if (prefix === '' || prefix[0] === '-') return true;
    }
    prefix += c; i++;
  }
  return false;
}
function wordHasExpansion(t) {
  if (!t) return false;
  if (t.varCount || t.substCount) return true;
  return rawHasExpansion(t.raw);
}
const GIT_GLOBAL_WITH_ARG = new Set(['-C', '--git-dir', '--work-tree', '--namespace', '--exec-path',
  '--super-prefix', '--list-cmds', '--attr-source']);
const GIT_PUSH_WITH_ARG = new Set(['-o', '--push-option', '--repo', '--receive-pack', '--exec',
  '--recurse-submodules']);
const PUSH_FORCE_MSG = 'Force push may cause data loss. Consider --force-with-lease.';
// WI-21 round 6 MF-R5-1: git parse-options accepts ANY unambiguous prefix of a
// long option (`git checkout --f` and `--fo` are --force). So a name matches a
// dangerous option when it is a nonempty prefix of it. A prefix that is
// ambiguous between a dangerous and a benign option also matches: git rejects
// an ambiguous prefix, so asking costs nothing (fail closed).
function longOptIs(name, full) { return typeof name === 'string' && name.length >= 1 && full.startsWith(name); }
function gitPushMessage(args) {
  let positional = 0;
  let optsDone = false;
  for (let k = 0; k < args.length; k++) {
    const t = args[k];
    const v = t.canon;
    // WI-21 round 5: an expanded word can be -f, --force or a +refspec.
    if (wordHasExpansion(t)) return GIT_UNKNOWN_WORD_MSG;
    if (!optsDone && v === '--') { optsDone = true; continue; }
    if (!optsDone && /^--/.test(v)) {
      const name = v.slice(2).split('=')[0];
      if (/^force-(with-lease|if-includes)$/.test(name) || /^no-/.test(name)) continue;
      if (longOptIs(name, 'force')) return PUSH_FORCE_MSG;
      if (longOptIs(name, 'mirror')) return 'git push --mirror overwrites and deletes remote refs to match this clone. Verify the remote first.';
      if (longOptIs(name, 'delete')) return 'git push --delete removes a remote branch or tag. Verify the ref name.';
      if (longOptIs(name, 'prune')) return 'git push --prune deletes remote branches that have no local copy. Verify with --dry-run first.';
      if (GIT_PUSH_WITH_ARG.has('--' + name) && !v.includes('=')) k++;
      continue;
    }
    if (!optsDone && /^-[A-Za-z0-9]+$/.test(v)) {
      for (const ch of v.slice(1)) {
        if (ch === 'f') return PUSH_FORCE_MSG;
        if (ch === 'd') return 'git push -d removes a remote branch or tag. Verify the ref name.';
        if (ch === 'o') { if (v.endsWith('o')) k++; break; }
      }
      continue;
    }
    positional++;
    if (/^\+/.test(v)) return PUSH_FORCE_MSG + ' A +refspec forces the update.';
    if (positional > 1 && /^:/.test(v)) return 'A git push refspec of the form :ref deletes the remote ref. Verify the ref name.';
  }
  return null;
}
// WI-8 REV1: run fn over a resolved argv and over every command that the argv
// runs later. That covers the argv after find -exec, the argv suffix of an
// ARGV_EXEC_CMDS wrapper (xargs, ssh, watch, flock, chroot, taskset ...), and
// a quoted payload with whitespace (`ssh host 'cd r && git push -f'`,
// `sh -c '...'`, `tmux new '...'`). This is the same expansion that
// powerStateMessage uses.
// WI-8 REV2: every fn call and every tokenize spends one step from a shared
// budget. A command that needs more steps (a long run of nested wrappers) asks
// instead of running past the hook timeout, which would drop the verdict.
const SCAN_STEP_LIMIT = 400;
const SCAN_BUDGET_MSG = 'The command nests too many wrappers (xargs/ssh/find -exec ...) for the guard to analyze. Confirm the command is safe.';
function scanSpend(budget) { budget.left--; return budget.left < 0; }
function scanWrapped(r, depth, fn, budget) {
  if (scanSpend(budget)) return SCAN_BUDGET_MSG;
  if (!r.length) return null;
  // WI-20 F2: past the depth cap the payload is unread, which is not "nothing found".
  if (depth > MAX_SHELL_C_DEPTH) return SCAN_BUDGET_MSG;
  const m0 = fn(r);
  if (m0) return m0;
  // `env -S 'git push -f'` leaves the whole payload as the command word.
  if (/\s/.test(r[0].canon)) {
    const mw = scanCommandText(r[0].canon, depth + 1, fn, budget);
    if (mw) return mw;
  }
  const c0 = r[0].varCount || r[0].substCount ? '' : basename(r[0].canon);
  if (c0 === 'find') {
    for (let k = 1; k < r.length - 1; k++) {
      if (!FIND_EXEC_FLAGS.has(r[k].canon)) continue;
      if (depth + 1 > MAX_SHELL_C_DEPTH) return SCAN_BUDGET_MSG;   // WI-20 F2
      const m = scanWrapped(resolveEffectiveCommand(r.slice(k + 1)), depth + 1, fn, budget);
      if (m) return m;
    }
  }
  if (ARGV_EXEC_CMDS.has(c0) || SHELL_INTERPRETERS_EVAL.has(c0)) {
    for (let k = 1; k < r.length; k++) {
      if (scanSpend(budget)) return SCAN_BUDGET_MSG;
      if (ARGV_EXEC_CMDS.has(c0)) {
        const m = scanWrapped(resolveEffectiveCommand(r.slice(k)), depth + 1, fn, budget);
        if (m) return m;
      }
      if (/\s/.test(r[k].canon)) {
        const mm = scanCommandText(r[k].canon, depth + 1, fn, budget);
        if (mm) return mm;
      }
    }
  }
  return null;
}
function scanCommandText(text, depth, fn, budget) {
  if (scanSpend(budget)) return SCAN_BUDGET_MSG;
  let segs = [];
  try { segs = tokenize(text).segments; } catch (e) { segs = []; }
  for (const sg of segs) {
    const m = scanWrapped(commandPosition(sg.argv), depth, fn, budget);
    if (m) return m;
  }
  return null;
}
// Run fn over every segment (wrappers expanded) and over the text a pipe
// feeds into a STDIN_EXEC_CMDS consumer (`echo 'git push -f' | at now`).
function scanSegments(segments, fn) {
  const budget = { left: SCAN_STEP_LIMIT };
  for (let si = 0; si < segments.length; si++) {
    const m = scanWrapped(commandPosition(segments[si].argv), 0, (r) => fn(r, si), budget);
    if (m) return m;
    // `env -S 'cmd args'` / `env --split-string='cmd args'`: resolveEffectiveCommand
    // skips the -S value, but env runs it as a command line.
    const a = segments[si].argv;
    if (a.some(t => basename(t.canon) === 'env')) {
      for (let k = 0; k < a.length; k++) {
        let text = null;
        if ((a[k].canon === '-S' || a[k].canon === '--split-string') && a[k + 1]) text = a[k + 1].canon;
        else if (/^--split-string=/.test(a[k].canon)) text = a[k].canon.slice('--split-string='.length);
        else if (/^-S./.test(a[k].canon)) text = a[k].canon.slice(2);
        if (text) {
          const mm = scanCommandText(text, 1, (r) => fn(r, si), budget);
          if (mm) return mm;
        }
      }
    }
  }
  for (let i = 0; i < segments.length - 1; i++) {
    if (segments[i].op !== '|') continue;
    const c = commandPosition(segments[i + 1].argv);
    if (!c.length || !STDIN_EXEC_CMDS.has(basename(c[0].canon))) continue;
    for (const t of segments[i].argv) {
      if (!/\s/.test(t.canon)) continue;
      const m = scanCommandText(t.canon, 1, (r) => fn(r, i + 1), budget);
      if (m) return m;
    }
  }
  return null;
}
const GIT_OUTPUT_MSG = 'This git option writes its output to a file (--output, -o, --output-directory, bundle create). It can overwrite any file, a hook included. Redirect to a file under cagents-memory/ or /tmp instead, and confirm the target.';
const GIT_LOCATION_MSG = 'git -C / --git-dir / --work-tree / --exec-path points git at another repo or helper set. Its config (core.fsmonitor, core.pager, hooks) can run code. Confirm the directory is trusted.';
// The project root, as a literal path or as $CLAUDE_PROJECT_DIR.
// A Windows drive path (C:\\x, c:/x, or the Git Bash form /c/x) in one form:
// '/' separators, lower case (drive paths compare case-insensitively), no
// trailing '/'. Returns null for any other path. The /c/x form is converted
// only on win32 or for a word, never for a POSIX root, so a Linux root such as
// /c/proj never matches the relative word C:/proj.
function drivePathForm(p, allowMsys) {
  let v = String(p || '');
  if (allowMsys && /^\/[A-Za-z](\/|$)/.test(v)) v = v[1] + ':' + v.slice(2);
  if (!/^[A-Za-z]:([\\/]|$)/.test(v)) return null;
  return v.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}
function projectRoots() {
  const roots = new Set();
  const add = (p) => {
    const v = String(p || '');
    const d = drivePathForm(v, process.platform === 'win32');
    roots.add(d !== null ? d : v.replace(/\/+$/, ''));
  };
  if (process.env.CLAUDE_PROJECT_DIR) add(process.env.CLAUDE_PROJECT_DIR);
  try { add(require('path').resolve(__dirname, '..', '..')); } catch (e) { /* no root */ }
  roots.delete('');
  return roots;
}
// WI-21 round 2 M-1: a variable word is trusted only in its plain form
// ($NAME, ${NAME}, "$NAME", "${NAME}"), never with a default/alternate
// operator (${NAME:-x}, ${NAME:=x}, ${NAME:+x}, ${NAME#x} ...), and never when
// the same command reassigns the name (`reassigned` holds those names).
function isPlainVarWord(t, name, reassigned) {
  if (!t || t.substCount !== 0 || t.varCount !== 1 || t.litLen !== 0) return false;
  if (!Array.isArray(t.varNames) || t.varNames[0] !== name) return false;
  if (reassigned && reassigned.has(name)) return false;
  if (typeof t.raw !== 'string') return false;
  const re = new RegExp('^("?)\\$(\\{' + name + '\\}|' + name + ')\\1/?$');
  return re.test(t.raw);
}
// Names a command list (re)assigns: NAME=, NAME+=, export/declare/read/
// printf -v/local/readonly/typeset NAME, unset NAME, cd -P sets PWD is ignored.
const ASSIGN_WORD_RE = /^([A-Za-z_][A-Za-z0-9_]*)\+?=/;
const NAME_SETTER_CMDS = new Set(['export', 'declare', 'typeset', 'local', 'readonly', 'read', 'unset', 'mapfile', 'readarray', 'getopts', 'printf', 'let']);
function reassignedNames(segments, out) {
  out = out || new Set();
  for (const seg of segments || []) {
    let setter = false;
    for (const t of seg.argv) {
      if (t.varCount || t.substCount) continue;
      const m = ASSIGN_WORD_RE.exec(t.canon);
      if (m) { out.add(m[1]); continue; }
      const b = basename(t.canon);
      if (NAME_SETTER_CMDS.has(b) || b === 'env') { setter = true; continue; }
      if (setter && /^[A-Za-z_][A-Za-z0-9_]*$/.test(t.canon)) out.add(t.canon);
    }
  }
  return out;
}
function isProjectRootWord(t, reassigned) {
  if (!t) return false;
  if (isPlainVarWord(t, 'CLAUDE_PROJECT_DIR', reassigned)) return true;
  if (t.substCount || t.varCount) return false;
  const v = t.canon.replace(/\/+$/, '');
  if (v === '') return false;
  const roots = projectRoots();
  if (roots.has(v)) return true;
  // A drive root (C:\\x, C:/x, /c/x) matches only a drive-form root.
  const d = drivePathForm(t.canon, true);
  return d !== null && /^[a-z]:/.test(d) && roots.has(d);
}
// A directory word that names the current directory: ., ./, $PWD, $(pwd).
function isSameDirWord(t, reassigned) {
  if (!t) return false;
  if (!t.substCount && !t.varCount) return /^\.\/?$/.test(t.canon);
  if (isPlainVarWord(t, 'PWD', reassigned)) return true;
  return t.litLen === 0 && t.varCount === 0 && t.substCount === 1 &&
    Array.isArray(t.substInners) && t.substInners.length === 1 && /^\s*pwd\s*$/.test(t.substInners[0]);
}
// args = argv from the subcommand word on.
function gitOutputMessage(args) {
  const sub = args.length && !wordHasExpansion(args[0]) ? args[0].canon : null;
  for (let i = 1; i < args.length; i++) {
    const t = args[i];
    if (wordHasExpansion(t)) {
      // A substitution or a variable can expand to --output=<file>.
      if (sub === null || /^(log|show|diff|whatchanged|range-diff|format-patch|archive|bundle|diff-tree|diff-files|diff-index|cherry|shortlog)$/.test(sub)) return GIT_OUTPUT_MSG;
      continue;
    }
    const v = t.canon;
    if (/^--/.test(v)) {
      const name = v.slice(2).split('=')[0];
      if (name.startsWith('output') || longOptIs(name, 'output')) return GIT_OUTPUT_MSG;
      continue;
    }
    if ((sub === 'format-patch' || sub === 'archive' || sub === null) && /^-[A-Za-z0-9]*o/.test(v)) return GIT_OUTPUT_MSG;
  }
  if (sub === 'bundle' && args[1] && args[1].canon === 'create') return GIT_OUTPUT_MSG;
  return null;
}
const GIT_EXEC_CFG_RE = /^(core\.(hookspath|fsmonitor|pager|sshcommand|editor|askpass|gitproxy|worktree|attributesfile|excludesfile|alternaterefscommand)|init\.templatedir|trailer\.|sendemail\.|include\.|includeif\.|diff\.|merge\.|filter\.|pager\.|sequence\.editor|gpg\.|credential\.|uploadpack\.|receivepack\.|protocol\.|http\.|remote\.|url\.|interactive\.difffilter|instaweb\.|web\.browser|browser\.|man\.|difftool\.|mergetool\.|ssh\.)/i;
const GIT_ALIAS_MSG = 'git config set on the command line (-c, --config-env, GIT_CONFIG_*) can define an alias or a push/mirror setting that hides a force push. Verify the command.';
function gitArgvMessage(argv) {
  if (!argv.length || argv[0].varCount || argv[0].substCount || basename(argv[0].canon) !== 'git') return null;
  let k = 1;
  const cfg = [];
  while (k < argv.length) {
    const v = argv[k].canon;
    // WI-21 round 5: an expanded global option (-$X, --$X) can be -c alias.x=...
    if (wordHasExpansion(argv[k]) && (/^-/.test(v) || v === '')) {
      if (v !== '') return GIT_LOCATION_MSG;
      break;
    }
    if (v === '-c') {
      // WI-21 round 2: a -c value from a variable or a substitution can be any key.
      const cv = argv[k + 1];
      if (cv && wordHasExpansion(cv)) return GIT_LOCATION_MSG;
      cfg.push(cv ? cv.canon : ''); k += 2; continue;
    }
    if (/^-c./.test(v)) { cfg.push(v.slice(2)); k++; continue; }
    if (/^--config-env=/.test(v)) { cfg.push(v.slice('--config-env='.length)); k++; continue; }
    if (v === '--config-env' && wordHasExpansion(argv[k + 1])) return GIT_LOCATION_MSG;
    if (v === '--config-env') { cfg.push(argv[k + 1] ? argv[k + 1].canon : ''); k += 2; continue; }
    // WI-21 W21-3/W21-6: -C, --git-dir, --work-tree and --exec-path=<dir> point
    // git at a repo, config or helper set the agent may have planted. Only the
    // project root itself is trusted.
    if (v === '-C' || v === '--git-dir' || v === '--work-tree') {
      if (!(v === '-C' && (isProjectRootWord(argv[k + 1]) || isSameDirWord(argv[k + 1])))) return GIT_LOCATION_MSG;
      k += 2; continue;
    }
    if (/^(--git-dir|--work-tree|--exec-path)=/.test(v) || /^-C./.test(v)) return GIT_LOCATION_MSG;
    if (GIT_GLOBAL_WITH_ARG.has(v)) { k += 2; continue; }
    if (/^-/.test(v)) { k++; continue; }
    break;
  }
  // WI-21 W21-1: --output[=]<file> (log/show/diff/whatchanged/range-diff/...)
  // and format-patch/archive -o write a file the agent names, with content the
  // agent shapes (--format). That can overwrite a hook. Ask on any spelling.
  { const om = gitOutputMessage(argv.slice(k)); if (om) return om; }
  if (cfg.some(c => /^alias\./i.test(c) || /mirror/i.test(c) || /\.push\s*=\s*[+:]/i.test(c))) return GIT_ALIAS_MSG;
  // WI-15 R2: clean.requireForce=false lets `git clean -d` delete without -f.
  if (cfg.some(c => /^clean\.requireforce/i.test(c))) return GIT_DISCARD_MSG.clean;
  // WI-21 W21-6: config keys that name a program or a hook directory run it.
  if (cfg.some(c => GIT_EXEC_CFG_RE.test(c))) return GIT_LOCATION_MSG;
  const subTok = argv[k];
  if (!subTok) return null;
  if (wordHasExpansion(subTok)) {
    // W2/F2: `git $(echo stash) clear` hides the subcommand. A literal discard
    // verb after it still asks.
    if (argv.slice(k + 1).some(t => !wordHasExpansion(t) && /^(clear|drop)$/.test(t.canon))) {
      return GIT_DISCARD_MSG.stash;
    }
    // WI-15 R1: try each discard rule on the rest of the argv.
    for (const name of Object.keys(GIT_DISCARD_MSG)) {
      const m = gitDiscardMessage(name, argv.slice(k + 1));
      if (m && name !== 'stash' && name !== 'restore') return m;
    }
    return null;
  }
  const sub = subTok.canon;
  const args = argv.slice(k + 1);
  // WI-21 round 5: an expanded word matches every literal test (fail closed).
  const has = (re) => args.some(t => wordHasExpansion(t) || re.test(t.canon));
  if (sub === 'push') { const m = gitPushMessage(args); if (m) return m; }
  if (sub === 'filter-branch' || sub === 'filter-repo') {
    return 'git ' + sub + ' rewrites history for every matched commit. Back up first (git clone --mirror).';
  }
  if (sub === 'update-ref' && has(/^(-d|--delete|--stdin)$/)) {
    return 'git update-ref -d/--stdin changes or deletes refs directly, with no safety checks. Verify the ref names.';
  }
  if (sub === 'reflog' && args.length && (wordHasExpansion(args[0]) || /^(expire|delete)$/.test(args[0].canon))) {
    return 'git reflog ' + (args[0].canon || '<expanded word>') + ' removes the recovery record for lost commits. Consider keeping the default expiry.';
  }
  if (sub === 'prune' && (args.some(wordHasExpansion) || !args.some(t => /^(-n|--dry-run)$/.test(t.canon)))) {
    return 'git prune permanently deletes unreachable objects (lost commits). Run git prune -n to preview.';
  }
  if (sub === 'gc' && args.some(t => wordHasExpansion(t) || (/^--prune=/.test(t.canon) && t.canon !== '--prune=never'))) {
    return 'git gc --prune=<date> can permanently delete unreachable objects (lost commits). Consider the default prune window.';
  }
  const w2 = gitDiscardMessage(sub, args);
  if (w2) return w2;
  return null;
}
// W2: git subcommands that throw away uncommitted work or unmerged branches.
// The settings.json allowlist no longer pre-approves checkout/stash/branch as a
// whole, and these rules ask whether or not an allow rule matches. A bare
// `git checkout <name>` stays allowed: a branch name and a file path look the
// same statically, so only the unambiguous discard forms ask.
const GIT_DISCARD_MSG = {
  checkout: 'git checkout of a path (a pathspec, --, ., a tree-ish plus a path, --ours/--theirs) or --force overwrites uncommitted changes. Consider git stash push first.',
  restore: 'git restore of the working tree discards uncommitted changes. Use --staged to only unstage, or git stash push first.',
  switch: 'git switch --discard-changes/--force throws away uncommitted changes. Consider git stash push first.',
  stash: 'git stash drop/clear deletes stashed work permanently. Check git stash list first.',
  branch: 'git branch -D force-deletes a branch even if it is not merged. Consider git branch -d.',
  worktree: 'git worktree remove --force deletes the worktree with its uncommitted and untracked files. Commit or stash in that worktree first.',
  clean: 'git clean --force deletes untracked files permanently. Run git clean -n to preview.',
  // WI-21 W21-7: reset --hard/--keep/--merge rewrite the working tree.
  reset: 'git reset --hard/--keep/--merge overwrites uncommitted changes in the working tree. Consider git stash push first.'
};
// WI-21 W21-4: a variable or a substitution word in a discard subcommand can
// expand to -f, --hard, -D, drop ... An unknown word asks.
const GIT_UNKNOWN_WORD_MSG = 'A variable or a command substitution in this git command can expand to a discard option (-f, --hard, -D, drop). Write the words out literally, or confirm.';
// Checkout options that take the next word as their value.
const CHECKOUT_WITH_ARG = new Set(['-b', '-B', '--orphan', '--conflict', '--pathspec-from-file']);
// A word that can only be a path: ./x ../x /x, a glob, or a magic pathspec.
const PATHLIKE_RE = /^(\.{1,2}\/|\/|:\(|:\/)|[*?[]/;
// WI-21 round 2 MF-2: true when the token's source text is exactly one
// double-quoted string ("$NAME", "${NAME}", "$(cmd ...)", "pre-$X"), so the
// shell does no word splitting or globbing on it. Nested quotes inside a
// $(...) are skipped. Anything the scanner does not understand is false.
// WI-21 round 4 MF-R3-1: any indirection `${!...}` (its target can be `A[@]`
// or `@`), `$@`, `${@`, and any subscript holding `@` (`[@]`, `[ @ ]` ...) can
// expand to several words, so none of them is provably one word (fail closed).
const MULTIWORD_EXPANSION_RE = /\$@|\$\{@|\$\{!|\[[^\]]*@/;
function isSingleDQWord(t) {
  // WI-21 round 4 MF-R3-1: bash deletes backslash-newline inside double quotes
  // before it expands, so `"$\<LF>@"` is `"$@"`. Strip the pairs first so the
  // checks below see what bash expands.
  const r = (t && typeof t.raw === 'string' ? t.raw : '').replace(/\\\n/g, '');
  if (r.length < 2 || r[0] !== '"') return false;
  // WI-21 round 3 MF-R2-2: inside double quotes "$@", "${@...}", "${A[@]}"
  // and "${!prefix@}" still expand to one word per element, so they can inject
  // -f. "$*" and "${A[*]}" join into one word and stay exempt.
  if (MULTIWORD_EXPANSION_RE.test(r)) return false;
  let i = 1;
  let depth = 0;
  while (i < r.length) {
    const c = r[i];
    if (c === '\\') { i += 2; continue; }
    if (depth === 0) {
      if (c === '"') return i === r.length - 1;
      if (c === '$' && r[i + 1] === '(') { depth = 1; i += 2; continue; }
      i++; continue;
    }
    if (c === "'") { const e = r.indexOf("'", i + 1); if (e === -1) return false; i = e + 1; continue; }
    if (c === '"') {
      let e = i + 1;
      while (e < r.length && r[e] !== '"') e += r[e] === '\\' ? 2 : 1;
      if (e >= r.length) return false;
      i = e + 1; continue;
    }
    if (c === '(') depth++;
    else if (c === ')') depth--;
    i++;
  }
  return false;
}
function gitDiscardMessage(sub, args) {
  if (!GIT_DISCARD_MSG[sub]) return null;
  const vals = [];
  for (const t of args) {
    // A word built from a variable or a substitution could be anything. It is
    // kept as null, so it counts as a word but never matches a literal.
    // WI-21 round 5 MF-R4-1: a word with literal text AND an expansion ("x$@",
    // w$X) is unknown too. t.canon holds only its literal part.
    if (wordHasExpansion(t)) { vals.push(null); continue; }
    vals.push(t.canon);
  }
  let dashdash = -1;
  for (let i = 0; i < vals.length; i++) if (vals[i] === '--') { dashdash = i; break; }
  const opts = dashdash === -1 ? vals : vals.slice(0, dashdash);
  // WI-21 W21-4: null words ask, except the value of an option that takes a
  // name or a message (checkout -b <name>, stash -m <msg>).
  {
    const valueOpts = sub === 'checkout' ? /^(-b|-B|--orphan)$/ : sub === 'stash' ? /^(-m|--message)$/ : null;
    for (let i = 0; i < vals.length; i++) {
      // WI-21 round 4 MF-R3-1: the tokenizer reads `"$\<LF>@"` as the literal
      // `$@`, but bash deletes the backslash-newline first and expands "$@".
      // A word with a backslash-newline is not provably what it spells: ask.
      if (args[i] && typeof args[i].raw === 'string' && args[i].raw.includes('\\\n')) return GIT_UNKNOWN_WORD_MSG;
      if (vals[i] !== null) continue;
      const prev = i > 0 ? vals[i - 1] : null;
      // WI-21 round 2 MF-2: only ONE fully double-quoted word is exempt. An
      // unquoted $X / $(...) is word-split and can inject -f.
      if (!isSingleDQWord(args[i])) return GIT_UNKNOWN_WORD_MSG;
      if (valueOpts && prev !== null && valueOpts.test(prev)) continue;
      if (sub === 'checkout' && prev !== null && /^-[A-Za-z]*[bB]$/.test(prev)) continue;
      return GIT_UNKNOWN_WORD_MSG;
    }
  }
  const longHas = (full) => opts.some(v => v && /^--[a-z]/.test(v) && longOptIs(v.slice(2).split('=')[0], full));
  const shortHas = (ch) => opts.some(v => v && /^-[A-Za-z0-9]+$/.test(v) && v.slice(1).includes(ch));
  const msg = GIT_DISCARD_MSG[sub];
  if (sub === 'checkout') {
    if (dashdash !== -1 && vals.length > dashdash + 1) return msg;
    if (longHas('force') || shortHas('f')) return msg;
    if (longHas('pathspec-from-file')) return msg;
    // WI-21 round 6: --patch/-p picks hunks to discard from the working tree.
    if (longHas('patch') || shortHas('p')) return msg;
    let newBranch = false;
    const positionals = [];
    for (let i = 0; i < opts.length; i++) {
      const v = opts[i];
      if (v !== null && /^-/.test(v)) {
        const name = v.split('=')[0];
        if (name === '-b' || name === '-B' || name === '--orphan') newBranch = true;
        if (CHECKOUT_WITH_ARG.has(name) && !v.includes('=')) { i++; continue; }
        // WI-21 FP-2: a short cluster such as -qb <name>. b/B takes the rest
        // of the cluster, or the next word, as the branch name.
        const cl = /^-([A-Za-z]+)$/.exec(v);
        if (cl && !CHECKOUT_WITH_ARG.has(v)) {
          const at = cl[1].search(/[bB]/);
          if (at !== -1) { newBranch = true; if (at === cl[1].length - 1) i++; }
        }
        continue;
      }
      positionals.push(v);
    }
    if (positionals.some(v => v !== null && (v === '.' || PATHLIKE_RE.test(v)))) return msg;
    // `git checkout <tree-ish> <path>`: two words name a path unless a new
    // branch is made (`-b x origin/main`).
    if (!newBranch && positionals.length >= 2) return msg;
    // --ours/--theirs/--merge only act on paths when a word follows.
    // WI-21 round 6: --conflict=<style> implies --merge; -2/-3 are --ours/--theirs.
    if (positionals.length && (longHas('ours') || longHas('theirs') || longHas('merge') || longHas('conflict') ||
      shortHas('m') || shortHas('2') || shortHas('3'))) return msg;
    return null;
  }
  if (sub === 'restore') {
    const staged = longHas('staged') || shortHas('S');
    const worktree = longHas('worktree') || shortHas('W');
    return (!staged || worktree) ? msg : null;
  }
  if (sub === 'switch') {
    return (longHas('discard-changes') || longHas('force') || shortHas('f')) ? msg : null;
  }
  if (sub === 'stash') {
    const verb = vals.find(v => v === null || !/^-/.test(v));
    // W2/F2: a verb from a variable or a substitution can be drop or clear.
    return (verb === null || verb === 'drop' || verb === 'clear') ? msg : null;
  }
  if (sub === 'branch') {
    if (shortHas('D')) return msg;
    const del = longHas('delete') || shortHas('d');
    const force = longHas('force') || shortHas('f');
    return (del && force) ? msg : null;
  }
  if (sub === 'worktree') {
    return (vals[0] === 'remove' && (longHas('force') || shortHas('f'))) ? msg : null;
  }
  if (sub === 'clean') {
    const force = longHas('force') || shortHas('f');
    // WI-21 round 6: read dry-run the way git does. -e/--exclude takes the next
    // word (or the rest of the cluster) as its value, so `-e -n` and `-en` are
    // NOT dry runs. --no-dry-run (or any --no-* prefix of it) undoes -n, so any
    // --no word cancels the dry run (fail closed).
    let dry = false;
    let noWord = false;
    for (let i = 0; i < opts.length; i++) {
      const v = opts[i];
      if (v === null || !/^-/.test(v)) continue;
      if (/^--no/.test(v)) { noWord = true; continue; }
      if (/^--/.test(v)) {
        const name = v.slice(2).split('=')[0];
        if (longOptIs(name, 'exclude')) { if (!v.includes('=')) i++; continue; }
        if (longOptIs(name, 'dry-run')) dry = true;
        continue;
      }
      const cl = v.slice(1);
      for (let j = 0; j < cl.length; j++) {
        if (cl[j] === 'e') { if (j === cl.length - 1) i++; break; }
        if (cl[j] === 'n') dry = true;
      }
    }
    return (force && !(dry && !noWord)) ? msg : null;
  }
  if (sub === 'reset') {
    return (longHas('hard') || longHas('keep') || longHas('merge')) ? msg : null;
  }
  return null;
}
// WI-15 F4: settings.json pre-approves the test runner and the CI scripts.
// Extra arguments can point those runners at code an agent wrote (a vitest
// config or root, an npm --prefix, a ../ path out of scripts/ci). Those forms
// ask, so an allow rule never runs an unreviewed file with no prompt.
const RUNNER_MSG = 'This test or CI runner argument can load code from outside tests/ or scripts/ci/ (a config, a root, a setup file, a prefix, or a ../ path). Confirm the target files are trusted.';
// WI-15 F4b: an allowlist of argument shapes, not a blocklist. vitest and npm
// have many options that load code (--reporter=<path>, --environment,
// --script-shell, --node-options ...), so any other option asks.
const VITEST_SAFE_FLAG_RE = /^(--run|--no-coverage|--silent|--passWithNoTests|--no-color|--hideSkippedTests|--bail(=\d+)?|--retry=\d+|--testTimeout=\d+|--reporter=(default|verbose|dot|basic|json|junit|tap|tap-flat|hanging-process)|-u|--update|--coverage)$/;
const VITEST_SAFE_WITH_ARG = new Set(['-t', '--testNamePattern']);
function runnerArgv(r) {
  if (!r.length || r[0].varCount || r[0].substCount) return null;
  const cmd = basename(r[0].canon);
  // WI-21 round 5: match on the literal text, then treat an expanded word among
  // the matched words (npm test$X, scripts/ci/x.sh$X) as unknown (fail closed).
  const v = r.map(t => t.canon);
  const hit = (kind, from) => ({ kind, args: r.slice(from), unknown: r.slice(1, from).some(wordHasExpansion) });
  if (cmd === 'npx' && v[1] === 'vitest') return hit('vitest', 2);
  if (cmd === 'vitest') return hit('vitest', 1);
  if (cmd === 'npm' && (v[1] === 'test' || v[1] === 't' || (v[1] === 'run' && v[2] === 'test'))) return hit('npm', v[1] === 'run' ? 3 : 2);
  if ((cmd === 'bash' || cmd === 'sh' || cmd === 'node') && v[1] && /^(\.\/)?scripts\/ci\//.test(v[1])) return hit('ci', 1);
  return null;
}
function runnerMessage(segments) {
  return scanSegments(segments, (r) => {
    const hit = runnerArgv(r);
    if (!hit) return null;
    if (hit.unknown) return RUNNER_MSG;
    const a = hit.args;
    let afterDashDash = hit.kind !== 'npm';
    for (let i = 0; i < a.length; i++) {
      const t = a[i];
      // A variable or a substitution can expand to any option.
      if (wordHasExpansion(t)) return RUNNER_MSG;
      const v = t.canon;
      if (/(^|\/)\.\.(\/|$)/.test(v)) return RUNNER_MSG;
      if (hit.kind === 'ci') continue;
      if (!afterDashDash) {
        // npm options before `--` configure npm itself (--prefix, --script-shell ...).
        if (v === '--') { afterDashDash = true; continue; }
        return RUNNER_MSG;
      }
      if (!/^-/.test(v)) {
        if (/^\//.test(v)) return RUNNER_MSG;
        continue;
      }
      if (v === '--config' || v === '-c') {
        if (wordHasExpansion(a[i + 1])) return RUNNER_MSG;
        const val = a[i + 1] ? a[i + 1].canon : '';
        if (val.replace(/^\.\//, '') !== 'tests/vitest.config.js') return RUNNER_MSG;
        i++; continue;
      }
      if (/^--config=/.test(v)) {
        if (v.slice('--config='.length).replace(/^\.\//, '') !== 'tests/vitest.config.js') return RUNNER_MSG;
        continue;
      }
      // WI-21 W21-9: -t never swallows an option as its value.
      if (VITEST_SAFE_WITH_ARG.has(v)) {
        const nx = a[i + 1];
        if (!nx || wordHasExpansion(nx) || /^-/.test(nx.canon)) return RUNNER_MSG;
        i++; continue;
      }
      if (/^--testNamePattern=/.test(v)) continue;
      if (VITEST_SAFE_FLAG_RE.test(v)) continue;
      return RUNNER_MSG;
    }
    return null;
  });
}
// WI-21 W21-3: every runner and git allow rule trusts the working directory
// (a relative scripts/ci path, the package.json npm reads, the .git config git
// reads). An agent can plant those files under cagents-memory/, cd there and
// run an allowlisted command. So a cd/pushd/popd (or env -C) to any directory
// other than the project root, followed by a runner or a git word, asks.
const CWD_MSG = 'This command changes directory and then runs git or a test/CI runner. Its package.json, scripts/ or .git config there can run code. Run it from the project root, or confirm the directory is trusted.';
const RUNNER_WORDS = new Set(['git', 'npm', 'npx', 'vitest', 'node', 'nodejs', 'bash', 'sh', 'zsh', 'dash',
  'yarn', 'pnpm', 'corepack', 'make']);
const CD_CMDS = new Set(['cd', 'pushd', 'popd', 'chdir']);
function wordsOfToken(t) {
  const texts = [t.canon].concat(t.substInners || []);
  const out = [];
  for (const x of texts) for (const w of String(x).split(/[\s;&|()<>`'"{}]+/)) if (w) out.push(basename(w));
  return out;
}
// A shell that runs a local script file (`bash tap.sh 1 2`, `sh -x ./ui.sh`)
// is not a runner: the CWD and ENV rules guard allowlisted commands that trust
// the cwd (scripts/ci/*, npm, git), and a local script is not one of them.
// Returns the argv indexes of the shell word and the script word, or null. The
// shell still counts when it reads code from -c, -s, stdin or an rc option,
// when the script word has an expansion, or when it names scripts/ or a `..`.
const SHELL_SCRIPT_OPT_RE = /^[-+][euvxn]+$/;
// FU-1 (v12.77.0): NAME -> { value, idx } for a variable that holds a literal
// absolute path at every later `$NAME` (`W=/abs/dir; bash $W/tap.sh`). The
// rules copy buildLiteralAssignMap (S2a), with one change: export, declare,
// typeset, local and readonly do not void the map when each word they bind
// starts with a literal name (`export A=x PATH="...:$PATH"`). bareMentions
// still drops a name that such a word rebinds. Any doubt gives no entry, and
// the script word then counts as unknown (a runner).
const SCRIPT_VAR_SETTERS = new Set(['export', 'declare', 'typeset', 'local', 'readonly']);
const ABS_LITERAL_PATH_RE = /^(\/[^\s*?[\]{}~$`'"\\]*|[A-Za-z]:[\\/][^\s*?[\]{}~$`'"]*)$/;
function scriptVarMap(segments, raw) {
  const out = new Map();
  raw = String(raw || '');
  if (/(?<![A-Za-z0-9_])IFS(?![A-Za-z0-9_])/.test(raw)) return out;
  const cand = new Map();
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.op === '(' || seg.op === ')') return new Map();
    if (!seg.argv.length) continue;
    const a0 = seg.argv[0];
    if (a0.varCount === 0 && a0.substCount === 0 && COMPOUND_WORDS.has(a0.canon)) return new Map();
    const cp = commandPosition(seg.argv);
    if (cp.length && (cp[0].varCount || cp[0].substCount)) return new Map();
    const c0 = cp.length ? basename(cp[0].canon) : '';
    if (SCRIPT_VAR_SETTERS.has(c0)) {
      if (!cp.slice(1).every(t => /^(-[A-Za-z]+$|[A-Za-z_][A-Za-z0-9_]*(\+?=|$))/.test(String(t.raw || '')))) return new Map();
    } else if (VAR_WRITER_CMDS.has(c0)) return new Map();
    if (c0 === 'printf' && cp.some(t => t.canon === '-v' || /^-v./.test(t.canon))) return new Map();
    const allAssign = seg.argv.every(t => t.litLen > 0 && t.varCount === 0 && t.substCount === 0 && INLINE_ASSIGN_RE.test(t.canon));
    if (!allAssign) continue;
    const prevOp = i > 0 ? segments[i - 1].op : null;
    const unconditional = (prevOp === null || prevOp === ';') && seg.op !== '|' && seg.op !== '&';
    for (const t of seg.argv) {
      const m = INLINE_ASSIGN_RE.exec(t.canon);
      if (cand.has(m[1]) || !unconditional || !ABS_LITERAL_PATH_RE.test(m[2])) { cand.set(m[1], null); continue; }
      cand.set(m[1], { value: m[2], idx: i });
    }
  }
  for (const [name, entry] of cand) {
    if (entry && bareMentions(raw, name) === 1) out.set(name, entry);
  }
  return out;
}
// Stores the map on each segment, so segRunnerWords can read it. A segment
// that a payload re-tokenized has no map, so its `$W/x.sh` stays unknown.
function annotateScriptVars(segments, raw) {
  let map;
  try { map = scriptVarMap(segments, raw); } catch (e) { map = new Map(); }
  segments.forEach((seg, i) => { seg.scriptVars = { map, idx: i }; });
}
// The resolved path of a script word `$W/x.sh`, `"$W/x.sh"`, `"$W"/x.sh` or
// `${W}/x.sh`, or null. W must be in the segment's map, assigned in an earlier
// segment, and the rest of the word must be plain text.
function resolveScriptVarWord(sc, seg) {
  const ctx = seg && seg.scriptVars;
  if (!ctx || !sc || sc.substCount || sc.varCount !== 1) return null;
  const raw = String(sc.raw || '');
  const m = /^("?)\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))/.exec(raw);
  if (!m) return null;
  const name = m[2] || m[3];
  const rest = raw.slice(m[0].length);
  if (/[$`'\\{}~*?[\]]/.test(rest)) return null;
  const entry = ctx.map.get(name);
  if (!entry || entry.idx >= ctx.idx) return null;
  return entry.value + sc.canon;
}
function localShellScriptWords(argv, seg) {
  let k = argv.length - skipLeadKeywords(argv).length;
  while (k < argv.length - 1 && argv[k].litLen > 0 && !wordHasExpansion(argv[k]) && ENV_ASSIGN_RE.test(argv[k].canon)) k++;
  const sh = argv[k];
  if (!sh || wordHasExpansion(sh) || !SHELL_INTERPRETERS_EVAL.has(basename(sh.canon))) return null;
  let i = k + 1;
  while (i < argv.length && !wordHasExpansion(argv[i]) && SHELL_SCRIPT_OPT_RE.test(argv[i].canon)) i++;
  if (i < argv.length && !wordHasExpansion(argv[i]) && argv[i].canon === '--') i++;
  const sc = argv[i];
  if (!sc) return null;
  const v = wordHasExpansion(sc) ? resolveScriptVarWord(sc, seg) : sc.canon;
  if (v === null) return null;
  // A glob character (* ? [) can match scripts/, so it fails closed, even when
  // it is quoted. The scripts/ match ignores case for case-insensitive disks.
  if (/[*?[]/.test(String(sc.raw || '') + v)) return null;
  if (v === '' || /^[-+]/.test(v) || /(^|[\/\\])scripts[\/\\]/i.test(v) || /(^|[\/\\])\.\.([\/\\]|$)/.test(v)) return null;
  if (RUNNER_WORDS.has(basename(v))) return null;
  return new Set([k, i]);
}
function segRunnerWords(seg, strictShell) {
  const skip = strictShell ? null : localShellScriptWords(seg.argv, seg);
  return seg.argv.some((t, i) => !(skip && skip.has(i)) && wordsOfToken(t).some(w => RUNNER_WORDS.has(w)));
}
function segMentionsRunner(seg) { return segRunnerWords(seg, false); }
// BASH_ENV, ENV, SHELLOPTS, BASHOPTS and PS4 inject code into every shell, and
// the loader variables inject code into every binary. With one of them set, a
// local `bash tap.sh` counts as a runner too. NODE_OPTIONS stays strict too.
const SHELL_INJECT_ENV_RE = /^(BASH_ENV|ENV|SHELLOPTS|BASHOPTS|PS4|LD_PRELOAD|LD_LIBRARY_PATH|LD_AUDIT|DYLD_INSERT_LIBRARIES|NODE_OPTIONS)$/;
function segMentionsRunnerStrict(seg) { return segRunnerWords(seg, true); }
function envChdirTarget(argv) {
  // `env -C dir cmd` / `env --chdir=dir cmd`: returns the dir token (or a
  // pseudo token for the combined form), or undefined when there is none.
  let inEnv = false;
  for (let k = 0; k < argv.length; k++) {
    const t = argv[k];
    if (!t.varCount && !t.substCount && basename(t.canon) === 'env') { inEnv = true; continue; }
    if (!inEnv) continue;
    const v = t.canon;
    if (v === '-C' || v === '--chdir') return argv[k + 1] || { canon: '', litLen: 0, varCount: 0, substCount: 0 };
    if (/^--chdir=/.test(v)) return { canon: v.slice('--chdir='.length), litLen: 1, varCount: t.varCount, substCount: t.substCount };
    if (/^-C./.test(v)) return { canon: v.slice(2), litLen: 1, varCount: t.varCount, substCount: t.substCount };
  }
  return undefined;
}
// FU-2 (v12.77.0): a world-writable directory (/tmp, /var/tmp, /dev/shm, or
// any directory with the o+w bit). Another user can plant a script there, so
// a cd into it keeps a local `bash x.sh` asking. Never throws.
const WORLD_WRITABLE_DIRS = new Set(['/tmp', '/var/tmp', '/dev/shm']);
// FU-12 (v12.77.0): the whole temp tree counts, not only its root
// (`cd /tmp/build`), after symlinks resolve (`cd ~/link-to-tmp`). A directory
// that another non-root user owns counts too. A path that does not exist yet
// is judged by its nearest existing parent.
const TEMP_TREE_RE = /^\/(tmp|var\/tmp|dev\/shm)(\/|$)/;
function realOrNearest(p) {
  const fs = require('fs');
  const path = require('path');
  let cur = path.resolve(p);
  let tail = '';
  for (let n = 0; n < 64; n++) {
    try { return path.join(fs.realpathSync(cur), tail); } catch (e) { /* walk up */ }
    const up = path.dirname(cur);
    if (up === cur) return path.resolve(p);
    tail = path.join(path.basename(cur), tail);
    cur = up;
  }
  return path.resolve(p);
}
function isWorldWritableDir(p) {
  const v = String(p || '').replace(/\/+$/, '') || '/';
  if (WORLD_WRITABLE_DIRS.has(v) || TEMP_TREE_RE.test(v)) return true;
  if (!/^\//.test(v)) return false;
  const r = realOrNearest(v);
  if (TEMP_TREE_RE.test(r)) return true;
  try {
    const os = require('os');
    const td = require('fs').realpathSync(os.tmpdir());
    if (td !== '/' && (r === td || r.startsWith(td + '/'))) return true;
  } catch (e) { /* no tmpdir */ }
  try {
    const st = require('fs').statSync(r);
    if (st.mode & 0o002) return true;
    const uid = typeof process.getuid === 'function' ? process.getuid() : -1;
    if (uid >= 0 && st.uid !== uid && st.uid !== 0) return true;
  } catch (e) { /* missing: judged by the parent above */ }
  return false;
}
// A cd target word as a path, or null: a literal, ~ or ~/x, $HOME/x, or a
// variable that the FU-1 map resolves to a literal absolute path.
function cdTargetPath(t, seg, reassigned) {
  if (!t) return null;
  if (!t.varCount && !t.substCount) {
    const v = t.canon;
    if (/^~(\/|$)/.test(String(t.raw || '')) && process.env.HOME) return process.env.HOME + v.replace(/^~/, '');
    return /^\//.test(v) ? v : null;
  }
  if (t.substCount || t.varCount !== 1) return null;
  const raw = String(t.raw || '');
  const m = /^("?)\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))([^$`'\\{}*?[\]~"]*)\1$/.exec(raw);
  if (!m) return null;
  const name = m[2] || m[3];
  if (reassigned && reassigned.has(name) && !(seg && seg.scriptVars && seg.scriptVars.map.has(name))) return null;
  if (name === 'HOME' && process.env.HOME) return process.env.HOME + m[4];
  const r = resolveScriptVarWord({ raw: m[1] ? raw.slice(1, -1) : raw, canon: m[4], varCount: 1, substCount: 0 }, seg);
  return r;
}
function isTempCdTarget(t, reassigned, seg) {
  if (!t) return false;
  if (isPlainVarWord(t, 'TMPDIR', reassigned)) return true;
  if (t.varCount === 1 && !t.substCount && /^"?\$(\{TMPDIR\}|TMPDIR)(?![A-Za-z0-9_])/.test(String(t.raw || ''))) return true;
  const p = cdTargetPath(t, seg, reassigned);
  return p !== null && isWorldWritableDir(p);
}
// After a cd into a temp dir, `./x.sh`, `source x.sh` and `. x.sh` run a file
// that another user can plant there.
function runsRelativeFile(seg) {
  const cp = commandPosition(seg.argv);
  if (!cp.length) return false;
  const w = cp[0];
  if (w.varCount || w.substCount) return false;
  const c0 = basename(w.canon);
  if (c0 === 'source' || c0 === '.') {
    const a = cp[1];
    return !!a && (a.varCount || a.substCount || !/^\//.test(a.canon));
  }
  return w.canon.includes('/') && !/^\//.test(w.canon) && !/^~/.test(String(w.raw || ''));
}
function cwdShiftMessage(segments, depth, reassigned) {
  if ((depth || 0) > MAX_SHELL_C_DEPTH) return null;
  reassigned = reassignedNames(segments, new Set(reassigned || []));
  let shifted = false;
  let tmpShift = false;
  for (const seg of segments) {
    if (shifted && segMentionsRunner(seg)) return CWD_MSG;
    if (tmpShift && (segMentionsRunnerStrict(seg) || runsRelativeFile(seg))) return CWD_MSG;
    const et = envChdirTarget(seg.argv);
    if (et !== undefined && !isProjectRootWord(et, reassigned) && !isSameDirWord(et, reassigned) && segMentionsRunner(seg)) return CWD_MSG;
    const r = commandPosition(seg.argv);
    const c0 = r.length && !r[0].varCount && !r[0].substCount ? basename(r[0].canon) : '';
    // WI-21 round 2: eval runs in the CURRENT shell, so a cd inside its payload
    // moves the cwd for the segments after it. Probe the payload followed by a
    // git word: a CWD_MSG means the payload left the cwd shifted.
    if (c0 === 'eval' && !shifted) {
      let sg = null;
      try { sg = tokenize(r.slice(1).map(t => t.canon).join(' ') + '\ngit').segments; } catch (e) { sg = null; }
      if (!sg || cwdShiftMessage(sg, (depth || 0) + 1, reassigned)) shifted = true;
    }
    // A shell -c payload or a substitution runs its own command list.
    if (SHELL_INTERPRETERS_EVAL.has(c0) || c0 === 'eval') {
      for (const t of r.slice(1)) {
        if (!/\s/.test(t.canon)) continue;
        let sg = [];
        try { sg = tokenize(t.canon).segments; } catch (e) { sg = []; }
        const m = cwdShiftMessage(sg, (depth || 0) + 1, reassigned);
        if (m) return m;
      }
    }
    for (const t of seg.argv) {
      for (const inner of t.substInners || []) {
        let sg = [];
        try { sg = tokenize(inner).segments; } catch (e) { sg = []; }
        const m = cwdShiftMessage(sg, (depth || 0) + 1, reassigned);
        if (m) return m;
      }
    }
    if (CD_CMDS.has(c0)) {
      const target = r.slice(1).find(t => t.varCount || t.substCount || !/^-/.test(t.canon) || t.canon === '-');
      if (!(c0 !== 'popd' && isSameDirWord(target, reassigned))) shifted = c0 === 'popd' || !target || !isProjectRootWord(target, reassigned);
      // A relative cd (or a variable) after a cd into a temp dir can stay in it.
      if (c0 !== 'popd') {
        const rel = !!target && (target.varCount || target.substCount || !/^[\/~]|^[A-Za-z]:/.test(target.canon));
        tmpShift = isTempCdTarget(target, reassigned, seg) || (tmpShift && rel);
      }
    }
  }
  return null;
}
// WI-21 W21-5: an environment assignment in front of a runner or git can load
// code (NODE_OPTIONS=--require, npm_config_script_shell, GIT_PAGER,
// GIT_EXTERNAL_DIFF, GIT_DIR, HOME with a planted .gitconfig, PATH ...).
const ENV_MSG = 'An environment setting (NODE_OPTIONS, npm_config_*, VITEST_*, GIT_*, CAGENTS_*, HOME, PATH, LD_*) is set for git or a test/CI runner. It can load code the agent wrote. Confirm the setting.';
// WI-21 round 6 L-R5-2: CAGENTS_* overrides (CAGENTS_ADVISORY_DIR,
// CAGENTS_PROJECT_ROOT) make scripts/ci require() code from a directory.
const DANGER_ENV_RE = /^(CAGENTS_\w*|NODE_OPTIONS|NODE_PATH|NODE_REPL_EXTERNAL_MODULE|[Nn][Pp][Mm]_[Cc][Oo][Nn][Ff][Ii][Gg]_\w*|VITEST\w*|VITE_\w*|GIT_\w*|LD_\w*|DYLD_\w*|BASH_ENV|ENV|PATH|HOME|XDG_CONFIG_HOME|SHELLOPTS|BASHOPTS|PS4|PROMPT_COMMAND|PREFIX|EDITOR|VISUAL|PAGER|LESSOPEN|LESSCLOSE|BROWSER|SSH_ASKPASS|IFS|LESS|MANPAGER|MANOPT)$/;
const EXPORT_CMDS = new Set(['export', 'declare', 'typeset', 'local', 'readonly']);
// WI-21 round 2 M-2: commands that set a variable without NAME=: read NAME,
// printf -v NAME, mapfile/readarray NAME, getopts spec NAME. Every bare
// identifier after them counts as a set name (fail closed).
const INDIRECT_SETTER_CMDS = new Set(['read', 'printf', 'mapfile', 'readarray', 'getopts']);
const ENV_ASSIGN_RE = /^([A-Za-z_][A-Za-z0-9_]*)\+?=([\s\S]*)$/;
const ENV_SOURCE_MSG = 'This command sources a shell file (source / .) or splits an env -S string before git or a test/CI runner. The file can set NODE_OPTIONS, GIT_* or PATH. Confirm the file is trusted.';
// FU-3 (v12.77.0): a PATH assignment that only prepends existing directories
// (`PATH="$LOCALAPPDATA/Android/Sdk/platform-tools:$PATH"`) does not count as
// a dangerous setting. Each prepended entry must be a literal absolute path,
// or $LOCALAPPDATA, $HOME or $ANDROID_HOME (set in the hook env, not set in
// the command) plus a literal suffix. `.`, an empty entry, a glob, a `..` and
// a quote other than one outer "..." fail. The directory must exist and must
// not be the cwd or inside the project root. No other user may write into it:
// the directory is owned by this user or root and is not world-writable, and
// each parent is not world-writable unless it is sticky. A dir in /tmp,
// /var/tmp or /dev/shm always fails.
function isSafePathDir(dir) {
  const fs = require('fs');
  const path = require('path');
  let st;
  try { st = fs.statSync(dir); } catch (e) { return false; }
  if (!st.isDirectory()) return false;
  // FU-12 (v12.77.0): judge the real path too, so a symlink ($HOME/l ->
  // /tmp/x) cannot carry a temp dir past the checks below.
  const lexical = path.resolve(dir);
  let r;
  try { r = fs.realpathSync(dir); } catch (e) { return false; }
  const strip = (x) => x.length > 1 ? x.replace(/[\\/]+$/, '') : x;
  const inside = (a, b) => a === b || a.startsWith(b + path.sep);
  let cwdReal = path.resolve(process.cwd());
  try { cwdReal = fs.realpathSync(cwdReal); } catch (e) { /* keep */ }
  for (const p of [lexical, r]) {
    if (strip(p) === strip(path.resolve(process.cwd())) || strip(p) === strip(cwdReal)) return false;
    // The shared temp trees: any user can make a dir name there first.
    if (/^\/(tmp|var\/tmp|dev\/shm)(\/|$)/.test(p)) return false;
    for (const root of projectRoots()) if (root && inside(strip(p), strip(path.resolve(root)))) return false;
  }
  if (process.platform === 'win32') {
    // FU-12: Windows has no POSIX owner bits here, and any local user can
    // make a folder at a drive root (C:\x). Pass only a dir under a per-user
    // root or a system root that needs admin rights to write.
    const roots = [process.env.LOCALAPPDATA, process.env.USERPROFILE, process.env.APPDATA,
      process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.SystemRoot]
      .filter(Boolean).map(x => strip(path.resolve(x)).toLowerCase());
    const lr = strip(r).toLowerCase();
    return roots.some(root => inside(lr, root));
  }
  const uid = typeof process.getuid === 'function' ? process.getuid() : -1;
  if ((st.mode & 0o002) || (st.uid !== uid && st.uid !== 0)) return false;
  for (let d = path.dirname(r); ; d = path.dirname(d)) {
    let ps;
    try { ps = fs.statSync(d); } catch (e) { return false; }
    if ((ps.mode & 0o002) && !(ps.mode & 0o1000)) return false;
    if (path.dirname(d) === d) break;
  }
  return true;
}
const PATH_ROOT_VARS = new Set(['LOCALAPPDATA', 'HOME', 'ANDROID_HOME']);
function isSafePathPrepend(t, reassigned) {
  if (!t || t.substCount) return false;
  const m = /^PATH=([\s\S]*)$/.exec(String(t.raw || ''));
  if (!m) return false;
  let v = m[1];
  if (/^"[^"]*"$/.test(v)) v = v.slice(1, -1);
  if (/["'`\\\s]/.test(v) || v.includes('$(')) return false;
  const parts = v.split(':');
  if (parts.length < 2 || !/^\$(\{PATH\}|PATH)$/.test(parts[parts.length - 1])) return false;
  for (const e of parts.slice(0, -1)) {
    if (!e || /[*?[\]{}~]/.test(e) || /(^|\/)\.\.?(\/|$)/.test(e)) return false;
    let dir;
    const vm = /^\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))(\/[^$]*)?$/.exec(e);
    if (vm) {
      const n = vm[1] || vm[2];
      if (!PATH_ROOT_VARS.has(n) || (reassigned && reassigned.has(n)) || !process.env[n]) return false;
      dir = process.env[n] + (vm[3] || '');
    } else if (e.includes('$') || !/^\//.test(e)) {
      return false;
    } else {
      dir = e;
    }
    if (!isSafePathDir(dir)) return false;
  }
  return true;
}
// FU-12 (v12.77.0): a command that also writes files can plant a binary in
// the prepended dir before the runner reads PATH (`cp x ~/bin/git; PATH=
// ~/bin:$PATH git status`). Any file write in the same command voids the
// PATH exemption: an output redirect to a file, or a command word that writes.
const PATH_WRITER_CMDS = new Set(['cp', 'mv', 'ln', 'install', 'tee', 'rsync', 'tar', 'unzip', 'gunzip',
  'curl', 'wget', 'mkdir', 'touch', 'chmod', 'chown', 'dd', 'truncate', 'sed', 'perl', 'patch', 'git',
  'node', 'nodejs', 'python', 'python2', 'python3', 'ruby', 'php', 'scp', 'sftp', 'ditto', 'cpio',
  'bash', 'sh', 'zsh', 'dash', 'eval', 'source', '.', 'xargs', 'find', 'awk', 'gawk', 'npm', 'npx',
  'yarn', 'pnpm', 'pip', 'pip3', 'make', 'gcc', 'cc', 'go', 'cargo', 'printf', 'echo', 'cat']);
function commandWritesFiles(segments) {
  for (const seg of segments) {
    for (const r of seg.redirects || []) {
      if (!/>/.test(r.op) || r.op === '>&' && /^\d+$|^-$/.test(String(r.target && r.target.canon))) continue;
      const tg = r.target;
      // /dev/null, and a plain file name in the cwd (never a safe PATH dir).
      if (tg && !tg.varCount && !tg.substCount && (tg.canon === '/dev/null' || /^[^\/\\~]+$/.test(tg.canon) && !/^\.\.?$/.test(tg.canon))) continue;
      return true;
    }
    let cp = commandPosition(seg.argv);
    while (cp.length && /^[A-Za-z_][A-Za-z0-9_]*\+?=/.test(String(cp[0].raw || ''))) cp = commandPosition(cp.slice(1));
    if (!cp.length) continue;
    if (cp[0].varCount || cp[0].substCount) return true;
    if (PATH_WRITER_CMDS.has(basename(cp[0].canon))) return 'cmd:' + basename(cp[0].canon);
    if (seg.argv.some(t => (t.substInners || []).length)) return true;
  }
  return false;
}
function envPrefixMessage(segments, depth) {
  if ((depth || 0) > MAX_SHELL_C_DEPTH) return null;
  const names = [];
  const reassigned = reassignedNames(segments);
  // The runner itself (git, npm, bash ...) is a writer word, so judge the
  // other segments: a write in the runner's own segment runs after PATH is set,
  // and the runner is already the thing the PATH entry feeds.
  const writerSegs = segments.filter((s) => {
    const w = commandWritesFiles([s]);
    if (w !== true && typeof w !== 'string') return false;
    if (w === true) return true;
    const c = w.slice(4);
    // A runner word (git, npm, bash x.sh ...) is the PATH consumer, not a
    // planting step. A shell that reads code from -c or stdin still counts.
    if (!RUNNER_WORDS.has(c)) return true;
    if (SHELL_INTERPRETERS_EVAL.has(c)) return !localShellScriptWords(s.argv, s);
    return false;
  });
  const safePath = (n, t) => n === 'PATH' && writerSegs.length === 0 && isSafePathPrepend(t, reassigned);
  // WI-21 round 6: names set by an assignment-only segment (`A="$(git ...)"`).
  // A substitution in that segment runs before the assignment, so only a
  // runner in ANOTHER segment can see the value.
  const bareNames = [];
  let sourced = false;
  let envSplit = false;
  const sourceSegs = new Set();
  const isName = (w) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(w);
  for (const seg of segments) {
    const a = skipLeadKeywords(seg.argv);
    const bare = a.length > 0 && a.every(x => x.litLen > 0 && ENV_ASSIGN_RE.test(x.canon));
    let k = 0;
    while (k < a.length) {
      const t = a[k];
      const m = ENV_ASSIGN_RE.exec(t.canon);
      if (m && t.litLen > 0) { if (safePath(m[1], t)) { k++; continue; } if (bare) bareNames.push({ n: m[1], seg }); else names.push(m[1]); k++; continue; }
      const b = t.varCount || t.substCount ? '' : basename(t.canon);
      if (b === 'source' || b === '.') { sourced = true; sourceSegs.add(seg); break; }
      if (b === 'eval') {
        // eval NAME=x ...: re-read the joined words as a command list.
        let sg = [];
        try { sg = tokenize(a.slice(k + 1).map(x => x.canon).join(' ')).segments; } catch (e) { sourced = true; }
        for (const s2 of sg) for (const x of s2.argv) { const mm = ENV_ASSIGN_RE.exec(x.canon); if (mm) names.push(mm[1]); }
        if (envPrefixMessage(sg, (depth || 0) + 1)) sourced = true;
        break;
      }
      if (INDIRECT_SETTER_CMDS.has(b)) {
        for (const x of a.slice(k + 1)) if (!x.varCount && !x.substCount && isName(x.canon)) names.push(x.canon);
        break;
      }
      if (b === 'env' || EXPORT_CMDS.has(b)) {
        const isEnv = b === 'env';
        k++;
        while (k < a.length) {
          const v = a[k].canon;
          const mm = ENV_ASSIGN_RE.exec(v);
          if (mm) { if (!safePath(mm[1], a[k])) names.push(mm[1]); k++; continue; }
          if (isEnv && (v === '-u' || v === '--unset')) { if (a[k + 1]) names.push(a[k + 1].canon); k += 2; continue; }
          if (isEnv && /^--unset=/.test(v)) { names.push(v.slice(8)); k++; continue; }
          if (isEnv && /^-u./.test(v)) { names.push(v.slice(2)); k++; continue; }
          if (isEnv && (v === '-S' || v === '--split-string' || /^-S./.test(v) || /^--split-string=/.test(v))) {
            // env -S 'NAME=x cmd': re-read the split string as a command.
            const payload = /^-S./.test(v) ? v.slice(2) : /^--split-string=/.test(v) ? v.slice(15) : (a[k + 1] ? a[k + 1].canon : '');
            const pt = /^-S./.test(v) || /^--split-string=/.test(v) ? a[k] : a[k + 1];
            let sg = null;
            if (pt && !pt.varCount && !pt.substCount) { try { sg = tokenize(payload).segments; } catch (e) { sg = null; } }
            if (!sg || envPrefixMessage(sg, (depth || 0) + 1)) envSplit = true;
            else for (const s2 of sg) for (const x of s2.argv) { const mm = ENV_ASSIGN_RE.exec(x.canon); if (mm && x.litLen > 0) names.push(mm[1]); }
            k = a.length; continue;
          }
          if (isEnv && (v === '-C' || v === '--chdir')) { k += 2; continue; }
          if (/^-/.test(v)) { k++; continue; }
          // export NAME / declare -x NAME: a value-less export of a name set earlier.
          if (!isEnv && !a[k].varCount && !a[k].substCount && isName(v)) { names.push(v); k++; continue; }
          break;
        }
        continue;
      }
      if (WRAPPER_CMDS.has(b)) { k++; continue; }
      break;
    }
  }
  if (envSplit && segments.some(segMentionsRunner)) return ENV_SOURCE_MSG;
  // A sourced file affects the segments after it, so the runner word must be
  // in another segment (`source <(kubectl completion bash)` alone is not one).
  if (sourced && segments.some(sg => !sourceSegs.has(sg) && segMentionsRunner(sg))) return ENV_SOURCE_MSG;
  const runs = (n) => SHELL_INJECT_ENV_RE.test(n) ? segMentionsRunnerStrict : segMentionsRunner;
  if (bareNames.some(b => DANGER_ENV_RE.test(b.n) && segments.some(sg => sg !== b.seg && runs(b.n)(sg)))) return ENV_MSG;
  const hit = names.filter(n => DANGER_ENV_RE.test(n));
  if (!hit.length) return null;
  return segments.some(hit.some(n => SHELL_INJECT_ENV_RE.test(n)) ? segMentionsRunnerStrict : segMentionsRunner) ? ENV_MSG : null;
}
// WI-21 round 2 L-1: xargs / parallel append words read from stdin to the
// command they wrap, so `echo --reporter=./x.mjs | xargs npm test --` hides the
// runner argument from every argv check. Any of them wrapping git or a test/CI
// runner asks.
const XARGS_MSG = 'xargs or parallel adds words read from stdin to git or a test/CI runner, so the guard cannot see the final arguments. Write the arguments out, or confirm.';
const STDIN_ARGV_CMDS = new Set(['xargs', 'parallel']);
function xargsRunnerMessage(segments) {
  for (const seg of segments) {
    const ix = seg.argv.findIndex(t => !t.varCount && !t.substCount && STDIN_ARGV_CMDS.has(basename(t.canon)));
    if (ix === -1) continue;
    if (!segMentionsRunner({ argv: seg.argv.slice(ix + 1) })) continue;
    // A literal echo/printf producer whose words are plain names (no option,
    // no ..) adds known words, which the other git checks then see as data.
    const si = segments.indexOf(seg);
    const prev = si > 0 && segments[si - 1].op === '|' ? segments[si - 1] : null;
    const words = prev ? echoWordsOfSeg(prev) : null;
    if (words !== null && words.split(/\s+/).filter(Boolean).every(w => /^[A-Za-z0-9_.\/:@+][A-Za-z0-9_.\/:@+-]*$/.test(w) && !/(^|\/)\.\.(\/|$)/.test(w))) continue;
    return XARGS_MSG;
  }
  return null;
}
function gitHistoryMessage(segments, raw) {
  // GIT_CONFIG_PARAMETERS / GIT_CONFIG_KEY_n set config (and aliases) from
  // the environment, which commandPosition() strips as assignments.
  const envCfg = /(?<![A-Za-z0-9_])GIT_CONFIG_(PARAMETERS|COUNT|KEY_\d+|VALUE_\d+)(?![A-Za-z0-9_])/.test(String(raw || ''));
  return scanSegments(segments, (r) => {
    if (envCfg && r.length && basename(r[0].canon) === 'git') return GIT_ALIAS_MSG;
    return gitArgvMessage(r);
  });
}

// W4: `find ... -delete` or `-exec rm` asks unless every search root is a temp
// path. A protected root already denies in checkDisabledList. A temp root is a
// literal path under /tmp/ (not /tmp itself, no `..`), a literal path under the
// hook's TMPDIR, or a variable that buildTempAssignMap proves is a mktemp
// path. No root means `.`, which is not a temp path.
const FIND_DELETE_CMDS = new Set(['rm', 'rmdir', 'unlink', 'shred', 'srm', 'wipe']);
function isTempLiteralPath(p) {
  const s = String(p || '');
  if (/(^|\/)\.\.(\/|$)/.test(s)) return false;
  if (/^\/tmp\/[^/]/.test(s)) return true;
  const envTmp = process.env.TMPDIR;
  if (envTmp && envTmp.length > 1 && PATH_SAFE_RE.test(envTmp)) {
    const base = envTmp.replace(/\/+$/, '');
    if (base.length > 1 && s.startsWith(base + '/') && s.length > base.length + 1) return true;
  }
  return false;
}
const FIND_CODE_INTERPRETERS = /^(perl|python[0-9.]*|ruby|node|nodejs|php|lua|tclsh|awk|gawk)$/;
function findArgvDeletes(rest) {
  for (let k = 0; k < rest.length; k++) {
    const v = rest[k].canon;
    if (v === '-delete') return true;
    if (!FIND_EXEC_FLAGS.has(v)) continue;
    const run = resolveEffectiveCommand(rest.slice(k + 1));
    if (!run.length) continue;
    const r0 = run[0];
    if (r0.varCount || r0.substCount) return true;
    const b = basename(r0.canon);
    if (FIND_DELETE_CMDS.has(b)) return true;
    // An interpreter can unlink files from its own code.
    if (FIND_CODE_INTERPRETERS.test(b)) return true;
    if (SHELL_INTERPRETERS_EVAL.has(b)) {
      // A variable or substituted payload is unknown, so it counts as a delete.
      if (run.some(t => t.varCount > 0 || t.substCount > 0)) return true;
      if (run.some(t => /\b(rm|rmdir|unlink|shred)\b/.test(t.canon))) return true;
    }
  }
  return false;
}
function findDeleteMessage(segments, temp, raw) {
  return scanSegments(segments, (argv, si) => {
    if (!argv.length || argv[0].varCount || argv[0].substCount || basename(argv[0].canon) !== 'find') return null;
    const rest = argv.slice(1);
    if (!findArgvDeletes(rest)) return null;
    let k = 0;
    let follows = false;
    while (k < rest.length) {
      const v = rest[k].canon;
      // -L and -H follow symlinks, which can lead out of a temp root.
      if (v === '-L' || v === '-H') { follows = true; k++; continue; }
      if (/^-(P|O\d)$/.test(v)) { k++; continue; }
      if (v === '-D') { k += 2; continue; }
      break;
    }
    const roots = [];
    for (; k < rest.length; k++) {
      const t = rest[k];
      if (t.litLen > 0 && t.varCount === 0 && t.substCount === 0 && /^[-(!,)]/.test(t.canon)) break;
      roots.push(t);
    }
    if (rest.some(t => t.canon === '-follow')) follows = true;
    // A trailing slash makes find follow a root that is a symlink.
    const allTemp = !follows && roots.length > 0 && roots.every(t =>
      isTempVarToken(t, si, segments, temp, raw) ||
      (t.litLen > 0 && t.varCount === 0 && t.substCount === 0 && !/\/$/.test(t.canon) && isTempLiteralPath(t.canon)));
    if (allTemp) return null;
    return 'find -delete / -exec rm removes every match under the search root (' +
      (roots.length ? roots.map(t => t.canon || '$var').join(' ') : '.') +
      '). Run the same find with -print first to check the matches.';
  });
}

// Single-quote a word for re-evaluation (the evaluator re-tokenizes it).
function shq(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }

// H2/REV1: a literal whose first word runs a string, a file or its own argv as
// code, or wraps another command, is never resolved: `C=eval; $C "..."`,
// `C=source; $C f`, `C=xargs; ... | $C rm -rf`, `C=taskset; $C 1 reboot` keep
// the variable-indirection ask. Sets are read at call time (ARGV_EXEC_CMDS is
// defined further down).
const UNRESOLVABLE_EXTRA = new Set(['exec', 'command', 'builtin', 'xargs', 'find', 'sudo', 'doas', 'su', 'pkexec',
  'nohup', 'time', 'env', 'trap', 'coproc']);
function isUnresolvableWord(w) {
  const b = basename(w);
  return VAR_WRITER_CMDS.has(w) || VAR_WRITER_CMDS.has(b) || UNRESOLVABLE_EXTRA.has(b) || WRAPPER_CMDS.has(b) ||
    ARGV_EXEC_CMDS.has(b);
}

function checkVariableExpansion(segments, depth, raw) {
  let ask = null;
  // Loose map (NAME -> last literal, command order), used ONLY to DENY a
  // recursive delete whose variable target held a protected path. A stale or
  // rebound entry here can only make the guard stricter.
  const assign = new Map();
  // Strict map (S2a), used for every decision that SKIPS an ask.
  const literal = buildLiteralAssignMap(segments, String(raw || ''));
  // H5: mktemp-assigned variables, used only to skip the unknown-target ask.
  const temp = buildTempAssignMap(segments, String(raw || ''));
  const splices = [];
  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    if (!seg.argv.length) continue;
    for (const t of seg.argv) {
      const m = (t.litLen > 0 && t.varCount === 0 && t.substCount === 0) && INLINE_ASSIGN_RE.exec(t.canon);
      if (!m) break;               // assignments only ever PREFIX a segment
      assign.set(m[1], m[2]);
    }
    const argv = commandPosition(seg.argv);
    if (!argv.length) continue;
    let ft = argv[0];
    let rest = argv.slice(1);
    // R-77.5 (v12.77.0): a variable command word after xargs / parallel
    // (`C=rm; xargs $C -rf <<< /etc`) is judged like the command word, with
    // the known stdin words appended.
    if (!ft.varCount && !ft.substCount && STDIN_ARGV_CMDS.has(basename(ft.canon))) {
      const w = xargsWrappedCommand(argv);
      if (w.length && isPureVar(w[0])) { ft = w[0]; rest = w.slice(1).concat(xargsStdinWords(segments, seg)); }
    }
    if (isPureVar(ft)) {
      if (isVisiblyDestructiveArgv(rest)) {
        return D('variable in command position with a destructive argv (canonicalizes to a destructive command)');
      }
      // H2: a variable assigned a FULLY literal value earlier in the same
      // command string is not hidden - substitute it and judge the real
      // command. The value is word-split exactly like an unquoted expansion
      // (no re-parse of quotes/operators/comments), each word re-quoted.
      // H2/REV1: the resolved words are spliced into the WHOLE command string
      // at this token's span and the rebuilt string is judged once (after the
      // loop), so pipe, download-exec, egress and consumer checks see the real
      // command (`C=bash; curl x | $C` denies like `curl x | bash`).
      const vname = (ft.varNames && ft.varNames[0]) || '';
      const entry = vname ? literal.get(vname) : null;
      const restLiteral = rest.every(t => t.varCount === 0 && t.substCount === 0);
      const words = entry ? entry.value.split(/[ \t\n]+/).filter(Boolean) : [];
      if (entry && entry.idx < si && restLiteral && Number.isInteger(ft.start) && Number.isInteger(ft.end) &&
          !(words.length && isUnresolvableWord(words[0]))) {
        splices.push({ start: ft.start, end: ft.end, text: words.map(shq).join(' ') });
        continue;
      }
      ask = ask || A('a variable is executed as a command (variable-indirection); its contents are not statically visible');
    } else {
      const cmd = basename(ft.canon);
      if (isDestructiveFileCmd(cmd) && hasRecursiveForce(argv)) {
        let unknownTarget = false;
        for (const t of argv.slice(1)) {
          if (isCmdSubstPosition(t)) { unknownTarget = true; continue; }
          if (!isPureVar(t)) continue;
          // Constant propagation: `S=/tmp/scratch; rm -rf $S` IS statically
          // resolvable — the value was assigned a literal earlier in the same
          // command string, so judge the REAL path instead of asking blindly.
          // A protected path in the loose map DENIES; the ask is skipped only
          // when the strict map (S2a) proves the value at this point.
          const name = (t.varNames && t.varNames[0]) || '';
          if (name && assign.has(name) && isDangerousPath(assign.get(name))) {
            return D('recursive/forced delete of a protected path (' + name + '=' + assign.get(name) + ')');
          }
          // H5: a mktemp-assigned variable is a fresh temp path.
          if (isTempVarToken(t, si, segments, temp, raw)) continue;
          const entry = name ? literal.get(name) : null;
          if (!entry || entry.idx >= si) { unknownTarget = true; continue; }
          if (isDangerousPath(entry.value)) return D('recursive/forced delete of a protected path (' + name + '=' + entry.value + ')');
        }
        if (unknownTarget) ask = ask || A('recursive/forced delete with a variable/substitution target (path unknown at analysis time)');
      }
    }
  }
  if (splices.length && typeof raw === 'string') {
    let rebuilt = raw;
    for (const sp of splices.sort((a, b) => b.start - a.start)) {
      rebuilt = rebuilt.slice(0, sp.start) + sp.text + rebuilt.slice(sp.end);
    }
    // WI-20 N7: quoting can grow the text past MAX_LEN; keep the plain ask
    // instead of a length deny.
    if (rebuilt.length > MAX_LEN) {
      ask = ask || A('a variable is executed as a command (variable-indirection); its contents are not statically visible');
    } else {
      const v = evaluateInternal(rebuilt, depth + 1);   // S2b: real depth
      if (v && v.kind === 'deny') return v;
      if (v && v.kind === 'ask') ask = ask || v;
    }
  }
  return ask;
}

// WI-20 REV2 R5/R6: the -c payload of a shell argv. bash takes a short-option
// cluster containing c (-c, -ec, -xc, -lc) anywhere among its leading options,
// and the command string is the first non-option word after them
// (`bash -c -e 'cmd'`, `bash -e -c 'cmd'`). -o / +o and the rc-file options
// consume a value. Returns { token } when -c is present (token may be null).
const SHELL_OPT_WITH_ARG = new Set(['-o', '+o', '-O', '+O', '--rcfile', '--init-file']);
function shellCPayload(rrest) {
  let seenC = false;
  for (let k = 0; k < rrest.length; k++) {
    const t = rrest[k], v = t.canon;
    // REV4 R3-1: a variable/substitution word in option position may expand to
    // -c or to an option that takes a value. The parse is ambiguous: fail closed.
    if (t.varCount || t.substCount) return shellCFallback(rrest, k, seenC);
    // REV4 R3-3: a lone `-` ends the options, like `--`.
    if (v === '--' || v === '-') return seenC ? { tokens: rrest[k + 1] ? [rrest[k + 1]] : [] } : null;
    if (SHELL_OPT_WITH_ARG.has(v)) { k++; continue; }
    if (/^[-+][A-Za-z]+$/.test(v)) {
      if (v[0] === '-' && v.includes('c')) seenC = true;
      // REV3 R2-1: each o / O in a cluster (-eo, -euxo, -co, -Oc) takes the next word as its value.
      k += (v.match(/[oO]/g) || []).length;
      continue;
    }
    if (/^--[A-Za-z-]+$/.test(v)) continue;
    if (/^[-+]/.test(v)) return shellCFallback(rrest, k, seenC);   // REV4: unclassifiable option word
    return seenC ? { tokens: [t] } : null;
  }
  return seenC ? { tokens: [] } : null;
}
// REV4 R3-1: every later word that does not look like an option, plus the word
// after any -c cluster wherever it sits, is a candidate payload and is judged.
function shellCFallback(rrest, k, seenC) {
  const cand = new Set();
  for (let j = 0; j < rrest.length; j++) {
    const v = rrest[j].canon;
    if (/^-[A-Za-z]*c[A-Za-z]*$/.test(v) && rrest[j + 1]) { seenC = true; cand.add(rrest[j + 1]); }
    if (j > k && (rrest[j].varCount || rrest[j].substCount || !/^[-+]/.test(v))) cand.add(rrest[j]);
  }
  return { tokens: [...cand], ambiguous: true };
}
// WI-20 REV2 R3/R4/R8: the code an `eval` runs, with a leading run of `eval`
// words and `--` collapsed so a long eval chain is judged once (linear).
function evalCodeOf(args) {
  let k = 0;
  while (k < args.length && !args[k].varCount && !args[k].substCount && (args[k].canon === 'eval' || args[k].canon === '--')) k++;
  const rest = args.slice(k);
  if (!rest.length || rest.some(t => t.varCount > 0 || t.substCount > 0)) return null;
  return rest.map(t => t.canon).join(' ');
}

// WI-20 REV3 R2-3: fail closed on process substitution. When the command line
// has a <(...) / >(...) AND any segment runs a shell, source/., an interpreter,
// or `exec` with a redirect, the substitution may be fed to it as code through
// any fd route (`bash < <(..)`, `bash 0<&3 3< <(..)`, `exec < <(..); sh`). Each
// substitution is then judged as a script, as `bash <(...)` is: a curl/wget
// inner denies, and a literal echo/printf output is evaluated. An unresolvable
// producer (`source <(kubectl completion bash)`) keeps its verdict.
function procSubstScriptVerdict(segments, depth) {
  const ps = [];
  for (const seg of segments) {
    for (const t of seg.argv) if (t.procSubst) ps.push(t);
    for (const r of seg.redirects) if (r.target && r.target.procSubst) ps.push(r.target);
  }
  if (!ps.length) return null;
  const runsCode = segments.some(seg => {
    const r = commandPosition(seg.argv);
    const c0 = r.length ? basename(r[0].canon) : '';
    if (SHELL_INTERPRETERS_EVAL.has(c0) || c0 === 'source' || c0 === '.' || isInterpreter(c0)) return true;
    const a = skipLeadKeywords(seg.argv);
    return a.length > 0 && a[0].canon === 'exec' && seg.redirects.length > 0;
  });
  if (!runsCode) return null;
  let ask = null;
  for (const t of ps) {
    const inner = t.substInners[0] || '';
    if (/\b(curl|wget)\b/.test(inner)) return D('download-then-execute (a fetched script is run by a shell through a process substitution)');
    const texts = producedScripts(inner, 0);
    if (texts === null) { ask = ask || A('process-substitution producers nest too deep for the guard to analyze'); continue; }
    for (const text of texts) {
      if (/\b(curl|wget)\b/.test(text)) return D('download-then-execute (a fetched script is run by a shell through a process substitution)');
      const v = evaluateInternal(text, depth + 1);
      if (v && v.kind === 'deny') return D('process-substitution script is destructive: ' + (v.reason || ''));
      if (v && v.kind === 'ask') ask = ask || A('process-substitution script requires confirmation: ' + (v.reason || ''));
    }
  }
  return ask;
}
// REV4 R3-2: the script text a producer can emit. A literal echo/printf emits
// its words (one text per echo segment). Any producer that nests a <(...),
// $(...) or `...` (cat/tac/sed/head ... of a substitution, echo $(echo X)) is
// recursed to its innermost producers. Anything else emits nothing judgeable;
// its own commands are still judged by checkCommandSubstitution as before
// WI-20. null = nested past MAX_SUBST_DEPTH.
function producedScripts(inner, n) {
  if (n > MAX_SUBST_DEPTH) return null;
  const one = echoOutputOf(inner);
  if (one !== null) return [one];
  let segs;
  try { segs = tokenize(inner).segments; } catch (e) { return []; }
  const out = [];
  for (const seg of segs) {
    const w = echoWordsOfSeg(seg);
    if (w !== null) out.push(w);
    const toks = seg.argv.concat(seg.redirects.map(r => r.target).filter(Boolean));
    for (const t of toks) {
      for (const si of (t.substInners || [])) {
        const sub = producedScripts(si, n + 1);
        if (sub === null) return null;
        out.push(...sub);
      }
    }
  }
  return out;
}

// ── Component 3: command-substitution recursion ─────────────────────────────
// WI-20 G3: the words a plain `echo`/`printf %s` of literal words prints, or null.
function echoOutputOf(inner) {
  let segs;
  try { segs = tokenize(inner).segments; } catch (e) { return null; }
  if (segs.length !== 1) return null;
  return echoWordsOfSeg(segs[0]);
}
function echoWordsOfSeg(seg) {
  const a = seg.argv;
  if (!a.length || !/^(echo|printf)$/.test(a[0].canon) || a.some(t => t.varCount || t.substCount)) return null;
  let words = a.slice(1).map(t => t.canon);
  if (a[0].canon === 'echo') while (words.length && /^-[neE]+$/.test(words[0])) words.shift();
  else if (words[0] === '%s' || words[0] === '%s\\n') words = words.slice(1);
  else if (words.length === 1 && !/[%\\]/.test(words[0])) { /* printf FORMAT with no % or escape prints it */ }
  else return null;
  return words.join(' ');
}
function checkCommandSubstitution(segments, depth) {
  let ask = null;
  for (const seg of segments) {
    const head = skipLeadKeywords(seg.argv);
    if (head.length) {
      const ft = head[0];
      if (isCmdSubstPosition(ft) && isVisiblyDestructiveArgv(head.slice(1))) {
        return D('command name computed by a substitution with a destructive argv');
      }
      // WI-20 G3: `$(echo CMD ARGS)` in command position runs CMD ARGS.
      if (isCmdSubstPosition(ft) && ft.substInners.length === 1) {
        const out = echoOutputOf(ft.substInners[0]);
        if (out !== null) {
          const v = evaluateInternal(out + (head.length > 1 ? ' ' + head.slice(1).map(t => shq(t.canon)).join(' ') : ''), depth + 1);
          if (v && v.kind === 'deny') return D('command computed by a substitution is destructive: ' + (v.reason || ''));
          if (v && v.kind === 'ask') ask = ask || A('command computed by a substitution requires confirmation: ' + (v.reason || ''));
        }
      }
    }
    // WI-20 G3: bash expands $(...) and `...` in an UNQUOTED heredoc body.
    for (const hd of (seg.heredocs || [])) {
      if (hd.quoted) continue;
      for (const inner of substInnersOf(hd.body)) {
        const v = evaluateInternal(inner, depth + 1);
        if (v && v.kind === 'deny') return D('heredoc body substitution is destructive: ' + (v.reason || ''));
        if (v && v.kind === 'ask') ask = ask || A('heredoc body substitution requires confirmation');
      }
    }
    const tokens = seg.argv.concat(seg.redirects.map(r => r.target).filter(Boolean));
    for (const t of tokens) {
      for (const inner of (t.substInners || [])) {
        const v = evaluateInternal(inner, depth + 1);
        if (v && v.kind === 'deny') return D('command substitution inner is destructive: ' + (v.reason || ''));
        if (v && v.kind === 'ask') ask = ask || A('command substitution inner requires confirmation');
      }
    }
  }
  return ask;
}

// ── Component 4: pipe-destination check ─────────────────────────────────────
function isDecoderSegment(seg) {
  if (!seg.argv.length) return false;
  const cmd = basename(seg.argv[0].canon);
  const args = seg.argv.slice(1).map(t => t.canon);
  if (cmd === 'base64' || cmd === 'base32') return args.includes('-d') || args.includes('--decode') || args.some(a => /^-[a-z]*d/.test(a));
  if (cmd === 'xxd') return args.includes('-r') || args.some(a => /^-[a-z]*r/.test(a));
  if (cmd === 'uudecode') return true;
  if (cmd === 'openssl') return args.includes('-d');
  return false;
}
function isFetchSegment(seg) {
  if (!seg.argv.length) return false;
  const cmd = basename(seg.argv[0].canon);
  return cmd === 'curl' || cmd === 'wget';
}
// ── grouping-aware pipe helpers (subshell '(...)' and brace group '{ ...; }') ──
// The lexer hides a grouped producer two ways: a subshell close surfaces as an
// op ')' on the last inner segment (the trailing '|' is consumed by the ')'
// handler), and a brace-group close surfaces as a '}'-only segment that CARRIES
// the real trailing operator. Both let a decoder/fetch producer inside the group
// slip past a flat, op-'|'-only pipe scan. These helpers look through the
// grouping so '(base64 -d x)|python3' and '{ base64 -d x; }|sh' still deny.
function stripGroupingTokens(argv) {
  return argv.filter(t => {
    const c = t.canon;
    return c !== '(' && c !== ')' && c !== '{' && c !== '}';
  });
}
function strippedSeg(seg) { return { argv: stripGroupingTokens(seg.argv) }; }
// A segment whose argv is ONLY grouping-close tokens (e.g. the '}' of a brace group).
function isPureGroupClose(seg) {
  return seg.argv.length > 0 && seg.argv.every(t => t.canon === '}' || t.canon === ')');
}
// Scan back from a group-close segment to the nearest real (grouping-stripped)
// command feeding the group's stdout — the pipeline producer.
function findGroupProducer(segments, closeIdx) {
  for (let k = closeIdx - 1; k >= 0; k--) {
    const s = strippedSeg(segments[k]);
    if (s.argv.length) return s;
  }
  return null;
}
// H3: `producer | python3 -c '<literal program>'` (or node -e/-p) runs a
// VISIBLE program; the piped stdin is data, not code. H3/REV2: this is an
// ALLOWLIST. Only python* and node/nodejs qualify (perl, ruby and every other
// interpreter always keep the pipe ask), and the program must pass
// pythonProgramIsData / nodeProgramIsData below. DYNAMIC_CODE_RE stays as an
// extra rejection layer on top of the allowlist.
const PY_INLINE = ['-c'];
const NODE_INLINE = ['-e', '-p', '--eval', '--print'];
function inlineFlagsFor(cmd) {
  if (/^python[23]?(\.\d+)?$/.test(cmd)) return PY_INLINE;
  if (cmd === 'node' || cmd === 'nodejs') return NODE_INLINE;
  return null;
}
// Python: every imported module (root name) must be in this set.
const PY_IMPORT_OK = new Set(['json', 'sys', 're', 'csv', 'collections', 'itertools', 'functools', 'math',
  'statistics', 'datetime', 'textwrap', 'pprint', 'string', 'operator', 'decimal', 'fractions', 'uuid']);
// Python names that reach code, files, frames or other modules from an
// allowed module (uuid.os, re.enum.builtins, sys._getframe, attrgetter ...).
const PY_REJECT_RE = new RegExp([
  '__', '\\bmodules\\b', '\\[\\s*:\\s*:', '\\.\\s*_',
  'exec', 'eval', 'compile', 'system', 'popen', 'spawn',
  '\\b\\w*attr(getter)?\\b', '\\bmethodcaller\\b', '\\bvars\\b', '\\bglobals\\b', '\\blocals\\b',
  '\\bopen\\s*\\(', '\\bhelp\\s*\\(', '\\blicense\\s*\\(', '\\bget_field\\b', '\\bget_value\\b', '\\bFormatter\\b',
  '\\b(os|posix|nt|posixpath|ntpath|genericpath|builtins|copyreg|types|monitoring|subprocess|shutil|io|pathlib)\\b',
  '\\b(tb|f|gi|cr|ag)_\\w+', 'traceback', '\\bsettrace\\b', '\\bsetprofile\\b',
  // H3/REV3: hook callables, bare open, callable-taking builtins, callback
  // keyword args and builtin aliasing (f=open; f(...)) keep the ask.
  'breakpoint\\w*', '\\bopen\\b', '\\b(map|filter)\\s*\\(',
  '\\b(object_hook|object_pairs_hook|parse_float|parse_int|parse_constant|cls)\\s*=',
  '=\\s*(open|print|exec|eval|__import__|getattr|compile)\\b', '\\bsys\\s+as\\b'
].join('|'));
// H3/REV3: the only sys members a data program may touch.
const PY_SYS_OK = new Set(['stdin', 'stdout', 'stderr', 'argv', 'exit', 'maxsize']);
function pythonProgramIsData(p) {
  if (PY_REJECT_RE.test(p)) return false;
  let rest = p;
  // from M import a, b  (M must be allowed; names must not be private)
  const fromRe = /\bfrom\s+([\w.]+)\s+import\s+(\(?[\w\s,]+\)?)/g;
  let m;
  while ((m = fromRe.exec(p)) !== null) {
    if (!PY_IMPORT_OK.has(m[1].split('.')[0])) return false;
    if (m[2].split(/[\s,()]+/).some(n => n.startsWith('_'))) return false;
    if (m[1] === 'sys' && m[2].split(/[\s,()]+/).some(n => n && !PY_SYS_OK.has(n))) return false;
  }
  rest = rest.replace(fromRe, ' ');
  // import a, b.c as x
  const impRe = /\bimport\s+([A-Za-z_][\w.]*(?:\s+as\s+\w+)?(?:\s*,\s*[A-Za-z_][\w.]*(?:\s+as\s+\w+)?)*)/g;
  while ((m = impRe.exec(rest)) !== null) {
    for (const part of m[1].split(',')) {
      if (!PY_IMPORT_OK.has(part.trim().split(/\s+/)[0].split('.')[0])) return false;
    }
  }
  rest = rest.replace(impRe, ' ');
  // H3/REV3: every remaining `sys` is sys.<allowed member> (no alias, no
  // sys.breakpointhook / sys.path.insert).
  const sysAll = (rest.match(/\bsys\b/g) || []).length;
  const sysOk = (rest.match(/\bsys\s*\.\s*\w+/g) || [])
    .filter(x => PY_SYS_OK.has(x.replace(/^sys\s*\.\s*/, ''))).length;
  if (sysAll !== sysOk) return false;
  // Any import word the two forms above did not account for (from . import,
  // import inside a string, odd syntax) keeps the ask.
  return !/\bimport\b/.test(rest);
}
// Node: require() targets must be one of these literal module names.
const NODE_REQUIRE_OK = new Set(['fs', 'path', 'util', 'readline']);
const NODE_PROCESS_OK = new Set(['stdin', 'stdout', 'stderr', 'argv', 'exit', 'exitCode', 'env']);
const NODE_REJECT_RE = new RegExp([
  '__', '\\.\\s*_', '\\bmainModule\\b', '\\b_load\\b', '\\bmodule\\b', '\\bglobal\\b', '\\bglobalThis\\b',
  '\\bconstructor\\b', '\\bFunction\\b', '\\beval\\b', '\\bimport\\b', '\\barguments\\b', '\\bprototype\\b',
  '\\b(fetch|WebSocket|EventSource|XMLHttpRequest|Worker|SharedWorker|navigator|Proxy|Reflect)\\b',
  // fs writes and file mutation (process.stdout/stderr.write is stripped first)
  // H3/REV3: property-walk and bulk-copy reflection, and string joins (built keys)
  '\\b(getOwnPropertyDescriptor\\w*|getPrototypeOf|setPrototypeOf|defineProperty\\w*)\\b',
  '\\bObject\\s*\\.\\s*(entries|values|fromEntries|assign)\\b', '\\.\\s*join\\s*\\(',
  '\\b(write\\w*|append\\w*|open\\w*|rm|rmSync|rmdir\\w*|unlink\\w*|rename\\w*|copyFile\\w*|cp|cpSync|symlink\\w*|link|linkSync|chmod\\w*|chown\\w*|lchown\\w*|lutimes\\w*|truncate\\w*|ftruncate\\w*|mkdir\\w*|mkdtemp\\w*|utimes\\w*|futimes\\w*|promises|createWriteStream)\\b'
].join('|'));
// H3/REV3: require('fs') is used only as require('fs').<read member> or bound
// once by `const|let|var NAME = require('fs')` with every later NAME being
// NAME.<read member>. Destructuring, spreading, passing fs as an argument or
// Object.entries(fs) keeps the ask.
const NODE_FS_OK = new Set(['readFileSync', 'existsSync', 'readdirSync', 'statSync', 'lstatSync']);
function nodeFsUseIsReadOnly(q) {
  const reqFs = /\brequire\s*\(\s*(['"])(?:node:)?fs\1\s*\)/g;
  const names = [];
  let m;
  while ((m = reqFs.exec(q)) !== null) {
    const before = q.slice(0, m.index);
    const after = q.slice(m.index + m[0].length);
    const bind = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*$/.exec(before);
    if (bind) { names.push(bind[1]); continue; }
    const mem = /^\s*\.\s*(\w+)/.exec(after);
    if (!mem || !NODE_FS_OK.has(mem[1])) return false;
  }
  const q2 = q.replace(reqFs, 'require()');   // the 'fs' literal is not a use
  for (const n of names) {
    const esc = n.replace(/\$/g, '\\$');
    const all = (q2.match(new RegExp('(?<![\\w$.])' + esc + '(?![\\w$])', 'g')) || []).length;
    const ok = (q2.match(new RegExp('(?<![\\w$.])' + esc + '\\s*\\.\\s*(\\w+)', 'g')) || [])
      .filter(x => NODE_FS_OK.has(x.replace(/^.*\.\s*/, ''))).length;
    if (all - 1 !== ok) return false;     // -1: the declaration itself
  }
  return true;
}
function nodeProgramIsData(p) {
  const q = p.replace(/\bprocess\s*\.\s*std(out|err)\s*\.\s*write\b/g, 'process.stdout');
  if (NODE_REJECT_RE.test(q)) return false;
  // every require is require('<allowed literal>')
  const reqAll = (q.match(/\brequire\b/g) || []).length;
  const reqOk = (q.match(/\brequire\s*\(\s*(['"])(?:node:)?([\w]+)\1\s*\)/g) || [])
    .filter(r => NODE_REQUIRE_OK.has(r.replace(/^require\s*\(\s*['"](?:node:)?|['"]\s*\)$/g, ''))).length;
  if (reqAll !== reqOk) return false;
  if (!nodeFsUseIsReadOnly(q)) return false;
  // every `process` is process.<allowed member>
  const procAll = (q.match(/\bprocess\b/g) || []).length;
  let procOk = 0;
  const procRe = /\bprocess\s*\.\s*(\w+)/g;
  let m;
  while ((m = procRe.exec(q)) !== null) { if (NODE_PROCESS_OK.has(m[1])) procOk++; }
  if (procAll !== procOk) return false;
  // computed member access: x[...] / x?.[...] only with a number or a single
  // plain string literal as the key. A computed key from a variable or an
  // expression ([k], ["a"+"b"], [s.join('')]) keeps the ask: stdin-supplied
  // keys can walk to constructor/Function.
  const memRe = /([\w$)\]]\s*|\?\.)\[([^\]]*)\]/g;
  while ((m = memRe.exec(q)) !== null) {
    const key = m[2].trim();
    if (!/^(\d+|'[^'\\+]*'|"[^"\\+]*")$/.test(key)) return false;
  }
  return true;
}
// S3a: a program that can run other code or other processes keeps the ask.
// The list covers the exec/spawn/popen families, dynamic import and load
// helpers, reflection that can reach a blocked name, string-built names and
// encoded payloads, and the Perl/Ruby command-quote forms.
const DYNAMIC_CODE_RE = new RegExp([
  '\\b(exec\\w*|eval\\w*|compile\\w*|__import__|system|\\w*popen\\w*|subprocess|\\w*spawn\\w*|child_process|Function|pty|socket|fork\\w*)\\b',
  '\\brequire\\s*\\(\\s*([^\'"\\s]|[\'"](vm|v8|worker_threads|module|inspector|cluster|net|dgram|tls|http2?|https)[\'"])',
  '\\b(importlib|runpy|ctypes|cffi|marshal|pickle|cPickle|dill|shelve|codeop|InteractiveConsole|builtins|__builtins__|getattr|setattr|globals|locals|os\\.dup2)\\b|\\bvars\\s*\\(',
  '\\b(binding|dlopen|Worker|Reflect|constructor|globalThis|send|__send__|public_send|const_get|instance_eval|class_eval|module_eval|instance_variable_get)\\b',
  '\\bimport\\s*\\(',                         // JS dynamic import()
  '`',                                        // Perl/Ruby/JS backtick command or template
  '\\bqx\\s*\\W', '%x\\s*\\W',                // Perl qx//, Ruby %x()
  '\\bopen\\b[^;]*[\'"]\\s*-?\\|',            // Perl/Ruby open() of a pipe
  '[\'"]\\s*[+.]\\s*[\'"]',                   // string-built name: 'sy'+'stem', "sys"."tem"
  '\\b(chr|fromCharCode|b64decode|a85decode|unhexlify|fromhex|atob|rot13)\\b',
  '\\\\x[0-9a-fA-F]{2}|\\\\u[0-9a-fA-F]{4}|\\\\[0-7]{3}',  // escaped bytes in the program
  // H3/REV1: programs that read stdin AS CODE (REPLs, debuggers, the code
  // module, a load of /dev/stdin) and file-write APIs (the piped data lands in
  // a file) keep the ask.
  '\\b(code|pdb|repl|breakpoint|runsource|runcode|set_trace|Interactive\\w*)\\b',
  '/dev/stdin|/dev/fd/\\d|/proc/self/fd/\\d|\\bSTDIN\\b|\\$stdin\\b',
  '\\bdo\\s*\\(?\\s*[\'"$]',                                       // Perl do FILE
  '\\b(load|require|require_relative)\\s*\\(?\\s*([\'"]\\s*[./~]|[$@A-Z])',  // Ruby/Perl load of a path
  '\\bopen\\s*\\([^)]*,\\s*[\'"][^\'"]*[wax+]',                     // open(path, "w"|"a"|"x"|"+")
  '\\b(write\\w*Sync|append\\w*|write_text|write_bytes|createWriteStream|writeFile|syswrite)\\b|\\b(IO|File)\\.write\\b'
].join('|'));
// S3b: flags that make the interpreter read stdin AS CODE after the program.
function hasInteractiveFlag(cmd, argv) {
  return argv.slice(1).some(t => {
    const v = t.canon;
    if (v === '-i' || v === '--interactive') return true;
    // python combined short flags (-ic, -Bi, -iB ...)
    return /^python/.test(cmd) && /^-[A-Za-z]*i[A-Za-z]*$/.test(v);
  });
}
function inlineProgramIsData(seg) {
  const argv = seg.argv;
  const cmd = basename(argv[0].canon);
  const flags = inlineFlagsFor(cmd);
  if (!flags) return false;
  const isData = flags === PY_INLINE ? pythonProgramIsData : nodeProgramIsData;
  if (hasInteractiveFlag(cmd, argv)) return false;
  // H3/REV3: argv is EXACTLY [interpreter, program-flag, program]. Any other
  // token (`-`, `-m code`, `--require x`, a trailing `--inspect`) keeps the ask.
  // The one exception is the fd number of a redirect (`2>&1`), which the
  // tokenizer leaves as a trailing argv word.
  const fdWord = argv.length === 4 && seg.redirects && seg.redirects.length > 0 &&
    /^\d$/.test(argv[3].canon) && !argv[3].varCount && !argv[3].substCount;
  if ((argv.length !== 3 && !fdWord) || !flags.includes(argv[1].canon)) return false;
  let found = false;
  // Every program flag counts (`perl -e A -e B` runs both). S3c: the fields
  // below are the tokenizer's own (canon, varCount, substCount; see tokenize()).
  for (let k = 1; k < argv.length - 1; k++) {
    if (!flags.includes(argv[k].canon)) continue;
    const p = argv[k + 1];
    if (!p || p.varCount || p.substCount) return false;
    if (DYNAMIC_CODE_RE.test(p.canon)) return false;
    // WI-20 F1: Python NFKC-folds fullwidth identifiers (ｅｘｅｃ runs exec) and
    // JS reads \u{65} / \u0065 in identifiers, so the ASCII allowlist below
    // cannot see them. Any non-ASCII character or \u \U \x \N{ keeps the ask.
    if (/[^\x00-\x7f]|\\[uUxN]/.test(p.canon)) return false;
    if (!isData(p.canon)) return false;     // H3/REV2 allowlist gate
    found = true;
    k++;
  }
  return found;
}
function checkPipeDestination(segments) {
  let ask = null;
  // Consumer-driven scan: for every interpreter sink, resolve the producer that
  // feeds it — looking THROUGH subshell '(...)' and brace-group '{ ...; }'
  // wrapping. Non-grouped pipes behave exactly as the prior op-'|' scan did.
  for (let j = 1; j < segments.length; j++) {
    const consumer = segments[j];
    if (!consumer.argv.length) continue;
    // H3/REV3: judge the consumer past assignment prefixes and wrappers
    // (`PYTHONSTARTUP=x python3`, `env node`); such a prefix also disqualifies
    // the inline-program allowance below.
    const cArgv = stripGroupingTokens(consumer.argv);
    const cRes = resolveEffectiveCommand(cArgv);
    if (!cRes.length) continue;
    const cCmd = basename(cRes[0].canon);
    if (!isInterpreter(cCmd)) continue;
    const cBare = cRes.length === consumer.argv.length;

    const prev = segments[j - 1];
    let producer = null;
    let knownPipe = false;   // true only when the '|' operator survived tokenization

    if (prev.op === '|') {
      // Real pipe. If prev is the '}' of a brace group, the producer is the last
      // command INSIDE the group; otherwise prev itself is the producer.
      knownPipe = true;
      producer = isPureGroupClose(prev) ? findGroupProducer(segments, j - 1) : strippedSeg(prev);
    } else if (prev.op === ')') {
      // Subshell close abutting a command. The trailing operator (which valid
      // bash REQUIRES here — '|', ';', '&&', ...) was collapsed into the ')' op,
      // so we cannot prove it was a pipe. Fire on decoder/fetch producers ONLY
      // (deny) and never emit the softer ask, to avoid over-blocking benign
      // sequential subshells like '(cd build && make); python3 setup.py'.
      producer = strippedSeg(prev);
    }

    if (!producer || !producer.argv.length) continue;
    if (isDecoderSegment(producer) || isFetchSegment(producer)) {
      return D('decoder/fetch piped into an interpreter (obfuscated code execution)');
    }
    if (knownPipe && cBare && inlineProgramIsData(consumer)) continue;   // H3
    if (knownPipe) {
      ask = ask || A('output piped into an interpreter (' + cCmd + '); confirm the input is trusted');
    }
  }
  return ask;
}

// ── Component 5: canonical-token-anchored disabled list ─────────────────────
const DENY_CANON = [
  /\bmkfs(\.[a-z0-9]+)?\b/,
  /\bsudo\b/,
  /\bdoas\b/,
  /\bpkexec\b/,
  /\bcrontab\b/,
  /(^|[;|&]\s*)su(\s|$)/,
  /\bsocat\b/,
  /(\|\s*(nc|netcat)\b|(^|[;&|]\s*)(nc|netcat)\b)/,
  /\bcurl\b.*(\s-d\b|\s--data\b|\s--data-binary\b|\s--data-raw\b|\s--data-urlencode\b|\s-T\b|\s--upload-file\b|@-)/,
  /\bwget\b.*(--post-file|--post-data|--body-file|--body-data)/
];

// K1/W1: git push is judged on the git segment's argv by gitHistoryMessage(),
// not by a regex over the whole string (which fired on `grep "git push --force"`
// data and missed `-f`, `+refspec`, `--mirror`, `--delete`).
const ASK_CANON = [
  { re: /git reset --hard\b/, msg: 'Hard reset discards uncommitted changes. Consider git stash or --soft first.' },
  { re: /git\s+clean\b.*-\w*f\w*d|git\s+clean\b.*-\w*d\w*f/, msg: 'git clean -fd removes untracked files. Consider git clean -n to preview.' },
  { sql: true, re: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i, msg: 'DROP TABLE/DATABASE permanently destroys data. Consider renaming the table first (ALTER TABLE ... RENAME), or use DROP ... IF EXISTS with a backup.' },
  { sql: true, re: /\bTRUNCATE\s+TABLE\b/i, msg: 'TRUNCATE TABLE removes all rows irrecoverably. Consider DELETE FROM with a WHERE clause for selective removal, or create a backup first.' },
  { sql: true, re: /\bDELETE\s+FROM\b(?!\s.*\bWHERE\b)/is, msg: 'DELETE FROM without WHERE clause removes all rows. Add a WHERE clause to target specific rows, or use TRUNCATE if you intend to remove everything.' },
  { re: /\bchmod\s+777\b/, msg: 'chmod 777 grants world rwx. Consider 755 or 700.' },
  { re: /\bchown\s+-R\s+root\b/, msg: 'Recursive chown to root may lock you out. Verify the path.' },
  { re: /\bkill\s+-9\s+-1\b/, msg: 'kill -9 -1 SIGKILLs all your processes. Consider targeting a PID.' },
  { re: /\bkillall\b/, msg: 'killall terminates all processes matching a name. Consider a specific PID.' },
  { re: /\bpkill\s+-9\b/, msg: 'pkill -9 SIGKILLs without graceful shutdown. Consider SIGTERM first.' },
  { re: /\biptables\s+-F\b/, msg: 'iptables -F flushes all firewall rules. Save with iptables-save first.' },
  { re: /\bufw\s+disable\b/, msg: 'Disabling the firewall exposes all ports. Consider per-port rules.' },
  { re: /\bsystemctl\s+(disable|stop)\b/, msg: 'Stopping/disabling a service may affect stability. Check dependents first.' },
  { re: /\bdocker\s+system\s+prune\s+-a\b/, msg: 'docker system prune -a removes ALL unused images. Consider without -a.' },
  { re: /\bdocker\s+volume\s+prune\b/, msg: 'docker volume prune deletes unused volumes and their data. Review with volume ls first.' },
  { re: /\bmkswap\b/, msg: 'mkswap reformats a partition as swap, destroying data. Verify the device.' },
  { re: /\bfdisk\b/, msg: 'fdisk modifies partition tables. Verify the device and back up first.' }
];

// H1: power-state change. Only a power verb in COMMAND POSITION asks; the same
// word as data (`grep halt f`, a branch name, a commit message) does not.
const POWER_CMD_RE = /^(shutdown|poweroff|reboot|halt|kexec)$/;   // WI-20 G10: kexec
// S1a/S1b: any argument of systemctl/loginctl, so leading flags
// (`systemctl --force reboot`, `-i`, `--no-wall`, `-H host`) cannot hide it.
const POWER_VERB_RE = /^(reboot|soft-reboot|poweroff|halt|kexec|suspend|hibernate|hybrid-sleep|suspend-then-hibernate)$/;
const POWER_TARGET_RE = /^((reboot|soft-reboot|poweroff|halt|kexec)\.target|runlevel[06](\.target)?)$/;   // WI-20 G10: runlevel0/6
// S1c: commands that run (part of) their own argv as a command. Every literal
// suffix of their argv is checked, and a quoted argument (the remote command
// of ssh) is tokenized and checked as a command line.
// H1/REV1: CPU/IO/scheduling, namespace, lock, user/group switch wrappers.
const ARGV_EXEC_CMDS = new Set(['xargs', 'busybox', 'toybox', 'ssh', 'chroot', 'nsenter', 'watch', 'parallel',
  'setpriv', 'runuser', 'unbuffer', 'strace', 'ltrace', 'flock', 'systemd-run', 'machinectl', 'firejail', 'script',
  'taskset', 'chrt', 'ionice', 'stdbuf', 'setsid', 'unshare', 'doas', 'su', 'sg', 'newgrp', 'nohup', 'nice',
  'timeout', 'env', 'exec', 'command',
  // H1/REV2: schedulers and terminal multiplexers run their argv later.
  'at', 'batch', 'tmux', 'screen']);
// H1/REV2: these consumers run what they read on stdin (or build a command
// line from it), so a power verb in the producer of the pipe asks.
const STDIN_EXEC_CMDS = new Set(['at', 'batch', 'xargs', 'parallel']);
function pipedPowerMessage(segments) {
  for (let i = 0; i < segments.length - 1; i++) {
    if (segments[i].op !== '|') continue;
    const c = commandPosition(segments[i + 1].argv);
    if (!c.length || !STDIN_EXEC_CMDS.has(basename(c[0].canon))) continue;
    for (const t of segments[i].argv) {
      for (const w of t.canon.split(/[\s;&|]+/)) {
        const b = basename(w);
        if (POWER_CMD_RE.test(b)) return POWER_MSG[b] || POWER_GENERIC;
        if (POWER_VERB_RE.test(b)) return POWER_GENERIC;
      }
    }
  }
  return null;
}
// H1/REV1: find runs the argv after -exec/-execdir/-ok/-okdir as a command.
const FIND_EXEC_FLAGS = new Set(['-exec', '-execdir', '-ok', '-okdir']);
const POWER_MSG = {
  shutdown: 'This will shut down the system. Verify this is the intended target machine. Consider shutdown -c to cancel if triggered accidentally.',
  poweroff: 'This will shut down the system (poweroff). Verify this is the intended target machine. Consider shutdown -c to cancel if triggered accidentally.',
  reboot: 'This will reboot the system. Verify this is the intended target machine and save all work first.',
  halt: 'halt stops the system immediately. Consider shutdown -h +1 to give users a 1-minute warning.'
};
const POWER_GENERIC = 'This affects system power state. Verify the target machine.';
// WI-8 REV2: the direct power checks on one resolved argv. The find -exec,
// wrapper-suffix and quoted-payload expansion now runs through the budgeted
// scanWrapped(), so a long wrapper chain asks fast instead of timing out.
function powerArgvMessage(r) {
  if (!r.length) return null;
  const c0 = basename(r[0].canon);
  if (POWER_CMD_RE.test(c0)) return POWER_MSG[c0] || POWER_GENERIC;
  const args = r.slice(1).map(t => t.canon);
  // WI-20 G10: logind over D-Bus, and a sysrq write through tee.
  if (/^(busctl|dbus-send|gdbus)$/.test(c0) && args.some(a => /login1/.test(a)) &&
      args.some(a => /(Reboot|PowerOff|Halt|KExec)/.test(a))) return POWER_GENERIC;
  if (c0 === 'tee' && args.includes('/proc/sysrq-trigger')) return POWER_GENERIC;
  if ((c0 === 'systemctl' || c0 === 'loginctl') && args.some(a => POWER_VERB_RE.test(a) || POWER_TARGET_RE.test(a))) return POWER_GENERIC;
  if ((c0 === 'init' || c0 === 'telinit') && /^[06]$/.test(args[0] || '')) return POWER_GENERIC;
  return null;
}
function powerStateMessage(r, depth) {
  return scanWrapped(r, depth, powerArgvMessage, { left: SCAN_STEP_LIMIT });
}

// H8/REV2: SQL keywords (DROP/TRUNCATE/DELETE) ask UNLESS every segment runs a
// read-only text tool. This is an ALLOWLIST: any other command (a DB client,
// a cloud CLI with --sql, an interpreter, a wrapper, a computed command name)
// keeps the ask. Each segment is judged after compound keywords, grouping
// tokens and transparent wrappers are removed. A command-substitution inner
// is a separate evaluation, so `$(psql ...)` is judged on its own.
// H8/REV3: awk, sed, sort, uniq, yq, find, diff, gh, less and more are out
// (each can run a command or write a file); git is limited to the
// subcommands in SQL_GIT_SUBCMDS.
const SQL_SAFE_CMDS = new Set(['grep', 'egrep', 'fgrep', 'rg', 'ag', 'ack', 'git', 'cat',
  'head', 'tail', 'echo', 'printf', 'cut', 'tr', 'wc', 'jq', 'ls', 'test', '[', 'true', 'false', 'cd']);
const SQL_GREP_CMDS = new Set(['grep', 'egrep', 'fgrep', 'rg', 'ag', 'ack']);
const SQL_GIT_SUBCMDS = new Set(['commit', 'log', 'show', 'grep', 'status', 'blame', 'worktree']);
const SQL_GIT_BAD_ARG = /^(-c|-x|-O.*|--exec.*|--open-files-in-pager.*|--upload-pack.*|--receive-pack.*|--ext-diff|--config-env.*|--output.*)$/;
const SQL_SAFE_TRAILERS = new Set(['done', 'fi', 'esac', ']']);
function sqlSegmentIsReadOnly(seg) {
  const a = stripGroupingTokens(skipLeadKeywords(seg.argv));
  if (!a.length) return true;
  if (a[0].varCount === 0 && a[0].substCount === 0 && SQL_SAFE_TRAILERS.has(a[0].canon)) return true;
  // `for NAME in words` : the word list is data
  if (a[0].canon === 'for' && a[0].varCount === 0 && a[0].substCount === 0) return true;
  const r = resolveEffectiveCommand(a);
  // H8/REV3: no assignment (GIT_*, PATH, EDITOR ...) and no wrapper prefix.
  if (!r.length || r.length !== a.length) return false;
  const t0 = r[0];
  if (!(t0.litLen > 0) || t0.varCount || t0.substCount) return false;
  const name = t0.canon;
  // a bare name or a system bin path; a local ./grep script is not trusted
  if (name.includes('/') && !/^\/(usr\/(local\/)?)?bin\/[^/]+$/.test(name)) return false;
  const cmd = basename(name);
  if (!SQL_SAFE_CMDS.has(cmd)) return false;
  const args = r.slice(1).map(t => t.canon);
  // H8/REV3: preprocessors and pagers run commands.
  if (SQL_GREP_CMDS.has(cmd) && args.some(v => /^--(pre|pager|open-files-in-pager)/.test(v) || /^-[A-Za-z]*O/.test(v))) return false;
  if (cmd === 'git') {
    if (!SQL_GIT_SUBCMDS.has(args[0])) return false;
    if (args[0] === 'worktree' && args[1] !== 'add') return false;
    if (args.some(v => SQL_GIT_BAD_ARG.test(v) || /^!/.test(v))) return false;
  }
  return true;
}
// H8/REV3: any output redirection other than to /dev/null or an fd dup
// (>&2) keeps the ask.
function sqlRedirectIsSafe(r) {
  if (!/>/.test(r.op)) return true;                 // < << <<< are input
  const t = r.target;
  if (!t || t.varCount || t.substCount) return false;
  if (r.op === '>&') return /^\d+$/.test(t.canon);
  return t.canon === '/dev/null';
}
function sqlIsReadOnlyText(segments, raw) {
  if (hasOpaqueContext(segments)) return false;   // WI-20 F3
  return segments.every(seg => sqlSegmentIsReadOnly(seg) && seg.redirects.every(sqlRedirectIsSafe));
}

// WI-20 F3: the inline text of contexts whose commands the argv checks may not
// see: the substitutions of an unquoted heredoc body, the ${...$(...)} inner,
// the <(...) / >(...) inner, the args of a command-position
// eval/trap/coproc/function/builtin, a herestring or heredoc fed to a shell or
// `source`/`.`, a command-position substitution, and the text written to a
// file that a shell or source then runs. `source FILE` / `. FILE` alone has no
// inline text. REV1: the belt regexes run on these texts only, never on the
// whole command, so `grep -E "halt|..." log; . ~/env` stays allow.
const OPAQUE_WORDS = new Set(['eval', 'trap', 'coproc', 'function', 'builtin']);
function opaqueInnerTexts(segments) {
  const out = [];
  const written = new Map();
  for (const seg of segments) {
    for (const hd of (seg.heredocs || [])) if (!hd.quoted && /\$\(|`/.test(hd.body)) out.push(...substInnersOf(hd.body));
    const toks = seg.argv.concat(seg.redirects.map(x => x.target).filter(Boolean));
    for (const t of toks) {
      if (t.procSubst) out.push(...t.substInners);
      if (t.paramInners) out.push(...t.paramInners);
    }
    const a = seg.argv;
    let k = 0;
    while (k < a.length && !a[k].varCount && !a[k].substCount && (LEAD_KEYWORDS.has(a[k].canon) || OPAQUE_WORDS.has(a[k].canon))) {
      if (OPAQUE_WORDS.has(a[k].canon)) { out.push(a.slice(k + 1).map(t => t.canon).join(' ')); break; }
      k++;
    }
    const r = commandPosition(a);
    if (r.length && isCmdSubstPosition(r[0])) out.push(...r[0].substInners);
    const c0 = r.length ? basename(r[0].canon) : '';
    // REV2 R3: an opaque word behind a wrapper or assignment (`command eval ...`)
    if (OPAQUE_WORDS.has(c0) && r.length < a.length) out.push(r.slice(1).map(t => t.canon).join(' '));
    if (SHELL_INTERPRETERS_EVAL.has(c0) || c0 === 'source' || c0 === '.' || OPAQUE_WORDS.has(c0)) {
      for (const x of seg.redirects) if (x.op === '<<<' && x.target) out.push(x.target.canon);
      for (const hd of (seg.heredocs || [])) out.push(hd.body);
      for (const t of r.slice(1)) if (written.has(t.canon)) out.push(written.get(t.canon));
    }
    for (const x of seg.redirects) {
      if (/>/.test(x.op) && x.target && x.target.litLen) {
        written.set(x.target.canon, a.map(t => t.canon).join(' ') + ' ' + (seg.heredocs || []).map(h => h.body).join('\n'));
      }
    }
  }
  return out.filter(Boolean);
}
function hasOpaqueContext(segments) { return opaqueInnerTexts(segments).length > 0; }
// The raw HITL checks bash-validator ran before K1/H1/H8 moved them onto argv.
const BELT_PATTERNS = [
  { re: /git push.*--force(?![\w-])/, msg: PUSH_FORCE_MSG },
  { re: /\b(shutdown|poweroff)\b/, msg: POWER_MSG.shutdown },
  { re: /\breboot\b/, msg: POWER_MSG.reboot },
  { re: /\bhalt\b/, msg: POWER_MSG.halt }
];
function opaqueBeltMessage(segments) {
  for (const text of opaqueInnerTexts(segments)) {
    for (const { re, msg } of BELT_PATTERNS) if (re.test(text)) return msg;
    for (const { re, msg, sql } of ASK_CANON) if (sql && re.test(text)) return msg;
  }
  return null;
}

// EVAL/REV2: true when the eval payload is only `NAME=<ref>` assignments
// and/or `echo|printf <ref>...` statements, where <ref> is a plain variable
// reference ($V, ${V}, ${!V}, optionally behind an escaped \$). Any command
// substitution, any other command, or any other text returns false.
const EVAL_REF = '(?:\\\\\\$)?(?:\\$[A-Za-z_][A-Za-z0-9_]*|\\$\\{!?[A-Za-z_][A-Za-z0-9_]*\\})';
const EVAL_ASSIGN_RE = new RegExp('^[A-Za-z_][A-Za-z0-9_]*=(?:' + EVAL_REF + ')+$');
const EVAL_ECHO_RE = new RegExp('^(?:echo|printf)(?:\\s+-[neE]+)*(?:\\s+(?:' + EVAL_REF + ')+)+$');
function evalIsIndirectRead(rest, command) {
  if (typeof command !== 'string' || rest.some(t => t.substCount > 0)) return false;
  const words = [];
  for (const t of rest) {
    if (typeof t.start !== 'number' || typeof t.end !== 'number') return false;
    let w = command.slice(t.start, t.end);
    const m = /^"([^"]*)"$/.exec(w);
    if (m) w = m[1];
    if (/["'`]|\$\(/.test(w)) return false;
    words.push(w);
  }
  const parts = words.join(' ').split(/\s*;\s*/).filter(Boolean);
  return parts.length > 0 && parts.every(p => EVAL_ASSIGN_RE.test(p) || EVAL_ECHO_RE.test(p));
}

// ── brace expansion (WI-17) ─────────────────────────────────────────────────
// The tokenizer keeps `{a,b}` as literal text, so `rm -rf /{etc,}`,
// `rm -r{f,} /etc`, `chmod -R 7{7,}7 /` and `{r,}m -rf /etc` reached the
// structured checks with a canon that names no protected path or flag. Bash
// expands those words before exec. braceExpandWord() does the same expansion
// for a plain word (comma lists, nested), and braceVerdict() re-judges the
// segment with the expanded words. A sequence ({1..3}) or a brace in a quoted
// or $-word cannot be expanded here, so that word fails closed to ask when the
// segment can delete or change files.
const BRACE_SIMPLE_WORD_RE = /^[A-Za-z0-9_\/.,{}~+=:@%^*?\[\]!#-]+$/;
const BRACE_MAX_WORDS = 256;
// WI-17 round 2 (F2): bound the work BEFORE and DURING expansion. Empty
// alternatives are dropped from the output, so `{,}` x 26 never grows the
// output past BRACE_MAX_WORDS, yet it makes 2^26 recursive calls and the 5 s
// hook timeout fails open. braceRawProduct() counts the alternatives product
// (empties included) without expanding, and every braceExpandWord() call
// spends one step of a budget shared by the whole segment. Over either cap
// the word is not expanded, and braceVerdict() fails closed to ask.
const BRACE_MAX_PRODUCT = 4096;
const BRACE_MAX_STEPS = 8192;
const BRACE_MAX_GROUPS = 32;
// Product of the alternatives in every comma group of a word, empties counted.
// Nested groups multiply (an over-estimate for `{a,{b,c}}`, which is the safe
// direction). Returns Infinity past a cap so the caller never multiplies on.
function braceRawProduct(w) {
  let product = 1;
  let groups = 0;
  const stack = [];
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    if (c === '{') stack.push(1);
    else if (c === ',' && stack.length) stack[stack.length - 1]++;
    else if (c === '}' && stack.length) {
      const n = stack.pop();
      if (n > 1) {
        groups++;
        product *= n;
        if (product > BRACE_MAX_PRODUCT || groups > BRACE_MAX_GROUPS) return Infinity;
      }
    }
  }
  return product;
}
const BRACE_FAILCLOSED_CMDS = /^(rm|rmdir|shred|unlink|srm|wipe|find|chmod|chown|chgrp|dd|sed|install|tar|cp|mv|tee|truncate|ln|xargs|env|sudo|doas|nice|nohup|timeout|command|exec|builtin)$/;
function braceExpandWord(w, budget) {
  if (!budget) budget = { steps: 0 };
  if (++budget.steps > BRACE_MAX_STEPS) return null;
  for (let i = 0; i < w.length; i++) {
    if (w[i] !== '{') continue;
    let depth = 0;
    const commas = [];
    let j = i;
    for (; j < w.length; j++) {
      const c = w[j];
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) break; }
      else if (c === ',' && depth === 1) commas.push(j);
    }
    if (j >= w.length) return [w];           // unmatched '{' is literal in bash
    if (commas.length === 0) {
      if (w.slice(i + 1, j).includes('..')) return null; // {1..3}: not expanded here
      continue;                              // `{}` / `{x}` is literal; nested lists may follow
    }
    const pre = w.slice(0, i);
    const post = w.slice(j + 1);
    const out = [];
    let s = i + 1;
    for (const c of [...commas, j]) {
      const sub = braceExpandWord(pre + w.slice(s, c) + post, budget);
      if (!sub) return null;
      out.push(...sub);
      if (out.length > BRACE_MAX_WORDS) return null;
      s = c + 1;
    }
    return out.filter(x => x !== '');        // bash drops a word that expands to empty
  }
  return [w];
}
// WI-17 round 2 (F1): an expanded word is a literal in bash, but braceVerdict
// re-judges the words as shell text. A word that starts with `#` (from
// `{#,/}`) would then open a comment and hide every later word, so
// `rm -rf {#,/}` allowed. Single-quote such a word (and a leading `{`, `}`
// or `!`, which the re-join could read as a reserved word) before the
// re-join. BRACE_SIMPLE_WORD_RE admits no quote, so the quoting is exact.
function braceQuoteWord(x) {
  return /^[#{}!]/.test(x) ? "'" + x + "'" : x;
}
// Returns a verdict for the segment's argv after brace expansion, or null
// when no word holds a brace expansion.
function braceVerdict(argv, depth) {
  let changed = false;
  let unsupported = false;
  let overBudget = false;
  const budget = { steps: 0 };
  const words = [];
  for (const t of argv) {
    const raw = typeof t.raw === 'string' ? t.raw : t.canon;
    if (!raw || !raw.includes('{') || !(raw.includes(',') || raw.includes('..'))) { words.push(raw); continue; }
    if (!BRACE_SIMPLE_WORD_RE.test(raw)) { unsupported = true; words.push(raw); continue; }
    // F2: a word whose raw alternatives product (or the shared step budget)
    // is over the cap is never expanded. That ask holds for any command, not
    // only the BRACE_FAILCLOSED_CMDS list: the size itself is the signal.
    if (braceRawProduct(raw) > BRACE_MAX_PRODUCT) { overBudget = true; break; }
    const exp = braceExpandWord(raw, budget);
    if (!exp) {
      if (budget.steps > BRACE_MAX_STEPS) { overBudget = true; break; }
      unsupported = true; words.push(raw); continue;
    }
    if (exp.length !== 1 || exp[0] !== raw) changed = true;
    words.push(...exp.map(braceQuoteWord));
  }
  if (overBudget) {
    return A('A word in this command uses brace expansion ({a,b}) that expands past the guard limit. Write the words out in full, or confirm.');
  }
  if (unsupported) {
    // WI-17 round 3 (N1): judge the resolved command too. A leading
    // assignment or a wrapper (stdbuf, ionice, setsid, ...) puts the real
    // command in a later word, so `X=1 rm -rf {\#,/etc}` and
    // `stdbuf -oL rm -rf {"#",/usr}` allowed on the raw argv[0]. Fail closed
    // when any word up to and including the resolved command holds `{`, or
    // when the raw or the resolved command is on the fail-closed list.
    const wordOf = t => (t ? String(t.raw || t.canon || '') : '');
    const isFailClosed = t => !!t && (BRACE_FAILCLOSED_CMDS.test(basename(wordOf(t))) ||
      BRACE_FAILCLOSED_CMDS.test(basename(String(t.canon || ''))));
    const rargv = resolveEffectiveCommand(argv);
    const lead = argv.slice(0, argv.length - rargv.length + (rargv.length ? 1 : 0));
    if (lead.some(t => wordOf(t).includes('{')) || isFailClosed(argv[0]) || isFailClosed(rargv[0])) {
      return A('A word in this command uses brace expansion ({a,b} or {1..3}) that the guard cannot expand. The expanded words can name a protected path or flag. Write the words out in full, or confirm.');
    }
    return null;
  }
  if (!changed || depth >= MAX_RECURSION) return null;
  const inner = evaluateInternal(words.join(' '), depth + 1);
  if (inner && inner.kind === 'deny') return D((inner.reason || 'blocked destructive command') + ' (after brace expansion)');
  if (inner && inner.kind === 'ask') return A((inner.reason || 'requires confirmation') + ' (after brace expansion)');
  return null;
}

// FU-12 (v12.77.0): the guard's own config. FU-4 lets the settings key
// cagents.bash_guard turn asks off, and a write to a hook file can remove the
// deny floor. A Bash command that can write .claude/settings*.json,
// .claude/hooks.json or a file under .claude/hooks/ asks, in every mode.
const GUARD_CFG_RE = /\.claude[\\/]+(settings(\.local)?\.json|hooks\.json|hooks[\\/])/;
const GUARD_CFG_MSG = 'This command can change the bash guard configuration (.claude/settings*.json, .claude/hooks.json or .claude/hooks/). CAGENTS_BASH_GUARD=off does not waive this ask. Edit the file with the Edit tool, or confirm the change.';
const CFG_READ_CMDS = new Set(['cat', 'head', 'tail', 'grep', 'egrep', 'fgrep', 'rg', 'ls', 'wc', 'stat', 'file',
  'diff', 'jq', 'less', 'more', 'md5sum', 'sha1sum', 'sha256sum', 'echo', 'test', '[', 'realpath', 'readlink',
  'dirname', 'basename', 'cmp', 'od', 'xxd', 'hexdump', 'awk', 'sed', 'node', 'nodejs', 'git', 'npx', 'npm', 'yq',
  'find', 'tree', 'du', 'cd', 'pushd', 'popd']);
const CFG_GIT_WRITE = new Set(['checkout', 'restore', 'reset', 'stash', 'apply', 'am', 'mv', 'rm', 'pull', 'merge', 'rebase', 'cherry-pick', 'revert', 'switch', 'clean']);
const CFG_FIND_WRITE_RE = /^-(delete|exec|execdir|ok|okdir|fprint|fprint0|fprintf|fls)$/;
const CFG_GIT_OPT_ARG = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env']);
const CFG_SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'mksh', 'ash', 'busybox']);
const GUARD_CFG_RE_I = new RegExp(GUARD_CFG_RE.source, 'i');
// WI-01 (v12.78.0): the guard matches the canonical write target, not the raw
// text. A word is lexed into path components. Quotes and backslashes are
// removed, the text is lower case, and `.` and `..` are resolved. A literal
// cd or pushd in an earlier segment sets the base of a relative path. A
// variable that the command assigns expands to each assigned value. A glob
// stays a pattern, and the match is a pattern intersection. The guard cannot
// resolve some words: a computed value, a brace list in a list, or an unknown
// substitution that names the config. Each such word counts as a match, so the
// guard asks. The `c` atom and the `?` atom are one char each. The `*` atom is
// a glob run. The `S` atom is an unknown run without a slash. The `cls` atom
// is a bracket class, and the `ph` atom is an environment value. The `W` atom
// is any text. A W atom always counts as a match.
const CFG_MAX_ALTS = 32;
const CFG_MAX_DEPTH = 4;
// WI-01 r1: the work of one check is bounded. A cd base with more than
// CFG_MAX_CWD_COMPS components is an unknown cwd. One unit of CFG_STEP_BUDGET
// pays for each step of a scan, for each char of a lex and for each step of a
// pattern. When the budget is spent the
// check stops and asks: a PreToolUse hook that times out does not block.
const CFG_MAX_CWD_COMPS = 64;
const CFG_STEP_BUDGET = 2000000;
const CFG_BUDGET_SPENT = new Error('cfg step budget spent');
let cfgBudget = null;
function cfgSpend(n) {
  if (cfgBudget === null) return;
  cfgBudget.left -= n;
  if (cfgBudget.left < 0) throw CFG_BUDGET_SPENT;
}
function cfgAtoms(text) { return Array.from(String(text)).map(ch => (ch === '/' ? { t: '/' } : { t: 'c', ch: ch.toLowerCase() })); }
const CFG_T_CLAUDE = cfgAtoms('.claude');
const CFG_T_SETTINGS = cfgAtoms('settings').concat([{ t: '*' }], cfgAtoms('.json'));
const CFG_T_HOOKSJSON = cfgAtoms('hooks.json');
const CFG_T_HOOKS = cfgAtoms('hooks');
// The value of a variable for each name that the command binds:
// { vals: [raw text], wild: bool }. A name that the command does not bind
// is an environment value.
function cfgVarCtx(segments, raw) {
  const vars = new Map();
  const counts = new Map();
  const get = n => { if (!vars.has(n)) { vars.set(n, { vals: [], wild: false }); counts.set(n, 0); } return vars.get(n); };
  for (const seg of segments) {
    const argv = seg.argv || [];
    if (argv.length >= 3 && argv[0].canon === 'for' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(argv[1].canon) && argv[2].canon === 'in') {
      const e = get(argv[1].canon);
      counts.set(argv[1].canon, counts.get(argv[1].canon) + 1);
      for (const t of argv.slice(3)) e.vals.push(String(t.raw || ''));
      continue;
    }
    for (const t of argv) {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)(\+?)=([\s\S]*)$/.exec(String(t.raw || ''));
      if (!m) continue;
      const e = get(m[1]);
      counts.set(m[1], counts.get(m[1]) + 1);
      if (m[2]) e.wild = true; else e.vals.push(m[3]);
    }
  }
  const src = String(raw || '');
  for (const [name, e] of vars) if (cfgBareMentions(src, name) > counts.get(name)) e.wild = true;
  return { vars, raw: src, dotglob: /dotglob|GLOBIGNORE/.test(src) };
}
// The same count as `bareMentions`. A `${NAME[..]}`, `${#NAME}`, `${NAME:-..}`
// or `${!NAME}` use is not a mention either.
function cfgBareMentions(raw, name) {
  cfgSpend(1 + (String(raw).length >> 3));
  const stripped = String(raw).replace(new RegExp('\\$\\{[#!]?' + name + '(?![A-Za-z0-9_])', 'g'), '')
    .replace(new RegExp('\\$' + name + '(?![A-Za-z0-9_])', 'g'), '');
  const m = stripped.match(new RegExp('(?<![A-Za-z0-9_])' + name + '(?![A-Za-z0-9_])', 'g'));
  return m ? m.length : 0;
}
// A `$NAME` inside the value of NAME (PATH=/x:$PATH) is the earlier value,
// which is an environment value.
function cfgVarAlts(name, ctx, depth) {
  const e = ctx.vars.get(name);
  if (!e) {
    ctx.bare = ctx.bare || new Map();
    if (!ctx.bare.has(name)) ctx.bare.set(name, cfgBareMentions(ctx.raw, name) > 0);
    return ctx.bare.get(name) ? null : [[{ t: 'ph' }]];
  }
  ctx.open = ctx.open || new Set();
  if (ctx.open.has(name)) return [[{ t: 'ph' }]];
  if (e.wild || depth >= CFG_MAX_DEPTH) return null;
  const out = [];
  ctx.open.add(name);
  try {
    for (const v of e.vals) {
      const a = cfgLex(v, ctx, depth + 1);
      if (a === null) return null;
      out.push(...a);
      if (out.length > CFG_MAX_ALTS) return null;
    }
  } finally { ctx.open.delete(name); }
  return out.length ? out : [[]];
}
// The end index of the balanced group that opens at raw[i] (`(` or `{`), or -1.
function cfgGroupEnd(raw, i) {
  const open = raw[i];
  const close = open === '(' ? ')' : '}';
  let d = 0;
  let q = null;
  for (let k = i; k < raw.length; k++) {
    cfgSpend(1);
    const ch = raw[k];
    if (q) { if (ch === q) q = null; else if (ch === '\\' && q === '"') k++; continue; }
    if (ch === '\\') { k++; continue; }
    if (ch === "'" || ch === '"') { q = ch; continue; }
    if (ch === open) d++;
    else if (ch === close && --d === 0) return k;
  }
  return -1;
}
// A substitution with an output that cannot name the config is an unknown run
// without a slash. Any sign of a computed path gives W.
function cfgSubstAlts(inner) {
  const s = String(inner || '');
  if (/^\s*(pwd|mktemp(\s[^`$;&|()<>]*)?)\s*$/.test(s)) return [[{ t: 'ph' }]];
  const flat = s.replace(/["'\\]/g, '');
  if (/claude|hooks|settings|[$`*?[{]|\\[0-7x]/i.test(flat) || /\\/.test(s)) return null;
  return [[{ t: 'S' }]];
}
function cfgAnsiC(body) {
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch !== '\\') { out += ch; continue; }
    const n = body[i + 1];
    let m;
    if ((m = /^x([0-9A-Fa-f]{1,2})/.exec(body.slice(i + 1)))) { out += String.fromCharCode(parseInt(m[1], 16)); i += m[0].length; continue; }
    if ((m = /^([0-7]{1,3})/.exec(body.slice(i + 1)))) { out += String.fromCharCode(parseInt(m[1], 8)); i += m[0].length; continue; }
    if (n === undefined || /[uUc]/.test(n)) return null;
    out += ({ n: '\n', t: '\t', r: '\r', a: '\x07', b: '\b', e: '\x1b', E: '\x1b', f: '\f', v: '\v' })[n] || n;
    i++;
  }
  return out;
}
// Lex one shell word into path alternatives: each one is a list of atoms and
// slash items. Returns null when the word can be any path.
function cfgLex(raw, ctx, depth) {
  raw = String(raw || '');
  cfgSpend(1 + raw.length);
  let alts = [[]];
  const push = it => { for (const a of alts) a.push(it); };
  const pushAlts = sub => {
    if (sub === null) return false;
    const out = [];
    for (const a of alts) for (const s of sub) out.push(a.concat(s));
    if (out.length > CFG_MAX_ALTS) return false;
    alts = out;
    return true;
  };
  const lit = text => { for (const it of cfgAtoms(text)) push(it); };
  let i = 0;
  let dq = false;
  while (i < raw.length) {
    const ch = raw[i];
    if (!dq) {
      if (ch === "'") { const j = raw.indexOf("'", i + 1); if (j < 0) return null; lit(raw.slice(i + 1, j)); i = j + 1; continue; }
      if (ch === '"') { dq = true; i++; continue; }
      if (ch === '\\') { if (i + 1 < raw.length) lit(raw[i + 1]); i += 2; continue; }
      if (ch === '$' && raw[i + 1] === "'") {
        const j = raw.indexOf("'", i + 2);
        if (j < 0) return null;
        const v = cfgAnsiC(raw.slice(i + 2, j));
        if (v === null) return null;
        lit(v); i = j + 1; continue;
      }
      if (ch === '*') { if (raw[i + 1] === '*') { push({ t: 'W' }); i += 2; } else { push({ t: '*' }); i++; } continue; }
      if (ch === '?') { push({ t: '?' }); i++; continue; }
      if (ch === '[') {
        const j = raw.indexOf(']', i + 2);
        if (j > 0 && !/[/'"\\]/.test(raw.slice(i + 1, j))) { push({ t: 'cls', body: raw.slice(i + 1, j).toLowerCase() }); i = j + 1; continue; }
        lit(ch); i++; continue;
      }
      if (ch === '{') {
        const j = cfgGroupEnd(raw, i);
        const body = j > 0 ? raw.slice(i + 1, j) : '';
        if (j > 0 && /^[^{}]*\.\.[^{}]*$/.test(body) && !body.includes(',')) { push({ t: '*' }); i = j + 1; continue; }
        if (j > 0 && body.includes(',')) {
          if (/[{}]/.test(body) || depth >= CFG_MAX_DEPTH) return null;
          const sub = [];
          for (const part of body.split(',')) {
            const a = cfgLex(part, ctx, depth + 1);
            if (a === null) return null;
            sub.push(...a);
          }
          if (!pushAlts(sub)) return null;
          i = j + 1; continue;
        }
      }
    } else {
      if (ch === '"') { dq = false; i++; continue; }
      if (ch === '\\' && i + 1 < raw.length && /["\\$`\n]/.test(raw[i + 1])) { lit(raw[i + 1]); i += 2; continue; }
    }
    if (ch === '`') {
      const j = raw.indexOf('`', i + 1);
      if (j < 0 || !pushAlts(cfgSubstAlts(raw.slice(i + 1, j)))) return null;
      i = j + 1; continue;
    }
    if (ch === '$') {
      const n = raw[i + 1] || '';
      if (n === '(' && raw[i + 2] === '(') {
        const j = cfgGroupEnd(raw, i + 1);
        if (j < 0) return null;
        push({ t: '*' }); i = j + 1; continue;
      }
      if (n === '(') {
        const j = cfgGroupEnd(raw, i + 1);
        if (j < 0 || !pushAlts(cfgSubstAlts(raw.slice(i + 2, j)))) return null;
        i = j + 1; continue;
      }
      if (n === '{') {
        const j = cfgGroupEnd(raw, i + 1);
        if (j < 0) return null;
        const body = raw.slice(i + 2, j);
        const pm = /^([A-Za-z_][A-Za-z0-9_]*)(\[[^\]]*\])?(?:(:?[-=+?])([\s\S]*)|([#%/^,][\s\S]*))?$/.exec(body);
        if (/^([0-9]+|[@*#?$!-])$/.test(body) || /^#[A-Za-z_][A-Za-z0-9_]*(\[[^\]]*\])?$/.test(body)) push({ t: 'ph' });
        else if (pm && pm[5] !== undefined) {
          // For ${X#p} ${X%p} ${X/a/b}: a trim of an environment value stays one.
          const v = cfgVarAlts(pm[1], ctx, depth);
          if (!v || !v.every(a => a.length === 1 && a[0].t === 'ph')) return null;
          push({ t: 'ph' });
        } else if (pm) {
          // For ${X:-word} and the other default forms: the value of X, or word.
          let v = cfgVarAlts(pm[1], ctx, depth);
          if (v && pm[3] !== undefined && !/\+/.test(pm[3])) {
            const w = cfgLex(pm[4], ctx, depth + 1);
            v = w === null ? null : v.concat(w);
          } else if (v && pm[3] !== undefined) {
            const w = cfgLex(pm[4], ctx, depth + 1);
            v = w === null ? null : w.concat([[]]);
          }
          if (!pushAlts(v)) return null;
        } else return null;
        i = j + 1; continue;
      }
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(raw.slice(i + 1));
      if (m) { if (!pushAlts(cfgVarAlts(m[0], ctx, depth))) return null; i += 1 + m[0].length; continue; }
      if (/^[0-9@*#?$!-]$/.test(n)) { push({ t: 'ph' }); i += 2; continue; }
    }
    lit(ch); i++;
  }
  if (dq) return null;
  return alts;
}
function cfgIsRun(a) { return a.t === '*' || a.t === 'S'; }
function cfgClassHas(body, ch) {
  let neg = false;
  let b = body;
  if (b[0] === '!' || b[0] === '^') { neg = true; b = b.slice(1); }
  let hit = false;
  for (let k = 0; k < b.length; k++) {
    if (b[k + 1] === '-' && k + 2 < b.length) { if (ch >= b[k] && ch <= b[k + 2]) hit = true; k += 2; } else if (b[k] === ch) hit = true;
  }
  return neg ? !hit : hit;
}
function cfgCharMeet(x, y) {
  if (x.t === 'c') return x.ch === y.ch;
  if (x.t === '?') return true;
  if (x.t === 'cls') return cfgClassHas(x.body, y.ch);
  return false;
}
// True when the pattern a of a word component and the pattern b of a config
// name can match one name. A leading glob does not match a leading dot (no dotglob).
function cfgMeet(a, b, dotglob) {
  // An S run is the output of a substitution whose text does not name the
  // config. Thus it does not supply the leading dot of .claude either.
  if (b.length && b[0].t === 'c' && b[0].ch === '.' && a.length && (a[0].t === 'S' || (!dotglob && ['*', '?', 'cls'].includes(a[0].t)))) return false;
  cfgSpend(1);
  // A literal component meets a pattern only when the lengths fit.
  if (a.every(x => x.t === 'c')) {
    let need = 0;
    let runs = false;
    for (const x of b) { if (cfgIsRun(x)) runs = true; else need++; }
    if (need > a.length || (!runs && need !== a.length)) return false;
  }
  const memo = new Map();
  const go = (i, j) => {
    const key = i + ',' + j;
    if (memo.has(key)) return memo.get(key);
    cfgSpend(1);
    memo.set(key, false);
    let r = i === a.length && j === b.length;
    if (!r && i < a.length && cfgIsRun(a[i])) r = go(i + 1, j) || (j < b.length && go(i, j + 1));
    if (!r && j < b.length && cfgIsRun(b[j])) r = go(i, j + 1) || (i < a.length && go(i + 1, j));
    if (!r && i < a.length && j < b.length && !cfgIsRun(a[i]) && !cfgIsRun(b[j]) && cfgCharMeet(a[i], b[j])) r = go(i + 1, j + 1);
    memo.set(key, r);
    return r;
  };
  return go(0, 0);
}
// Split an alternative into components, then apply path.posix.normalize rules.
function cfgComponents(items) {
  cfgSpend(1 + items.length);
  const comps = [];
  let cur = [];
  for (const it of items.concat([{ t: '/' }])) {
    if (it.t !== '/') { cur.push(it); continue; }
    const s = cur.every(x => x.t === 'c') ? cur.map(x => x.ch).join('') : null;
    if (cur.length && s !== '.') {
      if (s === '..' && comps.length && comps[comps.length - 1].s !== '..') comps.pop();
      else comps.push({ atoms: cur, s });
    }
    cur = [];
  }
  return comps.map(c => c.atoms);
}
function cfgCompsHit(comps, dotglob) {
  for (let i = 0; i < comps.length; i++) {
    if (!cfgMeet(comps[i], CFG_T_CLAUDE, dotglob)) continue;
    const tail = comps.slice(i + 1);
    if (!tail.length) return true;
    if (tail.length === 1 && [CFG_T_SETTINGS, CFG_T_HOOKSJSON, CFG_T_HOOKS].some(t => cfgMeet(tail[0], t, dotglob))) return true;
    if (tail.length >= 2 && cfgMeet(tail[0], CFG_T_HOOKS, dotglob)) return true;
  }
  return false;
}
// True when the word can name a config path, after the cwd base. A config path
// is `.claude`, `.claude/hooks`, `.claude/settings*.json`, `.claude/hooks.json`
// or a path under `.claude/hooks/`.
// With wHit false, a word that can be any path (W) is not a hit. An assignment
// value uses this, because the assignment writes no file. A later use of the
// variable is judged on its own.
function cfgWordHits(raw, ctx, cwd, useCwd, wHit) {
  wHit = wHit !== false;
  const alts = cfgLex(raw, ctx, 0);
  if (alts === null) return wHit;
  for (const alt of alts) {
    if (alt.some(x => x.t === 'W')) { if (wHit) return true; continue; }
    const first = alt[0];
    const rel = useCwd && !(first && (first.t === '/' || first.t === 'ph' || (first.t === 'c' && first.ch === '~')));
    const bases = rel ? cwd : [[]];
    if (bases === null) { if (wHit) return true; continue; }
    if (bases === CFG_CWD_SOFT) { if (cfgSoftHit(alt, ctx)) return true; continue; }
    for (const b of bases) {
      const items = b.length ? b.concat([{ t: '/' }], alt) : alt;
      if (items.some(x => x.t === 'W')) { if (wHit) return true; continue; }
      if (cfgCompsHit(cfgComponents(items), ctx.dotglob)) return true;
      const flat = items.map(x => (x.t === '/' ? '/' : x.t === 'c' ? x.ch : '')).join('');
      if (GUARD_CFG_RE_I.test(flat)) return true;
    }
  }
  return false;
}
function tokenMentionsCfg(t, ctx, cwd, useCwd) {
  const raw = String(t.raw || '');
  if (GUARD_CFG_RE_I.test(raw) || GUARD_CFG_RE_I.test(String(t.canon || '')) ||
    (t.substInners || []).some(x => GUARD_CFG_RE_I.test(String(x)))) return true;
  if (!ctx) return false;
  if (t.procSubst) return false;
  const am = /^([A-Za-z_][A-Za-z0-9_]*)\+?=/.exec(raw);
  if (am) return cfgWordHits(raw.slice(am[0].length), ctx, cwd, useCwd, false);
  if (cfgWordHits(raw, ctx, cwd, useCwd)) return true;
  const eq = raw.indexOf('=');
  if (eq > 0 && !/["'$`\\]/.test(raw.slice(0, eq)) && cfgWordHits(raw.slice(eq + 1), ctx, cwd, useCwd)) return true;
  return false;
}
// The new cwd base after a cd or pushd segment, or the old one.
// WI-01 r2: a cd state that is not tracked exactly gives the soft unknown cwd
// (CFG_CWD_SOFT). The cwd can then be any dir, .claude/hooks too. This covers
// eval, source and `.`, because their text can run a cd. It also covers a
// computed command word, `cd -`, OLDPWD/PWD/DIRSTACK and the `~-` / `~+N` /
// `~N` targets. It also covers bare pushd, pushd/popd with arguments, and popd
// on an empty stack. It also covers a relative cd when the command text
// mentions CDPATH. Under CFG_CWD_SOFT, a relative word is a hit only when it
// is config-shaped (see cfgSoftHit). Thus an ordinary command such as
// `source .venv/bin/activate && pytest tests/` still allows.
const CFG_CWD_SOFT = 'soft-unknown-cwd';
const CFG_CWD_UNKNOWN_CMDS = new Set(['eval', 'source', '.']);
const CFG_CWD_VAR_RE = /OLDPWD|(?<![A-Za-z0-9_])PWD(?![A-Za-z0-9_])|DIRSTACK/;
const CFG_CWD_TILDE_RE = /^~(?:[+-]|\d)/;
// Commands that write files into the cwd with no path word for the file.
const CFG_CWD_IMPLICIT_WRITERS = new Set(['tar', 'bsdtar', 'gtar', 'unzip', 'cpio', 'patch', '7z', '7za', 'ar', 'pax', 'busybox']);
// The kinds of file that .claude/hooks holds, as glob patterns.
// A hook file that a hook registration can load: a direct child *.cjs.
const CFG_T_HOOK_CJS = [{ t: '*' }].concat(cfgAtoms('.cjs'));
const CFG_T_ZZ = cfgAtoms('zz');
// True when the normalized parts can name .claude, .claude/settings*.json,
// .claude/hooks.json, .claude/hooks or a direct *.cjs child of .claude/hooks.
function cfgSoftCompsHit(comps, dotglob) {
  for (let i = 0; i < comps.length; i++) {
    if (!cfgMeet(comps[i], CFG_T_CLAUDE, dotglob)) continue;
    const tail = comps.slice(i + 1);
    if (!tail.length) return true;
    if (tail.length === 1 && [CFG_T_SETTINGS, CFG_T_HOOKSJSON, CFG_T_HOOKS].some(t => cfgMeet(tail[0], t, dotglob))) return true;
    if (tail.length === 2 && cfgMeet(tail[0], CFG_T_HOOKS, dotglob) && cfgMeet(tail[1], CFG_T_HOOK_CJS, dotglob)) return true;
  }
  return false;
}
// True when a relative word can name a config target from a soft unknown
// cwd. The word is tried from the project root, from .claude, from
// .claude/hooks and from one dir below .claude/hooks for each `..` part.
// From .claude/hooks, `.`, `*` and `x.cjs` are hits, but `src/a.cjs`,
// `notes.txt` and `../x.py` are not.
function cfgSoftHit(alt, ctx) {
  if (alt.some(x => x.t === 'W')) return true;
  for (const b of [[], CFG_T_CLAUDE]) {
    const items = b.length ? b.concat([{ t: '/' }], alt) : alt;
    if (cfgCompsHit(cfgComponents(items), ctx.dotglob)) return true;
    const flat = items.map(x => (x.t === '/' ? '/' : x.t === 'c' ? x.ch : '')).join('');
    if (GUARD_CFG_RE_I.test(flat)) return true;
  }
  let ups = 0;
  let part = '';
  let lit = true;
  for (const x of alt.concat([{ t: '/' }])) {
    if (x.t !== '/') { if (x.t === 'c') part += x.ch; else lit = false; continue; }
    if (lit && part === '..') ups++;
    part = '';
    lit = true;
  }
  // A cwd deeper than the cap is not tried: so many `..` parts ask.
  if (ups > CFG_MAX_CWD_COMPS) return true;
  let hb = CFG_T_CLAUDE.concat([{ t: '/' }], CFG_T_HOOKS);
  for (let n = 0; n <= ups; n++) {
    if (cfgSoftCompsHit(cfgComponents(hb.concat([{ t: '/' }], alt)), ctx.dotglob)) return true;
    hb = hb.concat([{ t: '/' }], CFG_T_ZZ);
  }
  return false;
}
function cfgNextCwd(cp, ctx, cwd, stack) {
  // An assignment word is not the command (`a=$(wc -l < f)`).
  let k = 0;
  while (k < cp.length && /^[A-Za-z_][A-Za-z0-9_]*\+?=/.test(String(cp[k].raw || ''))) k++;
  if (k) cp = cp.slice(k);
  if (cp.length && (cp[0].varCount || cp[0].substCount)) return CFG_CWD_SOFT;
  const c0 = cp.length ? basename(cp[0].canon) : '';
  if (CFG_CWD_UNKNOWN_CMDS.has(c0)) return CFG_CWD_SOFT;
  if (c0 === 'popd') return stack.length && cp.length === 1 ? stack.pop() : CFG_CWD_SOFT;
  if (c0 !== 'cd' && c0 !== 'pushd') return cwd;
  // WI-01 r1: options end at the first `--`, which is not the target.
  const rest = cp.slice(1);
  const args = [];
  let opts = true;
  for (const t of rest) {
    const r = String(t.raw || '');
    if (opts && r === '--') { opts = false; continue; }
    if (opts && r !== '-' && /^-[LPe@]*$/.test(r)) continue;
    opts = false;
    args.push(t);
  }
  const t = args[0];
  if (c0 === 'pushd') stack.push(cwd);
  if (!t) return c0 === 'pushd' ? CFG_CWD_SOFT : [[{ t: 'ph' }]];
  const tr = String(t.raw || '');
  const tc = String(t.canon || '');
  if (tc === '-' || tr === '-' || CFG_CWD_VAR_RE.test(tr) || CFG_CWD_TILDE_RE.test(tr)) return CFG_CWD_SOFT;
  if (c0 === 'pushd' && /^[+-]\d/.test(tc)) return CFG_CWD_SOFT;
  if (!/^[/.~]/.test(tc) && /CDPATH/.test(String(ctx.raw || '').replace(/["'\\]/g, ''))) return CFG_CWD_SOFT;
  const alts = cfgLex(tr, ctx, 0);
  if (alts === null || alts.some(a => a.some(x => x.t === 'W'))) return null;
  const out = [];
  for (const a of alts) {
    const f = a[0];
    const abs = f && (f.t === '/' || f.t === 'ph' || (f.t === 'c' && f.ch === '~'));
    // A relative cd from an unknown cwd gives an unknown cwd.
    if (!abs && cwd === null) return null;
    if (!abs && cwd === CFG_CWD_SOFT) return CFG_CWD_SOFT;
    if (abs) { out.push(cfgTrimBase(a, ctx)); continue; }
    for (const b of cwd) out.push(cfgTrimBase(b.length ? b.concat([{ t: '/' }], a) : a, ctx));
    if (out.length > CFG_MAX_ALTS) return null;
  }
  if (out.some(b => b === null)) return null;
  return out.length > CFG_MAX_ALTS ? null : out;
}
// WI-01 r1: a cd base in a short form. The base is normalized, and the
// components before the first one that can name .claude are dropped. Those
// components cannot make a hit: a `..` in a later word only removes
// components. A base with no such component is the empty base. A base that
// stays longer than CFG_MAX_CWD_COMPS components is unknown (null).
function cfgTrimBase(items, ctx) {
  const comps = cfgComponents(items);
  let k = 0;
  while (k < comps.length) {
    const c = comps[k];
    const flat = c.map(x => (x.t === 'c' ? x.ch : '')).join('');
    if (flat.includes('.claude') || cfgMeet(c, CFG_T_CLAUDE, ctx.dotglob)) break;
    k++;
  }
  const keep = comps.slice(k);
  if (keep.length > CFG_MAX_CWD_COMPS) return null;
  const out = [];
  keep.forEach((c, n) => { if (n) out.push({ t: '/' }); out.push(...c); });
  return out;
}
function cfgShellPayloads(argv) {
  const out = [];
  for (let k = 0; k < argv.length; k++) {
    if (argv[k].varCount || argv[k].substCount || !CFG_SHELLS.has(basename(argv[k].canon))) continue;
    for (let j = k + 1; j < argv.length - 1; j++) {
      if (/^-[A-Za-z]*c[A-Za-z]*$/.test(String(argv[j].canon))) { out.push(String(argv[j + 1].canon || '')); break; }
      if (!/^[-+]/.test(String(argv[j].canon))) break;
    }
  }
  return out;
}
function cfgInnerMessage(text, depth) {
  if (depth >= CFG_MAX_DEPTH) return GUARD_CFG_RE_I.test(String(text)) ? GUARD_CFG_MSG : null;
  let segs;
  try { segs = tokenize(String(text)).segments; } catch (e) { return GUARD_CFG_RE_I.test(String(text)) ? GUARD_CFG_MSG : null; }
  return guardConfigWriteMessage(segs, text, depth + 1);
}
// WI-01 r1: the outer call owns the step budget. The nested calls for a
// substitution or a `-c` payload share it. A spent budget asks.
function guardConfigWriteMessage(segments, raw, depth) {
  const own = cfgBudget === null;
  if (own) cfgBudget = { left: CFG_STEP_BUDGET };
  try {
    return guardConfigWriteScan(segments, raw, depth);
  } catch (e) {
    if (e === CFG_BUDGET_SPENT) return GUARD_CFG_MSG;
    throw e;
  } finally {
    if (own) cfgBudget = null;
  }
}
function guardConfigWriteScan(segments, raw, depth) {
  depth = depth || 0;
  let ctx;
  try { ctx = cfgVarCtx(segments, raw); } catch (e) { if (e === CFG_BUDGET_SPENT) throw e; ctx = null; }
  let cwd = [[]];
  const stack = [];
  for (const seg of segments) {
    for (const r of seg.redirects || []) {
      if (!/>/.test(r.op) || !r.target) continue;
      if (tokenMentionsCfg(r.target, ctx, cwd, true)) return GUARD_CFG_MSG;
    }
    for (const t of seg.argv) {
      for (const inner of t.substInners || []) { const im = cfgInnerMessage(inner, depth); if (im) return im; }
    }
    for (const r of seg.redirects || []) {
      for (const inner of (r.target && r.target.substInners) || []) { const im = cfgInnerMessage(inner, depth); if (im) return im; }
    }
    for (const p of cfgShellPayloads(seg.argv)) { const im = cfgInnerMessage(p, depth); if (im) return im; }
    const cp = commandPosition(seg.argv);
    const cmdTok = cp.length ? cp[0] : null;
    const mentions = seg.argv.some(t => tokenMentionsCfg(t, ctx, cwd, !(t === cmdTok && !String(t.raw || '').includes('/'))));
    // WI-01 r2: from a soft unknown cwd, a command that writes into the cwd
    // with no path word (`tar xf /tmp/p.tar`) can write .claude/hooks.
    if (cwd === CFG_CWD_SOFT && cmdTok && CFG_CWD_IMPLICIT_WRITERS.has(basename(cmdTok.canon))) return GUARD_CFG_MSG;
    if (ctx) { try { cwd = cfgNextCwd(cp, ctx, cwd, stack); } catch (e) { if (e === CFG_BUDGET_SPENT) throw e; cwd = null; } }
    if (!mentions) continue;
    if (!cp.length || cp[0].varCount || cp[0].substCount) return GUARD_CFG_MSG;
    const c0 = basename(cp[0].canon);
    if (!CFG_READ_CMDS.has(c0)) return GUARD_CFG_MSG;
    const args = cp.slice(1).map(t => String(t.canon));
    if (c0 === 'sed' && args.some(a => /^-[A-Za-z]*i/.test(a) || /^--in-place/.test(a))) return GUARD_CFG_MSG;
    if ((c0 === 'awk') && args.some(a => /inplace/.test(a))) return GUARD_CFG_MSG;
    if ((c0 === 'node' || c0 === 'nodejs') && args.some(a => /^(-e|-p|--eval|--print|-r|--require|--import|--input-type)/.test(a))) return GUARD_CFG_MSG;
    if (c0 === 'yq' && args.some(a => /^(-i|--inplace)/.test(a))) return GUARD_CFG_MSG;
    if (c0 === 'find' && args.some(a => CFG_FIND_WRITE_RE.test(a))) return GUARD_CFG_MSG;
    if (c0 === 'git') {
      let sub;
      for (let k = 0; k < args.length; k++) {
        if (CFG_GIT_OPT_ARG.has(args[k])) { k++; continue; }
        if (!/^-/.test(args[k])) { sub = args[k]; break; }
      }
      if (!sub || CFG_GIT_WRITE.has(sub)) return GUARD_CFG_MSG;
    }
    if ((c0 === 'npm' || c0 === 'npx') && !args.includes('vitest') && args[0] !== 'test') return GUARD_CFG_MSG;
  }
  return null;
}
// FU-12 (v12.77.0): a loader or shell-init setting injects code into every
// binary or shell that the command starts. An ask that such a setting raises
// stays an ask under CAGENTS_BASH_GUARD=off. NODE_OPTIONS made only of the
// listed resource and diagnostic flags is waivable.
const LOADER_ASSIGN_RE = /(?<![A-Za-z0-9_])(LD_[A-Z_]+|DYLD_[A-Z_]+|BASH_ENV|BASH_FUNC_[A-Za-z0-9_%]+|SHELLOPTS|BASHOPTS|PS4|NODE_OPTIONS)\+?=("[^"]*"|'[^']*'|[^\s;&|]*)/g;
const SAFE_NODE_OPT_RE = /^--(max-old-space-size|max-semi-space-size|stack-size|no-warnings|trace-warnings|enable-source-maps|unhandled-rejections|dns-result-order|no-deprecation|trace-deprecation|max-http-header-size)(=[A-Za-z0-9_.-]+)?$/;
function loaderEnvMessage(raw) {
  raw = String(raw || '');
  let m;
  LOADER_ASSIGN_RE.lastIndex = 0;
  while ((m = LOADER_ASSIGN_RE.exec(raw)) !== null) {
    if (m[1] === 'NODE_OPTIONS') {
      const v = m[2].replace(/^(["'])([\s\S]*)\1$/, '$2');
      if (!/[$`\\]/.test(v) && v.trim() !== '' && v.trim().split(/\s+/).every(x => SAFE_NODE_OPT_RE.test(x))) continue;
    }
    return 'The command sets ' + m[1] + ', which loads code into the programs it starts. CAGENTS_BASH_GUARD=off does not waive this ask.';
  }
  return null;
}
// FU-12 (v12.77.0): the reason an ask must stay an ask under
// CAGENTS_BASH_GUARD=off, or null. The validator calls it only for a command
// that already asks, so a match in data only keeps an ask. Never throws.
function nonWaivableAskReason(command) {
  try {
    const raw = String(command || '');
    const lm = loaderEnvMessage(raw);
    if (lm) return lm;
    // WI-01 (v12.78.0): no raw-text early return. Quotes, case, `./`, a cd,
    // a variable or a glob can hide the config path from a raw match.
    let segs;
    try { segs = tokenize(raw).segments; } catch (e) { return /claude|\.\W*c|[*?[$`\\]/i.test(raw) ? GUARD_CFG_MSG : null; }
    return guardConfigWriteMessage(segs, raw);
  } catch (e) { return 'guard could not classify the ask (fail-closed)'; }
}
// FU-12 (v12.77.0): the shell source of a payload word that is one "..."
// string, with the outer quote level removed and each $VAR / $(...) kept as
// text. Returns null for any other word shape (mixed quotes, an unquoted part).
function dqPayloadSource(t) {
  const raw = String((t && t.raw) || '');
  if (!/^"[\s\S]*"$/.test(raw) || raw.length < 2) return null;
  const body = raw.slice(1, -1);
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '\\' && i + 1 < body.length && /["\\$`\n]/.test(body[i + 1])) {
      if (body[i + 1] !== '\n') out += body[i + 1];
      i++;
      continue;
    }
    if (ch === '"') return null;
    out += ch;
  }
  return out;
}
// NAME -> literal for each prefix assignment in a segment before `seg`. The
// last one wins. Only used to make a payload verdict stricter, never to allow.
function looseLiteralsBefore(segments, seg) {
  const m = new Map();
  for (const s of segments) {
    if (s === seg) break;
    for (const t of s.argv) {
      const a = (t.litLen > 0 && !t.varCount && !t.substCount) && INLINE_ASSIGN_RE.exec(t.canon);
      if (!a) break;
      m.set(a[1], a[2]);
    }
  }
  return m;
}
function spliceLiterals(src, map) {
  if (!map.size) return src;
  return src.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,
    (all, a, b) => (map.has(a || b) ? map.get(a || b) : all));
}
// R-77.5 (v12.77.0): true when the text runs curl or wget in command position,
// directly or inside a nested $(...) / `...`. Bounded by MAX_SUBST_DEPTH.
const FETCH_CMDS = new Set(['curl', 'wget']);
function textRunsFetch(text, n) {
  if (n > MAX_SUBST_DEPTH) return true;
  let segs;
  try { segs = tokenize(String(text || '')).segments; } catch (e) { return /\b(curl|wget)\b/.test(String(text || '')); }
  for (const sg of segs) {
    const r = commandPosition(sg.argv);
    if (r.length && !r[0].varCount && !r[0].substCount && FETCH_CMDS.has(basename(r[0].canon))) return true;
    for (const t of sg.argv.concat(sg.redirects.map(x => x.target).filter(Boolean))) {
      for (const si of (t.substInners || [])) if (textRunsFetch(si, n + 1)) return true;
    }
  }
  return false;
}
const FETCH_EXEC_MSG = 'download-then-execute (a fetched script is run as code through a substitution, like curl | sh)';
// Judge one token whose text a shell (`bash -c`) or `env -S` runs as code.
// Returns a deny, an ask, or null. With label 'shell -c' the reasons are the
// ones the shell -c check gave before the R-77.5 refactor.
function judgeCodePayload(pt, segments, seg, depth, label) {
  let ask = null;
  // R-77.5: `sh -c "$(curl -fsSL URL)"` runs the fetched text as code.
  for (const si of (pt.substInners || [])) if (textRunsFetch(si, 0)) return D(FETCH_EXEC_MSG);
  // FU-1 (v12.77.0): a payload whose first word is a variable
  // (`bash -c "$W"`, `sh -c "${CMD} x"`) runs that variable as a command.
  if (pt.varCount && /^["']?\s*\$(\{|[A-Za-z_@*])/.test(String(pt.raw || '')) && !/^'/.test(String(pt.raw || ''))) {
    ask = A('a variable is executed as a command (variable-indirection) by ' + (label === 'env -S' ? 'an ' : 'a ') + label + ' payload; its contents are not statically visible');
  }
  // WI-20: `bash -c "$(echo CMD)"` runs CMD; REV4 R3-2: also a nested
  // producer (`bash -c "$(cat <(echo CMD))"`).
  const texts = [pt.canon];
  for (const si of (pt.substInners || [])) texts.push(...(producedScripts(si, 0) || []));
  // FU-12 (v12.77.0): the outer shell expands a "..." payload, and the
  // inner shell then parses the result as code. pt.canon drops each
  // expansion, so `bash -c "$(echo rm) -rf /etc"` read as ` -rf /etc`.
  // Judge the payload source with each expansion kept in place, and
  // judge it again with earlier literal assignments spliced in.
  if (pt.varCount || pt.substCount) {
    const src = dqPayloadSource(pt);
    if (src === null) {
      ask = ask || A((label === 'env -S' ? 'an ' : 'a ') + label + ' payload mixes quoting with an expansion; the code the inner shell parses is not statically visible');
    } else {
      texts.push(src);
      const spliced = spliceLiterals(src, looseLiteralsBefore(segments, seg));
      if (spliced !== src) texts.push(spliced);
    }
  }
  for (const text of texts) {
    if (!text) continue;
    const inner = evaluateInternal(text, depth + 1);
    if (inner && inner.kind === 'deny') return D(label + ' payload is destructive: ' + (inner.reason || ''));
    if (inner && inner.kind === 'ask') ask = ask || A(label + ' payload requires confirmation: ' + (inner.reason || ''));
  }
  return ask;
}
// R-77.5 (v12.77.0): the -S / --split-string payload tokens of every literal
// env word in argv. An attached form (`-S'cmd'`, `--split-string=cmd`) gets a
// copy of its token with the option prefix removed from canon and raw.
function envSplitPayloads(argv) {
  const out = [];
  const strip = (t, n) => Object.assign({}, t, {
    canon: t.canon.slice(n),
    raw: String(t.raw || '').startsWith(t.canon.slice(0, n)) ? String(t.raw).slice(n) : String(t.raw || '')
  });
  for (let i = 0; i < argv.length; i++) {
    const e = argv[i];
    if (e.varCount || e.substCount || basename(e.canon) !== 'env') continue;
    for (let k = i + 1; k < argv.length; k++) {
      const t = argv[k], v = t.canon;
      if (ENV_ASSIGN_RE.test(v) && t.litLen > 0) continue;
      if (v === '-u' || v === '--unset' || v === '-C' || v === '--chdir' || v === '-a' || v === '--argv0') { k++; continue; }
      if (v === '-S' || v === '--split-string') { if (argv[k + 1]) out.push(argv[k + 1]); break; }
      if (/^--split-string=/.test(v)) { out.push(strip(t, 15)); break; }
      // A short-option cluster that holds S (`-S'cmd'`, `-iS cmd`, `-vS'cmd'`).
      const m = /^-([iv0]*)S/.exec(v);
      if (m && !/^--/.test(v)) {
        const n = m[0].length;
        if (v.length > n) out.push(strip(t, n));
        else if (argv[k + 1]) out.push(argv[k + 1]);
        break;
      }
      if (/^-/.test(v) && v !== '-') continue;
      break;
    }
  }
  return out;
}
// R-77.5 (v12.77.0): the command an xargs / parallel argv runs, past its own
// options. The words read from stdin are appended to it at run time.
const XARGS_VALUE_OPTS = new Set(['-a', '--arg-file', '-d', '--delimiter', '-E', '-e', '-I', '-L', '-l', '-n',
  '--max-args', '-P', '--max-procs', '-s', '--max-chars', '--process-slot-var', '-j', '--jobs', '-S', '--sshlogin']);
function xargsWrappedCommand(argv) {
  let k = 1;
  while (k < argv.length) {
    const v = argv[k].canon;
    if (argv[k].varCount || argv[k].substCount) break;
    if (v === '--') { k++; break; }
    if (XARGS_VALUE_OPTS.has(v)) { k += 2; continue; }
    if (/^-/.test(v) && v !== '-') { k++; continue; }
    break;
  }
  return resolveEffectiveCommand(argv.slice(k));
}
// The literal words a herestring or an echo/printf pipe producer gives to the
// stdin of seg, as plain literal tokens. Unknown input gives no words.
function xargsStdinWords(segments, seg) {
  let text = '';
  for (const r of seg.redirects) if (r.op === '<<<' && r.target && !r.target.varCount && !r.target.substCount) text += ' ' + r.target.canon;
  const si = segments.indexOf(seg);
  const prev = si > 0 && segments[si - 1].op === '|' ? segments[si - 1] : null;
  const w = prev ? echoWordsOfSeg(prev) : null;
  if (w !== null) text += ' ' + w;
  return text.split(/\s+/).filter(Boolean).map(x => ({ canon: x, raw: x, litLen: x.length, varCount: 0, substCount: 0 }));
}
// R-77.5 (v12.77.0): the files a curl / wget argv uploads (-F name=@f,
// -F name=<f, -d @f, --data-binary @f, --data-urlencode name@f, -T f,
// --upload-file f, wget --post-file=f / --body-file=f).
const CURL_FORM_OPTS = new Set(['-F', '--form']);
const CURL_DATA_OPTS = new Set(['-d', '--data', '--data-binary', '--data-ascii', '--data-urlencode', '--json']);
const CURL_UPLOAD_OPTS = new Set(['-T', '--upload-file']);
function uploadedFiles(r) {
  const out = [];
  const c0 = r.length ? basename(r[0].canon) : '';
  const formFile = (val) => { const m = /^[^=]*=[@<]([^;]+)/.exec(val); if (m) out.push(m[1]); };
  const dataFile = (val) => { const m = /^(?:[^@=]*)@([\s\S]+)$/.exec(val); if (m && m[1] !== '-') out.push(m[1]); };
  for (let k = 1; k < r.length; k++) {
    const v = r[k].canon, nx = r[k + 1] ? r[k + 1].canon : '';
    if (c0 === 'curl') {
      if (CURL_FORM_OPTS.has(v)) { formFile(nx); k++; continue; }
      if (CURL_DATA_OPTS.has(v)) { dataFile(nx); k++; continue; }
      if (CURL_UPLOAD_OPTS.has(v)) { if (nx) out.push(nx); k++; continue; }
      let m;
      if ((m = /^--(form|data|data-binary|data-ascii|data-urlencode|json|upload-file)=([\s\S]*)$/.exec(v))) {
        if (m[1] === 'form') formFile(m[2]); else if (m[1] === 'upload-file') out.push(m[2]); else dataFile(m[2]);
        continue;
      }
      if ((m = /^-F([\s\S]+)$/.exec(v))) { formFile(m[1]); continue; }
      if ((m = /^-d([\s\S]+)$/.exec(v))) { dataFile(m[1]); continue; }
      if ((m = /^-T([\s\S]+)$/.exec(v))) { out.push(m[1]); continue; }
    } else if (c0 === 'wget') {
      let m;
      if ((m = /^--(post-file|body-file)=([\s\S]+)$/.exec(v))) { out.push(m[2]); continue; }
      if (v === '--post-file' || v === '--body-file') { if (nx) out.push(nx); k++; continue; }
    }
  }
  return out;
}
// A secret file by name, in a relative or an absolute form.
function isSecretUploadFile(p) {
  const s = String(p || '').replace(/^~\//, '/~/');
  if (isSensitivePath(s)) return true;
  if (/(^|\/)id_(rsa|dsa|ecdsa|ed25519)[^\/]*$/.test(s) && !/\.pub$/.test(s)) return true;
  return /(^|\/)(\.npmrc|\.pypirc|\.netrc|\.git-credentials|credentials(\.json)?)$/.test(s);
}
function checkDisabledList(segments, canon, depth, command) {
  let shellCAsk = null;
  let sysrqAsk = null;
  { const pv = procSubstScriptVerdict(segments, depth); if (pv && pv.kind === 'deny') return pv; if (pv) shellCAsk = pv; }
  // ---- structured DENY checks ----
  for (const seg of segments) {
    // R1: judge the command after compound keywords (`then rm ...`, `{ rm ...`).
    const argv = skipLeadKeywords(seg.argv);
    if (argv.length) {
      const cmd = basename(argv[0].canon);
      const rest = argv.slice(1);
      const joined = rest.map(t => t.canon).join(' ');

      // WI-P1: resolve past a transparent wrapper / assignment prefix for the
      // six checks below that are anchored on the resolved command name
      // (rm-family, dd, find, sed, install, chmod). `rcmd`/`rrest` deliberately
      // stay UNUSED by the eval/python|node|perl|ruby|php checks further down
      // (see the module header note) — those keep using the raw `cmd`/`rest`.
      const resolved = resolveEffectiveCommand(argv);
      const rcmd = resolved.length ? basename(resolved[0].canon) : '';
      const rrest = resolved.length ? resolved.slice(1) : [];

      // WI-17: judge the words bash produces after brace expansion.
      { const bv = braceVerdict(argv, depth); if (bv && bv.kind === 'deny') return bv; if (bv) shellCAsk = shellCAsk || bv; }

      // rm-family recursive-force of a literal protected path
      if (isDestructiveFileCmd(rcmd) && hasRecursiveForce(resolved)) {
        if (rrest.some(t => t.litLen > 0 && isDangerousPath(t.canon))) return D('recursive/forced delete of a protected path');
      }

      // dd writing to a device / protected path (or zero/random source)
      if (rcmd === 'dd') {
        for (const t of rrest) {
          const v = t.canon;
          if (/^of=/.test(v)) {
            const tgt = v.slice(3);
            if (isBlockDevice(tgt) || isDangerousPath(tgt) || isSensitivePath(tgt)) return D('dd writing to a device/protected path');
          }
          if (/^if=\/dev\/(zero|random|urandom)$/.test(v)) return D('dd reading /dev/zero|random (disk-overwrite pattern)');
        }
      }

      // mkfs / mkfs.<fstype>
      if (/^mkfs(\.[a-z0-9]+)?$/.test(cmd)) return D('mkfs (filesystem format destroys data)');

      // find -delete / -exec rm on a protected root
      if (rcmd === 'find') {
        const hasDelete = rrest.some(t => t.canon === '-delete');
        const hasExecRm = rrest.some(t => t.canon === '-exec' || t.canon === '-execdir')
          && rrest.some(t => /^(rm|rmdir|unlink|shred)$/.test(basename(t.canon)));
        if (hasDelete || hasExecRm) {
          const root = rrest.find(t => t.litLen > 0 && !/^-/.test(t.canon));
          if (root && isDangerousPath(root.canon)) return D('find -delete/-exec rm on a protected path');
        }
      }

      // shell -c '<payload>' — the payload is EXECUTED by the shell, so it is
      // recursed through the evaluator (bounded depth) rather than treated as
      // inert text. Most-restrictive of outer/inner: deny short-circuits
      // immediately; ask is held until the end of this function.
      // WI-20 F2/G2: at the depth cap the payload is not read, so ask.
      if (SHELL_INTERPRETERS_EVAL.has(rcmd) && depth >= MAX_SHELL_C_DEPTH &&
          (shellCPayload(rrest) || (seg.heredocs || []).length || seg.redirects.some(r => r.op === '<<<'))) {
        shellCAsk = shellCAsk || A('shell -c / heredoc script nesting is too deep for the guard to analyze. Confirm the command is safe.');
      }
      // WI-20: a shell or source reading a process substitution runs its
      // output as a script (`bash <(curl ...)`, `bash <(echo rm -rf /etc)`).
      if (SHELL_INTERPRETERS_EVAL.has(rcmd) && depth < MAX_SHELL_C_DEPTH) {
        const sc = shellCPayload(rrest);
        for (const pt of (sc ? sc.tokens : [])) {
          const v = judgeCodePayload(pt, segments, seg, depth, 'shell -c');
          if (v && v.kind === 'deny') return v;
          if (v) shellCAsk = shellCAsk || v;
        }
      }

      // R-77.5 (v12.77.0): `env -S 'CMD ARGS'` / `env --split-string=...` runs
      // its payload as a command line, so the payload is judged as a nested
      // command exactly like a shell -c payload (`env -S 'rm -rf /etc'` was
      // allowed). Every literal env word in the segment is read, so a wrapper
      // in front of env (`timeout 5 env -S ...`) does not hide it.
      for (const pt of envSplitPayloads(seg.argv)) {
        if (depth >= MAX_SHELL_C_DEPTH) { shellCAsk = shellCAsk || A('env -S payload nesting is too deep for the guard to analyze. Confirm the command is safe.'); break; }
        const v = judgeCodePayload(pt, segments, seg, depth, 'env -S');
        if (v && v.kind === 'deny') return v;
        if (v) shellCAsk = shellCAsk || v;
      }

      // R-77.5 (v12.77.0): xargs / parallel append the words they read from
      // stdin to the command they wrap. A literal herestring or echo/printf
      // producer is known text, so `xargs rm -rf <<< /etc` and
      // `echo /etc | xargs rm -rf` are judged with those words appended.
      if (STDIN_ARGV_CMDS.has(rcmd)) {
        const w = xargsWrappedCommand(resolved);
        if (w.length && !w[0].varCount && !w[0].substCount && isDestructiveFileCmd(basename(w[0].canon))) {
          const full = w.concat(xargsStdinWords(segments, seg));
          if (hasRecursiveForce(full) && full.slice(1).some(t => t.litLen > 0 && isDangerousPath(t.canon))) {
            return D('xargs/parallel feeds a protected path to a recursive/forced delete');
          }
        }
      }

      // A heredoc fed to a shell IS that shell's script (`bash <<'EOF' ... EOF`,
      // `sh -s <<EOF`), so the body the tokenizer skipped as inert data is
      // recursed here on exactly the same terms as a `-c` payload. Without this,
      // skipping heredoc bodies would open a bypass; with it, a shell heredoc
      // whose body is a protected-path delete still DENIES. Non-shell heredoc
      // consumers (cat, python3, git commit -F -) never execute the body, so
      // their heredocs correctly stay inert.
      // WI-20 G3: a herestring fed to a shell, and a heredoc or herestring fed
      // to `source /dev/stdin`, is a script too.
      const stdinScript = SHELL_INTERPRETERS_EVAL.has(rcmd) ||
        ((rcmd === 'source' || rcmd === '.') && rrest.some(t => /^\/(dev\/stdin|dev\/fd\/0|proc\/self\/fd\/0)$/.test(t.canon)));
      if (stdinScript && depth < MAX_SHELL_C_DEPTH) {
        // R-77.5 (v12.77.0): `bash <<< "$(curl URL)"` and an unquoted heredoc
        // body with $(curl URL) run the fetched text as the script.
        for (const r of seg.redirects) {
          if (r.op !== '<<<' || !r.target) continue;
          for (const si of (r.target.substInners || [])) if (textRunsFetch(si, 0)) return D(FETCH_EXEC_MSG);
        }
        for (const hd of (seg.heredocs || [])) {
          if (hd.quoted) continue;
          for (const si of substInnersOf(hd.body)) if (textRunsFetch(si, 0)) return D(FETCH_EXEC_MSG);
        }
        const scripts = (seg.heredocs || []).map(hd => hd.body)
          .concat(seg.redirects.filter(r => r.op === '<<<' && r.target).map(r => r.target.canon));
        for (const body of scripts) {
          const inner = evaluateInternal(body, depth + 1);
          if (inner && inner.kind === 'deny') return D('heredoc script payload is destructive: ' + (inner.reason || ''));
          if (inner && inner.kind === 'ask') shellCAsk = shellCAsk || A('heredoc script payload requires confirmation: ' + (inner.reason || ''));
        }
      }

      // WI-20 G3: `eval WORDS` runs WORDS; `trap 'CMD' SIG` runs CMD.
      // REV2 R3/R4: judged on the wrapper-resolved command (`command eval`,
      // `builtin eval`, `exec eval`, `x=1 eval`, `eval --`).
      let codeArg = null;
      if (rcmd === 'eval') codeArg = evalCodeOf(rrest);
      if (rcmd === 'trap') {
        const ta = rrest[0] && rrest[0].canon === '--' ? rrest.slice(1) : rrest;
        if (ta.length >= 2 && !/^-/.test(ta[0].canon)) codeArg = ta[0].canon;
      }
      if (codeArg !== null) {
        const inner = evaluateInternal(codeArg, depth + 1);
        if (inner && inner.kind === 'deny') return D(rcmd + ' payload is destructive: ' + (inner.reason || ''));
        if (inner && inner.kind === 'ask') shellCAsk = shellCAsk || A(rcmd + ' payload requires confirmation: ' + (inner.reason || ''));
      }

      // tar extracting into a protected path
      if (cmd === 'tar') {
        const extract = rest.some(t => /^-[A-Za-z]*x/.test(t.canon)) || rest.includes('--extract');
        const ci = rest.findIndex(t => t.canon === '-C' || t.canon === '--directory');
        if (extract && ci >= 0 && rest[ci + 1] && isDangerousPath(rest[ci + 1].canon)) return D('tar extracting into a protected path');
      }

      // install with a setuid/setgid mode
      if (rcmd === 'install') {
        for (let k = 0; k < rrest.length; k++) {
          const v = rrest[k].canon;
          let mode = null;
          if (v === '-m' || v === '--mode') mode = rrest[k + 1] && rrest[k + 1].canon;
          else if (/^-m/.test(v)) mode = v.slice(2);
          else if (/^--mode=/.test(v)) mode = v.slice(7);
          if (mode && /^[4-7]\d{3}$/.test(mode)) return D('install with a setuid/setgid mode');
        }
      }

      // sed -i on a sensitive file
      if (rcmd === 'sed') {
        const inplace = rrest.some(t => t.canon === '-i' || /^-i/.test(t.canon) || t.canon === '--in-place' || /^--in-place/.test(t.canon));
        if (inplace && rrest.some(t => t.litLen > 0 && isSensitivePath(t.canon))) return D('sed in-place edit of a sensitive file');
      }

      // chmod: setuid/setgid bit, or recursive world-writable
      if (rcmd === 'chmod') {
        const recursive = rrest.some(t => t.canon === '-R' || t.canon === '--recursive' || /^-[a-z]*R/.test(t.canon));
        for (const t of rrest) {
          const v = t.canon;
          if (/\+s/.test(v)) return D('chmod setting the setuid/setgid bit');
          if (/^[4267]\d{3}$/.test(v)) return D('chmod setting a setuid/setgid octal mode');
        }
        if (recursive && rrest.some(t => t.canon === '777' || t.canon === '666')) return D('recursive chmod to world-writable (777/666)');
      }

      // cp/mv/tee/truncate/shred writing over a sensitive file
      if (/^(cp|mv|tee|truncate|shred)$/.test(cmd)) {
        if (cmd === 'tee') {
          if (rest.some(t => t.litLen > 0 && isSensitivePath(t.canon))) return D('tee writing to a sensitive file');
        } else {
          const dest = [...rest].reverse().find(t => t.litLen > 0 && !/^-/.test(t.canon));
          if (dest && isSensitivePath(dest.canon)) return D(cmd + ' writing to a sensitive file');
        }
      }

      // eval of a built/substituted command string
      // EVAL/REV2 narrowing: a payload that is only an assignment and/or an
      // echo/printf of plain variable references (`eval sc=\$$s`,
      // `eval "echo \$$s"`, `eval x=\${!v}`) asks instead of denying. This
      // applies at top level and in loop bodies. The value of the variable can
      // still inject code at eval time, so it is never an allow. Every other
      // eval with a variable or a substitution keeps the deny.
      if (cmd === 'eval' && rest.some(t => t.varCount > 0 || t.substCount > 0)) {
        if (evalIsIndirectRead(rest, command)) return A('eval of an indirect variable reference; confirm the variable values are trusted');
        return D('eval of a built/substituted command string');
      }

      // interpreter-with-inline-code obfuscation
      if (/^python(2|3)?$/.test(cmd) && rest.some(t => t.canon === '-c') && /(os\.system|subprocess|os\.popen)/.test(joined)) return D('python -c invoking os.system/subprocess');
      if (cmd === 'perl' && rest.some(t => t.canon === '-e') && /\b(system|exec)\b/.test(joined)) return D('perl -e invoking system/exec');
      if (/^(node|nodejs)$/.test(cmd) && rest.some(t => t.canon === '-e' || t.canon === '--eval') && /(child_process|\.exec\(|\.spawn\(|execSync)/.test(joined)) return D('node -e invoking child_process');
      if (cmd === 'ruby' && rest.some(t => t.canon === '-e') && /\b(exec|system)\b/.test(joined)) return D('ruby -e invoking exec/system');
      if (cmd === 'php' && rest.some(t => t.canon === '-r') && /\b(exec|system|shell_exec|passthru|proc_open)\b/.test(joined)) return D('php -r invoking exec/system');
    }

    // redirect targets: block device or sensitive file (write ops only)
    for (const r of seg.redirects) {
      if (/>/.test(r.op) && r.target) {
        const tgt = r.target.canon;
        if (isBlockDevice(tgt)) return D('redirecting output to a block device');
        if (isSensitivePath(tgt)) return D('redirecting output to a sensitive file');
        if (tgt === '/proc/sysrq-trigger') sysrqAsk = POWER_GENERIC;   // WI-20 G10
      }
    }
  }

  // two-step download-then-execute (fetch earlier, shell-exec of a file later)
  {
    let fetchIdx = -1;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const sa = skipLeadKeywords(seg.argv);
      if (!sa.length) continue;
      const cmd = basename(sa[0].canon);
      const rest = sa.slice(1);
      const fetchOut = (cmd === 'curl' || cmd === 'wget')
        && (rest.some(t => /^-[oO]$/.test(t.canon) || t.canon === '--output') || seg.redirects.some(r => /^>/.test(r.op)));
      if (fetchOut && fetchIdx < 0) fetchIdx = i;
      const shellExec = /^(bash|sh|zsh|dash|ksh|source)$/.test(cmd) || cmd === '.';
      if (shellExec && rest.some(t => t.litLen > 0 && !/^-/.test(t.canon)) && fetchIdx >= 0 && i > fetchIdx) {
        return D('two-step download-then-execute (a fetched file is later run by a shell)');
      }
    }
  }

  // sensitive-path read combined with a network egress sink (exfiltration)
  {
    const sensitiveRef = segments.some(seg =>
      seg.argv.some(t => t.litLen > 0 && isSensitivePath(t.canon)) ||
      seg.redirects.some(r => r.target && isSensitivePath(r.target.canon)));
    const egress = segments.some(seg => {
      const sa = skipLeadKeywords(seg.argv);
      if (!sa.length) return false;
      const cmd = basename(sa[0].canon);
      const rest = sa.slice(1).map(t => t.canon).join(' ');
      if (/^(curl|wget|nc|netcat|scp|sftp|rsync|socat|ftp|tftp)$/.test(cmd)) return true;
      if (cmd === 'curl' && /(-d\b|--data|--data-binary|-T\b|--upload-file|@-)/.test(rest)) return true;
      return false;
    });
    if (sensitiveRef && egress) return D('reading a sensitive file with a network egress sink in the same command (exfiltration)');
    // R-77.5 (v12.77.0): a curl / wget upload of a secret file named by a
    // relative path (`curl -F f=@.env URL`) denies like the absolute form.
    for (const seg of segments) {
      const r = commandPosition(seg.argv);
      if (!r.length || r[0].varCount || r[0].substCount || !FETCH_CMDS.has(basename(r[0].canon))) continue;
      if (uploadedFiles(r).some(isSecretUploadFile)) return D('uploading a secret file with curl/wget (exfiltration)');
    }

    for (let i = 0; i < segments.length - 1; i++) {
      if (segments[i].op !== '|') continue;
      const prodSensitive = segments[i].argv.some(t => t.litLen > 0 && isSensitivePath(t.canon));
      const consArgv = skipLeadKeywords(segments[i + 1].argv);
      const consCmd = consArgv.length ? basename(consArgv[0].canon) : '';
      if (prodSensitive && /^(curl|wget|nc|netcat|scp|socat)$/.test(consCmd)) return D('piping a sensitive file into a network egress sink (exfiltration)');
    }
  }

  // ---- legacy-superset DENY regexes against the canonical string ----
  for (const re of DENY_CANON) { if (re.test(canon)) return D('matches a blocked destructive command pattern'); }

  // ---- ASK checks ----
  // lone sensitive read (no egress) -> ask. Escalate to DENY when the segment
  // was assembled via unquoted $IFS/${IFS} field-split: there is no benign
  // reason to obfuscate a credential-file read (deny-not-ask family).
  {
    let plainSensitiveRead = false;
    for (const seg of segments) {
      const sa = skipLeadKeywords(seg.argv);
      const sensitiveRead = sa.length && isReader(basename(sa[0].canon)) &&
        sa.slice(1).some(t => t.litLen > 0 && isSensitivePath(t.canon));
      if (!sensitiveRead) continue;
      if (seg.ifsSplit) return D('obfuscated read of a sensitive credential file ($IFS field-split)');
      plainSensitiveRead = true;
    }
    if (plainSensitiveRead) return A('reading a sensitive credential file; confirm this is intended');
  }
  // H1: power-state verbs ask only in command position (see powerStateMessage).
  for (const seg of segments) {
    const msg = powerStateMessage(commandPosition(seg.argv), 0);
    if (msg) return A(msg);
  }
  { const pm = pipedPowerMessage(segments); if (pm) return A(pm); }
  if (sysrqAsk) return A(sysrqAsk);
  // K1/W1/W3: force push, mirror/delete push and history rewrites, read from
  // the git segment's argv (data that only mentions them does not ask).
  { const gm = gitHistoryMessage(segments, command); if (gm) return A(gm); }
  { const gc = guardConfigWriteMessage(segments, command); if (gc) return A(gc); }
  { const rm = runnerMessage(segments); if (rm) return A(rm); }
  annotateScriptVars(segments, command);
  { const cm = cwdShiftMessage(segments, 0); if (cm) return A(cm); }
  { const em = envPrefixMessage(segments); if (em) return A(em); }
  { const xm = xargsRunnerMessage(segments); if (xm) return A(xm); }
  // W4: find -delete / -exec rm on any root that is not a temp path.
  {
    const raw = typeof command === 'string' ? command : '';
    const fm = findDeleteMessage(segments, buildTempAssignMap(segments, raw), raw);
    if (fm) return A(fm);
  }
  // H8/REV2: SQL keywords ask unless every segment is a read-only text tool.
  // H8/REV3: SQL keywords are also matched on the raw command, so text the
  // tokenizer drops (a trailing `# DROP TABLE` comment) still counts, as it
  // did when bash-validator matched the raw string.
  for (const { re, msg, sql } of ASK_CANON) {
    const hit = re.test(canon) || (sql && typeof command === 'string' && re.test(command));
    if (hit && (!sql || !sqlIsReadOnlyText(segments, command))) return A(msg);
  }
  // WI-20 F3: the fallback belt for text the argv checks above cannot see.
  { const bm = opaqueBeltMessage(segments); if (bm) return A(bm); }

  // WI-P1: a shell -c payload that recursed to 'ask' (rather than 'deny')
  // surfaces here — nothing stronger was found elsewhere in this function.
  if (shellCAsk) return shellCAsk;

  return null;
}

// ── the evaluator core ──────────────────────────────────────────────────────
function evaluateInternal(command, depth) {
  if (depth > MAX_RECURSION) return D('substitution/recursion depth exceeded');
  if (typeof command !== 'string') return D('non-string command');
  if (command.trim() === '') return null;
  if (command.length > MAX_LEN) return D('command exceeds maximum length');

  if (isForkBomb(command)) return D('fork bomb detected');

  let segments;
  // DF (not D): a lex failure means the input could not be PARSED — a benign
  // command with an apostrophe/unbalanced quote inside a heredoc or $(...) lands
  // here just as a malformed-destructive one would. Tag it failClosed so the hook
  // can soft-fail it to `ask` (the raw-string catastrophic belt still hard-denies
  // any real `rm -rf /` / fork-bomb / exfil literal in the same string).
  try { segments = tokenize(command).segments; }
  catch (e) { return DF('un-tokenizable command (fail-closed): ' + (e && e.message || 'lex error')); }

  let canon;
  try { canon = buildCanonical(segments); }
  catch (e) { return DF('canonicalization failure (fail-closed)'); }

  const components = [
    () => checkVariableExpansion(segments, depth, command),
    () => checkCommandSubstitution(segments, depth),
    () => checkPipeDestination(segments),
    () => checkDisabledList(segments, canon, depth, command)
  ];

  let ask = null;
  for (const comp of components) {
    let v;
    try { v = comp(); }
    catch (e) { return D('evaluator internal error (fail-closed)'); }
    if (v) {
      if (v.kind === 'deny') return v;          // most-restrictive: first deny wins
      if (v.kind === 'ask' && !ask) ask = v;
    }
  }
  return ask;
}

/**
 * evaluate(command) — public entry. NEVER throws.
 * @returns {null | {deny:true, reason:string} | {hookSpecificOutput:{...}}}
 */
function evaluate(command) {
  let res;
  try { res = evaluateInternal(command, 0); }
  catch (e) { return { deny: true, reason: 'evaluator failure (fail-closed): ' + (e && e.message || 'unknown') }; }

  if (!res) return null;
  if (res.kind === 'deny') {
    const out = { deny: true, reason: res.reason || 'blocked destructive command' };
    // Surface the fail-closed (couldn't-parse) marker so the hook can soft-fail
    // an un-analyzable command to `ask` rather than hard-deny. Provably-destructive
    // denies (no failClosed) stay hard denies.
    if (res.failClosed) out.failClosed = true;
    return out;
  }
  if (res.kind === 'ask') {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: res.reason || 'requires confirmation'
      }
    };
  }
  return null;
}

// WI-21 W21-3: true when any segment names git or a test/CI runner. The hook
// uses it for a persisted working directory (input.cwd). Never throws.
function mentionsRunner(command) {
  try {
    const segments = tokenize(String(command || '')).segments;
    annotateScriptVars(segments, command);
    return segments.some(segMentionsRunner);
  } catch (e) { return true; }
}

module.exports = { evaluate, tokenize, mentionsRunner, nonWaivableAskReason };
