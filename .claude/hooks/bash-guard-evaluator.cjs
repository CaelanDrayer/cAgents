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
  if (/(^|\/)\.env(\.[\w-]+)?$/.test(s)) return true;
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
  'env', 'nice', 'ionice', 'nohup', 'setsid', 'stdbuf', 'timeout', 'time', 'command', 'exec'
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
  timeout: new Set(['-s', '--signal', '-k', '--kill-after'])
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

// Extract a balanced $(...) starting at str[i] === '(' . Quote-aware,
// depth-capped. Returns { inner, end } (end = index AFTER the ')').
function extractParen(str, i) {
  let depth = 0, inq = null;
  for (let j = i; j < str.length; j++) {
    const ch = str[j];
    if (inq) {
      if (ch === '\\' && inq === '"') { j++; continue; }
      if (ch === inq) inq = null;
      continue;
    }
    if (ch === "'" || ch === '"') { inq = ch; continue; }
    if (ch === '(') { depth++; if (depth > MAX_SUBST_DEPTH) throw new Error('substitution depth exceeded'); }
    else if (ch === ')') { depth--; if (depth === 0) return { inner: str.slice(i + 1, j), end: j + 1 }; }
  }
  throw new Error('unbalanced command substitution');
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

  function freshToken() { return { canon: '', litLen: 0, varCount: 0, substCount: 0, substInners: [] }; }
  function ensureToken() { if (!curToken) curToken = freshToken(); }
  function endToken() {
    if (!curToken) return;
    const t = curToken;
    curToken = null;
    if (pendingRedirect) { curRedirects.push({ op: pendingRedirect, target: t }); pendingRedirect = null; }
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

  const ctx = {
    appendLit(s) { ensureToken(); curToken.canon += s; curToken.litLen += s.length; },
    addVar() { ensureToken(); curToken.varCount++; },
    addSubst(inner) { ensureToken(); curToken.substCount++; curToken.substInners.push(inner); },
    splitField() { curIfsSplit = true; endToken(); }
  };

  let i = 0;
  while (i < len) {
    const c = str[i];

    // unquoted whitespace -> token boundary
    if (c === ' ' || c === '\t') { endToken(); i++; continue; }
    if (c === '\n' || c === '\r') { endSegment(';'); i++; continue; }

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
      if (str[i + 1] === '<') { pendingRedirect = '<<'; i += 2; }
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
function checkVariableExpansion(segments) {
  let ask = null;
  for (const seg of segments) {
    if (!seg.argv.length) continue;
    const ft = seg.argv[0];
    if (isPureVar(ft)) {
      const rest = seg.argv.slice(1);
      if (isVisiblyDestructiveArgv(rest)) {
        return D('variable in command position with a destructive argv (canonicalizes to a destructive command)');
      }
      ask = ask || A('a variable is executed as a command (variable-indirection); its contents are not statically visible');
    } else {
      const cmd = basename(ft.canon);
      if (isDestructiveFileCmd(cmd) && hasRecursiveForce(seg.argv)) {
        const unknownTarget = seg.argv.slice(1).some(t => isPureVar(t) || isCmdSubstPosition(t));
        if (unknownTarget) ask = ask || A('recursive/forced delete with a variable/substitution target (path unknown at analysis time)');
      }
    }
  }
  return ask;
}

// ── Component 3: command-substitution recursion ─────────────────────────────
function checkCommandSubstitution(segments, depth) {
  let ask = null;
  for (const seg of segments) {
    if (seg.argv.length) {
      const ft = seg.argv[0];
      if (isCmdSubstPosition(ft) && isVisiblyDestructiveArgv(seg.argv.slice(1))) {
        return D('command name computed by a substitution with a destructive argv');
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
function checkPipeDestination(segments) {
  let ask = null;
  // Consumer-driven scan: for every interpreter sink, resolve the producer that
  // feeds it — looking THROUGH subshell '(...)' and brace-group '{ ...; }'
  // wrapping. Non-grouped pipes behave exactly as the prior op-'|' scan did.
  for (let j = 1; j < segments.length; j++) {
    const consumer = segments[j];
    if (!consumer.argv.length) continue;
    const cCmd = basename(consumer.argv[0].canon);
    if (!isInterpreter(cCmd)) continue;

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

const ASK_CANON = [
  { re: /git push\b.*--force\b/, msg: 'Force push may cause data loss. Consider --force-with-lease.' },
  { re: /git reset --hard\b/, msg: 'Hard reset discards uncommitted changes. Consider git stash or --soft first.' },
  { re: /git\s+clean\b.*-\w*f\w*d|git\s+clean\b.*-\w*d\w*f/, msg: 'git clean -fd removes untracked files. Consider git clean -n to preview.' },
  { re: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i, msg: 'DROP permanently destroys data. Consider renaming or backing up first.' },
  { re: /\bTRUNCATE\s+TABLE\b/i, msg: 'TRUNCATE removes all rows irrecoverably. Consider DELETE ... WHERE or a backup first.' },
  { re: /\bDELETE\s+FROM\b(?!\s.*\bWHERE\b)/is, msg: 'DELETE FROM without WHERE removes all rows. Add a WHERE clause.' },
  { re: /\bchmod\s+777\b/, msg: 'chmod 777 grants world rwx. Consider 755 or 700.' },
  { re: /\bchown\s+-R\s+root\b/, msg: 'Recursive chown to root may lock you out. Verify the path.' },
  { re: /\bkill\s+-9\s+-1\b/, msg: 'kill -9 -1 SIGKILLs all your processes. Consider targeting a PID.' },
  { re: /\bkillall\b/, msg: 'killall terminates all processes matching a name. Consider a specific PID.' },
  { re: /\bpkill\s+-9\b/, msg: 'pkill -9 SIGKILLs without graceful shutdown. Consider SIGTERM first.' },
  { re: /\b(shutdown|poweroff|reboot|halt)\b/, msg: 'This affects system power state. Verify the target machine.' },
  { re: /\biptables\s+-F\b/, msg: 'iptables -F flushes all firewall rules. Save with iptables-save first.' },
  { re: /\bufw\s+disable\b/, msg: 'Disabling the firewall exposes all ports. Consider per-port rules.' },
  { re: /\bsystemctl\s+(disable|stop)\b/, msg: 'Stopping/disabling a service may affect stability. Check dependents first.' },
  { re: /\bdocker\s+system\s+prune\s+-a\b/, msg: 'docker system prune -a removes ALL unused images. Consider without -a.' },
  { re: /\bdocker\s+volume\s+prune\b/, msg: 'docker volume prune deletes unused volumes and their data. Review with volume ls first.' },
  { re: /\bmkswap\b/, msg: 'mkswap reformats a partition as swap, destroying data. Verify the device.' },
  { re: /\bfdisk\b/, msg: 'fdisk modifies partition tables. Verify the device and back up first.' }
];

function checkDisabledList(segments, canon, depth) {
  let shellCAsk = null;
  // ---- structured DENY checks ----
  for (const seg of segments) {
    const argv = seg.argv;
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
      if (SHELL_INTERPRETERS_EVAL.has(rcmd) && depth < MAX_SHELL_C_DEPTH) {
        for (let k = 0; k < rrest.length; k++) {
          if (rrest[k].canon === '-c' && rrest[k + 1]) {
            const inner = evaluateInternal(rrest[k + 1].canon, depth + 1);
            if (inner && inner.kind === 'deny') return D('shell -c payload is destructive: ' + (inner.reason || ''));
            if (inner && inner.kind === 'ask') shellCAsk = shellCAsk || A('shell -c payload requires confirmation: ' + (inner.reason || ''));
            break;
          }
        }
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
      if (cmd === 'eval' && rest.some(t => t.varCount > 0 || t.substCount > 0)) return D('eval of a built/substituted command string');

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
      }
    }
  }

  // two-step download-then-execute (fetch earlier, shell-exec of a file later)
  {
    let fetchIdx = -1;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (!seg.argv.length) continue;
      const cmd = basename(seg.argv[0].canon);
      const rest = seg.argv.slice(1);
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
      if (!seg.argv.length) return false;
      const cmd = basename(seg.argv[0].canon);
      const rest = seg.argv.slice(1).map(t => t.canon).join(' ');
      if (/^(curl|wget|nc|netcat|scp|sftp|rsync|socat|ftp|tftp)$/.test(cmd)) return true;
      if (cmd === 'curl' && /(-d\b|--data|--data-binary|-T\b|--upload-file|@-)/.test(rest)) return true;
      return false;
    });
    if (sensitiveRef && egress) return D('reading a sensitive file with a network egress sink in the same command (exfiltration)');

    for (let i = 0; i < segments.length - 1; i++) {
      if (segments[i].op !== '|') continue;
      const prodSensitive = segments[i].argv.some(t => t.litLen > 0 && isSensitivePath(t.canon));
      const consCmd = segments[i + 1].argv.length ? basename(segments[i + 1].argv[0].canon) : '';
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
      const sensitiveRead = seg.argv.length && isReader(basename(seg.argv[0].canon)) &&
        seg.argv.slice(1).some(t => t.litLen > 0 && isSensitivePath(t.canon));
      if (!sensitiveRead) continue;
      if (seg.ifsSplit) return D('obfuscated read of a sensitive credential file ($IFS field-split)');
      plainSensitiveRead = true;
    }
    if (plainSensitiveRead) return A('reading a sensitive credential file; confirm this is intended');
  }
  for (const { re, msg } of ASK_CANON) { if (re.test(canon)) return A(msg); }

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
    () => checkVariableExpansion(segments),
    () => checkCommandSubstitution(segments, depth),
    () => checkPipeDestination(segments),
    () => checkDisabledList(segments, canon, depth)
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

module.exports = { evaluate, tokenize };
