#!/usr/bin/env node
/**
 * Session Init Gate Hook - PreToolUse[Agent] Guard
 * cAgents V11.1.10 (P0-2 v12.7.x: aliasLookup added; P2-10 v12.7.x: metadata.requires removed)
 *
 * Responsibilities (in order):
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
 * 2. ALIAS LOOKUP (P0-2 v12.7.x):
 *    For `cagents:<name>` spawns where <name> is NOT registered in
 *    .claude-plugin/plugin.json, consult scripts/migration/v12-aliases.yaml.
 *    If <name> is a known v11 alias, emit a systemMessage naming the new
 *    target and set permissionDecisionReason so the orchestrator/router
 *    can rewrite the spawn under the new name. If not aliased, emit a
 *    Levenshtein-≤3 suggestion. Advisory only — never blocks.
 *
 * 3. METADATA.DATA_ACCESS_LEVEL ADVISORY (V12.0.6).
 *
 * NOTE (P2-10 v12.7.x): The previous "metadata.requires" advisory block
 * (parseRequires/checkRequires functions, bins/env/files/min_node_version
 * checks) was removed because adoption was 4 agents (<5 threshold).
 * The field is no longer documented in skill-format.md.
 */

const fs = require('fs');
const path = require('path');
const { createHook, findActiveSession, AGENT_MEMORY_DIR, PROJECT_ROOT, denyWithReason } = require('./hook-utils.cjs');

// --- SKILL.md lookup helper ---

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

// --- metadata.requires removed (P2-10 v12.7.x) ---
// The previous parseRequires() / checkRequires() advisory block (V11.1.10)
// was removed because metadata.requires adoption was 4 agents (below the
// 5-agent threshold). The field is no longer documented in skill-format.md.
// If adoption ever crosses 5+ agents again, promote the check to
// permissionDecision: deny (not advisory) per the "decisive not advisory"
// rule from P2-10. See git history for the removed implementation.

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

// --- v12 alias lookup helpers (P0-2 v12.7.x) ---

/**
 * Lazily load the set of registered agent leaf names from the plugin manifest.
 * Returns Set<string> of bare agent names (e.g. 'tech-lead', 'planner').
 */
let _registeredAgentsCache = null;
function loadRegisteredAgents(rootDir) {
  if (_registeredAgentsCache) return _registeredAgentsCache;
  const manifestPath = path.join(rootDir, '.claude-plugin', 'plugin.json');
  const set = new Set();
  if (!fs.existsSync(manifestPath)) {
    _registeredAgentsCache = set;
    return set;
  }
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const agents = Array.isArray(manifest.agents) ? manifest.agents : [];
    for (const rel of agents) {
      if (typeof rel !== 'string') continue;
      // Pattern: ./some/path/<agent-name>/SKILL.md OR ./some/path/<agent-name>.md
      const m1 = rel.match(/\/([a-zA-Z0-9_\-]+)\/SKILL\.md$/);
      const m2 = rel.match(/\/([a-zA-Z0-9_\-]+)\.md$/);
      if (m1) set.add(m1[1]);
      else if (m2) set.add(m2[1]);
    }
  } catch {
    // fall through with empty set
  }
  _registeredAgentsCache = set;
  return set;
}

/**
 * Lazily load v12-aliases.yaml and return a Map<oldName, {new, type, notes}>.
 * Names are stripped of the `cagents:` prefix on both sides.
 */
let _aliasMapCache = null;
function loadAliasMap(rootDir) {
  if (_aliasMapCache) return _aliasMapCache;
  const map = new Map();
  const aliasPath = path.join(rootDir, 'scripts', 'migration', 'v12-aliases.yaml');
  if (!fs.existsSync(aliasPath)) {
    _aliasMapCache = map;
    return map;
  }
  // Use js-yaml from node_modules (dependency declared in package.json).
  let yamlMod;
  try {
    yamlMod = require('js-yaml');
  } catch {
    _aliasMapCache = map;
    return map;
  }
  let doc;
  try {
    doc = yamlMod.load(fs.readFileSync(aliasPath, 'utf8'));
  } catch {
    _aliasMapCache = map;
    return map;
  }
  const aliases = Array.isArray(doc && doc.aliases) ? doc.aliases : [];
  for (const a of aliases) {
    if (!a || typeof a.old !== 'string' || typeof a.new !== 'string') continue;
    const stripCagents = s => s.startsWith('cagents:') ? s.slice('cagents:'.length) : s;
    const oldName = stripCagents(a.old);
    const newName = stripCagents(a.new);
    // Skip identity moves (old === new) — these are pure directory relocations
    // and don't need a rename notice at spawn time.
    if (oldName === newName) continue;
    map.set(oldName, { new: newName, type: a.type || 'rename', notes: a.notes || '' });
  }
  _aliasMapCache = map;
  return map;
}

