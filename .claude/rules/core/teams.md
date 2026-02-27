---
paths:
  - "core/agents/team-*/**"
  - ".claude/skills/team/**"
  - ".claude/hooks/team-*.cjs"
  - ".claude/hooks/teammate-*.cjs"
---

# Team Coordination Patterns

Guidelines for parallel team execution in cAgents V9.2 using Claude Code's built-in agent teams.

## Overview

**Core Architecture**: `/team` decomposes the request into work items across as many waves as the work requires, creates a real agent team via TeamCreate, and spawns teammates per-wave who each invoke `/run` for their work item. Each teammate appears as a tmux pane (when teammateMode=tmux). More waves = better quality gating.

Team Mode enables N-wave parallel execution with:
- **Maximum wave decomposition**: /team breaks the request into work items across 3-10 waves (more waves preferred)
- **Per-wave spawn cycles**: Teammates are spawned fresh for each wave, shut down after wave completes
- **GATE sentinel quality checks**: Lead validates between waves before proceeding
- **Built-in agent teams**: TeamCreate, SendMessage, TaskCreate/TaskList for coordination
- **teammateMode: tmux**: Each teammate in its own tmux split pane (managed by Claude Code)
- **Every work item via /run**: Full orchestration (plan, coordinate, execute, validate) per item
- **Shared task lists**: Built-in TaskCreate/TaskList at `~/.claude/tasks/{team-name}/`
- **Independent contexts**: Each teammate has its own context window

## CRITICAL: Teammates Spin Out Their Own Agents

**This is the most important principle of team mode.** Teammates do NOT implement work items directly. Each teammate invokes `/run` via the Skill tool, and `/run` creates its own controller and execution agents.

```
Teammate -> Skill({skill: "run", args: "WI-001: ..."})
  -> trigger -> orchestrator -> controller (e.g., engineering-manager)
    -> execution agents (e.g., backend-developer, qa-tester)
  -> validated output
```

**Every work assignment to a teammate MUST include the explicit Skill invocation pattern:**
```javascript
Skill({ skill: "run", args: "implement WI-001: {description}" })
```

**Anti-patterns (NEVER DO):**
- Telling a teammate to "implement X" without /run
- Having the team lead do implementation work
- Skipping /run for "simple" work items
- Having teammates answer questions directly instead of delegating to /run

## CRITICAL: Create Teams, Not Just Tasks

**The most common failure mode is creating tasks without spawning real team members.** The `/team` skill MUST execute ALL THREE steps:
1. **TeamCreate** -- Create a real agent team (NOT just a task list). This is what enables tmux panes.
2. **TaskCreate** -- Create work items as shared tasks
3. **Spawn teammates via Task tool** -- Each Task call creates a real Claude Code instance (appears as tmux pane)

All three steps are required. Creating tasks without spawning teammates to execute them is the primary bug that causes /team to "never spin out team members."

## Execution Pipeline

```
/team <request>
    |
    Step 1: PARSE request and flags
    Step 2: DECOMPOSE into work items with MAXIMUM wave granularity (3-10 waves)
    Step 3: TeamCreate -- create team IMMEDIATELY
    Step 4: TaskCreate -- create tasks for ALL work items + GATE sentinels with wave dependencies
    Step 5: Execute Wave 0 (enrichment + bootstrap) -- lead does this sequentially
    |
    Step 6: FOR EACH Wave K (1 to N-1):
    |   +-- Spawn teammates for wave K (ALL at once, in parallel)
    |   |   +-- Teammate 1: /run WI-{X} --> (controller -> execution agents) --> Complete
    |   |   +-- Teammate 2: /run WI-{Y} --> (controller -> execution agents) --> Complete
    |   |   +-- Teammate 3: /run WI-{Z} --> (controller -> execution agents) --> Complete
    |   |                    (parallel within wave -- each in own tmux pane)
    |   +-- Monitor wave K via TaskList + teammate messages
    |   +-- Validate GATE-K when all wave K items complete
    |   +-- Shut down wave K teammates
    |   +-- Proceed to wave K+1 (AUTOMATIC)
    |
    Step 7: Execute final wave (integration + validation) -- lead does this
    Step 8: Shutdown remaining teammates + TeamDelete + report results
```

**Steps 3-6 are MANDATORY and IMMEDIATE. Do not pause or ask permission between waves.**

**CRITICAL: Maximize waves.** More waves = more quality gates = higher quality output. There is nothing wrong with more waves. Prefer 5-7 waves over 2-3 waves.

## Built-in Agent Teams

cAgents uses Claude Code's built-in agent teams feature, which provides:

