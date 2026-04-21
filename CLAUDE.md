# CLAUDE.md

Core architecture and development guidance for cAgents.

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
- `docs/` - Project documentation (25 files including ARCHITECTURE.md, SKILLS.md, TEAM_MODE.md, RELEASE_NOTES.md, etc.)
- `archive/docs/` - Historical documentation (local only)
- `Agent_Memory/` - Runtime state (excluded from git)
- `.claude/skills/run/reference/session-schema.md` - Session YAML contract (canonical schema for AgentPath)
- `docs/WORKFLOW_AGENT_INTERACTIONS.md` - Agent interaction patterns

## Version Management

**CRITICAL: Always bump version on commits.** Run `scripts/sync-versions.sh <version>` to update all 20 locations. See @.claude/rules/core/version-registry.md for the canonical list.

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
core/           # orchestration, controllers, execution, hooks, teams, etc. (12 files)
domains/        # engineering, creative, business, people, service (5 files)
infrastructure/ # model-routing (1 file)
memory/         # agent-memory (2 files)
quality/        # completion, validation-framework, implicit-discovery (5 files)
```

**Import Syntax**: Use `@path/to/file` to include external content. View loaded files: `/memory`

## Project Overview

**cAgents**: Universal multi-domain agent system with CSV-based task inventory for large-scale workflows. Handles 100+ tasks with 60-80% context savings.

**Key Features**: CSV Task Inventory, Batch Delegation (60-80% context reduction), Checkpoint/Resume, Aggressive Decomposition (30+ work items from simple requests), Controller-Centric coordination

**Architecture**: Controller-Centric Coordination with Task Inventory
- **Tier 1**: 17 core infrastructure agents (includes prompt-engineer, generic-coordinator)
- **Tier 2**: Controllers (coordinate via batch delegation)
- **Tier 3**: Execution agents (implement work items)
- **Tier 4**: Support agents (foundational services)
- **Total**: 243 agents across 15 domains
- **Execution**: Event-driven pipeline with progressive paths (minimal/medium/full), revision routing, reviewer loops

**Domains** (15):
| Domain | Dir | Agents | Capability |
|--------|-----|--------|------------|
| **Engineering** | `engineering/` | 31 | Software engineering, infrastructure, security, QA, game programming |
| **Creative** | `creative/` | 30 | Creative writing, narrative design, literary criticism, game art, audio |
| **Business** | `business/` | 28 | Strategy, product, operations, finance |
| **Growth** | `growth/` | 34 | Marketing, sales, revenue operations |
| **People** | `people/` | 17 | HR, talent acquisition, culture |
| **Service** | `service/` | 28 | Customer support, CX, legal, compliance, governance |
| **Leadership** | `leadership/` | 11 | C-suite executives + general-counsel (used by /org, not directly routable) |
| **Core** | `core/` | 17 | Infrastructure agents (trigger, orchestrator, planner, reviewer, generic-coordinator, etc.) |
| **Shared** | `shared/` | 12 | Cross-domain intelligence (BI, data science, market research, social science) |
| **Science** | `science/` | 10 | STEM research, scientific analysis |
| **Health** | `health/` | 5 | Medical, wellness, fitness, nutrition (uses generic-coordinator from core) |
| **Education** | `education/` | 5 | Teaching, tutoring, academic support (uses generic-coordinator from core) |
| **Personal** | `personal/` | 5 | Career, life coaching, personal finance (uses generic-coordinator from core) |
| **Arts** | `arts/` | 5 | Visual arts, music, film, performing arts (uses generic-coordinator from core) |
| **Trades** | `trades/` | 5 | Culinary, construction, automotive, agriculture (uses generic-coordinator from core) |

**Config**: Each domain has `{domain}/config/domain_overrides.yaml` with controller_catalog and router keywords.

## CRITICAL: Aggressive Delegation

**Core Principle**: /org, /run, /team, and all coordination agents NEVER do direct work. ALL work delegated to subagents via Agent tool or Skill tool. No exceptions.

**Zero Tolerance**: `/org`, `/run`, and `/team` are pure delegation proxies. They parse, plan, spawn agents, and read results. They do NOT write code, create content, explore the codebase for implementation purposes, or handle tasks themselves. If an orchestrator says "I will handle this myself" or "Rather than spinning up agents, I'll do this directly" — that is a critical violation. The user chose these skills specifically for agent orchestration; bypassing delegation defeats the entire purpose of the plugin.

**This applies to ALL request sizes**: Even for single-file bug fixes, /run MUST still spawn a controller who spawns an execution agent. Even for single-domain requests, /org MUST still generate a strategic brief and invoke /run or /team. There is no request small enough to justify self-handling.

**Minimum Tier**: Always tier 2+ (controller coordination required). ALL requests use agents. NO exceptions. Former tier 0/1 automatically upgraded.

**Delegation Chain** (V9.23 event-driven pipeline):
```
/run (state machine loop -- level 0)
  +-> orchestrator (level 1)    -> enriched_context.yaml
  +-> planner (level 1)         -> plan.yaml
  +-> decomposer (level 1)      -> work_items.yaml
  +-> prompt-engineer (level 1)  -> delegation_prompts.yaml (optional, skipped by adaptive pipeline)
  +-> controller (level 1)
       +-> executor (level 2)   -> implementation
       +-> reviewer (level 2)   -> review_report.yaml
  +-> validator (level 1)       -> validation_report.yaml (PASS/FAIL/REVISE)
