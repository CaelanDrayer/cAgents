#!/usr/bin/env node
/**
 * Session Init Gate Hook - PreToolUse[Agent] Guard
 * cAgents V11.1.10 (P0-2 v12.7.x: aliasLookup added; P2-10 v12.7.x: metadata.requires removed)
 *
 * Responsibilities (in order):
 *
 * 0. SCOPE GUARD (RF-2, v12.70.0):
 *    Only `cagents:<name>` spawns are inspected at all. `Explore`,
 *    `general-purpose`, `Plan`, and bare user-defined agent names return
 *    immediately — cAgents has no business gating the harness's own
 *    delegation. Before this guard the presence check below keyed on
 *    `tool_name === 'Agent'` alone, so on a machine with no cAgents session
 *    directory EVERY delegation was denied, including Claude Code's built-in
 *    subagents. That turned a cAgents-internal invariant into a global
 *    "the parent must do all the work itself" failure.
 *
 * 1. SESSION PRESENCE CHECK — ADVISORY, SELF-HEALING (RF-1, v12.70.0):
 *    NEVER DENIES. Originally (V10.22.0) this denied any Agent spawn with no
 *    resolvable session directory, to catch orphan spawns. In practice the
 *    denied population was dominated by LEGITIMATE spawns:
 *      - C1: `cagents-memory/` is git-ignored, so a fresh clone / fresh plugin
 *            install has no `sessions/` dir at all -> every spawn denied.
 *      - C2: a session in ANY terminal state (VALIDATED / complete / failed /
 *            aborted / incomplete) can no longer resolve -> a successful /act
 *            could not spawn a single follow-up agent.
 *      - C3: dev machines only "worked" because abandoned non-terminal husk
 *            dirs kept the fallback heuristic satisfied. Clean machines denied.
 *    The gate now SELF-HEALS (creates the missing `cagents-memory/sessions/`
 *    scaffold) and ALLOWS, attaching a loud, BRANCH-SPECIFIC systemMessage +
 *    permissionDecisionReason naming what was missing, what was auto-created,
 *    and the remediation for that exact branch. Fail-open, never fail-silent.
 *
 *    NOTE: the gate deliberately does NOT fabricate a session directory with a
 *    synthetic `pipeline_state`. A fake non-terminal session would be picked up
 *    by verify-completion.cjs (Stop) and could `decision: 'block'` an ordinary
 *    conversation; a fake terminal one would never resolve and would be
 *    re-created on every spawn. Scaffold-only is the self-heal that has no
 *    downstream blast radius.
 *
 *    Bypass: CAGENTS_SESSION_ID env var set AND session dir does NOT yet exist —
 *    skill is currently creating the session directory using that ID. Skip the
 *    presence check entirely so the session can bootstrap. If the dir already
 *    exists, fall through to the standard findActiveSession check.
 *    RR-1 (review round 2): that bypass still ALLOWS, but no longer SILENTLY.
 *    It was the last path in this gate that degraded with no notice at all;
 *    it now pushes `bootstrapWindowNotice()` like every other absence branch.
 *
 *    FALLBACK-HEURISTIC VISIBILITY (RF-5): when the spawn is authorised by the
 *    newest-non-terminal-session heuristic rather than the deterministic
 *    SDK-UUID map, that fact is reported TO THE MODEL (systemMessage), not just
 *    to stderr. A month-old abandoned `designer_*` dir silently authorising
 *    production spawns is exactly the failure this makes impossible to miss.
 *
 * 2. ALIAS LOOKUP (P0-2 v12.7.x; catalog root fixed in RF-3, v12.70.0):
 *    For `cagents:<name>` spawns where <name> is NOT in the flat `agents/`
 *    catalog, consult scripts/migration/v12-aliases.yaml.
 *    The catalog and the alias map are PLUGIN content, so they resolve from
 *    PLUGIN_ROOT (`__dirname`-anchored) first, never from PROJECT_ROOT alone.
 *    Before RF-3 a user project that merely HAPPENED to contain an `agents/`
 *    directory (a conventional name) had that foreign directory read as the
 *    cAgents catalog, and every single `cagents:*` spawn was told — in
 *    permissionDecisionReason, the most authoritative channel — that the agent
 *    it just tried to spawn "is not a registered agent". The predictable model
 *    response is to stop delegating. A directory is now only trusted as the
 *    catalog when the CATALOG_SENTINEL below is present inside it.
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
const {
  createHook,
  findActiveSession,
  AGENT_MEMORY_DIR,
  PROJECT_ROOT,
  PLUGIN_ROOT,
  SESSION_PREFIXES,
  safeRead,
  extractYamlValue,
  isTerminalState,
  upsertSdkSessionMap,
} = require('./hook-utils.cjs');

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
  // v12.68.0: the catalog is the flat agents/ directory, not a manifest array.
  // Claude Code discovers plugin agents with a non-recursive scan of agents/,
  // so agents/<name>.md IS the registration — plugin.json no longer lists them.
  const agentsDir = path.join(rootDir, 'agents');
  let entries;
  try {
    entries = fs.readdirSync(agentsDir, { withFileTypes: true });
  } catch {
    // Directory absent/unreadable — "cannot verify", NOT "nothing registered".
    // Do NOT cache `null`: a later call in the same process (e.g. once the
    // checkout completes) should re-check rather than being pinned to
    // "unavailable" forever. In practice each hook invocation is a fresh
    // process, so this only matters for in-process test harnesses.
    return null;
  }
  const set = new Set();
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const name = entry.name.slice(0, -'.md'.length);
    if (/^[a-zA-Z0-9_-]+$/.test(name)) set.add(name);
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

// ============================================================
// RF-3: catalog root resolution (PLUGIN_ROOT, sentinel-verified)
// ============================================================

// A directory is only trusted as THE cAgents agent catalog when this file
// exists inside it. `planner` is a core pipeline agent that has existed in
// every version of the catalog and is not a name a foreign `agents/` directory
// would plausibly contain. Without a sentinel, any project-local `agents/`
// directory (a very common name) is silently read as the cAgents catalog and
// every real agent is reported unregistered — see the RF-3 note in the header.
const CATALOG_SENTINEL = path.join('agents', 'planner.md');

/**
 * Resolve the directory that holds the cAgents agent catalog + alias map.
 *
 * Order: PLUGIN_ROOT (correct by construction — hook-utils anchors it on
 * `__dirname` and verifies CLAUDE.md) then PROJECT_ROOT (local-dev shape where
 * the plugin IS the project). BOTH are sentinel-verified, so a foreign
 * `agents/` directory can never be mistaken for the catalog.
 *
 * Returns `null` when no candidate is provably the cAgents catalog. Callers
 * MUST treat `null` as "skip the advisory entirely" — the v12.62.2 contract:
 * an absent source of truth is not evidence of non-membership.
 */
