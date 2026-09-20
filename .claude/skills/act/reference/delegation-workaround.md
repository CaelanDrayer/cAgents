# Controller Delegation: Task vs Agent Tool Naming

## The Problem

All cAgents documentation references a **"Agent tool"** for spawning subagents, but the actual Claude Code platform tool is called **"Agent"**. This mismatch is the root cause of controller delegation failures -- controllers are instructed to call a tool that does not exist under that name.

### What Exists at the Platform Level

| Tool Name | Purpose | Spawns Subagents? |
|-----------|---------|-------------------|
| **Agent** | Spawn a new subagent with full context | **YES** |
| TaskCreate | Create a task in a team's shared task list | No (task tracking) |
| TaskUpdate | Update task status/ownership | No (task tracking) |
| TaskList | List tasks in a team's task list | No (task tracking) |
| TaskGet | Read full task details | No (task tracking) |

When a controller searches for the "Task" tool, it finds TaskCreate, TaskUpdate and TaskList. Those three are task-management tools, and not one of them spawns a subagent. This is why a controller fails to delegate.

### Scope of the Mismatch

- 50+ documentation references to "Agent tool" for spawning (should be "Agent tool")
- All controller SKILL.md files declare `allowed-tools: Task` (should be `Agent`)
- Hook matchers in settings.json target `"Task"` (should be `"Agent"`)
- `subagent-alignment.md` documents `Agent({...})` API (should be `Agent({...})`)

## Correct Subagent Spawning

Use this tool call to spawn a subagent:

```javascript
Agent({
  subagent_type: "cagents:backend-developer",
  description: "WI-1: Implement auth middleware",
  prompt: "Implementation task from tech-lead:\n\nWork Item: WI-1\n..."
})
```

These are the key parameters:
- `subagent_type`: Use the `cagents:{agent-name}` format, for example `cagents:backend-developer`
- `description`: A short summary. The task list UI shows this text.
- `prompt`: The full instructions, the acceptance criteria, and the context
- `run_in_background`: Set it to `true` to run the agents in parallel
- `model`: An optional model override. The values are `sonnet`, `opus` and `haiku`.

## Workaround: Delegation Plan Pattern

The full rename is not complete yet. Until it is complete, a controller can use a **delegation plan** pattern. The controller writes a structured plan in that pattern. At level 0, /act reads the plan and executes it for the controller.

### How It Works

1. The controller writes `workflow/delegation_plan.yaml` with the work items and the agent assignments
2. The controller signals that it needs help with delegation, through the coordination_log status
3. /act reads the delegation plan, and it spawns the agents with the correct `Agent` tool
4. /act writes the results back to the session directory, and the controller reads them there

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

### /act Execution of Delegation Plan

When /act detects a `delegation_plan.yaml`:

```javascript
// For each delegation request (respecting depends_on order):
Agent({
  subagent_type: request.agent,        // e.g., "cagents:backend-developer"
  description: request.description,
  prompt: request.prompt,
  run_in_background: true              // parallel when no dependencies
})
```

## Recommended Long-Term Fix

**Option 1: Full rename of Task -> Agent across all documentation** is the correct permanent fix. It needs these five changes:

1. All SKILL.md `allowed-tools`: `Task` -> `Agent`
2. All SKILL.md body text and rules: "Agent tool" -> "Agent tool"
3. `settings.json` PreToolUse matcher: `"Task"` -> `"Agent"`
4. Hook code: `toolName !== 'Task'` -> `toolName !== 'Agent'`
5. `disallowedTools: ["Task"]` -> `disallowedTools: ["Agent"]` on support agents

The estimated scope is about 50 files and about 100 individual edits.

## Related

- `delegation-patterns.md` -- Current delegation patterns (uses "Task" naming throughout)
- `session-schema.md` -- Session YAML contract
- `.claude/rules/core/subagent-alignment.md` -- Subagent alignment patterns (uses "Task" naming)
- `.claude/rules/core/controllers.md` -- Controller coordination guidelines