| Tool | Purpose |
|------|---------|
| **TeamCreate** | Create team with shared task list |
| **TeamDelete** | Clean up team and task resources |
| **TaskCreate** | Create work items as shared tasks |
| **TaskUpdate** | Update task status, set owner, manage dependencies |
| **TaskList** | View all tasks and their status |
| **TaskGet** | Read full task details |
| **SendMessage** | Direct messaging between lead and teammates |

Key behaviors:
- Teammate messages arrive automatically (no polling)
- Idle notifications sent when teammates finish turns
- File-lock based task claiming prevents race conditions
- Team config at `~/.claude/teams/{team-name}/config.json`
- Task list at `~/.claude/tasks/{team-name}/`

## Claude Code Agent Teams: Capabilities and Limitations

### Capabilities
- **Direct teammate interaction**: Users can message teammates directly using Shift+Down (in-process) or clicking panes (split)
- **Plan approval mode**: Use `CLAUDE_CODE_PLAN_MODE_REQUIRED` to require teammates to plan before implementing. Lead reviews and approves/rejects plans.
- **Teammate model override**: Specify models per teammate: "Use Sonnet for each teammate"
- **Task dependencies**: Tasks can block other tasks. Blocked tasks auto-unblock when dependencies complete.
- **Self-claiming**: After finishing, teammates pick up next unassigned, unblocked task autonomously.
- **In-process navigation**: Shift+Down to cycle teammates, Enter to view, Escape to interrupt, Ctrl+T for task list.

### Limitations (Claude Code Enforced)
- **No session resumption**: `/resume` and `/rewind` do not restore in-process teammates
- **No nested teams**: Teammates cannot spawn their own teams. Only the lead manages the team.
- **One team per session**: Clean up current team before starting a new one.
- **Lead is fixed**: Cannot promote a teammate to lead or transfer leadership.
- **Permissions set at spawn**: All teammates start with lead's permission mode. Can change individually after spawning, but not at spawn time.
- **Task status can lag**: Teammates sometimes fail to mark tasks completed, blocking dependents.
- **Shutdown can be slow**: Teammates finish current request before shutting down.
- **Split panes require tmux/iTerm2**: Not supported in VS Code terminal, Windows Terminal, or Ghostty.

## Display Modes (teammateMode)

| Mode | Behavior | Requirements |
|------|----------|--------------|
| `"auto"` (default) | tmux if inside tmux session, otherwise in-process | None |
| `"tmux"` | Force tmux split panes -- each teammate in own pane | tmux installed |
| `"in-process"` | All teammates in main terminal (Shift+Up/Down) | None |

Configure in settings.json:
```json
{
  "teammateMode": "tmux"
}
```

Per-session: `claude --teammate-mode tmux`

## When to Use Teams

### Use Team Mode
- Tier 3+ complex workflows with multiple work items
- Work items that can execute in parallel (few dependencies)
- Time-sensitive delivery requiring speedup
- Large features with distinct components

### Use Standard Mode
- Tier 2 moderate workflows
- Highly sequential work items
- Small changes with minimal parallelism benefit
- When team overhead exceeds benefit

## Team Suitability Criteria

```yaml
required:
  work_items: ">= 3"
  has_independent_items: true

preferred:
  tier: ">= 3"
  parallelism_score: "> 0.5"

disqualified:
  all_sequential: true
  tier: 2 with items < 4
```

## Team Lifecycle (Execute IMMEDIATELY -- No Permission Required)

```
1. Parse request and flags (including --waves <N>)
2. Decompose request into work items with MAXIMUM wave granularity
3. TeamCreate -- create team and shared task list IMMEDIATELY
4. TaskCreate -- create ALL work items + GATE sentinels with wave dependencies
5. Execute wave 0 (enrichment + bootstrap) sequentially
6. FOR EACH wave K (1 to N-1):
   a. Spawn wave K teammates IN PARALLEL
   b. Monitor wave K via TaskList + teammate messages
   c. Validate GATE-K when all wave K items complete
   d. Shut down wave K teammates
   e. Mark GATE-K complete -> proceed to wave K+1
7. Execute final wave (integration + validation) sequentially
8. Shutdown remaining teammates + TeamDelete
```

**Steps 3-6 are MANDATORY and IMMEDIATE. Do not pause or ask permission between waves.**

**Wave count guidance:**
| Tier | Minimum waves | Typical waves |
|------|---------------|---------------|
| 2 | 3 | 3-4 |
| 3 | 5 | 5-7 |
| 4 | 6 | 6-10 |

### Team Creation

```javascript
TeamCreate({
  team_name: "cagents-team-{session_id}",
  description: "Parallel execution of {request}"
})
```

