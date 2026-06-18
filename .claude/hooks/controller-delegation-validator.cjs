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
const { createHook, findActiveSession, safeRead } = require('./hook-utils.cjs');

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

// Known controller agent types (tier: controller in their SKILL.md)
const CONTROLLER_TYPES = [
  'tech-lead', 'architect', 'vp-engineering',  // M-7 (v12.12.2): removed duplicate 'tech-lead' entry
  'backend-lead', 'frontend-lead', 'infrastructure-lead', 'security-lead', 'qa-lead', 'data-lead',
  'narrative-director', 'story-architect', 'editor',
  'operations-manager', 'product-owner', 'strategic-planner', 'marketing-strategist',
  'hr-manager', 'talent-acquisition-manager',
  'customer-success-manager', 'general-counsel', 'support-director', 'compliance-officer',
  'arts-director', 'education-coordinator', 'health-coordinator', 'science-coordinator',
  'personal-coach-lead', 'trades-coordinator', 'game-producer'
];

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

// Workflow/session files controllers ARE allowed to write
const ALLOWED_PATTERNS = [
  /workflow\//, /cagents-memory\//, /coordination_log/, /plan\.yaml/,
  /status\.yaml/, /agent_tree/, /\.md$/, /\.yaml$/, /\.yml$/
];

// H1 (v12.20.0): entry-scoped active-controller detection. Parses agent_tree.yaml
// line-by-line so the stopped-status determination NEVER crosses an agent entry
// boundary (the previous `cagents_type:...[\s\S]*?stopped_at:\s*null` regex did,
// causing false-pos/false-neg HARD-DENYs). An entry's `cagents_type:` line opens a
// new logical entry; a `stopped_at:` line with a real (non-null, non-empty) value
// marks THAT entry stopped. An entry is an ACTIVE controller when its own
// cagents_type is a controller AND its own stopped_at is absent or null. Returns the
// bare controller name (last active one in document order) or null. Also matches the
// legacy `agent_type:` field as a fallback for old sessions.
function findActiveController(treeContent) {
  if (!treeContent) return null;
  let active = null;
  let currentBare = null;
  let currentStopped = false;
  const flush = () => {
    if (currentBare && !currentStopped && CONTROLLER_TYPES.includes(currentBare)) {
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
    // slip through unchecked because the agent_tree active-controller probe below
    // never runs. Fall back to the documented opt-in legacy heuristic, which
    // resolves the most-recent session with a non-terminal status.yaml, so the
    // active-controller check can still fire. If no active session exists (or the
    // resolved session has no active controller), this remains a no-op — correct
    // for an ordinary direct user edit outside any cAgents workflow.
    sessionDir = findActiveSession({ sessionHint: input.session_id, fallbackHeuristic: true });
    if (!sessionDir) return null;
    console.error(`[ControllerDelegationValidator] findActiveSession(null) — resolved via fallbackHeuristic: ${path.basename(sessionDir)}`);
  }

  const agentTreePath = path.join(sessionDir, 'workflow', 'agent_tree.yaml');
  const agentTreeContent = safeRead(agentTreePath);
  if (!agentTreeContent) return null;

  // Detect an active controller-type agent (spawned but not stopped).
  // H1 (v12.20.0): the previous `cagents_type:...[\s\S]*?stopped_at:\s*null`
  // regex crossed YAML entry boundaries — its non-greedy `[\s\S]*?` would scan
  // PAST a controller's own entry into LATER entries to find a `stopped_at: null`,
  // producing both false-positives (a STOPPED controller wrongly flagged active
  // because a later agent is unstopped) and false-negatives (an active controller
  // whose entry simply OMITS stopped_at never matches `stopped_at: null`). Both
  // can wrongly HARD-DENY a legitimate execution-agent src/ write. Fix: scope the
  // determination to a SINGLE agent_tree entry via a line-based parse (mirrors the
  // entry-boundary approach in subagent-tracker.cjs). An entry is an ACTIVE
  // controller when its OWN cagents_type is a controller AND its OWN stopped_at is
  // absent or null.
  const activeControllerName = findActiveController(agentTreeContent);

  // No active controller → not a delegation violation. The write is either a
  // direct user edit or an execution-agent write, both of which are allowed.
  if (!activeControllerName) return null;

  const fileName = path.basename(filePath);

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

module.exports = { handler, getEnforcementMode, findActiveController, CONTROLLER_TYPES, HARD_DENY_PATTERNS };
