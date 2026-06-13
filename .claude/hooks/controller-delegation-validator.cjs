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

createHook('ControllerDelegationValidator', async (input) => {
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
  const sessionDir = findActiveSession(input.session_id);
  if (!sessionDir) return null;

  const agentTreePath = path.join(sessionDir, 'workflow', 'agent_tree.yaml');
  const agentTreeContent = safeRead(agentTreePath);
  if (!agentTreeContent) return null;

  // Detect an active controller-type agent (spawned but not stopped).
  let activeControllerName = null;
  for (const ct of CONTROLLER_TYPES) {
    const pattern = new RegExp(`cagents_type:\\s*["']?cagents:${ct}["']?[\\s\\S]*?stopped_at:\\s*null`, 'g');
    if (pattern.test(agentTreeContent)) {
      activeControllerName = ct;
      break;
    }
  }

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
});
