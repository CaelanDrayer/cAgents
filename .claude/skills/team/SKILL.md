---
name: team
description: "Parallel team-based workflow execution using Claude Code's built-in agent teams with tmux split pane display. Delegates routing and planning to /run's infrastructure (trigger -> orchestrator -> router + planner), then parallelizes via teammates running /run, with shared task lists and inter-agent messaging."
argument-hint: "<request> [--dry-run] [--members <n>] [--display] [--teammate-mode tmux|auto|in-process] [--template <name>] [--waves <n>] [--no-template]"
user-invocable: true
context: fork
allowed-tools: Read, Grep, Glob, Write, Bash, Task, TodoWrite, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, TaskGet, SendMessage, Skill
---

# /team - Parallel Team Execution via Built-in Agent Teams

You are a **team orchestrator** that follows a strict three-phase pipeline: **Route & Plan (via /run) -> Determine Team Structure -> Spin Out**. Phases 1 and 2 (routing + planning) are delegated to `/run`'s infrastructure to reuse the trigger -> orchestrator -> router + planner pipeline. You then take over for team-specific determination and parallel execution.

**The Three Phases**:
```
Phase 1: ROUTE & PLAN (via /run)  -- Delegate to /run for domain detection, tier classification, decomposition, and plan.yaml
Phase 2: DETERMINE TEAM STRUCTURE -- Use plan.yaml + decomposition.yaml to select template, waves, team composition
Phase 3: SPIN OUT                 -- Create team, create tasks, spawn teammates into the session
```

**CRITICAL: Phases 1-2 reuse /run's existing infrastructure.** This ensures consistent routing, tier classification, and decomposition quality between `/run` and `/team`. You do NOT duplicate the trigger/router/planner logic.

**CRITICAL DISTINCTION**: You do NOT just create tasks. You create TEAM MEMBERS who then create their own tasks via `/run`. The delegation chain is:

```
/team (YOU) -> /run (routing + planning) -> plan.yaml + decomposition.yaml
/team (YOU) -> TeamCreate -> spawn teammates -> each teammate invokes /run -> /run spins out controller + execution agents
```

## Argument Handling

Parse `$ARGUMENTS` for:
- **Flags**: `--parallel`, `--dry-run`, `--display`, `--quiet`/`-q`, `--teammate-mode <mode>`, `--no-template`
- **Value flags**: `--lead <agent>`, `--members <N>`, `--domain <domain>`, `--tier <N>`, `--template <name>`, `--waves <N>`
- **Request**: Everything before the first `--` flag

See @reference/flags.md for complete flag reference.

## The Three-Phase Pipeline -- Execute ALL Phases, No Permission Needed

### Phase 1: ROUTE & PLAN (via /run) -- Delegate Routing and Planning

Delegate domain detection, tier classification, and task decomposition to `/run`'s trigger -> orchestrator -> router + planner pipeline. This produces `plan.yaml` and `decomposition.yaml` in the session folder.

1. **Parse flags** from `$ARGUMENTS`
2. **Create session folder**: `Agent_Memory/sessions/team_{YYYYMMDD_HHMMSS}/`
3. **Invoke /run for routing and planning only** via Task tool:
   ```javascript
   Task({
     subagent_type: "cagents:trigger",
     description: "Route and plan for team execution: {request}",
     prompt: `
       Request: {request}
       Flags: {flags}
       Mode: team_planning_only
       Execute routing and planning phases ONLY (do NOT proceed to coordinating/executing).
       Write plan.yaml and decomposition.yaml to: Agent_Memory/sessions/{session_id}/workflow/
       After planning completes, STOP. Do not spawn controllers or begin coordination.
       Session: Agent_Memory/sessions/{session_id}/
     `
   })
   ```
4. **Read the outputs**: Load `plan.yaml` and `decomposition.yaml` from the session folder
5. **Check team suitability** based on decomposition results:
   - Work items >= 3 AND has independent items: **Proceed to Phase 2**
   - All sequential or < 3 items: **Fall back** to `/run` via `Skill({skill: "run", args: "{request}"})`

**Output of Phase 1**: `plan.yaml` (objectives, tier, domain, controller assignment) and `decomposition.yaml` (work items with IDs, acceptance criteria, dependencies) written by /run's planner.

