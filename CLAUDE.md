# CLAUDE.md

Core architecture and development guidance for cAgents.

## Current State

cAgents is a **standalone, domain-agnostic** multi-agent orchestration plugin:

- **60 agents** across 9 builder-role archetypes (developer, operator, advisor,
  analyst, creator, writer, strategist, core, leadership). The split is
  44 routable + 16 core. Pre-v12 agent names resolve via
  `scripts/migration/v12-aliases.yaml`.
- **5-state event-driven pipeline**: `INIT -> ORCHESTRATED -> PLANNED ->
  COORDINATED -> VALIDATED` (decomposition + prompt-assembly folded into the
  `planner`; `max_revision_cycles: 3`).
- **4 user skills**: `/act`, `/team`, `/designer`, `/helper`.
- **Zero external-service dependencies**. See § Standalone Contract.

For v12 consolidation history and all later release notes, see
`CHANGELOG.md` and `docs/RELEASE_NOTES.md`.

## Documentation Structure

Non-obvious pointers only. The rest of the tree is discoverable with `ls`:

- `.claude/skills/act/reference/session-schema.md` - Session YAML contract (internal-only)
- `docs/WORKFLOW_AGENT_INTERACTIONS.md` - Agent interaction patterns
- `archive/docs/` - Historical documentation (local only, not in git)
- `cagents-memory/` - Runtime state (excluded from git)

## Version Management

**CRITICAL: Always bump version on commits.** Run `scripts/sync-versions.sh <version>` to update all registry locations. See `.claude/rules/core/version-registry.md` for the canonical list (16 locations).

**Version Format**: `major.minor.patch`. Patch is a bug fix. Minor is a feature. Major is a breaking change.

## Memory Management

**Claude Code Memory Hierarchy**: standard 6-tier system. See `.claude/rules/memory/agent-memory.md` for cAgents-specific detail, and `/memory` for what is loaded right now.

**Rules Structure** for `.claude/rules/`. Modular rules (45 files). Every file is `paths`-scoped, so rules load on demand rather than every session:
```
core/           # orchestration, controllers, execution, hooks, teams, etc. (13 top-level + 3 resources/)
domains/        # engineering, grow, operate, people, serve (5 files)
infrastructure/ # model-routing (1 file)
memory/         # agent-memory (2 files)
quality/        # completion, validation-framework, implicit-discovery (6 top-level + 2 resources/)
playbooks/      # pat-* reusable patterns (11 pat-* + README = 12 files)
```
Total: 45 .md = 38 top-level across 6 categories + 2 READMEs (root + playbooks/) + 5 resources/.

## Project Overview

**cAgents**: Universal multi-domain agent system with CSV-based task inventory for large-scale workflows. Handles 100+ tasks with 60-80% context savings.

> **NOT a software-engineering tool.** cAgents is domain-agnostic. The pipeline machinery (orchestrator → planner → controller → validator) and the 60-agent catalog work in every domain. They span legal, finance, marketing, sales, HR, health, education, creative, operations, and research just as fully as engineering. The router selects `backend-developer` / `architect` / `validator` for *code* requests. Those agents are not what the system "is."
>
> A non-technical request is squarely in scope. Examples include drafting a SOW, pricing a migration, planning a campaign, writing a story, and building a financial model. `/act` and `/team` route each one to the right domain controller. Skills and controllers MUST NOT refuse, redirect, or warn a user off a non-technical request. No skill may cite the grounds that the plugin "looks engineering-focused." That reasoning is a framing defect, not correct behavior.

**Key Features**: CSV Task Inventory, Batch Delegation (60-80% context reduction), Checkpoint/Resume, Aggressive Decomposition (30+ work items from simple requests), Controller-Centric coordination

**Architecture**: Controller-Centric Coordination with Task Inventory
- **Tier 1**: 16 core infrastructure agents
- **Tier 2**: Controllers (coordinate via batch delegation)
- **Tier 3**: Execution agents (implement work items)
- **Tier 4**: Support agents (foundational services)
- **Total**: 60 agents across 9 builder-role archetypes (back-compat preserved via `scripts/migration/v12-aliases.yaml`)
- **Execution**: Event-driven pipeline (5-state machine) with two execution paths (fast/standard), revision routing, reviewer loops

