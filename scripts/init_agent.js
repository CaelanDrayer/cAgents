#!/usr/bin/env node
/**
 * cAgents Agent Initializer
 * Self-contained - NO external dependencies
 *
 * Creates a new agent with proper SKILL.md structure and resources directory
 *
 * Usage:
 *   node init_agent.js <agent-name> [--path <output-dir>] [--tier <tier>] [--domain <domain>]
 *
 * Examples:
 *   node init_agent.js backend-developer --path make/agents/ --tier execution --domain make
 *   node init_agent.js engineering-manager --tier controller
 */

const fs = require('fs');
const path = require('path');

// SKILL.md template
const SKILL_MD_TEMPLATE = `---
name: {agent_name}
description: Replace with description of what this agent does and when to use it.
tier: {tier}
domain: {domain}
model: {model}
---

# {title}

## Overview

[Brief description of what this agent does]

## Role

{role_description}

## Capabilities

- Capability 1
- Capability 2
- Capability 3

## Workflows

### Primary Workflow

1. Step 1
2. Step 2
3. Step 3

## Resources

- **resources/**: Extended reference materials
- **templates/**: Output templates

## Guidelines

- Follow cAgents task completion protocol
- Provide evidence for all completed work
- Use specific file paths and metrics in evidence

## Related Agents

- [List related agents that this agent collaborates with]
`;

// Template for controller agents
const CONTROLLER_ADDITIONS = `
## Coordination Pattern

This controller uses question-based delegation:

1. Receive objectives from plan.yaml
2. Break into specific questions
3. Delegate questions to execution agents
4. Synthesize answers into solution
5. Coordinate implementation

## Typical Questions

See @resources/typical-questions.md for complete list of questions this controller asks.

## Anti-Patterns

- Never execute work directly (always delegate)
- Never answer own questions
- Never skip delegation for "simple" tasks
`;

// Template for execution agents
const EXECUTION_ADDITIONS = `
## Expertise Areas

This execution agent specializes in:

- Area 1
- Area 2
- Area 3

## Question Types

This agent can answer questions about:

- Topic 1
- Topic 2
- Topic 3

## Task Types

This agent can execute:

- Task type 1
- Task type 2
- Task type 3
`;

/**
 * Convert kebab-case to Title Case
 */
