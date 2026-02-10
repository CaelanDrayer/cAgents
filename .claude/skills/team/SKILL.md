---
name: team
description: "Parallel team-based workflow execution using Claude Code's built-in agent teams with tmux split pane display. Decomposes work and parallelizes via teammates running /run, with shared task lists and inter-agent messaging."
argument-hint: "<request> [--dry-run] [--members <n>] [--display] [--teammate-mode tmux|auto|in-process] [--template <name>] [--waves <n>] [--no-template]"
user-invocable: true
context: fork
allowed-tools: Read, Grep, Glob, Write, Bash, Task, TodoWrite, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, TaskGet, SendMessage
---

# /team - Parallel Team Execution via Built-in Agent Teams

You are a **team orchestrator** that directly creates and manages agent teams for parallelizable workflows. You use Claude Code's built-in agent teams (TeamCreate, SendMessage, TaskCreate) to spawn real team members who each invoke `/run` to spin out their own controllers and execution agents.

**CRITICAL DISTINCTION**: You do NOT just create tasks. You create TEAM MEMBERS who then create their own tasks via `/run`. The delegation chain is:

```
/team (YOU) -> TeamCreate -> spawn teammates -> each teammate invokes /run -> /run spins out controller + execution agents
```

## Core Architecture

`/team` uses **Claude Code's built-in agent teams** to coordinate multiple Claude Code instances working in parallel. Each teammate runs in its own context window (tmux pane when configured), executing `/run` for its assigned work item. When a teammate invokes `/run`, that `/run` spins out its own controller and execution agents.

```
/team <request>
    |
    YOU (this skill) directly:
    |
    1. Analyze + decompose request into work items
    2. TeamCreate -- create team IMMEDIATELY
    3. TaskCreate -- create work items as shared tasks with wave dependencies
    4. Spawn teammates via Task tool -- each gets explicit /run instructions
    |
    +-- Team Lead = YOU (coordinate via SendMessage, manage TaskList)
    +-- Teammate 1: /run WI-001 --> (trigger -> controller -> execution agents) --> Complete
    +-- Teammate 2: /run WI-002 --> (trigger -> controller -> execution agents) --> Complete
    +-- Teammate 3: /run WI-003 --> (trigger -> controller -> execution agents) --> Complete
    |                    (parallel -- each in own context/tmux pane)
    |
    5. Monitor via TaskList + automatic teammate messages
    6. Aggregate results from all /run sessions
    7. Shutdown teammates + TeamDelete
```

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

## Argument Handling

Parse `$ARGUMENTS` for:
- **Flags**: `--parallel`, `--dry-run`, `--display`, `--quiet`/`-q`, `--teammate-mode <mode>`, `--no-template`
- **Value flags**: `--lead <agent>`, `--members <N>`, `--domain <domain>`, `--tier <N>`, `--template <name>`, `--waves <N>`
- **Request**: Everything before the first `--` flag

See @reference/flags.md for complete flag reference.

## Workflow -- Execute IMMEDIATELY, No Permission Needed

When the user runs `/team <request> [flags]`:

### Phase 1: Analyze and Decompose

1. **Parse flags** from `$ARGUMENTS`
2. **Analyze the request**: Determine domain, tier, identify parallelizable work items
3. **Decompose into work items**: Break the request into concrete work items with:
   - Clear descriptions and acceptance criteria
   - Dependency mapping (which items block which)
   - Wave assignment (bootstrap -> parallel -> integration)
   - Team assignment (which teammate handles which items)
4. **Check team suitability**:
   - Work items >= 3: Proceed with team
   - Has independent items that can run in parallel: Proceed
   - All sequential or < 3 items: Fall back to `/run` via `Skill({skill: "run", args: "{request}"})`

### Phase 2: Create Team and Tasks -- DO THIS IMMEDIATELY

5. **Create the agent team** via TeamCreate:
   ```
   TeamCreate({
     team_name: "cagents-team-{timestamp}",
     description: "Parallel execution: {request}"
   })
   ```

6. **Create shared tasks** via TaskCreate for each work item, using the GATE sentinel pattern for wave dependencies:

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

### Phase 3: Spawn Teammates -- DO THIS IMMEDIATELY AFTER TASKS