**Canonical structure: 9 archetypes**, declared in each agent's `archetype:` frontmatter, NOT as directories. Agent files are flat at `agents/<name>.md`. Claude Code discovers plugin agents with a non-recursive scan of `agents/`, so the flat layout is mandatory. Per-archetype counts also appear in Quick Reference. The archetypes are Developer 8 (5 branches: backend/frontend/fullstack/infrastructure/quality), Operator 8 (5 branches: support/business-ops/people-ops/marketing-sales/content), Advisor 4 (legal/health/education/personal), Analyst 5, Creator 3, Writer 4, Strategist 3, Core 16 (pipeline infra), Leadership 9 (C-suite, /team strategic mode, not directly routable).

**Domain overlay (legacy: routing/config only)**: 2 legacy domain dirs (`people/`, `shared/`) survive on disk **without** SKILL.md files. They hold `config/domain_overrides.yaml` with router keywords + controller catalogs that the planner still consumes. The other 11 legacy dirs were deleted: `engineering/`, `creative/`, `business/`, `growth/`, `service/`, `science/`, `health/`, `education/`, `personal/`, `arts/`, `trades/`. Their router keywords and controller catalogs moved into `cagents-memory/_system/config/routing.yaml`. Do NOT delete `people/` or `shared/`. They are not orphans.

**Config**: `people/` and `shared/` keep their own `{domain}/config/domain_overrides.yaml`. The 11 deleted legacy domains live in `cagents-memory/_system/config/routing.yaml` under `domains.<name>` (with the same `controller_catalog` + `router.keywords` schema, just nested). Two archetype roots also ship `config/domain_overrides.yaml` files: `core/` and `leadership/`. Those files hold the pipeline and C-suite routing tables. So `scripts/ci/validate-agents.sh` now reports 4 files checked (2 legacy retained + 2 archetype-root).

## CRITICAL: Aggressive Delegation

**Core Principle**: /act, /team, and all coordination agents NEVER do direct work. Delegate ALL work to subagents via the Agent tool or the Skill tool. No exceptions.

**Zero Tolerance**: `/act` and `/team` are pure delegation proxies. They parse, plan, spawn agents, and read results. They do NOT write code, create content, explore the codebase for implementation purposes, or handle tasks themselves. An orchestrator that says "I will handle this myself" or "Rather than spinning up agents, I'll do this directly" commits a critical violation. The user chose these skills specifically for agent orchestration. Bypassing delegation defeats the entire purpose of the plugin.

**This applies to ALL request sizes**: Even for single-file bug fixes, /act MUST still spawn a controller who spawns an execution agent. Cross-domain strategic requests follow the same rule. `/team` (with auto-strategic mode) MUST still spawn C-suite subagents in Wave 0/1. It MUST then synthesize a brief in Wave 2 before per-domain dispatch. There is no request small enough to justify self-handling.

**Minimum Tier**: Always tier 2+ (controller coordination required). ALL requests use agents. NO exceptions. Former tier 0/1 automatically upgraded.

**Delegation Chain** (event-driven pipeline):
```
/act (state machine loop -- level 0)
  +-> orchestrator (level 1)    -> enriched_context.yaml
  +-> planner (level 1)         -> plan.yaml + work_items.yaml
  +-> controller (level 1)
       +-> executor (level 2)   -> implementation
       +-> reviewer (level 2)   -> review_report.yaml
  +-> validator (level 1)       -> validation_report.yaml (PASS/FAIL/REVISE)
```

`/act` is a config-driven state machine that reads `pipeline_config.yaml`. Enrichment agents (orchestrator, planner) run sequentially at level 1. Controllers spawn executors + reviewers at level 2, with internal reviewer loops of max 2 rounds (see controllers.md). The validator emits PASS/FAIL/REVISE to drive outer revision routing (max 3 cycles). The planner produces decomposition and assembles delegation prompts inline. Otherwise controllers fall back to standard prompts.

**Roles**: the orchestrator and the planner enrich (L1). Controllers ONLY coordinate (L1). Execution agents (backend-developer, frontend-developer, copywriter, qa-tester, …) DO the work (L2). The reviewer validates against acceptance criteria (L2). The validator gates (L1). This config-driven machine replaces hardcoded steps, and revision loops at both levels ensure quality.