function resolveCatalogRoot() {
  for (const root of [PLUGIN_ROOT, PROJECT_ROOT]) {
    if (!root) continue;
    try {
      if (fs.existsSync(path.join(root, CATALOG_SENTINEL))) return root;
    } catch { /* unreadable candidate — try the next one */ }
  }
  return null;
}

// ============================================================
// RF-5: observability helpers (every degrade is visible TO THE MODEL)
// ============================================================

/**
 * One-line environment self-check appended to every degrade/advisory notice.
 * Makes an install-shape problem (stale plugin version, partial checkout,
 * empty catalog) diagnosable from the transcript instead of a forensic dig.
 */
function envFingerprint() {
  const catalogRoot = resolveCatalogRoot();
  let version = 'unknown';
  try {
    const raw = fs.readFileSync(path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'), 'utf8');
    const m = raw.match(/"version"\s*:\s*"([^"]+)"/);
    if (m) version = m[1];
  } catch { /* keep 'unknown' — never throw from a diagnostic */ }
  let agentCount = 'unreadable';
  try {
    agentCount = String(
      fs.readdirSync(path.join(catalogRoot || PLUGIN_ROOT, 'agents'), { withFileTypes: true })
        .filter(e => e.isFile() && e.name.endsWith('.md')).length
    );
  } catch { /* keep 'unreadable' */ }
  return `[session-init-gate] SELF-CHECK: cAgents v${version} | agents/=${agentCount} | ` +
         `plugin_root=${PLUGIN_ROOT} | project_root=${PROJECT_ROOT} | ` +
         `catalog_root=${catalogRoot || 'NOT-FOUND (registered-agent advisory disabled)'}`;
}

