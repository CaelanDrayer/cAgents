#!/usr/bin/env node
/**
 * Approval Gate Hook — Best-effort backstop (RD-14)
 *
 * Best-effort backstop. Primary enforcement is cooperative via external policy APIs.
 *
 * On relevant tool calls (file writes, bash commands), reads _data/policies/
 * for deny rules. If a deny policy matches the action context, blocks with
 * explanation. If _data/ is not accessible or AGENT_MEMORY_DIR not set,
 * passes through silently (best-effort).
 *
 * Input (stdin): JSON with tool_name, tool_input
 * Output (stdout): JSON with permission decision
 */

const { createHook, safeRead, denyWithReason } = require('./hook-utils.cjs');
const fs = require('fs');
const path = require('path');
// M-9 (v12.12.2): removed dead-code `const yaml = require !== undefined ? null : null;`
// declaration — `yaml` was always null and never used; the file parses YAML
// manually via regex (see parsePolicyFile() below).

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the _data/policies directory from AGENT_MEMORY_DIR.
 * Returns null if the directory doesn't exist or env var isn't set.
 */
function getPoliciesDir() {
  const memDir = process.env.AGENT_MEMORY_DIR;
  if (!memDir) return null;

  // _data lives alongside sessions: cagents-memory/_data/policies/
  const policiesDir = path.join(memDir, '..', '_data', 'policies');
  try {
    if (fs.existsSync(policiesDir)) return policiesDir;
  } catch { /* best-effort */ }
  return null;
}

/**
 * Load all active deny policies from the policies directory.
 * Returns an array of { name, actionType, condition } objects.
 */
function loadDenyPolicies(policiesDir) {
  const denyRules = [];

  let files;
  try {
    files = fs.readdirSync(policiesDir).filter(f => f.endsWith('.yaml'));
  } catch {
    return denyRules;
  }

  for (const file of files) {
    const content = safeRead(path.join(policiesDir, file));
    if (!content) continue;

    // Check if policy is active
    const statusMatch = content.match(/^status:\s*["']?(\w+)["']?/m);
    if (!statusMatch || statusMatch[1] !== 'active') continue;

    // Extract policy name
    const nameMatch = content.match(/^name:\s*["']?(.+?)["']?\s*$/m);
    const policyName = nameMatch ? nameMatch[1] : file;

    // Find deny rules within the policy
    // Simple YAML parsing: look for requires: deny blocks
    const ruleBlocks = content.split(/\n\s*- actionType:/);
    for (let i = 1; i < ruleBlocks.length; i++) {
      const block = '- actionType:' + ruleBlocks[i];
      const requiresMatch = block.match(/requires:\s*["']?(\w+)["']?/);
      if (!requiresMatch || requiresMatch[1] !== 'deny') continue;

      const actionTypeMatch = block.match(/actionType:\s*["']?(.+?)["']?\s*$/m);
      if (!actionTypeMatch) continue;

      denyRules.push({
        policyName,
        actionType: actionTypeMatch[1].trim(),
      });
    }
  }

  return denyRules;
}

/**
 * Map a tool call to a policy action type for matching.
 */
function toolToActionType(toolName) {
  switch (toolName) {
    case 'Bash':
      return 'execute_goal';
    case 'Write':
    case 'Edit':
      return 'file_write';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

createHook('ApprovalGate', async (input) => {
  const toolName = input.tool_name || '';

  // Only gate relevant tool calls
  const actionType = toolToActionType(toolName);
  if (!actionType) return null;

  // Best-effort: if policies dir isn't available, pass through
  const policiesDir = getPoliciesDir();
  if (!policiesDir) return null;

  const denyRules = loadDenyPolicies(policiesDir);
  if (denyRules.length === 0) return null;

  // Check if any deny rule matches the action type
  for (const rule of denyRules) {
    if (rule.actionType === actionType) {
      return denyWithReason({
        what: `Action "${actionType}" blocked by policy`,
        why: `Deny rule in policy "${rule.policyName}" prohibits ${actionType} actions`,
        fix: 'Edit the deny policy in _data/policies/ or run with policy override',
        hook: 'ApprovalGate',
      });
    }
  }

  return null;
});
