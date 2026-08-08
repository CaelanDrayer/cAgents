# Team Lead Adapter Patterns

Patterns for wrapping domain controllers as team leads using Claude Code's built-in agent teams.

> **Historical note (v12.0.0)**: The standalone `team-trigger` and
> `team-lead-adapter` agents were removed in v12.0.0; their initialization and
> wrapper work is now inlined into the `/team` skill loop. The "adapter"
> patterns below describe the lead behavior the `/team` loop applies directly —
> read "the lead" wherever older text said "team-lead-adapter", and "the /team
> skill loop" wherever it said "team-trigger".

## Adapter Flow

```
/team skill loop (formerly team-trigger -> team-lead-adapter)
   -> Agent() (spawn a wave's teammates concurrently, run_in_background: false) -> teammates -> execution agents
                     |
                     +-> TaskList (monitor) -> TaskUpdate (gate) -> next wave
```

Teams are implicit since v2.1.178 (TeamCreate/TeamDelete were removed — do not call them); cleanup is automatic at session end.

## Wave Coordination

| Wave Type | Executor | Method |
|-----------|----------|--------|
| bootstrap | Team lead | Sequential (lead executes) |
| parallel | Teammates | Concurrent `Agent()` spawns per wave (one message, `run_in_background: false`) |
| integration | Team lead | Sequential (lead executes) |

## Gate Sentinel Pattern

Gate sentinels are TaskCreate entries that block the next wave until all current-wave tasks complete:

```
Wave 0 tasks -> GATE-0 (addBlockedBy: [wave-0-task-ids])
Wave 1 tasks (addBlockedBy: [GATE-0-id]) -> GATE-1 (addBlockedBy: [wave-1-task-ids])
```

When all wave-0 tasks are completed, GATE-0 unblocks, enabling wave-1 tasks.

## Communication Patterns

### Work Distribution (spawn via Agent, NOT SendMessage)

Teammates are spawned as controller agents via the Agent tool — NEVER assigned work through SendMessage, and NEVER told to re-enter `/act`. Spawn a wave's teammates as concurrent `Agent()` calls in ONE message:

```javascript
Agent({
  subagent_type: "cagents:tech-lead",
  run_in_background: false,   // DEFAULT — collect the wave's results synchronously
  description: "Wave 1 - Execute TASK-01",
  prompt: "You are a controller teammate. Spawn cagents:{execution_agent} to implement TASK-01, then cagents:reviewer to validate. Acceptance criteria: ..."
})
```

SendMessage is reserved for status queries, broadcasts, and (experimental path only) shutdown / auto-resume — never for assigning a work item.

### Status Check

```javascript
SendMessage({
  type: "message",
  recipient: "teammate-1",
  content: "Status check on TASK-01?",
  summary: "Checking TASK-01 status"
})
```

### Wave Transition Broadcast

```javascript
SendMessage({
  type: "broadcast",
  content: "Wave 0 complete. GATE-0 validated. Wave 1 tasks now available.",
  summary: "Wave 0 complete, wave 1 unblocked"
})
```

## Self-Claiming vs Direct Assignment

| Strategy | When to Use |
|----------|-------------|
| Self-claiming | Teammates check TaskList after completing work; best for balanced workloads |
| Direct assignment | Team lead assigns via TaskUpdate + SendMessage; best for specialized work |

## Error Recovery

1. **Teammate timeout**: Send status query, then spawn replacement if unresponsive
2. **Task failure**: Reassign to different teammate, or execute sequentially as fallback
3. **Deadlock**: Detect circular dependencies in TaskList, break by sequentializing