**Per-subagent context aim**: Spawned subagents carry an advisory per-subagent context aim. See `.claude/rules/playbooks/pat-context-budget-tiers.md` for the figures and for the delegation levers that hold them. It is advisory: no gate, no threshold, no abort. It also governs a different actor than `.claude/rules/core/delegation.md` § The Size Rule. That rule governs what the MAIN SESSION carries (a size class, never a token count). Neither is an exception to the other.

## CRITICAL: Automatic Workflow Progression

Workflows proceed automatically through phases WITHOUT asking permission. See `docs/AUTOMATIC_WORKFLOW_PROGRESSION.md`.

**AUTO-PROCEED** (Never Ask): All phase transitions, plan.yaml -> coordinating, coordination_log complete -> executing, implementation complete -> validating, validation PASS -> complete

**ASK USER** (Only): Tier 4 HITL gates, unrecoverable errors, ambiguous requirements, validation BLOCKED

**Exception**: `/designer` is EXEMPT from auto-proceed. It is interactive. It MUST use `AskUserQuestion` at every step. It MUST wait for user responses before advancing. Designer SKILL.md rules override auto-proceed.

**If requirements are clear, PROCEED. Do not ask.** (Except /designer, which always asks.)

## Core Infrastructure (Tier 1: 16 agents)

Grouping only. Each agent's own role is in its frontmatter, which is already resident in the agent listing:

- **Orchestration** (4): `trigger`, `orchestrator`, `hitl`, `optimizer`
- **Team** (3): `team-bootstrap`, `team-lead`, `wave-reviewer`
- **Universal Workflow** (5): `router`, `planner`, `execution-monitor`, `validator`, `self-correct`
- **Review** (1): `reviewer`
- **Task Management** (1): `task-state`
- **Coordination** (1): `coordinator` (reusable controller for small domains: health, education, personal, arts, trades)
- **Logging** (1): `coord-log-writer`

**Config**: `{domain}/config/domain_overrides.yaml` (controller_catalog, router keywords)

## Aggressive Decomposition

Users state outcomes, not requirements. The planner unpacks everything needed.

**5 Steps**: Request Analysis -> Component Extraction (UNDERSTAND/DESIGN/BUILD/VERIFY/DOCUMENT) -> Implicit Discovery (security, testing, infrastructure) -> Dependency Mapping -> Work Item Generation (30+ items with acceptance criteria)

**Output** (`decomposition.yaml`): Work items with IDs, types, acceptance criteria, dependencies, and an optional `tags: []` array for categorization. The file also holds a dependency graph with the critical path and the parallel groups.

**Controller Integration**: Controllers receive decomposition, ask clarifying questions for ambiguous items, coordinate execution respecting dependencies, verify acceptance criteria.

## Controller-Centric Architecture

Controllers are the coordination hub between planning and execution. See `.claude/rules/core/controllers.md` for detailed patterns.

**Pattern**: Planner -> Objectives -> Controller -> Questions -> Execution Agents -> Answers -> Controller -> Synthesized Solution -> Implementation

**Question-Based Delegation**: The planner defines the objectives and selects the controller. The controller breaks them into questions, delegates to execution agents, synthesizes the answers, and coordinates implementation. The executor monitors progress via coordination_log.yaml.

**Key Principles**: Controllers ask (not assign), execution agents answer, synthesis drives implementation, adaptive follow-up questions.

**Controller selection by tier**. Per-domain catalogs live in `{domain}/config/domain_overrides.yaml` under `controller_catalog`, matched on tier + domain. Tier 2 = 1 primary controller (e.g. tech-lead, narrative-director, marketing-strategist). Tier 3 = primary + 1-2 supporting (e.g. architect, security-engineer). Tier 4 = 1 executive (cto/cco/cpo/chro) + primary + 2-4 supporting + HITL.

**Coordinating Phase**: The orchestrator spawns the controller with plan.yaml. The controller asks clarifying questions, coordinates work items, tracks completion, and verifies acceptance criteria. It then writes `coordination_log.yaml` with `schema_version: "1"`, `objectives`, `questions_asked`, `synthesized_solution`, `implementation_tasks`, and `status: completed`. See `.claude/rules/core/controllers.md` for the full schema and reviewer loop.

