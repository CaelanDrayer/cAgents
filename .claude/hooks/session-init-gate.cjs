#!/usr/bin/env node
/**
 * Session Init Gate Hook - PreToolUse[Agent] Guard
 * cAgents V11.1.10
 *
 * Two responsibilities (in order):
 *
 * 1. SESSION DIRECTORY GATE (V10.22.0):
 *    Denies agent spawns (Agent tool calls) when no active session directory
 *    with status.yaml exists. Enforces the V10.22.0 session initialization
 *    gate: every skill must create its session dir before spawning agents.
 *
 *    Bypass: CAGENTS_SESSION_ID env var set AND session dir does NOT yet exist —
 *    skill is currently creating the session directory using that ID. Allow the
 *    spawn so the session can bootstrap. If the dir already exists, fall through
 *    to the standard findActiveSession check.
 *
 * 2. METADATA.REQUIRES ADVISORY GATE (V11.1.10):
 *    After session presence is confirmed, looks up the spawning agent's SKILL.md
 *    via the plugin manifest, parses metadata.requires (bins/env/files/min_node_version),
 *    and emits an advisory systemMessage if any declared dependency is missing.
 *    DOES NOT BLOCK — purely advisory v1 enforcement. Agents without
 *    metadata.requires are unaffected.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createHook, findActiveSession, AGENT_MEMORY_DIR, PROJECT_ROOT, denyWithReason } = require('./hook-utils.cjs');

// --- metadata.requires helpers (V11.1.10) ---

/**
 * Locate the SKILL.md for a `cagents:<name>` agent by scanning the plugin manifest.
 * Returns absolute path to the SKILL.md, or null if not found.
 */
function findAgentSkillPath(agentName, rootDir) {
  if (!agentName) return null;
  const manifestPath = path.join(rootDir, '.claude-plugin', 'plugin.json');
  if (!fs.existsSync(manifestPath)) return null;
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return null;
  }
  const agents = Array.isArray(manifest.agents) ? manifest.agents : [];
  // Match agents whose path ends with /<name>/SKILL.md or /<name>.md
  const needle1 = `/${agentName}/SKILL.md`;
  const needle2 = `/${agentName}.md`;
  for (const rel of agents) {
    if (typeof rel !== 'string') continue;
    if (rel.endsWith(needle1) || rel.endsWith(needle2)) {
      // Strip leading "./"
      const cleanRel = rel.replace(/^\.\//, '');
      const abs = path.join(rootDir, cleanRel);
      if (fs.existsSync(abs)) return abs;
    }
  }
  return null;
}

/**
 * Extract metadata.requires block from SKILL.md frontmatter.
 * Uses simple line-scan parsing (no js-yaml dependency at hook level for fast cold-start).
 * Returns { bins, env, files, min_node_version } object, or null if no `requires:` block.
 */