/**
 * Compute Levenshtein distance between two strings (iterative DP).
 * Bounded short-circuit: returns Infinity if min possible distance > maxDist.
 */
function levenshtein(a, b, maxDist = Infinity) {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > maxDist) return Infinity;
  if (la === 0) return lb;
  if (lb === 0) return la;
  let prev = new Array(lb + 1);
  let curr = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= lb; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,        // deletion
        curr[j - 1] + 1,    // insertion
        prev[j - 1] + cost, // substitution
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDist) return Infinity;
    [prev, curr] = [curr, prev];
  }
  return prev[lb];
}

/**
 * Suggest the nearest registered agent name within `maxDist` edits.
 * Returns the suggestion string, or null if none found.
 */
function suggestNearestAgent(name, registered, maxDist = 3) {
  let best = null;
  let bestDist = maxDist + 1;
  for (const candidate of registered) {
    const d = levenshtein(name, candidate, maxDist);
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
      if (d === 0) break;
    }
  }
  return best;
}

/**
 * Main alias-lookup entry. Given the raw subagent_type string, returns:
 *   - { kind: 'alias', oldName, newName, message } when old name is in v12-aliases.yaml
 *   - { kind: 'suggest', oldName, suggestion, message } when no alias but a close registered name exists
 *   - null when the name is registered (pass-through) or no useful signal
 */
function aliasLookup(subagentType, rootDir) {
  if (typeof subagentType !== 'string') return null;
  const m = subagentType.match(/^cagents:([a-zA-Z0-9_\-]+)$/);
  if (!m) return null;
  const name = m[1];

  const registered = loadRegisteredAgents(rootDir);
  // Already a current, registered name — nothing to do.
  if (registered.has(name)) return null;

  const aliasMap = loadAliasMap(rootDir);
  const aliasHit = aliasMap.get(name);
  if (aliasHit) {
    const message =
      `cagents:${name} renamed in v12.x to cagents:${aliasHit.new}. ` +
      `Spawn will be retried under new name (see scripts/migration/v12-aliases.yaml).`;
    return { kind: 'alias', oldName: name, newName: aliasHit.new, message };
  }

  // No alias hit — surface a Levenshtein suggestion against registered agents.
  const suggestion = suggestNearestAgent(name, registered, 3);
  if (suggestion) {
    const message =
      `cagents:${name} is not a registered agent and not in v12-aliases.yaml. ` +
      `Did you mean cagents:${suggestion}?`;
    return { kind: 'suggest', oldName: name, suggestion, message };
  }
  return { kind: 'unknown', oldName: name, message: `cagents:${name} is not a registered agent.` };
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

  const subagentType = (input.tool_input && input.tool_input.subagent_type) || '';
  const cagentsMatch = subagentType.match(/^cagents:([a-zA-Z0-9_\-]+)$/);
  if (!cagentsMatch) return null; // Not a cagents:* agent; skip advisory

  const agentName = cagentsMatch[1];
  const advisories = [];
  let aliasReason = null;

  // ---- Phase 2: v12-aliases.yaml runtime resolution (P0-2 v12.7.x) ----
  const aliasResult = aliasLookup(subagentType, PROJECT_ROOT);
  if (aliasResult) {
    advisories.push(`[session-init-gate] ${aliasResult.message}`);
    // Carry the message into permissionDecisionReason so the spawning surface
    // (router/orchestrator) sees it even if systemMessage is dropped from
    // the model's context. Does NOT deny — see return value below.
    aliasReason = aliasResult.message;
    // (P2-10 v12.7.x) metadata.requires advisory removed — no per-alias
    // dependency check is performed. data_access_level is still checked
    // below in the post-alias-skip path, but only for non-aliased spawns.
    // For alias/suggest/unknown: skip the standard "find skill by old name" path
    // (the old name isn't in the manifest by definition), emit advisories, return.
    return {
      continue: true,
      systemMessage: advisories.join('\n'),
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecisionReason: aliasReason,
      },
    };
  }

  const skillPath = findAgentSkillPath(agentName, PROJECT_ROOT);
  if (!skillPath) return null; // Agent SKILL.md not found in manifest; skip silently

  // ---- Phase 3: metadata.data_access_level advisory check (V12.0.6) ----
  // (Was Phase 4 prior to P2-10 v12.7.x — Phase 3 metadata.requires removed.)
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