**Canonical Sources**: `workflow/work_items.yaml` is the canonical source for work-item definitions: IDs, descriptions, acceptance criteria, and dependencies. `team/task_list.yaml` is only a status overlay, and it carries IDs + status + assigned_to.

## Complexity Tiers

| Tier | Coordination | Example |
|------|--------------|---------|
| **2** (Moderate) | 1 controller | "Fix bug", "Answer question", "Fix typo" |
| **3** (Complex) | 1 primary + 1-2 supporting | "Add feature", "Create system" |
| **4** (Expert) | 1 executive + 1 primary + 2-4 supporting + HITL | "Major refactor", "Architecture migration" |

ALL workflows use routing -> planning -> **coordinating** -> executing -> validating. Tier 0/1 deprecated (auto-upgraded to tier 2).

## Workflow Execution

```
User Request -> /act (state machine loop, reads pipeline_config.yaml)
  INIT -> orchestrator -> enriched_context.yaml
  ORCHESTRATED -> planner -> plan.yaml + work_items.yaml (planner absorbs decomposition + delegation-prompt assembly)
  PLANNED -> controller -> coordination_log.yaml (with executor+reviewer loops)
  COORDINATED -> validator -> validation_report.yaml
  VALIDATED -> Complete
  FAIL -> back to PLANNED (re-run controller, max 3 cycles)
  REVISE -> back to PLANNED (re-plan, max 3 cycles)
```

**Subagent Architecture**: Agents delegate to specialists via the Agent tool. Pattern: "Use {subagent} to {task}". Up to 50 concurrent. See `docs/WORKFLOW_AGENT_INTERACTIONS.md`.

## Task Completion Protocol

**MANDATORY**: 100% completion with verified evidence. See `.claude/rules/quality/completion.md`.

**Enforced by**: Controllers (acceptance criteria), executor (coordination_log), validator (quality gates), orchestrator (phase validation)

**Evidence must be specific**: File paths, test results, metrics. No "probably works" or "mostly done".

## CRITICAL: Task Lifecycle (Cleanup + Per-Subagent Visibility)

**Every `TaskCreate` MUST have a matching `TaskUpdate(status: completed | deleted)` before the agent stops.** Stale `in_progress` tasks confuse users and clutter the UI. You OWN the lifecycle of any task you create. Before you finish a skill, sweep `TaskList` and resolve all of them. `/act`, `/team`, and `/designer` MUST clean up all tasks at pipeline/session end.

**Every background `Agent`/`Task` spawn MUST have a `TaskCreate` call BEFORE the spawn.** Create one task per spawn when `run_in_background: true`. Match the task subject to the agent's description. Mark the task `completed` when the agent notification arrives. Without per-agent tasks the user sees only a generic orchestration entry, and the parallel agents stay invisible. So `/act` and `/team` pipelines MUST create per-subagent tasks, not just top-level ones. (Foreground blocking agents: TaskCreate optional but recommended for long work.)

**Per-subagent visibility comes from the task subject, never from the Agent tool's `name`.** `name` implies background and cannot be combined with a blocking call. It silently overrides an explicit `run_in_background: false`. A caller that needed the result in-turn then yields holding nothing. So the two rules above are satisfiable together only if you name the TASK, not the SPAWN.

Choose by how you will collect it. Work you must collect this turn → spawn **unnamed** with `run_in_background: false`. Still `TaskCreate` a task whose subject matches the agent's description. A genuinely resumable conversation you will collect later via `SendMessage` → a **named** teammate. A named teammate is background by definition, so it also requires the `TaskCreate` above. Precedence and mechanism: `.claude/rules/core/delegation.md` § Synchronous Spawning.

**Anti-patterns**: creating a task then stopping without completing it; leaving tasks `in_progress` after work is committed; creating tracking tasks that are never updated.

## Skills (Commands)

**V9.0+**: Skills in `.claude/skills/`, auto-discovered.

**Mode & flag registry**: `.claude/skills/_MODE_REGISTRY.md` is the single source of truth for all skill modes, flags, and trigger phrases. Skill SKILL.md bodies reference it rather than redefining modes inline. Consult it before you add or change a skill flag.

