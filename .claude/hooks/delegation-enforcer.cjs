#!/usr/bin/env node
/**
 * Delegation Enforcer Hook - Model Routing Validation
 * cAgents V10.17.0
 *
 * PreToolUse hook that validates model routing on agent/task spawns.
 * Ensures execution agents get sonnet, controllers get opusplan, support gets haiku
 * per model-routing.md guidelines.
 *
 * Advisory mode: warns on mismatches rather than blocking.
 * Logs all delegations for audit trail.
 *
 * Inspired by oh-my-claudecode's delegation enforcement pattern.
 */

const fs = require('fs');
const path = require('path');
const { createHook, findActiveSession, safeRead, ensureDir, AGENT_MEMORY_DIR } = require('./hook-utils.cjs');

// Expected model assignments by tier/role
const MODEL_EXPECTATIONS = {
  // Controllers should use opusplan (Opus reasoning + Sonnet execution)
  controller: { expected: 'opusplan', alternatives: ['opus'] },
  // Execution agents should use sonnet (balanced capability)
  execution: { expected: 'sonnet', alternatives: ['opus'] }, // opus OK for creative domain
  // Support agents should use haiku (lightweight)
  support: { expected: 'haiku', alternatives: ['sonnet'] },
  // Infrastructure agents can use any
  infrastructure: { expected: 'opus', alternatives: ['opusplan', 'sonnet'] },
  // Executive agents use opusplan
  executive: { expected: 'opusplan', alternatives: ['opus'] },
};

// Known agent-to-tier mappings for common agents (subset for fast lookup)
const KNOWN_AGENTS = {
  // Controllers
  'engineering-manager': 'controller',
  'architect': 'controller',
  'narrative-director': 'controller',
  'editor': 'controller',
  'product-owner': 'controller',
  'operations-manager': 'controller',
  'hr-manager': 'controller',
  'customer-success-manager': 'controller',
  'qa-lead': 'controller',
  'data-scientist': 'controller',
  // Execution
  'backend-developer': 'execution',
  'frontend-developer': 'execution',
  'devops-engineer': 'execution',
  'prose-stylist': 'execution',
  'dialogue-specialist': 'execution',
  'copywriter': 'execution',
  // Support
  'code-reviewer': 'support',
  'scribe': 'support',
  // Infrastructure
  'orchestrator': 'infrastructure',
  'trigger': 'infrastructure',
  'universal-validator': 'infrastructure',
  'universal-planner': 'infrastructure',
  'task-decomposer': 'infrastructure',
  'prompt-engineer': 'infrastructure',
};

createHook('DelegationEnforcer', async (input) => {
  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

  // Only check Task/Agent tool calls that spawn subagents
  if (toolName !== 'Task' && toolName !== 'Agent') return null;

  const subagentType = toolInput.subagent_type || toolInput.agent_type || '';
  const model = toolInput.model || '';
  const description = toolInput.description || '';

  // Extract agent name from cagents:{name} format
  const agentMatch = subagentType.match(/^cagents:(.+)$/);
  if (!agentMatch) return null; // Not a cAgents agent spawn

  const agentName = agentMatch[1];
  const tier = KNOWN_AGENTS[agentName];

  // Log the delegation for audit trail
  try {
    const logsDir = ensureDir(path.join(AGENT_MEMORY_DIR, '_system', 'logs'));
    const logFile = path.join(logsDir, 'delegation_audit.log');
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} | SPAWN | agent=${agentName} | tier=${tier || 'unknown'} | model=${model || 'default'} | desc=${description.substring(0, 100)}\n`;
    fs.appendFileSync(logFile, logEntry);
  } catch { /* best effort logging */ }

  // If we don't know the agent's tier, skip validation
  if (!tier) return null;

  // If no model specified, skip (defaults will apply)
  if (!model) return null;

  const expectation = MODEL_EXPECTATIONS[tier];
  if (!expectation) return null;

  // Check if model matches expectations
  const modelLower = model.toLowerCase();
  const isExpected = modelLower === expectation.expected;
  const isAlternative = expectation.alternatives.includes(modelLower);

  if (!isExpected && !isAlternative) {
    // Advisory warning - do not block
    return {
      continue: true,
      systemMessage: `[DelegationEnforcer] Model routing advisory: agent '${agentName}' (tier: ${tier}) is being spawned with model '${model}'. Expected '${expectation.expected}' (alternatives: ${expectation.alternatives.join(', ')}). This may affect quality or cost. See model-routing.md for guidelines.`
    };
  }

  return null;
});
