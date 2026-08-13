# Team Mode Documentation

cAgents - N-Wave Parallel Team Execution

## Overview

Team Mode enables N-wave parallel execution. Work items are decomposed across as many waves as the task requires; for each wave the lead spawns its teammates as **concurrent `Agent()` calls** issued in a single message, and quality gates are validated between waves. More waves = better quality gating = higher quality output. This concurrent-Agent model is the **DEFAULT** and works in every harness — it produces 40-60% execution time reduction for tier 3+ workflows.

An OPTIONAL, EXPERIMENTAL path (named background teammates displayed in tmux/iTerm2 split panes) is available when the harness supports interactive agent teams; see [Display Modes](#display-modes).

> **Claude Code API change (v2.1.178)**: the `TeamCreate` / `TeamDelete` tools were **REMOVED**. Agent teams are now implicit — there is nothing to create or delete. The lead spawns teammates directly via the `Agent` tool, and cleanup is automatic at session end. This document describes the concurrent-Agent DEFAULT that no longer depends on those tools.

**Core Architecture (DEFAULT — concurrent-Agent waves)**: `/team` decomposes the request into work items with maximum wave granularity (3-10 waves). For each wave K, the lead spawns ALL wave-K teammates as concurrent `Agent()` calls in one message, synchronously (`run_in_background: false`), so it receives every wave result together, validates GATE-K, then proceeds to wave K+1. Each teammate is a controller agent (e.g. `cagents:tech-lead`) that spawns its own execution agents and reviewer, nesting up to 5 levels deep. Teams are implicit — no `TeamCreate`/`TeamDelete`. GATE sentinel tasks (standard `TaskCreate` dependencies) enforce wave ordering; cleanup is automatic at session end.

## Quick Start

```bash
# Dedicated team command
/team Implement OAuth2 authentication

# Or use --team flag with /act
/act Build user dashboard --team
```

## What is Team Mode?

Team Mode transforms the standard sequential controller-execution pattern into N-wave parallel execution. It follows a strict **Decompose -> Execute Per-Wave -> Gate** pipeline with quality gates between waves:

**Standard Mode** (`/act`):
```
Controller -> Agent 1 -> Agent 2 -> Agent 3 -> Results
                (sequential)
```

**Team Mode** (`/team`) — DEFAULT concurrent-Agent path:
```
/team <request>
    |
    Step 1: PARSE request and flags (including --waves <N>)
    Step 2: DECOMPOSE into work items with MAXIMUM wave granularity (3-10 waves)
    Step 3: TaskCreate -- create tasks + GATE sentinels with wave dependencies
            (teams are implicit -- there is NO TeamCreate step)
    Step 4: Execute Wave 0 (enrichment + bootstrap) -- lead, sequentially
        |
    Step 5: FOR EACH Wave K (1 to N-1):
        +-- Spawn ALL wave-K teammates as CONCURRENT Agent() calls in ONE message
        |   (run_in_background: false -- synchronous, so results return together)
        |   +-- Teammate 1 (controller) -> execution agents -> reviewer --> Complete
        |   +-- Teammate 2 (controller) -> execution agents -> reviewer --> Complete
        |                    (parallel within the wave)
        +-- Validate GATE-K when all wave-K results return
        +-- Proceed to wave K+1 (AUTOMATIC)
        |
    Step 6: Final wave (integration + validation) -- lead, sequentially
    Step 7: Aggregate results + report (cleanup is automatic -- no TeamDelete)
```

**Key Principle**: More waves = better quality. Each wave provides a quality gate checkpoint where the lead validates outputs before proceeding. Prefer 5-7 waves over 2-3 waves. There is nothing wrong with more waves.

**Why concurrent `Agent()` calls**: multiple tool uses issued in a single assistant message run concurrently. The lead spawns every teammate for a wave in one message with `run_in_background: false`, so all of that wave's results return together — the lead then validates the gate and proceeds. `run_in_background: false` must be explicit because subagents are background-by-default since Claude Code v2.1.198. Teammates spawn their own execution agents directly rather than re-entering `/act`, which avoids duplicating the enrichment the lead already did in Wave 0.

## Key Features

### Implicit Agent Teams (no TeamCreate)

Since Claude Code v2.1.178, agent teams are implicit — the `TeamCreate`/`TeamDelete` tools were removed. The DEFAULT path relies only on tools that exist in every harness:

- The lead spawns teammates directly via the `Agent` tool (no team to create)
- Standard `TaskCreate`/`TaskUpdate`/`TaskList`/`TaskGet` provide shared task visibility
- Gate sentinels are ordinary task dependencies (`addBlockedBy`)
- Cleanup is automatic at session end (no `TeamDelete`)
- Each teammate loads project context (CLAUDE.md, skills) automatically

### Teammates Are Controllers That Spawn Execution Agents Directly

Every teammate is spawned as a controller agent and delegates from there:
- The lead assigns a controller per work item during decomposition
- Each teammate is spawned as `Agent({ subagent_type: "cagents:{controller_name}" })`
- The controller spawns its own execution agents (e.g., tech-lead -> backend-developer, qa-tester) and a reviewer, nesting up to 5 levels deep
- Teammates NEVER implement work directly -- they coordinate through execution agents
- `/team` provides parallelism; controllers provide multi-agent orchestration per item
- Teammates spawn execution agents directly rather than re-entering `/act`, avoiding a redundant enrichment pass

### Shared Task Lists

Work items managed via built-in `TaskCreate`/`TaskList`/`TaskUpdate`/`TaskGet`:
- Status visibility across all work items
- Dependency tracking with automatic unblocking (gate sentinels)
- Wave ordering enforced via task dependencies

### Independent Contexts

Each teammate operates in its own context window:
- No context pollution between members
- Parallel execution without interference
- Teammates load project context automatically

### Worktree Isolation (V10.18.0)

When teammates modify overlapping files, use `isolation: "worktree"` in the `Agent()` call:
- Each teammate gets an isolated git worktree (separate working directory)
- Prevents file conflicts during parallel execution
- Lead handles merge coordination after wave completion
- Best for waves where 3+ teammates edit code files

### Dynamic Scaling (V10.18.0)

The lead can adjust teammate count between waves:
- **Scale up**: Spawn additional concurrent `Agent()` calls when work exceeds capacity or items are discovered mid-plan
- **Scale down**: Fewer teammates in a wave when a gate reveals less work remains
- Scaling events tracked in `team/metrics/parallelism.yaml`

### Team Leads (Controllers)

The lead operates in delegate mode:
- Coordination only, no implementation
- Spawns wave teammates, validates gates, aggregates results
- Aggregate final results into `coordination_log.yaml`

### Optional: Named Background Teammates + Split Panes (EXPERIMENTAL)

When `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` AND the harness supports interactive agent teams, teammates may be spawned as named background agents shown in tmux/iTerm2 split panes. This path is EXPERIMENTAL and harness-variable — see [Display Modes](#display-modes). It MUST fall back to the DEFAULT concurrent-Agent path when the experimental feature is unavailable.

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
| `--members <N>` | Max teammates per wave | 8 |
| `--parallel` | Force parallel execution | auto |
| `--display` | Show team communication | false |
| `--quiet`, `-q` | Suppress progress output | false |
| `--teammate-mode <mode>` | Display (experimental path): in-process, tmux | in-process |

**Examples**:
```bash
/team Implement user authentication
/team Build payment integration --dry-run
/team Create dashboard --members 4 --display
```

### /act --team Flag

```bash
/act <request> --team [other flags]
```

Equivalent to `/team` but uses existing `/act` infrastructure.

**Examples**:
```bash
/act Add search feature --team
/act Implement notifications --team --quiet
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

`/team` analyzes requests to determine if team execution provides benefit:

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

If analysis shows team mode won't provide benefit, gracefully falls back to standard `/act`.

## Display Modes

Display modes apply to the OPTIONAL EXPERIMENTAL named-teammate path only. The DEFAULT concurrent-Agent path does not use split panes — each teammate runs as a synchronous `Agent()` call whose result returns to the lead.

### teammateMode Configuration

The `teammateMode` setting defaults to `"in-process"` (the Claude Code default since v2.1.179). Split panes (`"tmux"`/`"iterm2"`) are part of the experimental path and require both a supporting terminal and `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.

Configure in settings.json:
```json
{
  "teammateMode": "in-process"
}
```

Or per-session via CLI:
```bash
claude --teammate-mode in-process
```

### Display Mode Options

| Mode | Description | Requirements |
|------|-------------|--------------|
| `"in-process"` (default) | All teammates in main terminal | None |
| `"auto"` | tmux split panes if inside a tmux session, otherwise in-process | Experimental path |
| `"tmux"` | Force tmux split pane display | Experimental path; tmux installed |

> **tmux (experimental path)**: Install with `brew install tmux` (macOS) or `sudo apt install tmux` (Ubuntu/Debian). See the [tmux wiki](https://github.com/tmux/tmux/wiki) for full documentation. Split panes are unavailable in VS Code terminal, Windows Terminal, and Ghostty.

### In-Process Mode (default)
- All teammates run inside the main terminal
- Works in any terminal, no extra setup
- The reliability-first default that pairs with the concurrent-Agent model

### tmux Mode (experimental)
- Each named background teammate gets its own tmux pane
- All panes visible simultaneously in a tiled layout
- Requires the experimental agent-teams feature and tmux in PATH
- Falls back to the DEFAULT concurrent-Agent path when unavailable

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

The lead creates teammates based on the work items. Each teammate is a controller agent spawned via a concurrent `Agent()` call that:
- Loads project context (CLAUDE.md, skills) automatically
- Owns one or more work items for its wave
- **Spawns its own execution agents and reviewer directly via the Agent tool** (nesting up to 5 levels deep)
- Teammates NEVER implement work directly -- they always delegate to execution agents
- Returns results to the lead (synchronously, since `run_in_background: false`)

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

## Team Lifecycle

### N-Wave Lifecycle -- Per-Wave Spawn Pipeline (DEFAULT)

```
Phase 1: DECOMPOSE
  - /team decomposes request into work items with MAXIMUM wave granularity
  - Assigns wave numbers (0=bootstrap, 1..N-1=execution, N=integration)
  - Maximize waves: prefer 5-7 waves over 2-3 waves
  - Check team suitability (>= 3 items, has parallel work)

Phase 2: CREATE TASKS (teams are implicit -- no TeamCreate)
  - TaskCreate for all work items + GATE sentinels with wave dependencies
  - Select template (or flat execution)

Phase 3: EXECUTE WAVES -- Each wave is a distinct concurrent-spawn cycle
  3a. Wave 0 (lead): Enrichment + bootstrap
  3b. FOR EACH Wave K (1 to N-1):
      - Spawn ALL wave-K teammates as CONCURRENT Agent() calls in ONE message
        (run_in_background: false, so results return together)
      - Each teammate is a controller that spawns execution agents + reviewer
      - Teammates read outputs from previous waves
      - All wave-K results return -> Validate GATE-K
      - Mark GATE-K complete -> unblocks wave K+1
      - Proceed to wave K+1 (AUTOMATIC)
  3c. Final wave (lead): Integration + validation
  3d. Aggregate -- synthesize results into coordination_log.yaml
  3e. Cleanup is automatic at session end (no TeamDelete)
```

**All steps are MANDATORY and IMMEDIATE.** Waves must execute and gates must be validated without waiting for user permission. More waves are always preferred.

### Template + Wave Lifecycle

```
1. Auto-select template (or use --template flag)
2. Tag work items with wave + team assignments
3. Create tasks with wave-gated dependencies (GATE sentinel pattern)
4. Wave 0 (bootstrap): Lead executes foundation sequentially
   -> Validate GATE-0 quality criteria -> Mark GATE-0 complete
5. Wave 1 (parallel): Concurrent Agent() teammates execute in parallel
   -> Validate GATE-1 quality criteria per team -> Mark GATE-1 complete
6. Wave 2 (integration): Lead integrates + polishes
   -> Validate final quality gate
7. Aggregate results + track contract fulfillment (cleanup automatic)
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
  "teammateMode": "in-process",
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

`teammateMode` ships as `"in-process"` (the reliability-first default that pairs with the concurrent-Agent model). `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` remains available to opt into the OPTIONAL experimental named-teammate + split-pane path; the default path does not require it.

### Project Override

Create `.cagents/team_config.yaml`:

```yaml
team_mode:
  enabled: true
  min_work_items: 3       # Minimum for team mode
  max_team_size: 8        # Maximum teammates per wave
  prefer_teams_for_tiers: [3, 4]
  teammate_mode: in-process   # in-process (default) | auto | tmux (experimental)
```

### Disabling Team Mode

To disable team mode for a project:

```yaml
team_mode:
  enabled: false
```

## Team Templates

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

## Delivery Waves

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

## Interface Contracts

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

The system behaves as flat parallel execution with no waves or contracts.

## Troubleshooting

### Team Not Spawning

**Symptom**: `/team` falls back to `/act`

**Causes**:
- Work items < 3
- All items sequential

**Fix**: Verify work item count and that at least some items are independent. The DEFAULT concurrent-Agent path needs no special harness flag — teammates are ordinary `Agent()` spawns.

### Teammates Not Appearing (experimental path)

**Symptom**: Named teammates / panes not visible under the experimental path

**Causes**:
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` not set, or the harness does not support interactive agent teams
- Terminal does not support split panes (VS Code, Windows Terminal, Ghostty)

**Fix**: The experimental path falls back to the DEFAULT concurrent-Agent path automatically. To use panes, set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, `teammateMode: "tmux"`, and run in a supported terminal.

### Slow Team Execution

**Symptom**: Team mode slower than expected

**Causes**:
- Many sequential dependencies
- Low parallelism score
- Overhead for small workflows

**Fix**: Check parallelism_score in metrics, use standard mode for small workflows.

### tmux Pane Issues (experimental path)

**Symptom**: tmux panes not showing

**Causes**:
- tmux not installed
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` not set
- Running in an unsupported terminal (VS Code, Windows Terminal, Ghostty)

**Fix**: Install tmux (`apt install tmux`), set `teammateMode: "tmux"` and `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, use a supported terminal — or rely on the DEFAULT concurrent-Agent path, which needs none of this.

### Lead Doing Work Instead of Delegating

**Symptom**: Lead implements tasks directly

**Fix**: The lead only coordinates — it spawns teammates via `Agent()` and validates gates. If it starts implementing, remind it to spawn wave teammates and wait for their results before proceeding.

### Wrong Template Selected

**Symptom**: Auto-selection picks wrong template

**Fix**: Use `--template <id>` to force the correct template, or `--no-template` for flat execution.

### Wave Gate Stuck

**Symptom**: Tasks stuck waiting for gate to pass

**Causes**:
- Gate quality criteria not met
- Contract artifacts missing

**Fix**: Check gate criteria, verify provider work items completed their contract artifacts, manually mark gate complete if criteria verified.

### Contract Violation

**Symptom**: Consumer team can't find expected artifacts

**Fix**: Verify provider work items completed their wave, check artifact paths in the template, re-run provider work items if needed.

## Hooks

Team-specific hooks in `.claude/hooks/`:
- `team-start.cjs` - Initialize team monitoring (SubagentStart)
- `team-stop.cjs` - Finalize and archive the session (SessionEnd; runs for all session types)
- `team-task-complete.cjs` - Track task completion (TaskCompleted — **experimental named-teammate path only**)
- `teammate-idle-handler.cjs` - Find available work for idle teammates (TeammateIdle — **experimental named-teammate path only**)

> The `TeammateIdle` / `TaskCompleted` events fire only for named background teammates, so `teammate-idle-handler.cjs` and `team-task-complete.cjs` support the EXPERIMENTAL path only. They remain registered and are no-ops on the DEFAULT concurrent-Agent path (which collects wave results synchronously via `Agent()` returns). Hook event names are unchanged.

## Related Documentation

- **CLAUDE.md** - Main project documentation
- **.claude/rules/core/teams.md** - Team coordination patterns
- **.claude/skills/team/SKILL.md** - /team skill specification
- *(Note: two standalone v11.x agents (one for team initialization, one as a controller wrapper) were removed in v12.0.0 — their work was inlined into the `/team` SKILL.md and the lead's delegate-mode wrapper pattern, respectively. See `scripts/migration/v12-aliases.yaml` for the alias resolution.)*

---

**Version**: 9.25.0
**Part of**: cAgents - N-Wave Parallel Team Execution