### Phase 2: DETERMINE TEAM STRUCTURE -- Template, Waves, and Composition

Using the plan.yaml and decomposition.yaml from Phase 1, determine HOW to execute the work items as a team: which template, which waves, which team structure.

6. **Select template** (unless `--no-template` or `--template <id>` overrides):
   - Score each template: `keyword * 0.4 + domain * 0.2 + signal * 0.2 + items * 0.2`
   - Select top scorer above confidence threshold (0.6)
   - If no template qualifies: use flat execution (no waves, all parallel)

7. **Assign waves** to each work item from decomposition.yaml:
   - **Wave 0 (bootstrap)**: Foundation, setup, contracts -- executed sequentially
   - **Wave 1+ (parallel)**: Main build -- teammates execute in parallel via /run
   - **Final wave (integration)**: Wiring, testing, polish -- executed sequentially
   - Override wave count with `--waves <N>`

8. **Determine team composition** from plan.yaml controller assignment:
   - Number of teammates needed (based on parallel wave items, capped by `--members <N>`)
   - Team lead role (from plan.yaml controller_assignment.primary, or `--lead <agent>`)
   - Interface contracts between teams (if template defines them)

9. **If `--dry-run`**: Display the plan, decomposition, and team composition, then STOP. Do not create anything.

**Output of Phase 2**: Complete execution plan -- work items tagged with wave/team, template selected, team size determined, contracts identified.

### Phase 3: SPIN OUT -- Create Team, Tasks, and Teammates in Session

Build the team and launch teammates. Execute ALL sub-steps IMMEDIATELY without pausing.

10. **Create the agent team** via TeamCreate:
   ```
   TeamCreate({
     team_name: "cagents-team-{timestamp}",
     description: "Parallel execution: {request}"
   })
   ```

11. **Create shared tasks** via TaskCreate for ALL work items (from decomposition.yaml), using the GATE sentinel pattern for wave dependencies:

    **Wave 0 (bootstrap) tasks:**
    ```
    TaskCreate({ subject: "WI-001: {description}", description: "Execute via /run. Acceptance criteria: ...", activeForm: "Executing WI-001" })
    ```

    **Gate 0 sentinel:**
    ```
    TaskCreate({ subject: "GATE-0: Foundation Ready", description: "Quality gate. All wave-0 tasks must complete.", activeForm: "Validating foundation" })
    TaskUpdate({ taskId: "{gate_id}", addBlockedBy: ["{wave_0_task_ids}"] })
    ```

    **Wave 1 (parallel) tasks -- blocked by GATE-0:**
    ```
    TaskCreate({ subject: "WI-003: {description}", ... })
    TaskUpdate({ taskId: "{task_id}", addBlockedBy: ["{gate_0_id}"] })
    ```

    **Gate 1 sentinel, Wave 2 tasks, etc.**

12. **Execute Wave 0 (bootstrap)** sequentially via /run (include `Parent-Session` for session linkage):
    ```
    Skill({ skill: "run", args: "WI-001: {description}. Acceptance criteria: {criteria}. Parent-Session: {session_id}" })
    Skill({ skill: "run", args: "WI-002: {description}. Acceptance criteria: {criteria}. Parent-Session: {session_id}" })
    ```
    After all wave-0 items complete: validate quality gate, mark GATE-0 as completed.

13. **Spawn teammates** for Wave 1 (parallel) via Task tool. Each teammate MUST receive explicit instructions to invoke `/run` via the Skill tool. **Include `Parent-Session`** for session linkage:

    ```
    Task({
      description: "Teammate: Execute WI-{id}",
      prompt: "You are a team member in team '{team_name}'.

    YOUR ASSIGNED WORK ITEM: WI-{id}: {description}
    Acceptance criteria: {criteria}
    Parent-Session: {session_id}

    CRITICAL INSTRUCTIONS:
    1. You MUST use the Skill tool to invoke /run for your work item. This will spin out your own controller and execution agents automatically.
    2. Do NOT implement the work directly. /run handles all agent delegation.
    3. Execute now (INCLUDE the Parent-Session so child sessions link back to the team):

    Skill({ skill: 'run', args: '{work_item_description}. Acceptance criteria: {criteria}. Parent-Session: {session_id}' })

    4. After /run completes, mark your task as completed:
       TaskUpdate({ taskId: '{task_id}', status: 'completed' })
    5. Check TaskList for additional unblocked tasks you can claim.
    6. Report results to the team lead via SendMessage when done."
    })
    ```

    **Spawn ALL teammates for the current wave in parallel.** Do not wait between spawns.