| Skill | Context | Agent | Description |
|-------|---------|-------|-------------|
| `/act` | `none` | `true` | Execute any task through auto-routed controller and specialist agents (passthroughs: `act context ...`, `--mode debug`; keyword router: `act improve|review|audit|optimize ...` triggers improve modes) |
| `/team` | `fork` | `true` | Parallel multi-agent execution with wave-based quality gates; auto-enables strategic mode for cross-domain requests |
| `/designer` | `none` | `false` | Interactive design exploration with guided Q&A before building |
| `/helper` | `none` | `false` | Command guide that recommends the right skill for your task |

**Built-in**: `/memory` (view/edit memory files), `/init` (bootstrap project CLAUDE.md)

**Per-skill detail** (pipeline internals, wave model, strategic mode, improve-mode keyword router, /designer behavior) lives in `.claude/rules/core/orchestration.md` § Skill Surface Reference. That file is `paths`-scoped to `.claude/skills/**`, so it loads when you work on a skill instead of in every session.

## Agent Memory

**Full Structure**: See `.claude/rules/memory/agent-memory.md`

```
cagents-memory/
+-- _system/       # configs, commands/, templates/
+-- _knowledge/    # patterns, calibration, learnings
+-- _archive/      # completed sessions
+-- sessions/      # act_*, team_*, designer_* (run_*, org_*, review_*, optimize_* are legacy)
```

**Session ID**: `{command}_{slug}_{YYMMDD}_{NNN}` (e.g., `act_fix-auth_260317_001`)

**Key Session Files**: `workflow/plan.yaml`, `workflow/coordination_log.yaml`, `workflow/execution_summary.yaml`

**Principles**: File-based, session-scoped, parallel-safe, pause/resume capable. See `docs/CONTEXT_MANAGEMENT.md`.

**Recursive Workflows**: Complex tasks spawn child workflows (`max_nesting_depth: 5`, max children: 100). Each child follows objectives -> controller -> questions -> synthesis -> implementation.

**Subagent Nesting (CC 2.1.172+)**: Subagents retain the `Agent` tool. They CAN spawn their own subagents up to 5 levels deep (`max_nesting_depth: 5`). The skill loop is depth 0, and the 5 levels are the subagent generations beneath it. The nesting model is `skill loop (depth 0) -> controller/subagent (depth 1) -> execution agent (depth 2) -> ... up to 5 levels deep`.

`/team` wave subagents reliably spawn execution agents and reviewers. They may also nest deeper within the budget. They spawn execution agents directly rather than re-entering the full `/act` pipeline. That choice is by design for cost and clarity, not a harness limit.

Graceful degradation (the `pat-graceful-degradation-depth1.md` playbook) is a **defensive fallback**. It covers the nesting ceiling and a regressed harness. A depth-5 subagent cannot spawn a depth-6 child. Agents check whether the `Agent` tool is actually present before they degrade to direct execution + self-validation. See `.claude/rules/core/teams.md` and `.claude/rules/playbooks/pat-graceful-degradation-depth1.md`.

## Creating Agents / Domains

See `.claude/rules/core/skill-format.md` and `.claude/rules/core/execution.md` for full agent authoring guidelines.

**Quick steps**: Choose a tier and an archetype, plus a branch if the archetype is 3-level. Create `agents/{agent-name}.md` with YAML frontmatter. (`archetype:` and `branch:` are frontmatter fields, not directories.) Put any tier-3 playbooks in `agents/{agent-name}/resources/`. Reference them as `@{agent-name}/resources/<file>.md`. Test with `bash scripts/ci/validate-agents.sh`. There is no registration step: the flat `agents/` scan IS the registry.

## Hooks System

