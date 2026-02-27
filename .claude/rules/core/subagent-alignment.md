---
paths:
  - "core/agents/**"
  - ".claude/skills/**"
---

# Built-in Subagent Alignment

Alignment between cAgents subagent types and official Claude Code Task tool patterns.

## Overview

Claude Code's Task tool supports various subagent patterns. This document maps cAgents agent types to these patterns for optimal integration.

## Official Task Tool Parameters

```javascript
Task({
  description: "Brief task description",
  prompt: "Detailed instructions for the subagent",
  // Optional parameters
  subagent_type: "cagents:agent-name",  // cAgents extension
  timeout: 120000  // milliseconds
})
```

## cAgents Subagent Type Format

cAgents registers all agents under the `cagents` plugin namespace. The Task tool uses `cagents:{agent-name}`:

```
Format: "cagents:{agent-name}"

Examples:
- "cagents:backend-developer"
- "cagents:engineering-manager"
- "cagents:copywriter"
- "cagents:business-analyst"
```

**IMPORTANT**: Do NOT use `{domain}:{agent-name}` format (e.g., `make:backend-developer`). The plugin registers all agents under the `cagents:` namespace, not domain-specific namespaces. Using the wrong prefix causes fallback to generic general-purpose agents instead of loading the specialized SKILL.md.

## Alignment with Claude Code Patterns

### Research/Analysis Pattern

**Claude Code Native**:
```javascript
Task({
  description: "Research authentication patterns",
  prompt: "Analyze current auth implementations and identify best practices..."
})
```

**cAgents Equivalent**:
```javascript
Task({
  subagent_type: "cagents:architect",
  description: "Research authentication patterns",
  prompt: "Question from controller: What authentication approach should we use?..."
})
```

### Implementation Pattern

**Claude Code Native**:
```javascript
Task({
  description: "Implement user authentication",
  prompt: "Create the authentication module with login/logout functionality..."
})
```

**cAgents Equivalent**:
```javascript
Task({
  subagent_type: "cagents:backend-developer",
  description: "Implement user authentication",
  prompt: "Implementation task from engineering-manager:\n\nWork Item: WI-003...\nAcceptance Criteria: ..."
})
```

### Review/Validation Pattern

**Claude Code Native**:
```javascript
Task({
  description: "Review code changes",
  prompt: "Review the pull request for code quality, security, and best practices..."
})
```

**cAgents Equivalent**:
```javascript
Task({
  subagent_type: "cagents:qa-lead",
  description: "Review authentication implementation",
  prompt: "Validation task:\n\nVerify WI-003 acceptance criteria:\n- Tests pass\n- Security scan clean..."
})
```

## Agent Type Mapping

### Controllers (Tier 2)

Controllers coordinate work through question-based delegation:

| cAgents Controller | Use Case | Delegates To |
|-------------------|----------|--------------|
| `cagents:engineering-manager` | Engineering work | backend-developer, frontend-developer, qa-lead |
| `cagents:architect` | System design | engineer specialists, security-specialist |
| `cagents:creative-director` | Creative work | copywriter, designer, content-strategist |
| `cagents:campaign-manager` | Marketing campaigns | copywriter, seo-specialist, email-specialist |
| `cagents:operations-manager` | Operations | operations-analyst, procurement-specialist |

### Execution Agents (Tier 3)

Execution agents answer questions and implement tasks:

| cAgents Agent | Expertise | Typical Questions |
|--------------|-----------|-------------------|
| `cagents:backend-developer` | Server-side code | Implementation details, API design |
| `cagents:frontend-developer` | Client-side code | UI implementation, state management |
| `cagents:qa-lead` | Testing | Test strategy, coverage, quality gates |
| `cagents:copywriter` | Written content | Messaging, tone, audience fit |
| `cagents:business-analyst` | Business/financial analysis | Budgets, forecasts, ROI |

## Prompt Templates

### Question Delegation (Controller -> Execution)

```
Question from {controller_name}:

{question_text}

Context:
- Objective: {objective_description}
- Work Item: {work_item_id}
- Phase: {current_phase}

Please provide your expert answer focusing on {specific_area}.
```

### Task Assignment (Controller -> Execution)

```
Implementation Task from {controller_name}:

Work Item: {work_item_id}
Name: {work_item_name}
Description: {work_item_description}

Acceptance Criteria:
{acceptance_criteria_list}

Dependencies Completed:
{completed_dependencies}

Please implement and provide evidence of completion.
```

### Synthesis Request (Controller internal)

```
Synthesize answers for objective: {objective_description}

Questions and Answers:
{question_answer_pairs}

Please synthesize into:
1. Recommended approach
2. Rationale
3. Implementation steps
4. Risks and mitigations
```

## Best Practices

### 1. Always Use cagents: Prefix

```javascript
// Good - matches plugin namespace
Task({ subagent_type: "cagents:backend-developer", ... })

// Bad - domain prefix doesn't match registered namespace, falls back to generic agent
Task({ subagent_type: "make:backend-developer", ... })

// Bad - no prefix, ambiguous
Task({ subagent_type: "backend-developer", ... })
```

### 2. Match Agent to Task Type

| Task Type | Agent Selection |
|-----------|----------------|
| Design questions | architect, designer, tech-lead |
| Implementation | backend-developer, frontend-developer |
| Testing | qa-lead, qa-tester, security-specialist |
| Content | copywriter, content-strategist |
| Analysis | analyst roles (financial, operations, etc.) |

### 3. Provide Clear Context

Always include in prompts:
- The source (controller/workflow)
- The objective being worked on
- The specific question or task
- Acceptance criteria (for implementation)
- Dependencies (what's already done)

### 4. Respect Agent Boundaries

- Controllers ask questions, don't implement
- Execution agents answer and implement, don't coordinate
- Support agents provide utilities, don't make decisions

## Error Handling

### Unknown Agent Type

If subagent_type doesn't match a known cAgents agent:
1. Log warning to session
2. Fall back to generic Task execution
3. Continue workflow

### Agent Unavailable

If specified agent can't handle the request:
1. Escalate to controller
2. Suggest alternative agent
3. Log for learning

## Related Files

- `Agent_Memory/_system/agent_aliases.yaml` - Agent name mappings
- `{domain}/config/planner_config.yaml` - Controller catalogs
- `.claude/rules/core/controllers.md` - Controller patterns
- `.claude/rules/core/execution.md` - Execution agent patterns
