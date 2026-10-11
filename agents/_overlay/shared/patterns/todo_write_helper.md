# Progress Tracking Helper (Task Tools With File Fallback)

Shared progress-tracking patterns for cAgents agents.

The file name is kept for existing references. The legacy `TodoWrite` tool is no longer the pattern. Do not call it.

## Tool Availability

Claude Code 2.1.233 and 2.1.268 gate the task-tracking tools. `TaskCreate`, `TaskGet`, `TaskUpdate`, and `TaskList` are off by default on Opus 4.8, Sonnet 5, Fable 5, and newer models. The user can turn them back on with `CLAUDE_CODE_ENABLE_TODO_TOOLS=1`.

Check your tool list before you track progress:

1. **Task tools present**: use `TaskCreate` and `TaskUpdate` as shown below.
2. **Task tools absent**: record progress in the session files. Use `workflow/coordination_log.yaml` or `status.yaml`. Then continue.

A missing task tool is never a reason to stop, block, or ask the user.

## Agent Name Prefix

Prefix each task subject with the agent name in brackets: `[agent-name] task description`. The user then sees which agent owns each task. Apply the same prefix to session-file entries.

## Standard Workflow Pattern

For tier 2+ workflows (routing, planning, coordinating, validating), create one task per phase:

```
TaskCreate(subject: "[/act] Route request to domain and tier")
TaskCreate(subject: "[/act] Plan objectives and select controller")
TaskCreate(subject: "[controller] Coordinate work via question-based delegation")
TaskCreate(subject: "[/act] Validate outputs and quality")
```

Replace `[controller]` with the real controller name (for example `[tech-lead]`) as soon as it is known.

File fallback (same content, in `status.yaml`):

```yaml
progress:
  - {id: route, subject: "[/act] Route request to domain and tier", status: in_progress}
  - {id: plan, subject: "[/act] Plan objectives and select controller", status: pending}
  - {id: coordinate, subject: "[tech-lead] Coordinate work", status: pending}
  - {id: validate, subject: "[/act] Validate outputs and quality", status: pending}
```

## Progressive Refinement

When you identify the agent for the next phase, update the tracking at once:

1. Replace placeholders such as `[controller]` with the real agent name.
2. Add one entry per execution agent, with a short description of its work.
3. Keep completed entries. Change only pending and in-progress entries.
4. Make one update per routing decision.

With task tools, use `TaskUpdate` to rename or change status. Without them, edit the matching entry in the session file.

## Phase Transitions

Mark the finished phase `completed` and the next phase `in_progress` in the same step. Keep one item in progress while work runs.

## Error Handling

When a blocker occurs, add an entry: `[{agent}] Resolve {error_type}: {error_message}`. With task tools, use `TaskCreate`. Without them, add the entry to `workflow/coordination_log.yaml`.

## Controller Coordination

Controllers add one entry per execution agent after they choose the agents. Example subjects:

- `[backend-developer] Answer: What is the current auth implementation?`
- `[qa-tester] Answer: What test coverage exists?`
- `[tech-lead] Synthesize answers into solution`

## Cleanup

Every task you create must end as `completed` or `deleted` before you stop. When you use the file fallback, set every entry to a final status.

## Usage

Agents import this helper with:

```markdown
@shared/patterns/todo_write_helper.md
```

## Anti-Patterns

- Do not stop or block because a task tool is missing. Use the session files.
- Do not create tasks at the start and never update them.
- Do not leave `[controller]` or `[executor]` placeholders after the agent is known.
- Do not show one `[executor]` entry when several executors work. List each one.
- Do not leave tasks `in_progress` after the work is done.

---

**Version**: 4.0
**Updated**: 2026-10-11 (task tools are conditional; file fallback added)
