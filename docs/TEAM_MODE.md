# Team Mode Documentation

cAgents V9.21 - Parallel Team Execution via Built-in Agent Teams

## Overview

Team Mode enables parallel team-based execution using **Claude Code's built-in agent teams**. Each work item is assigned to a teammate that executes `/run` for full orchestration. When `teammateMode` is set to `"tmux"`, each teammate gets its own tmux split pane, providing true visual parallelism and 40-60% execution time reduction for tier 3+ workflows.

**Core Architecture**: `/team` decomposes the request into work items, creates a team via TeamCreate, spawns teammates who each invoke `/run`. `/run` performs routing + planning inline, then delegates to controllers and execution agents (flattened 2-level chain since V9.18).

## Quick Start

```bash
# Dedicated team command
/team Implement OAuth2 authentication

# Or use --team flag with /run
/run Build user dashboard --team
```

## What is Team Mode?

Team Mode transforms the standard sequential controller-execution pattern into parallel team-based execution using Claude Code's built-in agent teams. It follows a strict **Route & Plan (via /run) -> Determine Team Structure -> Spin Out** pipeline:

**Standard Mode** (`/run`):
```
Controller -> Agent 1 -> Agent 2 -> Agent 3 -> Results
                (sequential)
```

**Team Mode** (`/team`):
```
/team <request>
    |
    Step 1: PARSE request and flags
    Step 2: DECOMPOSE into 3-8 work items (wave 0/1/2 assignment)
    Step 3: TeamCreate -- create team and shared task list
    Step 4: TaskCreate -- create tasks for all work items
    Step 5: Execute Wave 0 (bootstrap) via /run (lead, sequentially)
    Step 6: Spawn teammates via Task tool (ALL at once, in parallel)
        |
        +-- Team Lead = /team (coordinates via SendMessage, manages TaskList)
        +-- Teammate 1: /run WI-001 --> (controller -> execution agents) --> Complete
        +-- Teammate 2: /run WI-002 --> (controller -> execution agents) --> Complete
        +-- Teammate 3: /run WI-003 --> (controller -> execution agents) --> Complete
        |                    (parallel -- each in own context/tmux pane)
        |
        +-- Aggregates /run outputs into final result
```

**Key Improvement (V9.18+)**: `/run` now performs routing + planning inline (no separate trigger/orchestrator/router/planner agents). `/team` decomposes work items directly, then each teammate invokes `/run` which delegates to the appropriate controller and execution agents via the flattened 2-level chain.

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

### Teammates Spawn Controllers Directly
Every team member spawns its assigned controller directly via Task tool:
- The team lead assigns a controller per work item during decomposition
- Each teammate spawns `Task({ subagent_type: "cagents:{controller_name}" })` directly
- The controller creates execution agents (e.g., engineering-manager -> backend-developer, qa-tester)
- Each teammate is an orchestration node, not a direct implementer
- Teammates NEVER implement work directly -- they coordinate through controllers
- `/team` provides parallelism; controllers provide multi-agent orchestration per item
- This avoids the extra nesting level that invoking /run as a Skill fork would create

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
- **Invokes `/run` via the Skill tool** -- this spins out its own controller + execution agents
- Each teammate's `/run` routes + plans inline, then delegates to controller -> execution agents (2-level chain)
- Teammates NEVER implement work directly -- they always delegate via `/run`
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

### Standard (Flat) Lifecycle -- Three-Phase Pipeline

```
Phase 1: DECOMPOSE
  - /team decomposes request into 3-8 work items directly
  - Assigns waves (0=bootstrap, 1=parallel, 2=integration)
  - Check team suitability (>= 3 items, has parallel work)

Phase 2: CREATE TEAM
  - TeamCreate to create team and shared task list
  - TaskCreate for all work items with wave dependencies
  - Select template (or flat execution)

Phase 3: SPIN OUT (in session) -- Execute IMMEDIATELY
  3a. TeamCreate -- create team and shared task list IMMEDIATELY
  3b. TaskCreate -- create work items (from decomposition.yaml) as shared tasks (with wave dependencies)
  3c. Execute wave 0 (bootstrap) via direct controller delegation
  3d. IMMEDIATELY spawn teammates -- each spawns its assigned controller directly
  3e. Controllers coordinate execution agents per work item
  3f. TaskList/TaskUpdate -- track progress, self-claim unblocked tasks
  3g. Aggregate -- synthesize results into coordination_log.yaml
  3h. SendMessage (shutdown_request) -- shut down teammates
  3i. TeamDelete -- clean up team and task resources
```

**Steps 3a-3d are MANDATORY and IMMEDIATE.** The team must be built and teammates must be spawned without waiting for user permission.

### Template + Wave Lifecycle (V9.6)

