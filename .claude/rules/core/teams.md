---
paths:
  - "core/agents/team-*/**"
  - ".claude/skills/team/**"
  - ".claude/hooks/team-*.cjs"
  - ".claude/hooks/teammate-*.cjs"
---

# Team Coordination Patterns

Guidelines for parallel team execution in cAgents V9.2 using Claude Code's built-in agent teams.

## Overview

**Core Architecture**: `/team` decomposes and parallelizes using **Claude Code's built-in agent teams**; `/run` orchestrates each work item.

Team Mode enables parallel execution with:
- **Built-in agent teams**: TeamCreate, SendMessage, TaskCreate/TaskList for coordination
- **teammateMode: tmux**: Each teammate in its own tmux split pane (managed by Claude Code)
- **Every work item via /run**: Full orchestration (plan, coordinate, execute, validate) per item
- **Shared task lists**: Built-in TaskCreate/TaskList at `~/.claude/tasks/{team-name}/`
- **Independent contexts**: Each teammate has its own context window
- **Team leads**: Controllers operate in delegate mode

## Team Architecture

```
/team <request>
    |
    +-- team-trigger (decomposes, creates agent team via TeamCreate)
        |
        +-- Team Lead (coordinates via SendMessage, manages TaskList)
        +-- Teammate 1: /run WI-001 --> (full orchestration) --> Complete
        +-- Teammate 2: /run WI-002 --> (full orchestration) --> Complete
        +-- Teammate 3: /run WI-003 --> (full orchestration) --> Complete
        |                    (parallel -- each in own context/tmux pane)
        |
        +-- Aggregates /run outputs via coordination_log.yaml
```

## Built-in Agent Teams

cAgents uses Claude Code's built-in agent teams feature, which provides:

| Tool | Purpose |
|------|---------|
| **TeamCreate** | Create team with shared task list |
| **TeamDelete** | Clean up team and task resources |
| **TaskCreate** | Create work items as shared tasks |
| **TaskUpdate** | Update task status, set owner, manage dependencies |
| **TaskList** | View all tasks and their status |
| **TaskGet** | Read full task details |
| **SendMessage** | Direct messaging between lead and teammates |

Key behaviors:
- Teammate messages arrive automatically (no polling)
- Idle notifications sent when teammates finish turns
- File-lock based task claiming prevents race conditions
- Team config at `~/.claude/teams/{team-name}/config.json`
- Task list at `~/.claude/tasks/{team-name}/`

## Display Modes (teammateMode)

| Mode | Behavior | Requirements |
|------|----------|--------------|
| `"auto"` (default) | tmux if inside tmux session, otherwise in-process | None |
| `"tmux"` | Force tmux split panes -- each teammate in own pane | tmux installed |
| `"in-process"` | All teammates in main terminal (Shift+Up/Down) | None |

Configure in settings.json:
```json
{
  "teammateMode": "tmux"
}
```

Per-session: `claude --teammate-mode tmux`

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

## Team Lifecycle

```
1. TeamCreate -- create team and shared task list
2. TaskCreate -- create work items as shared tasks
3. Spawn teammates -- Claude creates teammate instances
4. SendMessage -- assign work, coordinate
5. TaskList/TaskUpdate -- track progress
6. Aggregate -- synthesize results
7. SendMessage (shutdown_request) -- shut down teammates
8. TeamDelete -- clean up resources
```

### Team Creation

```javascript
TeamCreate({
  team_name: "cagents-team-{session_id}",
  description: "Parallel execution of {request}"
})
```

### Task Distribution

```javascript
// Create tasks for each work item
TaskCreate({
  subject: "WI-001: Implement user model",
  description: "Execute via /run: ...",
  activeForm: "Implementing user model"
})

// Set dependencies
TaskUpdate({ taskId: "3", addBlockedBy: ["1"] })
```

### Teammate Communication

```javascript
// Assign work
SendMessage({
  type: "message",
  recipient: "teammate-1",
  content: "Execute WI-001 via /run. Report when complete.",
  summary: "Assigning WI-001"
})

// Broadcast update (use sparingly)
SendMessage({
  type: "broadcast",
  content: "WI-001 complete. WI-003 now unblocked.",
  summary: "WI-001 done, WI-003 available"
})

// Shut down teammate
SendMessage({
  type: "shutdown_request",
  recipient: "teammate-1",
  content: "All work complete."
})
```

### Cleanup

```javascript
// After all teammates shut down:
TeamDelete()
```

## Team Lead (Controller) Behavior

### Delegate Mode Enforcement

Team leads ONLY coordinate. They NEVER implement.

```yaml
allowed_actions:
  - Distribute work items to teammates via SendMessage
  - Monitor task list progress via TaskList
  - Request status from teammates via SendMessage
  - Synthesize teammate outputs
  - Write coordination_log.yaml
  - Shut down teammates via SendMessage (shutdown_request)
  - Clean up team via TeamDelete

prohibited_actions:
  - Edit/Write implementation files
  - Answer questions directly
  - Execute work items themselves
  - Skip delegation for "simple" tasks
```

### Work Distribution Strategies

**Self-Claiming (Preferred)**: Teammates check TaskList and claim available tasks after completing current work. Built-in file-lock prevents race conditions.

**Direct Assignment**: Lead assigns tasks to specific teammates via TaskUpdate (set owner) and SendMessage.

## Shared Task List

Tasks managed via built-in tools with these states:

```
pending --> in_progress --> completed
```

Dependencies: Use `addBlockedBy` in TaskUpdate. Blocked tasks auto-unblock when dependencies complete.

## Fallback Behavior

### Unsuitable Request Fallback

If the request is unsuitable for team execution (tier 2, too few work items, all sequential):
1. Notify user: "Request better suited for standard execution."
2. Automatically delegate to `/run` for standard orchestration.

