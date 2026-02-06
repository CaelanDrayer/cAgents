# Team Coordination Patterns

Guidelines for Agent Teams parallel execution in cAgents V8.7.

## Overview

**Core Architecture**: `/team` decomposes and parallelizes; `/run` orchestrates each work item.

Agent Teams enables parallel team-based execution with:
- **Every work item via /run**: Full orchestration (plan, coordinate, execute, validate) per item
- **Peer-to-peer messaging**: Direct communication between team members
- **Shared task lists**: Self-claiming work items
- **Independent contexts**: Each member has isolated context
- **Team leads**: Controllers operate in delegate mode

## Team Architecture

```
/team <request>
    │
    └── Team Lead (Controller in Delegate Mode)
        │
        ├── Decomposes into work items
        │
        ├── Member 1 ──→ /run WI-001 ──→ (full orchestration) ──→ Complete
        ├── Member 2 ──→ /run WI-002 ──→ (full orchestration) ──→ Complete
        ├── Member 3 ──→ /run WI-003 ──→ (full orchestration) ──→ Complete
        │                 (parallel /run invocations)
        │
        └── Aggregates /run outputs via coordination_log.yaml
```

## When to Use Teams

### Use Team Mode
- Tier 3+ complex workflows with multiple work items
- Work items that can execute in parallel (few dependencies)
- Time-sensitive delivery requiring speedup
- Large features with distinct components

### Use Standard Mode
- Tier 2 moderate workflows
- Highly sequential work items
- Small changes with minimal parallelism benefit
- When team overhead exceeds benefit

## Team Suitability Criteria

```yaml
required:
  work_items: ">= 3"
  has_independent_items: true

preferred:
  tier: ">= 3"
  parallelism_score: "> 0.5"

disqualified:
  all_sequential: true
  tier: 2 with items < 4
```

## Team Lead (Controller) Behavior

### Delegate Mode Enforcement

Team leads ONLY coordinate. They NEVER implement.

```yaml
allowed_actions:
  - Distribute work items to members
  - Send messages via SendMessage
  - Monitor task list progress
  - Request status from members
  - Synthesize member outputs
  - Write coordination_log.yaml

prohibited_actions:
  - Edit/Write implementation files
  - Answer questions directly
  - Execute work items themselves
  - Skip delegation for "simple" tasks
```

### Work Distribution Strategies

**Self-Claiming (Full Teams)**:
1. Post work items to shared task_list.yaml
2. Members claim items matching their skills
3. Team lead monitors and rebalances as needed

**Direct Assignment (Fallback)**:
1. Team lead analyzes work items and member capabilities
2. Assigns items based on skill match and load balancing
3. Respects dependency ordering

## Team Communication Patterns

### With Agent Teams API

```javascript
// Spawn team
spawnTeam({
  members: [
    { name: "backend-dev", type: "make:backend-developer" },
    { name: "frontend-dev", type: "make:frontend-developer" }
  ]
});

// Assign work — member executes via /run
SendMessage({
  to: "backend-dev",
  message: `Execute WI-001 via: Skill({ skill: "run", args: "implement WI-001: Implement user model from team session ${session_id}" })`
});

// Broadcast
SendMessage({
  to: "all",
  message: "WI-001 complete via /run. Frontend can integrate."
});

// Status query
SendMessage({
  to: "frontend-dev",
  message: "Status check: WI-002 progress?"
});
```

### Without Agent Teams (Parallel /run)

```javascript
// Parallel /run invocations in single message — each gets full orchestration
Skill({ skill: "run", args: `implement WI-001: Implement user model from team session ${session_id}` })
Skill({ skill: "run", args: `implement WI-002: Create user form from team session ${session_id}` })
// Both execute concurrently with full /run orchestration
```

## Shared Task List

```yaml
# team/task_list.yaml
task_list:
  summary:
    total: 8
    available: 2
    claimed: 1
    in_progress: 3
    completed: 2

  items:
    - id: WI-001
      name: "Implement user model"
      status: completed
      claimed_by: backend-dev
      completed_at: "2026-02-06T14:40:00Z"

    - id: WI-002
      status: in_progress
      claimed_by: frontend-dev
      progress: 60%

    - id: WI-003
      status: available
      dependencies: [WI-001]  # Now unblocked
```

### Status Transitions

```
available ──claim──> claimed ──start──> in_progress ──finish──> completed
                                              │
                                              └──block──> blocked
```

## Fallback Behavior

If Agent Teams is unavailable:

1. **Detection**: team-trigger checks `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`
2. **Execution**: Uses parallel `/run` Skill invocations (each work item still gets full orchestration)
3. **Limitations**:
   - No peer-to-peer messaging
   - No self-claiming (direct assignment only)
   - Sequential result aggregation
4. **Notification**: User informed of degraded mode

```
Agent Teams not available. Using parallel /run invocations.
Team features (peer messaging, shared tasks) disabled.
Each work item receives full /run orchestration for quality.
```

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Execution time reduction | 40-60% | vs sequential baseline |
| Parallelism utilization | >70% | actual / potential parallel |
| Work item throughput | 3x | items/minute improvement |

## Session Structure

```
Agent_Memory/sessions/team_{timestamp}/
├── instruction.yaml
├── status.yaml
├── team/
│   ├── team_manifest.yaml    # Team composition
│   ├── task_list.yaml        # Shared work items
│   ├── messages/             # Communication log
│   └── metrics/
│       ├── timing.yaml
│       └── parallelism.yaml
├── workflow/
│   ├── plan.yaml
│   ├── decomposition.yaml
│   └── coordination_log.yaml
└── outputs/
```

## Error Handling

### Member Failure
- Log warning
- Reassign work item to available member
- If no members available: mark item blocked

### Deadlock Detection
- Detect circular dependencies
- Break cycle by sequentializing
- Warn about degraded parallelism

### Partial Completion
- Complete what can be completed
- Document partial results clearly
- Return with status of succeeded/failed items

## Integration Points

- **team-trigger**: Initializes team, checks availability
- **team-lead-adapter**: Wraps controller in delegate mode
- **orchestrator**: Detects team mode, routes appropriately
- **Hooks**: team-start.cjs, team-stop.cjs, team-task-complete.cjs

## Configuration

Project override (`.cagents/team_config.yaml`):
```yaml
team_mode:
  enabled: true
  min_work_items: 3
  max_team_size: 8
  prefer_teams_for_tiers: [3, 4]
  fallback_parallel_tasks: true
```

---

**Part of**: cAgents Core Infrastructure - Agent Teams Integration