```
1. TeamCreate -- create team and shared task list
2. Auto-select template (or use --template flag)
3. Tag work items with wave + team assignments
4. Create tasks with wave-gated dependencies (GATE sentinel pattern)
5. Wave 0 (bootstrap): Orchestrator executes foundation via /run
   -> Validate GATE-0 quality criteria -> Mark GATE-0 complete
6. Wave 1 (parallel): Teams execute in parallel via /run
   -> Validate GATE-1 quality criteria per team -> Mark GATE-1 complete
7. Wave 2 (integration): Orchestrator integrates + polishes via /run
   -> Validate final quality gate
8. Aggregate results + track contract fulfillment
9. Shutdown teammates + TeamDelete
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

## Team Templates (V9.6)

### Overview

Team templates provide pre-built team structures for common project types. Instead of flat parallel execution, templates organize work into teams with delivery waves, quality gates between waves, and interface contracts between teams.

### Available Templates

| Template | Teams | Waves | Best For |
|----------|-------|-------|----------|
| `fullstack-app` | Platform + Product + Experience | 3 | Full-stack web apps |
| `api-service` | API + Data + Security | 2 | REST/GraphQL APIs |
| `frontend-app` | UI/UX + Components + State | 2 | Frontend SPAs |
| `content-campaign` | Strategy + Content + Distribution | 3 | Marketing campaigns |
| `data-pipeline` | Ingestion + Transform + Serving | 2 | Data engineering |
| `game-project` | Core Dev + Art & Audio + Design & QA | 3 | Game development |
| `_custom` | User-defined | User-defined | Custom structures |

### Auto-Selection

Templates are automatically selected based on scoring:

```
Score = keyword_match * 0.4 + domain_match * 0.2 + project_signal * 0.2 + item_count * 0.2
```

The highest-scoring template above its `confidence_threshold` (0.6) is selected. If no template qualifies, flat execution is used.

### Template Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--template <id>` | Force specific template | `/team Build app --template fullstack-app` |
| `--no-template` | Force flat execution | `/team Fix bug --no-template` |
| `--waves <N>` | Override wave count | `/team Build app --waves 2` |

### Template Location

Templates are stored in `Agent_Memory/_system/templates/teams/` with `_index.yaml` as the catalog index.

## Delivery Waves (V9.6)

### Overview

Waves are delivery phases that enforce execution order. Work items are tagged with wave assignments, and gate sentinel tasks prevent the next wave from starting until the current wave's quality criteria are met.

### Wave Types

| Type | Executor | Parallelism | Purpose |
|------|----------|-------------|---------|
| `bootstrap` | Orchestrator (sequential /run) | None | Foundation, contracts, setup |
| `parallel` | Teams (parallel /run per item) | Full | Main build phase |
| `integration` | Orchestrator (sequential /run) | None | Wiring, testing, polish |

### Gate Sentinel Pattern

Waves are enforced via TaskCreate dependencies -- no custom orchestration code:

```
Wave 0 tasks created
  -> GATE-0 sentinel (addBlockedBy: all wave-0 task IDs)

Wave 1 tasks created (addBlockedBy: [GATE-0])
  -> GATE-1 sentinel (addBlockedBy: all wave-1 task IDs)

Wave 2 tasks created (addBlockedBy: [GATE-1])
```

The team lead validates quality criteria before marking each GATE task complete, unblocking the next wave.

### Quality Gates

Each wave ends with a quality gate:

```yaml
quality_gate:
  name: "GATE-0: Foundation Ready"
  criteria:
    - "Project structure created"
    - "Database schema defined"
    - "Interface contracts documented"
  verification_method: file_exists  # file_exists | output_exists | test_result | manual_review
```

### Example: 3-Wave Full-Stack App

```
Wave 0 (Foundation):
  - Setup project structure
  - Define database schema
  - Export shared types
  -> GATE-0: Verify structure + schema + types exist

Wave 1 (Parallel Build):
  Platform team: Backend APIs, database migrations
  Product team: Business logic, feature endpoints
  Experience team: UI components, forms, pages
  -> GATE-1: Verify APIs operational, logic implemented, UI built

Wave 2 (Integration):
  - Wire frontend to backend
  - End-to-end testing
  - Performance optimization
  -> GATE-2: All integrated, tests passing
```

## Interface Contracts (V9.6)

### Overview

Contracts define explicit interfaces between teams. They ensure that when one team produces an artifact (schema, API types, design tokens), consuming teams can depend on it.

### Contract Schema

```yaml
contracts:
  - provider: platform       # Team that creates the interface
    consumer: product        # Team that depends on it
    interface: "Database Schema & Models"
    description: "Platform defines data layer; Product consumes models"
    established_in: 0        # Wave where artifact is created
    consumed_in: 1           # Wave where artifact is consumed
    artifacts:               # Files to verify
      - schema.prisma
      - src/models/
```

### Contract Lifecycle

1. **Established**: Provider creates artifacts during `established_in` wave
2. **Verified**: Gate validation checks artifacts exist
3. **Consumed**: Consumer uses artifacts during `consumed_in` wave
4. **Fulfilled**: Both established and consumed successfully

### Contract Tracking

Contracts are tracked in `coordination_log.yaml`:

```yaml
contracts:
  - interface: "Database Schema"
    status: fulfilled  # established | consumed | fulfilled | violated
    artifacts_verified: true
```

## Backward Compatibility

All template/wave features are additive. When no template matches:
- Low confidence score from auto-selection
- `--no-template` flag used
- No templates exist in `Agent_Memory/_system/templates/teams/`

The system behaves exactly as V9.2: flat parallel execution with no waves or contracts.

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

### Wrong Template Selected

**Symptom**: Auto-selection picks wrong template

**Fix**: Use `--template <id>` to force the correct template, or `--no-template` for flat execution

### Wave Gate Stuck

**Symptom**: Tasks stuck waiting for gate to pass

**Causes**:
- Gate quality criteria not met
- Contract artifacts missing

**Fix**: Check gate criteria, verify provider teams completed contract artifacts, manually mark gate complete if criteria verified

### Contract Violation

**Symptom**: Consumer team can't find expected artifacts

**Fix**: Verify provider team completed its wave, check artifact paths in template, re-run provider work items if needed

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

**Version**: 9.22.0
**Part of**: cAgents - Parallel Team Execution via Built-in Agent Teams
