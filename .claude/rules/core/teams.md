# Team Coordination Patterns

Guidelines for parallel team execution in cAgents V9.1.

## Overview

**Core Architecture**: `/team` decomposes and parallelizes via **tmux split panes**; `/run` orchestrates each work item.

Team Mode enables parallel execution with:
- **tmux split panes**: Each work item runs in its own tmux pane, all visible simultaneously in a tiled layout
- **Every work item via /run**: Full orchestration (plan, coordinate, execute, validate) per item
- **Shared task lists**: Track work item progress and dependencies
- **Independent contexts**: Each tmux pane has isolated context
- **Team leads**: Controllers operate in delegate mode

## Team Architecture

```
/team <request>
    |
    +-- team-trigger (decomposes, creates tmux session with split panes)
        |
        +-- tmux pane 0: Team Lead (monitors progress)
        +-- tmux pane 1: claude /run WI-001 --> (full orchestration) --> Complete
        +-- tmux pane 2: claude /run WI-002 --> (full orchestration) --> Complete
        +-- tmux pane 3: claude /run WI-003 --> (full orchestration) --> Complete
        |                    (parallel in split panes -- all visible at once)
        |
        +-- Aggregates /run outputs via coordination_log.yaml
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

## Execution Method Priority

```
1. tmux (default) - Create tmux session with split panes, one pane per work item, each runs claude /run
2. Agent Teams API - If CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1, use spawnTeam/SendMessage
3. Parallel /run - Fallback: parallel Skill invocations in single message
```

## tmux Execution (Primary Method)

### Session Creation with Split Panes

```bash
# Create tmux session (detached) -- first pane is the team lead
tmux new-session -d -s "cagents-team-${SESSION_ID}"

# Split into panes for each work item
tmux split-window -t "cagents-team-${SESSION_ID}"
tmux split-window -t "cagents-team-${SESSION_ID}"
tmux split-window -t "cagents-team-${SESSION_ID}"

# Apply tiled layout so all panes are evenly sized and visible at once
tmux select-layout -t "cagents-team-${SESSION_ID}" tiled
```

### Work Item Execution

```bash
# Launch claude /run in each pane (pane 0 = team lead, panes 1+ = work items)
tmux send-keys -t "cagents-team-${SESSION_ID}.1" \
  "claude --print '/run implement WI-001: Implement user model from team session ${SESSION_ID}'" Enter

tmux send-keys -t "cagents-team-${SESSION_ID}.2" \
  "claude --print '/run implement WI-002: Create user form from team session ${SESSION_ID}'" Enter
```

### Monitoring

```bash
# List all panes and their running processes
tmux list-panes -t "cagents-team-${SESSION_ID}" -F "#{pane_index} #{pane_pid} #{pane_current_command}"
```

### Cleanup

```bash
# After all work items complete
tmux kill-session -t "cagents-team-${SESSION_ID}"
```

## Team Lead (Controller) Behavior

### Delegate Mode Enforcement

Team leads ONLY coordinate. They NEVER implement.

```yaml
allowed_actions:
  - Distribute work items to members
  - Monitor tmux pane progress / task list
  - Request status from members
  - Synthesize member outputs
  - Write coordination_log.yaml

prohibited_actions:
  - Edit/Write implementation files
  - Answer questions directly
  - Execute work items themselves
  - Skip delegation for "simple" tasks
```

### Work Distribution

1. Team lead analyzes work items and dependencies
2. Creates tmux panes for each parallelizable work item
3. Launches `claude /run` in each pane
4. Monitors completion and handles dependencies
5. Aggregates results

## Agent Teams Mode (Alternative)

When `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and Agent Teams is preferred:

```javascript
// Spawn team
spawnTeam({
  members: [
    { name: "backend-dev", type: "make:backend-developer" },
    { name: "frontend-dev", type: "make:frontend-developer" }
  ]
});

// Assign work -- member executes via /run
SendMessage({
  to: "backend-dev",
  message: `Execute WI-001 via: Skill({ skill: "run", args: "implement WI-001: Implement user model from team session ${session_id}" })`
});

// Broadcast
SendMessage({
  to: "all",
  message: "WI-001 complete via /run. Frontend can integrate."
});
```

## Shared Task List

```yaml
# team/task_list.yaml
task_list:
  summary:
    total: 8
    available: 2
    in_progress: 3
    completed: 2

  items:
    - id: WI-001
      name: "Implement user model"
      status: completed
      tmux_pane: 1
      completed_at: "2026-02-06T14:40:00Z"

    - id: WI-002
      status: in_progress
      tmux_pane: 2
      progress: 60%

    - id: WI-003
      status: available
      dependencies: [WI-001]  # Now unblocked
```

### Status Transitions

```
available --> in_progress --> completed
                  |
                  +--> blocked
```

## Fallback Behavior

### Execution Method Detection

```bash
# Priority 1: tmux (default)
command -v tmux >/dev/null 2>&1

# Priority 2: Agent Teams API
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1'

# Priority 3: Parallel /run (always available)
```

### When tmux is Unavailable

1. **Check Agent Teams**: If env var set, use Agent Teams with peer messaging
2. **Final fallback**: Parallel `/run` Skill invocations (each work item still gets full orchestration)
3. **Limitations** (parallel /run mode):
   - No peer-to-peer messaging
   - No visual parallelism
   - Sequential result aggregation
4. **Notification**: User informed of degraded mode

```
tmux and Agent Teams not available. Using parallel /run invocations.
Team features (split pane visual parallelism, peer messaging) disabled.
Each work item receives full /run orchestration for quality.
```

### Unsuitable Request Fallback

If the request is unsuitable for team execution (tier 2, too few work items, all sequential):
1. Notify user: "Request better suited for standard execution."
2. Automatically delegate to `/run` for standard orchestration.

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
│   ├── team_manifest.yaml    # Team composition + execution method
│   ├── task_list.yaml        # Shared work items
│   ├── messages/             # Communication log (Agent Teams mode)
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
- Reassign work item (create new tmux pane)
- If no recovery possible: mark item blocked

### Deadlock Detection
- Detect circular dependencies
- Break cycle by sequentializing
- Warn about degraded parallelism

### Partial Completion
- Complete what can be completed
- Document partial results clearly
- Return with status of succeeded/failed items

## Integration Points

- **team-trigger**: Initializes team, creates tmux session with split panes, checks availability
- **team-lead-adapter**: Wraps controller in delegate mode, monitors tmux panes
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
  execution_method: tmux    # tmux (default) | agent_teams | parallel_tasks
```

---

**Part of**: cAgents Core Infrastructure - Parallel Team Execution
