# Team Mode Documentation

cAgents V9.24 - N-Wave Parallel Team Execution via Built-in Agent Teams

## Overview

Team Mode enables N-wave parallel team-based execution using **Claude Code's built-in agent teams**. Work items are decomposed across as many waves as the task requires, with teammates spawned per-wave and quality gates validated between waves. More waves = better quality gating = higher quality output. When `teammateMode` is set to `"tmux"`, each teammate gets its own tmux split pane, providing true visual parallelism and 40-60% execution time reduction for tier 3+ workflows.

**Core Architecture**: `/team` decomposes the request into work items with maximum wave granularity (3-10 waves), creates a team via TeamCreate, and spawns teammates per-wave who each invoke `/run`. `/run` performs routing + planning inline, then delegates to controllers and execution agents (flattened 2-level chain since V9.18). GATE sentinel tasks enforce wave ordering.

## Quick Start

```bash
# Dedicated team command
/team Implement OAuth2 authentication

# Or use --team flag with /run
/run Build user dashboard --team
```

## What is Team Mode?

Team Mode transforms the standard sequential controller-execution pattern into N-wave parallel team-based execution using Claude Code's built-in agent teams. It follows a strict **Decompose -> Create Team -> Execute Per-Wave** pipeline with quality gates between waves:

**Standard Mode** (`/run`):
```
Controller -> Agent 1 -> Agent 2 -> Agent 3 -> Results
                (sequential)
```

**Team Mode** (`/team`):
```
/team <request>
    |
    Step 1: PARSE request and flags (including --waves <N>)
    Step 2: DECOMPOSE into work items with MAXIMUM wave granularity (3-10 waves)
    Step 3: TeamCreate -- create team and shared task list
    Step 4: TaskCreate -- create tasks + GATE sentinels with wave dependencies
    Step 5: Execute Wave 0 (enrichment + bootstrap) -- lead, sequentially
        |
    Step 6: FOR EACH Wave K (1 to N-1):
        +-- Spawn teammates for wave K (parallel within wave)
        |   +-- Teammate 1: /run TASK-{X} --> (controller -> execution agents) --> Complete
        |   +-- Teammate 2: /run TASK-{Y} --> (controller -> execution agents) --> Complete
        |                    (parallel -- each in own context/tmux pane)
        +-- Monitor + validate GATE-K
        +-- Shut down wave K teammates
        +-- Proceed to wave K+1 (AUTOMATIC)
        |
    Step 7: Final wave (integration + validation) -- lead, sequentially
    Step 8: Shutdown + TeamDelete + report
```

**Key Principle**: More waves = better quality. Each wave provides a quality gate checkpoint where the lead validates outputs before proceeding. Prefer 5-7 waves over 2-3 waves. There is nothing wrong with more waves.

**Key Improvement (V9.18+)**: `/run` now performs routing + planning inline (no separate trigger/orchestrator/router/planner agents). `/team` decomposes work items directly with wave assignments, then spawns teammates per-wave who each invoke `/run` which delegates to the appropriate controller and execution agents via the flattened 2-level chain.

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

