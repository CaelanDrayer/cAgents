# Progress Tracking Patterns for the /act Workflow

Progress tracking through all phases. Prefix each entry with the agent name in brackets (for example `[/act]` or `[tech-lead]`). The user then sees which agent runs each step.

The file name is kept for existing references. The legacy `TodoWrite` tool is no longer used. Do not call it.

## Tool Availability

The task tools (`TaskCreate`, `TaskUpdate`, `TaskList`, `TaskGet`) are off by default on Opus 4.8, Sonnet 5, Fable 5, and newer models (Claude Code 2.1.233). `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` turns them back on.

- **Task tools present**: use `TaskCreate` and `TaskUpdate`.
- **Task tools absent**: record each update in the session `status.yaml`. Then continue.

Never stop or block because the task tools are missing.

## Update Points

| Step | When | Update |
|------|------|--------|
| 2 | Session start | Create 4 entries: route (in_progress), plan, coordinate, validate |
| 3 | After routing | Mark route completed. Rename `[controller]` to the real controller. Mark plan in_progress. |
| 5 | Before delegation | Mark plan completed. Mark coordinate in_progress. |
| 6 | After the controller returns | Mark all entries completed. |

Initial entries:

```
[/act] Route request to domain and tier
[/act] Plan objectives and select controller
[controller] Coordinate work via question-based delegation
[/act] Validate outputs and quality
```

## Controller Refinement

When the controller picks execution agents, it adds one entry per agent:

```
[backend-developer] Implement authentication fix
[security-engineer] Review security implications
[qa-lead] Create regression tests
```

## Rules

- Keep one entry in progress while work runs.
- Replace placeholders with real agent names as soon as you know them.
- Give each execution agent its own entry with a specific description.
- Set every entry to `completed` or `deleted` before you stop.

See `shared/patterns/todo_write_helper.md` for the full pattern.
