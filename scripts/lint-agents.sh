#!/bin/bash
# lint-agents.sh — 25-check spec linter for all agent definition files
#
# Usage: ./scripts/lint-agents.sh [--fail-fast] [path/to/agents/...]
#
# Checks both top-level and metadata: fields to work before and after
# the WI-09 metadata migration.
#
# Exit code: 0 if all pass, 1 if any fail.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export CAGENTS_ROOT="$ROOT"
export LINT_ARGS="$*"

node --input-type=commonjs <<'NODEEOF'
'use strict';

const fs   = require('fs');
const path = require('path');
const yaml = require(path.join(process.env.CAGENTS_ROOT, 'node_modules/js-yaml/index.js'));

const ROOT      = process.env.CAGENTS_ROOT;
const args      = process.env.LINT_ARGS.split(' ').filter(Boolean);
const failFast  = args.includes('--fail-fast');
const pathArgs  = args.filter(a => !a.startsWith('--'));

// ─── Domain / field constants ────────────────────────────────────────────────

const VALID_TIERS   = new Set(['controller','execution','support','infrastructure']);
const VALID_DOMAINS = new Set([
  'engineering','creative','business','growth','people',
  'service','leadership','shared','core',
  // Future domains (may exist before WI-09)
  'science','health','education','personal','arts','trades',
]);
const VALID_COLORS  = new Set([
  'bright_white','bright_blue','bright_green','bright_yellow',
  'bright_red','bright_cyan','bright_magenta',
  'white','blue','green','yellow','red','cyan','magenta',
  'black','gray','grey',
]);
const VALID_MODELS  = new Set(['opus','opusplan','sonnet','haiku']);
// v12.68.0: agent definitions are FLAT — agents/<name>.md — because Claude Code
// discovers plugin agents with a non-recursive scan of agents/.
const AGENTS_DIR = 'agents';

// ─── Agent discovery ─────────────────────────────────────────────────────────

function findAgentFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .map(e => path.join(dir, e.name));
}

let agentFiles;
if (pathArgs.length > 0) {
  // Lint specific paths provided as arguments
  agentFiles = pathArgs.flatMap(p => {
    const abs = path.isAbsolute(p) ? p : path.join(ROOT, p);
    if (abs.endsWith('.md') && fs.existsSync(abs) && fs.statSync(abs).isFile()) return [abs];
    return findAgentFiles(abs);
  });
} else {
  agentFiles = findAgentFiles(path.join(ROOT, AGENTS_DIR));
}

agentFiles.sort();

// ─── Frontmatter parser ───────────────────────────────────────────────────────

/**
 * Parse a SKILL.md file. Returns:
 *   { raw, frontmatterRaw, frontmatterText, body, fm, parseError }
 */
function parseSkillMd(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const result = { raw, frontmatterRaw: null, frontmatterText: null, body: null, fm: null, parseError: null };

  // Check frontmatter delimiters
  const lines = raw.split('\n');
  if (lines[0] !== '---') {
    result.parseError = 'frontmatter does not start with ---';
    return result;
  }

  // Find closing ---
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') { endIdx = i; break; }
  }
  if (endIdx === -1) {
    result.parseError = 'frontmatter closing --- not found';
    return result;
  }

  result.frontmatterText = lines.slice(1, endIdx).join('\n');
  result.body = lines.slice(endIdx + 1).join('\n');
  result.frontmatterRaw = raw.slice(raw.indexOf('\n') + 1, raw.indexOf('\n---\n', 3) + 1);

  // Check for tabs
  result.hasTabs = result.frontmatterText.includes('\t');

  try {
    result.fm = yaml.load(result.frontmatterText) || {};
  } catch (e) {
    result.parseError = `YAML parse error: ${e.message}`;
    result.fm = {};
  }

  return result;
}

/**
 * Get a field that may live at top-level OR inside metadata:
 */
function getField(fm, key) {
  if (fm[key] !== undefined) return fm[key];
  if (fm.metadata && fm.metadata[key] !== undefined) return fm.metadata[key];
  return undefined;
}

function hasField(fm, key) {
  return getField(fm, key) !== undefined;
}

