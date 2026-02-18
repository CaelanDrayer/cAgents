# Team Lead Adapter Patterns

Patterns for wrapping domain controllers as team leads using Claude Code's built-in agent teams.

## Adapter Flow

```
team-trigger -> team-lead-adapter -> SendMessage (assign work) -> teammates -> /run -> agents
                     |
                     +-> TaskList (monitor) -> TaskUpdate (gate) -> SendMessage (next wave)
```

## Wave Coordination

| Wave Type | Executor | Method |
|-----------|----------|--------|
| bootstrap | Team lead | Sequential via /run |
| parallel | Teammates | Concurrent via /run per item |
| integration | Team lead | Sequential via /run |

## Gate Sentinel Pattern

Gate sentinels are TaskCreate entries that block the next wave until all current-wave tasks complete:

```
Wave 0 tasks -> GATE-0 (addBlockedBy: [wave-0-task-ids])
Wave 1 tasks (addBlockedBy: [GATE-0-id]) -> GATE-1 (addBlockedBy: [wave-1-task-ids])
```

When all wave-0 tasks are completed, GATE-0 unblocks, enabling wave-1 tasks.

## Communication Patterns

### Work Assignment (MUST include Skill invocation)

Every SendMessage to a teammate must include the explicit `/run` Skill invocation:

```javascript
SendMessage({
  type: "message",
  recipient: "teammate-1",
  content: "Assigned WI-001. Execute: Skill({skill: 'run', args: 'WI-001: ...'})",
  summary: "Assigning WI-001"
})
```

### Status Check

```javascript
SendMessage({
  type: "message",
  recipient: "teammate-1",
  content: "Status check on WI-001?",
  summary: "Checking WI-001 status"
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
