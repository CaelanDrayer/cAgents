# /team Execution Architecture

## N-Wave Pipeline

```
/team <request>
    |
    Step 1: PARSE request and flags (including --waves <N>)
    |
    Step 2: DECOMPOSE into work items with MAXIMUM wave granularity
    |   Break request into work items with wave assignments (3-8+ items, 3-10 waves)
    |   Wave 0 (bootstrap): foundation/setup -- lead executes via enrichment pipeline
    |   Wave 1..N-1 (parallel per wave): main work -- teammates execute per-wave
    |   Wave N (integration): merge + validate -- lead executes via controller delegation
    |   Each wave has a GATE sentinel for quality validation
    |   If < 3 items or no parallel work: fall back to /run
    |
    Step 3: TeamCreate -- create agent team IMMEDIATELY
    |
    Step 4: TaskCreate -- create tasks for ALL work items + GATE sentinels
    |   Set up inter-wave dependencies via GATE sentinels
    |   Set up intra-wave dependencies from decomposition
    |
    Step 5: Execute Wave 0 -- Enrichment (lead, sequentially)
    |   orchestrator -> planner -> decomposer
    |   Lead may also execute bootstrap work items
    |   Validate GATE-0 -> mark complete
    |
    Step 6: FOR EACH Wave K from 1 to N-1:
    |   6a. Spawn teammates for wave K (ALL at once, in parallel)
    |       Each teammate gets its own tmux pane (when teammateMode=tmux)
    |       Each teammate invokes /run for their work item
    |   6b. Monitor wave K progress via TaskList + teammate messages
    |   6c. All wave K items complete -> Validate GATE-K
    |   6d. Shut down wave K teammates
    |   6e. Mark GATE-K complete -> unblocks wave K+1
    |   6f. Proceed to next wave (AUTOMATIC -- no permission)
    |
    Step 7: Execute final wave -- Integration + Validation (lead, sequentially)
    |
    Step 8: Shutdown remaining teammates + TeamDelete + report results
```

## Why Maximum Waves

More waves provide:
- **Quality gates between phases** -- catch issues early, not at the end
- **Clear dependency boundaries** -- consumers explicitly wait for providers
- **Smaller, focused work units** -- higher success rate per teammate
- **Better coordination** -- lead validates each phase before proceeding
- **Natural separation of concerns** -- research before design, design before implementation, implementation before testing

**Wave count guidance**:
| Tier | Minimum waves | Typical waves |
|------|---------------|---------------|
| 2 | 3 | 3-4 |
| 3 | 5 | 5-7 |
| 4 | 6 | 6-10 |

## Why Direct Decomposition (Not Delegated)

The /team skill decomposes the request directly instead of delegating to trigger/planner because:
- **Eliminates fragile multi-agent dependency** -- no risk of trigger/planner failing to produce files
- **Faster startup** -- decomposition happens in one step, not a multi-agent chain
- **Each teammate spawns its controller directly** -- full agent orchestration happens per work item
- **Simpler to execute reliably** -- fewer sequential dependencies = fewer failure points
- **Assigns controllers and wave numbers during decomposition** -- team lead determines which controller each work item needs and which wave it belongs to

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

## Per-Wave Teammate Lifecycle

Teammates are spawned per-wave and shut down when their wave completes:

```
Wave K starts:
  1. Lead spawns teammates for all wave K work items (parallel)
  2. Each teammate IS a controller agent that delegates to execution agents via Task tool
  3. Teammates write outputs to SESSION_DIR/outputs/task-{N}/
  4. Teammates send completion messages to lead
  5. Lead validates GATE-K quality criteria
  6. Lead shuts down wave K teammates
  7. Lead marks GATE-K complete, unblocking wave K+1

Wave K+1 starts:
  1. Lead spawns NEW teammates for wave K+1 work items
  2. New teammates read outputs from previous waves
  3. ... cycle repeats
```

This per-wave lifecycle ensures:
- Clean context for each wave's teammates (no stale state)
- Previous wave outputs verified before next wave starts
- Resource cleanup between waves
- Clear wave boundaries in the session

## Team Lead Behavior

The /team skill acts as team lead. It ONLY coordinates:

**Allowed**: Decompose, TeamCreate, TaskCreate, spawn teammates per wave, validate gates, monitor, aggregate, cleanup
**Prohibited**: Edit/Write implementation files, implement work items directly, skip spawning teammates, collapse multiple waves into one

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