// ─── Check implementations ───────────────────────────────────────────────────

function runChecks(filePath, parsed) {
  const { fm, frontmatterText, body, raw, parseError, hasTabs } = parsed;
  const failures = [];

  function fail(checkNum, msg) {
    failures.push({ check: checkNum, msg });
  }

  // The agent name is the file basename (flat layout, v12.68.0)
  const dirName = path.basename(filePath, '.md');

  // Check 14 first (frontmatter structure) — needed for all other checks
  if (parsed.frontmatterRaw === null) {
    fail(14, `Frontmatter does not start with ---`);
    // Can't do other checks without frontmatter
    return failures;
  }

  const lines = raw.split('\n');
  const hasClosingDelim = lines.some((l, i) => i > 0 && l === '---');
  if (!hasClosingDelim) {
    fail(14, `Frontmatter closing --- not found`);
    return failures;
  }

  // Check 17: valid YAML
  if (parseError) {
    fail(17, parseError);
    return failures; // Can't run other checks if YAML is broken
  }

  // Check 22: no tabs in frontmatter
  if (hasTabs) fail(22, 'Tabs found in YAML frontmatter (use spaces)');

  // Check 1: name exists
  const name = fm['name'];
  if (!name) {
    fail(1, 'name field missing');
  } else {
    // Check 2: name matches directory
    if (name !== dirName) {
      fail(2, `name "${name}" does not match directory "${dirName}"`);
    }
    // Check 15: name is kebab-case
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      fail(15, `name "${name}" is not kebab-case (lowercase letters, digits, hyphens only)`);
    }
  }

  // Check 3: description exists
  const description = fm['description'];
  if (!description) {
    fail(3, 'description field missing');
  } else {
    // Check 13: not empty
    if (typeof description === 'string' && description.trim() === '') {
      fail(13, 'description field is empty');
    }
    // Check 4: length >= 20
    if (typeof description === 'string' && description.trim().length < 20) {
      fail(4, `description too short (${description.trim().length} chars, min 20)`);
    }
    // Check 5: length <= 1024
    if (typeof description === 'string' && description.length > 1024) {
      fail(5, `description too long (${description.length} chars, max 1024)`);
    }
  }

  // Check 6: tier exists and is valid
  const tier = getField(fm, 'tier');
  if (!tier) {
    fail(6, 'tier field missing (expected: controller, execution, support, infrastructure)');
  } else if (!VALID_TIERS.has(tier)) {
    fail(6, `tier "${tier}" is invalid (expected: ${[...VALID_TIERS].join(', ')})`);
  }

  // Check 7 (post-v11.1.0): archetype field required at top-level.
  // Legacy `domain:` field is tolerated (lives in metadata in the v11.1.0 schema)
  // but no longer required. If present at top-level OR in metadata, it must be a
  // recognized legacy domain.
  const VALID_ARCHETYPES = new Set([
    'developer','operator','advisor','analyst','creator',
    'writer','strategist','core','leadership',
  ]);
  const archetype = fm['archetype'];  // top-level only — metadata.archetype is not the contract
  if (!archetype) {
    fail(7, 'archetype field missing (required at top-level since v11.1.0)');
  } else if (!VALID_ARCHETYPES.has(archetype)) {
    fail(7, `archetype "${archetype}" is not a recognized archetype (expected: ${[...VALID_ARCHETYPES].join(', ')})`);
  }
  const domain = getField(fm, 'domain');
  if (domain && !VALID_DOMAINS.has(domain)) {
    fail(7, `legacy domain "${domain}" is not a recognized domain`);
  }

  // Check 8: no permissionMode field
  if (fm['permissionMode'] !== undefined || (fm.metadata && fm.metadata['permissionMode'] !== undefined)) {
    fail(8, 'permissionMode field found (banned by spec — remove it)');
  }

  // Check 9: allowed-tools exists and is a string
  const allowedTools = fm['allowed-tools'];
  if (allowedTools === undefined) {
    fail(9, 'allowed-tools field missing (should be a space-delimited string)');
  } else if (typeof allowedTools !== 'string') {
    fail(9, `allowed-tools must be a string, got ${typeof allowedTools}`);
  }

  // Check 10 & 11: controller-specific fields
  if (tier === 'controller') {
    const coordStyle = getField(fm, 'coordination_style');
    if (!coordStyle) {
      fail(10, 'tier=controller requires coordination_style field');
    }
    const typicalQ = getField(fm, 'typical_questions');
    if (!typicalQ) {
      fail(11, 'tier=controller requires typical_questions field');
    }
  }

  // Check 12: capabilities is an array (if present)
  const capabilities = getField(fm, 'capabilities');
  if (capabilities !== undefined && !Array.isArray(capabilities)) {
    fail(12, `capabilities must be an array, got ${typeof capabilities}`);
  }

  // Check 18: vibe <= 80 chars (if present)
  const vibe = getField(fm, 'vibe');
  if (vibe !== undefined && typeof vibe === 'string' && vibe.length > 80) {
    fail(18, `vibe is ${vibe.length} chars (max 80)`);
  }

  // Check 19: maxTurns is a number (if present)
  const maxTurns = getField(fm, 'maxTurns');
  if (maxTurns !== undefined && typeof maxTurns !== 'number') {
    fail(19, `maxTurns must be a number, got ${typeof maxTurns}`);
  }

  // Check 20: color is valid (if present)
  const color = getField(fm, 'color');
  if (color !== undefined && !VALID_COLORS.has(color)) {
    fail(20, `color "${color}" is not a recognized color value`);
  }

  // Check 21: no tools field (deprecated)
  if (fm['tools'] !== undefined) {
    fail(21, 'tools field found (deprecated — use allowed-tools instead)');
  }

  // Check 23: model is valid (if present)
  const model = getField(fm, 'model');
  if (model !== undefined) {
    // model may be quoted
    const modelStr = String(model).trim();
    if (!VALID_MODELS.has(modelStr)) {
      fail(23, `model "${modelStr}" is invalid (expected: ${[...VALID_MODELS].join(', ')})`);
    }
  }

  // Check 24: body content exists
  if (!body || body.trim() === '') {
    fail(24, 'No body content after frontmatter');
  }

  // Check 25: file size < 50KB
  const stats = fs.statSync(filePath);
  if (stats.size >= 50 * 1024) {
    fail(25, `File size ${Math.round(stats.size/1024)}KB exceeds 50KB limit`);
  }

  return failures;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const TOTAL_CHECKS = 25;