> **tmux required**: Install with `brew install tmux` (macOS) or `sudo apt install tmux` (Ubuntu/Debian). See the [tmux wiki](https://github.com/tmux/tmux/wiki) for full documentation.

### Teammates Spawn Controllers Directly
Every team member spawns its assigned controller directly via Agent tool:
- The team lead assigns a controller per work item during decomposition
- Each teammate spawns `Agent({ subagent_type: "cagents:{controller_name}" })` directly
- The controller creates execution agents (e.g., tech-lead -> backend-developer, qa-tester)
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

### Worktree Isolation (V10.18.0)
When teammates modify overlapping files, use `isolation: "worktree"` in the Task call:
- Each teammate gets an isolated git worktree (separate working directory)
- Prevents file conflicts during parallel execution
- Lead handles merge coordination after wave completion
- Best for waves where 3+ teammates edit code files

### Dynamic Scaling (V10.18.0)
The lead can adjust teammate count during wave execution:
- **Scale up**: Spawn additional teammates when work exceeds capacity or items are discovered mid-wave
- **Scale down**: Shut down teammates immediately on completion (early shutdown) to free resources
- Scaling events tracked in `team/metrics/parallelism.yaml`

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
| Engineering | tech-lead |
| Creative | creative-director |
| Marketing | marketing-strategist |
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
cagents-memory/sessions/team_{slug}_{YYMMDD}_{NNN}/
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

### N-Wave Lifecycle -- Per-Wave Spawn Pipeline

```
Phase 1: DECOMPOSE
  - /team decomposes request into work items with MAXIMUM wave granularity
  - Assigns wave numbers (0=bootstrap, 1..N-1=execution, N=integration)
  - Maximize waves: prefer 5-7 waves over 2-3 waves
  - Check team suitability (>= 3 items, has parallel work)

Phase 2: CREATE TEAM + TASKS
  - TeamCreate to create team and shared task list
  - TaskCreate for all work items + GATE sentinels with wave dependencies
  - Select template (or flat execution)

Phase 3: EXECUTE WAVES -- Each wave is a distinct spawn cycle
  3a. Wave 0 (lead): Enrichment + bootstrap
  3b. FOR EACH Wave K (1 to N-1):
      - Spawn teammates for wave K (ALL at once, in parallel)
      - Each teammate invokes /run for their work item
      - Teammates read outputs from previous waves
      - Monitor wave K progress via TaskList + messages
      - All wave K items complete -> Validate GATE-K
      - Shut down wave K teammates
      - Mark GATE-K complete -> unblocks wave K+1
      - Proceed to wave K+1 (AUTOMATIC)
  3c. Final wave (lead): Integration + validation
  3d. Aggregate -- synthesize results into coordination_log.yaml
  3e. SendMessage (shutdown_request) -- shut down remaining teammates
  3f. TeamDelete -- clean up team and task resources
```

**All steps are MANDATORY and IMMEDIATE.** The team must be built, waves must execute, and gates must be validated without waiting for user permission. More waves are always preferred.

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

Templates are stored in `cagents-memory/_system/templates/teams/` with `_index.yaml` as the catalog index.

## Delivery Waves (V9.24)

### Overview

Waves are delivery phases that enforce execution order. Work items are tagged with wave assignments, and gate sentinel tasks prevent the next wave from starting until the current wave's quality criteria are met. **Maximize the number of waves** -- more waves provide better quality gating, clearer dependency boundaries, and smaller focused work units.

### Wave Types

| Type | Executor | Parallelism | Purpose |
|------|----------|-------------|---------|
| `bootstrap` | Lead (sequential) | None | Foundation, scaffolding, contracts |
| `research` | Teammates (parallel per wave) | Full | Analysis, information gathering |
| `design` | Teammates (parallel per wave) | Full | Architecture decisions, interfaces |
| `implementation` | Teammates (parallel per wave) | Full | Core build work |
| `supporting` | Teammates (parallel per wave) | Full | Secondary features, integrations |
| `testing` | Teammates (parallel per wave) | Full | QA, security, validation |
| `documentation` | Teammates (parallel per wave) | Full | Docs, cleanup, optimization |
| `integration` | Lead (sequential) | None | Merge, final testing, polish |

Not all wave types are needed for every request, but prefer MORE granular waves over fewer. If work spans multiple concerns, split into separate waves.

### Wave Count Guidance

| Tier | Minimum waves | Typical waves |
|------|---------------|---------------|
| 2 | 3 | 3-4 |
| 3 | 5 | 5-7 |
| 4 | 6 | 6-10 |

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

### Example: 7-Wave Full-Stack App

```
Wave 0 (Foundation -- lead):
  - Setup project structure, configs, tooling
  - Define database schema, export shared types
  -> GATE-0: Verify structure + schema + types exist

Wave 1 (Research -- teammates, parallel):
  - Analyze existing codebase patterns
  - Research library/framework options
  - Document API requirements
  -> GATE-1: Research artifacts verified

Wave 2 (Design -- teammates, parallel):
  - Design database models and relationships
  - Define API contracts (OpenAPI/GraphQL schema)
  - Create UI wireframes and component architecture
  -> GATE-2: Design artifacts verified, contracts established

Wave 3 (Core Implementation -- teammates, parallel):
  Platform team: Backend APIs, database migrations
  Product team: Business logic, core feature endpoints
  -> GATE-3: Core APIs operational, business logic implemented

Wave 4 (UI + Supporting Features -- teammates, parallel):
  Experience team: UI components, forms, pages
  Integration team: Third-party integrations, webhooks
  -> GATE-4: UI built, integrations connected

Wave 5 (Testing + Security -- teammates, parallel):
  QA team: Unit tests, integration tests, e2e tests
  Security team: Auth validation, input sanitization, vulnerability scan
  -> GATE-5: Tests passing, security scan clean

Wave 6 (Integration + Polish -- lead):
  - Wire all components together
  - Performance optimization
  - Documentation
  - Final end-to-end validation
  -> GATE-6: All integrated, tests passing, docs complete
```

### Example: 5-Wave API Service

```
Wave 0 (Foundation -- lead):
  - Project scaffolding, database setup
  -> GATE-0

Wave 1 (Design -- teammates, parallel):
  - API schema design, data model design
  -> GATE-1

Wave 2 (Implementation -- teammates, parallel):
  - Endpoint implementation, middleware, data access layer
  -> GATE-2

Wave 3 (Testing -- teammates, parallel):
  - Unit tests, integration tests, load tests
  -> GATE-3

Wave 4 (Integration -- lead):
  - Final wiring, documentation, deployment config
  -> GATE-4
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
- No templates exist in `cagents-memory/_system/templates/teams/`

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
- **core/team-trigger/SKILL.md** - Team initialization agent
- **core/team-lead-adapter/SKILL.md** - Controller wrapper

---

**Version**: 9.25.0
**Part of**: cAgents - N-Wave Parallel Team Execution via Built-in Agent Teams
