# CLAUDE.md

Core architecture and development guidance for cAgents.

## Current State

cAgents is a **standalone, domain-agnostic** multi-agent orchestration plugin:

- **60 agents** across 9 builder-role archetypes (developer, operator, advisor,
  analyst, creator, writer, strategist, core, leadership) — 44 routable + 16
  core. Pre-v12 agent names resolve via `scripts/migration/v12-aliases.yaml`.
- **5-state event-driven pipeline**: `INIT -> ORCHESTRATED -> PLANNED ->
  COORDINATED -> VALIDATED` (decomposition + prompt-assembly folded into the
  `planner`; `max_revision_cycles: 3`).
- **4 user skills**: `/run`, `/team`, `/designer`, `/helper`.
- **Zero external-service dependencies** — see § Standalone Contract.

For v12 consolidation history and all later release notes, see
`CHANGELOG.md` and `docs/RELEASE_NOTES.md`.

## Documentation Structure

- `CLAUDE.md` - Architecture, commands, agents (this file)
- `README.md` - Quick start
- `docs/` - Project documentation (66 `.md` files recursive; 42 top-level entries — including ARCHITECTURE.md, SKILLS.md, TEAM_MODE.md, RELEASE_NOTES.md, etc.)
- `archive/docs/` - Historical documentation (local only)
- `cagents-memory/` - Runtime state (excluded from git)
- `.claude/skills/run/reference/session-schema.md` - Session YAML contract (internal-only)
- `docs/WORKFLOW_AGENT_INTERACTIONS.md` - Agent interaction patterns

## Version Management

**CRITICAL: Always bump version on commits.** Run `scripts/sync-versions.sh <version>` to update all registry locations. See `.claude/rules/core/version-registry.md` for the canonical list (16 locations).

**Version Format**: `major.minor.patch` — patch (bug fix), minor (feature), major (breaking)

## Memory Management

**Claude Code Memory Hierarchy**: 6-tier system. See `.claude/rules/memory/agent-memory.md` for full details.

| Memory Type | Location | Shared With |
|-------------|----------|-------------|
| **Managed policy** | OS-level paths | All users in org |
| **Project** | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team via git |
| **Project Rules** | `./.claude/rules/*.md` | Team via git |
| **User** | `~/.claude/CLAUDE.md` | Just you |
| **Project Local** | `./CLAUDE.local.md` (auto-gitignored) | Just you |
| **Auto Memory** | `~/.claude/projects/<project>/memory/` | Just you |

**Loading Order**: Managed -> User -> Project -> Project Rules -> Project Local (later = higher priority)
**Auto Memory**: First 200 lines of MEMORY.md loaded at session start. Toggle with `/memory` or `autoMemoryEnabled` setting.
**Recursive Lookup**: CLAUDE.md files found recursively up directory tree. Child directory CLAUDE.md files load on demand.

**Rules Structure** (`.claude/rules/`):
```
core/           # orchestration, controllers, execution, hooks, teams, etc. (13 top-level + 3 resources/)
domains/        # engineering, grow, operate, people, serve (5 files)
infrastructure/ # model-routing (1 file)
memory/         # agent-memory (2 files)
quality/        # completion, validation-framework, implicit-discovery (5 top-level + 1 resources/)
playbooks/      # pat-* reusable patterns (11 pat-* + README = 12 files)
```
Total: 43 .md = 37 top-level across 6 categories + 2 READMEs (root + playbooks/) + 4 resources/.

**Import Syntax**: Use `@path/to/file` to include external content. View loaded files: `/memory`

## Project Overview

**cAgents**: Universal multi-domain agent system with CSV-based task inventory for large-scale workflows. Handles 100+ tasks with 60-80% context savings.

> **NOT a software-engineering tool.** cAgents is domain-agnostic. The pipeline machinery (orchestrator → planner → controller → validator) and the 60-agent catalog span legal, finance, marketing, sales, HR, health, education, creative, operations, and research just as fully as engineering. `backend-developer` / `architect` / `validator` are the agents the router selects for *code* requests — they are not what the system "is." When a request is non-technical (draft a SOW, price a migration, plan a campaign, write a story, build a financial model), it is squarely in scope: `/run` and `/team` route it to the right domain controller. Skills and controllers MUST NOT refuse, redirect, or warn a user off a non-technical request on the grounds that the plugin "looks engineering-focused" — that is a framing defect, not correct behavior.

