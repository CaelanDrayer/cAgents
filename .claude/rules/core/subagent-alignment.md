---
paths:
  - "agents/core/**"
  - "agents/coord-log-writer.md"
  - "agents/coordinator.md"
  - "agents/execution-monitor.md"
  - "agents/execution-monitor/**"
  - "agents/hitl.md"
  - "agents/hitl/**"
  - "agents/optimizer.md"
  - "agents/optimizer/**"
  - "agents/orchestrator.md"
  - "agents/orchestrator/**"
  - "agents/planner.md"
  - "agents/planner/**"
  - "agents/reviewer.md"
  - "agents/reviewer/**"
  - "agents/router.md"
  - "agents/router/**"
  - "agents/self-correct.md"
  - "agents/self-correct/**"
  - "agents/task-state.md"
  - "agents/task-state/**"
  - "agents/team-bootstrap.md"
  - "agents/team-bootstrap/**"
  - "agents/team-lead.md"
  - "agents/team-lead/**"
  - "agents/trigger.md"
  - "agents/trigger/**"
  - "agents/validator.md"
  - "agents/validator/**"
  - "agents/wave-reviewer.md"
  - "agents/wave-reviewer/**"
  - ".claude/skills/**"
---

# Built-in Subagent Alignment

Alignment between cAgents subagent types and official Claude Code Agent tool patterns.

## Overview

Claude Code's Agent tool supports various subagent patterns. This document maps cAgents agent types to these patterns for optimal integration.

## Official Task Tool Parameters

```javascript
Agent({
  description: "Brief task description",
  prompt: "Detailed instructions for the subagent",
  // Optional parameters
  subagent_type: "cagents:{agent-name}",  // cAgents extension
  timeout: 120000  // milliseconds
})
```

## Claude Code Built-in Subagents

Claude Code includes built-in subagents automatically available:

| Subagent | Model | Tools | Purpose |
|----------|-------|-------|---------|
| **Explore** | Haiku | Read-only (no Write/Edit) | Fast codebase search and analysis |
| **Plan** | Inherits | Read-only (no Write/Edit) | Research during plan mode |
| **general-purpose** | Inherits | All tools | Complex multi-step tasks |
| **Bash** | Inherits | Bash | Terminal commands in separate context |

## Subagent Configuration Fields (Claude Code)

Claude Code subagents support these frontmatter fields:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (lowercase, hyphens) |
| `description` | Yes | When Claude should delegate to this subagent |
| `tools` | No | Tool allowlist. Inherits all if omitted |
| `disallowedTools` | No | Tools to deny (removed from inherited or specified list) |
| `model` | No | `sonnet`, `opus`, `haiku`, or `inherit` (default: `inherit`) |
| `permissionMode` | No | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns` | No | Maximum agentic turns before the subagent stops |
| `skills` | No | Skills to preload into subagent context at startup |
| `mcpServers` | No | MCP servers available to this subagent |
| `hooks` | No | Lifecycle hooks scoped to this subagent |
| `memory` | No | Persistent memory scope: `user`, `project`, or `local` |
| `background` | No | `true` to always run as background task (default: `false`) |
| `isolation` | No | `worktree` to run in temporary git worktree |

### Background vs Foreground Subagents

- **Foreground**: Blocks main conversation. Permission prompts pass through to user.
- **Background**: Runs concurrently. Auto-denies unapproved permissions. User can press Ctrl+B to background a running task.

### Persistent Memory

The `memory` field gives subagents a persistent directory across conversations:

| Scope | Location | Use when |
|-------|----------|----------|
| `user` | `~/.claude/agent-memory/<name>/` | Learnings across all projects |
| `project` | `.claude/agent-memory/<name>/` | Project-specific, shareable via VCS |
| `local` | `.claude/agent-memory-local/<name>/` | Project-specific, not checked in |

### Isolation via Worktrees

Set `isolation: "worktree"` to run a subagent in a temporary git worktree, giving it an isolated copy of the repository. The worktree is auto-cleaned if the subagent makes no changes.

### Subagent Spawning Restrictions

Use `Agent(agent_type)` syntax in the `tools` field to restrict which subagents can be spawned:

```yaml
tools: Agent(worker, researcher), Read, Bash  # Only worker and researcher allowed
```

To disable specific subagents, add `Agent(AgentName)` to the `deny` permission array:

```json
{ "permissions": { "deny": ["Agent(Explore)", "Agent(my-agent)"] } }
```

### Resuming Subagents

Subagents can be resumed to continue previous work with full conversation history retained. Transcripts persist at `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`.

### Auto-Compaction

Subagents support automatic context compaction at ~95% capacity. Override trigger percentage with `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`.

## cAgents Subagent Type Format

cAgents registers all agents under the `cagents` plugin namespace. The Agent tool uses `cagents:{agent-name}`:

```
Format: "cagents:{agent-name}"