let passed = 0;
let failed = 0;
const allNames = new Map(); // name -> [filePaths] for Check 16

// First pass: collect all names for duplicate check
const parsedFiles = agentFiles.map(fp => ({ fp, parsed: parseSkillMd(fp) }));
for (const { fp, parsed } of parsedFiles) {
  const name = parsed.fm && parsed.fm['name'];
  if (name) {
    if (!allNames.has(name)) allNames.set(name, []);
    allNames.get(name).push(fp);
  }
}

console.log(`Linting ${agentFiles.length} agents...\n`);

for (const { fp, parsed } of parsedFiles) {
  const rel = path.relative(ROOT, fp).replace(/\\/g, '/');
  const failures = runChecks(fp, parsed);

  // Check 16: duplicate names
  const name = parsed.fm && parsed.fm['name'];
  if (name) {
    const dupes = allNames.get(name);
    if (dupes && dupes.length > 1) {
      const others = dupes.filter(p => p !== fp).map(p => path.relative(ROOT, p));
      failures.push({ check: 16, msg: `name "${name}" is duplicated in: ${others.join(', ')}` });
    }
  }

  // Sort failures by check number
  failures.sort((a, b) => a.check - b.check);

  const checksPassed = TOTAL_CHECKS - failures.length;
  if (failures.length === 0) {
    console.log(`[PASS] ${rel} (${TOTAL_CHECKS}/${TOTAL_CHECKS})`);
    passed++;
  } else {
    failed++;
    for (const f of failures) {
      console.log(`[FAIL] ${rel} - Check ${f.check}: ${f.msg}`);
    }
    if (failFast) {
      console.log(`\nFail-fast: stopping after first failure.`);
      process.exit(1);
    }
  }
}

const total = passed + failed;
console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
NODEEOF
