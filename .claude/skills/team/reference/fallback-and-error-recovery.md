# Fallback and Error Recovery

This file gives the mandatory /act fallback for a request that does not suit a
team. It also gives the automatic recovery from a subagent failure, and the
decision between /act and /team.

## Fallback (MANDATORY)

If the request has fewer than 3 work items, you **MUST** pass it to /act. If
the request has no parallel work, you **MUST** also pass it to /act. Never fail
in silence. Never leave a request unhandled:

```
Skill({ skill: "act", args: "<the original request>" })
```

This makes sure that every /team invocation gives a result. The result comes
from the team execution, or it comes from the /act delegation.

### When to Fall Back to /act

| Condition | Action |
|-----------|--------|
| Fewer than 3 work items | `Skill({ skill: "act", args: "..." })` |
| All items strictly sequential (no parallelism) | `Skill({ skill: "act", args: "..." })` |
| Tier 2 with < 4 items | Prefer `/act` over `/team` |

The /team skill MUST do one of two things. It executes the work as a team, or
it delegates the work to /act. There is no third option.

## Automatic Subagent Failure Recovery

A subagent fails when its task is stuck, when it reports an error, or when it
times out. If a subagent fails, apply the recovery chain below. Each work item
gets 2 retries at most.

### Recovery Chain

**1. RETRY**: Spawn a replacement subagent, and give it the error context:

```
Agent({
  description: "RETRY Wave {K} - TASK-{N}: <description>",
  prompt: "Previous attempt failed with: {error_context}. Avoid: {failure_cause}.
          CRITICAL: You are a controller agent. Spawn the assigned execution agent via Agent tool to implement.
          Do NOT implement directly. Delegate to cagents:{agent_from_work_items} and spawn cagents:reviewer to validate.
          ...",
  team_name: "{team_name}",
  name: "w{K}-task-{N}-{controller_type}-retry-{R}",
  subagent_type: "cagents:{controller_from_plan}"
})
```

**2. SIMPLIFY**: If the retry fails, break the work item into sub-items:
- Create TASK-{N}a for the core implementation, and TASK-{N}b for the edge
  cases and the tests
- Spawn a separate subagent for each sub-item

**3. ESCALATE**: If the simplify step also fails, mark the work item as
blocked:

```
TaskUpdate({ taskId: "{task_id}", status: "completed",
             description: "BLOCKED: Failed after 2 retries. Error: {context}" })
```

Write the failure to `workflow/failed_items.yaml`. Then continue with the other
items in the wave. Do not stop the whole wave.

### Recovery Metrics Per Wave

```yaml
recovery_metrics:
  recovery_attempts: {count}
  successful_recoveries: {count}
  blocked_items: [{TASK-ids}]
```

## Error Handling

### Subagent Failure (Lead-Side)

- Send a status query with SendMessage
- If the subagent does not answer, spawn a replacement subagent
- Reassign the work item to the replacement

### Deadlock Detection

- Find the circular dependencies with TaskList
- Break the cycle. Put the items into a sequence.
- Warn the user that the parallelism is now lower

### Partial Completion

- Complete each item that you can complete
- Write down the partial results in clear terms. See
  `reference/partial-results.md`.
- Return the status of each item that succeeded and each item that failed
