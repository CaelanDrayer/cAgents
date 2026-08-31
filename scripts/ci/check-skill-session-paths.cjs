#!/usr/bin/env node
/**
 * scripts/ci/check-skill-session-paths.cjs — REC-20 (v12.52.0) CI guard.
 *
 * Fails if a shipped skill body reintroduces a CWD-relative session-path write
 * or an npm-into-session/scratch footgun. Both are CWD-leak vectors: a relative
 * `cagents-memory/…` write (or an install run with the cwd inside a session dir)
 * resolves against whatever cwd a nested /act or /team teammate happens to have,
 * nesting a whole `cagents-memory/` tree — or `node_modules/` — under a session.
 *
 * The fix is to anchor every session/_system write to an absolute `$MEM`
 * (`$CAGENTS_ROOT/cagents-memory`). This guard enforces that the shipped bodies
 * never regress to the relative form.
 *
 * Usage:
 *   node scripts/ci/check-skill-session-paths.cjs [file ...]
 * With no args, scans the default shipped set. Exit 0 = clean, 1 = violations.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

const DEFAULT_FILES = [
  '.claude/skills/act/SKILL.md',
  '.claude/skills/team/SKILL.md',
  '.claude/skills/designer/SKILL.md',
  '.claude/skills/act/reference/session-id-format.md',
].map((p) => path.join(REPO_ROOT, p));

// A relative `cagents-memory/(sessions|_system)` used as a WRITE target — the
// CWD-leak vector. Reads/prose ("scan cagents-memory/sessions/", "Read
// cagents-memory/…") are NOT writes and are intentionally not matched.
const VIOLATION_PATTERNS = [
  {
    id: 'relative-session-dir-assignment',
    // SESSION_DIR="cagents-memory/…"  (relative assignment used for writes)
    re: /\bSESSION_DIR\s*=\s*["']?cagents-memory\//,
    msg: 'SESSION_DIR assigned a relative cagents-memory/ path (must anchor on "$MEM/…")',
  },
  {
    id: 'relative-mkdir',
    // mkdir [-p] … cagents-memory/(sessions|_system)  (relative mkdir)
    re: /\bmkdir\b[^\n]*?["']?cagents-memory\/(sessions|_system)/,
    msg: 'mkdir into a relative cagents-memory/ path (must anchor on "$MEM/…")',
  },
  {
    id: 'relative-redirect-write',
    // > cagents-memory/(sessions|_system)  or  >> "cagents-memory/…  (relative redirect write)
    re: />>?\s*["']?cagents-memory\/(sessions|_system)/,
    msg: 'shell redirect writes to a relative cagents-memory/ path (must anchor on "$MEM/…")',
  },
  {
    id: 'npm-into-session-or-scratch',
    // An install run on a line that also names a session/scratch path — dumps
    // node_modules/ into the session tree.
    re: /(npm|pnpm|yarn)\s+(install|ci|add)\b[^\n]*(cagents-memory\/sessions|\$\{?SESSION_DIR|repo_root_scratch)|(cd|pushd)\s+[^\n]*(cagents-memory\/sessions|\$\{?SESSION_DIR\b|repo_root_scratch)[^\n]*(npm|pnpm|yarn)\s+(install|ci|add)\b/,
    msg: 'npm/pnpm/yarn install with cwd inside a session/scratch dir (installs run from "$CAGENTS_ROOT" only)',
  },
];

function scanFile(file) {
  const findings = [];
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch (e) {
    findings.push({ file, line: 0, id: 'unreadable', msg: `cannot read: ${e.message}` });
    return findings;
  }
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pat of VIOLATION_PATTERNS) {
      if (pat.re.test(line)) {
        findings.push({ file, line: i + 1, id: pat.id, msg: pat.msg, text: line.trim() });
      }
    }
  }
  return findings;
}

function main(argv) {
  const files = argv.length ? argv.map((f) => path.resolve(f)) : DEFAULT_FILES;
  let findings = [];
  for (const f of files) findings = findings.concat(scanFile(f));

  if (findings.length === 0) {
    console.log(`[check-skill-session-paths] OK — ${files.length} file(s) clean of CWD-relative session-path writes`);
    return 0;
  }

  console.error('[check-skill-session-paths] CWD-leak violation(s) found:');
  for (const f of findings) {
    const rel = path.relative(REPO_ROOT, f.file);
    console.error(`  ${rel}:${f.line} [${f.id}] ${f.msg}`);
    if (f.text) console.error(`      > ${f.text}`);
  }
  console.error('Anchor session/_system writes to "$MEM" ($CAGENTS_ROOT/cagents-memory). See REC-20.');
  return 1;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = { scanFile, VIOLATION_PATTERNS, DEFAULT_FILES, main };
