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
    |   Wave 1..N-1 (parallel per wave): main work -- subagents execute per-wave
    |   Wave N (integration): merge + validate -- lead executes via controller delegation
    |   Each wave has a GATE sentinel for quality validation
    |   If < 3 items or no parallel work: fall back to /run
    |
    Step 3: (no TeamCreate) -- teams are implicit since CC v2.1.178; nothing to create
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
    |   6a. Spawn ALL wave-K subagents as CONCURRENT Agent() calls in ONE message,
    |       run_in_background: false (synchronous -- lead collects all wave results together)
    |       Each wave subagent IS a controller agent that spawns execution agents
    |       DIRECTLY via the Agent tool (NOT via /run -- see below)
    |       (tmux panes are an experimental-path-only display option)
    |   6b. Monitor wave K progress via TaskList
    |   6c. All wave K items complete -> Validate GATE-K
    |   6d. Mark GATE-K complete -> unblocks wave K+1
    |   6e. Proceed to next wave (AUTOMATIC -- no permission)
    |
    Step 7: Execute final wave -- Integration + Validation (lead, sequentially)
    |
    Step 8: Report results (teams are implicit -- cleanup is automatic, no TeamDelete)
```

## Why Maximum Waves

More waves provide:
- **Quality gates between phases** -- catch issues early, not at the end
- **Clear dependency boundaries** -- consumers explicitly wait for providers
- **Smaller, focused work units** -- higher success rate per subagent
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
- **Each wave subagent spawns execution agents directly** -- full agent orchestration happens per work item without re-entering the pipeline
- **Simpler to execute reliably** -- fewer sequential dependencies = fewer failure points
- **Assigns controllers and wave numbers during decomposition** -- the lead determines which controller archetype each work item needs and which wave it belongs to

## CRITICAL: Spawn Subagents, Not Just Tasks

Teams are implicit since CC v2.1.178 — `TeamCreate`/`TeamDelete` were removed; do not call them. The one remaining failure mode is creating tasks (TaskCreate) without spawning subagents (Agent tool) to execute them. The correct sequence is:
```
TaskCreate (all items) -> concurrent Agent() calls (spawn wave-K subagents in ONE message, run_in_background: false)
```

## Implicit Agent Teams

`/team` uses Claude Code's **implicit agent teams** for parallel execution. `TeamCreate`/`TeamDelete` were removed in CC v2.1.178 — a team forms implicitly when you spawn subagents, and cleanup is automatic at session end. Do NOT call them.

| Tool | Purpose | When to Call |
|------|---------|-------------|
| **TaskCreate** | Creates work items as tasks | Step 4 (per work item) |
| **Agent** | Spawns subagent instances (concurrent, one message, `run_in_background: false`) | Step 6 (per wave-K item) |
| **TaskUpdate** | Marks tasks completed | After each item completes |
| **TaskList** | Checks progress | Steps 6-7 (monitoring) |
| **SendMessage** | Communicates with named teammates (EXPERIMENTAL path only; auto-resumes a stopped teammate by name, v2.1.77) | Experimental named-teammate path |

Removed (do not call): `TeamCreate`, `TeamDelete` (CC v2.1.178 — teams implicit, cleanup automatic).

## Display Modes (teammateMode) — Experimental Path Only

`teammateMode` affects ONLY the OPTIONAL experimental named-background-teammate path. The DEFAULT concurrent-Agent path has no panes — the wave subagents run synchronously (`run_in_background: false`).

| Mode | Description | Requirements |
|------|-------------|--------------|
| `"in-process"` (default since v2.1.179) | Teammates in main terminal (Shift+Up/Down) | None |
| `"tmux"` | tmux split panes -- each teammate in own pane (EXPERIMENTAL) | tmux installed |
| `"iterm2"` | iTerm2 panes (EXPERIMENTAL) | iTerm2 |
| `"auto"` | tmux if inside tmux, otherwise in-process | None |

Configure in settings.json (experimental path only):
```json
{
  "teammateMode": "in-process"
}
```

## Wave Subagent Execution Model

Each wave subagent IS a controller agent (e.g., `cagents:tech-lead`) that delegates to execution agents via Agent tool, then spawns `cagents:reviewer` to validate. Wave subagents spawn their execution agents **directly** -- they do NOT re-enter `/run` via the Skill tool. This keeps the nesting shallow within the 5-level depth budget (skill loop = depth 0; CC >= 2.1.172 supports up to 5 subagent generations beneath it):

```
Wave subagent (controller, e.g., tech-lead)
  -> Agent(cagents:backend-developer)   # execution agent implements the work item
  -> Agent(cagents:reviewer)            # validates against acceptance criteria
  -> PASS or REVISE (max 2 internal rounds)
```

Wave subagents NEVER implement work directly. They always coordinate through execution agents via the Agent tool. A subagent that needs a different specialty spawns that specialist as its own downward subagent, within the same 5-level ceiling — that is how parallelism compounds beyond the per-wave fan-out.

**Why no Skill("run") fork**: Wave subagents are full Claude Code sessions. As of CC 2.1.172 a nested `/run` from a wave subagent is technically possible within the 5-level depth budget, but it is avoided **by design for cost and clarity** -- invoking `/run` via Skill re-runs the full pipeline (orchestrator + planner + controller + validator), duplicating the Wave 0 enrichment the lead already did and burning extra context and tokens. Spawning execution agents directly keeps the chain short (subagent-controller -> execution agents -> reviewer) and reuses the lead's enrichment.

## Per-Wave Subagent Lifecycle

Wave subagents are spawned per-wave and end when their wave completes:

```
Wave K starts:
  1. Lead spawns subagents for all wave K work items (parallel)
  2. Each wave subagent IS a controller agent that delegates to execution agents via Agent tool
  3. Subagents write outputs to SESSION_DIR/outputs/wave-K/task-{N}/
  4. Subagents return their results to the lead (synchronous collection)
  5. Lead validates GATE-K quality criteria
  6. Spent wave K subagents end automatically (synchronous return)
  7. Lead marks GATE-K complete, unblocking wave K+1

Wave K+1 starts:
  1. Lead spawns NEW subagents for wave K+1 work items
  2. New subagents read outputs from previous waves
  3. ... cycle repeats
```

This per-wave lifecycle ensures:
- Clean context for each wave's subagents (no stale state)
- Previous wave outputs verified before next wave starts
- Resource cleanup between waves
- Clear wave boundaries in the session

## Team Lead Behavior

The /team skill acts as team lead. It ONLY coordinates:

**Allowed**: Decompose, TaskCreate, spawn subagents per wave (concurrent Agent() calls), validate gates, monitor, aggregate
**Prohibited**: Edit/Write implementation files, implement work items directly, skip spawning subagents, collapse multiple waves into one

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