/**
 * Classify WHY no session resolved, so the notice can carry the remediation
 * for the branch actually taken instead of a single generic "Run a skill
 * first" that is wrong in three of the four branches.
 *
 * Branches: 'absent-dir' | 'empty-dir' | 'all-terminal' | 'orphan' | 'unreadable'.
 */
function classifySessionAbsence() {
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    return { branch: 'absent-dir', sessionsDir, total: 0, states: [] };
  }
  let entries;
  try {
    entries = fs.readdirSync(sessionsDir, { withFileTypes: true });
  } catch (err) {
    // RF-4: "I could not look" is NOT "there is nothing there".
    const errno = (err && err.code) || 'EUNKNOWN';
    const raw = (err && err.message) || String(err);
    return {
      branch: 'unreadable',
      sessionsDir,
      errno,
      // Node prefixes fs messages with `ERRNO: ` — strip it so the notice does
      // not read `EACCES: EACCES: permission denied`.
      detail: raw.replace(new RegExp(`^${errno}:\\s*`), ''),
      states: [],
    };
  }
  const sessions = entries
    .filter(e => e.isDirectory() && SESSION_PREFIXES.some(p => e.name.startsWith(p)))
    .map(e => e.name);
  if (sessions.length === 0) {
    return { branch: 'empty-dir', sessionsDir, total: 0, states: [] };
  }
  let terminal = 0;
  const states = [];
  for (const s of sessions) {
    const content = safeRead(path.join(sessionsDir, s, 'status.yaml'))
      || safeRead(path.join(sessionsDir, s, 'session.yaml'));
    if (!content) continue;
    const st = extractYamlValue(content, 'pipeline_state')
      || extractYamlValue(content, 'phase')
      || extractYamlValue(content, 'current_phase');
    if (st && isTerminalState(st)) {
      terminal += 1;
      states.push(`${s}=${st}`);
    }
  }
  const branch = (terminal > 0 && terminal === sessions.length) ? 'all-terminal' : 'orphan';
  return { branch, sessionsDir, total: sessions.length, terminal, states };
}

/**
 * RF-1 self-heal: create the missing `cagents-memory/sessions/` scaffold.
 * Scaffold ONLY — see the header note on why no synthetic session directory is
 * fabricated. Never throws: a failure to create is reported, not raised (the
 * spawn is allowed either way).
 */
function selfHealSessionScaffold(diag) {
  if (diag.branch !== 'absent-dir') return { created: false, error: null };
  try {
    fs.mkdirSync(diag.sessionsDir, { recursive: true });
    return { created: true, error: null };
  } catch (err) {
    return { created: false, error: err };
  }
}