**Key Features**: CSV Task Inventory, Batch Delegation (60-80% context reduction), Checkpoint/Resume, Aggressive Decomposition (30+ work items from simple requests), Controller-Centric coordination

**Architecture**: Controller-Centric Coordination with Task Inventory
- **Tier 1**: 16 core infrastructure agents
- **Tier 2**: Controllers (coordinate via batch delegation)
- **Tier 3**: Execution agents (implement work items)
- **Tier 4**: Support agents (foundational services)
- **Total**: 60 agents across 9 builder-role archetypes (back-compat preserved via `scripts/migration/v12-aliases.yaml`)
- **Execution**: Event-driven pipeline (5-state machine) with two execution paths (fast/standard), revision routing, reviewer loops

**Canonical structure — 9 archetypes** (`{archetype}/` dirs; per-archetype counts also in Quick Reference): Developer 8 (5 branches: backend/frontend/fullstack/infrastructure/quality), Operator 8 (5 branches: support/business-ops/people-ops/marketing-sales/content), Advisor 4 (legal/health/education/personal), Analyst 5, Creator 3, Writer 4, Strategist 3, Core 16 (pipeline infra), Leadership 9 (C-suite, /team strategic mode, not directly routable).

**Domain overlay (legacy — routing/config only)**: 2 legacy domain dirs (`people/`, `shared/`) survive on disk **without** SKILL.md files; they hold `config/domain_overrides.yaml` with router keywords + controller catalogs that the planner still consumes. The other 11 legacy dirs (`engineering/`, `creative/`, `business/`, `growth/`, `service/`, `science/`, `health/`, `education/`, `personal/`, `arts/`, `trades/`) were deleted and their router keywords + controller catalogs consolidated into `cagents-memory/_system/config/routing.yaml`. Do NOT delete `people/` or `shared/` — they are not orphans.

**Config**: `people/` and `shared/` keep their own `{domain}/config/domain_overrides.yaml`. The 11 deleted legacy domains live in `cagents-memory/_system/config/routing.yaml` under `domains.<name>` (with the same `controller_catalog` + `router.keywords` schema, just nested). Two archetype roots — `core/` and `leadership/` — also ship `config/domain_overrides.yaml` files (used for pipeline/C-suite routing tables), so `scripts/ci/validate-agents.sh` now reports 4 files checked (2 legacy retained + 2 archetype-root).

## CRITICAL: Aggressive Delegation

**Core Principle**: /run, /team, and all coordination agents NEVER do direct work. ALL work delegated to subagents via Agent tool or Skill tool. No exceptions.

**Zero Tolerance**: `/run` and `/team` are pure delegation proxies. They parse, plan, spawn agents, and read results. They do NOT write code, create content, explore the codebase for implementation purposes, or handle tasks themselves. If an orchestrator says "I will handle this myself" or "Rather than spinning up agents, I'll do this directly" — that is a critical violation. The user chose these skills specifically for agent orchestration; bypassing delegation defeats the entire purpose of the plugin.

**This applies to ALL request sizes**: Even for single-file bug fixes, /run MUST still spawn a controller who spawns an execution agent. Even for cross-domain strategic requests, `/team` (with auto-strategic mode) MUST still spawn C-suite subagents in Wave 0/1 and synthesize a brief in Wave 2 before per-domain dispatch. There is no request small enough to justify self-handling.

**Minimum Tier**: Always tier 2+ (controller coordination required). ALL requests use agents. NO exceptions. Former tier 0/1 automatically upgraded.

**Delegation Chain** (event-driven pipeline):
```
/run (state machine loop -- level 0)
  +-> orchestrator (level 1)    -> enriched_context.yaml
  +-> planner (level 1)         -> plan.yaml + work_items.yaml
  +-> controller (level 1)
       +-> executor (level 2)   -> implementation
       +-> reviewer (level 2)   -> review_report.yaml
  +-> validator (level 1)       -> validation_report.yaml (PASS/FAIL/REVISE)
```

