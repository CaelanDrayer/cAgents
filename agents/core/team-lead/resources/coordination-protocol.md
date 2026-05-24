# Team Lead — Coordination Protocol Detail

Detailed coordination protocol for team-lead. Loaded on demand by the lead during wave execution. The SKILL.md body retains the high-level contract; this resource carries examples, code snippets, and edge-case handling.

## Built-in Agent Teams Tools

This adapter uses Claude Code's built-in agent teams tools:

- **SendMessage** (`type: "message"`): Send work assignments and status queries to specific teammates
- **SendMessage** (`type: "broadcast"`): Send updates to all teammates (use sparingly)
- **SendMessage** (`type: "shutdown_request"`): Gracefully shut down teammates when done
- **TaskList**: Check shared task progress and find available work
- **TaskUpdate**: Update task status and assign owners
- **TaskGet**: Read full task details
- **TeamDelete**: Clean up team resources after all work completes

Teammate messages are delivered automatically -- no polling needed. Idle notifications arrive when teammates finish turns.

## Spawning Teammates as Controller Agents

**CRITICAL: Teammates are NOT assigned work via SendMessage. They are spawned as controller agents via Agent tool.** Each teammate receives its work item directly in the Task call.

```javascript
// Spawn a teammate as a controller that delegates to execution agents
Agent({
  subagent_type: "cagents:tech-lead",
  name: "w1-task-1-tech-lead",
  team_name: "{team_name}",
  description: "Wave 1 - Execute TASK-01: Implement user model",
  prompt: "You are a controller teammate. Spawn cagents:backend-developer to implement TASK-01, then spawn cagents:reviewer to validate. Acceptance criteria: model exists with password_hash field, migration created, unit tests pass."
})
```

**Anti-pattern (NEVER DO THIS):**

```javascript
// WRONG: Using SendMessage with /run Skill invocation (exceeds nesting limit)
SendMessage({
  type: "message",
  recipient: "teammate-1",
  content: "Execute via Skill({skill: 'run', args: '...'})"
})
```

## Teammate Communication Examples

### Status queries

```javascript
SendMessage({
  type: "message",
  recipient: "teammate-1",
  content: "Status check: What is your progress on TASK-01?",
  summary: "Checking TASK-01 progress"
})
```

### Broadcasting updates

```javascript
// Use sparingly -- sends to ALL teammates
SendMessage({
  type: "broadcast",
  content: "TASK-01 is complete. TASK-03 is now unblocked and available for claiming.",
  summary: "TASK-01 complete, TASK-03 unblocked"
})
```

### Shutting down teammates

```javascript
SendMessage({
  type: "shutdown_request",
  recipient: "teammate-1",
  content: "All work items complete. Please shut down."
})
```

## Task Management Examples

```javascript
// View all tasks and their status
TaskList()

// Get details on a specific task
TaskGet({ taskId: "1" })

// Mark task as in progress
TaskUpdate({ taskId: "1", status: "in_progress", owner: "teammate-1" })

// Mark task as completed
TaskUpdate({ taskId: "1", status: "completed" })

// Set up dependencies
TaskUpdate({ taskId: "3", addBlockedBy: ["1"] })  // TASK-03 blocked by TASK-01
```

When TASK-01 completes, TASK-03 becomes available for claiming.

## Work Item Distribution

### Self-claiming strategy (preferred)

Teammates check TaskList for available work and claim tasks themselves:

1. Teammate finishes current task, marks it completed
2. Teammate calls TaskList to find unblocked, unassigned tasks
3. Teammate claims next available task via TaskUpdate (set owner)
4. Team lead monitors and rebalances if needed

### Direct assignment strategy (alternative)

Team lead explicitly assigns tasks to specific teammates:

1. Team lead reviews TaskList for available items
2. Team lead assigns via TaskUpdate (set owner) and SendMessage
3. Teammate receives assignment and executes via /run

## Result Aggregation

After all work items complete:

```yaml
aggregation_process:
  1. Collect outputs from all teammates:
     - Read completion messages
     - Check TaskList for all completed tasks
     - Verify acceptance criteria

  2. Synthesize into coherent result:
     - Combine related outputs
     - Resolve any conflicts
     - Ensure consistency

  3. Create final deliverables:
     - outputs/final/ directory
     - Summary documentation
     - Validation evidence

  4. Write coordination_log.yaml:
     - All work item completions
     - Teammate contributions
     - Final synthesis
```

## Coordination Log Format (Team Mode)

```yaml
# workflow/coordination_log.yaml

controller: team-lead   # the pre-v12.0.0 team-lead-adapter pattern, now inlined into the /team skill loop
wrapped_controller: cagents:tech-lead
mode: team_execution
execution_method: built_in_agent_teams

team:
  name: cagents-team_20260206_143022
  lead: tech-lead
  teammate_mode: tmux
  members:
    - name: teammate-1
      items_completed: [TASK-01, TASK-04]
    - name: teammate-2
      items_completed: [TASK-02, TASK-05]
    - name: teammate-3
      items_completed: [TASK-03, TASK-06]

work_item_status:
  - id: TASK-01
    status: completed
    completed_by: teammate-1
    completed_at: "2026-02-06T14:40:00Z"
    evidence:
      - criterion: "User model exists"
        verified: true
        path: src/models/user.ts

execution_metrics:
  parallelism_achieved: 0.75
  execution_time_seconds: 180
  estimated_sequential_time: 450
  speedup_factor: 2.5x

synthesized_solution:
  approach: "Parallel implementation of user authentication feature"
  outputs:
    - outputs/final/user_model.ts
    - outputs/final/user_form.tsx
    - outputs/final/user_tests.spec.ts

status: completed
```

## Cleanup

After all work is complete and coordination_log.yaml is written:

1. **Shut down all teammates**: Send shutdown_request to each via SendMessage
2. **Wait for confirmations**: Teammates approve shutdown
3. **Clean up team**: Call TeamDelete to remove team and task resources

```javascript
SendMessage({ type: "shutdown_request", recipient: "teammate-1", content: "Work complete" })
SendMessage({ type: "shutdown_request", recipient: "teammate-2", content: "Work complete" })

// After all confirmations received:
TeamDelete()
```

## Error Handling

```yaml
teammate_failure_handling:
  on_teammate_timeout:
    - Log warning
    - Send status query via SendMessage
    - If unresponsive: spawn replacement teammate
    - Reassign work item

  on_teammate_error:
    - Capture error from teammate message
    - Attempt retry with different teammate
    - If persistent: escalate to HITL

  on_deadlock:
    - Detect circular dependencies via TaskList
    - Break cycle by sequentializing
    - Warn about degraded parallelism
```

If team execution partially fails: complete what can be completed, document partial results, return with clear status of succeeded/failed items, let orchestrator decide whether to retry, fall back, or escalate.
