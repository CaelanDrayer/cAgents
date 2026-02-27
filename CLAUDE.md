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

**Claude Code Memory Hierarchy**: 5-tier system. See @.claude/rules/memory/agent-memory.md for full details.

| Memory Type | Location | Shared With |
|-------------|----------|-------------|
| **Enterprise** | System paths | All users |
| **Project** | `./CLAUDE.md` | Team via git |
| **Project Rules** | `./.claude/rules/*.md` | Team via git |
| **User** | `~/.claude/CLAUDE.md` | Just you |
| **Project Local** | `./CLAUDE.local.md` | Just you |

**Loading Order**: Enterprise -> User -> Project -> Project Rules -> Project Local (later = higher priority)

**Rules Structure** (`.claude/rules/`):
```
core/           # orchestration, controllers, execution, hooks, teams, etc. (9 files)
domains/        # engineering, grow, operate, people, serve (5 files)
infrastructure/ # model-routing (1 file)
memory/         # agent-memory (1 file)
quality/        # completion, validation-framework, implicit-discovery (3 files)
```

**Import Syntax**: Use `@path/to/file` to include external content. View loaded files: `/memory`

## Project Overview

**cAgents**: Universal multi-domain agent system with CSV-based task inventory for large-scale workflows. Handles 100+ tasks with 60-80% context savings.

**Key Features**: CSV Task Inventory, Batch Delegation (60-80% context reduction), Checkpoint/Resume, Aggressive Decomposition (30+ work items from simple requests), Controller-Centric coordination

**Architecture**: Controller-Centric Coordination with Task Inventory
- **Tier 1**: 14 core infrastructure agents
- **Tier 2**: Controllers (~53 agents, coordinate via batch delegation)
- **Tier 3**: Execution agents (~149 agents, implement work items)
- **Tier 4**: Support agents (~19 agents, foundational services)
- **Total**: 238 agents across 5 super-domains
- **Execution**: 4 modes (Sequential, Pipeline, Swarm, Mesh) - up to 50x speedup

**Super-Domains** (5):
| Domain | Agents | Capability |
|--------|--------|------------|
| **Make** | 111 | Creation (engineering, creative, product, game dev -- includes 28 game dev agents) |
| **Grow** | 38 | Acquisition (marketing, sales) |
| **Operate** | 13 | Operations (finance, operations) |
| **People** | 20 | Talent (HR, culture) |
| **Serve** | 28 | Support & governance (CX, legal, compliance) |

Plus 14 core infrastructure + 14 shared cross-domain agents.

## CRITICAL: Aggressive Delegation

**Core Principle**: /run and all coordination agents NEVER do direct work. ALL work delegated to subagents via Task tool.

**Zero Tolerance**: `/run` is a pure delegation proxy. It MUST invoke the trigger agent for every request without exception. If delegation fails, `/run` reports the failure -- it does NOT fall back to handling the request directly. The user chose `/run` specifically for agent orchestration; bypassing that choice is a critical violation.

**Minimum Tier**: Always tier 2+ (controller coordination required). ALL requests use agents. NO exceptions. Former tier 0/1 automatically upgraded.

**Delegation Chain** (flattened V9.18 -- 2 levels instead of 5):
```
/run (inline: routing + planning + orchestration) -> controller -> execution_agents
                                                       |              |
                                                   (questions)    (actual work)
```

Previous 5-level chain (`/run -> trigger -> orchestrator -> controller -> execution`) was replaced because deep nesting caused systematic failures (Task tool unavailability, context exhaustion, empty session directories).

**Coordination Agents** (ONLY coordinate): controllers (engineering-manager, architect, etc.)
**Execution Agents** (DO the work): backend-developer, frontend-developer, copywriter, qa-tester, etc.
**Inline in /run**: routing, planning, orchestration, validation (previously trigger, orchestrator, universal-router, universal-planner)

