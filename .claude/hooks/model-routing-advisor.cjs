#!/usr/bin/env node
/**
 * Model Routing Advisor Hook - Model Routing Validation
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

// Known agent-to-tier mappings for all 214 agents (static map, generated from SKILL.md frontmatter)
const KNOWN_AGENTS = {
  // Core / Infrastructure (16 agents)
  'hitl': 'infrastructure',
  'optimizer': 'infrastructure',
  'orchestrator': 'infrastructure',
  'prompt-engineer': 'infrastructure',
  'reviewer': 'infrastructure',
  'task-consolidator': 'infrastructure',
  'task-decomposer': 'infrastructure',
  'task-inventory': 'infrastructure',
  'team-lead-adapter': 'infrastructure',
  'team-trigger': 'infrastructure',
  'trigger': 'infrastructure',
  'universal-executor': 'infrastructure',
  'universal-planner': 'infrastructure',
  'universal-router': 'infrastructure',
  'universal-self-correct': 'infrastructure',
  'universal-validator': 'infrastructure',
  // Engineering (32 agents)
  'accessibility-checker': 'support',
  'architect': 'controller',
  'architecture-reviewer': 'support',
  'backend-developer': 'execution',
  'backend-lead': 'controller',
  'code-reviewer': 'support',
  'code-standards-auditor': 'support',
  'data-analyst': 'execution',
  'data-lead': 'controller',
  'dba': 'execution',
  'dependency-analyzer': 'support',
  'dependency-auditor': 'support',
  'devops-engineer': 'execution',
  'devops-lead': 'controller',
  'engine-developer': 'execution',
  'engineering-manager': 'controller',
  'frontend-aesthetics': 'execution',
  'frontend-developer': 'execution',
  'frontend-lead': 'controller',
  'game-programmer': 'execution',
  'it-support': 'execution',
  'performance-analyzer': 'support',
  'qa-lead': 'controller',
  'risk-assessment': 'support',
  'security-engineer': 'execution',
  'security-lead': 'controller',
  'senior-developer': 'execution',
  'sysadmin': 'execution',
  'tech-lead': 'controller',
  'test-coverage-validator': 'support',
  'ux-designer': 'execution',
  'vp-engineering': 'controller',
  // Creative (30 agents)
  'ai-writing-detector': 'execution',
  'ai-writing-rewriter': 'execution',
  'animator': 'execution',
  'character-designer': 'execution',
  'character-psychologist': 'execution',
  'concept-artist': 'execution',
  'continuity-checker': 'execution',
  'copy-editor': 'execution',
  'creative-researcher': 'execution',
  'dialogue-specialist': 'execution',
  'editor': 'controller',
  'game-writer': 'execution',
  'genre-specialist': 'execution',
  'literary-critic': 'execution',
  'lore-keeper': 'execution',
  'music-composer': 'execution',
  'narrative-designer': 'execution',
  'narrative-director': 'controller',
  'narrative-game-designer': 'execution',
  'pacing-specialist': 'execution',
  'plot-developer': 'execution',
  'prose-stylist': 'execution',
  'sensitivity-reader': 'execution',
  'setting-designer': 'execution',
  'sound-designer': 'execution',
  'story-architect': 'controller',
  'tension-architect': 'execution',
  'theme-analyst': 'execution',
  'voice-coach': 'execution',
  'worldbuilder': 'execution',
  // Business (31 agents)
  'agile-coach': 'execution',
  'business-analyst': 'controller',
  'business-development-manager': 'execution',
  'business-researcher': 'execution',
  'change-management-specialist': 'execution',
  'facilities-manager': 'execution',
  'finance-manager': 'controller',
  'game-designer': 'controller',
  'game-producer': 'controller',
  'okr-specialist': 'execution',
  'operations-manager': 'controller',
  'performance-analyst': 'execution',
  'planning-analyst': 'execution',
  'planning-facilitator': 'execution',
  'planning-operations-manager': 'execution',
  'portfolio-manager': 'execution',
  'predictive-analyst': 'execution',
  'process-auditor': 'execution',
  'process-improvement-specialist': 'execution',
  'procurement-specialist': 'execution',
  'product-owner': 'controller',
  'program-manager': 'controller',
  'project-manager': 'controller',
  'quality-manager': 'controller',
  'resource-planner': 'execution',
  'risk-manager': 'execution',
  'roadmap-planner': 'execution',
  'scenario-planner': 'execution',
  'scribe': 'execution',
  'strategic-planner': 'controller',
  'supply-chain-manager': 'controller',
  // Growth (39 agents)
  'account-executive': 'execution',
  'affiliate-marketing-manager': 'execution',
  'brand-manager': 'execution',
  'campaign-manager': 'controller',
  'channel-partner-manager': 'execution',
  'content-marketing-manager': 'execution',
  'conversion-rate-optimizer': 'execution',
  'copywriter': 'execution',
  'creative-director': 'controller',
  'customer-marketing-manager': 'execution',
  'demand-generation-manager': 'execution',
  'digital-marketing-manager': 'execution',
  'email-marketing-specialist': 'execution',
  'events-coordinator': 'execution',
  'field-marketing-manager': 'execution',
  'growth-marketer': 'execution',
  'influencer-marketing-specialist': 'execution',
  'inside-sales-rep': 'execution',
  'marketing-analyst': 'execution',
  'marketing-ops-specialist': 'execution',
  'marketing-strategist': 'controller',
  'media-buyer': 'execution',
  'partnership-marketing-manager': 'execution',
  'pricing-analyst': 'execution',
  'product-marketing-manager': 'controller',
  'proposal-specialist': 'execution',
  'pr-specialist': 'execution',
  'revenue-operations-manager': 'execution',
  'sales-analyst': 'execution',
  'sales-development-rep': 'execution',
  'sales-enablement-specialist': 'execution',
  'sales-engineer': 'execution',
  'sales-ops-specialist': 'execution',
  'sales-strategist': 'controller',
  'sales-trainer': 'execution',
  'seo-specialist': 'execution',
  'social-media-manager': 'execution',
  'territory-manager': 'execution',
  'video-marketing-specialist': 'execution',
  // People (19 agents)
  'benefits-administrator': 'execution',
  'compensation-analyst': 'execution',
  'culture-and-engagement-manager': 'execution',
  'diversity-and-inclusion-manager': 'execution',
  'employee-relations-specialist': 'execution',
  'hr-analyst': 'execution',
  'hr-business-partner': 'controller',
  'hr-compliance-specialist': 'execution',
  'hris-administrator': 'execution',
  'hr-manager': 'controller',
  'hr-ops-specialist': 'execution',
  'learning-specialist': 'execution',
  'onboarding-specialist': 'execution',
  'organizational-development-specialist': 'execution',
  'performance-management-specialist': 'execution',
  'recruiter': 'execution',
  'recruiting-coordinator': 'execution',
  'talent-acquisition-manager': 'controller',
  'workforce-planning-analyst': 'execution',
  // Service (32 agents)
  'account-manager': 'controller',
  'chat-support-specialist': 'execution',
  'community-manager': 'execution',
  'compliance-officer': 'controller',
  'compliance-specialist': 'execution',
  'contracts-manager': 'execution',
  'corporate-counsel': 'execution',
  'customer-advocacy-manager': 'controller',
  'customer-education-specialist': 'execution',
  'customer-success-manager': 'controller',
  'customer-support-rep': 'execution',
  'employment-attorney': 'execution',
  'escalation-manager': 'execution',
  'general-counsel': 'controller',
  'ip-attorney': 'execution',
  'knowledge-base-manager': 'execution',
  'legal-analyst': 'execution',
  'legal-operations-manager': 'controller',
  'litigation-manager': 'execution',
  'paralegal': 'execution',
  'privacy-officer': 'execution',
  'regulatory-affairs-specialist': 'execution',
  'relationship-manager': 'controller',
  'risk-and-compliance-manager': 'execution',
  'support-analyst': 'execution',
  'support-director': 'controller',
  'support-operations-manager': 'controller',
  'support-quality-analyst': 'execution',
  'support-supervisor': 'execution',
  'support-trainer': 'execution',
  'technical-support-engineer': 'execution',
  'technical-writer': 'execution',
  // Leadership (11 agents)
  'cco': 'controller',
  'ceo': 'controller',
  'cfo': 'controller',
  'chro': 'controller',
  'cmo': 'controller',
  'coo': 'controller',
  'cpo': 'controller',
  'cro': 'controller',
  'cso': 'controller',
  'cto': 'controller',
  'chief-legal-officer': 'controller',
  // Shared (4 agents)
  'bi-specialist': 'controller',
  'competitive-intelligence-analyst': 'controller',
  'data-scientist': 'controller',
  'market-research-analyst': 'controller',
};

createHook('ModelRoutingAdvisor', async (input) => {
  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

  // Only check Task/Agent tool calls that spawn subagents
  if (toolName !== 'Task' && toolName !== 'Agent') return null;

  const subagentType = toolInput.subagent_type || toolInput.agent_type || '';
  const model = toolInput.model || '';
  const description = toolInput.description || '';

  // Advisory: when subagent_type field is entirely absent, remind caller to set it
  const hasSubagentTypeField = 'subagent_type' in toolInput || 'agent_type' in toolInput;
  if (!hasSubagentTypeField) {
    return {
      continue: true,
      systemMessage: "[ModelRoutingAdvisor] Missing subagent_type: Task/Agent spawn has no subagent_type field. Set subagent_type to 'cagents:{agent-name}' for proper routing and audit trail. See controllers.md delegation examples."
    };
  }

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
      systemMessage: `[ModelRoutingAdvisor] Model routing advisory: agent '${agentName}' (tier: ${tier}) is being spawned with model '${model}'. Expected '${expectation.expected}' (alternatives: ${expectation.alternatives.join(', ')}). This may affect quality or cost. See model-routing.md for guidelines.`
    };
  }

  return null;
});
