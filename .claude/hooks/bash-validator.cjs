#!/usr/bin/env node
/**
 * Bash Validator Hook (cAgents v12.81.0): the narrow PreToolUse[Bash] guard. Two rules only.
 * 1. secret-literal: the command text, heredoc bodies included, holds a literal that
 * scanForSecrets() reports at critical or high. 2. protected-path-write: a simple command
 * writes, deletes, moves, or changes the mode or owner of a path in the shared protected list.
 * Fail open: an error or an unbalanced quote skips the path rule, and a command over 256 KB
 * skips both rules. Each such event and each deny writes one line to bash_guard.log, never
 * the command text. Only CAGENTS_BASH_NARROW_GUARD=off (any case) turns the guard off.
 * ponytail: reuse the shared detectors (rung 4). The splitter is new code (rung 7).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { createHook, AGENT_MEMORY_DIR, ensureDir } = require('./hook-utils.cjs');
process.env.CAGENTS_DISPATCH_IMPORT = '1'; // import the pure helpers, not the standalone createHook()
const { scanForSecrets, isProtectedPath, PROTECTED_PATHS } = require('./secret-detection.cjs');
delete process.env.CAGENTS_DISPATCH_IMPORT;

const RULE_FAMILIES = ['secret-literal', 'protected-path-write'];
const MAX_PARSE_BYTES = 256 * 1024;
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const KEYWORDS = new Set(['{', '}', '!', 'if', 'then', 'else', 'elif', 'do', 'while', 'until']);
const WRAPPERS = { // wrapper name -> the options of the wrapper that take a value
  env: '-u --unset -C --chdir -S --split-string', command: '', builtin: '', exec: '-a',
  nice: '-n --adjustment', nohup: '', time: '', timeout: '-s -k --signal --kill-after',
  sudo: '-u -g -C -D -h -p -r -t -U -T --user --group', doas: '-u -C',
};
const DIR_VERBS = new Set(['rm', 'rmdir', 'mv', 'chmod', 'chown', 'chgrp', 'shred']);
const LINK_VERBS = new Set(['rm', 'rmdir', 'unlink', 'ln']); // act on a link, not its target
// DB_URL: user-info has no space, '/' or '@'; group 1 is the host. IDENT_REF: a dotted reference. KEY_BODY: on a later line (a newline or a literal \n), a pure base64 line of 40+ chars, or base64 lines and an END line.
const DB_URL = /^[a-z+]+:\/\/[^\s:@/]*:[^\s@/]+@(\[[^\]]*\]|[^:/?#\s'"]+)/i;
const IDENT_REF = /^[A-Za-z_]\w*(\.[A-Za-z_]\w*)+$/;
const KEY_BODY = /["']?[ \t]*(?:(?:\r?\n|\\n)[ \t]*(?:[\w-]+: [^\n\\]*)?)+(?<=(?:\n|\\n)[ \t]*)(?:[A-Za-z0-9+/=]{40,}[ \t\r]*(?:$|\n|\\n|["'])|(?:[A-Za-z0-9+/=]+[ \t\r]*(?:\n|\\n)[ \t]*)+-----END )/y;
// --- Lexer: quote-aware, heredoc bodies removed, $(...) and backticks opaque ---
function unparsed() { const e = new Error('unbalanced quote'); e.code = 'UNPARSED'; return e; }
function heredocDelim(src, j) {
  let d = '';
  while (src[j] === ' ' || src[j] === '\t') j++;
  while (j < src.length && !/[\s;|&<>()]/.test(src[j])) {
    const c = src[j];
    if (c === "'" || c === '"') { const k = src.indexOf(c, j + 1); if (k < 0) throw unparsed(); d += src.slice(j + 1, k); j = k + 1; } else if (c === '\\') { d += src[j + 1] || ''; j += 2; } else { d += c; j++; }
  }
  return { delim: d, end: j };
}
// Skip the bodies of pending heredocs from line start i. Returns the new index.
function skipBodies(src, i, pending, inParen) {
  while (pending.length) {
    const h = pending.shift();
    while (i < src.length) {
      const e = src.indexOf('\n', i);
      const line = src.slice(i, e < 0 ? src.length : e);
      const cmp = h.strip ? line.replace(/^\t+/, '') : line;
      if (inParen && cmp.startsWith(h.delim) && /^\)/.test(cmp.slice(h.delim.length))) return i + line.indexOf(')');
      i = e < 0 ? src.length : e + 1;
      if (cmp === h.delim) break;
    }
  }
  return i;
}
// Index after the '))' or ']]' that closes '((' or '[[ ' before i, or -(f + 1) when the scan fails at f.
function skipArith(src, i) { for (let d = 0; i < src.length; i++) { if (src[i] === '(') d++; else if (src[i] === ')') { if (d) d--; else return src[i + 1] === ')' ? i + 2 : -i - 1; } } return -i - 1; }
function skipCond(src, i) { if (!/[ \t]/.test(src[i] || '')) return -i - 1; for (; i < src.length; i++) { const c = src[i]; if (c === "'" || c === '"') { const q = src.indexOf(c, i + 1); if (q < 0) return -src.length - 1; i = q; } else if (c === '\\') i++; else if (c === '\n') return -i - 1; else if (c === ']' && src[i + 1] === ']' && /^[\s;&|)]?$/.test(src[i + 2] || '')) return i + 2; } return -i - 1; }
function skipBacktick(src, i) {
  for (; i < src.length; i++) { if (src[i] === '\\') i++; else if (src[i] === '`') return i + 1; }
  throw unparsed();
}
function readDouble(src, i, add) {
  while (i < src.length) {
    const c = src[i];
    if (c === '"') return i + 1;
    if (c === '\\') { add('$`"\\\n'.includes(src[i + 1]) ? src[i + 1] : c + (src[i + 1] || '')); i += 2; continue; }
    let j = i + 1;
    if (c === '$' && src[i + 1] === '(') j = skipParen(src, i + 2); else if (c === '`') j = skipBacktick(src, i + 1);
    add(src.slice(i, j)); i = j;
  }
  throw unparsed();
}
function skipParen(src, i) { // index after the ')' that closes a '(' opened just before i
  let depth = 1; const pending = [];
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') i += 2;
    else if (c === "'") { const k = src.indexOf("'", i + 1); if (k < 0) throw unparsed(); i = k + 1; }
    else if (c === '"') i = readDouble(src, i + 1, () => {});
    else if (c === '`') i = skipBacktick(src, i + 1);
    else if (c === '#' && /[\s;(]/.test(src[i - 1] || ' ')) { while (i < src.length && src[i] !== '\n') i++; }
    else if (c === '<' && src[i + 1] === '<' && src[i + 2] !== '<') { const strip = src[i + 2] === '-'; const h = heredocDelim(src, i + (strip ? 3 : 2)); pending.push({ delim: h.delim, strip }); i = h.end; }
    else if (c === '\n') i = skipBodies(src, i + 1, pending, true);
    else if (c === '(') { depth++; i++; }
    else if (c === ')') { if (--depth === 0) return i + 1; i++; }
    else i++;
  }
  throw unparsed();
}
// Cut src into simple commands: { words: [string], redirs: [string] (write targets) }.
function lex(src) {
  const cmds = []; const pending = [];
  let cur = { words: [], redirs: [] }; let word = null; let redir = null; let i = 0; const no = { a: 0, c: 0 };
  const add = s => { word = (word === null ? '' : word) + s; }; // close: an opener inside a failed span is text (Q-2, linear)
  const close = (f, key, p) => { if (p < no[key]) return -1; const k = f(src, p); if (k < 0) no[key] = -k - 1; return k; };
  const flush = () => {
    if (word === null) return;
    if (redir) { if (!redir.read && !(redir.dup && /^(\d+-?|-)$/.test(word))) cur.redirs.push(word); redir = null; } else cur.words.push(word);
    word = null;
  };
  const end = () => { flush(); redir = null; if (cur.words.length || cur.redirs.length) cmds.push(cur); cur = { words: [], redirs: [] }; };
  while (i < src.length) {
    const c = src[i]; const n1 = src[i + 1]; let k;
    if (c === '\\') { if (n1 !== '\n') add(n1 || ''); i += 2; }
    // '>' inside (( )), $(( )) and [[ ]] is a comparison, not a redirect.
    else if (word === null && ((c === '(' && n1 === '(' && (k = close(skipArith, 'a', i + 2)) > 0) || (c === '[' && n1 === '[' && (k = close(skipCond, 'c', i + 2)) > 0))) { add(src.slice(i, k)); i = k; }
    else if (c === '$' && n1 === '(' && src[i + 2] === '(' && (k = close(skipArith, 'a', i + 3)) > 0) { add(src.slice(i, k)); i = k; }
    else if (c === "'") { const k = src.indexOf("'", i + 1); if (k < 0) throw unparsed(); add(src.slice(i + 1, k)); i = k + 1; }
    else if (c === '"') i = readDouble(src, i + 1, add);
    else if (c === '$' && n1 === "'") { let k = i + 2; while (k < src.length && src[k] !== "'") k += src[k] === '\\' ? 2 : 1; if (k >= src.length) throw unparsed(); add(src.slice(i, k + 1)); i = k + 1; }
    else if (c === '$' && n1 === '(') { const k = skipParen(src, i + 2); add(src.slice(i, k)); i = k; }
    else if (c === '`') { const k = skipBacktick(src, i + 1); add(src.slice(i, k)); i = k; }
    else if (c === '#' && word === null) { while (i < src.length && src[i] !== '\n') i++; }
    else if (c === ' ' || c === '\t' || c === '\r') { flush(); i++; }
    else if (c === '\n') { end(); i = skipBodies(src, i + 1, pending, false); }
    else if (c === '(' && word !== null && /=$/.test(word)) { const k = skipParen(src, i + 1); add(src.slice(i, k)); i = k; }
    else if (c === '(' || c === ')') { end(); cmds.push({ group: c, words: [], redirs: [] }); i++; }
    else if (c === ';' || c === '|') { end(); i += (c === '|' && n1 === '&') ? 2 : 1; }
    else if (c === '&' && n1 === '>') { flush(); const app = src[i + 2] === '>'; redir = { op: '&>' }; i += app ? 3 : 2; }
    else if (c === '&') { end(); i++; }
    else if ((c === '>' || c === '<') && n1 === '(') { const k = skipParen(src, i + 2); add(src.slice(i, k)); i = k; }
    else if (c === '>' || c === '<') {
      if (word !== null && /^\d+$/.test(word)) word = null; else flush();
      if (c === '<' && n1 === '<' && src[i + 2] === '<') { redir = { read: true }; i += 3; }
      else if (c === '<' && n1 === '<') { const strip = src[i + 2] === '-'; const h = heredocDelim(src, i + (strip ? 3 : 2)); pending.push({ delim: h.delim, strip }); i = h.end; }
      else if (c === '<') { redir = { read: true }; i += (n1 === '&' || n1 === '>') ? 2 : 1; }
      else { let j = i + 1; if (src[j] === '>' || src[j] === '|') j++; redir = { dup: src[j] === '&' }; if (redir.dup) j++; i = j; }
    }
    else { add(c); i++; }
  }
  end();
  return cmds;
}
function operands(args, valOpts) {
  const names = valOpts.split(' '); const ops = []; const opts = []; let done = false;
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    if (done || a === '-' || !a.startsWith('-')) { ops.push(a); continue; }
    if (a === '--') { done = true; continue; }
    const long = a.startsWith('--'); const name = long ? a.split('=')[0] : a.slice(0, 2);
    let val = long ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : null) : (a.length > 2 ? a.slice(2) : null);
    if (names.includes(name)) { if (val === null) val = args[++k]; } else if (!long) val = null;
    opts.push({ name, val, raw: a });
  }
  return { ops, opts };
}
function skipWrappers(words) {
  let k = 0;
  while (k < words.length) {
    const w = words[k]; const b = path.basename(w);
    if (/^[A-Za-z_][A-Za-z0-9_]*\+?=/.test(w) || KEYWORDS.has(w)) { k++; continue; }
    if (!(b in WRAPPERS)) break;
    if (b === 'command' && words.slice(k + 1).some(x => x === '-v' || x === '-V')) return [];
    const vals = WRAPPERS[b].split(' '); k++;
    while (k < words.length && words[k].startsWith('-') && words[k] !== '-') { const o = words[k++]; if (o === '--') break; if (vals.includes(o)) k++; }
    if (b === 'timeout') k++;
  }
  return words.slice(k);
}
function expandHome(p) {
  const home = process.env.HOME;
  if (!home) return p;
  const m = /^(~|\$HOME|\$\{HOME\})(\/|$)/.exec(p);
  return m ? home + p.slice(m[1].length) : p;
}
// Verb -> [action, extractor(args) => path args].
const VERBS = {
  tee: ['write', a => operands(a, '').ops],
  rm: ['delete', a => operands(a, '').ops], rmdir: ['delete', a => operands(a, '').ops],
  unlink: ['delete', a => operands(a, '').ops], shred: ['delete', a => operands(a, '-n -s --iterations --size --random-source').ops],
  mv: ['move', a => { const r = operands(a, '-t --target-directory -S --suffix'); return r.ops.concat(r.opts.filter(o => o.name === '-t' || o.name === '--target-directory').map(o => o.val)); }],
  touch: ['write', a => operands(a, '-d --date -t -r --reference').ops], mkdir: ['write', a => operands(a, '-m --mode').ops],
  truncate: ['write', a => operands(a, '-s --size -r --reference').ops],
  dd: ['write', a => a.filter(x => x.startsWith('of=')).map(x => x.slice(3))],
  sed: ['write', a => {
    const r = operands(a, '-e --expression -f --file -l --line-length');
    if (!r.opts.some(o => o.name === '--in-place' || /^-[nErsuz]*i/.test(o.raw))) return [];
    return r.opts.some(o => /^(-e|-f|--expression|--file)$/.test(o.name)) ? r.ops : r.ops.slice(1);
  }],
};
for (const v of ['cp', 'install', 'ln']) {
  VERBS[v] = ['write', a => {
    const r = operands(a, '-t --target-directory -S --suffix -m --mode -o --owner -g --group');
    const t = r.opts.find(o => o.name === '-t' || o.name === '--target-directory');
    return t ? [t.val] : (r.ops.length >= 2 ? [r.ops[r.ops.length - 1]] : []);
  }];
}
for (const v of ['chmod', 'chown', 'chgrp']) {
  VERBS[v] = [v === 'chmod' ? 'change mode of' : 'change owner of', a => {
    const r = operands(a, '--reference');
    const noMode = r.opts.some(o => o.name === '--reference' || (v === 'chmod' && /^-[rwxXst]+$/.test(o.raw)));
    return noMode ? r.ops : r.ops.slice(1);
  }];
}
function rootOf(p) { return PROTECTED_PATHS.find(pp => p.startsWith(pp)) || '(real path of a link)'; }
function realDir(d) { try { return fs.realpathSync(d); } catch { return d; } }
function addTarget(out, verb, action, raw, base, noFollow) {
  if (typeof raw !== 'string') return;
  const p = expandHome(raw).split(/[$*?[]/)[0];
  if (!p || (!path.isAbsolute(p) && base === null)) return;
  const resolved = path.resolve(base || '/', p);
  if (resolved.startsWith('/dev/') || resolved.startsWith('/proc/self/fd/')) return;
  const nf = noFollow && !p.endsWith('/'); // a link verb on a name without '/': never follow the link
  const cands = nf ? [resolved, path.join(realDir(path.dirname(resolved)), path.basename(resolved))] : [resolved];
  if (p.endsWith('/') || DIR_VERBS.has(verb)) cands.push(...cands.map(c => c.replace(/\/?$/, '/')));
  const hit = cands.find(c => (nf ? PROTECTED_PATHS.some(pp => c.startsWith(pp)) : isProtectedPath(c)));
  out.push({ verb, action, path: resolved, root: hit ? rootOf(hit) : null });
}
// Write targets of a command; root is the protected root or null. Throws UNPARSED.
function findWriteTargets(command, cwd, depth = 0) {
  const out = []; const saved = []; let base = cwd || process.cwd();
  for (const cmd of lex(command)) {
    if (cmd.group === '(') { saved.push(base); continue; } // a cd inside ( ... ) ends with the group
    if (cmd.group === ')') { if (saved.length) base = saved.pop(); continue; }
    for (const r of cmd.redirs) addTarget(out, 'redirect', 'write', r, base);
    const w = skipWrappers(cmd.words);
    if (!w.length) continue;
    const verb = path.basename(w[0]); const args = w.slice(1);
    if (verb === 'cd') {
      const d = operands(args, '').ops[0];
      if (d === '-') continue;
      const p = d === undefined ? (process.env.HOME || '') : expandHome(d);
      base = (!p || /[$*?[`]/.test(p) || (!path.isAbsolute(p) && base === null)) ? null : path.resolve(base || '/', p);
    } else if ((verb === 'bash' || verb === 'sh') && depth === 0) {
      const r = operands(args, '-o -O --rcfile --init-file');
      if (r.opts.some(o => /^-[a-zA-Z]*c/.test(o.raw) && !o.raw.startsWith('--')) && r.ops.length) {
        try { out.push(...findWriteTargets(r.ops[0], base, 1)); } catch (e) {
          log(e && e.code === 'UNPARSED' ? 'unparsed' : 'error', 'protected-path-write', e && e.code === 'UNPARSED' ? 'bash -c string has an unbalanced quote, path rule skipped' : (e && e.name) || 'Error');
        }
      }
    } else if (VERBS[verb]) {
      // mv: every operand but the last (the destination) is a link-safe source.
      const ts = VERBS[verb][1](args);
      ts.forEach((t, k) => addTarget(out, verb, VERBS[verb][0], t, base, LINK_VERBS.has(verb) || (verb === 'mv' && k < ts.length - 1)));
    }
  }
  return out;
}
// Critical and high hits after the D-1 drops: class and offset only, never the value.
// The shared DB pattern crosses spaces: re-scan inside a wide match only (a chain, depth 8).
function findSecretHits(command, off = 0, depth = 0) {
  const f = scanForSecrets(command, ''); const out = [];
  for (const x of f.critical.concat(f.high)) {
    if (x.type === 'Database Credentials') {
      const m = DB_URL.exec(x.value);
      if (!m) { if (depth < 8) out.push(...findSecretHits(command.slice(x.index + 3, x.index + x.value.length), off + x.index + 3, depth + 1).filter(h => h.type === x.type)); continue; }
      if (/[$`]/.test(m[0]) || LOOPBACK.has(m[1].toLowerCase())) continue;
    } else if (/[$`]/.test(x.value) || IDENT_REF.test(x.tokenValue || '')) continue;
    // A PEM header with no key body after it (a grep for the header) is not a key.
    if (/Private Key$/.test(x.type)) { KEY_BODY.lastIndex = x.index + x.value.length; if (!KEY_BODY.test(command)) continue; }
    // A Mailgun-shaped match inside a word (a '-key-<md5>' file name) is not a key.
    if (x.type === 'Mailgun API Key' && /[\w-]/.test(command[x.index - 1] || '')) continue;
    out.push({ type: x.type, index: off + x.index });
  }
  return out;
}
function log(outcome, rule, detail) {
  try {
    const file = path.join(ensureDir(path.join(AGENT_MEMORY_DIR, '_system', 'logs')), 'bash_guard.log');
    try { if (fs.statSync(file).size > 1024 * 1024) fs.renameSync(file, `${file.slice(0, -4)}_${new Date().toISOString().replace(/[:.]/g, '-')}.log`); } catch { /* no file yet */ }
    fs.appendFileSync(file, `${new Date().toISOString()} | outcome=${outcome} | rule=${rule} | detail=${detail}\n`);
  } catch { /* logging is best effort */ }
}
function listed(items) { return items.slice(0, 3).join('; ') + (items.length > 3 ? `; and ${items.length - 3} more` : ''); }
const SCOPE = 'The narrow Bash guard checks only secret literals and writes to protected system paths.';
function handler(input) {
  const command = input && input.tool_name === 'Bash' && input.tool_input && input.tool_input.command;
  if (typeof command !== 'string' || !command) return null;
  if (String(process.env.CAGENTS_BASH_NARROW_GUARD || '').toLowerCase() === 'off') return null;
  try {
    // D-3: an oversize command skips both rules, so the scan cannot pass the hook timeout.
    if (Buffer.byteLength(command) > MAX_PARSE_BYTES) { log('oversize', 'none', 'command over 256 KB, both rules skipped'); return null; }
    const secrets = findSecretHits(command);
    if (secrets.length) {
      log('deny', 'secret-literal', [...new Set(secrets.map(s => s.type))].join(','));
      return { deny: true, reason: `[bash-validator] Denied: rule secret-literal. The command text holds ${listed(secrets.map(s => `a "${s.type}" literal at character ${s.index}`))}. The value is not shown. ${SCOPE} To proceed: do not put the secret in the command. Read it at run time from an environment variable or from a file that the command opens, or ask the user to run the command.` };
    }
    let hits = [];
    try { hits = findWriteTargets(command, input.cwd).filter(t => t.root); } catch (e) {
      if (e.code !== 'UNPARSED') throw e;
      log('unparsed', 'protected-path-write', 'unbalanced quote, path rule skipped');
    }
    if (!hits.length) return null;
    log('deny', 'protected-path-write', [...new Set(hits.map(h => h.root))].join(','));
    return { deny: true, reason: `[bash-validator] Denied: rule protected-path-write. ${listed(hits.map(h => `'${h.verb}' would ${h.action} ${h.path} (protected root ${h.root})`))}. ${SCOPE} To proceed: write under the project or /tmp instead, or ask the user to run the command.` };
  } catch (e) {
    log('error', 'none', (e && e.name) || 'Error');
    return null;
  }
}
if (!process.env.CAGENTS_DISPATCH_TEST_IMPORT) createHook('BashValidator', handler);
module.exports = { handler, findWriteTargets, findSecretHits, RULE_FAMILIES };