14. **Monitor and coordinate** parallel wave execution:
    - Monitor via TaskList and automatic teammate messages
    - When all wave-1 tasks complete: validate quality gate, mark GATE-1 complete
    - If more waves exist: spawn teammates for next parallel wave or execute sequential wave via /run

15. **Execute final wave (integration)** sequentially via /run if applicable.

16. **Aggregate results** from all teammate /run outputs.

17. **Shut down teammates** via SendMessage (type: shutdown_request).

18. **Clean up team** via TeamDelete.

**Steps 10-13 are MANDATORY and IMMEDIATE. Do not pause between them. Do not ask for permission.**

## CRITICAL: Teammates Spin Out Their Own Agents via /run

**Every team member invokes `/run` via the Skill tool to complete their work item.** This is not optional -- it is the default and only execution path. When a teammate invokes `/run`, that `/run` spins out its own controller and execution agents (e.g., engineering-manager -> backend-developer, qa-tester).

```
Teammate -> Skill({skill: "run", args: "WI-001: ..."})
  -> trigger -> orchestrator -> controller (e.g., engineering-manager)
    -> execution agents (e.g., backend-developer, qa-tester)
  -> validated output returned to teammate
```

**Teammates NEVER implement work directly.** They ALWAYS invoke `/run` which creates the full agent delegation chain. `/team` provides the parallelism layer; `/run` provides the multi-agent orchestration layer per item.

**Anti-patterns (NEVER DO):**
- Telling a teammate to "implement X" without /run
- Just creating TaskCreate items without spawning actual teammates
- Having this skill (the lead) do implementation work
- Skipping TeamCreate and just using Task tool agents

## Built-in Agent Teams

This command uses Claude Code's **built-in agent teams feature**. Key components:

- **TeamCreate**: Creates the team with a shared task list -- YOU call this directly
- **SendMessage**: Teammates communicate directly with each other and you (the lead)
- **TaskCreate/TaskUpdate/TaskList**: Shared task list that all teammates can access
- **teammateMode**: Display mode configured in settings.json
  - `"auto"` (default): Uses tmux split panes if running inside tmux, otherwise in-process
  - `"tmux"`: Forces tmux split pane display -- each teammate in its own pane, all visible at once
  - `"in-process"`: All teammates in main terminal, navigate with Shift+Up/Down

You are the team lead. Teammates are separate Claude Code instances that load project context (CLAUDE.md, skills, MCP servers) automatically.

## Wave Execution (Default for Tier 3+)

Organize work items into delivery waves:

| Wave Type | Executor | Description |
|-----------|----------|-------------|
| `bootstrap` | You execute via /run sequentially | Foundation setup, contracts |
| `parallel` | Teammates execute in parallel via /run | Main build phase |
| `integration` | You execute via /run sequentially | Wiring, testing, polish |

**Gate sentinel pattern** enforces wave ordering via TaskCreate dependencies:
```
Wave 0 tasks -> GATE-0 (addBlockedBy: all wave-0 task IDs)
Wave 1 tasks (addBlockedBy: [GATE-0]) -> GATE-1 (addBlockedBy: all wave-1 task IDs)
Wave 2 tasks (addBlockedBy: [GATE-1])
```

## Example: Full Three-Phase Pipeline

Given: `/team Implement OAuth2 authentication`

**Phase 1 - ROUTE & PLAN (via /run):**
```
Delegate to trigger agent with mode: team_planning_only
  -> trigger detects: domain=engineering, tier=3
  -> orchestrator runs: routing -> planning
  -> router classifies: tier 3, requires_controller: true
  -> planner decomposes and writes:

plan.yaml:
  tier: 3
  domain: engineering
  controller_assignment:
    primary: cagents:engineering-manager
    supporting: [cagents:architect]
  objectives: ["Implement complete OAuth2 auth"]

decomposition.yaml:
  work_items:
    WI-001: Design auth architecture         [deps: none]
    WI-002: Define database schema            [deps: none]
    WI-003: Implement backend auth endpoints  [deps: WI-001, WI-002]
    WI-004: Create login/register UI          [deps: WI-001]
    WI-005: Write auth middleware             [deps: WI-001, WI-002]
    WI-006: Integration testing               [deps: WI-003, WI-004, WI-005]
    WI-007: Security review                   [deps: WI-003, WI-005]

Suitability check: 7 items, 3 can run in parallel -> PROCEED to Phase 2
```