```

V9.23: `/run` is now a config-driven state machine reading `pipeline_config.yaml`. Each enrichment agent runs sequentially at level 1. Controllers spawn executors and reviewers at level 2 with revision loops (max 3 internal rounds). The validator outputs PASS/FAIL/REVISE to drive revision routing (max 5 total cycles). The `prompt-engineer` agent crafts optimized delegation prompts between decomposition and controller execution, but is routinely skipped by the adaptive pipeline for tier 2 fast path (see V9.27 adaptive pipeline).

**Enrichment Agents** (level 1): orchestrator, planner, decomposer, prompt-engineer (optional)
**Coordination Agents** (level 1, ONLY coordinate): controllers (engineering-manager, architect, etc.)
**Execution Agents** (level 2, DO the work): backend-developer, frontend-developer, copywriter, qa-tester, etc.
**Review Agents** (level 2, via controller): reviewer evaluates against acceptance criteria
**Validation Agent** (level 1): universal-validator with PASS/FAIL/REVISE output

**Why Event-Driven**: Config-driven state machine replaces hardcoded workflow steps. Revision loops at both levels ensure quality. Pre-enrichment detection enables /team teammate flows. prompt-engineer improves delegation quality.

## CRITICAL: Automatic Workflow Progression

Workflows proceed automatically through phases WITHOUT asking permission. See `docs/AUTOMATIC_WORKFLOW_PROGRESSION.md`.

**AUTO-PROCEED** (Never Ask): All phase transitions, plan.yaml -> coordinating, coordination_log complete -> executing, implementation complete -> validating, validation PASS -> complete

**ASK USER** (Only): Tier 4 HITL gates, unrecoverable errors, ambiguous requirements, validation BLOCKED

**Exception**: `/designer` is EXEMPT from auto-proceed. It is interactive and MUST use `AskUserQuestion` at every step, waiting for user responses before advancing. Designer SKILL.md rules override auto-proceed.

**If requirements are clear, PROCEED. Do not ask.** (Except /designer, which always asks.)

## Core Infrastructure (Tier 1: 17 agents)

**Orchestration** (4): `trigger` (entry point), `orchestrator` (context enrichment), `hitl` (human escalation), `optimizer` (universal optimization)

**Team** (2): `team-trigger` (team init via TeamCreate), `team-lead-adapter` (controller team lead wrapper)

**Universal Workflow** (5): `universal-router` (tier 2-4 classification), `universal-planner` (decomposition + controller selection), `universal-executor` (monitor controllers), `universal-validator` (quality gates with PASS/FAIL/REVISE), `universal-self-correct` (adaptive recovery)

**Pipeline** (1): `prompt-engineer` (crafts optimized delegation prompts between decomposer and controller; optional — skipped by adaptive pipeline for tier 2)

**Task Management** (3): `task-consolidator` (40-88% context reduction), `task-decomposer` (aggressive decomposition), `task-inventory` (CSV-based state, 60-80% savings)

**Coordination** (1): `generic-coordinator` (reusable coordinator for small domains — health, education, personal, arts, trades)

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
| **Engineering** | engineering-manager | + architect, security-lead | cto + engineering-manager + architect |
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

**Coordination Log** (`Agent_Memory/sessions/{session_id}/workflow/coordination_log.yaml`):
```yaml
schema_version: "1"
controller: cagents:engineering-manager
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
  ORCHESTRATED -> planner -> plan.yaml
  PLANNED -> decomposer -> work_items.yaml
  DECOMPOSED -> prompt-engineer -> delegation_prompts.yaml (optional, often skipped)
  PROMPTS_READY -> controller -> coordination_log.yaml (with executor+reviewer loops)
  Note: Adaptive pipeline (V9.27) skips DECOMPOSED->PROMPTS_READY for tier 2, jumping directly to controller.
  COORDINATED -> validator -> validation_report.yaml
  VALIDATED -> Complete
  FAIL -> back to PROMPTS_READY (re-run controller, max 5 cycles)
  REVISE -> back to PLANNED (re-plan, max 5 cycles)
