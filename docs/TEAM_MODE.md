# Team Mode Documentation

cAgents V9.1 - Parallel Team Execution via tmux Split Panes

## Overview

Team Mode enables parallel team-based execution using **tmux split panes** as the primary execution method. Each work item runs in its own tmux pane via `claude /run`, with all panes visible simultaneously in a tiled layout, providing true visual parallelism and 40-60% execution time reduction for tier 3+ workflows.

**Core Architecture**: `/team` decomposes and parallelizes; `/run` orchestrates each work item.

## Quick Start

```bash
# Dedicated team command
/team Implement OAuth2 authentication

# Or use --team flag with /run
/run Build user dashboard --team
```

## What is Team Mode?

Team Mode transforms the standard sequential controller-execution pattern into parallel team-based execution via tmux split panes:

**Standard Mode** (`/run`):
```
Controller -> Agent 1 -> Agent 2 -> Agent 3 -> Results
                (sequential)
```

**Team Mode** (`/team`):
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
        +-- Aggregates /run outputs into final result
```

## Key Features

### tmux Split Pane Visual Parallelism (Default)
Each work item runs in its own tmux pane, all visible in a single tiled view:
- True parallel execution -- watch all agents work simultaneously in split view
- Each pane runs `claude /run` for full orchestration
- Real-time visibility into every work item's progress without switching tabs

### /run for Every Work Item
Every team member uses `/run` for their work item:
- Full orchestration per item (plan, coordinate, execute, validate)
- `/team` provides parallelism; `/run` provides quality
- This is the core architecture, not a fallback

### Shared Task Lists
Work items tracked in `team/task_list.yaml`:
- Status visibility across all work items
- Dependency tracking and unblocking
- Progress aggregation

### Independent Contexts
Each tmux pane operates in isolated context:
- No context pollution between members
- Parallel execution without interference
- Scalable to many members (tiled layout auto-adjusts)

### Team Leads (Controllers)
Domain controllers operate in delegate mode:
- Coordination only, no implementation
- Distribute and monitor work
- Aggregate final results

## Commands

### /team Command

```bash
/team <request> [flags]
```

**Flags**:
| Flag | Description | Default |
|------|-------------|---------|
| `--dry-run` | Preview team composition | false |
| `--lead <agent>` | Specify team lead | auto |
| `--members <N>` | Max team members | 8 |
| `--parallel` | Force parallel execution | auto |
| `--display` | Show team communication | false |
| `--quiet`, `-q` | Suppress progress output | false |

**Examples**:
```bash
/team Implement user authentication
/team Build payment integration --dry-run
/team Create dashboard --members 4 --display
```

### /run --team Flag

```bash
/run <request> --team [other flags]
```

Equivalent to `/team` but uses existing `/run` infrastructure.

**Examples**:
```bash
/run Add search feature --team
/run Implement notifications --team --quiet
/run Build reporting module --team --interactive
```

## When to Use Team Mode

### Recommended For

| Scenario | Benefit |
|----------|---------|
| Tier 3+ workflows | Significant parallelism potential |
| Multiple independent work items | True parallel execution via tmux split panes |
| Large features | Faster delivery via distribution |
| Time-sensitive projects | 40-60% time reduction |

### Not Recommended For

| Scenario | Why |
|----------|-----|
| Tier 2 simple workflows | Team overhead exceeds benefit |
| Highly sequential work | No parallelism possible |
| Single work items | No distribution benefit |
| Trivial changes | Standard mode is faster |

## Team Suitability Analysis

Team-trigger analyzes requests to determine if team execution provides benefit:

```yaml
# Automatic analysis
suitability_criteria:
  required:
    - work_items >= 3
    - has_independent_items: true

  preferred:
    - tier >= 3
    - parallelism_score > 0.5

  disqualifying:
    - all_sequential: true
    - tier 2 with items < 4
```

If analysis shows team mode won't provide benefit, gracefully falls back to standard `/run`.

## Execution Methods

### Priority Order

1. **tmux** (default) -- True visual parallelism with split panes (all visible at once)
2. **Agent Teams** -- Claude Code experimental API with peer messaging
3. **Parallel /run** -- Fallback: concurrent Skill invocations in single message

### tmux Mode (Default)

```bash
# Create tmux session (detached) -- first pane is the team lead
tmux new-session -d -s "cagents-team-${SESSION_ID}"

# Split into panes for each work item
tmux split-window -t "cagents-team-${SESSION_ID}"
tmux split-window -t "cagents-team-${SESSION_ID}"

# Apply tiled layout so all panes are evenly sized and visible
tmux select-layout -t "cagents-team-${SESSION_ID}" tiled

# Launch claude /run in each pane (pane 0 = lead, panes 1+ = work items)
tmux send-keys -t "cagents-team-${SESSION_ID}.1" \
  "claude --print '/run implement WI-001: Implement user model from team session ${SESSION_ID}'" Enter

