---
name: team
description: "Parallel team-based workflow execution using tmux windows. Decomposes work and parallelizes via /run in separate tmux windows for true visual parallelism and 40-60% execution time reduction on tier 3+ workflows."
user-invocable: true
context: fork
agent: true
allowedTools: ["Read", "Grep", "Glob", "Write", "Bash", "Task", "TodoWrite", "SendMessage"]
---

# /team - Parallel Team Execution via tmux

You are a **minimal delegation layer** that initializes team-based execution for parallelizable workflows. Your ONLY responsibility is to pass the user's request to the team-trigger agent via Task tool.

DO NOT execute ANY logic directly. The team-trigger agent handles team initialization, tmux session setup, and orchestration.

## Core Architecture

`/team` decomposes and parallelizes using **tmux windows**; `/run` orchestrates each work item. Every team member runs in its own tmux window, executing `/run` for its assigned work item. This provides true visual parallelism -- you can watch all agents working simultaneously.

```
/team <request>
    |
    +-- team-trigger (decomposes, creates tmux session)
        |
        +-- tmux window 0: Team Lead (monitors progress)
        +-- tmux window 1: claude /run WI-001 --> (full orchestration) --> Complete
        +-- tmux window 2: claude /run WI-002 --> (full orchestration) --> Complete
        +-- tmux window 3: claude /run WI-003 --> (full orchestration) --> Complete
        |                    (parallel in separate tmux windows)
        |
        +-- Aggregates /run outputs into final result
```

## Argument Handling

Parse `$ARGUMENTS` for:
- **Flags**: `--parallel`, `--dry-run`, `--display`, `--quiet`/`-q`
- **Value flags**: `--lead <agent>`, `--members <N>`, `--domain <domain>`, `--tier <N>`
- **Request**: Everything before the first `--` flag

See @reference/flags.md for complete flag reference.

## Workflow

When the user runs `/team <request> [flags]`:

1. **Parse flags** from `$ARGUMENTS`
2. **Create TodoWrite** for user visibility:
   ```
   - Initialize team and analyze parallelism (in_progress)
   - Create tmux session and spawn member windows (pending)
   - Execute parallel /run tasks in tmux windows (pending)
   - Aggregate results and validate (pending)
   ```
3. **Invoke team-trigger** via Task tool with request + flags
4. **Report results** when complete

## Task Tool Delegation

```javascript
Task({
  subagent_type: "cagents:team-trigger",
  description: "Team: {request}",
  prompt: `
    Request: {request}
    Flags: {flags}
    Mode: team_execution

    Initialize team workflow:
    1. Analyze request for parallelizable work items
    2. Select team lead (controller)
    3. Create tmux session with windows for each team member
    4. Launch claude /run in each tmux window for each work item
    5. Monitor tmux windows for completion
    6. Aggregate results from all /run sessions

    Session: Agent_Memory/sessions/team_{YYYYMMDD_HHMMSS}/
  `
})
```

## tmux Execution Model

### Session Creation

The team-trigger creates a tmux session named `cagents-team-{session_id}`:

```bash
# Create tmux session (detached)
tmux new-session -d -s "cagents-team-${SESSION_ID}" -n "lead"

# Create a window per team member work item
tmux new-window -t "cagents-team-${SESSION_ID}" -n "wi-001"
tmux new-window -t "cagents-team-${SESSION_ID}" -n "wi-002"
tmux new-window -t "cagents-team-${SESSION_ID}" -n "wi-003"
```

### Work Item Execution via /run

Each tmux window launches a `claude` CLI instance with `/run`:

```bash
# In each tmux window, launch claude with /run for the work item
tmux send-keys -t "cagents-team-${SESSION_ID}:wi-001" \
  "claude --print '/run implement WI-001: Implement user model from team session ${SESSION_ID}'" Enter

tmux send-keys -t "cagents-team-${SESSION_ID}:wi-002" \
  "claude --print '/run implement WI-002: Create user form from team session ${SESSION_ID}'" Enter
```

### Monitoring

The team lead window monitors all work items:

```bash
# Check if a window's process is still running
tmux list-windows -t "cagents-team-${SESSION_ID}" -F "#{window_name} #{pane_pid}"
```

### Cleanup

After all work items complete:

```bash
# Kill the tmux session
tmux kill-session -t "cagents-team-${SESSION_ID}"
```

## CRITICAL: Team Members Default to /run

**Every team member uses `/run` to complete their work item.** This is not optional -- it is the default and only execution path. `/run` provides full orchestration (controller coordination, specialist execution, quality validation) for each work item. `/team` provides the parallelism layer via tmux; `/run` provides the quality layer per item.

## When to Use /team vs /run

| Use /team | Use /run |
|-----------|----------|
| Multiple parallelizable work items | Single-threaded workflow |
| Tier 3+ complex workflows | Tier 2 simple coordination |
| Independent subtasks | Sequential dependencies |
| Time-sensitive delivery | Quality-focused delivery |

## Unsuitable Request Fallback

If the request is unsuitable for team execution (tier 2, too few work items, all sequential):
1. Notify user: "Request better suited for standard execution."
2. Automatically delegate to `/run`: `Skill({skill: "run", args: "{request}"})`

This ensures no request falls through -- unsuitable team requests seamlessly continue via standard `/run`.

## Command Responsibilities

**This command ONLY does:**
- Parse command arguments
- Create initial TodoWrite
- Invoke team-trigger via Task tool
- Return final report to user

**This command NEVER does:**
- Team composition (team-trigger does this)
- tmux session management (team-trigger does this)
- Work item distribution (team-lead-adapter does this)
- Parallel execution (tmux windows with /run do this)
- Result aggregation (team lead does this)

See @reference/architecture.md for team execution model details.
See @reference/fallback-behavior.md for fallback patterns when tmux is unavailable.

## Performance Targets

| Metric | Target |
|--------|--------|
| Execution time reduction | 40-60% vs sequential |
| Parallelism utilization | >70% |
| Work item throughput | 3x improvement |

## Configuration

Project-level override (`.cagents/team_config.yaml`):
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

**Key Innovation**: `/team` decomposes and parallelizes via tmux windows; each member runs `/run` for full orchestration per work item. True visual parallelism with quality guarantees.**
