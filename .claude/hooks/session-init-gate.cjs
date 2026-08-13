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
 * NOTE (P2-10 v12.7.x): The previous "metadata.requires" advisory block
 * (parseRequires/checkRequires functions, bins/env/files/min_node_version
 * checks) was removed because adoption was 4 agents (<5 threshold).
 * The field is no longer documented in skill-format.md.
 *
 * NOTE (A1-06): The previous "metadata.data_access_level" Phase-3 advisory
 * (parseDataAccessLevel/findActiveParentAgent/isTrustDowngrade functions and
 * the trusted->unverified trust-downgrade warning) was removed because
 * adoption was 0 agents and the check never fired. The field is no longer
 * documented in skill-format.md.
 */

const fs = require('fs');
const path = require('path');
const { createHook, findActiveSession, AGENT_MEMORY_DIR, PROJECT_ROOT, denyWithReason, upsertSdkSessionMap } = require('./hook-utils.cjs');

// --- metadata.requires removed (P2-10 v12.7.x) ---
// The previous parseRequires() / checkRequires() advisory block (V11.1.10)
// was removed because metadata.requires adoption was 4 agents (below the
// 5-agent threshold). The field is no longer documented in skill-format.md.
// If adoption ever crosses 5+ agents again, promote the check to
// permissionDecision: deny (not advisory) per the "decisive not advisory"
// rule from P2-10. See git history for the removed implementation.

// --- v12 alias lookup helpers (P0-2 v12.7.x) ---

/**
 * Lazily load the set of registered agent leaf names from the plugin manifest.
 *
 * Returns Set<string> of bare agent names (e.g. 'tech-lead', 'planner') when the
 * manifest was found and parsed. Returns `null` — NOT an empty Set — when the
 * manifest could not be located at all (e.g. a /team worktree-isolated subagent
 * whose sparse checkout doesn't happen to include `.claude-plugin/`, or any other
 * environment where the plugin root differs from the manifest's actual location).
 * `null` is a distinct "cannot verify" signal from a legitimately-empty catalog:
 * callers MUST treat `null` as "skip the advisory" rather than "every name is
 * unregistered" — an absent source of truth is not evidence of non-membership.
 * See the "Phase 2 registered-agent advisory (v12.62.2 regression)" describe
 * block in tests/hooks/session-init-gate.test.js for the regression this
 * distinction fixes (root cause: v12.62.2).
 */