**Architecture**: CJS-only hooks with `createHook()` factory. 34 .cjs files = 26 unique registered hooks + 5 dispatched sub-validators (Write|Edit: secret-detection, controller-delegation-validator, skill-size-monitor via `write-edit-dispatch.cjs`; Agent: session-init-gate, model-routing-advisor via `agent-dispatch.cjs`) + hook-utils.cjs + run-hook.cjs launcher + bash-guard-evaluator.cjs (GuardFall evaluator library require'd by bash-validator.cjs). See `.claude/rules/core/hooks.md` for full documentation.

## Standalone Contract (V11.2.0+)

**cAgents is standalone. It MUST NOT depend on MCP servers. That ban covers both bundled servers and consumed servers.**

This is a load-bearing constraint, not a default. The plugin installs and works out of
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
   majority of integrations agents need. If an agent's job genuinely requires a hosted
   service, then that agent is mis-scoped.
3. **No hooks specific to MCP protocol events.** Claude Code emits `Elicitation` and
   `ElicitationResult` events when an MCP server is in use. cAgents does not register
   handlers for these. They remain available for users who add their own hooks.
4. **No MCP-suggesting docs** in CLAUDE.md, skill-format.md, README.md, or agent
   SKILL.md prose. One exception applies: a security agent may legitimately reference
   MCP as an *attack surface to audit*. That is content about MCP, not a dependency
   on it.
5. **Bug-driven test mandate** (per CLAUDE.md): a regression test must enforce this
   contract. Any future PR that adds `mcp__*` to allowed-tools fails CI. So does any
   PR that adds a non-empty `mcpServers` block.

## Plugin Architecture

cAgents is distributed as a Claude Code plugin. The root manifest is
`.claude-plugin/plugin.json`, and it registers 60 agents + skills + hooks + version.
`.claude-plugin/marketplace.json` holds the marketplace listing. Plugin features
(LSP servers, default settings, hook registration, marketplace fields, multi-plugin
merge) and the full manifest-field detail live in
**`docs/ARCHITECTURE-HISTORY.md § Plugin Architecture`**.

Worktree sparse checkout is declared in `.claude/settings.json`
(`worktree.sparsePaths`), so `/team` worktree-isolated subagents only populate the
paths they need. `.claude-plugin/` was added in v12.62.2. Without it, a
worktree-isolated subagent's checkout lacks `plugin.json`. The hook
`session-init-gate.cjs` then misreads every agent as unregistered (see CHANGELOG
v12.62.2).

## Performance Benchmarks

Two classes of figures exist. **MEASURED** means a reproducible artifact from the
perf-corpus runner, with node/OS/timestamp provenance. **ESTIMATE** means a
design-target aspiration with NO artifact. Treat an estimate as a target. Never cite
an estimate as measured. The two classes must never be conflated.

The full measured-vs-estimate tables + provenance live in
**`docs/ARCHITECTURE-HISTORY.md § Performance Benchmarks`**. Detailed tracking lives
in `docs/OPTIMIZATION_PROGRESS.md`. The measured-artifact manifest lives in
`cagents-memory/_system/evals/perf/README.md`.

## Quick Reference

Counts below are pinned to disk by `scripts/ci/validate-counts.sh` and
`tests/regressions/claude-md-counts-current.test.js`. Keep them. Re-derive them
rather than hand-edit them. Everything else in this file that a session could
reconstruct with `ls` has been removed deliberately.

**Agents**: 60 total across 9 archetypes (developer 8, operator 8, advisor 4, analyst 5, creator 3, writer 4, strategist 3, core 16, leadership 9). The split is 44 routable + 16 core. 88 absorbed agents use mode flags (disk-derived: `grep -hoE 'absorbed from [a-z0-9/_-]+' agents/*.md | sort -u | wc -l` = 88 distinct former agents folded into a survivor mode)
**Models**: opusplan (controllers, Opus 4.8 planning + Sonnet 4.6 execution), opus (creative/high-reasoning agents, Opus 4.8), sonnet (execution, Sonnet 4.6). No agent in the catalog declares `model: haiku` or `tier: support`. Both remain available via `model_routing.yaml`, but the current 60-agent catalog does not use either one (disk-verified: 0 `model: haiku`, 0 `tier: support`; tiers are 26 controller / 22 execution / 12 infrastructure)
**Tests**: `npm test` runs 2034+ Vitest tests across 225+ files (hooks + config validation + regression tests). That figure is a static lower bound. The actual runtime count is higher, because `it.each` rows expand to multiple tests.
**Version**: 12.71.0

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
| `SessionEnd hook...team-stop...failed: Hook cancelled` | Expected when you cancel a session. Claude Code terminates hooks during teardown before they finish. No data is lost or corrupted. |

See `docs/WORKFLOW_EVALUATION_FIXES.md` for recent workflow issue resolutions.