`/run` is a config-driven state machine reading `pipeline_config.yaml`: enrichment agents (orchestrator, planner) run sequentially at level 1; controllers spawn executors + reviewers at level 2 with internal reviewer loops (max 2 rounds — see controllers.md); the validator emits PASS/FAIL/REVISE to drive outer revision routing (max 3 cycles). The planner produces decomposition and assembles delegation prompts inline (controllers fall back to standard prompts otherwise). **Roles**: orchestrator/planner enrich (L1); controllers ONLY coordinate (L1); execution agents (backend-developer, frontend-developer, copywriter, qa-tester, …) DO the work (L2); reviewer validates against acceptance criteria (L2); validator gates (L1). This config-driven machine replaces hardcoded steps; revision loops at both levels ensure quality.

## CRITICAL: Automatic Workflow Progression

Workflows proceed automatically through phases WITHOUT asking permission. See `docs/AUTOMATIC_WORKFLOW_PROGRESSION.md`.

**AUTO-PROCEED** (Never Ask): All phase transitions, plan.yaml -> coordinating, coordination_log complete -> executing, implementation complete -> validating, validation PASS -> complete

**ASK USER** (Only): Tier 4 HITL gates, unrecoverable errors, ambiguous requirements, validation BLOCKED

**Exception**: `/designer` is EXEMPT from auto-proceed. It is interactive and MUST use `AskUserQuestion` at every step, waiting for user responses before advancing. Designer SKILL.md rules override auto-proceed.

**If requirements are clear, PROCEED. Do not ask.** (Except /designer, which always asks.)

## Core Infrastructure (Tier 1: 16 agents)

- **Orchestration** (4): `trigger`, `orchestrator` (context enrichment), `hitl` (human escalation), `optimizer`
- **Team** (3): `team-bootstrap` (team init + lead wrapper, renamed from `team` in v12.53.0), `team-lead` (delegate-mode lead), `wave-reviewer` (validates /team wave gates)
- **Universal Workflow** (5): `router` (tier classification), `planner` (decomposition + controller selection + prompt assembly), `execution-monitor` (renamed from `executor` in v12.53.0), `validator` (PASS/FAIL/REVISE), `self-correct` (adaptive recovery)
- **Review** (1): `reviewer` (PASS/REVISE against acceptance criteria)
- **Task Management** (1): `task-state` (CSV state, 60-80% savings; includes task-merge mode)
- **Coordination** (1): `coordinator` (reusable controller for small domains — health, education, personal, arts, trades)
- **Logging** (1): `coord-log-writer` (assembles coordination_log.yaml)

**Config**: `{domain}/config/domain_overrides.yaml` (controller_catalog, router keywords)

## Aggressive Decomposition

Users state outcomes, not requirements. The planner unpacks everything needed.

**5 Steps**: Request Analysis -> Component Extraction (UNDERSTAND/DESIGN/BUILD/VERIFY/DOCUMENT) -> Implicit Discovery (security, testing, infrastructure) -> Dependency Mapping -> Work Item Generation (30+ items with acceptance criteria)

**Output** (`decomposition.yaml`): Work items with IDs, types, acceptance criteria, dependencies, optional `tags: []` array for categorization, plus dependency graph with critical path and parallel groups.

**Controller Integration**: Controllers receive decomposition, ask clarifying questions for ambiguous items, coordinate execution respecting dependencies, verify acceptance criteria.

## Controller-Centric Architecture

Controllers are the coordination hub between planning and execution. See `.claude/rules/core/controllers.md` for detailed patterns.

**Pattern**: Planner -> Objectives -> Controller -> Questions -> Execution Agents -> Answers -> Controller -> Synthesized Solution -> Implementation

**Question-Based Delegation**: Planner defines objectives and selects controller. Controller breaks into questions, delegates to execution agents, synthesizes answers, coordinates implementation. Executor monitors via coordination_log.yaml.