tmux send-keys -t "cagents-team-${SESSION_ID}.2" \
  "claude --print '/run implement WI-002: Create user form from team session ${SESSION_ID}'" Enter
```

### Agent Teams Mode

If `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, team members are spawned and each invokes `/run`:

```javascript
SendMessage({
  to: "member-1",
  message: `Execute your work item via /run:
    Skill({ skill: "run", args: "implement WI-001: Implement user model from team session ${session_id}" })`
});
```

### Parallel /run Mode (Fallback)

When neither tmux nor Agent Teams is available:

```javascript
Skill({ skill: "run", args: `implement WI-001: ${item1.description} from team session ${session_id}` })
Skill({ skill: "run", args: `implement WI-002: ${item2.description} from team session ${session_id}` })
```

## Team Composition

### Team Lead Selection

Controllers become team leads based on domain:

| Domain | Team Lead |
|--------|-----------|
| Engineering | engineering-manager |
| Creative | creative-director |
| Marketing | campaign-manager |
| Sales | sales-strategist |
| Finance | finance-manager |
| Operations | operations-manager |
| HR | hr-manager |
| Support | customer-success-manager |

### Member Selection

Execution agents are selected based on:
- Work item skill requirements
- Agent capabilities
- Load balancing

## Session Structure

Team sessions use enhanced session structure:

```
Agent_Memory/sessions/team_{YYYYMMDD_HHMMSS}/
├── instruction.yaml          # Request + team flags
├── status.yaml               # Phase + team status
├── team/
│   ├── team_manifest.yaml    # Team composition + execution method
│   ├── task_list.yaml        # Shared work items
│   ├── messages/             # Peer communications (Agent Teams)
│   │   └── {timestamp}.yaml
│   └── metrics/
│       ├── timing.yaml       # Execution timing
│       └── parallelism.yaml  # Utilization metrics
├── workflow/
│   ├── plan.yaml
│   ├── decomposition.yaml
│   └── coordination_log.yaml
└── outputs/
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

If tmux is not installed:
1. **Detection**: team-trigger checks `command -v tmux`
2. **Next check**: Agent Teams env var `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`
3. **Final fallback**: Parallel `/run` Skill invocations

**User Notification**:
```
tmux and Agent Teams not available. Using parallel /run invocations.
Team features (split pane visual parallelism, peer messaging) disabled.
Each work item receives full /run orchestration for quality.
```

### Unsuitable Request Fallback

If the request is unsuitable for team execution (tier 2, too few work items, all sequential):
1. Notify user: "Request better suited for standard execution."
2. Automatically delegate to `/run` for standard orchestration.

## Performance

### Expected Improvements

| Metric | Target |
|--------|--------|
| Execution time | 40-60% reduction |
| Parallelism utilization | >70% |
| Work item throughput | 3x improvement |

### Metrics Tracked

Team sessions automatically track:
- **Timing**: Per-phase and per-item duration
- **Parallelism**: Peak concurrent members, efficiency score
- **Speedup**: Actual vs estimated sequential time

View metrics in `team/metrics/` directory.

## Configuration

### Project Override

Create `.cagents/team_config.yaml`:

```yaml
team_mode:
  enabled: true
  min_work_items: 3       # Minimum for team mode
  max_team_size: 8        # Maximum members
  prefer_teams_for_tiers: [3, 4]
  fallback_parallel_tasks: true
  execution_method: tmux  # tmux (default) | agent_teams | parallel_tasks
```

### Disabling Team Mode

To disable team mode for a project:

```yaml
team_mode:
  enabled: false
```

## Troubleshooting

### Team Not Spawning

**Symptom**: `/team` falls back to `/run`

**Causes**:
- Work items < 3
- All items sequential
- tmux not installed (falls to next method)

**Fix**: Verify work item count, install tmux if needed

### Slow Team Execution

**Symptom**: Team mode slower than expected

**Causes**:
- Many sequential dependencies
- Low parallelism score
- Overhead for small workflows

**Fix**: Check parallelism_score in metrics, use standard mode for small workflows

### tmux Pane Issues

**Symptom**: tmux panes not launching or completing

**Causes**:
- tmux not in PATH
- Session naming conflict
- claude CLI not available in tmux environment
- Too many panes for terminal size

**Fix**: Verify `tmux` and `claude` are in PATH, check for existing sessions with `tmux ls`, resize terminal if panes are too small

## Related Documentation

- **CLAUDE.md** - Main project documentation
- **.claude/rules/core/teams.md** - Team coordination patterns
- **.claude/skills/team/SKILL.md** - /team skill specification
- **core/agents/team-trigger/SKILL.md** - Team initialization agent
- **core/agents/team-lead-adapter/SKILL.md** - Controller wrapper

## Hooks

Team-specific hooks in `.claude/hooks/`:
- `team-start.cjs` - Initialize team monitoring
- `team-stop.cjs` - Finalize and archive team session
- `team-task-complete.cjs` - Track task completion

---

**Version**: 9.1.0
**Part of**: cAgents - Parallel Team Execution via tmux Split Panes
