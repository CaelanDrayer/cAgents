# Team Mode Documentation

cAgents V9.2 - Parallel Team Execution via Built-in Agent Teams

## Overview

Team Mode enables parallel team-based execution using **Claude Code's built-in agent teams**. Each work item is assigned to a teammate that executes `/run` for full orchestration. When `teammateMode` is set to `"tmux"`, each teammate gets its own tmux split pane, providing true visual parallelism and 40-60% execution time reduction for tier 3+ workflows.

**Core Architecture**: `/team` decomposes and parallelizes via built-in agent teams; `/run` orchestrates each work item.

## Quick Start

```bash
# Dedicated team command
/team Implement OAuth2 authentication

# Or use --team flag with /run
/run Build user dashboard --team
```

## What is Team Mode?

Team Mode transforms the standard sequential controller-execution pattern into parallel team-based execution using Claude Code's built-in agent teams:

**Standard Mode** (`/run`):
```
Controller -> Agent 1 -> Agent 2 -> Agent 3 -> Results
                (sequential)
```

**Team Mode** (`/team`):
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
        +-- Aggregates /run outputs into final result
```

## Key Features

### Built-in Agent Teams
Uses Claude Code's built-in TeamCreate, SendMessage, TaskCreate/TaskList tools:
- No custom tmux scripting -- Claude Code manages teammate lifecycle
- Shared task lists with file-lock based claiming
- Direct inter-agent messaging
- Automatic context loading (CLAUDE.md, skills, MCP servers) per teammate

### tmux Split Pane Display
When `teammateMode: "tmux"` is configured:
- Each teammate gets its own tmux pane
- All panes visible simultaneously in tiled layout
- True visual parallelism -- watch all agents work at once
- Claude Code manages the panes automatically

### /run for Every Work Item
Every team member uses `/run` for their work item:
- Full orchestration per item (plan, coordinate, execute, validate)
- `/team` provides parallelism; `/run` provides quality
- This is the core architecture, not a fallback

### Shared Task Lists
Work items managed via built-in TaskCreate/TaskList/TaskUpdate:
- Status visibility across all work items
- Dependency tracking with automatic unblocking
- Self-claiming by teammates after completing current work
- Stored at `~/.claude/tasks/{team-name}/`

### Independent Contexts
Each teammate operates in its own context window:
- No context pollution between members
- Parallel execution without interference
- Teammates load project context automatically

### Team Leads (Controllers)
Domain controllers operate in delegate mode:
- Coordination only, no implementation
- Distribute and monitor work via SendMessage
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
| `--teammate-mode <mode>` | Display: auto, tmux, in-process | auto |

**Examples**:
```bash
/team Implement user authentication
/team Build payment integration --dry-run
/team Create dashboard --members 4 --display
/team Implement feature --teammate-mode tmux
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
/run Build reporting module --team --teammate-mode tmux
```

## When to Use Team Mode

### Recommended For

| Scenario | Benefit |
|----------|---------|
| Tier 3+ workflows | Significant parallelism potential |
| Multiple independent work items | True parallel execution |
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

## Display Modes

### teammateMode Configuration

Configure in settings.json:
```json
{
  "teammateMode": "tmux"
}
```

Or per-session via CLI:
```bash
claude --teammate-mode in-process
```

### Display Mode Options

| Mode | Description | Requirements |
|------|-------------|--------------|
| `"auto"` (default) | tmux split panes if inside tmux session, otherwise in-process | None |
| `"tmux"` | Force tmux split pane display | tmux installed |
| `"in-process"` | All teammates in main terminal | None |

### tmux Mode
- Each teammate gets its own tmux pane
- All panes visible simultaneously in tiled layout
- Click into a pane to interact directly
- Claude Code manages pane lifecycle automatically
- Requires tmux installed and in PATH

### In-Process Mode
- All teammates run inside main terminal
- Shift+Up/Down to select and interact with teammates
- Shift+Tab to toggle delegate mode
- Ctrl+T to toggle the task list
- Enter to view teammate session, Escape to interrupt
- Works in any terminal, no extra setup

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

### Teammate Selection

Claude creates teammates based on the work items. Each teammate is a full Claude Code instance that:
- Loads project context (CLAUDE.md, skills, MCP servers) automatically
- Claims tasks from the shared task list
- Executes work items via `/run`
- Reports results back to the lead

## Session Structure

Team sessions use enhanced session structure:

```
Agent_Memory/sessions/team_{YYYYMMDD_HHMMSS}/
+-- instruction.yaml          # Request + team flags
+-- status.yaml               # Phase + team status
+-- team/
|   +-- team_manifest.yaml    # Team composition + display mode
|   +-- messages/             # Communication log
|   +-- metrics/
|       +-- timing.yaml       # Execution timing
|       +-- parallelism.yaml  # Utilization metrics
+-- workflow/
|   +-- plan.yaml
|   +-- decomposition.yaml
|   +-- coordination_log.yaml
+-- outputs/
```

Built-in team resources:
- Team config: `~/.claude/teams/{team-name}/config.json`
- Task list: `~/.claude/tasks/{team-name}/`

## Team Lifecycle

```
1. TeamCreate -- create team and shared task list
2. TaskCreate -- create work items as shared tasks (with dependencies)
3. Spawn teammates -- Claude creates teammate instances
4. SendMessage -- assign work items to teammates
5. Teammates execute via /run -- each with full orchestration
6. TaskList/TaskUpdate -- track progress, self-claim unblocked tasks
7. Aggregate -- synthesize results into coordination_log.yaml
8. SendMessage (shutdown_request) -- shut down teammates
9. TeamDelete -- clean up team and task resources
```

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
- **Parallelism**: Peak concurrent teammates, efficiency score
- **Speedup**: Actual vs estimated sequential time

View metrics in `team/metrics/` directory.

## Configuration

### settings.json

```json
{
  "teammateMode": "tmux",
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### Project Override

Create `.cagents/team_config.yaml`:

```yaml
team_mode:
  enabled: true
  min_work_items: 3       # Minimum for team mode
  max_team_size: 8        # Maximum teammates
  prefer_teams_for_tiers: [3, 4]
  teammate_mode: tmux     # auto | tmux | in-process
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
- Agent teams not enabled

**Fix**: Verify work item count, ensure `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json

### Teammates Not Appearing

**Symptom**: Team created but no teammates visible

**Causes**:
- In in-process mode, teammates may be running but not visible
- Task not complex enough for Claude to spawn teammates

**Fix**: Use Shift+Down to cycle through teammates, check task complexity

### Slow Team Execution

**Symptom**: Team mode slower than expected

**Causes**:
- Many sequential dependencies
- Low parallelism score
- Overhead for small workflows

**Fix**: Check parallelism_score in metrics, use standard mode for small workflows

### tmux Pane Issues

**Symptom**: tmux panes not showing

**Causes**:
- tmux not installed
- Not configured for tmux mode
- Running in unsupported terminal (VS Code, Windows Terminal, Ghostty)

**Fix**: Install tmux (`apt install tmux`), set `teammateMode: "tmux"` in settings.json, use supported terminal

### Lead Doing Work Instead of Delegating

**Symptom**: Lead implements tasks directly

**Fix**: Tell lead "Wait for teammates to complete tasks before proceeding", or enable delegate mode (Shift+Tab)

### Orphaned Team Resources

**Symptom**: Old team files persist

**Fix**: Use TeamDelete to clean up, or manually remove `~/.claude/teams/{team-name}/` and `~/.claude/tasks/{team-name}/`

## Hooks

Team-specific hooks in `.claude/hooks/`:
- `team-start.cjs` - Initialize team monitoring
- `team-stop.cjs` - Finalize and archive team session
- `team-task-complete.cjs` - Track task completion
- `teammate-idle-handler.cjs` - Find available work for idle teammates

## Related Documentation

- **CLAUDE.md** - Main project documentation
- **.claude/rules/core/teams.md** - Team coordination patterns
- **.claude/skills/team/SKILL.md** - /team skill specification
- **core/agents/team-trigger/SKILL.md** - Team initialization agent
- **core/agents/team-lead-adapter/SKILL.md** - Controller wrapper

---

**Version**: 9.2.0
**Part of**: cAgents - Parallel Team Execution via Built-in Agent Teams
