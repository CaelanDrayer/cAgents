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

When a controller searches for the "Task" tool, it finds TaskCreate/TaskUpdate/TaskList (task management tools), not a subagent spawning mechanism. This is why controllers fail to delegate.

### Scope of the Mismatch

- 50+ documentation references to "Agent tool" for spawning (should be "Agent tool")
- All controller SKILL.md files declare `allowed-tools: Task` (should be `Agent`)
- Hook matchers in settings.json target `"Task"` (should be `"Agent"`)
- `subagent-alignment.md` documents `Agent({...})` API (should be `Agent({...})`)

## Correct Subagent Spawning

The correct tool call for spawning a subagent is:

```javascript
Agent({
  subagent_type: "cagents:backend-developer",
  description: "WI-1: Implement auth middleware",
  prompt: "Implementation task from engineering-manager:\n\nWork Item: WI-1\n..."
})
```

Key parameters:
- `subagent_type`: Use `cagents:{agent-name}` format (e.g., `cagents:backend-developer`)
- `description`: Short summary (used in task list UI)
- `prompt`: Full instructions, acceptance criteria, and context
- `run_in_background`: Set `true` for parallel execution
- `model`: Optional model override (`sonnet`, `opus`, `haiku`)

## Workaround: Delegation Plan Pattern

Until the full rename is completed, controllers can use a **delegation plan** pattern where the controller writes a structured plan that /run (level 0) reads and executes on the controller's behalf.

### How It Works

1. Controller writes `workflow/delegation_plan.yaml` with work items and agent assignments
2. Controller signals it needs delegation assistance via coordination_log status
3. /run reads the delegation plan and spawns agents using the correct `Agent` tool
4. Results are written back to the session directory for the controller to read

### delegation_plan.yaml Schema

```yaml
schema_version: "1"
controller: "cagents:engineering-manager"
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

### /run Execution of Delegation Plan

When /run detects a `delegation_plan.yaml`:

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

**Option 1: Full rename of Task -> Agent across all documentation** is the correct permanent fix. This requires:

1. All SKILL.md `allowed-tools`: `Task` -> `Agent`
2. All SKILL.md body text and rules: "Agent tool" -> "Agent tool"
3. `settings.json` PreToolUse matcher: `"Task"` -> `"Agent"`
4. Hook code: `toolName !== 'Task'` -> `toolName !== 'Agent'`
5. `disallowedTools: ["Task"]` -> `disallowedTools: ["Agent"]` on support agents

Estimated scope: ~50 files, ~100 individual edits.

## Related

- `delegation-patterns.md` -- Current delegation patterns (uses "Task" naming throughout)
- `session-schema.md` -- Session YAML contract
- `.claude/rules/core/subagent-alignment.md` -- Subagent alignment patterns (uses "Task" naming)
- `.claude/rules/core/controllers.md` -- Controller coordination guidelines