### Task Distribution

```javascript
// Create tasks for each work item
TaskCreate({
  subject: "WI-001: Implement user model",
  description: "Execute via /run: ...",
  activeForm: "Implementing user model"
})

// Set dependencies
TaskUpdate({ taskId: "3", addBlockedBy: ["1"] })
```

### Teammate Communication -- MUST Include Skill Invocation

```javascript
// Assign work -- ALWAYS include explicit Skill invocation
SendMessage({
  type: "message",
  recipient: "teammate-1",
  content: "You are assigned WI-001. CRITICAL: Execute via the Skill tool to spin out your own agents:\nSkill({ skill: 'run', args: 'implement WI-001: {description}' })\nDo NOT implement directly. /run creates controller + execution agents. Report when complete.",
  summary: "Assigning WI-001 with /run"
})

// Broadcast update (use sparingly)
SendMessage({
  type: "broadcast",
  content: "WI-001 complete. WI-003 now unblocked.",
  summary: "WI-001 done, WI-003 available"
})

// Shut down teammate
SendMessage({
  type: "shutdown_request",
  recipient: "teammate-1",
  content: "All work complete."
})
```

### Cleanup

```javascript
// After all teammates shut down:
TeamDelete()
```

## Team Lead (Controller) Behavior

### Delegate Mode Enforcement

Team leads ONLY coordinate. They NEVER implement.

```yaml
allowed_actions:
  - Distribute work items to teammates via SendMessage
  - Monitor task list progress via TaskList
  - Request status from teammates via SendMessage
  - Synthesize teammate outputs
  - Write coordination_log.yaml
  - Shut down teammates via SendMessage (shutdown_request)
  - Clean up team via TeamDelete

prohibited_actions:
  - Edit/Write implementation files
  - Answer questions directly
  - Execute work items themselves
  - Skip delegation for "simple" tasks
```

### Work Distribution Strategies

**Self-Claiming (Preferred)**: Teammates check TaskList and claim available tasks after completing current work. Built-in file-lock prevents race conditions.

**Direct Assignment**: Lead assigns tasks to specific teammates via TaskUpdate (set owner) and SendMessage.

## Shared Task List

Tasks managed via built-in tools with these states:

```
pending --> in_progress --> completed
```

Dependencies: Use `addBlockedBy` in TaskUpdate. Blocked tasks auto-unblock when dependencies complete.

## Fallback Behavior

### Unsuitable Request Fallback

If the request is unsuitable for team execution (tier 2, too few work items, all sequential):
1. Notify user: "Request better suited for standard execution."
2. Automatically delegate to `/run` for standard orchestration.

### Display Mode Fallback

- `"auto"` mode: Automatically falls back to in-process if not inside tmux
- `"tmux"` mode: Requires tmux installed; in-process if unavailable
- `"in-process"`: Works in any terminal

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Execution time reduction | 40-60% | vs sequential baseline |
| Parallelism utilization | >70% | actual / potential parallel |
| Work item throughput | 3x | items/minute improvement |

## Session Structure

```
Agent_Memory/sessions/team_{timestamp}/
+-- instruction.yaml
+-- status.yaml
+-- team/
|   +-- team_manifest.yaml    # Team composition + display mode
|   +-- messages/             # Communication log
|   +-- metrics/
|       +-- timing.yaml
|       +-- parallelism.yaml
+-- workflow/
|   +-- plan.yaml
|   +-- decomposition.yaml
|   +-- coordination_log.yaml
+-- outputs/
```

Built-in resources (managed by Claude Code):
- Team config: `~/.claude/teams/{team-name}/config.json`
- Task list: `~/.claude/tasks/{team-name}/`

## Error Handling

### Teammate Failure
- Send status query via SendMessage
- If unresponsive: spawn replacement teammate
- Reassign work item

### Deadlock Detection
- Detect circular dependencies via TaskList
- Break cycle by sequentializing
- Warn about degraded parallelism

### Partial Completion
- Complete what can be completed
- Document partial results clearly
- Return with status of succeeded/failed items

## Team Templates

Pre-built team structures for common project types. Templates define teams, delivery waves, quality gates, and interface contracts.

### Available Templates

| Template | Teams | Waves | Domain |
|----------|-------|-------|--------|
| `fullstack-app` | Platform + Product + Experience | 3 | make:engineering |
| `api-service` | API + Data + Security | 2 | make:engineering |
| `frontend-app` | UI/UX + Components + State | 2 | make:engineering |
| `content-campaign` | Strategy + Content + Distribution | 3 | grow:marketing |
| `data-pipeline` | Ingestion + Transform + Serving | 2 | make:engineering |
| `game-project` | Core Dev + Art & Audio + Design & QA | 3 | make:game-development |
| `_custom` | User-defined | User-defined | Any |

