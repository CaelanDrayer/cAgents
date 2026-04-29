# Best Practices: Team Trigger

> Design principles, patterns, and frameworks that guide high-quality team initialization, wave decomposition, and parallel workflow bootstrapping.

## Design Principles

- **TeamCreate is Mandatory**: Without TeamCreate, no agent team exists — tasks without a team have no one to execute them; this is the single most critical step
- **Decompose Directly**: Team-trigger breaks the request into work items itself — it does not delegate decomposition to another agent; speed and directness are essential at this entry point
- **Spawn Teammates, Not Tasks**: Creating task entries without spawning controller teammates via Agent tool is the primary failure mode — tasks need agents to execute them
- **Controllers as Teammates**: Every teammate spawned is a controller agent (from plan.yaml's controller_assignment), not an execution agent — execution agents lack the Agent tool and cannot delegate
- **Wave 0 First, Then Parallel**: Bootstrap items execute sequentially before parallel teammates are spawned — foundation must exist before parallel work can begin
- **Fallback Gracefully**: If the request produces fewer than 3 work items or all items are sequential, delegate to /run instead of creating a team with no parallelism benefit
- **Immediate Execution**: Steps 3-6 (TeamCreate, TaskCreate, spawn teammates) happen without pausing or asking permission — auto-proceed is the default

## Key Patterns & Frameworks

- **3-8 Work Item Target**: Decompose into 3 to 8 concrete work items — fewer than 3 cannot justify team overhead; more than 8 creates coordination complexity that exceeds the parallelism benefit
- **Three-Wave Structure**: Wave 0 (bootstrap: foundation/setup, executed by lead), Wave 1 (parallel: main work, executed by teammates), Wave 2 (integration: testing/review, executed by lead) — every team execution follows this structure
- **GATE Sentinel Pattern**: Create a GATE task blocked by all wave-N tasks — validates quality gate criteria before marking complete, which unblocks wave-N+1 tasks via TaskCreate dependency blocking
- **Controller Resolution**: Read plan.yaml → controller_assignment → primary ONCE before spawning any teammates — every teammate uses the same controller type; never use execution agent names as subagent_type
- **Template Auto-Selection**: Score team templates from `_index.yaml` against the request (keyword × 0.4 + domain × 0.2 + signal × 0.2 + items × 0.2) — select top scorer above 0.6 confidence threshold; use flat execution if no template qualifies
- **Parallelism Analysis**: Build a dependency graph, identify root items (no blockers), group independent items into parallel groups, calculate critical path — quantify the parallelism score before deciding whether team mode is worth it
- **Parent Session Linkage**: Each teammate's /run invocation creates a child session — link child sessions back to the parent team session via child_sessions.yaml for cross-session traceability
- **Fan-Out Spawn Pattern**: Spawn all wave-1 teammates simultaneously in a single message (multiple Agent tool calls) — sequential spawning serializes what should be parallel
- **Self-Claim Enablement**: Structure task descriptions to include all context teammates need — teammates read TaskList and self-claim unblocked tasks after completing current work

## Domain Concepts & Terminology

### Team Creation Artifacts
- **Team Config**: Created at `~/.claude/teams/{team-name}/config.json` by TeamCreate — stores team identity and configuration
- **Shared Task List**: Created at `~/.claude/tasks/{team-name}/` by TeamCreate — the shared state board where all teammates and the lead track work
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
- **subagent_type**: Must be the controller from plan.yaml (e.g., "cagents:engineering-manager") — never an execution agent
- **Execution Agent in Prompt**: The specific execution agent (e.g., "cagents:backend-developer") is specified inside the teammate's prompt — the teammate (controller) spawns it via its own Task call
- **Work Item Context**: Each teammate receives its specific TASK-ID, description, acceptance criteria, and the execution agent to spawn — complete context in the initial prompt

## Anti-Patterns to Avoid

- **Tasks Without TeamCreate**: Creating TaskCreate entries before calling TeamCreate — tasks exist in the list but no team exists to execute them; teammates cannot self-claim without a team context
- **Execution Agent as subagent_type**: Using `"cagents:backend-developer"` or any execution agent as the teammate subagent_type — execution agents lack the Agent tool and cannot spawn reviewers or other agents; they will implement directly without quality gates
- **Sequential Teammate Spawn**: Spawning wave-1 teammates one at a time in sequence — the entire point of team mode is parallel execution; spawn all simultaneously
- **Skipping Wave 0**: Spawning parallel teammates before foundation work is complete — teammates begin work that depends on contracts, schemas, or scaffolding that doesn't exist yet
- **No Fallback Check**: Attempting team mode for requests with <3 work items or all-sequential dependencies — wastes TeamCreate overhead for no parallelism benefit
- **Missing Gate Validation**: Marking a GATE task complete without checking gate criteria (file existence, contract artifacts, output quality) — produces a false "wave complete" signal
- **Forgetting TeamDelete**: Completing all work without calling TeamDelete — orphaned team resources interfere with subsequent team sessions

## Quality Indicators

- **TeamCreate Success Rate**: Percentage of team mode invocations that successfully create a team — target 100%; failures indicate tool permission or environment issues
- **Parallel Wave Utilization**: Average number of teammates executing simultaneously during wave 1 — target >2 for meaningful parallelism
- **Template Auto-Selection Accuracy**: Percentage of template selections the user would agree are appropriate — measures scoring algorithm quality
- **Fallback Rate**: How often team-trigger decides to fall back to /run — should be rare; high rates suggest incorrect suitability assessment
- **Bootstrap Completion Before Spawn**: Percentage of sessions where wave 0 completes fully before wave 1 teammates are spawned — target 100%
- **Teammate Controller Compliance**: Percentage of spawned teammates that correctly delegate to execution agents rather than implementing directly — measures spawn prompt quality

## Collaboration Touchpoints

- **With trigger**: Team-trigger may invoke trigger in `team_planning_only` mode to leverage trigger's domain detection and planning infrastructure — trigger produces plan.yaml and decomposition.yaml, team-trigger takes over for team-specific execution
- **With team-lead-adapter**: In more complex team executions, team-trigger bootstraps the session and hands off to team-lead-adapter for ongoing wave coordination — team-trigger initializes, adapter manages
- **With domain controllers (as teammates)**: Team-trigger spawns domain controllers (engineering-manager, narrative-director, etc.) as teammates via Agent tool — each controller then independently coordinates execution agents and reviewers for its assigned work item
- **With orchestrator**: In /run --team mode, orchestrator detects the team flag and spawns team-trigger instead of the domain controller — team-trigger handles all subsequent team coordination
