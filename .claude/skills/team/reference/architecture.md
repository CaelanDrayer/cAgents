# /team Execution Architecture

## Simplified Pipeline

```
/team <request>
    |
    Step 1: PARSE request and flags
    |
    Step 2: DECOMPOSE into work items (you do this directly)
    |   Break request into 3-8 work items with wave assignments
    |   Wave 0 (bootstrap): foundation/setup -- you execute via controller delegation
    |   Wave 1 (parallel): main work -- teammates execute in parallel
    |   Wave 2 (integration): testing/review -- you execute via controller delegation
    |   If < 3 items or no parallel work: fall back to /run
    |
    Step 3: TeamCreate -- create agent team IMMEDIATELY
    |
    Step 4: TaskCreate -- create task for EVERY work item
    |
    Step 5: Execute Wave 0 via controller delegation (you, sequentially)
    |
    Step 6: Spawn teammates via Task tool (ALL at once, in parallel)
    |   Each teammate gets its own tmux pane (when teammateMode=tmux)
    |   Each teammate spawns its assigned controller directly via Task tool
    |
    Step 7: Monitor progress via TaskList + teammate messages
    |
    Step 8: Execute Wave 2 via controller delegation (you, sequentially)
    |
    Step 9: Shutdown teammates + TeamDelete + report results
```

## Why Direct Decomposition (Not Delegated)

The /team skill decomposes the request directly instead of delegating to trigger/planner because:
- **Eliminates fragile multi-agent dependency** -- no risk of trigger/planner failing to produce files
- **Faster startup** -- decomposition happens in one step, not a multi-agent chain
- **Each teammate spawns its controller directly** -- full agent orchestration happens per work item
- **Simpler to execute reliably** -- fewer sequential dependencies = fewer failure points
- **Assigns controllers during decomposition** -- team lead determines which controller each work item needs

## CRITICAL: Create Teams AND Teammates

The two most common failure modes are:
1. Creating tasks (TaskCreate) without spawning teammates (Task tool) to execute them
2. Skipping TeamCreate entirely and just using Task tool subagents

Both are wrong. The correct sequence is ALWAYS:
```
TeamCreate -> TaskCreate (all items) -> Task (spawn teammates)
```

## Built-in Agent Teams

`/team` uses Claude Code's **built-in agent teams** for parallel execution:

| Tool | Purpose | When to Call |
|------|---------|-------------|
| **TeamCreate** | Creates team + shared task list | Step 3 (once) |
| **TaskCreate** | Creates work items as tasks | Step 4 (per work item) |
| **Task** | Spawns teammate instances | Step 6 (per wave-1 item) |
| **TaskUpdate** | Marks tasks completed | After each item completes |
| **TaskList** | Checks progress | Step 7 (monitoring) |
| **SendMessage** | Communicates with teammates | Monitoring + shutdown |
| **TeamDelete** | Cleans up team resources | Step 9 (cleanup) |

## Display Modes (teammateMode)

| Mode | Description | Requirements |
|------|-------------|--------------|
| `"auto"` (default) | tmux panes if inside tmux, otherwise in-process | None |
| `"tmux"` | Force tmux split panes -- each teammate in own pane | tmux installed |
| `"in-process"` | All teammates in main terminal (Shift+Up/Down) | None |

Configure in settings.json:
```json
{
  "teammateMode": "tmux"
}
```

## Teammate Execution Model

Each teammate spawns its assigned controller directly via Task tool. This eliminates the extra Skill fork level, keeping nesting within Claude Code's supported limits:

```
Teammate (full session) -> Task({subagent_type: "cagents:{controller_name}"})
  -> controller (e.g., engineering-manager) -> execution agents (e.g., backend-developer)
  -> validated output returned to teammate
```

Teammates NEVER implement work directly. They always coordinate through controllers.

**Why no Skill("run") fork**: Teammates are full Claude Code sessions. Invoking /run via Skill would add an unnecessary nesting level (teammate -> /run fork -> controller -> execution = 3 levels). Spawning the controller directly keeps it at 2 levels (teammate -> controller -> execution).

## Team Lead Behavior

The /team skill acts as team lead. It ONLY coordinates:

**Allowed**: Decompose, TeamCreate, TaskCreate, spawn teammates, monitor, aggregate, cleanup
**Prohibited**: Edit/Write implementation files, implement work items directly, skip spawning teammates

## Session Structure

```
Agent_Memory/sessions/team_{timestamp}/
+-- instruction.yaml
+-- status.yaml
+-- team/
|   +-- team_manifest.yaml
|   +-- messages/
|   +-- metrics/
+-- workflow/
|   +-- coordination_log.yaml
+-- outputs/
```

Built-in resources (managed by Claude Code):
- Team config: `~/.claude/teams/{team-name}/config.json`
- Task list: `~/.claude/tasks/{team-name}/`
