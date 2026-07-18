#!/usr/bin/env node
/**
 * Controller Delegation Validator Hook - Enforce controller delegation protocol
 * cAgents V10.26.0 - PreToolUse hook for enforcing delegation protocol
 *
 * Detects when controller-tier agents attempt to write implementation files directly
 * instead of delegating to execution agents via Agent tool.
 *
 * Enforcement is CONTROLLER-SCOPED (B1, v12.18.0): it applies ONLY when an active
 * cAgents controller is detected in the current session's agent_tree.yaml. With no
 * active cAgents session/controller, this hook is a no-op — it NEVER blocks an
 * ordinary direct user edit to src/, services/, etc. outside a cAgents workflow.
 *
 * WI-P3 (audit remediation, this file): the CONTROLLER-SCOPED gate previously keyed
 * off "is ANY controller-tier agent still active anywhere in the tree" — which is
 * exactly the state a controller is in while it is SYNCHRONOUSLY awaiting its own
 * spawned executor (per the Synchronous Spawning contract in controllers.md, a
 * controller's `stopped_at` stays null for the whole time its executor is running).
 * That wrongly HARD-DENIED the executor's own legitimate src/ write. The fix
 * resolves the ACTIVE WRITER — the deepest (or most-recently-spawned) still-active
 * agent_tree.yaml entry — and only treats the write as a controller-violation when
 * the WRITER ITSELF resolves (at runtime, via its SKILL.md `metadata.tier`) to
 * controller/infrastructure/support/unresolvable. An execution-tier writer is
 * always allowed, even while an ancestor controller is still active. This also
 * replaces the previous hardcoded (and stale) CONTROLLER_TYPES allow/deny list with
 * a runtime SKILL.md lookup, so newly-added or renamed controllers (leadership,
 * coordinator, dual-mode agents) are recognized without a hook edit.
 *
 * Modes (CAGENTS_DELEGATION_ENFORCEMENT env var > settings.json > default 'block'):
 *   - block (default): deny controller writes to HARD-DENY paths
 *     (src/ lib/ components/ app/ services/ middleware/); warn on softer paths.
 *   - warn: warn on all controller implementation writes, never deny.
 *   - off:  no-op.
 *

 * Input (stdin): JSON with tool_name, tool_input from PreToolUse event
 * Output (stdout): JSON with systemMessage warning when violation detected
 */

const path = require('path');
const fs = require('fs');
const { createHook, findActiveSession, safeRead, PLUGIN_ROOT } = require('./hook-utils.cjs');