### Auto-Selection

Templates are auto-selected by scoring against the request:

```
Score = keyword * 0.4 + domain * 0.2 + signal * 0.2 + items * 0.2
Select top scorer above confidence_threshold (0.6)
```

Override with flags: `--template <id>`, `--no-template`, `--waves <N>`

### Template Location

`Agent_Memory/_system/templates/teams/` with `_index.yaml` catalog.

## Wave Execution

Waves are delivery phases enforced via TaskCreate dependencies (gate sentinel tasks). **Maximize the number of waves** -- more waves provide better quality gating and coordination points.

### Wave Types

| Type | Executor | Description |
|------|----------|-------------|
| `bootstrap` | Lead (sequential) | Foundation setup, contracts, scaffolding |
| `research` | Teammates (parallel) | Analysis, information gathering |
| `design` | Teammates (parallel) | Architecture decisions, interface definitions |
| `implementation` | Teammates (parallel) | Core build work |
| `supporting` | Teammates (parallel) | Secondary features, integrations |
| `testing` | Teammates (parallel) | QA, security, validation |
| `documentation` | Teammates (parallel) | Docs, cleanup, optimization |
| `integration` | Lead (sequential) | Merge, final testing, polish |

Not all wave types are needed for every request, but prefer MORE granular waves over fewer consolidated ones. If work items span multiple concerns (e.g., research AND implementation), split them into separate waves.

### Gate Sentinel Pattern

```
Wave 0 tasks -> GATE-0 (addBlockedBy: all wave-0 tasks)
Wave 1 tasks (addBlockedBy: [GATE-0]) -> GATE-1 (addBlockedBy: all wave-1 tasks)
Wave 2 tasks (addBlockedBy: [GATE-1])
```

Team lead validates quality gate criteria before marking GATE-N complete, which unblocks the next wave. No custom orchestration code -- uses built-in TaskCreate dependencies.

### Quality Gates

Each wave has a quality gate with:
- **criteria**: List of conditions to verify
- **verification_method**: How to check (file_exists, output_exists, test_result, manual_review)

Example:
```yaml
quality_gate:
  name: "GATE-0: Foundation Ready"
  criteria:
    - "Project structure created"
    - "Database schema defined"
    - "Interface contracts documented"
  verification_method: file_exists
```

## Interface Contracts

Contracts define interfaces between teams -- agreements established in one wave and consumed in the next.

### Contract Schema

```yaml
contracts:
  - provider: platform       # Team that creates the interface
    consumer: product        # Team that depends on it
    interface: "Database Schema"
    established_in: 0        # Wave where provider creates artifact
    consumed_in: 1           # Wave where consumer uses it
    artifacts: ["schema.prisma", "src/models/"]
```

### Contract Enforcement

1. **At gate validation**: Verify contract artifacts exist before marking gate complete
2. **During parallel execution**: Consumer tasks reference contract artifacts in instructions
3. **At final gate**: Verify all contracts established and consumed

### Contract Status

Tracked in coordination_log.yaml:
```yaml
contracts:
  - interface: "Database Schema"
    status: fulfilled  # established | consumed | fulfilled | violated
```

## Template and Wave Execution (DEFAULT)

**Templates with wave execution are the DEFAULT for tier 3+ requests.** Auto-selection runs automatically. Only fall back to flat execution when:
- `--no-template` flag is explicitly used
- No template scores above the confidence threshold (0.6)
- No templates exist in `Agent_Memory/_system/templates/teams/`

When flat execution is used, the system behaves as a simple parallel distribution without waves or gates.

## Integration Points

- **trigger + router + planner**: Available for routing and planning (used by /run, optionally by /team via `mode: team_planning_only`)
- **team-trigger**: Decomposes request directly, creates team via TeamCreate, spawns teammates, executes waves
- **team-lead-adapter**: Wraps controller in delegate mode, validates gates, tracks contracts
- **orchestrator**: Detects team mode, routes appropriately
- **Hooks**: team-start.cjs, team-stop.cjs, team-task-complete.cjs, teammate-idle-handler.cjs

## Configuration

Project override (`.cagents/team_config.yaml`):
```yaml
team_mode:
  enabled: true
  min_work_items: 3
  max_team_size: 8
  prefer_teams_for_tiers: [3, 4]
  teammate_mode: tmux    # auto | tmux | in-process
```

---

**Part of**: cAgents Core Infrastructure - Built-in Agent Teams Integration