```

**Subagent Architecture**: Agents delegate to specialists via Agent tool. Pattern: "Use {subagent} to {task}". Up to 50 concurrent. See `docs/WORKFLOW_AGENT_INTERACTIONS.md`.

## Task Completion Protocol

**MANDATORY**: 100% completion with verified evidence. See @.claude/rules/quality/completion.md.

**Enforced by**: Controllers (acceptance criteria), universal-executor (coordination_log), universal-validator (quality gates), orchestrator (phase validation)

**Evidence must be specific**: File paths, test results, metrics. No "probably works" or "mostly done".

## CRITICAL: Task Cleanup Protocol

**Every `TaskCreate` MUST have a matching `TaskUpdate(status: completed)` before the agent stops.** Stale in_progress tasks confuse users and clutter the UI.

**Rules**:
1. When you create a task via `TaskCreate`, you OWN its lifecycle — mark it `completed` when done
2. Before stopping or finishing a skill, check `TaskList` and resolve all your tasks
3. `/run`, `/team`, `/org`, `/designer` MUST clean up all tasks at pipeline/session end
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
5. `/org`, `/run`, `/team` pipelines MUST create per-subagent tasks — not just top-level orchestration tasks

**Why**: Without per-agent tasks, the user only sees generic orchestration entries (e.g., "◼ [org] Documentation update orchestration") with no visibility into the 4-5 agents actually doing work in parallel.

## Skills (Commands)

**V9.0+**: Skills in `.claude/skills/`, auto-discovered.

| Skill | Context | Agent | Description |
|-------|---------|-------|-------------|
| `/org` | `none` | `true` | Cross-domain strategy via C-suite agents and sequential team execution |
| `/run` | `none` | `true` | Execute any task through auto-routed controller and specialist agents |
| `/team` | `fork` | `true` | Parallel multi-agent execution with wave-based quality gates |
| `/designer` | `none` | `false` | Interactive design exploration with guided Q&A before building |
| `/review` | `fork` | `true` | Quality review with parallel specialist agents and auto-fix |
| `/optimize` | `fork` | `true` | Performance optimization with before/after metrics and rollback |
| `/helper` | `none` | `false` | Command guide that recommends the right skill for your task |
| `/context` | `none` | `false` | Shared product context that persists across all sessions |
| `/debug` | `none` | `false` | Systematic 4-phase debugging for bugs that resist quick fixes |

**Built-in**: `/memory` (view/edit memory files), `/init` (bootstrap project CLAUDE.md)

### /org - Corporate Hierarchy Orchestration (V9.26, V9.30)
CEO inline logic (`context: none`) with dependency-ordered C-suite analysis via Agent (Wave 1 independent agents in parallel, Wave 2 dependent agents reading peer analyses via file-based inline passes), two-phase deliberation (objection phase reads ALL peer analyses for cross-domain context), strategic brief, and sequential /team execution per domain via Skill. Runs inline (not forked) because subagents cannot spawn other subagents. 6-state pipeline: INIT -> ANALYZED -> DELIBERATED -> BRIEFED -> EXECUTED -> INTEGRATED -> COMPLETE.
```bash
/org Launch new product with campaign    # -> Full hierarchy (engineering + business + people)
/org Fix auth bug                        # -> Single /run with strategic brief
/org Restructure engineering team        # -> Full hierarchy (engineering + people)
/org Migrate to microservices --dry-run  # -> Preview routing decision
```
Skill: `.claude/skills/org/SKILL.md` + `reference/`

### /run - Event-Driven Pipeline Engine (V9.23, V9.27)
State machine loop reading pipeline_config.yaml. Sequential enrichment (orchestrator, planner, decomposer, prompt-engineer — prompt-engineer is optional), nested execution (controller + executor + reviewer), revision routing (FAIL/REVISE). V9.27: Adaptive pipeline (tier 2 fast path skips prompt-engineer and other enrichment agents), domain/tier confirmation display, execution analytics (`--analytics`). In practice, `delegation_prompts.yaml` is only produced when prompt-engineer runs; controllers fall back to standard prompts when it is skipped.
```bash
/run Fix auth bug              # -> Engineering (tier 2: engineering-manager)
/run Write fantasy story       # -> Creative (tier 2: narrative-director)
/run Plan Q4 campaign          # -> Business (tier 3: marketing-strategist)
/run Design game mechanics     # -> Business (tier 2: game-designer)
```
Skill: `.claude/skills/run/SKILL.md` + `reference/`

### /team - N-Wave Parallel Team Execution (V9.23, V9.27)
N-wave pipeline: **Wave 0 (lead: enrichment) -> Wave 1..N-1 (teammates: per-wave spawn, parallel within wave) -> Wave N (lead: integration)**. Maximizes waves for quality gating. Each wave spawns fresh teammates, validates GATE, then proceeds. 40-60% execution time reduction for tier 3+. V9.27: Automatic teammate failure recovery (retry + simplify + escalate), GATE validation standards per wave type, partial results on failure.
```bash
/team Implement OAuth2 authentication    # Full team execution (5-7 waves)
/team Build user dashboard --dry-run     # Preview wave structure
/team Build feature --waves 8            # Force minimum 8 waves
/run Build feature --team                # Team mode via flag
```
Config: `settings.json` (`teammateMode`: auto/tmux/in-process). See `docs/TEAM_MODE.md`.

### /designer, /review, /optimize, /helper
Each skill has `SKILL.md` + `reference/` directory with detailed docs. Use `/helper` for guidance.

V9.29 additions:
- **/designer**: Subagent-delegated question preparation (research agents pre-build context-rich question lists per phase), inline controller pattern (select, reorder, skip, adapt questions), phase-overlap (next-phase research begins during current phase), follow-up research dispatch, graceful fallback, 28 behavioral rules
- **/review**: Review baselines (`--baseline`, `--suppress`), review profiles (`--profile`), quality trend tracking, baseline-suppression reference
- **/optimize**: Benchmark integration (`--benchmark`), optimization history/learning (`--history`), pattern effectiveness tracking
- **/helper**: Full /org documentation, troubleshooting mode (`--troubleshoot`), updated comparison matrices

## Team Mode

N-wave parallel team execution using Claude Code's built-in agent teams. Use `/team` for tier 3+ workflows (40-60% faster). See @.claude/rules/core/teams.md for wave structure, GATE sentinels, display modes, and troubleshooting.

## Agent Memory

**Full Structure**: See @.claude/rules/memory/agent-memory.md

```
Agent_Memory/
+-- _system/       # configs, commands/, templates/
+-- _knowledge/    # patterns, calibration, learnings
+-- _archive/      # completed sessions
+-- _communication/# agent messaging
+-- sessions/      # org_*, run_*, team_*, designer_*, review_*, optimize_*
```

**Session ID**: `{command}_{slug}_{YYMMDD}_{NNN}` (e.g., `run_fix-auth_260317_001`)

**Key Session Files**: `workflow/plan.yaml`, `workflow/coordination_log.yaml`, `workflow/execution_summary.yaml`

**Principles**: File-based, session-scoped, parallel-safe, pause/resume capable. See `docs/CONTEXT_MANAGEMENT.md`.

**Recursive Workflows**: Complex tasks spawn child workflows (max depth: 5, max children: 100). Each child follows objectives -> controller -> questions -> synthesis -> implementation.

## Creating Agents / Domains

See @.claude/rules/core/skill-format.md and @.claude/rules/core/execution.md for full agent authoring guidelines.

**Quick steps**: Choose tier+domain → create `{domain}/agents/my-agent/SKILL.md` with YAML frontmatter → add to plugin.json → test with `bash scripts/ci/validate-agents.sh`.

## Directory Structure

```
cAgents/
+-- CLAUDE.md                # Main project memory (this file)
+-- .claude/
|   +-- skills/              # Skills (org, run, team, designer, review, optimize, helper, context)
|   +-- hooks/               # 30 .cjs files (27 hooks + utils + launcher + eval CLI)
|   +-- plans/               # Saved execution plans
|   +-- rules/               # Modular rules (26 files, 5 categories)
|   +-- settings.json        # Hook registration + permissions + env
+-- engineering/             # Engineering domain (31 agents, config, manifest)
+-- creative/                # Creative domain (30 agents)
+-- business/                # Business domain (28 agents)
+-- people/                  # People domain (17 agents)
+-- service/                 # Service domain (28 agents)
+-- leadership/              # Leadership domain (11 C-suite agents)
+-- core/                    # Core infrastructure (17 agents, includes generic-coordinator)
+-- shared/                  # Cross-domain specialists (12 agents)
+-- growth/                  # Growth domain (34 agents: marketing, sales, revenue ops)
+-- science/                 # Science domain (10 agents)
+-- health/                  # Health domain (5 agents, uses generic-coordinator from core)
+-- education/               # Education domain (5 agents, uses generic-coordinator from core)
+-- personal/                # Personal domain (5 agents, uses generic-coordinator from core)
+-- arts/                    # Arts domain (5 agents, uses generic-coordinator from core)
+-- trades/                  # Trades domain (5 agents, uses generic-coordinator from core)
+-- scripts/                 # Version sync, validation, CI scripts
+-- tests/                   # Vitest test suite (hooks + config)
+-- docs/                    # Project documentation
+-- .claude-plugin/          # Root manifest
+-- Agent_Memory/            # Runtime state (git-ignored)
```

## Hooks System

**Architecture**: CJS-only hooks with `createHook()` factory. 30 .cjs files across 19 event types. See @.claude/rules/core/hooks.md for full documentation.

## Plugin Architecture

cAgents is distributed as a Claude Code plugin. See `.claude-plugin/plugin.json` for the root manifest.

**Plugin Structure**:
```
.claude-plugin/
├── plugin.json          # Root manifest (agents, skills, hooks, version)
└── marketplace.json     # Marketplace listing metadata
```

**Key Manifest Fields**:
- `agents`: Array of SKILL.md paths (243 agents registered)
- `skills`: Path to skills directory (`.claude/skills/`)
- `hooks`: Path to settings.json for hook registration
- `settings.json`: Default settings applied when plugin loads (under `agent` key for subagent defaults)

**Plugin Features** (Claude Code):
- **LSP Servers**: Plugins can provide language servers via `.lsp.json` for IDE-like features
- **Default Settings**: `settings.json` in plugin root applies defaults; `agent` key configures subagent behavior
- **Hook Registration**: Hooks declared in `hooks/hooks.json` or referenced via `hooks` field in plugin.json
- **Marketplace**: Submit via `marketplace.json` with `$schema`, owner, category, and version fields
- **Multi-Plugin**: Multiple plugins loaded via `--plugin-dir` flags; settings merge with project settings

## Performance Benchmarks

| Feature | Improvement |
|---------|-------------|
| **Aggressive Decomposition** | 30+ work items from simple request |
| **Controller Pattern** | 30-40% simpler planning, 20-30% fewer tokens |
| **Parallel Execution** | 50x speedup (swarm), 80%+ efficiency |
| **Task Inventory** | 60-80% context savings for 20+ task workflows |
| **Team Mode** | 40-60% execution time reduction for tier 3+ |

See `docs/OPTIMIZATION_PROGRESS.md` for detailed tracking.

## V10.18.0 Highlights

- **Vibe field on all 243 agents**: Personality one-liners for every agent in the catalog
- **Agent export script**: `scripts/export-agents.sh` converts SKILL.md to Cursor rules, markdown, or bundle format
- **Worktree isolation**: `/team` teammates can use `isolation: "worktree"` for parallel file safety
- **Ambiguity scoring**: `/designer` tracks 4-dimension clarity score with readiness gate (< 20% to proceed)
- **Dynamic scaling**: `/team` lead can add/remove teammates mid-wave based on workload
- **Guard command pattern**: Controllers run automated guards (tests, lint) after reviewer PASS
- **When-stuck protocol**: `universal-self-correct` has 6-step recovery ladder for stuck agents
- **Anti-pattern enforcement**: `code-reviewer` scans for language-specific forbidden patterns with quality scoring
- **Crash recovery taxonomy**: 5 typed failure classes with specific recovery strategies in hooks + self-correct
- **Simplicity override**: `code-reviewer` enforces "equal results + less code = KEEP"
- **Skill chaining**: `/run --from-review` and `/run --from-designer` for output-to-input pipelines
- **Commit-before-verify**: Documented pattern for clean rollback on test failure

## Quick Reference

**Skills**: `/org`, `/run`, `/team`, `/designer`, `/review`, `/optimize`, `/helper`, `/context` (in `.claude/skills/`)
**Built-in**: `/memory`, `/init` (Claude Code native)
**Agents**: 243 total (17 core + 12 shared + 11 leadership + 203 domain specialists)
**Domains**: Engineering (31), Creative (30), Business (28), Growth (34), People (17), Service (28), Leadership (11), Core (17), Shared (12), Science (10), Health (5), Education (5), Personal (5), Arts (5), Trades (5)
**Key Files**: `CLAUDE.md`, `.claude/skills/*/SKILL.md`, `.claude/rules/*.md`, `{domain}/config/domain_overrides.yaml`, `Agent_Memory/_system/config/pipeline_config.yaml`, `.claude/skills/run/reference/session-schema.md` (session YAML contract for AgentPath)
**Hooks**: 19 event types (24 supported by Claude Code), 26 unique hooks across 27 registrations (30 .cjs files), invoked via `run-hook.cjs` launcher
**Models**: opusplan (controllers, Opus 4.6 + Sonnet 4.6), sonnet (execution, Sonnet 4.6), haiku (support, Haiku 4.5)
**Critical**: 100% task completion required, aggressive decomposition mandatory (tier 2+)
**Team Mode**: `/team` or `/run --team` for 40-60% faster tier 3+ via N-wave parallel execution (maximize waves)
**Pipeline**: Progressive pipeline (3 paths: minimal/medium/full) with 9-signal complexity scoring, revision routing (FAIL/REVISE), reviewer loops
**Tests**: `npm test` runs 816 Vitest tests (hooks + config validation)
**Version**: 10.26.30

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
