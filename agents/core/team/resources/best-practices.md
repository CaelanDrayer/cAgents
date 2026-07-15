# Best Practices: Team Trigger

> Design principles, patterns, and frameworks that guide high-quality team initialization, wave decomposition, and parallel workflow bootstrapping.

## Design Principles

- **Concurrent-Agent Waves are the Default**: Teams are implicit since v2.1.178 (TeamCreate/TeamDelete were removed — do not call them); the single most critical step is spawning each wave's teammates as CONCURRENT `Agent()` calls in ONE message with `run_in_background: false` — tasks without spawned teammates have no one to execute them
- **Decompose Directly**: The `/team` loop breaks the request into work items itself — it does not delegate decomposition to another agent; speed and directness are essential at this entry point
- **Spawn Teammates, Not Just Tasks**: Creating task entries without spawning controller teammates via Agent tool is the primary failure mode — tasks need agents to execute them
- **Controllers as Teammates**: Every teammate spawned is a controller agent (from plan.yaml's controller_assignment), not an execution agent — execution agents lack the Agent tool and cannot delegate
- **Wave 0 First, Then Parallel**: Bootstrap items execute sequentially before parallel teammates are spawned — foundation must exist before parallel work can begin
- **Fallback Gracefully**: If the request produces fewer than 3 work items or all items are sequential, delegate to /run instead of creating a team with no parallelism benefit
- **Immediate Execution**: Task creation, wave-0 bootstrap, and concurrent teammate spawns happen without pausing or asking permission — auto-proceed is the default

## Key Patterns & Frameworks

- **3-8 Work Item Target**: Decompose into 3 to 8 concrete work items — fewer than 3 cannot justify team overhead; more than 8 creates coordination complexity that exceeds the parallelism benefit
- **Three-Wave Structure**: Wave 0 (bootstrap: foundation/setup, executed by lead), Wave 1 (parallel: main work, executed by teammates), Wave 2 (integration: testing/review, executed by lead) — every team execution follows this structure
- **GATE Sentinel Pattern**: Create a GATE task blocked by all wave-N tasks — validates quality gate criteria before marking complete, which unblocks wave-N+1 tasks via TaskCreate dependency blocking
- **Controller Resolution**: Read plan.yaml → controller_assignment → primary ONCE before spawning any teammates — every teammate uses the same controller type; never use execution agent names as subagent_type
- **Template Auto-Selection**: Score team templates from `_index.yaml` against the request (keyword × 0.4 + domain × 0.2 + signal × 0.2 + items × 0.2) — select top scorer above 0.6 confidence threshold; use flat execution if no template qualifies
- **Parallelism Analysis**: Build a dependency graph, identify root items (no blockers), group independent items into parallel groups, calculate critical path — quantify the parallelism score before deciding whether team mode is worth it
- **Parent Session Linkage**: Each teammate's /run invocation creates a child session — link child sessions back to the parent team session via child_sessions.yaml for cross-session traceability
- **Fan-Out Spawn Pattern**: Spawn all of a wave's teammates simultaneously in a single message (multiple concurrent `Agent()` tool calls) with `run_in_background: false` — sequential spawning serializes what should be parallel; explicit `run_in_background: false` collects the wave's results synchronously (subagents are background-by-default since v2.1.198)
- **Self-Claim Enablement**: Structure task descriptions to include all context teammates need — teammates read TaskList and self-claim unblocked tasks after completing current work

## Domain Concepts & Terminology

### Team Artifacts
- **Shared Task List**: The built-in shared task list (TaskCreate/TaskList) — the shared state board where all teammates and the lead track work; teams are implicit since v2.1.178, so there is no TeamCreate step to create it
- **Team Manifest**: `team/team_manifest.yaml` in the session directory — records team structure, wave assignments, and template selection
- **Team Session**: `cagents-memory/sessions/team_{slug}_{YYMMDD}_{NNN}/` — the persistent session directory for all team artifacts

### Suitability Criteria
- **Required**: ≥3 work items AND at least some items can execute in parallel
- **Preferred**: Tier ≥3, estimated duration >5 minutes — team overhead is justified for complex, time-consuming work
- **Disqualified**: All items are sequential (no parallelism possible), or tier 2 with fewer than 4 items

### Wave Types
- **Bootstrap Wave (0)**: Foundation work — project setup, schema design, interface contract definition; executed by the lead sequentially before teammates spawn
- **Research Wave**: Analysis and information gathering — executed in parallel by teammates
- **Design Wave**: Architecture decisions, interface definitions — executed in parallel by teammates
- **Implementation Wave**: Core build work — the primary parallel wave
- **Testing Wave**: QA, security, validation — executed in parallel after implementation
- **Documentation Wave**: Docs, cleanup — executed in parallel as a finishing step
- **Integration Wave (final)**: Merge, final testing, polish — executed by the lead after teammates complete

### Teammate Spawn Context
- **subagent_type**: Must be the controller from plan.yaml (e.g., "cagents:tech-lead") — never an execution agent
- **Execution Agent in Prompt**: The specific execution agent (e.g., "cagents:backend-developer") is specified inside the teammate's prompt — the teammate (controller) spawns it via its own Task call
- **Work Item Context**: Each teammate receives its specific TASK-ID, description, acceptance criteria, and the execution agent to spawn — complete context in the initial prompt

## Anti-Patterns to Avoid

- **Tasks Without Teammates**: Creating TaskCreate entries but never spawning wave teammates via Agent tool — tasks exist in the list but no agent executes them
- **Calling TeamCreate/TeamDelete**: These tools were removed in v2.1.178 — teams are implicit and cleanup is automatic at session end; calling them errors. Any surviving mention is historical ("removed in 2.1.178 — do not call")
- **Execution Agent as subagent_type**: Using `"cagents:backend-developer"` or any execution agent as the teammate subagent_type — execution agents lack the Agent tool and cannot spawn reviewers or other agents; they will implement directly without quality gates
- **Sequential Teammate Spawn**: Spawning a wave's teammates one at a time in sequence — the entire point of team mode is parallel execution; spawn all as concurrent `Agent()` calls in ONE message
- **Skipping Wave 0**: Spawning parallel teammates before foundation work is complete — teammates begin work that depends on contracts, schemas, or scaffolding that doesn't exist yet
- **No Fallback Check**: Attempting team mode for requests with <3 work items or all-sequential dependencies — no parallelism benefit; fall back to /run
- **Missing Gate Validation**: Marking a GATE task complete without checking gate criteria (file existence, contract artifacts, output quality) — produces a false "wave complete" signal

## Quality Indicators

- **Teammate Spawn Success Rate**: Percentage of team mode invocations that successfully spawn wave teammates via Agent tool — target 100%; failures indicate tool permission or environment issues
- **Parallel Wave Utilization**: Average number of teammates executing simultaneously during wave 1 — target >2 for meaningful parallelism
- **Template Auto-Selection Accuracy**: Percentage of template selections the user would agree are appropriate — measures scoring algorithm quality
- **Fallback Rate**: How often the `/team` skill loop decides to fall back to /run — should be rare; high rates suggest incorrect suitability assessment
- **Bootstrap Completion Before Spawn**: Percentage of sessions where wave 0 completes fully before wave 1 teammates are spawned — target 100%
- **Teammate Controller Compliance**: Percentage of spawned teammates that correctly delegate to execution agents rather than implementing directly — measures spawn prompt quality

## Collaboration Touchpoints

> **Historical note (v12.0.0)**: The standalone `team-trigger` and
> `team-lead-adapter` agents were removed in v12.0.0; their work is now inlined
> into the `/team` skill loop. The touchpoints below describe the `/team` loop's
> behavior — read "the `/team` skill loop" wherever older text said
> "team-trigger", and "the lead" wherever it said "team-lead-adapter".

- **With trigger**: The `/team` skill loop may invoke trigger in `team_planning_only` mode to leverage trigger's domain detection and planning infrastructure — trigger produces plan.yaml and decomposition.yaml, and the `/team` loop takes over for team-specific execution
- **With the lead pattern**: In more complex team executions, the `/team` loop bootstraps the session and applies the lead pattern for ongoing wave coordination — the loop initializes, the lead manages (formerly the team-trigger -> team-lead-adapter handoff)
- **With domain controllers (as teammates)**: The `/team` loop spawns domain controllers (tech-lead, narrative-director, etc.) as teammates via Agent tool — each controller then independently coordinates execution agents and reviewers for its assigned work item
- **With orchestrator**: In /run --team mode, orchestrator detects the team flag and spawns the `/team` lead (formerly the team-trigger agent) instead of the domain controller — the `/team` loop handles all subsequent team coordination
