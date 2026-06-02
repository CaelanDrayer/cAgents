# CLAUDE.md

Core architecture and development guidance for cAgents.

## v12.0.0 (consolidation release)

cAgents v12.0.0 is the major consolidation release shipped from branch
`revamp/v12-rc`. Highlights:

- **Pipeline collapse: 7 -> 5 states.** `task-decomposer` and `prompt-engineer`
  folded into `planner`. The /run state machine is now `INIT ->
  ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED`. Decomposition becomes
  a planner sub-responsibility; prompt-engineering becomes controller-side
  prompt assembly.
- **Controller merge: engineering-manager -> tech-lead.** Two engineering
  controllers consolidated into a single fullstack `tech-lead`. All 222
  active references were swept; alias preserved via
  `scripts/migration/v12-aliases.yaml`.
- **Architecture-reviewer collapsed.** `architecture-reviewer` removed as a
  standalone agent and reborn as `architect --review` mode flag.
- **Marketing-sales consolidation: 38 -> 25.** Thirteen marketing-sales
  agents absorbed across 6 groups (G1-G6).
- **chief-legal-officer -> clo.** Standardized leadership naming.
- **max_revision_cycles 5 -> 3.** Tighter revision budget per audit
  recommendation.
- **Execution self-validation: 15 -> 5 hook-verifiable checks.** The
  aspirational 15-check protocol replaced with 5 mechanically-verifiable
  checks (evidence freshness, file existence, guard exit codes, git state,
  file:line accuracy). See @.claude/rules/core/resources/execution-self-validation.md.
- **Legacy directory cleanup.** 11 of 13 legacy domain dirs removed
  (`engineering/`, `creative/`, `business/`, `growth/`, `service/`,
  `science/`, `health/`, `education/`, `personal/`, `arts/`, `trades/`);
  `people/` and `shared/` retained as routing-config-only overlays.
- **`cagents-memory/_communication/` removed.** Unused agent-messaging
  inbox/broadcast directory deleted.
- **Total agents: 251 -> 240.** Net 11 agents removed via 4 controller
  consolidations (task-decomposer, prompt-engineer, engineering-manager,
  architecture-reviewer) and 13 marketing-sales merges, partially offset by
  the chief-legal-officer -> clo rename and vp-engineering moving into
  leadership.

All renames preserved via `scripts/migration/v12-aliases.yaml` so existing
session artifacts referencing pre-v12 agent names continue to resolve.

## Table of Contents