function toTitleCase(str) {
  return str.split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Get role description based on tier
 */
function getRoleDescription(tier) {
  switch (tier) {
    case 'controller':
      return 'Coordinate work through question-based delegation to execution agents.';
    case 'execution':
      return 'Execute specialized tasks and answer expert questions from controllers.';
    case 'support':
      return 'Provide foundational services and utilities to other agents.';
    case 'infrastructure':
      return 'Manage workflow orchestration and system-level operations.';
    default:
      return 'Describe the role of this agent.';
  }
}

/**
 * Get default model based on tier
 */
function getDefaultModel(tier) {
  switch (tier) {
    case 'controller':
      return 'sonnet';
    case 'execution':
      return 'sonnet';
    case 'support':
      return 'haiku';
    case 'infrastructure':
      return 'opus';
    default:
      return 'sonnet';
  }
}

/**
 * Initialize a new agent
 */
function initAgent(agentName, options) {
  const {
    outputPath = '.',
    tier = 'execution',
    domain = 'make',
    model = getDefaultModel(tier)
  } = options;

  const agentDir = path.join(outputPath, agentName);

  // Create directories
  fs.mkdirSync(agentDir, { recursive: true });
  fs.mkdirSync(path.join(agentDir, 'resources'), { recursive: true });
  fs.mkdirSync(path.join(agentDir, 'templates'), { recursive: true });

  // Create .gitkeep files
  fs.writeFileSync(path.join(agentDir, 'resources', '.gitkeep'), '');
  fs.writeFileSync(path.join(agentDir, 'templates', '.gitkeep'), '');

  // Generate SKILL.md content
  const title = toTitleCase(agentName);
  let content = SKILL_MD_TEMPLATE
    .replace(/{agent_name}/g, agentName)
    .replace(/{title}/g, title)
    .replace(/{tier}/g, tier)
    .replace(/{domain}/g, domain)
    .replace(/{model}/g, model)
    .replace(/{role_description}/g, getRoleDescription(tier));

  // Add tier-specific content
  if (tier === 'controller') {
    content += CONTROLLER_ADDITIONS;
  } else if (tier === 'execution') {
    content += EXECUTION_ADDITIONS;
  }

  // Write SKILL.md
  fs.writeFileSync(path.join(agentDir, 'SKILL.md'), content);

  // Create resources files based on tier
  if (tier === 'controller') {
    const typicalQuestions = `# Typical Questions for ${title}

## Understanding Current State
- What is the current implementation of [feature]?
- What are the technical constraints we need to consider?
- What are the key risks and dependencies?

## Planning & Design
- What approach should we use for [task]?
- How should this integrate with existing systems?
- What are the acceptance criteria?

## Quality & Validation
- How do we verify this works correctly?
- What tests are needed?
- What documentation is required?

[Add more domain-specific questions]
`;
    fs.writeFileSync(path.join(agentDir, 'resources', 'typical-questions.md'), typicalQuestions);

    const coordinationExamples = `# Coordination Examples for ${title}

## Example 1: Feature Implementation

**Objective**: Implement user authentication

**Questions Asked**:
1. To architect: "What authentication approach should we use?"
2. To backend-developer: "What is the current user model structure?"
3. To security-specialist: "What security requirements apply?"

**Synthesis**: Based on answers, determined to use JWT with refresh tokens...

**Implementation Tasks Assigned**:
- backend-developer: Implement auth endpoints
- frontend-developer: Create login UI
- qa-tester: Write auth tests

[Add more examples]
`;
    fs.writeFileSync(path.join(agentDir, 'resources', 'coordination-examples.md'), coordinationExamples);
  }

  // Create template files
  const outputTemplate = `# ${title} Output Template

## Summary

[Brief summary of work completed]

## Details

[Detailed description]

## Evidence

- File: [path/to/file:line]
- Test: [test result]
- Metric: [measurement]

## Next Steps

- [Recommendation 1]
- [Recommendation 2]
`;
  fs.writeFileSync(path.join(agentDir, 'templates', 'output-template.md'), outputTemplate);

  console.log(`Initialized agent at: ${agentDir}`);
  console.log('Created:');
  console.log('  - SKILL.md');
  console.log('  - resources/');
  if (tier === 'controller') {
    console.log('    - typical-questions.md');
    console.log('    - coordination-examples.md');
  }
  console.log('  - templates/');
  console.log('    - output-template.md');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Edit SKILL.md with agent-specific instructions');
  console.log('  2. Add resources and templates as needed');
  console.log('  3. Run: node validate_agent.js ' + agentDir);
  console.log('  4. Add to plugin.json');

  return agentDir;
}

// Parse arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('cAgents Agent Initializer');
  console.log('');
  console.log('Usage: node init_agent.js <agent-name> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --path <dir>    Output directory (default: current dir)');
  console.log('  --tier <tier>   Agent tier: controller, execution, support, infrastructure');
  console.log('  --domain <dom>  Domain: make, grow, operate, people, serve, core, shared');
  console.log('  --model <model> Model: opus, sonnet, haiku (default based on tier)');
  console.log('');
  console.log('Examples:');
  console.log('  node init_agent.js backend-developer --path make/agents/ --tier execution');
  console.log('  node init_agent.js engineering-manager --tier controller --domain make');
  process.exit(0);
}

const agentName = args[0];
const options = {};

// Parse options
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--path' && args[i + 1]) {
    options.outputPath = args[++i];
  } else if (args[i] === '--tier' && args[i + 1]) {
    options.tier = args[++i];
  } else if (args[i] === '--domain' && args[i + 1]) {
    options.domain = args[++i];
  } else if (args[i] === '--model' && args[i + 1]) {
    options.model = args[++i];
  }
}

initAgent(agentName, options);