### Display Mode Fallback

- `"auto"` mode: Automatically falls back to in-process if not inside tmux
- `"tmux"` mode: Requires tmux installed; in-process if unavailable
- `"in-process"`: Works in any terminal

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Execution time reduction | 40-60% | vs sequential baseline |
| Parallelism utilization | >70% | actual / potential parallel |
| Work item throughput | 3x | items/minute improvement |

## Session Structure

```
Agent_Memory/sessions/team_{timestamp}/
+-- instruction.yaml
+-- status.yaml
+-- team/
|   +-- team_manifest.yaml    # Team composition + display mode
|   +-- messages/             # Communication log
|   +-- metrics/
|       +-- timing.yaml
|       +-- parallelism.yaml
+-- workflow/
|   +-- plan.yaml
|   +-- decomposition.yaml
|   +-- coordination_log.yaml
+-- outputs/
```

Built-in resources (managed by Claude Code):
- Team config: `~/.claude/teams/{team-name}/config.json`
- Task list: `~/.claude/tasks/{team-name}/`

## Error Handling

### Teammate Failure
- Send status query via SendMessage
- If unresponsive: spawn replacement teammate
- Reassign work item

### Deadlock Detection
- Detect circular dependencies via TaskList
- Break cycle by sequentializing
- Warn about degraded parallelism

### Partial Completion
- Complete what can be completed
- Document partial results clearly
- Return with status of succeeded/failed items

## Team Templates

Pre-built team structures for common project types. Templates define teams, delivery waves, quality gates, and interface contracts.

### Available Templates

| Template | Teams | Waves | Domain |
|----------|-------|-------|--------|
| `fullstack-app` | Platform + Product + Experience | 3 | make:engineering |
| `api-service` | API + Data + Security | 2 | make:engineering |
| `frontend-app` | UI/UX + Components + State | 2 | make:engineering |
| `content-campaign` | Strategy + Content + Distribution | 3 | grow:marketing |
| `data-pipeline` | Ingestion + Transform + Serving | 2 | make:engineering |
| `game-project` | Core Dev + Art & Audio + Design & QA | 3 | make:game-development |
| `_custom` | User-defined | User-defined | Any |

### Auto-Selection

Templates are auto-selected by scoring against the request:

```
Score = keyword * 0.4 + domain * 0.2 + signal * 0.2 + items * 0.2
Select top scorer above confidence_threshold (0.6)
```

Override with flags: `--template <id>`, `--no-template`, `--waves <N>`

### Template Location

`Agent_Memory/_system/templates/teams/` with `_index.yaml` catalog.

## Wave Execution

Waves are delivery phases enforced via TaskCreate dependencies (gate sentinel tasks).

### Wave Types

| Type | Executor | Description |
|------|----------|-------------|
| `bootstrap` | Orchestrator (sequential /run) | Foundation setup, contracts |
| `parallel` | Teams (parallel /run per item) | Main build phase |
| `integration` | Orchestrator (sequential /run) | Wiring, testing, polish |

### Gate Sentinel Pattern

```
Wave 0 tasks -> GATE-0 (addBlockedBy: all wave-0 tasks)
Wave 1 tasks (addBlockedBy: [GATE-0]) -> GATE-1 (addBlockedBy: all wave-1 tasks)
Wave 2 tasks (addBlockedBy: [GATE-1])
```

Team lead validates quality gate criteria before marking GATE-N complete, which unblocks the next wave. No custom orchestration code -- uses built-in TaskCreate dependencies.

### Quality Gates

Each wave has a quality gate with:
- **criteria**: List of conditions to verify
- **verification_method**: How to check (file_exists, output_exists, test_result, manual_review)

Example:
```yaml
quality_gate:
  name: "GATE-0: Foundation Ready"
  criteria:
    - "Project structure created"
    - "Database schema defined"
    - "Interface contracts documented"
  verification_method: file_exists
```

## Interface Contracts

Contracts define interfaces between teams -- agreements established in one wave and consumed in the next.

### Contract Schema

```yaml
contracts:
  - provider: platform       # Team that creates the interface
    consumer: product        # Team that depends on it
    interface: "Database Schema"
    established_in: 0        # Wave where provider creates artifact
    consumed_in: 1           # Wave where consumer uses it
    artifacts: ["schema.prisma", "src/models/"]
```

### Contract Enforcement

1. **At gate validation**: Verify contract artifacts exist before marking gate complete
2. **During parallel execution**: Consumer tasks reference contract artifacts in instructions
3. **At final gate**: Verify all contracts established and consumed

### Contract Status

Tracked in coordination_log.yaml:
```yaml
contracts:
  - interface: "Database Schema"
    status: fulfilled  # established | consumed | fulfilled | violated
```

## Backward Compatibility

When no template matches (low confidence, `--no-template`, or no templates exist), the system behaves exactly as today: flat parallel execution with no waves. All template/wave features are additive.

## Integration Points

- **team-trigger**: Creates team via TeamCreate, initializes session, selects template, executes waves
- **team-lead-adapter**: Wraps controller in delegate mode, validates gates, tracks contracts
- **orchestrator**: Detects team mode, routes appropriately
- **Hooks**: team-start.cjs, team-stop.cjs, team-task-complete.cjs, teammate-idle-handler.cjs

## Configuration

Project override (`.cagents/team_config.yaml`):
```yaml
team_mode:
  enabled: true
  min_work_items: 3
  max_team_size: 8
  prefer_teams_for_tiers: [3, 4]
  teammate_mode: tmux    # auto | tmux | in-process
```

---

**Part of**: cAgents Core Infrastructure - Built-in Agent Teams Integration