Examples:
- "cagents:backend-developer"
- "cagents:tech-lead"
- "cagents:editor"
- "cagents:market-research-analyst"
```

**IMPORTANT**: Do NOT use `{domain}:{agent-name}` format (e.g., `make:backend-developer`). The plugin registers all agents under the `cagents:` namespace, not domain-specific namespaces. Using the wrong prefix causes fallback to generic general-purpose agents instead of loading the specialized SKILL.md.

## Alignment with Claude Code Patterns

### Research/Analysis Pattern

**Claude Code Native**:
```javascript
Agent({
  description: "Research authentication patterns",
  prompt: "Analyze current auth implementations and identify best practices..."
})
```

**cAgents Equivalent**:
```javascript
Agent({
  subagent_type: "cagents:architect",
  description: "Research authentication patterns",
  prompt: "Question from controller: What authentication approach should we use?..."
})
```

### Implementation Pattern

**Claude Code Native**:
```javascript
Agent({
  description: "Implement user authentication",
  prompt: "Create the authentication module with login/logout functionality..."
})
```

**cAgents Equivalent**:
```javascript
Agent({
  subagent_type: "cagents:backend-developer",
  description: "Implement user authentication",
  prompt: "Implementation task from tech-lead:\n\nWork Item: TASK-03...\nAcceptance Criteria: ..."
})
```

### Review/Validation Pattern

**Claude Code Native**:
```javascript
Agent({
  description: "Review code changes",
  prompt: "Review the pull request for code quality, security, and best practices..."
})
```

**cAgents Equivalent**:
```javascript
Agent({
  subagent_type: "cagents:qa-lead",
  description: "Review authentication implementation",
  prompt: "Validation task:\n\nVerify TASK-03 acceptance criteria:\n- Tests pass\n- Security scan clean..."
})
```

## Agent Type Mapping

### Controllers (Tier 2)

Controllers coordinate work through question-based delegation:

| cAgents Controller | Use Case | Delegates To |
|-------------------|----------|--------------|
| `cagents:tech-lead` | Engineering work | backend-developer, frontend-developer, qa-lead |
| `cagents:architect` | System design | engineer specialists, security-engineer |
| `cagents:narrative-director` | Creative work | editor, visual-artist, worldbuilder |
| `cagents:marketing-strategist` | Marketing strategy + campaigns + PMM + SEO | editor, marketing-analyst, sales-strategist |
| `cagents:operations-manager` | Operations | product-owner, data-scientist |

### Execution Agents (Tier 3)

Execution agents answer questions and implement tasks:

| cAgents Agent | Expertise | Typical Questions |
|--------------|-----------|-------------------|
| `cagents:backend-developer` | Server-side code | Implementation details, API design |
| `cagents:frontend-developer` | Client-side code | UI implementation, state management |
| `cagents:qa-lead` | Testing | Test strategy, coverage, quality gates |
| `cagents:editor` | Written content | Messaging, tone, audience fit |
| `cagents:market-research-analyst` | Business/market analysis | Budgets, forecasts, ROI |

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
Agent({ subagent_type: "cagents:backend-developer", ... })

// Bad - domain prefix doesn't match registered namespace, falls back to generic agent
Agent({ subagent_type: "make:backend-developer", ... })

// Bad - no prefix, ambiguous
Agent({ subagent_type: "backend-developer", ... })
```

### 2. Match Agent to Task Type

| Task Type | Agent Selection |
|-----------|----------------|
| Design questions | architect, frontend-developer, tech-lead |
| Implementation | backend-developer, frontend-developer |
| Testing | qa-lead, security-engineer |
| Content | editor, technical-writer |
| Analysis | data-scientist, market-research-analyst |

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

- `scripts/migration/v12-aliases.yaml` - Agent name mappings (old → live successor)
- `cagents-memory/_system/config/routing.yaml` - Controller catalogs (+ `agents/_overlay/{people,shared}/config/domain_overrides.yaml`)
- `.claude/rules/core/controllers.md` - Controller patterns
- `.claude/rules/core/execution.md` - Execution agent patterns
