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
    |   orchestrator -> planner (decomposition inline; the planner absorbed
    |     task-decomposer and prompt-engineer in v12.0.0 -- there is no
    |     separate `decomposer` agent)
    |   Lead may also execute bootstrap work items
    |   Validate GATE-0 -> mark complete
    |
    Step 6: FOR EACH Wave K from 1 to N-1:
    |   6a. Spawn teammates for wave K (ALL at once, in parallel)
    |       Each teammate gets its own tmux pane (when teammateMode=tmux)
    |       Each teammate IS a controller agent that spawns execution agents
    |       DIRECTLY via the Agent tool (NOT via /run -- see below)
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

The /team skill decomposes the request directly instead of delegating to a separate trigger/planner chain because:
- **Eliminates fragile multi-agent dependency** -- no risk of a planner step failing to produce files
- **Faster startup** -- decomposition happens in one step, not a multi-agent chain
- **Each teammate spawns execution agents directly** -- full agent orchestration happens per work item without re-entering the pipeline
- **Simpler to execute reliably** -- fewer sequential dependencies = fewer failure points
- **Assigns controllers and wave numbers during decomposition** -- the lead determines which controller archetype each work item needs and which wave it belongs to

## CRITICAL: Create Teams AND Teammates

The two most common failure modes are:
1. Creating tasks (TaskCreate) without spawning teammates (Agent tool) to execute them
2. Skipping TeamCreate entirely and just using Agent tool subagents

Both are wrong. The correct sequence is ALWAYS:
```
TeamCreate -> TaskCreate (all items) -> Agent (spawn teammates)
```

## Built-in Agent Teams

`/team` uses Claude Code's **built-in agent teams** for parallel execution:

| Tool | Purpose | When to Call |
|------|---------|-------------|
| **TeamCreate** | Creates team + shared task list | Step 3 (once) |
| **TaskCreate** | Creates work items as tasks | Step 4 (per work item) |
| **Agent** | Spawns teammate instances | Step 6 (per wave-K item) |
| **TaskUpdate** | Marks tasks completed | After each item completes |
| **TaskList** | Checks progress | Steps 6-7 (monitoring) |
| **SendMessage** | Communicates with teammates | Monitoring + shutdown |
| **TeamDelete** | Cleans up team resources | Step 8 (cleanup) |

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

Each teammate IS a controller agent (e.g., `cagents:tech-lead`) that delegates to execution agents via Agent tool, then spawns `cagents:reviewer` to validate. Teammates spawn their execution agents **directly** -- they do NOT re-enter `/run` via the Skill tool. This keeps the nesting shallow within the 5-level depth budget (skill loop = depth 0; CC >= 2.1.172 supports up to 5 subagent generations beneath it):

```
Teammate (controller, e.g., tech-lead)
  -> Agent(cagents:backend-developer)   # execution agent implements the work item
  -> Agent(cagents:reviewer)            # validates against acceptance criteria
  -> PASS or REVISE (max 2 internal rounds)
```

Teammates NEVER implement work directly. They always coordinate through execution agents via the Agent tool. A teammate's execution agent MAY itself spawn a deeper helper sub-agent when a work item genuinely warrants it, within the same 5-level ceiling.

**Why no Skill("run") fork**: Teammates are full Claude Code sessions. As of CC 2.1.172 a nested `/run` from a teammate is technically possible within the 5-level depth budget, but it is avoided **by design for cost and clarity** -- invoking `/run` via Skill re-runs the full pipeline (orchestrator + planner + controller + validator), duplicating the Wave 0 enrichment the lead already did and burning extra context and tokens. Spawning execution agents directly keeps the chain short (teammate-controller -> execution agents -> reviewer) and reuses the lead's enrichment.

## Per-Wave Teammate Lifecycle

Teammates are spawned per-wave and shut down when their wave completes:

```
Wave K starts:
  1. Lead spawns teammates for all wave K work items (parallel)
  2. Each teammate IS a controller agent that delegates to execution agents via Agent tool
  3. Teammates write outputs to SESSION_DIR/outputs/wave-K/task-{N}/
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
cagents-memory/sessions/team_{timestamp}/
+-- instruction.yaml
+-- status.yaml
+-- team/
|   +-- team_manifest.yaml
|   +-- messages/
|   +-- metrics/
+-- workflow/
|   +-- plan.yaml
|   +-- work_items.yaml
|   +-- coordination_log.yaml
+-- outputs/
```

Built-in resources (managed by Claude Code):
- Team config: `~/.claude/teams/{team-name}/config.json`
- Task list: `~/.claude/tasks/{team-name}/`
