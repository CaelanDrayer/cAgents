#!/usr/bin/env node
/**
 * Permission Handler Hook - Smart permission decisions
 * cAgents V9.10 - Refactored
 *
 * Auto-approves safe patterns, provides HITL context for tier 4.
 *
 * Input (stdin): JSON with tool_name, tool_input, permission context
 * Output (stdout): JSON with permission decision
 */

const path = require('path');
const { createHook, AGENT_MEMORY_DIR, findActiveSession, safeRead, extractYamlValue } = require('./hook-utils.cjs');

const ALWAYS_SAFE_TOOLS = new Set(['Read', 'Grep', 'Glob', 'TaskList', 'TaskGet']);

function isAgentMemoryPath(filePath) {
  if (!filePath) return false;
  const resolved = path.resolve(filePath);
  const memoryResolved = path.resolve(AGENT_MEMORY_DIR);
  return resolved.startsWith(memoryResolved + path.sep) || resolved === memoryResolved;
}

createHook('PermissionHandler', async (input) => {
  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};
  const filePath = toolInput.file_path || toolInput.path || '';

  // Always-safe tools - pass through to normal permission handling
  if (ALWAYS_SAFE_TOOLS.has(toolName)) {
    return null;
  }

  // Write/Edit to Agent_Memory - pass through to normal permission handling
  if ((toolName === 'Write' || toolName === 'Edit') && isAgentMemoryPath(filePath)) {
    return null;
  }

  // Check for HITL context - deny permission so user must approve
  const sessionDir = findActiveSession(input.session_id);
  if (sessionDir) {
    const planContent = safeRead(path.join(sessionDir, 'workflow', 'plan.yaml'));
    const tier = extractYamlValue(planContent, 'tier');
    if (tier === '4' && planContent && (planContent.includes('hitl_gate:') || planContent.includes('human_approval:'))) {
      console.error('[PermissionHandler] HITL gate detected - requiring user approval');
      // Don't auto-approve or deny - let the permission dialog show to the user
      return null;
    }
  }

  return null;  // Let Claude Code handle normally
});
