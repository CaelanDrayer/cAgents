# TodoWrite Patterns for /run Workflow

Progress tracking throughout all phases. **All tasks MUST be prefixed with the agent name in brackets** (e.g., `[/run]`, `[tech-lead]`) so the user can see which agent is executing each task.

## Initial Task List (Step 2 of /run)

Create at start of workflow -- this is the FIRST TodoWrite call:

```
TodoWrite([
  {"content": "[/run] Route request to domain and tier", "status": "in_progress", "id": "route"},
  {"content": "[/run] Plan objectives and select controller", "status": "pending", "id": "plan"},
  {"content": "[controller] Coordinate work via question-based delegation", "status": "pending", "id": "coordinate"},
  {"content": "[/run] Validate outputs and quality", "status": "pending", "id": "validate"}
])
```

## After Routing (Step 3 of /run)

After domain detection and tier classification -- this is the SECOND TodoWrite call:

```
TodoWrite([
  {"content": "[/run] Route request to domain and tier", "status": "completed", "id": "route"},
  {"content": "[/run] Plan objectives and select controller", "status": "in_progress", "id": "plan"},
  {"content": "[{controller_name}] Coordinate work via question-based delegation", "status": "pending", "id": "coordinate"},
  {"content": "[/run] Validate outputs and quality", "status": "pending", "id": "validate"}
])
```

Replace `{controller_name}` with the actual controller (e.g., `tech-lead`, `creative-director`).

## Before Controller Delegation (Step 5 of /run)

Mark planning completed and coordination starting -- this is the THIRD TodoWrite call:

```
TodoWrite([
  {"content": "[/run] Route request to domain and tier", "status": "completed", "id": "route"},
  {"content": "[/run] Plan objectives and select controller", "status": "completed", "id": "plan"},
  {"content": "[{controller_name}] Coordinate work via question-based delegation", "status": "in_progress", "id": "coordinate"},
  {"content": "[/run] Validate outputs and quality", "status": "pending", "id": "validate"}
])
```

## After Controller Returns (Step 6 of /run)

Mark all tasks completed -- this is the FOURTH TodoWrite call:

```
TodoWrite([
  {"content": "[/run] Route request to domain and tier", "status": "completed", "id": "route"},
  {"content": "[/run] Plan objectives and select controller", "status": "completed", "id": "plan"},
  {"content": "[{controller_name}] Coordinate work via question-based delegation", "status": "completed", "id": "coordinate"},
  {"content": "[/run] Validate outputs and quality", "status": "completed", "id": "validate"}
])
```

## Controller TodoWrite Update (Progressive Refinement)

When the controller identifies execution agents, it calls TodoWrite to add specific entries:

```
TodoWrite([
  {"content": "[/run] Route request to domain and tier", "status": "completed", "id": "route"},
  {"content": "[/run] Plan objectives and select controller", "status": "completed", "id": "plan"},
  {"content": "[tech-lead] Coordinate: ask questions and synthesize", "status": "in_progress", "id": "coordinate"},
  {"content": "[backend-developer] Implement authentication fix", "status": "pending", "id": "exec1"},
  {"content": "[security-specialist] Review security implications", "status": "pending", "id": "exec2"},
  {"content": "[qa-tester] Create regression tests", "status": "pending", "id": "exec3"},
  {"content": "[/run] Validate outputs and quality", "status": "pending", "id": "validate"}
])
```

## Update Timing Requirements

1. **Step 2** (session init): Initial 4-item task list
2. **Step 3** (after routing): Replace `[controller]` with specific name, mark routing completed
3. **Step 5** (before delegation): Mark planning completed, coordination in_progress
4. **Step 6** (after completion): Mark all completed

**Minimum 4 TodoWrite calls per /run execution. Every call is mandatory.**

## Rules

- NEVER have zero tasks in_progress during execution
- NEVER have multiple tasks in_progress (only ONE at a time, except when controller adds executor entries)
- NEVER leave generic `[controller]` or `[executor]` after the specific agent is known
- NEVER skip a TodoWrite call between steps
- ALWAYS replace placeholders with actual agent names as soon as they are determined
- Each execution agent gets its OWN entry with `[agent-name] specific task description`

## Anti-Patterns (DO NOT DO)

- DO NOT create TodoWrite only at start and never update
- DO NOT forget to mark tasks complete when phases finish
- DO NOT proceed to the next step without calling TodoWrite
- DO NOT show a single `[executor] Execute tasks` when multiple executors are involved

See `shared/patterns/todo_write_helper.md` for the full Progressive Refinement Pattern.