**Why Minimum Tier 2**: Even "simple" questions get comprehensive expert answers. Even "trivial" edits get specialist + review. Multi-agent coverage catches issues single-agent misses.

**Why Flattened**: The 5-level delegation chain caused Task tool unavailability at deep nesting levels, context exhaustion before reaching execution agents, and sessions ending with empty workflow directories. The 2-level chain keeps routing/planning in-context and delegates only coordination (which requires domain expertise) and execution (which requires specialist skills).

## CRITICAL: Automatic Workflow Progression

Workflows proceed automatically through phases WITHOUT asking permission. See `docs/AUTOMATIC_WORKFLOW_PROGRESSION.md`.

**AUTO-PROCEED** (Never Ask): All phase transitions, plan.yaml -> coordinating, coordination_log complete -> executing, implementation complete -> validating, validation PASS -> complete

**ASK USER** (Only): Tier 4 HITL gates, unrecoverable errors, ambiguous requirements, validation BLOCKED

**If requirements are clear, PROCEED. Do not ask.**

## Core Infrastructure (Tier 1: 14 agents)

**Orchestration** (4): `trigger` (entry point), `orchestrator` (phase conductor), `hitl` (human escalation), `optimizer` (universal optimization)

**Team** (2): `team-trigger` (team init via TeamCreate), `team-lead-adapter` (controller team lead wrapper)

**Universal Workflow** (5): `universal-router` (tier 2-4 classification), `universal-planner` (decomposition + controller selection), `universal-executor` (monitor controllers), `universal-validator` (quality gates), `universal-self-correct` (adaptive recovery)

**Task Management** (3): `task-consolidator` (40-88% context reduction), `task-decomposer` (aggressive decomposition), `task-inventory` (CSV-based state, 60-80% savings)

**Config**: `{domain}/config/*.yaml` (planner_config.yaml, router_config.yaml, etc.)

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

**Controllers by Super-Domain**:
| Domain | Tier 2 | Tier 3 | Tier 4 |
|--------|--------|--------|--------|
| **Make** | engineering-manager, architect, creative-director | + security-specialist | cto + architect |
| **Grow** | campaign-manager, sales-strategist | + content-strategist | cro + marketing-strategist |
| **Operate** | operations-manager, finance-manager | + compliance-officer | cfo + coo |
| **People** | hr-manager, talent-acquisition | + culture-champion | chro + ceo |
| **Serve** | customer-success-manager, legal-counsel | + compliance-director | general-counsel |

**Discovery**: Planner loads `planner_config.yaml` -> `controller_catalog` -> matches tier + super-domain

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
User Request -> /run (inline routing + planning + orchestration)
  Routing: Domain detection, tier classification (inline)
  Planning: Objectives, controller selection, work items (inline)
  Coordinating -> Controller via Task tool (question-based delegation, synthesis)
    Execution -> Execution agents via controller's Task tool (actual work)
  Validating: Check coordination_log.yaml, verify outputs (inline)
  PASS -> Complete | FIXABLE -> Report issues | BLOCKED -> Suggest --resume
