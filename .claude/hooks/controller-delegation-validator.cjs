#!/usr/bin/env node
/**
 * Controller Delegation Validator Hook - Warn when controllers write implementation files
 * cAgents V10.26.0 - PreToolUse hook for enforcing delegation protocol
 *
 * Detects when controller-tier agents attempt to write implementation files directly
 * instead of delegating to execution agents via Agent tool. Advisory only (warns, does not block).
 *
 * Input (stdin): JSON with tool_name, tool_input from PreToolUse event
 * Output (stdout): JSON with systemMessage warning when violation detected
 */

const path = require('path');
const fs = require('fs');
const { createHook, findActiveSession, safeRead } = require('./hook-utils.cjs');

// Resolve enforcement mode: env var > settings.json > default 'warn'
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

  return 'warn';
}

// Known controller agent types (tier: controller in their SKILL.md)
const CONTROLLER_TYPES = [
  'engineering-manager', 'architect', 'tech-lead', 'vp-engineering',
  'backend-lead', 'frontend-lead', 'infrastructure-lead', 'security-lead', 'qa-lead', 'data-lead',
  'narrative-director', 'story-architect', 'editor',
  'operations-manager', 'product-owner', 'strategic-planner', 'marketing-strategist',
  'hr-manager', 'talent-acquisition-manager',
  'customer-success-manager', 'general-counsel', 'support-director', 'compliance-officer',
  'arts-director', 'education-coordinator', 'health-coordinator', 'science-coordinator',
  'personal-coach-lead', 'trades-coordinator', 'game-producer'
];

// Implementation file patterns (files controllers should NOT write to directly)
const IMPLEMENTATION_PATTERNS = [
  /\bsrc\//, /\blib\//, /\bcomponents\//, /\bservices\//, /\bmiddleware\//,
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

  // Check if writing to implementation files
  const isImplementation = IMPLEMENTATION_PATTERNS.some(p => p.test(filePath));
  if (!isImplementation) return null;

  // Find active session
  const sessionDir = findActiveSession(input.session_id);
  if (!sessionDir) return null;

  // Read agent_tree.yaml to detect active controller
  const agentTreePath = path.join(sessionDir, 'workflow', 'agent_tree.yaml');
  const agentTreeContent = safeRead(agentTreePath);
  if (!agentTreeContent) return null;

  // Check if any controller-type agent is active (spawned but not stopped)
  let activeControllerName = null;
  for (const ct of CONTROLLER_TYPES) {
    const pattern = new RegExp(`cagents_type:\\s*["']?cagents:${ct}["']?[\\s\\S]*?stopped_at:\\s*null`, 'g');
    if (pattern.test(agentTreeContent)) {
      activeControllerName = ct;
      break;
    }
  }

  if (!activeControllerName) return null;

  // Controller is active and writing to implementation file — enforce based on mode
  const fileName = path.basename(filePath);
  const message = `Controller "${activeControllerName}" is writing to implementation file: ${fileName}. ` +
    `Controllers MUST delegate implementation to execution agents via Agent/Agent tool. ` +
    `Spawn the appropriate execution agent (backend-developer, frontend-developer, etc.) instead.`;

  if (mode === 'block') {
    console.error(`[ControllerDelegationValidator] BLOCKED: ${activeControllerName} -> ${fileName}`);
    return { deny: true, reason: `[CONTROLLER DELEGATION BLOCKED] ${message}` };
  }

  // mode === 'warn' (default)
  console.error(`[ControllerDelegationValidator] WARN: ${activeControllerName} -> ${fileName}`);
  return {
    continue: true,
    systemMessage: `[CONTROLLER DELEGATION WARNING] ${message} Direct implementation by controllers is a protocol violation.`
  };
});