/** Build the loud, branch-specific ALLOW notice for an unresolved session. */
function absenceNotice(diag, heal) {
  const head =
    '[session-init-gate] SESSION PRESENCE: no active cAgents session resolved for this spawn. ' +
    'ALLOWING the spawn — this presence check is ADVISORY (it never denies).';
  let detail;
  switch (diag.branch) {
    case 'absent-dir':
      detail = heal.created
        ? `CAUSE: this project had no \`cagents-memory/sessions/\` at all — a fresh clone or a first-time ` +
          `plugin install (\`cagents-memory/\` is git-ignored, so it never arrives with the repo). ` +
          `AUTO-CREATED: ${diag.sessionsDir}. `
        : `CAUSE: this project had no \`cagents-memory/sessions/\` at all, and it could NOT be created ` +
          `(${heal.error && heal.error.code}: ${heal.error && heal.error.message}). Continuing WITHOUT a session store. `;
      detail += 'FIX: nothing is required to delegate. Run `/act` or `/team` if you want a TRACKED session ' +
                '(plan.yaml, work_items.yaml, coordination_log.yaml, validation_report.yaml).';
      break;
    case 'empty-dir':
      detail = `CAUSE: \`${diag.sessionsDir}\` exists but holds no session directories. ` +
               'FIX: nothing is required to delegate. Run `/act` or `/team` to create a tracked session.';
      break;
    case 'all-terminal':
      detail = `CAUSE: all ${diag.total} session(s) under \`${diag.sessionsDir}\` are in a TERMINAL state ` +
               `(${diag.states.slice(0, 3).join(', ')}${diag.states.length > 3 ? `, +${diag.states.length - 3} more` : ''}). ` +
               'A terminal session can no longer authorise spawns — that is by design, not a fault. ' +
               'FIX: start a NEW session with `/act` (or `/team`); do NOT resume the finished one. ' +
               'Delegation is NOT blocked in the meantime.';
      break;
    case 'unreadable':
      detail = `CAUSE: \`${diag.sessionsDir}\` could not be read (${diag.errno}: ${diag.detail}). ` +
               'That is "I could not look", NOT "there is nothing there" — FAILING OPEN. ' +
               'FIX: check permissions / mount state for that path (network home, container bind-mount, SELinux).';
      break;
    default: // 'orphan'
      detail = `CAUSE: ${diag.total} session director(y|ies) exist under \`${diag.sessionsDir}\` but none is resolvable ` +
               `(${diag.terminal} terminal, ${diag.total - diag.terminal} with no readable/non-terminal status.yaml). ` +
               'FIX: start a NEW session with `/act` (or `/team`), or set CAGENTS_ACTIVE_SESSION to the session ' +
               'that owns this spawn. Delegation is NOT blocked in the meantime.';
      break;
  }
  return `${head}\n${detail}\n${envFingerprint()}`;
}

/**
 * RF-5 (FS-8): the fallback heuristic resolved this spawn against SOME session
 * on disk — possibly an abandoned one from months ago. Say so, to the model.
 */
function heuristicNotice(sessionDir) {
  let mtime = 'unknown';
  try { mtime = new Date(fs.statSync(sessionDir).mtimeMs).toISOString(); } catch { /* keep 'unknown' */ }
  return '[session-init-gate] SPAWN AUTHORISED VIA FALLBACK HEURISTIC against ' +
         `\`${path.basename(sessionDir)}\` (last modified ${mtime}) — THIS IS NOT YOUR SESSION. ` +
         'The deterministic chain (SDK-UUID map -> CAGENTS_ACTIVE_SESSION) did not resolve, so the newest ' +
         'non-terminal session directory on disk was used instead. Artifacts this spawn writes through the ' +
         'session hooks may land in THAT session. FIX: start your own session with `/act`, or set ' +
         'CAGENTS_ACTIVE_SESSION.\n' + envFingerprint();
}

/**
 * RF-5 (LOW-2, review round 1): the agent catalog could not be found, so the
 * registered-agent / alias advisory is DISABLED for this spawn. That degrade was
 * previously INVISIBLE — `aliasResult` went null, no notice was pushed, and the
 * gate emitted a bare `{continue:true}`. `envFingerprint()` does report
 * `catalog_root=NOT-FOUND`, but it is only reachable from `absenceNotice` /
 * `heuristicNotice`, so in the common shape (session resolves fine, catalog
 * missing) nothing at all was emitted. RF-5's own doctrine is that every degrade
 * is visible TO THE MODEL, not stderr-only — so say it, naming WHAT was looked
 * for and WHERE it was looked for.
 *
 * FAIL-OPEN, exactly as before: this is a notice on a `continue: true` verdict.
 * A missing catalog must never deny or block a spawn — an absent source of truth
 * is not evidence of non-membership (the v12.62.2 contract).
 */
function catalogMissingNotice() {
  const candidates = [PLUGIN_ROOT, PROJECT_ROOT].filter(Boolean);
  return '[session-init-gate] AGENT CATALOG NOT FOUND — the registered-agent / v12-alias ' +
         `advisory is DISABLED for this spawn (the spawn itself is ALLOWED). Looked for the ` +
         `sentinel \`${CATALOG_SENTINEL}\` under: ${candidates.join(', ') || '(no candidate roots)'}. ` +
         'Nothing there is provably the cAgents catalog, so a rename/typo in the agent name ' +
         'will NOT be caught or corrected on this spawn. FIX: check the plugin checkout is ' +
         'complete (a sparse/partial worktree missing `agents/` is the usual cause), or set ' +
         'CLAUDE_PLUGIN_ROOT to the cAgents root.\n' + envFingerprint();
}

