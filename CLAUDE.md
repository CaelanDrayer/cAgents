# CLAUDE.md

Core architecture and development guidance for cAgents.

## Table of Contents

- [Documentation Structure](#documentation-structure)
- [Version Management](#version-management)
- [Memory Management](#memory-management)
- [Project Overview](#project-overview)
- [CRITICAL: Aggressive Delegation](#critical-aggressive-delegation)
- [CRITICAL: Automatic Workflow Progression](#critical-automatic-workflow-progression)
- [Core Infrastructure](#core-infrastructure-tier-1-14-agents)
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
- `docs/` - Project documentation (17 files including ARCHITECTURE.md, SKILLS.md, TEAM_MODE.md, RELEASE_NOTES.md, etc.)
- `archive/docs/` - Historical documentation (local only)
- `Agent_Memory/` - Runtime state (excluded from git)
- `workflow_agent_interactions.md` - Agent interaction patterns (root-level exception)

## Version Management

**CRITICAL: Always bump version on commits.**

Increment version in both `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json`.

**Version Format**: `major.minor.patch` (e.g., 9.9.1)
- Bug fix/minor tweak: patch (9.13.0 -> 9.13.1)
- New feature/enhancement: minor (9.13.1 -> 9.14.0)
- Breaking change/major refactor: major (9.14.0 -> 10.0.0)

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
core/           # orchestration, controllers, execution, hooks, teams, etc. (9 files)
domains/        # engineering, creative, business, people, service (5 files)
infrastructure/ # model-routing (1 file)
memory/         # agent-memory (1 file)
quality/        # completion, validation-framework, implicit-discovery (3 files)
```

**Import Syntax**: Use `@path/to/file` to include external content. View loaded files: `/memory`

## Project Overview

**cAgents**: Universal multi-domain agent system with CSV-based task inventory for large-scale workflows. Handles 100+ tasks with 60-80% context savings.

**Key Features**: CSV Task Inventory, Batch Delegation (60-80% context reduction), Checkpoint/Resume, Aggressive Decomposition (30+ work items from simple requests), Controller-Centric coordination

**Architecture**: Controller-Centric Coordination with Task Inventory
- **Tier 1**: 15 core infrastructure agents (includes prompt-engineer)
- **Tier 2**: Controllers (coordinate via batch delegation)
- **Tier 3**: Execution agents (implement work items)
- **Tier 4**: Support agents (foundational services)
- **Total**: 207 agents across 8 business domains
- **Execution**: Event-driven pipeline with progressive paths (minimal/medium/full), revision routing, reviewer loops

**Business Domains** (8):
| Domain | Dir | Agents | Capability |
|--------|-----|--------|------------|
| **Engineering** | `engineering/` | 33 | Software engineering, infrastructure, security, QA, game programming |
| **Creative** | `creative/` | 24 | Creative writing, narrative design, game art, audio |
| **Business** | `business/` | 69 | Strategy, product, operations, finance, marketing, sales |
| **People** | `people/` | 19 | HR, talent acquisition, culture |
| **Service** | `service/` | 32 | Customer support, CX, legal, compliance, governance |
| **Leadership** | `leadership/` | 10 | C-suite executives (used by /org, not directly routable) |
| **Core** | `core/` | 15 | Infrastructure agents (trigger, orchestrator, planner, etc.) |
| **Shared** | `shared/` | 4 | Cross-domain intelligence (BI, data science, market research) |

**Config**: Each domain has `{domain}/config/domain_overrides.yaml` with controller_catalog and router keywords.

## CRITICAL: Aggressive Delegation

**Core Principle**: /run and all coordination agents NEVER do direct work. ALL work delegated to subagents via Task tool.

**Zero Tolerance**: `/run` is a pure delegation proxy. It MUST invoke the trigger agent for every request without exception. If delegation fails, `/run` reports the failure -- it does NOT fall back to handling the request directly. The user chose `/run` specifically for agent orchestration; bypassing that choice is a critical violation.

**Minimum Tier**: Always tier 2+ (controller coordination required). ALL requests use agents. NO exceptions. Former tier 0/1 automatically upgraded.

**Delegation Chain** (V9.23 event-driven pipeline):
```
/run (state machine loop -- level 0)
  +-> orchestrator (level 1)    -> enriched_context.yaml
  +-> planner (level 1)         -> plan.yaml
  +-> decomposer (level 1)      -> work_items.yaml
  +-> prompt-engineer (level 1)  -> delegation_prompts.yaml
  +-> controller (level 1)
       +-> executor (level 2)   -> implementation
       +-> reviewer (level 2)   -> review_report.yaml
  +-> validator (level 1)       -> validation_report.yaml (PASS/FAIL/REVISE)
```

V9.23: `/run` is now a config-driven state machine reading `pipeline_config.yaml`. Each enrichment agent runs sequentially at level 1. Controllers spawn executors and reviewers at level 2 with revision loops (max 3 internal rounds). The validator outputs PASS/FAIL/REVISE to drive revision routing (max 5 total cycles). A new `prompt-engineer` agent crafts optimized delegation prompts between decomposition and controller execution.

**Enrichment Agents** (level 1): orchestrator, planner, decomposer, prompt-engineer
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

## Core Infrastructure (Tier 1: 15 agents)

**Orchestration** (4): `trigger` (entry point), `orchestrator` (context enrichment), `hitl` (human escalation), `optimizer` (universal optimization)

**Team** (2): `team-trigger` (team init via TeamCreate), `team-lead-adapter` (controller team lead wrapper)

**Universal Workflow** (5): `universal-router` (tier 2-4 classification), `universal-planner` (decomposition + controller selection), `universal-executor` (monitor controllers), `universal-validator` (quality gates with PASS/FAIL/REVISE), `universal-self-correct` (adaptive recovery)

**Pipeline** (1): `prompt-engineer` (crafts optimized delegation prompts between decomposer and controller)

**Task Management** (3): `task-consolidator` (40-88% context reduction), `task-decomposer` (aggressive decomposition), `task-inventory` (CSV-based state, 60-80% savings)

**Config**: `{domain}/config/domain_overrides.yaml` (controller_catalog, router keywords)

## Aggressive Decomposition

Users state outcomes, not requirements. The planner unpacks everything needed.

**5 Steps**: Request Analysis -> Component Extraction (UNDERSTAND/DESIGN/BUILD/VERIFY/DOCUMENT) -> Implicit Discovery (security, testing, infrastructure) -> Dependency Mapping -> Work Item Generation (30+ items with acceptance criteria)

**Output** (`decomposition.yaml`): Work items with IDs, types, acceptance criteria, dependencies, plus dependency graph with critical path and parallel groups.

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
| **Business** | operations-manager, campaign-manager | + strategic-planner, marketing-strategist | cpo + cfo + strategic-planner |
| **People** | hr-manager | + talent-acquisition-manager | chro + hr-manager |
| **Service** | customer-success-manager, legal-counsel | + vp-customer-support, compliance-director | general-counsel + vp-customer-support |

**Discovery**: Planner loads `{domain}/config/domain_overrides.yaml` -> `controller_catalog` -> matches tier + domain

**Coordinating Phase** (between planning and executing):
1. Orchestrator spawns controller with plan.yaml + decomposition.yaml
2. Controller reviews decomposition, asks clarifying questions, coordinates work items
3. Execution agents implement, controller tracks completion and verifies acceptance criteria
4. Controller writes coordination_log.yaml; orchestrator detects completion

**Coordination Log** (`Agent_Memory/sessions/{session_id}/workflow/coordination_log.yaml`):
```yaml
controller: cagents:engineering-manager
objectives: [...]
questions_asked: [{question, delegated_to, answer}, ...]
synthesized_solution: {approach, rationale, implementation_steps, risks}
implementation_tasks: [{task_id, name, assigned_to, acceptance_criteria, status}, ...]
status: completed
```

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
  DECOMPOSED -> prompt-engineer -> delegation_prompts.yaml
  PROMPTS_READY -> controller -> coordination_log.yaml (with executor+reviewer loops)
  COORDINATED -> validator -> validation_report.yaml
  VALIDATED -> Complete
  FAIL -> back to PROMPTS_READY (re-run controller, max 5 cycles)
  REVISE -> back to PLANNED (re-plan, max 5 cycles)
```

**Subagent Architecture**: Agents delegate to specialists via Task tool. Pattern: "Use {subagent} to {task}". Up to 50 concurrent. See `workflow_agent_interactions.md`.

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

## Skills (Commands)

**V9.0+**: Skills in `.claude/skills/`, auto-discovered.

| Skill | Context | Agent | Description |
|-------|---------|-------|-------------|
| `/org` | `none` | `true` | Corporate hierarchy orchestration -- CEO inline + C-suite via Task + sequential /team per domain |
| `/run` | `none` | `true` | Event-driven pipeline engine -- state machine loop, sequential enrichment, controller+reviewer, revision routing |
| `/team` | `fork` | `true` | N-wave parallel team execution via built-in agent teams (maximize waves) |
| `/designer` | `none` | `false` | Interactive 6-phase design engine with subagent-delegated question preparation, inline controller pattern, defer-to-subagent, and endless refinement mode |
| `/review` | `fork` | `true` | Universal review with parallel agent execution |
| `/optimize` | `fork` | `true` | 5-phase optimization with atomic rollback |
| `/helper` | `none` | `false` | Interactive command guide |

**Built-in**: `/memory` (view/edit memory files), `/init` (bootstrap project CLAUDE.md)

### /org - Corporate Hierarchy Orchestration (V9.26, V9.30)
CEO inline logic (`context: none`) with dependency-ordered C-suite analysis via Task (Wave 1 independent agents in parallel, Wave 2 dependent agents reading peer analyses via file-based inline passes), two-phase deliberation (objection phase reads ALL peer analyses for cross-domain context), strategic brief, and sequential /team execution per domain via Skill. Runs inline (not forked) because subagents cannot spawn other subagents. 6-state pipeline: INIT -> ANALYZED -> DELIBERATED -> BRIEFED -> EXECUTED -> INTEGRATED -> COMPLETE.
```bash
/org Launch new product with campaign    # -> Full hierarchy (engineering + business + people)
/org Fix auth bug                        # -> Single /run with strategic brief
/org Restructure engineering team        # -> Full hierarchy (engineering + people)
/org Migrate to microservices --dry-run  # -> Preview routing decision
```
Skill: `.claude/skills/org/SKILL.md` + `reference/`

### /run - Event-Driven Pipeline Engine (V9.23, V9.27)
State machine loop reading pipeline_config.yaml. Sequential enrichment (orchestrator, planner, decomposer, prompt-engineer), nested execution (controller + executor + reviewer), revision routing (FAIL/REVISE). V9.27: Adaptive pipeline (tier 2 fast path skips 3 agents), domain/tier confirmation display, execution analytics (`--analytics`).
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

N-wave parallel team execution using Claude Code's built-in agent teams. Encourages maximum wave decomposition for better quality gating. More waves = more checkpoints = higher quality.

```
/team <request>
  Wave 0 (Lead): Enrichment + bootstrap
  Wave 1..N-1 (Teammates, per-wave spawn): Each wave spawns fresh teammates
    Wave 1: Research/analysis    Wave 2: Design/architecture
    Wave 3: Core implementation  Wave 4: Supporting features
    Wave 5: Testing/QA           Wave 6+: As needed
  Wave N (Lead): Integration + final validation
  GATE sentinels enforce wave ordering via TaskCreate dependencies
```

**CRITICAL**: /team MUST call TeamCreate AND spawn teammates via Task tool. Creating tasks without teammates is the primary failure mode.

**Wave Execution**: Teammates spawned per-wave, shut down after each wave. Lead validates GATE between waves. Prefer 5-7 waves over 2-3.

| Tier | Minimum waves | Typical waves |
|------|---------------|---------------|
| 2 | 3 | 3-4 |
| 3 | 5 | 5-7 |
| 4 | 6 | 6-10 |

**Display Modes** (`teammateMode` in settings.json): `auto` (default), `tmux` (split panes), `in-process` (main terminal)

**Use /team for**: Tier 3+ complex workflows, multiple parallelizable items, time-sensitive delivery.
**Use /run for**: Tier 2 simple coordination, sequential workflows, small changes.

**Fallback**: Unsuitable requests (<3 items or all sequential) auto-delegate to `/run`.

See `docs/TEAM_MODE.md` and `.claude/rules/core/teams.md` for full documentation.

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

**Session ID**: `{command}_{YYYYMMDD}_{HHMMSS}`

**Key Session Files**: `workflow/plan.yaml`, `workflow/coordination_log.yaml`, `workflow/execution_summary.yaml`

**Principles**: File-based, session-scoped, parallel-safe, pause/resume capable. See `docs/CONTEXT_MANAGEMENT.md`.

**Recursive Workflows**: Complex tasks spawn child workflows (max depth: 5, max children: 100). Each child follows objectives -> controller -> questions -> synthesis -> implementation.

## Creating Agents

See @.claude/rules/core/execution.md for execution agent guidelines.

1. Choose tier (controller or execution) and domain (engineering, creative, business, people, service)
2. Create `{domain}/agents/my-agent/SKILL.md` with YAML frontmatter (include `tier`, `domain`, `name`)
3. Add to `{domain}/.claude-plugin/plugin.json` and root `.claude-plugin/plugin.json`
4. Test: `claude --plugin-dir .` and `bash scripts/ci/validate-agents.sh`

**Controller frontmatter**: `tier: controller`, `coordination_style: question_based`, `typical_questions: [...]`
**Execution frontmatter**: `tier: execution`, `answers_questions: [...]`, `executes_tasks: [...]`

## Creating Domains

1. Create `{domain}/config/domain_overrides.yaml` with `controller_catalog` and `router.keywords`
2. Create controller + execution agents in `{domain}/agents/`
3. Create `{domain}/.claude-plugin/plugin.json`
4. Update root `.claude-plugin/plugin.json`

No code required -- universal agents load configs automatically.

## Directory Structure

```
cAgents/
+-- CLAUDE.md                # Main project memory (this file)
+-- .claude/
|   +-- skills/              # Skills (org, run, team, designer, review, optimize, helper)
|   +-- hooks/               # 18 .cjs files (15 hooks + utils + launcher + eval CLI)
|   +-- plans/               # Saved execution plans
|   +-- rules/               # Modular rules (20 files, 5 categories)
|   +-- settings.json        # Hook registration + permissions + env
+-- engineering/             # Engineering domain (33 agents, config, manifest)
+-- creative/                # Creative domain (24 agents)
+-- business/                # Business domain (69 agents)
+-- people/                  # People domain (19 agents)
+-- service/                 # Service domain (32 agents)
+-- leadership/              # Leadership domain (10 C-suite agents)
+-- core/                    # Core infrastructure (15 agents)
+-- shared/                  # Cross-domain specialists (4 agents)
+-- growth/                  # Growth (legacy, consolidated into business/)
+-- scripts/                 # Version sync, validation, CI scripts
+-- tests/                   # Vitest test suite (hooks + config)
+-- docs/                    # Project documentation
+-- .claude-plugin/          # Root manifest
+-- Agent_Memory/            # Runtime state (git-ignored)
```

## Hooks System

**Architecture**: CJS-only hooks with `createHook()` factory. Supports 4 handler types (command, http, prompt, agent). All invoked via `bash -c` wrapper with 3-tier fallback chain (`CLAUDE_PLUGIN_ROOT` -> `CLAUDE_PROJECT_DIR` -> `pwd`) for resilient path resolution. See @.claude/rules/core/hooks.md for full documentation.

**18 .cjs files**: `hook-utils.cjs` (factory), `run-hook.cjs` (launcher), `eval-runner.cjs` (CLI), + 15 registered hooks across 13 event types:

| Event Type | Hook(s) |
|------------|---------|
| `SessionStart` | `session-catchup.cjs` |
| `SessionEnd` | `team-stop.cjs` |
| `Stop` | `verify-completion.cjs` |
| `SubagentStart` | `subagent-tracker.cjs`, `team-start.cjs` |
| `SubagentStop` | `subagent-stop-tracker.cjs` |
| `PreToolUse[Bash]` | `bash-validator.cjs` |
| `PreToolUse[Write\|Edit]` | `secret-detection.cjs` |
| `PostToolUse[Write\|Edit]` | `post-write-validator.cjs` |
| `PostToolUseFailure` | `tool-failure-tracker.cjs` |
| `TeammateIdle` | `teammate-idle-handler.cjs` |
| `TaskCompleted` | `team-task-complete.cjs` |
| `PermissionRequest` | `permission-handler.cjs` |
| `PreCompact` | `pre-compact-save.cjs` |
| `Notification` | `notification.cjs` |

## Plugin Architecture

cAgents is distributed as a Claude Code plugin. See `.claude-plugin/plugin.json` for the root manifest.

**Plugin Structure**:
```
.claude-plugin/
├── plugin.json          # Root manifest (agents, skills, hooks, version)
└── marketplace.json     # Marketplace listing metadata
```

**Key Manifest Fields**:
- `agents`: Array of SKILL.md paths (207 agents registered)
- `skills`: Path to skills directory (`.claude/skills/`)
- `hooks`: Path to settings.json for hook registration
- `settings.json`: Default settings applied when plugin loads (under `agent` key for subagent defaults)

**Plugin Features** (Claude Code):
- **LSP Servers**: Plugins can provide language servers via `.lsp.json` for IDE-like features
- **Default Settings**: `settings.json` in plugin root applies defaults; `agent` key configures subagent behavior
- **Hook Registration**: Hooks declared in `hooks/hooks.json` or referenced via `hooks` field in plugin.json
- **Marketplace**: Submit via `marketplace.json` with `$schema`, owner, category, and version fields
- **Multi-Plugin**: Multiple plugins loaded via `--plugin-dir` flags; settings merge with project settings

**Domain Sub-Plugins**: Each domain has its own `{domain}/.claude-plugin/plugin.json` for modular loading.

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

**Skills**: `/org`, `/run`, `/team`, `/designer`, `/review`, `/optimize`, `/helper` (in `.claude/skills/`)
**Built-in**: `/memory`, `/init` (Claude Code native)
**Agents**: 206 total (15 core + 4 shared + 10 leadership + 177 domain specialists)
**Domains**: Engineering (33), Creative (24), Business (69), People (19), Service (32), Leadership (10), Core (15), Shared (4)
**Key Files**: `CLAUDE.md`, `.claude/skills/*/SKILL.md`, `.claude/rules/*.md`, `{domain}/config/domain_overrides.yaml`, `Agent_Memory/_system/config/pipeline_config.yaml`
**Hooks**: 13 event types (17 supported by Claude Code), 15 registered CJS hooks (18 .cjs files), invoked via `run-hook.cjs` launcher
**Models**: opusplan (controllers, Opus 4.6 + Sonnet 4.6), sonnet (execution, Sonnet 4.6), haiku (support, Haiku 4.5)
**Critical**: 100% task completion required, aggressive decomposition mandatory (tier 2+)
**Team Mode**: `/team` or `/run --team` for 40-60% faster tier 3+ via N-wave parallel execution (maximize waves)
**Pipeline**: Progressive pipeline (3 paths: minimal/medium/full) with 9-signal complexity scoring, revision routing (FAIL/REVISE), reviewer loops
**Tests**: `npm test` runs 265 Vitest tests (hooks + config validation)
**Version**: 10.2.3

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Wrong domain detected | Use explicit domain keywords |
| No controller selected | Check planner_config.yaml has controller_catalog |
| coordination_log missing | Check controller completed coordinating phase |
| Agent not found | Check agent has tier field in frontmatter |
| Workflow stuck in coordinating | Check controller is asking questions and synthesizing |
| Memory not loading | Run `/memory` to view loaded files |
| Team not spawning | Ensure `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json, verify work items >= 3 |
| Teammates not appearing | Use Shift+Down to cycle, check task complexity |
| tmux panes not showing | Install tmux, set `teammateMode: "tmux"`, use supported terminal |
| Orphaned team resources | TeamDelete or remove `~/.claude/teams/{name}/` and `~/.claude/tasks/{name}/` |
| Hook not running | Check `.claude/settings.json` registration, verify `node` in PATH |
| Hook blocks unexpectedly | Test: `echo '{}' \| node .claude/hooks/<name>.cjs` |

See `docs/WORKFLOW_EVALUATION_FIXES.md` for recent workflow issue resolutions.