- [Documentation Structure](#documentation-structure)
- [Version Management](#version-management)
- [Memory Management](#memory-management)
- [Project Overview](#project-overview)
- [CRITICAL: Aggressive Delegation](#critical-aggressive-delegation)
- [CRITICAL: Automatic Workflow Progression](#critical-automatic-workflow-progression)
- [Core Infrastructure](#core-infrastructure-tier-1-17-agents)
- [Aggressive Decomposition](#aggressive-decomposition)
- [Controller-Centric Architecture](#controller-centric-architecture)
- [Complexity Tiers](#complexity-tiers)
- [Workflow Execution](#workflow-execution)
- [Task Completion Protocol](#task-completion-protocol)
- [Skills (Commands)](#skills-commands)
- [Team Mode](#team-mode)
- [Agent Memory](#agent-memory)
- [Creating Agents](#creating-agents)
- [Creating Domains](#creating-domains)
- [Directory Structure](#directory-structure)
- [Hooks System](#hooks-system)
- [Quick Reference](#quick-reference)
- [Troubleshooting](#troubleshooting)

## Documentation Structure

- `CLAUDE.md` - Architecture, commands, agents (this file)
- `README.md` - Quick start
- `docs/` - Project documentation (64 files including ARCHITECTURE.md, SKILLS.md, TEAM_MODE.md, RELEASE_NOTES.md, etc.)
- `archive/docs/` - Historical documentation (local only)
- `cagents-memory/` - Runtime state (excluded from git)
- `.claude/skills/run/reference/session-schema.md` - Session YAML contract (internal-only since v12.6.0)
- `docs/WORKFLOW_AGENT_INTERACTIONS.md` - Agent interaction patterns

## Version Management

**CRITICAL: Always bump version on commits.** Run `scripts/sync-versions.sh <version>` to update all registry locations. See @.claude/rules/core/version-registry.md for the canonical list (16 locations as of v12.6.0; was 18 in V11.0, 21 historically — slots removed as /improve and /org skills were folded/removed).

**Version Format**: `major.minor.patch` — patch (bug fix), minor (feature), major (breaking)

## Memory Management

**Claude Code Memory Hierarchy**: 6-tier system. See @.claude/rules/memory/agent-memory.md for full details.

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
playbooks/      # pat-* reusable patterns (4 files)
```
Total: 36 .md = 30 top-level across 6 categories + 2 READMEs (root + playbooks/) + 4 resources/.

**Import Syntax**: Use `@path/to/file` to include external content. View loaded files: `/memory`

## Project Overview

**cAgents**: Universal multi-domain agent system with CSV-based task inventory for large-scale workflows. Handles 100+ tasks with 60-80% context savings.

**Key Features**: CSV Task Inventory, Batch Delegation (60-80% context reduction), Checkpoint/Resume, Aggressive Decomposition (30+ work items from simple requests), Controller-Centric coordination

**Architecture**: Controller-Centric Coordination with Task Inventory
- **Tier 1**: 15 core infrastructure agents (v12.0.0: task-decomposer + prompt-engineer folded into planner)
- **Tier 2**: Controllers (coordinate via batch delegation)
- **Tier 3**: Execution agents (implement work items)
- **Tier 4**: Support agents (foundational services)
- **Total**: 141 agents across 9 builder-role archetypes (post-v12.7.0 LP-12 + LP-13 consolidation; 99 culled to `_deprecated/` buckets)
- **Execution**: Event-driven pipeline (5-state machine) with progressive paths (minimal/medium/full), revision routing, reviewer loops

**Canonical structure (v12.0.0) — 9 archetypes**:
| Archetype | Dir | Agents | Capability |
|-----------|-----|-------:|------------|
| **Developer** | `developer/` | 26 | Backend, frontend, fullstack, infrastructure, quality (5 branches) |
| **Operator** | `operator/` | 36 | Support, business-ops, people-ops, marketing-sales, content (5 branches) |
| **Advisor** | `advisor/` | 12 | Legal, health, education, personal (4 branches) |
| **Analyst** | `analyst/` | 19 | Data, BI, research, social-science |
| **Creator** | `creator/` | 5 | Visual artists, designers, audiovisual creators |
| **Writer** | `writer/` | 8 | Copy, narrative, technical writing, editorial |
| **Strategist** | `strategist/` | 8 | Product owners, portfolio managers, planners |
| **Core** | `core/` | 15 | Pipeline infrastructure (trigger, orchestrator, planner, reviewer, etc.) |
| **Leadership** | `leadership/` | 12 | C-suite executives (used by /team strategic mode, not directly routable) |

**Domain overlay (legacy — routing/config only)**: 2 legacy domain dirs (`people/`, `shared/`) survive on disk **without** SKILL.md files; they hold `config/domain_overrides.yaml` with router keywords + controller catalogs that the planner still consumes. The other 11 legacy dirs (`engineering/`, `creative/`, `business/`, `growth/`, `service/`, `science/`, `health/`, `education/`, `personal/`, `arts/`, `trades/`) were deleted in v12 W4.2 and their router keywords + controller catalogs consolidated into `cagents-memory/_system/config/routing.yaml`. Do NOT delete `people/` or `shared/` — they are not orphans.

**Config**: `people/` and `shared/` keep their own `{domain}/config/domain_overrides.yaml`. The 11 deleted legacy domains live in `cagents-memory/_system/config/routing.yaml` under `domains.<name>` (with the same `controller_catalog` + `router.keywords` schema, just nested). Two archetype roots — `core/` and `leadership/` — also ship `config/domain_overrides.yaml` files (used for pipeline/C-suite routing tables), so `scripts/ci/validate-agents.sh` now reports 4 files checked (2 legacy retained + 2 archetype-root). The pre-v12 layout had 13 legacy domain_overrides.yaml files; v12 W4.2 consolidated 11 of them into the single _system routing.yaml.

## CRITICAL: Aggressive Delegation

**Core Principle**: /run, /team, and all coordination agents NEVER do direct work. ALL work delegated to subagents via Agent tool or Skill tool. No exceptions.

**Zero Tolerance**: `/run` and `/team` are pure delegation proxies. They parse, plan, spawn agents, and read results. They do NOT write code, create content, explore the codebase for implementation purposes, or handle tasks themselves. If an orchestrator says "I will handle this myself" or "Rather than spinning up agents, I'll do this directly" — that is a critical violation. The user chose these skills specifically for agent orchestration; bypassing delegation defeats the entire purpose of the plugin.

**This applies to ALL request sizes**: Even for single-file bug fixes, /run MUST still spawn a controller who spawns an execution agent. Even for cross-domain strategic requests, `/team` (with auto-strategic mode) MUST still spawn C-suite teammates in Wave 0/1 and synthesize a brief in Wave 2 before per-domain dispatch. There is no request small enough to justify self-handling.

**Minimum Tier**: Always tier 2+ (controller coordination required). ALL requests use agents. NO exceptions. Former tier 0/1 automatically upgraded.

**Delegation Chain** (V9.23 event-driven pipeline):
```
/run (state machine loop -- level 0)
  +-> orchestrator (level 1)    -> enriched_context.yaml
  +-> planner (level 1)         -> plan.yaml + work_items.yaml (decomposition + prompt assembly absorbed into planner in v12.0.0)
  +-> controller (level 1)
       +-> executor (level 2)   -> implementation
       +-> reviewer (level 2)   -> review_report.yaml
  +-> validator (level 1)       -> validation_report.yaml (PASS/FAIL/REVISE)
```

V9.23: `/run` is now a config-driven state machine reading `pipeline_config.yaml`. Each enrichment agent runs sequentially at level 1. Controllers spawn executors and reviewers at level 2 with revision loops (max 3 internal rounds). The validator outputs PASS/FAIL/REVISE to drive revision routing (max 3 total cycles in v12.0.0+). The standalone `prompt-engineer` and `task-decomposer` agents were folded into `planner` in v12.0.0; the planner now produces decomposition and assembles delegation prompts inline, and controllers fall back to standard delegation prompts when the planner skips prompt assembly.

**Enrichment Agents** (level 1): orchestrator, planner (planner absorbs decomposition + delegation-prompt assembly post-v12.0.0)
**Coordination Agents** (level 1, ONLY coordinate): controllers (tech-lead, architect, etc.)
**Execution Agents** (level 2, DO the work): backend-developer, frontend-developer, copywriter, qa-tester, etc.
**Review Agents** (level 2, via controller): reviewer evaluates against acceptance criteria
**Validation Agent** (level 1): validator with PASS/FAIL/REVISE output

**Why Event-Driven**: Config-driven state machine replaces hardcoded workflow steps. Revision loops at both levels ensure quality. Pre-enrichment detection enables /team teammate flows. Inline planner-side prompt assembly improves delegation quality.

## CRITICAL: Automatic Workflow Progression

Workflows proceed automatically through phases WITHOUT asking permission. See `docs/AUTOMATIC_WORKFLOW_PROGRESSION.md`.

**AUTO-PROCEED** (Never Ask): All phase transitions, plan.yaml -> coordinating, coordination_log complete -> executing, implementation complete -> validating, validation PASS -> complete

**ASK USER** (Only): Tier 4 HITL gates, unrecoverable errors, ambiguous requirements, validation BLOCKED

**Exception**: `/designer` is EXEMPT from auto-proceed. It is interactive and MUST use `AskUserQuestion` at every step, waiting for user responses before advancing. Designer SKILL.md rules override auto-proceed.

**If requirements are clear, PROCEED. Do not ask.** (Except /designer, which always asks.)

## Core Infrastructure (Tier 1: 15 agents)

**Orchestration** (4): `trigger` (entry point), `orchestrator` (context enrichment), `hitl` (human escalation), `optimizer` (universal optimization)

**Team** (2): `team` (team init + lead wrapper used by `/team` skill loop), `team-lead` (controller-style delegate-mode lead pattern). The pre-v12.0.0 `team-trigger` and `team-lead-adapter` standalone agents were removed when the `/team` skill loop absorbed their initialization/wrapper work inline.

**Universal Workflow** (5): `router` (tier 2-4 classification), `planner` (decomposition + controller selection + delegation-prompt assembly; absorbs the standalone `task-decomposer` and `prompt-engineer` agents post-v12.0.0), `executor` (monitor controllers), `validator` (quality gates with PASS/FAIL/REVISE), `self-correct` (adaptive recovery)

**Review** (1): `reviewer` (PASS/REVISE verdict against acceptance criteria; spawned by controllers and team leads)

**Task Management** (2): `task-merger` (40-88% context reduction), `task-state` (CSV-based state, 60-80% savings) — `task-decomposer` was absorbed into `planner` in v12.0.0

**Coordination** (1): `coordinator` (reusable coordinator for small domains — health, education, personal, arts, trades)

**Config**: `{domain}/config/domain_overrides.yaml` (controller_catalog, router keywords)

## Aggressive Decomposition

Users state outcomes, not requirements. The planner unpacks everything needed.

**5 Steps**: Request Analysis -> Component Extraction (UNDERSTAND/DESIGN/BUILD/VERIFY/DOCUMENT) -> Implicit Discovery (security, testing, infrastructure) -> Dependency Mapping -> Work Item Generation (30+ items with acceptance criteria)

**Output** (`decomposition.yaml`): Work items with IDs, types, acceptance criteria, dependencies, optional `tags: []` array for categorization, plus dependency graph with critical path and parallel groups.

**Controller Integration**: Controllers receive decomposition, ask clarifying questions for ambiguous items, coordinate execution respecting dependencies, verify acceptance criteria.

## Controller-Centric Architecture

Controllers are the coordination hub between planning and execution. See @.claude/rules/core/controllers.md for detailed patterns.

**Pattern**: Planner -> Objectives -> Controller -> Questions -> Execution Agents -> Answers -> Controller -> Synthesized Solution -> Implementation

**Question-Based Delegation**: Planner defines objectives and selects controller. Controller breaks into questions, delegates to execution agents, synthesizes answers, coordinates implementation. Executor monitors via coordination_log.yaml.

**Key Principles**: Controllers ask (not assign), execution agents answer, synthesis drives implementation, adaptive follow-up questions.

**Controllers by Domain**:
| Domain | Tier 2 | Tier 3 | Tier 4 |
|--------|--------|--------|--------|
| **Engineering** | tech-lead | + architect, security-lead | cto + tech-lead + architect |
| **Creative** | narrative-director | + story-architect, editor | cco + narrative-director |
| **Business** | operations-manager, product-owner | + strategic-planner, marketing-strategist | cpo + cfo + strategic-planner |
| **People** | hr-manager | + talent-acquisition-manager | chro + hr-manager |
| **Service** | customer-success-manager, general-counsel | + support-director, compliance-officer | general-counsel + support-director |

**Discovery**: Planner loads `{domain}/config/domain_overrides.yaml` -> `controller_catalog` -> matches tier + domain

**Coordinating Phase** (between planning and executing):
1. Orchestrator spawns controller with plan.yaml + decomposition.yaml
2. Controller reviews decomposition, asks clarifying questions, coordinates work items
3. Execution agents implement, controller tracks completion and verifies acceptance criteria
4. Controller writes coordination_log.yaml; orchestrator detects completion

**Coordination Log** (`cagents-memory/sessions/{session_id}/workflow/coordination_log.yaml`):
```yaml
schema_version: "1"
controller: cagents:tech-lead
objectives: [...]
questions_asked: [{question, delegated_to, answer}, ...]
synthesized_solution: {approach, rationale, implementation_steps, risks}
implementation_tasks: [{task_id, name, assigned_to, agent_id, acceptance_criteria, status}, ...]
status: completed
```

**Canonical Sources**: `workflow/work_items.yaml` is the canonical source for work item definitions (IDs, descriptions, acceptance criteria, dependencies). `team/task_list.yaml` is a status-only overlay (IDs + status + assigned_to). Parsers should read work_items.yaml for structure and task_list.yaml for current status.

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
  ORCHESTRATED -> planner -> plan.yaml + work_items.yaml (planner absorbs decomposition + delegation-prompt assembly in v12.0.0)
  PLANNED -> controller -> coordination_log.yaml (with executor+reviewer loops)
  Note: Pre-v12.0.0 state machine had DECOMPOSED and PROMPTS_READY stages (task-decomposer + prompt-engineer). v12.0.0 collapsed 7 states to 5.
  COORDINATED -> validator -> validation_report.yaml
  VALIDATED -> Complete
  FAIL -> back to PLANNED (re-run controller, max 3 cycles in v12.0.0+)
  REVISE -> back to PLANNED (re-plan, max 3 cycles in v12.0.0+)
```

**Subagent Architecture**: Agents delegate to specialists via Agent tool. Pattern: "Use {subagent} to {task}". Up to 50 concurrent. See `docs/WORKFLOW_AGENT_INTERACTIONS.md`.

## Task Completion Protocol

**MANDATORY**: 100% completion with verified evidence. See @.claude/rules/quality/completion.md.

**Enforced by**: Controllers (acceptance criteria), executor (coordination_log), validator (quality gates), orchestrator (phase validation)

**Evidence must be specific**: File paths, test results, metrics. No "probably works" or "mostly done".

## CRITICAL: Task Cleanup Protocol

**Every `TaskCreate` MUST have a matching `TaskUpdate(status: completed)` before the agent stops.** Stale in_progress tasks confuse users and clutter the UI.

**Rules**:
1. When you create a task via `TaskCreate`, you OWN its lifecycle — mark it `completed` when done
2. Before stopping or finishing a skill, check `TaskList` and resolve all your tasks
3. `/run`, `/team`, `/designer` MUST clean up all tasks at pipeline/session end
4. If a task is no longer needed, use `TaskUpdate(status: deleted)` — never leave it in_progress

**Anti-patterns** (never do this):
- Creating a task, doing the work, then stopping without marking it completed
- Leaving tasks as `in_progress` after the work is committed/pushed
- Creating tracking tasks that are never updated

## CRITICAL: TaskCreate Per Subagent

**Every background Agent/Task spawn MUST have a corresponding `TaskCreate` call BEFORE the spawn.** This gives the user per-agent visibility in the task list UI.

**Pattern**:
```
# 1. Create task FIRST
TaskCreate({ subject: "WI-1: Fix auth module", description: "..." })
# 2. Then spawn the agent
Agent({ description: "WI-1: Fix auth module", ..., run_in_background: true })
# 3. When agent completes, update task
TaskUpdate({ taskId: "N", status: "completed" })
```

**Rules**:
1. One `TaskCreate` per `Agent`/`Task` call when using `run_in_background: true`
2. Task subject should match the agent's description for UI clarity
3. Mark task `completed` when the agent notification arrives
4. For foreground (blocking) agents, TaskCreate is optional but recommended for long-running work
5. `/run`, `/team` pipelines MUST create per-subagent tasks — not just top-level orchestration tasks

**Why**: Without per-agent tasks, the user only sees generic orchestration entries (e.g., "◼ [team] Documentation update orchestration") with no visibility into the 4-5 agents actually doing work in parallel.

## Skills (Commands)

**V9.0+**: Skills in `.claude/skills/`, auto-discovered.

| Skill | Context | Agent | Description |
|-------|---------|-------|-------------|
| `/run` | `none` | `true` | Execute any task through auto-routed controller and specialist agents (passthroughs: `run context ...`, `--mode debug`; v12.1.2 keyword router: `run improve|review|audit|optimize ...` triggers improve modes) |
| `/team` | `fork` | `true` | Parallel multi-agent execution with wave-based quality gates; auto-enables strategic mode for cross-domain requests (v12.2.0+) |
| `/designer` | `none` | `false` | Interactive design exploration with guided Q&A before building |
| `/helper` | `none` | `false` | Command guide that recommends the right skill for your task |

**Built-in**: `/memory` (view/edit memory files), `/init` (bootstrap project CLAUDE.md)

### /run - Event-Driven Pipeline Engine (V9.23, V9.27)
State machine loop reading pipeline_config.yaml. Sequential enrichment (orchestrator, planner — the planner absorbed `task-decomposer` and `prompt-engineer` in v12.0.0 and now produces decomposition + delegation prompts inline), nested execution (controller + executor + reviewer), revision routing (FAIL/REVISE). V9.27: Adaptive pipeline (tier 2 fast path skips orchestrator), domain/tier confirmation display, execution analytics (`--analytics`). v12.0.0 sessions no longer emit `delegation_prompts.yaml`; controllers fall back to standard delegation prompts when the planner skips prompt assembly.
```bash
/run Fix auth bug              # -> Engineering (tier 2: tech-lead)
/run Write fantasy story       # -> Creative (tier 2: narrative-director)
/run Plan Q4 campaign          # -> Business (tier 3: marketing-strategist)
/run Design game mechanics     # -> Business (tier 2: game-designer)
```
Skill: `.claude/skills/run/SKILL.md` + `reference/`

### /team - N-Wave Parallel Team Execution (V9.23, V9.27, v12.2.0)
N-wave pipeline: **Wave 0 (lead: enrichment) -> Wave 1..N-1 (teammates: per-wave spawn, parallel within wave) -> Wave N (lead: integration)**. Maximizes waves for quality gating. Each wave spawns fresh teammates, validates GATE, then proceeds. 40-60% execution time reduction for tier 3+. V9.27: Automatic teammate failure recovery (retry + simplify + escalate), GATE validation standards per wave type, partial results on failure. **v12.2.0 Strategic Mode**: For cross-domain requests (`router.domain_count >= 2`), /team auto-enables strategic mode — Wave 0/1 = C-suite analysis (12 leadership agents), Wave 2 = brief synthesis, Wave 3..N = per-domain dispatch. Override with `--strategic` / `--no-strategic`. See `.claude/skills/team/reference/strategic-mode.md`.
```bash
/team Implement OAuth2 authentication           # Single-domain team execution (5-7 waves)
/team Launch new product with campaign          # Cross-domain: auto-strategic mode (eng + business + people)
/team Restructure engineering team --strategic  # Force strategic mode on
/team Build user dashboard --dry-run            # Preview wave structure
/team Build feature --waves 8                   # Force minimum 8 waves
/run Build feature --team                       # Team mode via flag
```
Config: `settings.json` (`teammateMode`: auto/tmux/in-process). See `docs/TEAM_MODE.md`.

### /designer, /helper
Each skill has `SKILL.md` + `reference/` directory with detailed docs. Use `/helper` for guidance.

Highlights:
- **/designer**: Subagent-delegated question preparation (research agents pre-build context-rich question lists per phase), inline controller pattern (select, reorder, skip, adapt questions), phase-overlap (next-phase research begins during current phase), follow-up research dispatch, graceful fallback, 28 behavioral rules
- **Improve modes inside /run (v12.1.2)**: `/improve` was folded into `/run` via a first-word keyword router. `/run improve X` -> `--mode full`. `/run review X` or `/run audit X` -> `--mode review`. `/run optimize X` -> `--mode optimize`. Review baselines (`--baseline`, `--suppress`), benchmark integration (`--benchmark`), pattern-effectiveness tracking, and atomic rollback helper remain available as flags on `/run`. See `.claude/skills/run/reference/improve-mode.md` for the keyword router contract
- **/helper**: Troubleshooting mode (`--troubleshoot`), updated comparison matrices, V11.0 migration catalog, v12.2.0 strategic-mode migration guidance (`/org X` → `/team X`)

## Team Mode

N-wave parallel team execution using Claude Code's built-in agent teams. Use `/team` for tier 3+ workflows (40-60% faster). See @.claude/rules/core/teams.md for wave structure, GATE sentinels, display modes, and troubleshooting.

## Agent Memory

**Full Structure**: See @.claude/rules/memory/agent-memory.md

```
cagents-memory/
+-- _system/       # configs, commands/, templates/
+-- _knowledge/    # patterns, calibration, learnings
+-- _archive/      # completed sessions
+-- sessions/      # run_*, team_*, designer_* (org_*, review_*, optimize_* are legacy; /org removed in v12.2.0, /review-/optimize folded into /run in v12.1.2)
```

**Session ID**: `{command}_{slug}_{YYMMDD}_{NNN}` (e.g., `run_fix-auth_260317_001`)

**Key Session Files**: `workflow/plan.yaml`, `workflow/coordination_log.yaml`, `workflow/execution_summary.yaml`

**Principles**: File-based, session-scoped, parallel-safe, pause/resume capable. See `docs/CONTEXT_MANAGEMENT.md`.

**Recursive Workflows**: Complex tasks spawn child workflows (max depth: 5, max children: 100). Each child follows objectives -> controller -> questions -> synthesis -> implementation.

## Creating Agents / Domains

See @.claude/rules/core/skill-format.md and @.claude/rules/core/execution.md for full agent authoring guidelines.

**Quick steps**: Choose tier + archetype (+ branch if 3-level) → create `{archetype}/{branch?}/{agent-name}/SKILL.md` with YAML frontmatter → run `bash scripts/sync-agents.sh` → test with `bash scripts/ci/validate-agents.sh`.

## Directory Structure

```
cAgents/
+-- CLAUDE.md                # Main project memory (this file)
+-- .claude/
|   +-- skills/              # Skills (run, team, designer, helper) — /improve folded into /run in v12.1.2; /org removed in v12.2.0 (folded into /team strategic mode)
|   +-- hooks/               # 31 .cjs files (28 hooks + utils + launcher + eval CLI)
|   +-- output-styles/       # Output-style files (v12.8.0+)
|   +-- plans/               # Saved execution plans
|   +-- rules/               # Modular rules (36 files: 30 top-level across 6 categories + 2 READMEs (root + playbooks/) + 4 in resources/)
|   +-- settings.json        # Hook registration + permissions + env
+-- agents/                  # All 141 agents (v12.8.0+ consolidation — formerly 11 root dirs)
|   +-- developer/           # Developer archetype (26 agents — backend/frontend/fullstack/infrastructure/quality)
|   +-- operator/            # Operator archetype (36 agents — support/business-ops/people-ops/marketing-sales/content)
|   +-- advisor/             # Advisor archetype (12 agents — legal/health/education/personal)
|   +-- analyst/             # Analyst archetype (19 agents — data, BI, research, social science)
|   +-- creator/             # Creator archetype (5 agents — visual, design, audiovisual)
|   +-- writer/              # Writer archetype (8 agents — copy, narrative, technical, editorial)
|   +-- strategist/          # Strategist archetype (8 agents — product owners, portfolio, planning)
|   +-- core/                # Core pipeline infrastructure (15 agents)
|   +-- leadership/          # Leadership archetype (12 C-suite agents — used by /team strategic mode)
|   +-- _overlay/            # Legacy router/planner config overlays
|       +-- people/          # config/domain_overrides.yaml only
|       +-- shared/          # config/, patterns/, resources/
+-- scripts/                 # Version sync, validation, CI scripts
+-- tests/                   # Vitest test suite (hooks + config)
+-- docs/                    # Project documentation
+-- _archive/                # Closed migration outputs, deprecated buckets, archived docs
+-- .claude-plugin/          # Root manifest
+-- cagents-memory/          # Runtime state (git-ignored)
```

## Hooks System

**Architecture**: CJS-only hooks with `createHook()` factory. 31 .cjs files = 28 unique registered hooks + hook-utils.cjs + run-hook.cjs launcher + eval-runner.cjs CLI. See @.claude/rules/core/hooks.md for full documentation.

## Standalone Contract (V11.2.0+)

**cAgents is standalone. It MUST NOT depend on MCP servers — neither bundled nor consumed.**

This is a load-bearing constraint, not a default. The plugin's value is that it works
out of the box: install cAgents, get 141 agents and 4 skills with zero external service
configuration. Coupling any agent or skill to an MCP server (the user must run a Postgres
MCP, configure a GitHub MCP, etc.) breaks that contract — agents start failing in
environments where the server isn't present, and the plugin's "install and go" promise
turns into "install, configure 11 external services, and go."

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

### What this means for users

Users CAN configure their own MCP servers in their personal `~/.claude/settings.json`
or project `.mcp.json` — Claude Code supports MCP independently of cAgents. cAgents
agents simply won't have those tools in their declared `allowed-tools`, so they won't
call MCP tools. If a user wants MCP-aware agents, they fork the plugin or override
specific agents in their own setup. cAgents the upstream plugin stays standalone.

### History

V11.1.12 introduced an "MCP consumer pattern (Stage 1)" that violated this contract by
adding `mcp__*` declarations to 10 agents and an `mcpServers` catalog to `plugin.json`.
V11.1.14 removed the catalog after Claude Code's plugin validator rejected the
descriptive shape (`mcpServers: Invalid input`). V11.1.15 fixed the same issue in
`.mcp.json`. V11.2.0 reverts the consumer-pattern entirely and codifies this contract,
because the standalone promise is more valuable than the optional integration was.

## Plugin Architecture

cAgents is distributed as a Claude Code plugin. See `.claude-plugin/plugin.json` for the root manifest.

**Plugin Structure**:
```
.claude-plugin/
├── plugin.json          # Root manifest (agents, skills, hooks, version)
└── marketplace.json     # Marketplace listing metadata
```

**Key Manifest Fields**:
- `agents`: Array of SKILL.md paths (141 agents registered post-v12.7.0)
- `skills`: Path to skills directory (`.claude/skills/`)
- `hooks`: Path to settings.json for hook registration
- `settings.json`: Default settings applied when plugin loads (under `agent` key for subagent defaults)

**Plugin Features** (Claude Code):
- **LSP Servers**: Plugins can provide language servers via `.lsp.json` for IDE-like features
- **Default Settings**: `settings.json` in plugin root applies defaults; `agent` key configures subagent behavior
- **Hook Registration**: Hooks declared in `hooks/hooks.json` or referenced via `hooks` field in plugin.json
- **Marketplace**: Submit via `marketplace.json` with `$schema`, owner, category, and version fields
- **Multi-Plugin**: Multiple plugins loaded via `--plugin-dir` flags; settings merge with project settings
- **Worktree Sparse Checkout (V11.1.12+)**: `.claude/settings.json` declares `worktree.sparsePaths` (14 entries — `.claude/`, `core/`, `cagents-memory/_system/`, the 9 archetype roots, `scripts/`, `tests/`, `docs/`). When `/team` teammates spawn with `isolation: "worktree"`, only these paths populate the worktree, dramatically reducing checkout time and preventing teammates from modifying out-of-scope files.

## Performance Benchmarks

| Feature | Improvement |
|---------|-------------|
| **Aggressive Decomposition** | 30+ work items from simple request |
| **Controller Pattern** | 30-40% simpler planning, 20-30% fewer tokens |
| **Parallel Execution** | 50x speedup (swarm), 80%+ efficiency |
| **Task Inventory** | 60-80% context savings for 20+ task workflows |
| **Team Mode** | 40-60% execution time reduction for tier 3+ |

See `docs/OPTIMIZATION_PROGRESS.md` for detailed tracking.

## Quick Reference

**Skills**: `/run`, `/team`, `/designer`, `/helper` (in `.claude/skills/`; V11.0 removed `/review`, `/optimize`, `/context`, `/debug`; v12.1.2 folded `/improve` into `/run` via keyword router; v12.2.0 removed `/org` and folded cross-domain coordination into `/team` strategic mode — see `docs/MIGRATION-V11.md` and CHANGELOG entries v12.1.2 / v12.2.0)
**Built-in**: `/memory`, `/init` (Claude Code native)
**Agents**: 141 total across 9 archetypes (developer 26, operator 36, advisor 12, analyst 19, creator 5, writer 8, strategist 8, core 15, leadership 12) — post-v12.7.0 LP-12 + LP-13 consolidation from 144
**Domain Overlay (legacy routing/config only)**: 2 dirs (`people/`, `shared/`) hold `config/domain_overrides.yaml` — no SKILL.md files. The other 11 legacy domains (engineering, creative, business, growth, service, science, health, education, personal, arts, trades) were deleted in v12 W4.2 and consolidated into `cagents-memory/_system/config/routing.yaml`.
**Key Files**: `CLAUDE.md`, `.claude/skills/*/SKILL.md`, `.claude/rules/*.md`, `people/config/domain_overrides.yaml`, `shared/config/domain_overrides.yaml`, `cagents-memory/_system/config/routing.yaml`, `cagents-memory/_system/config/pipeline_config.yaml`, `.claude/skills/run/reference/session-schema.md` (internal-only session YAML contract since v12.6.0)
**Hooks**: 31 .cjs files = 28 unique registered hooks + hook-utils.cjs + run-hook.cjs launcher + eval-runner.cjs CLI
**Models**: opusplan (controllers, Opus 4.6 + Sonnet 4.6), sonnet (execution, Sonnet 4.6), haiku (support, Haiku 4.5)
**Critical**: 100% task completion required, aggressive decomposition mandatory (tier 2+)
**Team Mode**: `/team` or `/run --team` for 40-60% faster tier 3+ via N-wave parallel execution (maximize waves)
**Pipeline**: Progressive pipeline (3 paths: minimal/medium/full) with 9-signal complexity scoring, revision routing (FAIL/REVISE), reviewer loops
**Tests**: `npm test` runs 1215+ Vitest tests across 145+ files (hooks + config validation + regression tests; static lower-bound — actual runtime count is higher because `it.each` rows expand to multiple tests)
**Version**: 12.15.0

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