```

**Subagent Architecture**: Agents delegate to specialists via Task tool. Pattern: "Use {subagent} to {task}". Up to 50 concurrent. See `workflow_agent_interactions.md`.

## Task Completion Protocol

**MANDATORY**: 100% completion with verified evidence. See @.claude/rules/quality/completion.md.

**Enforced by**: Controllers (acceptance criteria), universal-executor (coordination_log), universal-validator (quality gates), orchestrator (phase validation)

**Evidence must be specific**: File paths, test results, metrics. No "probably works" or "mostly done".

## Skills (Commands)

**V9.0+**: Skills in `.claude/skills/`, auto-discovered.

| Skill | Context | Agent | Description |
|-------|---------|-------|-------------|
| `/run` | `fork` | `true` | Universal workflow engine -- routes/plans inline, delegates to controller |
| `/team` | `fork` | `true` | Parallel team execution via built-in agent teams |
| `/designer` | `none` | `false` | Interactive 4-phase design engine (Discovery -> Specification) |
| `/review` | `fork` | `true` | Universal review with parallel agent execution |
| `/optimize` | `fork` | `true` | 5-phase optimization with atomic rollback |
| `/helper` | `none` | `false` | Interactive command guide |

**Built-in**: `/memory` (view/edit memory files), `/init` (bootstrap project CLAUDE.md)

### /run - Universal Entry Point (Flattened V9.18)
Routes and plans inline, delegates coordination to controllers. 2-level chain replaces previous 5-level chain.
```bash
/run Fix auth bug              # -> Make (tier 2: engineering-manager)
/run Write fantasy story       # -> Make (tier 2: creative-director)
/run Plan Q4 campaign          # -> Grow (tier 3: marketing-strategist)
/run Design game mechanics     # -> Make (tier 2: game-designer)
```
Skill: `.claude/skills/run/SKILL.md` + `reference/`

### /team - Parallel Team Execution (V9.9)
Three-phase pipeline: **Route & Plan (via /run) -> Determine Team Structure -> Spin Out**. Each teammate runs `/run` for its work item. 40-60% execution time reduction for tier 3+.
```bash
/team Implement OAuth2 authentication    # Full team execution
/team Build user dashboard --dry-run     # Preview team composition
/run Build feature --team                # Team mode via flag
```
Config: `settings.json` (`teammateMode`: auto/tmux/in-process). See `docs/TEAM_MODE.md`.

### /designer, /review, /optimize, /helper
Each skill has `SKILL.md` + `reference/` directory with detailed docs. Use `/helper` for guidance.

## Team Mode

Parallel team-based execution using Claude Code's built-in agent teams. Decomposes request into work items, creates team via TeamCreate, spawns teammates who each invoke /run.

```
/team <request>
  Step 1: Parse request
  Step 2: Decompose into 3-8 work items (done directly by /team)
  Step 3: TeamCreate (creates team + enables tmux panes)
  Step 4: TaskCreate for all work items
  Step 5: Wave 0 (bootstrap) via /run (team lead)
  Step 6: Spawn teammates via Task tool (parallel -- each in own tmux pane)
  Step 7: Monitor, then Wave 2 (integration), then cleanup
```

**CRITICAL**: /team MUST call TeamCreate AND spawn teammates via Task tool. Creating tasks without teammates is the primary failure mode.

**Wave Execution**: bootstrap (sequential, team lead) -> parallel (teammates) -> integration (sequential, team lead). Gate sentinels enforce ordering via TaskCreate dependencies.

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
+-- sessions/      # run_*, team_*, designer_*, review_*, optimize_*
```

**Session ID**: `{command}_{YYYYMMDD}_{HHMMSS}`

**Key Session Files**: `workflow/plan.yaml`, `workflow/coordination_log.yaml`, `workflow/execution_summary.yaml`

**Principles**: File-based, session-scoped, parallel-safe, pause/resume capable. See `docs/CONTEXT_MANAGEMENT.md`.

**Recursive Workflows**: Complex tasks spawn child workflows (max depth: 5, max children: 100). Each child follows objectives -> controller -> questions -> synthesis -> implementation.

## Creating Agents

See @.claude/rules/core/execution.md for execution agent guidelines.

1. Choose tier (controller or execution) and domain
2. Create `{domain}/agents/my-agent.md` with YAML frontmatter (include `tier`, `domain`, `name`)
3. Add to `{domain}/.claude-plugin/plugin.json`
4. Test: `claude --plugin-dir .`

**Controller frontmatter**: `tier: controller`, `coordination_style: question_based`, `typical_questions: [...]`
**Execution frontmatter**: `tier: execution`, `answers_questions: [...]`, `executes_tasks: [...]`

## Creating Domains

