#!/usr/bin/env node
/**
 * Permission Handler Hook - Smart permission decisions
 * cAgents V9.5 - Refactored
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

  // Always-safe tools
  if (ALWAYS_SAFE_TOOLS.has(toolName)) {
    return { allow: true, hookEvent: 'PermissionRequest', reason: `${toolName} is a safe read-only tool.` };
  }

  // Write/Edit to Agent_Memory
  if ((toolName === 'Write' || toolName === 'Edit') && isAgentMemoryPath(filePath)) {
    return { allow: true, hookEvent: 'PermissionRequest', reason: 'Write to Agent_Memory is safe (session state).' };
  }

  // Check for HITL context
  const sessionDir = findActiveSession();
  if (sessionDir) {
    const planContent = safeRead(path.join(sessionDir, 'workflow', 'plan.yaml'));
    if (planContent && (planContent.includes('hitl_gate') || planContent.includes('HITL') || planContent.includes('human_approval'))) {
      const tier = extractYamlValue(planContent, 'tier');
      if (tier === '4') {
        console.error('[PermissionHandler] HITL gate detected');
        return {
          continue: true,
          systemMessage: `HITL Gate: Tier 4 workflow requires human approval.\nTool: ${toolName}\nTarget: ${filePath || 'N/A'}`
        };
      }
    }
  }

  return null;  // Let Claude Code handle normally
});
