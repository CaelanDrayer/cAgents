#!/usr/bin/env node
/**
 * Permission Handler Hook - Smart permission decisions
 * cAgents V9.0 - PermissionRequest Handler
 *
 * Auto-approves safe patterns: Read/Grep/Glob (any path), Write to Agent_Memory/**.
 * For tier 4 HITL gates, adds context about what needs approval.
 *
 * 100% Self-Contained: Uses only built-in Node.js modules.
 *
 * Input (stdin): JSON with tool_name, tool_input, permission context
 * Output (stdout): JSON with permission decision
 */

// CRITICAL: Wrap everything in try-catch for plugin resilience
try {

const path = require('path');

// Try to load hook-utils, fall back to inline implementations
let utils;
try {
  utils = require('./hook-utils.cjs');
} catch {
  // Minimal inline fallbacks for plugin mode
  utils = {
    AGENT_MEMORY_DIR: path.join(process.cwd(), 'Agent_Memory'),
    readStdin: () => Promise.resolve({}),
    findActiveSession: () => null,
    safeRead: () => null,
    extractYamlValue: () => null
  };
}

const { readStdin, AGENT_MEMORY_DIR, findActiveSession, safeRead, extractYamlValue } = utils;

/**
 * Tools that are always safe to auto-approve
 */
const ALWAYS_SAFE_TOOLS = new Set(['Read', 'Grep', 'Glob', 'WebSearch', 'TaskList', 'TaskGet']);

/**
 * Check if a Write/Edit path is within Agent_Memory
 */
function isAgentMemoryPath(filePath) {
  if (!filePath) return false;
  const resolved = path.resolve(filePath);
  const memoryResolved = path.resolve(AGENT_MEMORY_DIR);
  return resolved.startsWith(memoryResolved + path.sep) || resolved === memoryResolved;
}

/**
 * Check if this is a HITL gate requiring user approval
 */
function checkHitlContext(sessionDir) {
  if (!sessionDir) return null;

  const planFile = path.join(sessionDir, 'workflow', 'plan.yaml');
  const planContent = safeRead(planFile);
  if (!planContent) return null;

  // Check for HITL gates in plan
  if (planContent.includes('hitl_gate') || planContent.includes('HITL') || planContent.includes('human_approval')) {
    const tier = extractYamlValue(planContent, 'tier');
    if (tier === '4') {
      return {
        is_hitl: true,
        tier: 4,
        context: 'Tier 4 workflow requires human approval at designated gates.'
      };
    }
  }

  return null;
}

/**
 * Main hook execution
 */
async function main() {
  const input = await readStdin();

  try {
    const toolName = input.tool_name || '';
    const toolInput = input.tool_input || {};
    const filePath = toolInput.file_path || toolInput.path || '';

    // Always-safe tools: auto-approve
    if (ALWAYS_SAFE_TOOLS.has(toolName)) {
      console.log(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: 'PermissionRequest',
          permissionDecision: 'allow',
          permissionDecisionReason: `${toolName} is a safe read-only tool.`
        }
      }));
      return;
    }

    // Write/Edit to Agent_Memory: auto-approve
    if ((toolName === 'Write' || toolName === 'Edit') && isAgentMemoryPath(filePath)) {
      console.log(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: 'PermissionRequest',
          permissionDecision: 'allow',
          permissionDecisionReason: `Write to Agent_Memory is safe (session state).`
        }
      }));
      return;
    }

    // Check for HITL context
    const sessionDir = findActiveSession();
    const hitl = checkHitlContext(sessionDir);

    if (hitl) {
      console.error(`[PermissionHandler] HITL gate: ${hitl.context}`);
      console.log(JSON.stringify({
        continue: true,
        systemMessage: `HITL Gate: ${hitl.context}\nTool requesting permission: ${toolName}\nTarget: ${filePath || 'N/A'}`
      }));
      return;
    }

    // Default: let Claude Code handle the permission normally
    console.log(JSON.stringify({ continue: true }));

  } catch (error) {
    console.error(`[PermissionHandler] Error: ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
  }
}

main();

} catch (e) {
  // Top-level catch for plugin resilience - always output valid JSON
  console.log(JSON.stringify({ continue: true }));
}
