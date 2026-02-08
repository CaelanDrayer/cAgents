# /team Execution Architecture

## Parallel Execution Model

```
/team <request>
    |
    +-- team-trigger (decomposes, selects execution method)
        |
        +-- tmux session: cagents-team-{session_id} (tiled split panes)
            |
            +-- pane 0: Team Lead (monitors progress)
            +-- pane 1: claude /run WI-001 --> (full orchestration) --> Complete
            +-- pane 2: claude /run WI-002 --> (full orchestration) --> Complete
            +-- pane 3: claude /run WI-003 --> (full orchestration) --> Complete
            |                 (parallel in split panes -- all visible at once)
            |
            +-- Aggregates /run outputs into final result
```

## Execution Method Priority

1. **tmux** (default) - True visual parallelism with split panes (all visible at once)
2. **Agent Teams** - Claude Code experimental API with peer messaging
3. **Parallel /run** - Fallback: concurrent Skill invocations in single message

## Work Item Execution via /run

Every work item is executed via `/run`. This is the primary execution model, not a fallback. `/team` handles decomposition and parallelism; `/run` handles each work item's full orchestration.

### tmux Mode (Default)

Each work item runs in its own tmux pane within a single session, all visible simultaneously:

```bash
# Create tmux session (detached) -- first pane is the team lead
tmux new-session -d -s "cagents-team-${SESSION_ID}"

# Split into panes for each work item and apply tiled layout
tmux split-window -t "cagents-team-${SESSION_ID}"
tmux split-window -t "cagents-team-${SESSION_ID}"
tmux select-layout -t "cagents-team-${SESSION_ID}" tiled

# Launch claude /run in each pane (pane 0 = lead, panes 1+ = work items)
tmux send-keys -t "cagents-team-${SESSION_ID}.1" \
  "claude --print '/run implement WI-001: ${item.description} from team session ${SESSION_ID}'" Enter

tmux send-keys -t "cagents-team-${SESSION_ID}.2" \
  "claude --print '/run implement WI-002: ${item.description} from team session ${SESSION_ID}'" Enter
```

### Agent Teams Mode

Team members are spawned and each invokes `/run` for their claimed work item:

```javascript
SendMessage({
  to: "member-1",
  message: `Execute your work item via /run:
    Skill({ skill: "run", args: "implement WI-001: ${item.description} from team session ${session_id}" })`
});
```

### Parallel /run Mode (Fallback)

Parallel `/run` invocations in a single message:

```javascript
Skill({ skill: "run", args: `implement WI-001: ${item1.description} from team session ${session_id}` })
Skill({ skill: "run", args: `implement WI-002: ${item2.description} from team session ${session_id}` })
Skill({ skill: "run", args: `implement WI-003: ${item3.description} from team session ${session_id}` })
```

## Team Lead Behavior (Delegate Mode)

Team leads ONLY coordinate. They NEVER implement.

**Allowed actions:**
- Distribute work items to members
- Send messages via SendMessage (Agent Teams mode)
- Monitor task list / tmux pane progress
- Request status from members
- Synthesize member outputs
- Write coordination_log.yaml

**Prohibited actions:**
- Edit/Write implementation files
- Answer questions directly
- Execute work items themselves
- Skip delegation for "simple" tasks

## Shared Task List

```yaml
# team/task_list.yaml
task_list:
  items:
    - id: WI-001
      name: "Implement user model"
      status: completed
      claimed_by: backend-dev
      tmux_pane: 1
    - id: WI-002
      status: in_progress
      claimed_by: frontend-dev
      tmux_pane: 2
      progress: 60%
    - id: WI-003
      status: available
      dependencies: [WI-001]  # Now unblocked
```

Status transitions: `available --> claimed --> in_progress --> completed`

## tmux Monitoring

```bash
# List all panes and their running processes
tmux list-panes -t "cagents-team-${SESSION_ID}" -F "#{pane_index} #{pane_pid} #{pane_current_command}"

# Check if specific pane process is still running
tmux list-panes -t "cagents-team-${SESSION_ID}" -F "#{pane_index} #{pane_pid}" -f "#{==:#{pane_index},1}"
```

## Session Structure

```
Agent_Memory/sessions/team_{timestamp}/
+-- instruction.yaml
+-- status.yaml
+-- team/
|   +-- team_manifest.yaml    # Team composition + execution method
|   +-- task_list.yaml        # Shared work items
|   +-- messages/             # Peer-to-peer messages (Agent Teams)
|   +-- metrics/
|       +-- timing.yaml
|       +-- parallelism.yaml
+-- workflow/
|   +-- plan.yaml
|   +-- decomposition.yaml
|   +-- coordination_log.yaml
+-- outputs/
```

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
