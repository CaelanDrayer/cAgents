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
- [Coordinating Phase](#coordinating-phase)
- [Complexity Tiers](#complexity-tiers)
- [Workflow Execution](#workflow-execution)
- [Task Completion Protocol](#task-completion-protocol)
- [Skills (Commands)](#skills-commands)
- [Team Mode](#team-mode)
- [Agent Memory](#agent-memory)
- [Recursive Workflows](#recursive-workflows)
- [Creating Agents](#creating-agents)
- [Creating Domains](#creating-domains)
- [Directory Structure](#directory-structure)
- [Performance Benchmarks](#performance-benchmarks)
- [Quick Reference](#quick-reference)
- [Troubleshooting](#troubleshooting)

## Documentation Structure

- `CLAUDE.md` - Architecture, commands, agents (this file)
- `README.md` - Quick start
- `docs/` - Project documentation (implementation guides, summaries, standards)
- `archive/docs/` - Historical documentation (local only)
- `Agent_Memory/` - Runtime state (excluded from git)

**Project Documentation** (in `docs/`):
- `ARCHITECTURE.md` - Architecture design
- `AUTOMATIC_WORKFLOW_PROGRESSION.md` - Automatic phase transition policy (CRITICAL)
- `SKILLS.md` - Skills (commands) reference
- `CONTEXT_MANAGEMENT.md` - Context handling and token management
- `DOCUMENTATION_STANDARDS.md` - Documentation best practices
- `DOMAIN_STRUCTURE_STANDARD.md` - Domain organization standard
- `GETTING_STARTED.md` - Getting started guide
- `OPTIMIZATION_PROGRESS.md` - Optimization tracking and progress
- `RELEASE_NOTES.md` - Release history
- `TEAM_MODE.md` - Parallel team execution via built-in agent teams (V9.2)

**Root Documentation** (exceptions):
- `workflow_agent_interactions.md` - Agent interaction patterns (referenced throughout)

## Version Management

**CRITICAL: Always bump version on commits.**

When committing changes to this repository, you MUST increment the version in:
- `.claude-plugin/marketplace.json`
- `.claude-plugin/plugin.json`

**Version Format**: `major.minor.patch` (e.g., 8.0.18)

| Change Type | Bump | Example |
|-------------|------|---------|
| Bug fix, minor tweak | patch | 8.0.16 -> 8.0.17 |
| New feature, enhancement | minor | 8.0.17 -> 8.1.1 |
| Breaking change, major refactor | major | 8.1.1 -> 9.0.0 |

**Commit checklist**:
1. Make your changes
2. Increment version in both JSON files
3. `git add -A`
4. `git commit -m "feat/fix/chore: description"`
5. `git push origin main`

## Memory Management

**Claude Code Memory Hierarchy**: cAgents leverages Claude Code's 5-tier memory system.

**Full Details**: See @.claude/rules/memory/agent-memory.md for comprehensive memory organization.

### Memory Types

| Memory Type | Location | Purpose | Shared With |
|-------------|----------|---------|-------------|
| **Enterprise** | System paths (macOS/Linux/Windows) | Organization-wide standards | All users |
| **Project** | `./CLAUDE.md` | Team-shared instructions | Team via git |
| **Project Rules** | `./.claude/rules/*.md` | Modular topic-specific rules | Team via git |
| **User** | `~/.claude/CLAUDE.md` | Personal preferences (all projects) | Just you |
| **Project Local** | `./CLAUDE.local.md` | Personal project preferences | Just you |

**Loading Order**: Enterprise -> User -> Project -> Project Rules -> Project Local (later = higher priority)

### Project Rules Structure

**Modular Rules** (`.claude/rules/`): Organize instructions into focused topic files.

```
.claude/rules/
├── core/           # orchestration.md, controllers.md, execution.md, + 5 more
├── domains/        # engineering.md, grow.md, operate.md, people.md, serve.md
├── infrastructure/ # model-routing.md
├── memory/         # agent-memory.md
└── quality/        # completion.md, validation-framework.md, implicit-discovery.md
```

**Path-Specific Rules**: Rules can apply conditionally using YAML frontmatter with `paths:` field.

**Glob Patterns**: `**/*.md`, `core/**/*`, `*.{ts,js}`, `{core,shared}/agents/*.md`

### Memory Import Syntax

Use `@path/to/file` syntax to include external content:
- Supports relative and absolute paths
- Home directory imports: `@~/.claude/file.md`
- Recursive imports (max depth: 5)
- Not evaluated in code spans/blocks
- View loaded files: `/memory` command

### Memory Best Practices

1. **Be Specific**: "Use 2-space indentation for TypeScript" not "Format code properly"
2. **Use Structure**: Bullets under descriptive headings, group logically
3. **Choose Right Location**: Enterprise (company), Project (team), User (personal), Local (project-specific personal)
4. **Modular Organization**: Split large files into focused rule files
5. **Memory for cAgents**: Document commands, patterns, Agent_Memory/ structure, completion protocol

### cAgents Memory Strategy

- Main project memory: `./CLAUDE.md` (this file)
- Modular rules: `.claude/rules/` (20 files across 5 categories)
- Agent patterns: `workflow_agent_interactions.md` (root-level exception)
- Domain configs: `{domain}/config/*.yaml`
- Runtime state: `Agent_Memory/` (git-ignored)

## Project Overview

**cAgents**: Universal multi-domain agent system with CSV-based task inventory for large-scale workflows. Handles 100+ tasks with 60-80% context savings.

**Key Features**:
- **CSV Task Inventory**: External state management for 20+ task workflows
- **Batch Delegation**: 60-80% context reduction through batch operations
- **Checkpoint/Resume**: Full pause/resume capability at any point
- **Progress Queries**: 500-token summaries instead of 10K+ task loads
- **Aggressive Decomposition**: User says "add auth" -> system generates 30+ work items
- **Controller-Centric**: Controllers coordinate via batch inventory operations

**Architecture**: Controller-Centric Coordination with Task Inventory
- **Tier 1**: 14 core infrastructure agents (trigger, team-trigger, team-lead-adapter, orchestrator, hitl, optimizer, task-consolidator, task-decomposer, task-inventory, 5 universal workflow agents)
- **Tier 2**: Controllers (coordinate work items via batch delegation)
- **Tier 3**: Execution agents (implement work items)
- **Tier 4**: Support agents (foundational services)
- **Total**: 236 agents
- **Execution**: 4 modes (Sequential, Pipeline, Swarm, Mesh) - up to 50x speedup

**Agent Distribution**:
- **Core Infrastructure** (14): Workflow orchestration + decomposition + inventory + team coordination
- **Shared** (14): Cross-domain capabilities (leadership, planning, data, quality)
- **Make** (109): Creation capability (engineering, creative, product, game development)
- **Grow** (38): Acquisition capability (marketing, sales)
- **Operate** (13): Operations capability (finance, operations)
- **People** (20): Talent capability (HR, culture)
- **Serve** (28): Support & governance (customer experience, legal, compliance)

**Super-Domains** (5 domains):
- **Make**: Creation (engineering + creative + product + game development)
- **Grow**: Acquisition (marketing + sales)
- **Operate**: Operations (finance + operations)
- **People**: Talent (HR + culture)
- **Serve**: Support & Governance (customer experience + legal + compliance)

**Game Development Agents** (28):
- **Core Development** (8): game-designer, level-designer, game-programmer, engine-developer, graphics-programmer, ai-programmer, network-programmer, tools-programmer
- **Art & Animation** (6): concept-artist, 3d-modeler, texture-artist, animator, vfx-artist, ui-artist
- **Audio** (3): sound-designer, music-composer, audio-programmer
- **Design & Writing** (4): narrative-game-designer, quest-designer, economy-designer, game-writer
- **Production & QA** (4): game-producer, technical-artist, qa-tester-games, localization-lead
- **Specialized** (3): monetization-designer, live-ops-specialist, accessibility-game-designer

## CRITICAL: Aggressive Delegation

**Core Principle**: /run command and all coordination agents NEVER do direct work. ALL work is delegated to subagents via Task tool.

**Minimum Tier**: Always tier 2+ (controller coordination required). ALL requests use agents. NO exceptions.

**Tier Enforcement**: Former tier 0/1 requests automatically upgraded to tier 2 for multi-agent specialist coverage.

**Delegation Chain** (every arrow = Task tool):
```
/run -> trigger -> orchestrator -> controller -> execution_agents
         |           |              |              |
      (detect)   (phases)      (questions)    (actual work)
```

**Coordination Agents** (ONLY coordinate, never implement):
- trigger, orchestrator, universal-executor - Phase management only
- All controllers (engineering-manager, etc.) - Ask questions, synthesize answers, delegate tasks

**Execution Agents** (DO the actual work):
- backend-developer, frontend-developer, copywriter, qa-tester, etc.
- Only tier 3 agents can use Edit/Write for implementation

**Progress Reporting**: Coordinators report SUMMARIES only:
```
Delegated: Fix auth bug -> engineering-manager
  -> backend-developer: Analyzed code (3 issues found)
  -> qa-tester: Created regression tests (5 tests)
  -> architect: Reviewed design (approved)
Complete: outputs/fix_summary.yaml
```

**Why Minimum Tier 2?**
- Even "simple" questions get comprehensive expert answers (not just quick responses)
- Even "trivial" edits benefit from quality review (catch issues early)
- Multi-agent coverage catches issues single-agent execution misses
- Consistent quality across all request types
- Maximum utilization of specialist agent expertise

**Tier Upgrade Examples**:
- **"What is X?"** → Tier 2 → Domain expert provides comprehensive answer via controller
- **"Fix typo"** → Tier 2 → Specialist + editor review for quality
- **"Improve wording"** → Tier 2 → Copywriter + editor coordination

**Config**: `Agent_Memory/_system/config/aggressive_delegation.yaml`

## CRITICAL: Automatic Workflow Progression

**Core Principle**: Workflows proceed automatically through phases (routing -> planning -> coordinating -> executing -> validating) WITHOUT asking permission. See `docs/AUTOMATIC_WORKFLOW_PROGRESSION.md` for full policy.

**AUTO-PROCEED** (Never Ask):
- Phase transitions when complete
- plan.yaml created -> coordinating
- coordination_log.yaml complete -> executing
- Implementation complete -> validating
- Validation PASS -> complete

**ASK USER** (Only):
- Tier 4 HITL gates (in plan.yaml)
- Unrecoverable errors/blockers
- Ambiguous requirements
- Validation BLOCKED (not FIXABLE)

**Agent Rules**: Orchestrator auto-transitions phases. Controllers signal completion via coordination_log.yaml. Planner/Executor/Validator report status, don't ask permission.

**If requirements are clear, PROCEED. Do not ask.**

## Core Infrastructure (Tier 1: 14 agents)

**Orchestration Agents** (4):
- `trigger` - Entry point, domain detection, routing
- `orchestrator` - Phase conductor (routing -> planning -> **coordinating** -> executing -> validating)
- `hitl` - Human escalation for tier-4 decisions
- `optimizer` - Universal optimization (code, content, processes, data, infrastructure, campaigns)

**Team Agents** (2) - V9.1:
- `team-trigger` - Team initialization via built-in agent teams (TeamCreate), parallelism analysis
- `team-lead-adapter` - Wraps controllers for team lead mode (delegate only, uses SendMessage/TaskList)

**Universal Workflow Agents** (5):
- `universal-router` - Tier classification (2-4), ALWAYS requires controllers
- `universal-planner` - Aggressive decomposition + controller selection (generates comprehensive work breakdowns)
- `universal-executor` - Monitors controllers (not execution agents)
- `universal-validator` - Quality gates with coordination validation
- `universal-self-correct` - Adaptive recovery with coordination corrections

**Task Management** (3):
- `task-consolidator` - Task consolidation for 40-88% context reduction
- `task-decomposer` - Aggressive task decomposition (extrapolates all requirements from user requests)
- `task-inventory` - CSV-based state management (60-80% context savings for large workflows)

**Config Location**: `{domain}/config/*.yaml` (planner_config.yaml, router_config.yaml, etc.)

## Aggressive Decomposition

When users say "I want X", the system autonomously figures out everything needed to produce X.

**Philosophy**: Users state outcomes, not requirements. The planner's job is to unpack what they actually need.

### The 5 Decomposition Steps

```
User Request: "Add authentication to my app"
         |
Step 1: Request Analysis -> Type: feature, Action: add, Subject: authentication
         |
Step 2: Component Extraction
         -> UNDERSTAND (5 items): analyze existing code, review constraints
         -> DESIGN (4 items): architecture, security, API contracts
         -> BUILD (12 items): backend, frontend, database
         -> VERIFY (8 items): unit tests, integration tests, security tests
         -> DOCUMENT (4 items): API docs, user guides, developer docs
         |
Step 3: Implicit Discovery -> Security (CSRF, rate limiting), Testing (penetration tests), Infrastructure (migrations)
         |
Step 4: Dependency Mapping -> Critical path, parallel groups
         |
Step 5: Work Item Generation -> 33 work items with acceptance criteria
```

### Decomposition Output

**decomposition.yaml** (written by planner):
```yaml
work_items:
  - id: WI-001
    name: "Analyze existing auth implementation"
    type: understand
    acceptance_criteria: ["Existing auth documented", "Gap analysis completed"]
    dependencies: []

dependency_graph:
  critical_path: [WI-001, WI-002, WI-003, WI-007, WI-012, WI-016]
  parallel_groups: [[WI-003, WI-004], [WI-008, WI-009]]
```

### Integration with Controllers

Controllers receive the full decomposition and coordinate execution:
1. **Review decomposition** - Understand work items and dependencies
2. **Ask clarifying questions** - For ambiguous items only
3. **Coordinate work items** - Assign to execution agents respecting dependencies
4. **Track completion** - Verify acceptance criteria met

## Controller-Centric Architecture

Controllers are the coordination hub between planning and execution.

**Detailed Guidelines**: See @.claude/rules/core/controllers.md for question-based delegation patterns.

### Controller-Centric Pattern

```
Planner -> Objectives -> Controller -> Questions -> Execution Agents -> Answers -> Controller -> Synthesized Solution -> Implementation
```

**Core Concept**: Controllers use domain expertise to break down objectives into specific questions, delegate to specialists, synthesize answers, and coordinate implementation.

### Question-Based Delegation

1. **Planner defines objectives** (high-level goals)
2. **Planner selects controller** (e.g., engineering-manager)
3. **Controller breaks into questions** (specific, answerable queries)
4. **Controller delegates questions** to execution agents
5. **Execution agents answer** with expertise
6. **Controller synthesizes answers** into coherent solution
7. **Controller coordinates implementation**
8. **Executor monitors controller** via coordination_log.yaml

**Key Principles**:
- **Controllers ask, not assign**: "What is current auth?" not "Analyze auth"
- **Execution agents answer**: Specialists provide expert answers
- **Synthesis drives implementation**: Controllers combine answers into plan
- **Adaptive coordination**: Follow-up questions based on answers

### Agent Tiers

| Tier | Role | Count | Purpose | Examples |
|------|------|-------|---------|----------|
| **1: Core** | Infrastructure | 14 | Workflow orchestration | orchestrator, planner, executor, validator |
| **2: Controller** | Coordination | ~53 | Question-based delegation | engineering-manager, architect, cto, campaign-manager |
| **3: Execution** | Specialists | ~147 | Answer questions and execute | backend-developer, copywriter, financial-analyst |
| **4: Support** | Operations | ~19 | Foundational services | scribe, data-extractor |

### Controller Selection

**Controllers by Super-Domain**:

| Domain | Tier 2 | Tier 3 | Tier 4 |
|--------|--------|--------|--------|
| **Make** | engineering-manager, architect, creative-director | + security-specialist | cto + architect |
| **Grow** | campaign-manager, sales-strategist | + content-strategist | cro + marketing-strategist |
| **Operate** | operations-manager, finance-manager | + compliance-officer | cfo + coo |
| **People** | hr-manager, talent-acquisition | + culture-champion | chro + ceo |
| **Serve** | customer-success-manager, legal-counsel | + compliance-director | general-counsel |

**Discovery**: Planner loads `planner_config.yaml` -> `controller_catalog` section -> matches tier + super-domain

## Coordinating Phase

**CRITICAL**: Coordinating phase sits between planning and executing.

**Workflow Patterns**: See @.claude/rules/core/orchestration.md for detailed phase documentation.

### Workflow Phases

```
routing -> planning -> coordinating -> executing -> validating
   |          |           |            |           |
  Router   Planner   Controller   Executor   Validator
(tier 2-4) (objectives) (questions) (monitor) (quality)
```

### Coordinating Phase Workflow

1. **Orchestrator spawns controller** with plan.yaml + decomposition.yaml context
2. **Controller reviews decomposition** - understands work items, dependencies, acceptance criteria
3. **Controller asks clarifying questions** - only for ambiguous items
4. **Controller coordinates work items** - assigns to execution agents respecting dependencies
5. **Execution agents implement** work items
6. **Controller tracks completion** - verifies acceptance criteria
7. **Controller writes coordination_log.yaml**
8. **Orchestrator detects completion** when coordination_log.yaml has `status: completed`

**Key File**: `Agent_Memory/sessions/{session_id}/workflow/coordination_log.yaml`

### Coordination Log Structure

```yaml
controller: make:engineering-manager
objectives: [...]
questions_asked: [{question, delegated_to, answer}, ...]
synthesized_solution: {approach, rationale, implementation_steps, risks}
implementation_tasks: [{task_id, name, assigned_to, acceptance_criteria, status}, ...]
status: completed
```

## Complexity Tiers

| Tier | Type | Coordination | Example | Workflow |
|------|------|--------------|---------|----------|
| **2** | Moderate | 1 controller | "Fix bug", "Answer question", "Fix typo" | routing -> planning -> **coordinating** -> executing -> validating |
| **3** | Complex | 1 primary + 1-2 supporting | "Add feature" | routing -> planning -> **coordinating** -> executing -> validating |
| **4** | Expert | 1 executive + 1 primary + 2-4 supporting | "Major refactor" | routing -> planning -> **coordinating** -> executing -> validating + HITL |

**DEPRECATED TIERS**:
- ~~Tier 0 (Trivial)~~ - **Automatically upgraded to Tier 2** - Questions get expert answers via controller
- ~~Tier 1 (Simple)~~ - **Automatically upgraded to Tier 2** - Simple tasks get specialist + review

**CRITICAL**: ALL workflows use controller coordination (minimum tier 2). Former tier 0/1 requests automatically upgraded.

### Coordination Patterns by Tier

- **Tier 2**: 1 primary controller - Ask questions -> synthesize -> coordinate implementation
  - Examples: "What is X?", "Fix typo", "Improve wording", "Fix bug"
  - Pattern: Domain expert + coordinator provides comprehensive answer/solution

- **Tier 3**: 1 primary + 1-2 supporting controllers - Multi-controller coordination with synthesis
  - Examples: "Add feature", "Create system", "Design campaign"
  - Pattern: Primary coordinator + specialist controllers (architect, security, etc.)

- **Tier 4**: 1 executive + 1 primary + 2-4 supporting + HITL approval
  - Examples: "Major refactor", "Architecture migration", "Strategic initiative"
  - Pattern: Executive oversight + primary coordinator + multiple specialists + human approval


## Workflow Execution

```
User Request -> Trigger (domain detect) -> Orchestrator
  |
  Routing -> Universal-Router (tier classification, requires_controller flag)
  |
  Planning -> Universal-Planner (objectives + controller selection)
  |
  Coordinating -> Controller (question-based delegation, synthesis)
  |
  Executing -> Universal-Executor (monitor controller progress)
  |
  Validating -> Universal-Validator (coordination quality + output quality)
  |
  PASS -> Complete | FIXABLE -> Self-Correct | BLOCKED -> HITL
```

**Subagent Architecture**: Agents delegate to specialists, don't execute directly.

Pattern: "Use {subagent} to {task}"
Benefits: Modularity, specialization, parallelization (up to 50 concurrent), reusability

See `workflow_agent_interactions.md` for detailed agent interaction patterns.

## Task Completion Protocol

**MANDATORY**: 100% completion with verified evidence, or it's not complete. See @.claude/rules/quality/completion.md for full protocol.

**Enforced by**: Controllers (verify acceptance criteria), universal-executor (check coordination_log), universal-validator (quality gates), orchestrator (phase validation)

**Requirements**: All objectives met with evidence, outputs production-quality, coordination_log.yaml complete, specific evidence (file paths, metrics), no partial completion

**Files**: `Agent_Memory/_system/task_completion_protocol.yaml`, `Agent_Memory/sessions/{session_id}/workflow/coordination_log.yaml`

## Skills (Commands)

**V9.0**: Commands migrated to Claude Code skills format in `.claude/skills/`. Skills are auto-discovered — no manifest registration needed.

| Skill | Context | Agent | Description |
|-------|---------|-------|-------------|
| `/run` | `fork` | `true` | Universal workflow engine — delegates to trigger agent |
| `/team` | `fork` | `true` | Parallel team execution via built-in agent teams with /run per work item |
| `/designer` | `none` | `false` | Interactive design engine (stays in main context for AskUserQuestion) |
| `/review` | `fork` | `true` | Universal review with parallel agent execution |
| `/optimize` | `fork` | `true` | 5-phase optimization with atomic rollback |
| `/helper` | `none` | `false` | Interactive command guide — explains skills and recommends the right command |

### /run - Universal Entry Point
Auto-routes to super-domain, executes full workflow with controller-centric coordination.
```bash
/run Fix auth bug              # -> Make domain (tier 2: engineering-manager)
/run Write fantasy story       # -> Make domain (tier 2: creative-director)
/run Plan Q4 campaign          # -> Grow domain (tier 3: marketing-strategist)
/run Create budget             # -> Operate domain (tier 4: cfo)
/run Hire software engineer    # -> People domain (tier 3: hr-manager)
/run Handle customer complaint # -> Serve domain (tier 2: customer-success-manager)
/run Design game mechanics     # -> Make domain (tier 2: game-designer)
```

Skill: `.claude/skills/run/SKILL.md` + `reference/` (flags, domain-coverage, delegation-patterns)

### /designer - Interactive Design Engine (V2.0)
Structured 4-phase design engine (Discovery → Ideation → Refinement → Specification). ALWAYS uses AskUserQuestion for every interaction.

```bash
/designer                              # Start fresh design session
/designer [topic]                      # Start with a specific topic
/designer --resume {id}                # Resume previous session
/designer --template product-feature   # Start with template
```

Skill: `.claude/skills/designer/SKILL.md` + `reference/` (7 files: phase guides, session resilience, rules)

### /review - Enhanced Review
Universal review with intelligent agent selection, severity-based reporting, auto-fix suggestions.

```bash
/review src/              # Code review
/review --focus security  # Security focus
```

Skill: `.claude/skills/review/SKILL.md` + `reference/` (6 files: flags, agent-groups, framework-patterns, auto-fix, quality-gates, report-formats)

### /optimize - Universal Optimizer
5-phase optimization engine with 8 types. Atomic rollback, cross-file analysis, ML-ready pattern learning.

```bash
/optimize                              # Auto-detect and optimize
/optimize "Make the app faster"        # Natural language goal
/optimize --interactive                # Ask preferences via AskUserQuestion
/optimize src/ --type code             # Specific target and type
/optimize --dry-run                    # Preview without applying
```

Skill: `.claude/skills/optimize/SKILL.md` + `reference/` (6 files: flags, optimization-types, risk-classification, phase-details, cross-file, session-management)

### /helper - Interactive Command Guide
Explains cAgents skills and recommends the right command for the user's needs. Provides detailed command explanations, usage examples, comparison tables, and guided recommendations.

```bash
/helper                        # Full interactive guide with all commands
/helper run                    # Deep dive into /run command
/helper designer               # Deep dive into /designer command
/helper how do I fix a bug     # Natural language recommendation
/helper --compare              # Side-by-side comparison of all commands
/helper --flags review         # Complete flag reference for /review
/helper --examples             # Real-world usage examples by domain
/helper --quick                # One-screen quick reference card
/helper --topic domains        # Deep dive into a specific topic
```

Skill: `.claude/skills/helper/SKILL.md` + `reference/` (5 files: command-details, recommendation-engine, comparison-tables, flag-summaries, examples, topic-guides)

### /memory - Memory Management
```bash
/memory                    # View all loaded memory files
/memory edit               # Open project CLAUDE.md in editor
/memory edit --user        # Open ~/.claude/CLAUDE.md
/memory edit --local       # Open CLAUDE.local.md
```

### /init - Bootstrap Project Memory
```bash
/init                      # Create initial CLAUDE.md for project
```

### /team - Parallel Team Execution via Built-in Agent Teams (V9.2)
Parallel team-based workflow execution using **Claude Code's built-in agent teams**. Each teammate runs `/run` for its assigned work item, with `teammateMode: "tmux"` providing tmux split pane display for true visual parallelism and 40-60% execution time reduction for tier 3+ workflows.

```bash
/team Implement OAuth2 authentication    # Full team execution
/team Build user dashboard --dry-run     # Preview team composition
/team Create API endpoints --members 4   # Limit team size
/team Add payment gateway --display      # Show team communication
/team Implement feature --teammate-mode tmux  # Force tmux split panes
```

**Or use with /run**:
```bash
/run Build feature --team                # Team mode via flag
```

**Core Architecture**: `/team` decomposes and parallelizes via built-in agent teams (TeamCreate, SendMessage, TaskList); `/run` orchestrates each work item.

**Key Features**:
- **Built-in Agent Teams**: Uses TeamCreate, SendMessage, TaskCreate/TaskList for coordination
- **tmux Split Pane Display**: `teammateMode: "tmux"` gives each teammate its own pane (managed by Claude Code)
- **Every Work Item via /run**: Full orchestration (plan, coordinate, execute, validate) per item
- **Shared Task Lists**: Built-in TaskCreate/TaskList at `~/.claude/tasks/{team-name}/`
- **Team Leads**: Controllers operate in delegate mode (coordination only)
- **Display Modes**: `auto` (default), `tmux` (split panes), `in-process` (main terminal)

**Performance Targets**:
- 40-60% execution time reduction
- >70% parallelism utilization
- 3x work item throughput

Config: `.cagents/team_config.yaml`, settings.json (`teammateMode`), see `docs/TEAM_MODE.md` for full documentation.

## Team Mode

### Overview

Team Mode enables parallel team-based execution using **Claude Code's built-in agent teams**. Each teammate executes `/run` for its assigned work item. When `teammateMode: "tmux"` is configured, each teammate gets its own tmux split pane for true visual parallelism. Controllers become team leads operating in delegate mode.

**Core Architecture**: `/team` decomposes and parallelizes via built-in agent teams (TeamCreate, SendMessage, TaskList); `/run` orchestrates each work item.

### When to Use

| Use /team | Use /run |
|-----------|----------|
| Tier 3+ complex workflows | Tier 2 simple coordination |
| Multiple parallelizable work items | Sequential workflows |
| Time-sensitive delivery | Quality-focused delivery |
| Large features with components | Small changes |

### Team Architecture

```
/team <request>
    |
    +-- team-trigger (decomposes, creates agent team via TeamCreate)
        |
        +-- Team Lead (coordinates via SendMessage, manages TaskList)
        +-- Teammate 1: /run WI-001 --> (full orchestration) --> Complete
        +-- Teammate 2: /run WI-002 --> (full orchestration) --> Complete
        +-- Teammate 3: /run WI-003 --> (full orchestration) --> Complete
        |                    (parallel -- each in own context/tmux pane)
        |
        +-- Aggregates /run outputs into final result
```

### Display Modes (teammateMode)

Configure in settings.json or via `--teammate-mode` flag:
- **auto** (default) -- tmux split panes if inside tmux session, otherwise in-process
- **tmux** -- Force tmux split pane display (each teammate in own pane)
- **in-process** -- All teammates in main terminal (Shift+Up/Down to navigate)

### Session Structure

```
Agent_Memory/sessions/team_{timestamp}/
├── team/
│   ├── team_manifest.yaml    # Team composition + display mode
│   ├── messages/             # Communication log
│   └── metrics/              # Timing and parallelism
├── workflow/
└── outputs/
```

Built-in resources (managed by Claude Code):
- Team config: `~/.claude/teams/{team-name}/config.json`
- Task list: `~/.claude/tasks/{team-name}/`

### Fallback Behavior

- **Unsuitable request**: Automatically delegates to standard `/run`
- **tmux unavailable**: Falls back to in-process mode (all teammates in main terminal)

See `docs/TEAM_MODE.md` for full documentation and `.claude/rules/core/teams.md` for coordination patterns.

## Agent Memory

**Full Structure**: See @.claude/rules/memory/agent-memory.md for detailed memory organization.

```
Agent_Memory/
├── _system/                          # System-level configs
│   ├── config/                       # Global configuration
│   ├── commands/                     # Command-specific configs (run/, designer/, review/, optimize/)
│   └── templates/                    # Shared templates
├── _knowledge/                       # Patterns, calibration, learnings
├── _archive/                         # Completed sessions
├── _communication/                   # Agent messaging
└── sessions/                         # All command sessions (STANDARDIZED)
    ├── run_{YYYYMMDD_HHMMSS}/        # /run workflow sessions
    ├── team_{YYYYMMDD_HHMMSS}/       # /team parallel sessions
    ├── designer_{YYYYMMDD_HHMMSS}/   # /designer design sessions
    ├── review_{YYYYMMDD_HHMMSS}/     # /review sessions
    └── optimize_{YYYYMMDD_HHMMSS}/   # /optimize sessions
```

**Session ID Format**: `{command}_{YYYYMMDD}_{HHMMSS}` (consistent across all commands)

**Key Files** (per session):
- `workflow/plan.yaml` - Objectives + controller assignment
- `workflow/coordination_log.yaml` - Q&A exchanges, synthesis, implementation tasks
- `workflow/execution_summary.yaml` - Aggregated outputs

**Principles**: File-based, session-scoped, parallel-safe, pause/resume capable

See `docs/CONTEXT_MANAGEMENT.md` for context handling details.

## Recursive Workflows

Complex tasks spawn child workflows (max depth: 5, max children: 100)

Example: `/run Write 10-chapter novel` -> 1 parent + 10 child workflows

Each child workflow follows the pattern (objectives -> controller -> questions -> synthesis -> implementation)

## Creating Agents

**Agent Patterns**: See @.claude/rules/core/execution.md for execution agent guidelines.

1. Choose tier (controller or execution) and domain
2. Create `{domain}/agents/my-agent.md` with YAML frontmatter
3. Add tier field to frontmatter
4. Add to `{domain}/.claude-plugin/plugin.json`
5. Test: `claude --plugin-dir .`

**Frontmatter (Controller)**:
```yaml
---
name: engineering-manager
tier: controller
domain: make
coordination_style: question_based
typical_questions: ["What is current implementation?", "What are constraints?"]
---
```

**Frontmatter (Execution)**:
```yaml
---
name: backend-developer
tier: execution
domain: make
answers_questions: ["implementation details", "technical constraints"]
executes_tasks: ["implement endpoints", "write tests"]
---
```

## Creating Domains

1. Create config files: `{domain}/config/planner_config.yaml`
2. Create controller_catalog in `planner_config.yaml`
3. Create controller agents in `{domain}/agents/` with tier: controller
4. Create execution agents in `{domain}/agents/` with tier: execution
5. Create plugin manifest: `{domain}/.claude-plugin/plugin.json`
6. Update root `.claude-plugin/plugin.json` and `package.json`

No code required - universal agents load configs automatically.

## Directory Structure

```
cAgents/
├── CLAUDE.md                # Main project memory (this file)
├── .claude/
│   ├── skills/              # V9.0 Skills (run, team, designer, review, optimize, helper)
│   ├── hooks/               # CJS hooks (12 registered + hook-utils.cjs)
│   ├── rules/               # Modular rules (20 files across 5 categories)
│   └── settings.json        # Hook registration + permissions + env
├── core/                    # Core infrastructure (tier 1)
│   ├── agents/              # 14 core agents
│   └── commands/            # Legacy commands (archived, replaced by skills)
├── shared/                  # Shared cross-domain capabilities (14 agents)
│   └── resources/           # V9.0 Shared resources (common questions, templates)
├── make/                    # MAKE super-domain (109 agents)
│   ├── agents/              # Engineering, creative, product, devops, qa, game development
│   ├── config/              # Domain configs (planner_config.yaml, etc.)
│   └── .claude-plugin/      # Make manifest
├── grow/                    # GROW super-domain (38 agents)
├── operate/                 # OPERATE super-domain (13 agents)
├── people/                  # PEOPLE super-domain (20 agents)
├── serve/                   # SERVE super-domain (28 agents)
├── scripts/                 # Hook dispatchers, version sync, agent update scripts
├── docs/                    # Project documentation
├── .claude-plugin/          # Root manifest
└── Agent_Memory/            # Runtime state (git-ignored)
```

**Root Directory Policy**: Only CLAUDE.md, README.md, and workflow_agent_interactions.md should exist in the root.

## Performance Benchmarks

| Feature | Improvement |
|---------|-------------|
| **Aggressive Decomposition** | 30+ work items from simple request |
| **Controller Pattern** | 30-40% simpler planning, 20-30% fewer tokens |
| **Reviewer** | 33% faster, 81% faster to critical, 98% more actionable |
| **Parallel Execution** | 50x speedup (swarm), 80%+ efficiency |
| **Optimizer** | 20-50% faster, 30-60% smaller bundles |
| **Task Inventory** | 60-80% context savings for 20+ task workflows |

See `docs/OPTIMIZATION_PROGRESS.md` for detailed optimization tracking.

## Quick Reference

**Skills**: `/run`, `/team`, `/designer`, `/review`, `/optimize`, `/helper` (in `.claude/skills/`)
**Built-in**: `/memory`, `/init` (Claude Code native)
**Agents**: 236 total (14 core + 14 shared + 208 domain specialists)
**Super-Domains**: Make (109), Grow (38), Operate (13), People (20), Serve (28)
**Key Files**: `CLAUDE.md`, `.claude/skills/*/SKILL.md`, `.claude/rules/*.md`, `{domain}/config/*.yaml`
**Hooks**: 14 event types, 2 hook types (command, prompt) in `.claude/settings.json`
**Models**: opusplan (controllers), sonnet (execution), haiku (support)
**Critical**: 100% task completion required, aggressive decomposition mandatory (tier 2+)
**Team Mode**: `/team` or `/run --team` for 40-60% faster tier 3+ workflows via built-in agent teams with tmux display

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Wrong domain detected | Use explicit domain keywords |
| No controller selected | Check planner_config.yaml has controller_catalog section |
| coordination_log missing | Check controller completed coordinating phase |
| Agent not found | Check agent has tier field in frontmatter |
| All 9 QA agents run | Enable `intelligent_agent_selection` in reviewer config |
| No progress updates | Ensure agents use TodoWrite |
| Workflow stuck in coordinating | Check controller is asking questions and synthesizing |
| Missing coordination_log | Controller didn't complete - check controller logs |
| Memory not loading | Run `/memory` to view loaded files |
| Local preferences not applied | Ensure CLAUDE.local.md in .gitignore |
| Team not spawning | Ensure `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json, verify work items >= 3 |
| Team slower than expected | Check parallelism_score, use standard mode for sequential work |
| Teammates not appearing | Use Shift+Down to cycle teammates, check task complexity |
| tmux panes not showing | Install tmux, set `teammateMode: "tmux"` in settings.json, use supported terminal |
| Lead doing work instead of delegating | Tell lead to wait for teammates, enable delegate mode (Shift+Tab) |
| Orphaned team resources | Use TeamDelete to clean up, or remove `~/.claude/teams/{name}/` and `~/.claude/tasks/{name}/` |

See `docs/WORKFLOW_EVALUATION_FIXES.md` for recent workflow issue resolutions.

---

**Total Agents**: 236 (14 core + 14 shared + 208 domain specialists)
**Architecture**: Controller-Centric Coordination with Task Inventory + Built-in Agent Teams
**Super-Domains**: 5 (Make, Grow, Operate, People, Serve)
**Skills**: 6 (run, team, designer, review, optimize, helper) in `.claude/skills/`
**Hooks**: 14 event types, 12 CJS hooks, 2 prompt hooks, 2 dispatchers
**Models**: opusplan (controllers), sonnet (execution), haiku (support)
**Team Mode**: 40-60% execution time reduction via built-in agent teams with tmux split pane display
**Directories**: 7 (core, shared, make, grow, operate, people, serve)
**Key Innovation**: CSV-based task inventory for large workflows + aggressive decomposition
**Dependencies**: None (file-based, self-contained)
**Version**: 9.3.3