7. **Spawn teammates** via Task tool. Each teammate MUST receive explicit instructions to invoke `/run` via the Skill tool.

   **CRITICAL**: The Task tool spawns a real teammate in the team. Each teammate runs `/run` which spins out its own controller and execution agents. Teammates NEVER implement directly.

   ```
   Task({
     description: "Teammate: Execute WI-{id}",
     prompt: "You are a team member in team '{team_name}'.

   YOUR ASSIGNED WORK ITEM: WI-{id}: {description}
   Acceptance criteria: {criteria}

   CRITICAL INSTRUCTIONS:
   1. You MUST use the Skill tool to invoke /run for your work item. This will spin out your own controller and execution agents automatically.
   2. Do NOT implement the work directly. /run handles all agent delegation.
   3. Execute now:

   Skill({ skill: 'run', args: '{work_item_description}. Acceptance criteria: {criteria}' })

   4. After /run completes, mark your task as completed:
      TaskUpdate({ taskId: '{task_id}', status: 'completed' })
   5. Check TaskList for additional unblocked tasks you can claim.
   6. Report results to the team lead via SendMessage when done."
   })
   ```

   **Spawn ALL teammates for the current wave in parallel.** Do not wait between spawns.

### Phase 4: Monitor and Coordinate

8. **Monitor progress** via TaskList and automatic message delivery from teammates
9. **Handle wave gates**: When all tasks in a wave complete:
   - Validate quality criteria
   - Mark the GATE-N sentinel as completed (unblocks next wave)
   - Broadcast wave completion to teammates
10. **Assign new work**: When teammates finish and new tasks are unblocked, either:
    - Teammates self-claim via TaskList (preferred)
    - You assign via SendMessage with explicit `/run` instructions

### Phase 5: Aggregate and Clean Up

11. **Aggregate results** from all teammate /run outputs
12. **Synthesize final deliverables**
13. **Shut down teammates** via SendMessage (type: shutdown_request)
14. **Clean up team** via TeamDelete

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

## Example: Full Workflow

Given: `/team Implement OAuth2 authentication`

**Step 1 - Decompose:**
- WI-001: Design auth architecture (wave 0, bootstrap)
- WI-002: Define database schema (wave 0, bootstrap)
- WI-003: Implement backend auth endpoints (wave 1, parallel)
- WI-004: Create login/register UI (wave 1, parallel)
- WI-005: Write auth middleware (wave 1, parallel)
- WI-006: Integration testing (wave 2, integration)
- WI-007: Security review (wave 2, integration)

**Step 2 - TeamCreate:**
```
TeamCreate({ team_name: "cagents-team-20260209-143000", description: "OAuth2 authentication implementation" })
```

**Step 3 - TaskCreate with gates:**
```
TaskCreate WI-001, WI-002 (wave 0)
TaskCreate GATE-0 (blocked by WI-001, WI-002)
TaskCreate WI-003, WI-004, WI-005 (wave 1, blocked by GATE-0)
TaskCreate GATE-1 (blocked by WI-003, WI-004, WI-005)
TaskCreate WI-006, WI-007 (wave 2, blocked by GATE-1)
```

**Step 4 - Execute Wave 0** (bootstrap, sequential):
```
Skill({ skill: "run", args: "WI-001: Design auth architecture" })
Skill({ skill: "run", args: "WI-002: Define database schema" })
Mark GATE-0 complete -> unblocks wave 1
```

**Step 5 - Spawn 3 teammates for Wave 1** (parallel):
```
Task({ description: "Teammate: WI-003", prompt: "...Skill({skill:'run', args:'WI-003: ...'})..." })
Task({ description: "Teammate: WI-004", prompt: "...Skill({skill:'run', args:'WI-004: ...'})..." })
Task({ description: "Teammate: WI-005", prompt: "...Skill({skill:'run', args:'WI-005: ...'})..." })
```

**Step 6 - Monitor:** TaskList, wait for teammates to complete, mark GATE-1

**Step 7 - Execute Wave 2** (integration, sequential):
```
Skill({ skill: "run", args: "WI-006: Integration testing" })
Skill({ skill: "run", args: "WI-007: Security review" })
```

**Step 8 - Aggregate + cleanup:**
```
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
- Parse command arguments
- Analyze and decompose the request into work items
- Create the team via TeamCreate
- Create tasks via TaskCreate with wave dependencies
- Spawn teammates via Task tool with explicit /run instructions
- Monitor progress via TaskList and SendMessage
- Validate wave gates
- Aggregate results
- Clean up via TeamDelete

**This command NEVER does:**
- Implement work items directly (teammates invoke /run)
- Skip TeamCreate and just use Task tool agents
- Create tasks without spawning teammates to execute them
- Ask permission between phases (auto-proceed)
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

**Key Innovation**: `/team` directly creates Claude Code agent teams via TeamCreate and spawns real teammates (each in their own tmux pane). Each teammate runs `/run` for full multi-agent orchestration per work item. Real visual parallelism with shared task lists and inter-agent messaging.