function parseRequires(skillPath) {
  let raw;
  try {
    raw = fs.readFileSync(skillPath, 'utf8');
  } catch {
    return null;
  }
  // Extract frontmatter between first two '---' lines
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const fm = fmMatch[1];

  // Find metadata: block (top-level key with no leading whitespace)
  const lines = fm.split('\n');
  let inMetadata = false;
  let inRequires = false;
  let requiresIndent = -1; // indent level of `requires:` key
  const result = { bins: null, env: null, files: null, min_node_version: null };
  let currentSubKey = null;       // 'bins' | 'env' | 'files' | null
  let currentSubItems = [];       // accumulator for list items

  function flushSubKey() {
    if (currentSubKey && Array.isArray(currentSubItems)) {
      result[currentSubKey] = currentSubItems.slice();
    }
    currentSubKey = null;
    currentSubItems = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Detect end-of-frontmatter (handled by regex), so we just iterate
    const indent = line.match(/^(\s*)/)[1].length;
    const stripped = line.trim();

    if (!inMetadata) {
      if (/^metadata\s*:\s*$/.test(line)) {
        inMetadata = true;
      }
      continue;
    }

    // Inside metadata block: must be indented > 0 to remain inside
    if (stripped !== '' && indent === 0) {
      // Left metadata block (next top-level key at column 0)
      flushSubKey();
      break;
    }

    if (!inRequires) {
      // Look for `requires:` as direct child of metadata (typically indent 2)
      const reqMatch = line.match(/^(\s+)requires\s*:\s*$/);
      if (reqMatch) {
        requiresIndent = reqMatch[1].length;
        inRequires = true;
        continue;
      }
      // Inline form: `requires: { ... }` — skip (rare; handled via fallback)
      const inlineReq = line.match(/^(\s+)requires\s*:\s*\{(.*)\}\s*$/);
      if (inlineReq) {
        // Best-effort inline parse: try JSON-like
        try {
          const obj = JSON.parse(inlineReq[2]
            .replace(/(['"])?([a-zA-Z_][a-zA-Z0-9_]*)\1\s*:/g, '"$2":')
            .replace(/'/g, '"'));
          // Coerce
          if (Array.isArray(obj.bins)) result.bins = obj.bins;
          if (Array.isArray(obj.env)) result.env = obj.env;
          if (Array.isArray(obj.files)) result.files = obj.files;
          if (typeof obj.min_node_version === 'string') result.min_node_version = obj.min_node_version;
        } catch {}
        inRequires = true; // mark as found (no further block to parse)
      }
      continue;
    }

    // Inside requires block. Allowed indents:
    // - sub-key at indent = requiresIndent + 2 (e.g. "    bins:")
    // - list item at indent = requiresIndent + 4 (e.g. "      - npx")
    if (stripped === '') continue;
    if (indent <= requiresIndent) {
      // Left requires block
      flushSubKey();
      inRequires = false;
      // Re-process this line for metadata bounds
      i--;
      continue;
    }

    // Sub-key form: "<indent+2>bins:" or "<indent+2>bins: [a, b]"
    const subKeyMatch = line.match(/^(\s+)(bins|env|files|min_node_version)\s*:\s*(.*)$/);
    if (subKeyMatch && subKeyMatch[1].length === requiresIndent + 2) {
      flushSubKey();
      const key = subKeyMatch[2];
      const inlineVal = subKeyMatch[3].trim();
      if (key === 'min_node_version') {
        // Strip quotes
        const m = inlineVal.match(/^["']?([0-9.]+)["']?$/);
        if (m) result.min_node_version = m[1];
        continue;
      }
      // bins | env | files
      if (inlineVal === '' || inlineVal === '[]') {
        // Block list follows OR empty list
        if (inlineVal === '[]') {
          result[key] = [];
        } else {
          currentSubKey = key;
          currentSubItems = [];
        }
        continue;
      }
      // Inline list: "[a, b, c]"
      const inlineListMatch = inlineVal.match(/^\[(.*)\]$/);
      if (inlineListMatch) {
        const items = inlineListMatch[1]
          .split(',')
          .map(s => s.trim().replace(/^["']|["']$/g, ''))
          .filter(s => s.length > 0);
        result[key] = items;
        continue;
      }
      continue;
    }

    // List item: "- value" at indent = requiresIndent + 4 (under bins/env/files)
    const listItemMatch = line.match(/^(\s+)-\s*(.+)$/);
    if (listItemMatch && currentSubKey && listItemMatch[1].length === requiresIndent + 4) {
      const val = listItemMatch[2].trim().replace(/^["']|["']$/g, '');
      currentSubItems.push(val);
      continue;
    }
  }
  flushSubKey();

  // Return null if no requires block at all was found
  const found = result.bins !== null || result.env !== null || result.files !== null || result.min_node_version !== null;
  return found ? result : null;
}

/**
 * Check declared dependencies. Returns array of missing dependency strings.
 */
function checkRequires(requires, rootDir) {
  const missing = [];
  if (Array.isArray(requires.bins)) {
    for (const bin of requires.bins) {
      if (!bin) continue;
      try {
        execSync(`command -v ${JSON.stringify(bin)}`, { stdio: 'ignore', shell: '/bin/bash' });
      } catch {
        missing.push(`bin:${bin}`);
      }
    }
  }
  if (Array.isArray(requires.env)) {
    for (const ev of requires.env) {
      if (!ev) continue;
      if (!process.env[ev]) missing.push(`env:${ev}`);
    }
  }
  if (Array.isArray(requires.files)) {
    for (const f of requires.files) {
      if (!f) continue;
      const abs = path.isAbsolute(f) ? f : path.join(rootDir, f);
      if (!fs.existsSync(abs)) missing.push(`file:${f}`);
    }
  }
  if (typeof requires.min_node_version === 'string' && requires.min_node_version) {
    const required = requires.min_node_version;
    const actual = process.versions.node;
    // Best-effort: compare major.minor.patch numerically
    const parse = v => v.split('.').map(n => parseInt(n, 10) || 0);
    const [rMaj, rMin, rPat] = parse(required);
    const [aMaj, aMin, aPat] = parse(actual);
    const ok = (aMaj > rMaj)
      || (aMaj === rMaj && aMin > rMin)
      || (aMaj === rMaj && aMin === rMin && aPat >= rPat);
    if (!ok) missing.push(`node:${actual}<${required}`);
  }
  return missing;
}

// --- metadata.data_access_level helpers (V12.0.6) ---

/**
 * Extract metadata.data_access_level from SKILL.md frontmatter.
 * Returns 'trusted' | 'verified' | 'unverified' | null.
 */
function parseDataAccessLevel(skillPath) {
  let raw;
  try {
    raw = fs.readFileSync(skillPath, 'utf8');
  } catch {
    return null;
  }
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const fm = fmMatch[1];
  const lines = fm.split('\n');
  let inMetadata = false;
  for (const line of lines) {
    const indent = line.match(/^(\s*)/)[1].length;
    const stripped = line.trim();
    if (!inMetadata) {
      if (/^metadata\s*:\s*$/.test(line)) inMetadata = true;
      continue;
    }
    if (stripped !== '' && indent === 0) break; // left metadata block
    const m = line.match(/^\s+data_access_level\s*:\s*["']?([a-zA-Z_]+)["']?\s*$/);
    if (m) {
      const val = m[1].toLowerCase();
      if (val === 'trusted' || val === 'verified' || val === 'unverified') return val;
      return null;
    }
  }
  return null;
}

/**
 * Find the most-recently-spawned still-active parent agent in agent_tree.yaml.
 * Returns the cagents:<name> string, or null if none found.
 * Heuristic: scan agent_tree.yaml lines for `agent_type:` entries lacking a
 * matching `stopped_at:` and return the latest. Best-effort; never throws.
 */
function findActiveParentAgent(sessionDir) {
  if (!sessionDir) return null;
  const treePath = path.join(sessionDir, 'workflow', 'agent_tree.yaml');
  if (!fs.existsSync(treePath)) return null;
  let raw;
  try {
    raw = fs.readFileSync(treePath, 'utf8');
  } catch {
    return null;
  }
  const lines = raw.split('\n');
  let lastActiveAgent = null;
  let currentAgent = null;
  let currentHasStop = false;
  for (const line of lines) {
    const atMatch = line.match(/^\s*-?\s*agent_type\s*:\s*["']?(cagents:[a-zA-Z0-9_\-]+)["']?\s*$/);
    if (atMatch) {
      // Flush previous
      if (currentAgent && !currentHasStop) lastActiveAgent = currentAgent;
      currentAgent = atMatch[1];
      currentHasStop = false;
      continue;
    }
    if (/^\s*stopped_at\s*:/.test(line)) currentHasStop = true;
  }
  if (currentAgent && !currentHasStop) lastActiveAgent = currentAgent;
  return lastActiveAgent;
}

/**
 * Determine whether a parent->child trust-tier downgrade should fire an advisory.
 * Returns true for: trusted->unverified, verified->unverified.
 */
function isTrustDowngrade(parentLevel, childLevel) {
  if (!parentLevel || !childLevel) return false;
  if (childLevel !== 'unverified') return false;
  return parentLevel === 'trusted' || parentLevel === 'verified';
}

createHook('SessionInitGate', async (input) => {
  const toolName = input.tool_name || '';

  // Only gate Agent tool calls (agent spawns)
  if (toolName !== 'Agent') return null;

  // ---- Phase 1: Session presence check (V10.22.0) ----

  // Bypass only when the session dir doesn't exist yet — skill is bootstrapping
  let sessionPresent = false;
  if (process.env.CAGENTS_SESSION_ID) {
    const sessionDir = path.join(AGENT_MEMORY_DIR, 'sessions', process.env.CAGENTS_SESSION_ID);
    if (!fs.existsSync(sessionDir)) {
      sessionPresent = true; // bypass session check
    }
    // Otherwise fall through
  }

  if (!sessionPresent) {
    const sessionDir = findActiveSession(input.session_id);
    if (sessionDir) {
      sessionPresent = true;
    } else {
      // No active session found — block the spawn
      const expectedPath = path.join(AGENT_MEMORY_DIR, 'sessions', '<session_id>', 'status.yaml');
      return denyWithReason({
        hook: 'SessionInitGate',
        what: 'Agent spawn blocked — no active session directory found',
        why: 'Every skill must initialize a session directory with status.yaml before spawning agents (V10.22.0 session init gate)',
        fix: `Run a skill first (/run, /team, etc.) to create the session. Expected: ${expectedPath}`
      });
    }
  }

  // ---- Phase 2: metadata.requires advisory check (V11.1.10) ----

  const subagentType = (input.tool_input && input.tool_input.subagent_type) || '';
  const cagentsMatch = subagentType.match(/^cagents:([a-zA-Z0-9_\-]+)$/);
  if (!cagentsMatch) return null; // Not a cagents:* agent; skip advisory

  const agentName = cagentsMatch[1];
  const skillPath = findAgentSkillPath(agentName, PROJECT_ROOT);
  if (!skillPath) return null; // Agent SKILL.md not found in manifest; skip silently

  const advisories = [];

  const requires = parseRequires(skillPath);
  if (requires) {
    const missing = checkRequires(requires, PROJECT_ROOT);
    if (missing.length > 0) {
      advisories.push(
        `[session-init-gate] Agent ${subagentType} declares metadata.requires but missing: ${missing.join(', ')}. Spawn proceeding (advisory only — not blocking).`
      );
    }
  }

  // ---- Phase 3: metadata.data_access_level advisory check (V12.0.6) ----
  const childLevel = parseDataAccessLevel(skillPath);
  if (childLevel === 'unverified') {
    const sessionDir = findActiveSession(input.session_id);
    const parentAgent = findActiveParentAgent(sessionDir);
    if (parentAgent) {
      const parentMatch = parentAgent.match(/^cagents:([a-zA-Z0-9_\-]+)$/);
      if (parentMatch) {
        const parentSkillPath = findAgentSkillPath(parentMatch[1], PROJECT_ROOT);
        const parentLevel = parentSkillPath ? parseDataAccessLevel(parentSkillPath) : null;
        if (isTrustDowngrade(parentLevel, childLevel)) {
          advisories.push(
            `[session-init-gate] Trust-tier downgrade: ${parentAgent} (${parentLevel}) -> ${subagentType} (${childLevel}). Spawn proceeding (advisory only — not blocking).`
          );
        }
      }
    }
  }

  if (advisories.length === 0) return null;

  // Advisory warning(s) — does NOT block. permissionDecision unchanged.
  return {
    continue: true,
    systemMessage: advisories.join('\n')
  };
});
