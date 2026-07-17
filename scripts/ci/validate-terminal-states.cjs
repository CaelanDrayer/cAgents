#!/usr/bin/env node
/**
 * validate-terminal-states.cjs (REC-01, v12.46.0)
 *
 * CI guard for the canonical terminal-state vocabulary. Scans SHIPPED skills and
 * config for `pipeline_state:` / `phase:` / `current_phase:` literal assignments
 * and rejects any value that is neither:
 *   (a) a valid NON-terminal transient state (pipeline machine states, their
 *       lowercase phase labels, or a domain phase such as the designer
 *       design-thinking phases), NOR
 *   (b) a CANONICAL terminal state (a member of hook-utils' TERMINAL_STATES).
 *
 * Guard-first canonicalization: the RUNTIME normalizer (isTerminalState) is
 * liberal — it tolerates legacy on-disk variants (`completed`, `COMPLETE`,
 * `FINALIZED`). Shipped, human-authored content must be STRICT: it may only use
 * the canonical forms, so a non-canonical alias in a skill/config is a violation
 * with a suggested canonical replacement. This keeps the vocabulary from drifting
 * back to the pre-REC-01 grab-bag.
 *
 * Scope (per REC-01): .claude/skills/**\/*.{md,yaml,yml} and
 * cagents-memory/_system/config/*.{yaml,yml} (includes pipeline_config.yaml).
 * Missing paths are skipped (a fresh clone without git-ignored cagents-memory
 * still passes on the tracked .claude/skills tree).
 *
 * Usage: node scripts/ci/validate-terminal-states.cjs [--json]
 * Exit:  0 = clean, 1 = off-enum literal(s) found.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.env.CAGENTS_PROJECT_ROOT
  || path.resolve(__dirname, '..', '..');

// Canonical terminal set — single source of truth is hook-utils.cjs. Fall back to
// a hardcoded copy if the require fails (keeps this guard self-contained).
let TERMINAL_STATES, isTerminalState, normalizeTerminalState;
try {
  ({ TERMINAL_STATES, isTerminalState, normalizeTerminalState } =
    require(path.join(PROJECT_ROOT, '.claude', 'hooks', 'hook-utils.cjs')));
} catch (_e) {
  TERMINAL_STATES = ['VALIDATED', 'complete', 'failed', 'aborted', 'incomplete'];
  const ALIASES = { completed: 'complete', COMPLETE: 'complete', FINALIZED: 'complete' };
  normalizeTerminalState = (s) => {
    if (typeof s !== 'string') return s;
    const t = s.trim();
    if (ALIASES[t]) return ALIASES[t];
    const lower = t.toLowerCase();
    for (const c of TERMINAL_STATES) if (c.toLowerCase() === lower) return c;
    for (const r in ALIASES) if (r.toLowerCase() === lower) return ALIASES[r];
    return t;
  };
  isTerminalState = (s) => TERMINAL_STATES.includes(normalizeTerminalState(s));
}

// Valid NON-terminal transient pipeline states: the 5-state machine + team /
// enrichment sub-states + their lowercase human phase labels. TEAM_CREATED is a
// bootstrap state, deliberately NON-terminal (a bare TEAM_CREATED is a stall).
const PIPELINE_TRANSIENT = [
  'INIT', 'ORCHESTRATED', 'PLANNED', 'COORDINATED',
  'ENRICHING', 'ENRICHED', 'EXECUTING',
  'TEAM_READY', 'TEAM_CREATED', 'ROUTING', 'REVISING',
  'init', 'routing', 'orchestrating', 'enriching', 'planning',
  'coordinating', 'executing', 'validating', 'revising', 'integrating',
];

// Valid NON-terminal domain phases (designer design-thinking + adjacent). These
// share the `phase:` key with the pipeline but are a separate vocabulary.
const DOMAIN_PHASES = [
  'empathize', 'define', 'ideate', 'ideation', 'conceptualize',
  'prototype', 'test', 'refinement', 'specification',
  'discovery', 'research', 'delivery', 'synthesis',
];

const ALLOWED_TRANSIENT = new Set([...PIPELINE_TRANSIENT, ...DOMAIN_PHASES]);

// Matches a bareword (optionally quoted) value on a `key: value` line. A value
// starting with `$` (template), `<` (placeholder), `|`/`>` (yaml block), `[`/`{`
// (flow collection) will not match `[A-Za-z_]` and is skipped by design.
const LINE_RE = /^\s*(?:-\s*)?(pipeline_state|phase|current_phase)\s*:\s*(['"]?)([A-Za-z_][A-Za-z0-9_-]*)\2\s*(?:#.*)?$/;

function walk(dir, exts, acc) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, acc);
    else if (exts.some((x) => e.name.endsWith(x))) acc.push(p);
  }
}

function collectFiles() {
  const files = [];
  walk(path.join(PROJECT_ROOT, '.claude', 'skills'), ['.md', '.yaml', '.yml'], files);
  // Config: only the top-level *.yaml files in _system/config (not recursive).
  const configDir = path.join(PROJECT_ROOT, 'cagents-memory', '_system', 'config');
  let cfg = [];
  try { cfg = fs.readdirSync(configDir); } catch { cfg = []; }
  for (const f of cfg) {
    if (f.endsWith('.yaml') || f.endsWith('.yml')) files.push(path.join(configDir, f));
  }
  return files;
}

function classify(value) {
  if (TERMINAL_STATES.includes(value)) return { ok: true };            // canonical terminal
  if (ALLOWED_TRANSIENT.has(value)) return { ok: true };               // valid transient
  if (isTerminalState(value)) {
    // A recognized terminal ALIAS (completed/COMPLETE/FINALIZED/…). The runtime
    // tolerates it, but shipped content must use the canonical form.
    return { ok: false, reason: `non-canonical terminal alias — use '${normalizeTerminalState(value)}'` };
  }
  return { ok: false, reason: 'off-enum state (not a valid transient or canonical terminal)' };
}

function main() {
  const jsonOut = process.argv.includes('--json');
  const files = collectFiles();
  const violations = [];
  let literalsChecked = 0;

  for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, 'utf8'); } catch { continue; }
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(LINE_RE);
      if (!m) continue;
      const value = m[3];
      literalsChecked++;
      const verdict = classify(value);
      if (!verdict.ok) {
        violations.push({
          file: path.relative(PROJECT_ROOT, f),
          line: i + 1,
          key: m[1],
          value,
          reason: verdict.reason,
        });
      }
    }
  }

  if (jsonOut) {
    console.log(JSON.stringify({
      files_scanned: files.length,
      literals_checked: literalsChecked,
      violations,
      canonical_terminal: TERMINAL_STATES,
    }, null, 2));
  } else {
    console.log(`[validate-terminal-states] scanned ${files.length} file(s), checked ${literalsChecked} state literal(s)`);
    console.log(`[validate-terminal-states] canonical terminal: ${TERMINAL_STATES.join(', ')}`);
    if (violations.length === 0) {
      console.log('[validate-terminal-states] PASS — no off-enum pipeline_state/phase literals');
    } else {
      console.error(`[validate-terminal-states] FAIL — ${violations.length} off-enum literal(s):`);
      for (const v of violations) {
        console.error(`  ${v.file}:${v.line}  ${v.key}: ${v.value}  -> ${v.reason}`);
      }
    }
  }

  process.exit(violations.length === 0 ? 0 : 1);
}

main();