/**
 * RF-5 (RR-1, review round 2): the documented BOOTSTRAP WINDOW bypass — a skill
 * sets CAGENTS_SESSION_ID *before* it creates the session directory, so a
 * not-yet-existing dir must not be read as an orphan spawn. That bypass was the
 * last SILENT-ALLOW path left in this gate: it set `sessionPresent = true`,
 * skipped `classifySessionAbsence()` entirely, and pushed NO notice — so the
 * model was told nothing at all, which contradicts RF-5's own claim that every
 * degrade reaches the model. Every other absence branch reports itself; this one
 * now does too.
 *
 * FAIL-OPEN, unchanged: a notice on a `continue: true` verdict. The bypass
 * itself is CORRECT (during bootstrap the directory genuinely does not exist
 * yet) — what was wrong was doing it in silence.
 *
 * ponytail: deliberately omits `envFingerprint()` (rung 6 — smallest notice that
 * names cause + remedy). Unlike the five absence branches this is an EXPECTED
 * state with a known cause, not an install-shape problem, so the self-check line
 * would be pure noise on a path that fires during ordinary skill bootstrap. The
 * session id is taken from the path basename rather than re-read from the
 * environment, so the helper is a pure function of its argument.
 */
function bootstrapWindowNotice(sessionDir) {
  return '[session-init-gate] SESSION BOOTSTRAP WINDOW: CAGENTS_SESSION_ID is set but its session ' +
         'directory does not exist yet. ALLOWING the spawn and BYPASSING the presence check — a ' +
         'skill is presumed mid-bootstrap (it sets the env var before it creates the directory).\n' +
         `CAUSE: CAGENTS_SESSION_ID=${path.basename(sessionDir)} resolves to \`${sessionDir}\`, ` +
         'which is not on disk.\n' +
         'FIX: if nothing is bootstrapping, that env var names a session directory that was never ' +
         'created (or has since been removed) — this spawn and its artifacts will NOT be tracked in ' +
         'any session until it exists. Create one by running `/act` (or `/team`), or unset ' +
         'CAGENTS_SESSION_ID so the normal presence check runs.';
}

/**
 * Assemble the hook verdict. Notices go to BOTH systemMessage and
 * permissionDecisionReason: the reason channel survives even when
 * systemMessage is dropped from the model's context, and RF-5 requires every
 * degraded path to be visible somewhere other than stderr. Returns `null`
 * (=> plain `{continue:true}`) only when nothing at all happened.
 */
function emitVerdict(notices, aliasReason) {
  if (notices.length === 0 && !aliasReason) return null;
  const reasonParts = notices.slice();
  if (aliasReason) reasonParts.push(aliasReason);
  return {
    continue: true,
    systemMessage: reasonParts.join('\n'),
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecisionReason: reasonParts.join('\n'),
    },
  };
}