let _registeredAgentsCache = null;
function loadRegisteredAgents(rootDir) {
  if (_registeredAgentsCache !== null) return _registeredAgentsCache;
  const manifestPath = path.join(rootDir, '.claude-plugin', 'plugin.json');
  if (!fs.existsSync(manifestPath)) {
    // Do NOT cache `null` — a later call in the same process (e.g. once the
    // manifest becomes available) should re-check rather than being pinned to
    // "unavailable" forever. In practice each hook invocation is a fresh
    // process, so this only matters for in-process test harnesses.
    return null;
  }
  const set = new Set();
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
    // Manifest exists but failed to parse — fall through with empty set (this
    // IS a legitimate "zero registered agents" signal, distinct from "file
    // absent", so it is still cached and used normally below).
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
  // Manifest not found at all (distinct from "found but empty") — we cannot
  // verify registration status one way or the other, so stay silent rather
  // than assert a false "not a registered agent" claim. See loadRegisteredAgents
  // JSDoc above.
  if (registered === null) return null;
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

// Pure handler (single source of truth). Exported so the agent-dispatch dispatcher
// (agent-dispatch.cjs) can run this SESSION-PRESENCE DENY GATE in-process FIRST. The
// dispatcher wraps this call in its own try/catch and FAILS CLOSED (deny) on throw.
const handler = async (input) => {
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
    let sessionDir = findActiveSession(input.session_id);
    // WI-3 (secondary writer): only the no-fallback findActiveSession resolution
    // (SDK-UUID map / env-var) is trustworthy enough to seed the SDK-UUID map. The
    // fallbackHeuristic path below is the newest-session heuristic, which can
    // mis-resolve under concurrent same-dir sessions — it MUST NOT seed the map.
    let confidentSeed = !!sessionDir; // trustworthy: map/env
    if (!sessionDir) {
      // H4 (v12.20.0): Claude Code's `input.session_id` is an SDK transcript UUID,
      // not a cAgents session-dir name, so the deterministic chain skips step 1.
      // If CAGENTS_ACTIVE_SESSION did NOT propagate to this hook subprocess (a
      // known unreliability), findActiveSession returns null even when a perfectly
      // valid active session dir exists on disk — and this gate would then HARD-DENY
      // EVERY Agent spawn, hanging the entire pipeline at its first delegation.
      // Fall back to the documented opt-in legacy heuristic, which resolves the
      // most-recent session that has a NON-TERMINAL status.yaml (or recent
      // session markers within the grace window). This only flips deny -> allow
      // when a genuinely-active session exists — it rejects abandoned husk dirs
      // (no status.yaml, stale mtime) — which is the safe direction for a presence
      // gate (its job is to catch orphan spawns with NO session at all).
      sessionDir = findActiveSession({ sessionHint: input.session_id, fallbackHeuristic: true });
      if (sessionDir) {
        console.error(`[SessionInitGate] findActiveSession(null) — resolved via fallbackHeuristic: ${path.basename(sessionDir)}`);
      }
    }
    if (sessionDir) {
      sessionPresent = true;
      // WI-3 (secondary writer): seed the SDK-UUID → session map on a CONFIDENT
      // resolution only (map/env — never the fallbackHeuristic newest-session path).
      // Fail-open — the upsert is already internally fail-open and the belt-and-
      // suspenders try/catch guarantees a map-write NEVER changes this gate's
      // allow/deny verdict.
      if (confidentSeed && input.session_id) {
        try { upsertSdkSessionMap(input.session_id, sessionDir); }
        catch (e) { console.error('[SessionInitGate] map upsert non-fatal: ' + (e && e.message)); }
      }
    } else {
      // No active session found — block the spawn
      const expectedPath = path.join(AGENT_MEMORY_DIR, 'sessions', '<session_id>', 'status.yaml');
      return denyWithReason({
        hook: 'SessionInitGate',
        what: 'Agent spawn blocked — no active session directory found',
        why: 'Every skill must initialize a session directory with status.yaml before spawning agents (V10.22.0 session init gate)',
        fix: `Run a skill first (/act, /team, etc.) to create the session. Expected: ${expectedPath}`
      });
    }
  }

  const subagentType = (input.tool_input && input.tool_input.subagent_type) || '';
  const cagentsMatch = subagentType.match(/^cagents:([a-zA-Z0-9_\-]+)$/);
  if (!cagentsMatch) return null; // Not a cagents:* agent; skip advisory

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
    // For alias/suggest/unknown: the old name isn't in the manifest by
    // definition, so emit the advisory and return.
    return {
      continue: true,
      systemMessage: advisories.join('\n'),
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecisionReason: aliasReason,
      },
    };
  }

  // Name is a current, registered agent and no alias applied — nothing further
  // to advise. (Phase 3 metadata.data_access_level advisory removed in A1-06:
  // 0-agent adoption, never fired.)
  return null;
};

// Suppressed when the agent-dispatch dispatcher require()s this module purely to
// import `handler` (it sets CAGENTS_DISPATCH_IMPORT before the require). Otherwise
// register at top level — both the direct `node session-init-gate.cjs` and the
// `run-hook.cjs session-init-gate` invocation paths register and read stdin normally.
if (!process.env.CAGENTS_DISPATCH_IMPORT) {
  createHook('SessionInitGate', handler);
}

module.exports = { handler };
