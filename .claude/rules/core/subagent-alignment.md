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

cAgents extends the Task tool with domain-qualified agent references:

```
Format: "{domain}:{agent-name}"

Examples:
- "make:backend-developer"
- "make:engineering-manager"
- "grow:copywriter"
- "operate:financial-analyst"
```

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
  subagent_type: "make:architect",
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
  subagent_type: "make:backend-developer",
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
  subagent_type: "make:qa-lead",
  description: "Review authentication implementation",
  prompt: "Validation task:\n\nVerify WI-003 acceptance criteria:\n- Tests pass\n- Security scan clean..."
})
```

## Agent Type Mapping

### Controllers (Tier 2)

Controllers coordinate work through question-based delegation:

| cAgents Controller | Use Case | Delegates To |
|-------------------|----------|--------------|
| `make:engineering-manager` | Engineering work | backend-developer, frontend-developer, qa-lead |
| `make:architect` | System design | engineer specialists, security-specialist |
| `make:creative-director` | Creative work | copywriter, designer, content-strategist |
| `grow:campaign-manager` | Marketing campaigns | copywriter, seo-specialist, email-specialist |
| `operate:operations-manager` | Operations | operations-analyst, procurement-specialist |

### Execution Agents (Tier 3)

Execution agents answer questions and implement tasks:

| cAgents Agent | Expertise | Typical Questions |
|--------------|-----------|-------------------|
| `make:backend-developer` | Server-side code | Implementation details, API design |
| `make:frontend-developer` | Client-side code | UI implementation, state management |
| `make:qa-lead` | Testing | Test strategy, coverage, quality gates |
| `grow:copywriter` | Written content | Messaging, tone, audience fit |
| `operate:financial-analyst` | Financial analysis | Budgets, forecasts, ROI |

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

### 1. Always Use Domain Prefix

```javascript
// Good
Task({ subagent_type: "make:backend-developer", ... })

// Avoid (ambiguous)
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
