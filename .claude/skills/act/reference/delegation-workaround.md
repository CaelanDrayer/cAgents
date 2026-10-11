# Controller Delegation: Task vs Agent Tool Naming

## Status: the rename is complete

The subagent-spawning tool in Claude Code is `Agent`, the canonical name. `Task` is its pre-2.1.63 name. Claude Code still accepts `Task(...)` as an alias of `Agent` in settings and agent definitions. cAgents now uses `Agent` everywhere:

- `allowed-tools` and `tools` lists name `Agent`.
- Hook matchers use `Agent`. A leftover legacy `Task` arm in a matcher is harmless.
- Support agents block delegation with `disallowedTools: ["Agent"]`.

Do not write new references to the `Task` alias. Use `Agent`.

### Tools with similar names

| Tool Name | Purpose | Spawns Subagents? |
|-----------|---------|-------------------|
| **Agent** | Spawn a new subagent | **YES** |
| TaskCreate | Create a task in the task list | No (task tracking) |
| TaskUpdate | Update task status or owner | No (task tracking) |
| TaskList | List tasks | No (task tracking) |
| TaskGet | Read full task details | No (task tracking) |

The `Task*` tools only track progress. None of them spawns a subagent. They are also off by default on Opus 4.8 and newer models (Claude Code 2.1.233). If they are absent, record progress in the session files and continue.

## Correct Subagent Spawning

```javascript
Agent({
  subagent_type: "cagents:backend-developer",
  description: "WI-1: Implement auth middleware",
  prompt: "Implementation task from tech-lead:\n\nWork Item: WI-1\n...",
  run_in_background: false
})
```

Key parameters:

- `subagent_type`: use the `cagents:{agent-name}` format.
- `description`: a short summary. The task list UI shows this text.
- `prompt`: the full instructions, the acceptance criteria, and the context.
- `run_in_background`: set it to `false` for work you must collect in this turn. See `.claude/rules/core/delegation.md` § Synchronous Spawning.
- `model`: an optional model override.

## Fallback: Delegation Plan Pattern

Use this pattern only when a controller has no `Agent` tool. That happens at the nesting ceiling or on a regressed harness. Make sure the tool is absent first.

1. The controller writes `workflow/delegation_plan.yaml` with the work items and the agent assignments.
2. The controller sets its coordination_log status to show that it needs delegation help.
3. /act reads the plan and spawns each agent with the `Agent` tool.
4. /act writes the results to the session directory. The controller reads them there.

### delegation_plan.yaml Schema

```yaml
schema_version: "1"
controller: "cagents:tech-lead"
delegation_requests:
  - task_id: WI-1
    agent: "cagents:backend-developer"
    description: "Implement JWT auth middleware"
    prompt: |
      Work Item: WI-1
      Name: Implement JWT auth middleware
      Acceptance Criteria:
        - JWT validation in src/middleware/auth.ts
        - Token expiry check with 401 response
        - Unit tests covering valid/expired/malformed tokens
      Context:
        - Express app at src/app.ts
        - Existing route structure in src/routes/
    priority: 1
    depends_on: []

  - task_id: WI-2
    agent: "cagents:frontend-developer"
    description: "Build login form component"
    prompt: |
      Work Item: WI-2
      ...
    priority: 2
    depends_on: [WI-1]

  - task_id: WI-3
    agent: "cagents:reviewer"
    description: "Review WI-1 implementation"
    prompt: |
      Review TASK WI-1 for spec compliance.
      Acceptance criteria: ...
    review_for: WI-1
    depends_on: [WI-1]
```

### /act Execution of a Delegation Plan

```javascript
// For each delegation request, in depends_on order:
Agent({
  subagent_type: request.agent,        // e.g., "cagents:backend-developer"
  description: request.description,
  prompt: request.prompt,
  run_in_background: false             // collect each result before you yield
})
```

## Related

- `delegation-patterns.md`: current delegation patterns.
- `session-schema.md`: the session YAML contract.
- `.claude/rules/core/subagent-alignment.md`: subagent alignment patterns.
- `.claude/rules/core/controllers.md`: controller coordination guidelines.