**Key Principles**: Controllers ask (not assign), execution agents answer, synthesis drives implementation, adaptive follow-up questions.

**Controller selection by tier** (per-domain catalogs in `{domain}/config/domain_overrides.yaml` → `controller_catalog`, matched on tier + domain): tier 2 = 1 primary controller (e.g. tech-lead, narrative-director, marketing-strategist); tier 3 = primary + 1-2 supporting (e.g. architect, security-engineer); tier 4 = 1 executive (cto/cco/cpo/chro) + primary + 2-4 supporting + HITL.

**Coordinating Phase**: orchestrator spawns the controller with plan.yaml → the controller asks clarifying questions, coordinates work items, tracks completion, and verifies acceptance criteria → it writes `coordination_log.yaml` (`schema_version: "1"`, with `objectives`, `questions_asked`, `synthesized_solution`, `implementation_tasks`, `status: completed`). See `.claude/rules/core/controllers.md` for the full schema and reviewer loop.

**Canonical Sources**: `workflow/work_items.yaml` is the canonical source for work-item definitions (IDs, descriptions, acceptance criteria, dependencies); `team/task_list.yaml` is a status-only overlay (IDs + status + assigned_to).

## Complexity Tiers

| Tier | Coordination | Example |
|------|--------------|---------|
| **2** (Moderate) | 1 controller | "Fix bug", "Answer question", "Fix typo" |
| **3** (Complex) | 1 primary + 1-2 supporting | "Add feature", "Create system" |
| **4** (Expert) | 1 executive + 1 primary + 2-4 supporting + HITL | "Major refactor", "Architecture migration" |

ALL workflows use routing -> planning -> **coordinating** -> executing -> validating. Tier 0/1 deprecated (auto-upgraded to tier 2).

## Workflow Execution

```
User Request -> /run (state machine loop, reads pipeline_config.yaml)
  INIT -> orchestrator -> enriched_context.yaml
  ORCHESTRATED -> planner -> plan.yaml + work_items.yaml (planner absorbs decomposition + delegation-prompt assembly)
  PLANNED -> controller -> coordination_log.yaml (with executor+reviewer loops)
  COORDINATED -> validator -> validation_report.yaml
  VALIDATED -> Complete
  FAIL -> back to PLANNED (re-run controller, max 3 cycles)
  REVISE -> back to PLANNED (re-plan, max 3 cycles)
```

**Subagent Architecture**: Agents delegate to specialists via Agent tool. Pattern: "Use {subagent} to {task}". Up to 50 concurrent. See `docs/WORKFLOW_AGENT_INTERACTIONS.md`.

## Task Completion Protocol

**MANDATORY**: 100% completion with verified evidence. See `.claude/rules/quality/completion.md`.

**Enforced by**: Controllers (acceptance criteria), executor (coordination_log), validator (quality gates), orchestrator (phase validation)

**Evidence must be specific**: File paths, test results, metrics. No "probably works" or "mostly done".

## CRITICAL: Task Lifecycle (Cleanup + Per-Subagent Visibility)

**Every `TaskCreate` MUST have a matching `TaskUpdate(status: completed | deleted)` before the agent stops** — stale `in_progress` tasks confuse users and clutter the UI. You OWN the lifecycle of any task you create; before finishing a skill, sweep `TaskList` and resolve all of them. `/run`, `/team`, `/designer` MUST clean up all tasks at pipeline/session end.

**Every background `Agent`/`Task` spawn MUST have a `TaskCreate` call BEFORE the spawn** (one per spawn when `run_in_background: true`), the subject matching the agent's description, marked `completed` when the agent notification arrives. Without per-agent tasks the user sees only a generic orchestration entry and no visibility into the parallel agents; `/run`/`/team` pipelines MUST create per-subagent tasks, not just top-level ones. (Foreground blocking agents: TaskCreate optional but recommended for long work.)

**Anti-patterns**: creating a task then stopping without completing it; leaving tasks `in_progress` after work is committed; creating tracking tasks that are never updated.

## Skills (Commands)

**V9.0+**: Skills in `.claude/skills/`, auto-discovered.