// Resolve enforcement mode: env var > settings.json > default 'block'.
// B1 (v12.18.0): default is now 'block' (was 'warn'). Because enforcement is
// controller-scoped (only fires when an active cAgents controller is in
// agent_tree.yaml), defaulting to block makes the delegation contract the docs
// describe actually load-bearing WITHOUT denying ordinary direct user edits.
// `CAGENTS_DELEGATION_ENFORCEMENT=warn` (or settings.json delegation_enforcement)
// is the documented escape hatch to downgrade to advisory-only.
function getEnforcementMode() {
  const envMode = (process.env.CAGENTS_DELEGATION_ENFORCEMENT || '').toLowerCase().trim();
  if (['warn', 'block', 'off'].includes(envMode)) return envMode;

  // Fallback: read from settings.json
  try {
    const settingsPath = path.join(__dirname, '..', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const settingsMode = (settings.delegation_enforcement || '').toLowerCase().trim();
    if (['warn', 'block', 'off'].includes(settingsMode)) return settingsMode;
  } catch { /* ignore read/parse errors */ }

  return 'block';
}

// HARD-DENY implementation paths: the canonical "a controller MUST NOT write
// here directly" prefixes from CLAUDE.md / delegation.md. B1 (v12.18.0) adds
// services/ and middleware/ to this set (previously warn-only).
//
// SCOPING (B1, v12.18.0): the hard-deny is CONTROLLER-SCOPED — it fires only
// when an active cAgents controller is detected in agent_tree.yaml. It is NOT
// session/controller-independent. The earlier P1-7 (v12.7.1) unconditional
// hard-deny was justified by depth-1 `Agent`-tool stripping making agent_tree
// unreliable; as of v12.17.0 / Claude Code 2.1.172 that stripping is obsolete
// (subagents retain `Agent` and self-register reliably), so the original
// justification no longer holds. An unconditional deny would be a footgun: it
// would also block the USER's own legitimate direct edits to src/ outside any
// cAgents workflow. Scoping to an active controller enforces exactly the rule
// the docs describe ("controllers never write src/lib/components/app/services/
// middleware") without breaking ordinary direct user edits.
const HARD_DENY_PATTERNS = [
  /(?:^|\/)src\//,
  /(?:^|\/)lib\//,
  /(?:^|\/)components\//,
  /(?:^|\/)app\//,
  /(?:^|\/)services\//,
  /(?:^|\/)middleware\//,
];

// Softer implementation patterns (warn-only when a controller is active).
const IMPLEMENTATION_PATTERNS = [
  /\bpages\//, /\broutes\//, /\butils\//, /\btests?\//, /\bspec\//,
  /\bgodot\//, /\bcontent\//, /\bscripts\/(?!ci\/)/,
  /\.(js|ts|tsx|jsx|py|rs|go|java|rb|php|cs|cpp|c|h)$/
];

// Workflow/session files controllers ARE allowed to write.
// WI-P3 (bug c fix): the previous patterns (/workflow\//, /coordination_log/,
// /agent_tree/) were UNANCHORED bare substrings, so an implementation file that
// merely CONTAINED one of those substrings in its path bypassed enforcement
// entirely — e.g. `src/workflow/engine.ts`, `lib/coordination_log_writer.ts`,
// `src/auth/agent_tree_builder.ts` all matched `workflow\/`/`coordination_log`/
// `agent_tree` and slipped past HARD-DENY. Those three bare patterns are
// dropped. The remaining `cagents-memory/`, `.md`, and `.ya?ml` patterns
// already cover every LEGITIMATE controller write (plan.yaml, status.yaml,
// coordination_log.yaml, agent_tree.yaml, and any file under
// cagents-memory/) because every one of those legitimate paths ends in
// `.yaml`/`.yml`/`.md` or lives under `cagents-memory/`. `.ya?ml$` also
// collapses the previous separate `\.yaml$` / `\.yml$` entries into one.
const ALLOWED_PATTERNS = [
  /(?:^|\/)cagents-memory\//,
  /\.md$/,
  /\.ya?ml$/,
];

// ============================================================
// Runtime tier resolution (WI-P3, bug b fix)
// ============================================================
// Replaces the previous hardcoded CONTROLLER_TYPES list (which missed 12 of 26
// controllers — all 9 leadership agents, `coordinator`, and dual-mode
// `security-engineer`/`sales-strategist` — and still listed 15 pre-consolidation
// agent names that no longer exist on disk) with a runtime lookup of each
// agent's own SKILL.md `metadata.tier` field. This tracks the live catalog
// automatically: a renamed, added, or consolidated agent is picked up on the
// next lookup with no hook edit required.
//
// Candidate paths are built from the fixed v11.1.0 archetype/branch grid
// (skill-format.md) rather than a recursive directory walk — the grid is
// small (~20 combinations) and static, so this is the minimal-solution-ladder
// rung (cheap fixed lookup beats a repo-wide recursive scan on every write).
const ARCHETYPES_3LEVEL = {
  developer: ['backend', 'frontend', 'fullstack', 'infrastructure', 'quality'],
  operator: ['support', 'business-ops', 'people-ops', 'marketing-sales', 'content'],
  advisor: ['legal', 'health', 'education', 'personal'],
};
const ARCHETYPES_FLAT = ['analyst', 'creator', 'writer', 'strategist', 'core', 'leadership'];

function _candidateSkillPaths(bareName) {
  const candidates = [];
  for (const archetype of Object.keys(ARCHETYPES_3LEVEL)) {
    for (const branch of ARCHETYPES_3LEVEL[archetype]) {
      candidates.push(path.join(PLUGIN_ROOT, 'agents', archetype, branch, bareName, 'SKILL.md'));
    }
  }
  for (const archetype of ARCHETYPES_FLAT) {
    candidates.push(path.join(PLUGIN_ROOT, 'agents', archetype, bareName, 'SKILL.md'));
  }
  return candidates;
}

// Module-level cache: name -> tier ('controller'|'execution'|'infrastructure'|
// 'support'|null). Avoids re-walking the candidate grid for repeated writes by
// the same agent within one hook process lifetime.
const _tierCache = new Map();

/**
 * Resolve a bare agent name (e.g. "tech-lead", "cagents:backend-developer") to
 * its declared `metadata.tier` by reading its SKILL.md frontmatter. Returns
 * null when the agent cannot be found or its frontmatter has no `tier:` field
 * — callers MUST treat a null result as "unresolved" and apply their own
 * fail-safe (see handler() below: unresolved is treated as controller-tier for
 * the deny decision, never silently allowed).
 *
 * @param {string} bareNameRaw
 * @returns {string|null}
 */
function resolveAgentTier(bareNameRaw) {
  if (!bareNameRaw) return null;
  const bareName = bareNameRaw.replace(/^cagents:/, '');
  if (_tierCache.has(bareName)) return _tierCache.get(bareName);

  let tier = null;
  for (const candidate of _candidateSkillPaths(bareName)) {
    const content = safeRead(candidate);
    if (!content) continue;
    // Scope the tier lookup to the frontmatter block (between the first two
    // `---` lines) so a stray "tier:"-looking word in the SKILL.md body prose
    // can never be picked up.
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const frontmatter = fmMatch ? fmMatch[1] : content;
    const tierMatch = frontmatter.match(/^\s*tier:\s*["']?([a-z]+)["']?/mi);
    if (tierMatch) {
      tier = tierMatch[1].toLowerCase();
      break;
    }
  }
  _tierCache.set(bareName, tier);
  return tier;
}

// ============================================================
// Agent-tree entry parsing + active-writer resolution (WI-P3, bug a fix)
// ============================================================

/**
 * Parse agent_tree.yaml via js-yaml when it holds the production flat shape
 * (`agents: [...]`, as written by subagent-tracker.cjs — each entry carries
 * `cagents_type`/`agent_type`, `stopped_at`, `depth`, `spawned_at`). Returns
 * null (triggering the line-based fallback) when js-yaml is unavailable, the
 * content fails to parse, or the parsed object has no usable `agents` array
 * (e.g. the nested `root: {children: [...]}` shape used by some test
 * fixtures) — per the hooks self-contained rule, js-yaml is required()'d
 * inside a try/catch so a missing node_modules never crashes the hook.
 *
 * WI-R2: each entry ALSO captures `id` (from `id` or the legacy `agent_id`
 * fixture spelling) and `parent` (a sentinel string like `pipeline`/`controller`/
 * `root`, or another entry's `id`). Both are tolerant — an entry lacking them
 * parses with those fields null. They feed the lineage-scoped ancestor walk in
 * the handler (see _classifyExecutionWriter); every previously-captured field is
 * preserved.
 *
 * @param {string} treeContent
 * @returns {Array<{bare:string, id:string|null, parent:string|null, stopped:boolean, depth:number|null, spawnedAt:string|null, order:number}>|null}
 */
function _parseEntriesViaYaml(treeContent) {
  let yamlLib;
  try { yamlLib = require('js-yaml'); } catch { return null; }
  try {
    const parsed = yamlLib.load(treeContent);
    if (!parsed || !Array.isArray(parsed.agents)) return null;
    return parsed.agents
      .map((a, idx) => {
        const rawBare = a && (a.cagents_type || a.agent_type);
        if (!rawBare) return null;
        const bare = String(rawBare).replace(/^cagents:/, '');
        if (!bare) return null;
        const rawStopped = a.stopped_at;
        const stopped = !(rawStopped === null || rawStopped === undefined || rawStopped === '' || rawStopped === '~');
        const rawId = (a.id != null) ? a.id : a.agent_id;
        return {
          bare,
          id: (rawId != null && rawId !== '') ? String(rawId) : null,
          parent: (a.parent != null && a.parent !== '') ? String(a.parent) : null,
          stopped,
          depth: typeof a.depth === 'number' ? a.depth : null,
          spawnedAt: a.spawned_at ? String(a.spawned_at) : null,
          order: idx
        };
      })
      .filter(Boolean);
  } catch {
    return null;
  }
}

/**
 * Entry-boundary-safe line-based fallback (mirrors the pre-existing H1 fix in
 * the former findActiveController): a new logical entry opens on each
 * `cagents_type:`/`agent_type:` line; `stopped_at:`/`depth:`/`spawned_at:`
 * lines seen before the NEXT entry opens belong to the entry currently being
 * parsed. Used when the tree is not the flat `agents:` shape (or js-yaml is
 * unavailable) — e.g. the nested `root: {children: [...]}` shape some test
 * fixtures use, which still parses fine as plain text via this scan.
 *
 * WI-R2: this fallback ALSO captures `id`/`agent_id` and `parent`. Real trees
 * emit `id:`/`parent:` on lines that can PRECEDE the `cagents_type:` line that
 * opens a logical entry, so field order is handled via the leading `-`
 * list-item marker: a `- id:`/`- parent:` line starts a NEW list item and is
 * buffered for the entry that the next `cagents_type:` opens; a non-dash
 * continuation `id:`/`parent:` line belongs to the current (already-open)
 * entry. Tolerant: entries with no id/parent keep those fields null.
 *
 * @param {string} treeContent
 * @returns {Array<{bare:string, id:string|null, parent:string|null, stopped:boolean, depth:number|null, spawnedAt:string|null, order:number}>}
 */
function _parseEntriesViaLines(treeContent) {
  const entries = [];
  let current = null;
  let order = 0;
  // Buffers for id/parent seen on a list-item-opening (`- …`) line BEFORE the
  // entry's cagents_type line appears; consumed when that entry opens.
  let pendingId = null;
  let pendingParent = null;
  const flush = () => {
    if (current && current.bare) entries.push(current);
  };
  for (const line of treeContent.split('\n')) {
    const tMatch = line.match(/^\s*-?\s*(?:cagents_type|agent_type)\s*:\s*["']?cagents:([a-zA-Z0-9_\-]+)["']?\s*$/);
    if (tMatch) {
      flush();
      current = {
        bare: tMatch[1],
        id: pendingId,
        parent: pendingParent,
        stopped: false,
        depth: null,
        spawnedAt: null,
        order: order++
      };
      pendingId = null;
      pendingParent = null;
      continue;
    }
    // id / agent_id — capture whether it precedes or follows the type line.
    const idMatch = line.match(/^(\s*)(-?)\s*(?:id|agent_id)\s*:\s*["']?([^"'\n]+?)["']?\s*$/);
    if (idMatch) {
      const hasDash = idMatch[2] === '-';
      const val = idMatch[3].trim();
      if (!hasDash && current && current.id == null) current.id = val;
      else pendingId = val; // dash => opens a new item => belongs to the next entry
      continue;
    }
    // parent — same field-order handling.
    const pMatch = line.match(/^(\s*)(-?)\s*parent\s*:\s*["']?([^"'\n]+?)["']?\s*$/);
    if (pMatch) {
      const hasDash = pMatch[2] === '-';
      const val = pMatch[3].trim();
      if (!hasDash && current && current.parent == null) current.parent = val;
      else pendingParent = val;
      continue;
    }
    if (!current) continue;
    const sMatch = line.match(/^\s*stopped_at\s*:\s*(.*)$/);
    if (sMatch) {
      const val = sMatch[1].trim().replace(/^["']|["']$/g, '');
      if (val && val !== 'null' && val !== '~') current.stopped = true;
      continue;
    }
    const dMatch = line.match(/^\s*depth\s*:\s*(\d+)\s*$/);
    if (dMatch) {
      current.depth = parseInt(dMatch[1], 10);
      continue;
    }
    const spMatch = line.match(/^\s*spawned_at\s*:\s*["']?([^"'\n]+)["']?\s*$/);
    if (spMatch) {
      current.spawnedAt = spMatch[1].trim();
      continue;
    }
  }
  flush();
  return entries;
}

function _parseAgentTreeEntries(treeContent) {
  if (!treeContent) return [];
  const viaYaml = _parseEntriesViaYaml(treeContent);
  if (viaYaml && viaYaml.length) return viaYaml;
  return _parseEntriesViaLines(treeContent);
}

/**
 * Resolve the ACTIVE WRITER: the still-active (stopped_at absent/null) agent
 * best positioned to be the one actually performing the current write. This
 * is the deepest active entry (a controller synchronously awaiting its own
 * spawned executor stays active the whole time — see the Synchronous
 * Spawning contract in controllers.md — so depth is what distinguishes "the
 * controller that is merely still open" from "the executor that is actually
 * writing"), tie-broken by the most recent spawned_at, tie-broken by document
 * order (later entry wins) when depth/timestamps are absent or tied — this
 * degrades gracefully to the legacy "last active entry" behavior for older
 * agent_tree.yaml shapes that carry no depth/spawned_at.
 *
 * @param {Array} entries parsed agent-tree entries.
 * @returns {object|null} the winning active ENTRY, or null when no agent is
 *   currently active (a fully-stopped tree, or an empty tree — both mean this
 *   write is either a direct user edit or came after every spawned agent
 *   already finished).
 */
function _selectActiveWriterEntry(entries) {
  const activeEntries = entries.filter(e => !e.stopped);
  if (activeEntries.length === 0) return null;

  let best = activeEntries[0];
  for (let i = 1; i < activeEntries.length; i++) {
    const cand = activeEntries[i];
    const bestDepth = best.depth == null ? -1 : best.depth;
    const candDepth = cand.depth == null ? -1 : cand.depth;
    if (candDepth > bestDepth) { best = cand; continue; }
    if (candDepth < bestDepth) { continue; }
    // Depth tie (including both-null) -> compare spawned_at.
    const bestTime = best.spawnedAt ? Date.parse(best.spawnedAt) : NaN;
    const candTime = cand.spawnedAt ? Date.parse(cand.spawnedAt) : NaN;
    if (!isNaN(candTime) && !isNaN(bestTime)) {
      if (candTime > bestTime) { best = cand; continue; }
      if (candTime < bestTime) { continue; }
      // Exact timestamp tie -> fall through to document-order tiebreak below.
    }
    // Order tiebreak: a later document-order entry wins.
    if (cand.order > best.order) { best = cand; }
  }
  return best;
}

/**
 * @param {string} treeContent
 * @returns {string|null} bare agent name of the active writer, or null when no
 *   agent is active. Signature preserved for the direct unit-test imports;
 *   selection logic is byte-equivalent to the pre-WI-R2 implementation (now
 *   factored into _selectActiveWriterEntry so the handler can also read the
 *   winning entry's lineage fields).
 */
function findActiveWriter(treeContent) {
  const best = _selectActiveWriterEntry(_parseAgentTreeEntries(treeContent));
  return best ? best.bare : null;
}

/**
 * Walk `parent` links UP from a writer entry looking for an ACTIVE
 * controller-tier ancestor. Terminates when the parent is absent, a sentinel /
 * unknown id (not in idMap — e.g. `pipeline`/`controller`/`root`), a cycle is
 * detected, or a hop cap is hit.
 *
 * @param {object} writerEntry
 * @param {Map<string,object>} idMap
 * @returns {boolean} true iff an active controller is an ancestor of writerEntry.
 */
function _hasActiveControllerAncestor(writerEntry, idMap) {
  const seen = new Set();
  let cursor = writerEntry;
  let hops = 0;
  const MAX_HOPS = 100;
  while (cursor && hops < MAX_HOPS) {
    hops++;
    const parentId = cursor.parent;
    if (parentId == null) break;               // no parent -> lineage terminates
    const key = String(parentId);
    if (seen.has(key)) break;                  // cycle guard
    seen.add(key);
    const parentEntry = idMap.get(key);
    if (!parentEntry) break;                    // sentinel/unknown -> terminates
    if (!parentEntry.stopped && resolveAgentTier(parentEntry.bare) === 'controller') {
      return true;
    }
    cursor = parentEntry;
  }
  return false;
}

/**
 * Pick a deterministic "offending" controller to name in the deny message when
 * an execution-tier writer has no active-controller ancestor but an active
 * controller exists elsewhere: deepest active controller, tie-broken by
 * document order (later wins), matching _selectActiveWriterEntry's convention.
 *
 * @param {Array<object>} activeControllers non-empty list of active controller entries.
 * @returns {object}
 */
function _pickOffendingController(activeControllers) {
  let best = activeControllers[0];
  for (let i = 1; i < activeControllers.length; i++) {
    const cand = activeControllers[i];
    const bestDepth = best.depth == null ? -1 : best.depth;
    const candDepth = cand.depth == null ? -1 : cand.depth;
    if (candDepth > bestDepth) { best = cand; continue; }
    if (candDepth < bestDepth) { continue; }
    if (cand.order > best.order) { best = cand; }
  }
  return best;
}

/**
 * Classify an execution-tier active writer as ALLOW or a fail-closed DENY.
 * Principle: only DENY when misattribution is PROVABLE — never over-block on
 * ambiguity. Cases:
 *   - parent UNRESOLVABLE (absent, or a SENTINEL like pipeline/controller/root,
 *     or an unknown id not present in the tree): lineage is AMBIGUOUS — we
 *     cannot prove the executor sits under a different, non-masking controller
 *     — so fall back to the legacy depth/order heuristic -> ALLOW. This is the
 *     COMMON production shape (subagent-tracker.cjs::inferParentAgent emits
 *     `parent: pipeline` for most execution agents), so treating a sentinel as
 *     "lineage present" would reintroduce the exact P3 over-block (a legitimate
 *     executor writing src/ while its controller synchronously awaits it).
 *   - parent RESOLVES to a real entry whose chain reaches an ACTIVE controller:
 *     legitimate delegated write -> ALLOW (T1/B).
 *   - parent RESOLVES but its chain reaches NO active controller, and NO active
 *     controller exists anywhere: B1 no-op -> ALLOW (never block a direct edit).
 *   - parent RESOLVES to a real entry, its chain reaches NO active controller,
 *     yet an active controller EXISTS elsewhere: the executor is provably under
 *     a different (non-masking) lineage while a controller is active elsewhere
 *     -> the real writer is that controller, misattributed to this executor ->
 *     FAIL CLOSED (deny/warn), naming that controller.
 *
 * @param {object} writerEntry
 * @param {Array<object>} entries
 * @returns {{action:'allow'} | {action:'deny', controllerBare:string}}
 */
function _classifyExecutionWriter(writerEntry, entries) {
  const idMap = new Map();
  for (const e of entries) {
    if (e.id != null) idMap.set(String(e.id), e);
  }

  // The fail-closed DENY is eligible ONLY when the writer's parent resolves to
  // a REAL tree entry (so we can positively establish its lineage). A sentinel
  // (pipeline/controller/root), an unknown/unresolvable id, or an absent parent
  // means lineage is AMBIGUOUS — fall back to the legacy depth/order heuristic
  // and ALLOW, exactly as the no-parent case does. This preserves the P3
  // over-block fix for the common `parent: pipeline` execution-agent shape.
  const parentKey = writerEntry.parent != null ? String(writerEntry.parent) : null;
  if (parentKey == null || !idMap.has(parentKey)) return { action: 'allow' };

  if (_hasActiveControllerAncestor(writerEntry, idMap)) return { action: 'allow' };

  const activeControllers = entries.filter(
    e => !e.stopped && resolveAgentTier(e.bare) === 'controller'
  );
  if (activeControllers.length === 0) return { action: 'allow' }; // B1 no-op

  return { action: 'deny', controllerBare: _pickOffendingController(activeControllers).bare };
}

// H1 (v12.20.0): entry-scoped active-controller detection, RETAINED for
// back-compat (tests/hooks/controller-delegation-entry-boundary.test.js
// imports this function directly). WI-P3 changed the type check from the
// static (and stale) CONTROLLER_TYPES list to a runtime tier resolution via
// resolveAgentTier(), but the entry-boundary parsing semantics (a new logical
// entry opens on each `cagents_type:` line; the LAST entry in document order
// that is both active AND controller-tier wins) are unchanged. The handler()
// below no longer calls this function — it uses findActiveWriter() + tier
// resolution instead (see the bug-a fix in the module docblock) — but the
// function is preserved and exported because it is unit-tested directly.
function findActiveController(treeContent) {
  if (!treeContent) return null;
  let active = null;
  let currentBare = null;
  let currentStopped = false;
  const flush = () => {
    if (currentBare && !currentStopped && resolveAgentTier(currentBare) === 'controller') {
      active = currentBare;
    }
  };
  for (const line of treeContent.split('\n')) {
    const tMatch = line.match(/^\s*-?\s*(?:cagents_type|agent_type)\s*:\s*["']?cagents:([a-zA-Z0-9_\-]+)["']?\s*$/);
    if (tMatch) {
      flush(); // close out the previous entry before starting a new one
      currentBare = tMatch[1];
      currentStopped = false;
      continue;
    }
    const sMatch = line.match(/^\s*stopped_at\s*:\s*(.*)$/);
    if (sMatch) {
      const val = sMatch[1].trim().replace(/^["']|["']$/g, '');
      if (val && val !== 'null' && val !== '~') currentStopped = true;
    }
  }
  flush(); // close out the final entry
  return active;
}

// Pure handler (single source of truth). Exported so the D1b Write|Edit dispatcher
// (write-edit-dispatch.cjs) can run this GOVERNANCE DENY GATE in-process. The
// dispatcher wraps this call in its own try/catch and FAILS CLOSED (deny) on throw.
// The standalone createHook() registration below is preserved so this hook still
// works if ever registered individually.
async function handler(input) {
  const mode = getEnforcementMode();
  console.error(`[ControllerDelegationValidator] enforcement_mode=${mode}`);

  if (mode === 'off') return null;

  const toolName = input.tool_name || '';
  if (!['Write', 'Edit'].includes(toolName)) return null;

  const filePath = (input.tool_input || {}).file_path || '';
  if (!filePath) return null;

  // Skip if writing to allowed paths (workflow files, session files, YAML/MD)
  if (ALLOWED_PATTERNS.some(p => p.test(filePath))) return null;

  // Classify the target path.
  const isHardDeny = HARD_DENY_PATTERNS.some(p => p.test(filePath));
  const isImplementation = isHardDeny || IMPLEMENTATION_PATTERNS.some(p => p.test(filePath));
  if (!isImplementation) return null;

  // B1 (v12.18.0): CONTROLLER-SCOPED enforcement. Enforcement applies ONLY when
  // an active cAgents controller is detected in the current session's
  // agent_tree.yaml. With no active cAgents session/controller (i.e. the USER
  // is making an ordinary direct edit), this hook is a no-op — it never blocks
  // direct user edits to src/, services/, etc. This closes the footgun where a
  // default-on `block` mode would deny the user's own legitimate edits outside
  // any cAgents workflow.
  let sessionDir = findActiveSession(input.session_id);
  if (!sessionDir) {
    // H3 (v12.20.0): `input.session_id` is an SDK transcript UUID and
    // CAGENTS_ACTIVE_SESSION may not propagate to this hook subprocess, so the
    // deterministic chain returns null. Without a fallback the GOVERNANCE gate
    // would SILENTLY FAIL-OPEN: a controller's illegal write to src/ (etc.) would
    // slip through unchecked because the agent_tree active-writer probe below
    // never runs. Fall back to the documented opt-in legacy heuristic, which
    // resolves the most-recent session with a non-terminal status.yaml, so the
    // active-writer check can still fire. If no active session exists (or the
    // resolved session has no active agent), this remains a no-op — correct
    // for an ordinary direct user edit outside any cAgents workflow.
    sessionDir = findActiveSession({ sessionHint: input.session_id, fallbackHeuristic: true });
    if (!sessionDir) return null;
    console.error(`[ControllerDelegationValidator] findActiveSession(null) — resolved via fallbackHeuristic: ${path.basename(sessionDir)}`);
  }

  const agentTreePath = path.join(sessionDir, 'workflow', 'agent_tree.yaml');
  const agentTreeContent = safeRead(agentTreePath);
  if (!agentTreeContent) return null;

  // WI-P3 (bug a + b fix): resolve the ACTIVE WRITER (the deepest/most-recent
  // still-active agent_tree.yaml entry, regardless of type — see
  // findActiveWriter() docblock) rather than "is any controller-tier agent
  // active anywhere in the tree". A controller stays `stopped_at: null` for
  // the entire time it is synchronously awaiting its own spawned executor
  // (Synchronous Spawning contract, controllers.md), so scanning for "any
  // active controller" wrongly hard-denied the EXECUTOR's own legitimate
  // src/ write. Resolving the actual writer and checking ITS tier fixes that
  // while preserving B1 (no active writer at all -> no-op, never blocks a
  // direct user edit).
  // WI-R2: parse the tree ONCE so the handler can read the winning writer's
  // lineage fields (parent/id), not just its bare name. _selectActiveWriterEntry
  // selection is byte-equivalent to the pre-WI-R2 findActiveWriter.
  const treeEntries = _parseAgentTreeEntries(agentTreeContent);
  const writerEntry = _selectActiveWriterEntry(treeEntries);

  // No active writer -> not a delegation violation. The write is either a
  // direct user edit or happened after every spawned agent already finished.
  if (!writerEntry) return null;

  const activeWriterBare = writerEntry.bare;

  // Resolve the writer's own tier at runtime (SKILL.md metadata.tier lookup,
  // replacing the stale hardcoded CONTROLLER_TYPES list). FAIL-SAFE: an
  // unresolvable name is treated as controller-tier below (never silently
  // allowed) — this scope is limited to the resolved writer only, so it does
  // NOT reintroduce the "any active controller anywhere -> deny" over-block.
  const writerTier = resolveAgentTier(activeWriterBare);

  // The name reported in a deny/warn message. Defaults to the resolved writer;
  // the execution-tier fail-closed branch below can reassign it to an unrelated
  // active controller when the real writer is ambiguous.
  let offenderBare = activeWriterBare;

  // Execution-tier writer: normally the legitimate implementation write the
  // delegation contract exists to protect. WI-R2: but `findActiveWriter` is
  // tree-GLOBAL, so under /team concurrent waves a CONTROLLER's own illegal
  // src/ write can be MISATTRIBUTED to an UNRELATED deeper active executor. So
  // an execution-tier writer is only auto-allowed when lineage confirms it (an
  // active-controller ancestor, no active controller anywhere, or lineage data
  // absent -> legacy depth/order heuristic). If no active controller is its
  // ancestor yet one exists ELSEWHERE, fail closed and treat this as that
  // controller's violation. See _classifyExecutionWriter.
  //
  // Dual-mode note: security-engineer and sales-strategist declare
  // `tier: controller` (they coordinate in their controller mode). When one of
  // them is itself the active writer performing a direct src/ write (e.g. in
  // harden/rep execution mode), writerTier resolves to 'controller' here, so
  // the write is DENIED — which is correct delegation behavior: a
  // controller-tier agent should delegate implementation to a pure-execution
  // agent rather than writing src/ itself. This is an accepted, documented
  // residual of tier-based classification, not a bug.
  if (writerTier === 'execution') {
    const decision = _classifyExecutionWriter(writerEntry, treeEntries);
    if (decision.action === 'allow') return null;
    // Fail closed: reassign the offender to the unrelated active controller so
    // the existing deny/warn path names it, preserving the message contract.
    offenderBare = decision.controllerBare;
  }

  const fileName = path.basename(filePath);
  const activeControllerName = offenderBare;

  // HARD-DENY paths (src/ lib/ components/ app/ services/ middleware/): deny in
  // block mode, warn in warn mode.
  if (isHardDeny) {
    const message = `Controller "${activeControllerName}" is writing to reserved implementation path '${filePath}'. ` +
      `Controllers and pipeline skills (/run, /team) MUST delegate via the Agent tool. ` +
      `Spawn the appropriate execution agent (backend-developer, frontend-developer, etc.) instead. ` +
      `See @.claude/rules/core/delegation.md for the canonical rule.`;
    if (mode === 'block') {
      console.error(`[ControllerDelegationValidator] HARD-DENY: ${activeControllerName} -> ${fileName}`);
      return { deny: true, reason: `[CONTROLLER DELEGATION BLOCKED] ${message}` };
    }
    console.error(`[ControllerDelegationValidator] WARN(hard-deny path): ${activeControllerName} -> ${fileName}`);
    return {
      continue: true,
      systemMessage: `[CONTROLLER DELEGATION WARNING] ${message} Direct implementation by controllers is a protocol violation.`
    };
  }

  // Softer implementation files: warn in BOTH warn and block modes (these are
  // dual-use paths — tests/, scripts/, utils/, content/ — that a controller
  // might legitimately touch in edge cases, so we never hard-deny them).
  const message = `Controller "${activeControllerName}" is writing to implementation file: ${fileName}. ` +
    `Controllers MUST delegate implementation to execution agents via the Agent tool. ` +
    `Spawn the appropriate execution agent (backend-developer, frontend-developer, etc.) instead. ` +
    `See @.claude/rules/core/delegation.md.`;
  console.error(`[ControllerDelegationValidator] WARN: ${activeControllerName} -> ${fileName}`);
  return {
    continue: true,
    systemMessage: `[CONTROLLER DELEGATION WARNING] ${message} Direct implementation by controllers is a protocol violation.`
  };
}

// Standalone registration. Suppressed when the D1b dispatcher require()s this
// module purely to import `handler` (it sets CAGENTS_DISPATCH_IMPORT before the
// require so this top-level createHook() does not also fire and contend for stdin).
// NOTE: a `require.main === module` guard is deliberately NOT used here — under the
// production path (`node run-hook.cjs controller-delegation-validator`) require.main
// is run-hook.cjs, not this module, so such a guard would silently disable the gate.
if (!process.env.CAGENTS_DISPATCH_IMPORT) {
  createHook('ControllerDelegationValidator', handler);
}

module.exports = {
  handler,
  getEnforcementMode,
  findActiveController,
  findActiveWriter,
  resolveAgentTier,
  HARD_DENY_PATTERNS
};
