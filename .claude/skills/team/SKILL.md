---
name: team
description: "Parallel team-based workflow execution using Claude Code's built-in agent teams with tmux split pane display. Decomposes work and parallelizes via teammates running /run, with shared task lists and inter-agent messaging."
argument-hint: "<request> [--dry-run] [--members <n>] [--display] [--teammate-mode tmux|auto|in-process]"
user-invocable: true
context: fork
allowed-tools: Read, Grep, Glob, Write, Bash, Task, TodoWrite, TeamCreate, TaskCreate, TaskUpdate, TaskList, SendMessage
---

# /team - Parallel Team Execution via Built-in Agent Teams

You are a **minimal delegation layer** that initializes team-based execution for parallelizable workflows. Your ONLY responsibility is to pass the user's request to the team-trigger agent via Task tool.

DO NOT execute ANY logic directly. The team-trigger agent handles team initialization, teammate spawning, and orchestration.

## Core Architecture

`/team` uses **Claude Code's built-in agent teams** to coordinate multiple Claude Code instances working in parallel. Each teammate runs in its own context window, executing `/run` for its assigned work item. When `teammateMode` is set to `"tmux"`, each teammate gets its own tmux split pane for true visual parallelism.

```
/team <request>
    |
    +-- team-trigger (decomposes, creates agent team via TeamCreate)
        |
        +-- Team Lead (coordinates via SendMessage, manages shared TaskList)
        +-- Teammate 1: /run WI-001 --> (full orchestration) --> Complete
        +-- Teammate 2: /run WI-002 --> (full orchestration) --> Complete
        +-- Teammate 3: /run WI-003 --> (full orchestration) --> Complete
        |                    (parallel -- each in own context/tmux pane)
        |
        +-- Aggregates /run outputs into final result
```

## Built-in Agent Teams

This command uses Claude Code's **built-in agent teams feature** (not custom tmux scripting). Key components:

- **TeamCreate**: Creates the team with a shared task list
- **SendMessage**: Teammates communicate directly with each other and the lead
- **TaskCreate/TaskUpdate/TaskList**: Shared task list that all teammates can access
- **teammateMode**: Display mode configured in settings.json
  - `"auto"` (default): Uses tmux split panes if running inside tmux, otherwise in-process
  - `"tmux"`: Forces tmux split pane display -- each teammate in its own pane, all visible at once
  - `"in-process"`: All teammates in main terminal, navigate with Shift+Up/Down

The team lead is the main session. Teammates are separate Claude Code instances that load project context (CLAUDE.md, skills, MCP servers) automatically.

## Argument Handling

Parse `$ARGUMENTS` for:
- **Flags**: `--parallel`, `--dry-run`, `--display`, `--quiet`/`-q`, `--teammate-mode <mode>`
- **Value flags**: `--lead <agent>`, `--members <N>`, `--domain <domain>`, `--tier <N>`
- **Request**: Everything before the first `--` flag

See @reference/flags.md for complete flag reference.

## Workflow

When the user runs `/team <request> [flags]`:

1. **Parse flags** from `$ARGUMENTS`
2. **Create TodoWrite** for user visibility:
   ```
   - Initialize team and analyze parallelism (in_progress)
   - Create agent team and spawn teammates (pending)
   - Execute parallel /run tasks via teammates (pending)
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

    Initialize team workflow using built-in agent teams:
    1. Analyze request for parallelizable work items
    2. Select team lead (controller)
    3. Create agent team via TeamCreate
    4. Create shared tasks via TaskCreate for each work item
    5. Spawn teammates -- each executes /run for their assigned work item
    6. Monitor via TaskList and teammate messages
    7. Aggregate results from all /run sessions

    Session: Agent_Memory/sessions/team_{YYYYMMDD_HHMMSS}/
  `
})
```

## Agent Team Execution Model

### Team Creation

The team-trigger creates an agent team using Claude Code's built-in TeamCreate:

```javascript
TeamCreate({
  team_name: "cagents-team-{session_id}",
  description: "Parallel execution of {request}"
})
```

### Task Distribution

Work items are created as shared tasks that teammates claim and execute:

```javascript
TaskCreate({
  subject: "WI-001: Implement user model",
  description: "Execute via /run: implement WI-001...",
  activeForm: "Implementing user model"
})
```

### Teammate Communication

The lead and teammates communicate via SendMessage:

```javascript
// Lead assigns work to a teammate
SendMessage({
  type: "message",
  recipient: "backend-dev",
  content: "Execute WI-001: Implement user model via /run",
  summary: "Assigning WI-001 to backend-dev"
})

// Broadcast status update
SendMessage({
  type: "broadcast",
  content: "WI-001 complete. WI-003 is now unblocked.",
  summary: "WI-001 complete, WI-003 unblocked"
})
```

### tmux Split Pane Display

When `teammateMode: "tmux"` is set in settings.json (or the user is already in a tmux session with `"auto"` mode), each teammate gets its own tmux pane. All panes are visible simultaneously in a tiled layout. No manual tmux scripting is needed -- Claude Code manages the panes automatically.

## CRITICAL: Team Members Default to /run

**Every team member uses `/run` to complete their work item.** This is not optional -- it is the default and only execution path. `/run` provides full orchestration (controller coordination, specialist execution, quality validation) for each work item. `/team` provides the parallelism layer via agent teams; `/run` provides the quality layer per item.

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
- Agent team creation (team-trigger does this via TeamCreate)
- Work item distribution (team-lead-adapter does this via SendMessage)
- Parallel execution (teammates do this, each running /run)
- Result aggregation (team lead does this)

See @reference/architecture.md for team execution model details.
See @reference/fallback-behavior.md for fallback patterns.

## Performance Targets

| Metric | Target |
|--------|--------|
| Execution time reduction | 40-60% vs sequential |
| Parallelism utilization | >70% |
| Work item throughput | 3x improvement |

## Configuration

### settings.json (teammateMode)

```json
{
  "teammateMode": "tmux"
}
```

Options: `"auto"` (default), `"tmux"` (force split panes), `"in-process"` (all in main terminal).

### Project-level override (`.cagents/team_config.yaml`):

```yaml
team_mode:
  enabled: true
  min_work_items: 3
  max_team_size: 8
  prefer_teams_for_tiers: [3, 4]
  teammate_mode: tmux    # auto | tmux | in-process
```

---

**Key Innovation**: `/team` uses Claude Code's built-in agent teams with tmux split pane display; each teammate runs `/run` for full orchestration per work item. Real visual parallelism with shared task lists and inter-agent messaging.
