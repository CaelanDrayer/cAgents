# Fallback and Error Recovery

Mandatory /run fallback for non-team-suitable requests, automatic teammate failure recovery, and the /run vs /team decision.

## Fallback (MANDATORY)

If the request has fewer than 3 work items or no parallelizable work, you **MUST** pass to /run. Never silently fail or leave a request unhandled:

```
Skill({ skill: "run", args: "<the original request>" })
```

This ensures every /team invocation produces a result — either via team execution or /run delegation.

### When to Fall Back to /run

| Condition | Action |
|-----------|--------|
| Fewer than 3 work items | `Skill({ skill: "run", args: "..." })` |
| All items strictly sequential (no parallelism) | `Skill({ skill: "run", args: "..." })` |
| Tier 2 with < 4 items | Prefer `/run` over `/team` |

The /team skill MUST always either execute as a team OR delegate to /run. There is no third option.

## Automatic Teammate Failure Recovery

If a teammate fails (task stuck, error reported, or timeout), apply the recovery chain (max 2 retries per work item):

### Recovery Chain

**1. RETRY**: Spawn replacement teammate with error context:

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

**2. SIMPLIFY**: If retry fails, break the work item into sub-items:
- Create TASK-{N}a (core implementation) and TASK-{N}b (edge cases + testing)
- Spawn separate teammates for each sub-item

**3. ESCALATE**: If simplify also fails, mark the work item as blocked:

```
TaskUpdate({ taskId: "{task_id}", status: "completed",
             description: "BLOCKED: Failed after 2 retries. Error: {context}" })
```

Log failure in `workflow/failed_items.yaml`. Continue with remaining wave items (do not halt the entire wave).

### Recovery Metrics Per Wave

```yaml
recovery_metrics:
  recovery_attempts: {count}
  successful_recoveries: {count}
  blocked_items: [{TASK-ids}]
```

## Error Handling

### Teammate Failure (Lead-Side)

- Send status query via SendMessage
- If unresponsive: spawn replacement teammate
- Reassign work item

### Deadlock Detection

- Detect circular dependencies via TaskList
- Break cycle by sequentializing
- Warn about degraded parallelism

### Partial Completion

- Complete what can be completed
- Document partial results clearly (see `reference/partial-results.md`)
- Return with status of succeeded/failed items