**Mode & flag registry**: `.claude/skills/_MODE_REGISTRY.md` is the single source of truth for all skill modes, flags, and trigger phrases. Skill SKILL.md bodies reference it rather than redefining modes inline — consult it before adding or changing a skill flag.

| Skill | Context | Agent | Description |
|-------|---------|-------|-------------|
| `/run` | `none` | `true` | Execute any task through auto-routed controller and specialist agents (passthroughs: `run context ...`, `--mode debug`; keyword router: `run improve|review|audit|optimize ...` triggers improve modes) |
| `/team` | `fork` | `true` | Parallel multi-agent execution with wave-based quality gates; auto-enables strategic mode for cross-domain requests |
| `/designer` | `none` | `false` | Interactive design exploration with guided Q&A before building |
| `/helper` | `none` | `false` | Command guide that recommends the right skill for your task |

**Built-in**: `/memory` (view/edit memory files), `/init` (bootstrap project CLAUDE.md)

### /run - Event-Driven Pipeline Engine
State machine loop reading pipeline_config.yaml. Sequential enrichment (orchestrator, planner — the planner produces decomposition + delegation prompts inline), nested execution (controller + executor + reviewer), revision routing (FAIL/REVISE). Adaptive pipeline (tier 2 fast path skips orchestrator), domain/tier confirmation display, execution analytics (`--analytics`). Controllers fall back to standard delegation prompts when the planner skips prompt assembly.
```bash
/run Fix auth bug              # -> Engineering (tier 2: tech-lead)
/run Write fantasy story       # -> Creative (tier 2: narrative-director)
/run Plan Q4 campaign          # -> Business (tier 3: marketing-strategist)
/run Design game mechanics     # -> Business (tier 2: game-designer)
```
Skill: `.claude/skills/run/SKILL.md` + `reference/`