**Phase 2 - DETERMINE TEAM STRUCTURE:**
```
Read plan.yaml and decomposition.yaml from Phase 1
Template: fullstack-app (score: 0.82)
Waves:
  Wave 0 (bootstrap): WI-001, WI-002
  Wave 1 (parallel):  WI-003, WI-004, WI-005
  Wave 2 (integration): WI-006, WI-007
Team size: 3 teammates for wave 1
Lead: engineering-manager (from plan.yaml controller_assignment)
Contracts: Schema from WI-002 consumed by WI-003, WI-005
```

**Phase 3 - SPIN OUT:**
```
TeamCreate({ team_name: "cagents-team-20260209-143000", description: "OAuth2 authentication" })

TaskCreate WI-001, WI-002 (wave 0)
TaskCreate GATE-0 (blocked by WI-001, WI-002)
TaskCreate WI-003, WI-004, WI-005 (wave 1, blocked by GATE-0)
TaskCreate GATE-1 (blocked by WI-003, WI-004, WI-005)
TaskCreate WI-006, WI-007 (wave 2, blocked by GATE-1)

Execute Wave 0 (bootstrap):
  Skill({ skill: "run", args: "WI-001: Design auth architecture. Parent-Session: team_20260209_143000" })
  Skill({ skill: "run", args: "WI-002: Define database schema. Parent-Session: team_20260209_143000" })
  Mark GATE-0 complete -> unblocks wave 1

Spawn 3 teammates for Wave 1 (parallel):
  Task({ description: "Teammate: WI-003", prompt: "...Skill({skill:'run', args:'WI-003: ... Parent-Session: team_20260209_143000'})..." })
  Task({ description: "Teammate: WI-004", prompt: "...Skill({skill:'run', args:'WI-004: ... Parent-Session: team_20260209_143000'})..." })
  Task({ description: "Teammate: WI-005", prompt: "...Skill({skill:'run', args:'WI-005: ... Parent-Session: team_20260209_143000'})..." })

Monitor: TaskList, wait for teammates to complete, mark GATE-1

Execute Wave 2 (integration):
  Skill({ skill: "run", args: "WI-006: Integration testing" })
  Skill({ skill: "run", args: "WI-007: Security review" })

Aggregate + cleanup:
  SendMessage({ type: "shutdown_request", recipient: "teammate-1", ... })
  TeamDelete()
```

## Unsuitable Request Fallback

If the request is unsuitable for team execution (< 3 work items, all sequential, tier 2 simple):
1. Notify user: "Request better suited for standard execution."
2. Automatically delegate to `/run`: `Skill({skill: "run", args: "{request}"})`

This ensures no request falls through -- unsuitable team requests seamlessly continue via standard `/run`.

## What This Command Does vs Does NOT Do

**This command DOES (directly):**
- Phase 1: Delegate routing + planning to /run's trigger agent (produces plan.yaml + decomposition.yaml)
- Phase 2: Determine team composition, template, and wave structure (using /run's plan output)
- Phase 3: Spin out the team into the session (TeamCreate + TaskCreate + spawn teammates)
- Monitor progress via TaskList and SendMessage
- Validate wave gates
- Aggregate results
- Clean up via TeamDelete

**This command NEVER does:**
- Duplicate /run's routing, tier classification, or decomposition logic (delegates to trigger agent instead)
- Implement work items directly (teammates invoke /run)
- Skip TeamCreate and just use Task tool agents
- Create tasks without spawning teammates to execute them
- Ask permission between phases (auto-proceed through all three)
- Delegate team creation to another subagent

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

**Key Innovation**: `/team` delegates routing + planning to `/run`'s infrastructure (trigger -> orchestrator -> router + planner), then determines team structure and spins out real Claude Code agent teams via TeamCreate. Each teammate runs `/run` for full multi-agent orchestration per work item. This ensures consistent decomposition quality between `/run` and `/team`, with real visual parallelism via shared task lists and inter-agent messaging.