// Pure handler (single source of truth). Exported so the agent-dispatch dispatcher
// (agent-dispatch.cjs) can run this gate in-process FIRST. The dispatcher wraps this
// call in its own try/catch; a genuine LOGIC throw still fails closed there, while an
// I/O errno fails OPEN and loud (RF-4).
const handler = async (input) => {
  const toolName = input.tool_name || '';

  // Only inspect Agent tool calls (agent spawns)
  if (toolName !== 'Agent') return null;

  // ---- Phase 0 (RF-2): scope guard — only cagents:* spawns are ours ----
  // `Explore`, `general-purpose`, `Plan`, bare user-agent names, and payloads
  // with no subagent_type at all are the HARNESS's own delegation. Gating them
  // is out of scope and, when the presence check below degraded, was the
  // mechanism that forced parents to absorb all work themselves.
  const subagentType = (input.tool_input && input.tool_input.subagent_type) || '';
  const cagentsMatch = subagentType.match(/^cagents:([a-zA-Z0-9_\-]+)$/);
  if (!cagentsMatch) return null;

  // Notices accumulated across phases; surfaced to the model at the end.
  const notices = [];

  // ---- Phase 1: Session presence check — ADVISORY + SELF-HEALING (RF-1) ----

  // Bypass only when the session dir doesn't exist yet — skill is bootstrapping
  let sessionPresent = false;
  if (process.env.CAGENTS_SESSION_ID) {
    const sessionDir = path.join(AGENT_MEMORY_DIR, 'sessions', process.env.CAGENTS_SESSION_ID);
    if (!fs.existsSync(sessionDir)) {
      // RR-1: keep ALLOWING (this is the documented bootstrap window), but never
      // in silence — the absence classifier is skipped here, so this branch must
      // name itself exactly as the five classified branches do.
      console.error(
        `[SessionInitGate] CAGENTS_SESSION_ID set but ${sessionDir} does not exist — ` +
        'ALLOWING (bootstrap window; presence check BYPASSED).'
      );
      notices.push(bootstrapWindowNotice(sessionDir));
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
    let viaHeuristic = false;
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
        viaHeuristic = true;
        console.error(`[SessionInitGate] findActiveSession(null) — resolved via fallbackHeuristic: ${path.basename(sessionDir)}`);
      }
    }
    if (sessionDir) {
      sessionPresent = true;
      // RF-5 (FS-8): a heuristic resolution is a DEGRADED path. Stderr alone let a
      // month-old abandoned session silently authorise production spawns for months.
      if (viaHeuristic) notices.push(heuristicNotice(sessionDir));
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
      // RF-1 SELF-HEAL: no session resolved. Classify WHY, create the missing
      // scaffold, and ALLOW with a branch-specific notice. This path previously
      // denied — and denied C1/C2/C3 (clean checkout / terminal session /
      // no-litter machine) far more often than it caught a genuine orphan.
      const diag = classifySessionAbsence();
      const heal = selfHealSessionScaffold(diag);
      console.error(
        `[SessionInitGate] no active session (branch=${diag.branch}, dir=${diag.sessionsDir}, ` +
        `created=${heal.created}) — ALLOWING (advisory presence check).`
      );
      notices.push(absenceNotice(diag, heal));
      sessionPresent = true;
    }
  }

  let aliasReason = null;

  // ---- Phase 2: v12-aliases.yaml runtime resolution (P0-2 v12.7.x) ----
  // RF-3: resolve the catalog from the sentinel-verified PLUGIN_ROOT, never
  // from a project directory that merely happens to contain `agents/`.
  const catalogRoot = resolveCatalogRoot();
  if (!catalogRoot) {
    // RF-5 / LOW-2: do not degrade in silence. Fail OPEN (notice on a
    // continue-verdict), never deny.
    console.error('[SessionInitGate] agent catalog NOT FOUND — registered-agent advisory disabled (ALLOWING).');
    notices.push(catalogMissingNotice());
  }
  const aliasResult = catalogRoot ? aliasLookup(subagentType, catalogRoot) : null;
  if (aliasResult) {
    // Carry the message into permissionDecisionReason so the spawning surface
    // (router/orchestrator) sees it even if systemMessage is dropped from
    // the model's context. Does NOT deny.
    aliasReason = `[session-init-gate] ${aliasResult.message}`;
  }

  // Name is a current, registered agent and no alias applied => notices only
  // (usually none => null => plain {continue:true}). (Phase 3
  // metadata.data_access_level advisory removed in A1-06: 0-agent adoption.)
  return emitVerdict(notices, aliasReason);
};

// Suppressed when the agent-dispatch dispatcher require()s this module purely to
// import `handler` (it sets CAGENTS_DISPATCH_IMPORT before the require). Otherwise
// register at top level — both the direct `node session-init-gate.cjs` and the
// `run-hook.cjs session-init-gate` invocation paths register and read stdin normally.
if (!process.env.CAGENTS_DISPATCH_IMPORT) {
  createHook('SessionInitGate', handler);
}

module.exports = {
  handler,
  // Exported for the RF-1/RF-3/RF-5 regression tests (and for anyone auditing
  // which branch a given on-disk shape lands in).
  resolveCatalogRoot,
  classifySessionAbsence,
  absenceNotice,
  heuristicNotice,
  catalogMissingNotice,
  bootstrapWindowNotice,
  envFingerprint,
  CATALOG_SENTINEL,
};