### /team - N-Wave Parallel Team Execution
N-wave pipeline: **Wave 0 (lead: enrichment) -> Wave 1..N-1 (subagents: per-wave spawn, parallel within wave) -> Wave N (lead: integration)**. Maximizes waves for quality gating. **Default execution model (concurrent-Agent waves)**: for each wave the lead spawns ALL wave-K subagents as concurrent `Agent()` calls in ONE message, synchronously (`run_in_background: false`, explicit since subagents are background-by-default in CC v2.1.198), collects the results together, validates GATE, then proceeds. Parallelism comes from both concurrent per-wave subagent calls and each subagent recursively spawning its own subagents (depth 5) — a subagent needing another specialty spawns it downward rather than routing sideways through the lead. Teams are implicit — the `TeamCreate`/`TeamDelete` tools were removed in CC v2.1.178, so there is nothing to create or delete and cleanup is automatic at session end. Each wave subagent is a controller that spawns its own execution agents + reviewer (nesting to depth 5). An OPTIONAL EXPERIMENTAL path (named background teammates + tmux/iTerm2 panes, gated on `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) falls back to the default when unavailable. 40-60% execution time reduction for tier 3+. GATE validation standards per wave type, partial results on failure. **Strategic Mode**: For cross-domain requests (`router.domain_count >= 2`), /team auto-enables strategic mode — Wave 0/1 = C-suite analysis (9 leadership agents), Wave 2 = brief synthesis, Wave 3..N = per-domain dispatch. Override with `--strategic` / `--no-strategic`. See `.claude/skills/team/reference/strategic-mode.md`.
```bash
/team Implement OAuth2 authentication           # Single-domain team execution (5-7 waves)
/team Launch new product with campaign          # Cross-domain: auto-strategic mode
/team Build feature --dry-run --waves 8 / --strategic   # preview / force waves / force strategic
/run Build feature --team                       # Team mode via flag
```
Config: `settings.json` (`teammateMode` default `in-process` since CC v2.1.179; `tmux`/`auto` panes are experimental-path only). See `docs/TEAM_MODE.md`.

### /designer, /helper
Each skill has `SKILL.md` + `reference/` directory with detailed docs. Use `/helper` for guidance.

Highlights:
- **/designer**: Subagent-delegated question preparation (research agents pre-build context-rich question lists per phase), inline controller pattern (select, reorder, skip, adapt questions), phase-overlap (next-phase research begins during current phase), follow-up research dispatch, graceful fallback, 28 behavioral rules
- **Improve modes inside /run**: `/improve` is folded into `/run` via a first-word keyword router. `/run improve X` -> `--mode full`. `/run review X` or `/run audit X` -> `--mode review`. `/run optimize X` -> `--mode optimize`. Review baselines (`--baseline`, `--suppress`), benchmark integration (`--benchmark`), pattern-effectiveness tracking, and atomic rollback helper remain available as flags on `/run`. See `.claude/skills/run/reference/improve-mode.md` for the keyword router contract
- **/helper**: Troubleshooting mode (`--troubleshoot`), comparison matrices, migration catalog, strategic-mode migration guidance (`/org X` → `/team X`)

## Agent Memory

**Full Structure**: See `.claude/rules/memory/agent-memory.md`

```
cagents-memory/
+-- _system/       # configs, commands/, templates/
+-- _knowledge/    # patterns, calibration, learnings
+-- _archive/      # completed sessions
+-- sessions/      # run_*, team_*, designer_* (org_*, review_*, optimize_* are legacy)
```

**Session ID**: `{command}_{slug}_{YYMMDD}_{NNN}` (e.g., `run_fix-auth_260317_001`)

**Key Session Files**: `workflow/plan.yaml`, `workflow/coordination_log.yaml`, `workflow/execution_summary.yaml`

**Principles**: File-based, session-scoped, parallel-safe, pause/resume capable. See `docs/CONTEXT_MANAGEMENT.md`.

**Recursive Workflows**: Complex tasks spawn child workflows (`max_nesting_depth: 5`, max children: 100). Each child follows objectives -> controller -> questions -> synthesis -> implementation.

**Subagent Nesting (CC 2.1.172+)**: Subagents retain the `Agent` tool and CAN spawn their own subagents up to 5 levels deep (`max_nesting_depth: 5`; the skill loop is depth 0, the 5 levels are the subagent generations beneath it). The nesting model is `skill loop (depth 0) -> controller/subagent (depth 1) -> execution agent (depth 2) -> ... up to 5 levels deep`. `/team` wave subagents reliably spawn execution agents and reviewers, and may nest deeper within the budget; they spawn execution agents directly rather than re-entering the full `/run` pipeline by design for cost/clarity, not because of a harness limit. Graceful degradation (the `pat-graceful-degradation-depth1.md` playbook) is a **defensive fallback** for the nesting ceiling (a depth-5 subagent cannot spawn a depth-6 child) or a regressed harness — agents check whether the `Agent` tool is actually present before degrading to direct execution + self-validation. See `.claude/rules/core/teams.md` and `.claude/rules/playbooks/pat-graceful-degradation-depth1.md`.

## Creating Agents / Domains

See `.claude/rules/core/skill-format.md` and `.claude/rules/core/execution.md` for full agent authoring guidelines.

**Quick steps**: Choose tier + archetype (+ branch if 3-level) → create `{archetype}/{branch?}/{agent-name}/SKILL.md` with YAML frontmatter → run `bash scripts/sync-agents.sh` → test with `bash scripts/ci/validate-agents.sh`.

## Directory Structure

```
cAgents/
+-- CLAUDE.md                # Main project memory (this file)
+-- .claude/
|   +-- skills/              # Skills (run, team, designer, helper)
|   +-- hooks/               # 34 .cjs files (26 registered hooks + 5 dispatched sub-validators + utils + launcher + bash-guard-evaluator library)
|   +-- output-styles/       # Output-style files
|   +-- plans/               # Saved execution plans
|   +-- rules/               # Modular rules (43 files: 37 top-level across 6 categories + 2 READMEs (root + playbooks/) + 4 in resources/)
|   +-- settings.json        # Hook registration + permissions + env
+-- agents/                  # All 60 agents (44 routable + 16 core) across 9 archetype roots:
|                            #   developer, operator, advisor, analyst, creator, writer, strategist, core, leadership
|                            #   (per-archetype counts in § Project Overview + Quick Reference)
|   +-- _overlay/            # Legacy router/planner config overlays (people/, shared/ — config only)
+-- scripts/                 # Version sync, validation, CI scripts
+-- tests/                   # Vitest test suite (hooks + config)
+-- docs/                    # Project documentation
+-- _archive/                # Closed migration outputs, deprecated buckets, archived docs
+-- .claude-plugin/          # Root manifest
+-- cagents-memory/          # Runtime state (git-ignored)
```

## Hooks System

**Architecture**: CJS-only hooks with `createHook()` factory. 34 .cjs files = 26 unique registered hooks + 5 dispatched sub-validators (Write|Edit: secret-detection, controller-delegation-validator, skill-size-monitor via `write-edit-dispatch.cjs`; Agent: session-init-gate, model-routing-advisor via `agent-dispatch.cjs`) + hook-utils.cjs + run-hook.cjs launcher + bash-guard-evaluator.cjs (GuardFall evaluator library require'd by bash-validator.cjs). See `.claude/rules/core/hooks.md` for full documentation.

## Standalone Contract (V11.2.0+)

**cAgents is standalone. It MUST NOT depend on MCP servers — neither bundled nor consumed.**

This is a load-bearing constraint, not a default: the plugin installs and works out of
the box with zero external-service configuration. Coupling any agent or skill to an MCP
server breaks that "install and go" promise. User guidance (users MAY add their own MCP
servers) and the V11.1.12→V11.2.0 history live in `docs/ARCHITECTURE-HISTORY.md`.

### Rules

1. **No `mcpServers` blocks** anywhere in the plugin (`plugin.json`, `.mcp.json`, any
   shipped config). Both the plugin manifest and the project-level MCP config must be
   absent or empty.
2. **No `mcp__*` patterns in any agent's `allowed-tools`.** Agents declare only built-in
   Claude Code tools (`Read`, `Write`, `Edit`, `Bash`, `Grep`, `Glob`, `Agent`,
   `WebFetch`, `WebSearch`, `Task*`, etc.). Bash + WebFetch already cover the vast
   majority of integrations agents need; if an agent's job genuinely requires a hosted
   service, that's a sign the agent is mis-scoped.
3. **No hooks specific to MCP protocol events.** Claude Code emits `Elicitation` and
   `ElicitationResult` events when an MCP server is in use; cAgents does not register
   handlers for these. They remain available for users who add their own hooks.
4. **No MCP-suggesting docs** in CLAUDE.md, skill-format.md, README.md, or agent
   SKILL.md prose (other than a security agent legitimately referencing MCP as an
   *attack surface to audit*, which is content about MCP, not a dependency on it).
5. **Bug-driven test mandate** (per CLAUDE.md): a regression test must enforce this
   contract — any future PR that adds `mcp__*` to allowed-tools or adds a non-empty
   `mcpServers` block fails CI.

## Plugin Architecture

cAgents is distributed as a Claude Code plugin. The root manifest is
`.claude-plugin/plugin.json` (registers 60 agents + skills + hooks + version);
`.claude-plugin/marketplace.json` holds the marketplace listing. Plugin features
(LSP servers, default settings, hook registration, marketplace fields, multi-plugin
merge) and the full manifest-field detail live in
**`docs/ARCHITECTURE-HISTORY.md § Plugin Architecture`**. Worktree sparse checkout is
declared in `.claude/settings.json` (`worktree.sparsePaths`, 7 entries: `.claude/`,
`.claude-plugin/`, `cagents-memory/_system/`, `agents/`, `scripts/`, `tests/`,
`docs/`) so `/team` worktree-isolated subagents only populate the paths they
need. `.claude-plugin/` was added in v12.62.2 — without it, a worktree-isolated
subagent's checkout lacks `plugin.json`, causing `session-init-gate.cjs` to
misread every agent as unregistered (see CHANGELOG v12.62.2).

## Performance Benchmarks

Two classes of figures — **MEASURED** (reproducible artifact from the perf-corpus
runner with node/OS/timestamp provenance) and **ESTIMATE** (design-target
aspirations with NO artifact — treat as targets, never cite as measured). They
must never be conflated. The full measured-vs-estimate tables + provenance live in
**`docs/ARCHITECTURE-HISTORY.md § Performance Benchmarks`**; detailed tracking in
`docs/OPTIMIZATION_PROGRESS.md` and the measured-artifact manifest in
`cagents-memory/_system/evals/perf/README.md`.

## Quick Reference

**Skills**: `/run`, `/team`, `/designer`, `/helper` (in `.claude/skills/`; removed skills — `/review`, `/optimize`, `/context`, `/debug`, `/improve`, `/org` — see `docs/MIGRATION-V11.md` and CHANGELOG)
**Built-in**: `/memory`, `/init` (Claude Code native)
**Agents**: 60 total across 9 archetypes (developer 8, operator 8, advisor 4, analyst 5, creator 3, writer 4, strategist 3, core 16, leadership 9) — 44 routable + 16 core; 88 absorbed agents use mode flags (disk-derived: `grep -rhoE 'absorbed from [a-z0-9/_-]+' agents --include=SKILL.md | sort -u | wc -l` = 88 distinct former agents folded into a survivor mode)
**Domain Overlay (legacy routing/config only)**: 2 dirs (`people/`, `shared/`) hold `config/domain_overrides.yaml` — no SKILL.md files. The other 11 legacy domains (engineering, creative, business, growth, service, science, health, education, personal, arts, trades) were deleted and consolidated into `cagents-memory/_system/config/routing.yaml`.
**Key Files**: `CLAUDE.md`, `.claude/skills/*/SKILL.md`, `.claude/rules/*.md`, `people/config/domain_overrides.yaml`, `shared/config/domain_overrides.yaml`, `cagents-memory/_system/config/routing.yaml`, `cagents-memory/_system/config/pipeline_config.yaml`, `.claude/skills/run/reference/session-schema.md` (internal-only session YAML contract since v12.6.0)
**Hooks**: 34 .cjs files = 26 unique registered hooks + 5 dispatched sub-validators (run by write-edit-dispatch.cjs + agent-dispatch.cjs) + hook-utils.cjs + run-hook.cjs launcher + bash-guard-evaluator.cjs library
**Models**: opusplan (controllers, Opus 4.8 planning + Sonnet 4.6 execution), opus (creative/high-reasoning agents, Opus 4.8), sonnet (execution, Sonnet 4.6). No agent in the catalog declares `model: haiku` or `tier: support` — both remain available via `model_routing.yaml` but are unused by the current 60-agent catalog (disk-verified: 0 `model: haiku`, 0 `tier: support`; tiers are 26 controller / 22 execution / 12 infrastructure)
**Critical**: 100% task completion required, aggressive decomposition mandatory (tier 2+)
**Team Mode**: `/team` or `/run --team` for 40-60% faster tier 3+ via N-wave parallel execution (maximize waves)
**Pipeline**: 5-state pipeline with two execution paths (fast/standard — `fast` skips the orchestrator for tier-2-clear requests), revision routing (FAIL/REVISE), reviewer loops
**Tests**: `npm test` runs 1755+ Vitest tests across 211+ files (hooks + config validation + regression tests; static lower-bound — actual runtime count is higher because `it.each` rows expand to multiple tests)
**Version**: 12.64.0

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Wrong domain detected | Use explicit domain keywords |
| No controller selected | Check planner_config.yaml has controller_catalog |
| coordination_log missing | Check controller completed coordinating phase |
| Agent not found | Check agent has tier field in frontmatter |
| Workflow stuck in coordinating | Check controller is asking questions and synthesizing |
| Memory not loading | Run `/memory` to view loaded files |
| Hook not running | Check `.claude/settings.json` registration, verify `node` in PATH |
| Hook blocks unexpectedly | Test: `echo '{}' \| node .claude/hooks/<name>.cjs` |
| `SessionEnd hook...team-stop...failed: Hook cancelled` | Expected when cancelling a session — Claude Code terminates hooks during teardown before they finish. No data is lost or corrupted. |

See `docs/WORKFLOW_EVALUATION_FIXES.md` for recent workflow issue resolutions.