1. Create `{domain}/config/planner_config.yaml` with `controller_catalog`
2. Create controller + execution agents in `{domain}/agents/`
3. Create `{domain}/.claude-plugin/plugin.json`
4. Update root `.claude-plugin/plugin.json`

No code required -- universal agents load configs automatically.

## Directory Structure

```
cAgents/
+-- CLAUDE.md                # Main project memory (this file)
+-- .claude/
|   +-- skills/              # Skills (run, team, designer, review, optimize, helper)
|   +-- hooks/               # 17 .cjs files (14 hooks + utils + launcher + eval CLI)
|   +-- plans/               # Saved execution plans
|   +-- rules/               # Modular rules (20 files, 5 categories)
|   +-- settings.json        # Hook registration + permissions + env
|   +-- settings.full.json   # Full config with prompt hooks (reference)
+-- core/                    # Core infrastructure (14 agents + _templates)
+-- shared/                  # Cross-domain capabilities (14 agents + resources)
+-- make/                    # MAKE super-domain (111 agents, configs, manifest)
+-- grow/                    # GROW (38 agents)
+-- operate/                 # OPERATE (13 agents)
+-- people/                  # PEOPLE (20 agents)
+-- serve/                   # SERVE (28 agents)
+-- scripts/                 # Version sync, validation, CI scripts
+-- docs/                    # Project documentation (17 files)
+-- .claude-plugin/          # Root manifest
+-- Agent_Memory/            # Runtime state (git-ignored)
```

## Hooks System

**Architecture**: CJS-only hooks with `createHook()` factory. All invoked via `bash -c` wrapper with 3-tier fallback chain (`CLAUDE_PLUGIN_ROOT` -> `CLAUDE_PROJECT_DIR` -> `pwd`) for resilient path resolution. See @.claude/rules/core/hooks.md for full documentation.

**17 .cjs files**: `hook-utils.cjs` (factory), `run-hook.cjs` (launcher), `eval-runner.cjs` (CLI), + 14 registered hooks across 12 event types:

| Event Type | Hook(s) |
|------------|---------|
| `SessionStart` | `session-catchup.cjs` |
| `SessionEnd` | `team-stop.cjs` |
| `Stop` | `verify-completion.cjs` |
| `SubagentStart` | `subagent-tracker.cjs`, `team-start.cjs` |
| `SubagentStop` | `subagent-stop-tracker.cjs` |
| `PreToolUse[Bash]` | `bash-validator.cjs` |
| `PreToolUse[Write\|Edit]` | `secret-detection.cjs` |
| `PostToolUseFailure` | `tool-failure-tracker.cjs` |
| `TeammateIdle` | `teammate-idle-handler.cjs` |
| `TaskCompleted` | `team-task-complete.cjs` |
| `PermissionRequest` | `permission-handler.cjs` |
| `PreCompact` | `pre-compact-save.cjs` |
| `Notification` | `notification.cjs` |

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

**Skills**: `/run`, `/team`, `/designer`, `/review`, `/optimize`, `/helper` (in `.claude/skills/`)
**Built-in**: `/memory`, `/init` (Claude Code native)
**Agents**: 238 total (14 core + 14 shared + 210 domain specialists)
**Super-Domains**: Make (111), Grow (38), Operate (13), People (20), Serve (28)
**Key Files**: `CLAUDE.md`, `.claude/skills/*/SKILL.md`, `.claude/rules/*.md`, `{domain}/config/*.yaml`
**Hooks**: 12 event types, 14 CJS hooks, invoked via `run-hook.cjs` launcher
**Models**: opusplan (controllers, Opus 4.6 + Sonnet 4.6), sonnet (execution, Sonnet 4.6), haiku (support, Haiku 4.5)
**Critical**: 100% task completion required, aggressive decomposition mandatory (tier 2+)
**Team Mode**: `/team` or `/run --team` for 40-60% faster tier 3+ via built-in agent teams
**Version**: 9.19.1

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
