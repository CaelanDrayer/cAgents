# CLAUDE.md

Core architecture and development guidance for cAgents.

## Table of Contents

- [Documentation Structure](#documentation-structure)
- [Memory Management](#memory-management)
- [Project Overview](#project-overview)
- [CRITICAL: Automatic Workflow Progression](#critical-automatic-workflow-progression)
- [Core Infrastructure](#core-infrastructure-tier-1-12-agents)
- [Aggressive Decomposition](#aggressive-decomposition)
- [Controller-Centric Architecture](#controller-centric-architecture)
- [Coordinating Phase](#coordinating-phase)
- [Complexity Tiers](#complexity-tiers)
- [Workflow Execution](#workflow-execution)
- [Task Completion Protocol](#task-completion-protocol)
- [Commands](#commands)
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
- `AGENT_OPTIMIZATION_INSTRUCTION.md` - Agent optimization guidelines
- `ARCHITECTURE.md` - Architecture design
- `AUTOMATIC_WORKFLOW_PROGRESSION.md` - Automatic phase transition policy (CRITICAL)
- `CLAUDE_CODE_HOOKS_SPECIFICATION.md` - Claude Code hooks spec
- `COMMANDS.md` - Command reference
- `CONTEXT_MANAGEMENT.md` - Context handling and token management
- `DOCUMENTATION_CLEANUP_SUMMARY.md` - Documentation cleanup summary
- `DOCUMENTATION_STANDARDS.md` - Documentation best practices
- `DOMAIN_STRUCTURE_STANDARD.md` - Domain organization standard
- `GAME_DEV_V7.3.0_ANALYSIS.md` - Game development analysis
- `GETTING_STARTED.md` - Getting started guide
- `HOOK_REGISTRATION_FIX.md` - Hook registration fix
- `OPTIMIZATION_PROGRESS.md` - Optimization tracking and progress
- `RELEASE_NOTES.md` - Release history
- `TASK_COMPLETION_ENFORCEMENT_SUMMARY.md` - Task completion protocol summary
- `TASK_CONSOLIDATION.md` - Task consolidation strategies
- `TOKEN_MIGRATION_SUMMARY.md` - Token optimization migration details
- `WORKFLOW_EVALUATION_FIXES.md` - Workflow issue resolutions

**Root Documentation** (exceptions):
- `workflow_agent_interactions.md` - Agent interaction patterns (referenced throughout)

## Version Management

**CRITICAL: Always bump version on commits.**

When committing changes to this repository, you MUST increment the version in:
- `.claude-plugin/marketplace.json`
- `.claude-plugin/plugin.json`

**Version Format**: `major.minor.patch` (e.g., 7.5.3)

**When to bump**:
| Change Type | Bump | Example |
|-------------|------|---------|
| Bug fix, minor tweak | patch | 7.5.2 → 7.5.3 |
| New feature, enhancement | minor | 7.5.3 → 7.6.0 |
| Breaking change, major refactor | major | 7.6.0 → 8.0.0 |

**Commit checklist**:
1. Make your changes
2. Increment version in both JSON files
3. `git add -A`
4. `git commit -m "feat/fix/chore: description"`
5. `git push origin main`

## Memory Management

**Claude Code Memory Hierarchy**: cAgents leverages Claude Code's 5-tier memory system for flexible, scalable configuration.

### Memory Types

| Memory Type | Location | Purpose | Shared With | Use in cAgents |
|-------------|----------|---------|-------------|----------------|
| **Enterprise** | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS)<br>`/etc/claude-code/CLAUDE.md` (Linux)<br>`C:\Program Files\ClaudeCode\CLAUDE.md` (Windows) | Organization-wide standards | All users | Company coding standards, security policies, compliance |
| **Project** | `./CLAUDE.md` | Team-shared instructions | Team via git | Architecture, workflow, commands (this file) |
| **Project Rules** | `./.claude/rules/*.md` | Modular topic-specific rules | Team via git | Domain-specific guidelines, agent patterns |
| **User** | `~/.claude/CLAUDE.md` | Personal preferences (all projects) | Just you | Code style, personal shortcuts |
| **Project Local** | `./CLAUDE.local.md` | Personal project preferences | Just you | Local URLs, test data, dev preferences |

**Loading Order**: Enterprise -> User -> Project -> Project Rules -> Project Local (later = higher priority)

### Project Rules Structure

**Modular Rules** (`.claude/rules/`): Organize instructions into focused topic files instead of one large CLAUDE.md.

```
cAgents/
├── CLAUDE.md                        # Main project memory (this file)
├── .claude/
│   └── rules/
│       ├── core/
│       │   ├── orchestration.md     # Workflow orchestration patterns
│       │   ├── controllers.md       # Controller coordination guidelines
│       │   ├── execution.md         # Execution agent patterns
│       │   └── shared-questions.md  # Universal controller questions
│       ├── domains/
│       │   ├── engineering.md       # Engineering workflows and agents
│       │   ├── grow.md              # Grow super-domain specifics
│       │   ├── operate.md           # Operate super-domain specifics
│       │   ├── people.md            # People super-domain specifics
│       │   └── serve.md             # Serve super-domain specifics
│       ├── memory/
│       │   └── agent-memory.md      # Agent_Memory/ structure and usage
│       └── quality/
│           ├── completion.md           # Task completion protocol
│           ├── validation-framework.md # End-to-end traceability
│           └── implicit-discovery.md   # Handling abstract requests
└── CLAUDE.local.md                  # Your local preferences (git-ignored)
```

**Path-Specific Rules**: Rules can apply conditionally using YAML frontmatter:

```markdown
---
paths:
  - "core/agents/**/*.md"
  - "shared/agents/**/*.md"
---

# Agent Development Rules

- All agents MUST have YAML frontmatter with tier field
- Controllers use question-based delegation pattern
- Execution agents answer questions and execute tasks
```

**Glob Patterns Supported**:
- `**/*.md` - All markdown files recursively
- `core/**/*` - All files under core/
- `*.{ts,js}` - TypeScript or JavaScript files
- `{core,shared}/agents/*.md` - Agent files in core or shared

### Memory Import Syntax

**Import Additional Files**: Use `@path/to/file` syntax to include external content:

```markdown
# cAgents Architecture

See @docs/ARCHITECTURE.md for detailed architecture design.

## Workflow Patterns
@workflow_agent_interactions.md

## Domain Configurations
- Make: @Agent_Memory/_system/domains/make/planner_config.yaml
- Grow: @Agent_Memory/_system/domains/grow/planner_config.yaml
- Operate: @Agent_Memory/_system/domains/operate/planner_config.yaml

## Personal Preferences
@~/.claude/my-cagents-preferences.md
```

**Import Features**:
- Supports both relative and absolute paths
- Home directory imports: `@~/.claude/file.md`
- Recursive imports (max depth: 5)
- Not evaluated in code spans or code blocks: `@package.json`
- View loaded files: `/memory` command

### Local Project Memory

**CLAUDE.local.md**: Personal project-specific preferences (auto-ignored by git):

```markdown
# My cAgents Development Preferences

## Local Environment
- Dev server: http://localhost:3000
- Test API: http://localhost:8080
- Claude Code server: http://localhost:52125

## Personal Shortcuts
- Use `pnpm` instead of `npm`
- Prefer functional components over class components
- Use Jest for unit tests, Playwright for E2E

## Test Data
- Test instruction: inst_20260113_001
- Test super-domain: make
- Test controller: engineering-manager
```

**Add to .gitignore**:
```
# Local memory (personal preferences)
CLAUDE.local.md
*.local.md
```

### User-Level Memory

**~/.claude/CLAUDE.md**: Personal preferences for ALL projects:

```markdown
# My Global Claude Preferences

## Code Style
- Use 2-space indentation
- Prefer const over let
- Always use semicolons
- Use single quotes for strings

## Git Workflow
- Always create feature branches
- Commit messages: type(scope): message
- Never force push to main

## Tool Preferences
- Use pnpm for package management
- Prefer Playwright over Cypress
- Use ESLint + Prettier
```

**User-Level Rules** (`~/.claude/rules/`):
```
~/.claude/rules/
├── coding-style.md       # Your coding preferences
├── git-workflow.md       # Your git conventions
└── tool-preferences.md   # Your tool choices
```

### Memory Commands

**Interactive Memory Management**:

```bash
/memory                    # View all loaded memory files
/memory edit               # Open project CLAUDE.md in editor
/memory edit --user        # Open ~/.claude/CLAUDE.md
/memory edit --local       # Open CLAUDE.local.md
```

**Bootstrap Project Memory**:
```bash
/init                      # Create initial CLAUDE.md for project
```

### Memory Best Practices

**1. Be Specific**:
- Good: "Use 2-space indentation for TypeScript files"
- Bad: "Format code properly"

**2. Use Structure**:
- Format as bullet points under descriptive headings
- Group related memories logically
- Use markdown sections for organization

**3. Review Periodically**:
- Update memories as project evolves
- Remove outdated instructions
- Keep memories current and relevant

**4. Choose Right Location**:
- **Enterprise**: Company-wide policies (security, compliance)
- **Project**: Team-shared architecture and workflows
- **Project Rules**: Modular topic-specific guidelines
- **User**: Personal preferences across all projects
- **Project Local**: Personal project-specific preferences

**5. Modular Organization**:
- Split large CLAUDE.md into focused rule files
- Use descriptive filenames (testing.md, api-design.md)
- Use path-specific rules sparingly (only when truly conditional)
- Organize with subdirectories (frontend/, backend/, quality/)

**6. Memory for cAgents**:
- Document frequently used commands (build, test, lint)
- Include domain-specific patterns and conventions
- Add controller question patterns and delegation strategies
- Document Agent_Memory/ structure and file locations
- Include task completion protocol requirements

### Memory Discovery

**Recursive Lookup**: Claude Code searches for CLAUDE.md files starting from cwd up to root:

```
/home/user/projects/cAgents/core/agents/  <- Start here
  | Search up
/home/user/projects/cAgents/core/         <- Finds core/CLAUDE.md (if exists)
  |
/home/user/projects/cAgents/              <- Finds ./CLAUDE.md (main project memory)
  |
/home/user/projects/                      <- Continues searching
  |
/home/user/                               <- Finds ~/.claude/CLAUDE.md
```

**Subtree Discovery**: CLAUDE.md files in subdirectories are loaded only when Claude reads files in those subtrees.

### cAgents Memory Strategy

**Current Implementation**:
- Main project memory: `./CLAUDE.md` (this file)
- Modular rules: `.claude/rules/` (14 rule files across 4 categories)
- Agent patterns: `workflow_agent_interactions.md` (root-level exception)
- Domain configs: `Agent_Memory/_system/domains/{domain}/*.yaml`
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
- **Tier 1**: 12 core infrastructure agents (trigger, orchestrator, hitl, optimizer, task-consolidator, task-decomposer, task-inventory, 5 universal workflow agents)
- **Tier 2**: Controllers (coordinate work items via batch delegation)
- **Tier 3**: Execution agents (implement work items)
- **Tier 4**: Support agents (foundational services)
- **Total**: 231 agents
- **Execution**: 4 modes (Sequential, Pipeline, Swarm, Mesh) - up to 50x speedup

**Agent Distribution**:
- **Core Infrastructure** (12): Workflow orchestration + decomposition + inventory
- **Shared** (14): Cross-domain capabilities (leadership, planning, data, quality)
- **Make** (108): Creation capability (engineering, creative, product, game development)
- **Grow** (37): Acquisition capability (marketing, sales)
- **Operate** (13): Operations capability (finance, operations)
- **People** (19): Talent capability (HR, culture)
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

## Core Infrastructure (Tier 1: 12 agents)

**Orchestration Agents** (4):
- `trigger` - Entry point, domain detection, routing
- `orchestrator` - Phase conductor (routing -> planning -> **coordinating** -> executing -> validating)
- `hitl` - Human escalation for tier-4 decisions
- `optimizer` - Universal optimization (code, content, processes, data, infrastructure, campaigns)

**Universal Workflow Agents** (5):
- `universal-router` - Tier classification (0-4), sets requires_controller flag
- `universal-planner` - Aggressive decomposition + controller selection (generates comprehensive work breakdowns)
- `universal-executor` - Monitors controllers (not execution agents)
- `universal-validator` - Quality gates with coordination validation
- `universal-self-correct` - Adaptive recovery with coordination corrections

**Task Management** (3):
- `task-consolidator` - Task consolidation for 40-88% context reduction
- `task-decomposer` - Aggressive task decomposition (extrapolates all requirements from user requests)
- `task-inventory` - CSV-based state management (60-80% context savings for large workflows)

**Config Location**: `Agent_Memory/_system/domains/{domain}/*.yaml` (5 files per domain)

## Aggressive Decomposition

When users say "I want X", the system autonomously figures out everything needed to produce X.

**Philosophy**: Users state outcomes, not requirements. The planner's job is to unpack what they actually need.

### The 5 Decomposition Steps

```
User Request: "Add authentication to my app"
         |
Step 1: Request Analysis
         -> Type: feature, Action: add, Subject: authentication
         |
Step 2: Component Extraction
         -> UNDERSTAND (5 items): analyze existing code, review constraints
         -> DESIGN (4 items): architecture, security, API contracts
         -> BUILD (12 items): backend, frontend, database
         -> VERIFY (8 items): unit tests, integration tests, security tests
         -> DOCUMENT (4 items): API docs, user guides, developer docs
         |
Step 3: Implicit Discovery
         -> Security: CSRF, rate limiting, secure cookies (user didn't mention)
         -> Testing: regression tests, penetration tests (user didn't mention)
         -> Infrastructure: env variables, migrations (user didn't mention)
         |
Step 4: Dependency Mapping
         -> Critical path: analyze -> design -> user_model -> auth_service -> tests -> docs
         -> Parallel groups: [backend, frontend], [unit_tests, integration_tests]
         |
Step 5: Work Item Generation
         -> 33 work items with acceptance criteria
         -> Each item: ID, name, description, acceptance criteria, dependencies, effort
```

### Decomposition Output

**decomposition.yaml** (written by planner):
```yaml
work_items:
  - id: WI-001
    name: "Analyze existing auth implementation"
    type: understand
    acceptance_criteria:
      - "Existing auth code documented"
      - "Gap analysis completed"
    dependencies: []

  - id: WI-002
    name: "Design authentication architecture"
    type: design
    acceptance_criteria:
      - "Auth flow diagram created"
      - "Security measures specified"
    dependencies: [WI-001]

  # ... 31 more items

dependency_graph:
  critical_path: [WI-001, WI-002, WI-003, WI-007, WI-012, WI-016]
  parallel_groups:
    - [WI-003, WI-004]  # After design
    - [WI-008, WI-009]  # After implementation
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

**Controllers coordinate work through question-based delegation:**

```
Previous Pattern:
Planner -> Detailed Tasks -> Executor -> Team Agents

Current Pattern:
Planner -> Objectives -> Controller -> Questions -> Execution Agents -> Answers -> Controller -> Synthesized Solution -> Implementation
```

**Core Concept**: Controllers use domain expertise to break down objectives into specific questions, delegate to specialists, synthesize answers, and coordinate implementation.

### Question-Based Delegation

**How it works**:
1. **Planner defines objectives** (high-level goals like "Implement OAuth2 authentication")
2. **Planner selects controller** (e.g., engineering-manager for engineering work)
3. **Controller receives objectives** from plan.yaml
4. **Controller breaks into questions** (specific, answerable queries to specialists)
5. **Controller delegates questions** to execution agents (backend-developer, architect, qa-lead, etc.)
6. **Execution agents answer** with their expertise
7. **Controller synthesizes answers** into coherent solution
8. **Controller coordinates implementation** by assigning tasks to execution agents
9. **Executor monitors controller** progress via coordination_log.yaml

**Key Principles**:
- **Controllers ask, not assign**: Controllers ask "What is the current auth implementation?" not "Analyze current auth"
- **Execution agents answer**: Specialists provide expert answers to specific questions
- **Synthesis drives implementation**: Controllers synthesize answers into implementation plan
- **Adaptive coordination**: Controllers can ask follow-up questions based on answers received

### Agent Tiers

| Tier | Role | Count | Purpose | Examples |
|------|------|-------|---------|----------|
| **1: Core** | Infrastructure | 12 | Workflow orchestration | orchestrator, planner, executor, validator |
| **2: Controller** | Coordination | ~53 | Question-based delegation and synthesis | engineering-manager, architect, cto, campaign-manager, game-designer, game-producer |
| **3: Execution** | Specialists | ~147 | Answer questions and execute tasks | backend-developer, copywriter, financial-analyst, level-designer, animator |
| **4: Support** | Operations | ~19 | Foundational services | scribe, data-extractor, etc. |

### Controller Selection

**Controllers are selected by super-domain and coordination style:**

**Make Domain** (Creation):
- **Tier 2**: engineering-manager (moderate complexity), architect (system design), creative-director (creative work), game-designer (game mechanics), game-producer (game production)
- **Tier 3**: engineering-manager + architect + security-specialist (comprehensive engineering)
- **Tier 4**: cto + engineering-manager + architect (executive oversight), cco + creative-director (creative oversight)

**Grow Domain** (Acquisition):
- **Tier 2**: campaign-manager (moderate), sales-strategist (sales focus)
- **Tier 3**: marketing-strategist + campaign-manager + content-strategist
- **Tier 4**: cro + marketing-strategist + sales-strategist

**Operate Domain** (Operations):
- **Tier 2**: operations-manager (moderate), finance-manager (financial operations)
- **Tier 3**: cfo + operations-manager + compliance-officer
- **Tier 4**: cfo + coo + operations-manager + risk-manager

**People Domain** (Talent):
- **Tier 2**: hr-manager (moderate), talent-acquisition-specialist
- **Tier 3**: chro + hr-manager + culture-champion
- **Tier 4**: chro + ceo + hr-manager + change-manager

**Serve Domain** (Support & Governance):
- **Tier 2**: customer-success-manager (moderate), legal-counsel
- **Tier 3**: cx-director + customer-success-manager + legal-counsel
- **Tier 4**: general-counsel + cx-director + compliance-director

**Discovery**: Planner loads `planner_config.yaml` -> `controller_catalog` section -> matches tier + super-domain

## Coordinating Phase

**CRITICAL**: Coordinating phase sits between planning and executing.

**Workflow Patterns**: See @.claude/rules/core/orchestration.md for detailed phase documentation.

### Workflow Phases

```
routing -> planning -> coordinating -> executing -> validating
   |          |           |            |           |
  Router   Planner   Controller   Executor   Validator
(tier 0-4) (objectives) (questions) (monitor) (quality)
```

**Coordinating Phase**:
- Orchestrator spawns controller with plan.yaml + decomposition.yaml
- Controller receives full work item breakdown from planner
- Controller reviews decomposition and dependency graph
- Controller asks clarifying questions for ambiguous items only
- Controller coordinates work item execution respecting dependencies
- Controller writes coordination_log.yaml
- Orchestrator detects completion (coordination_log exists with completed status)

### Coordinating Phase Workflow

1. **Orchestrator spawns controller** with plan.yaml + decomposition.yaml context
2. **Controller reviews decomposition** - understands work items, dependencies, acceptance criteria
3. **Controller asks clarifying questions** - only for ambiguous items (not full breakdown)
4. **Controller coordinates work items** - assigns to execution agents respecting dependency order
5. **Execution agents implement** work items with acceptance criteria as guide
6. **Controller tracks completion** - verifies acceptance criteria met for each item
7. **Controller writes coordination_log.yaml** with work item progress and completion status
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
| 0 | Trivial | None | "What is X?" | routing -> answer |
| 1 | Simple | None | "Fix typo" | routing -> planning -> executing -> validating |
| 2 | Moderate | 1 controller | "Fix bug" | routing -> planning -> **coordinating** -> executing -> validating |
| 3 | Complex | 1 primary + 1-2 supporting | "Add feature" | routing -> planning -> **coordinating** -> executing -> validating |
| 4 | Expert | 1 executive + 1 primary + 2-4 supporting | "Major refactor" | routing -> planning -> **coordinating** -> executing -> validating + HITL |

**CRITICAL**: Tier 2+ workflows include coordinating phase with controllers using question-based delegation.

### Coordination Patterns by Tier

**Tier 0-1**: No controllers (direct answer or simple execution)

**Tier 2**: 1 primary controller
- Example: "Fix authentication bug"
- Controller: engineering-manager
- Pattern: Ask questions -> synthesize -> coordinate implementation

**Tier 3**: 1 primary + 1-2 supporting controllers
- Example: "Implement OAuth2 system"
- Primary: engineering-manager (coordination)
- Supporting: architect (design), security-specialist (security review)
- Pattern: Multi-controller coordination with synthesis

**Tier 4**: 1 executive + 1 primary + 2-4 supporting + HITL
- Example: "Migrate to microservices architecture"
- Executive: cto (strategic oversight)
- Primary: engineering-manager (day-to-day coordination)
- Supporting: architect, devops-lead, security-specialist, qa-lead
- Pattern: Executive oversight + multi-controller + HITL approval

## Workflow Execution

```
User Request -> Trigger (domain detect) -> Orchestrator
  |
  Routing -> Universal-Router (tier classification, requires_controller flag)
  |
  Planning -> Universal-Planner (objectives + controller selection)
  |
  Coordinating -> Controller (question-based delegation, synthesis, coordination_log)
  |
  Executing -> Universal-Executor (monitor controller progress)
  |
  Validating -> Universal-Validator (coordination quality + output quality)
  |
  PASS -> Complete | FIXABLE -> Self-Correct | BLOCKED -> HITL
```

See `workflow_agent_interactions.md` for detailed agent interaction patterns.

## Workflow Pattern

**Subagent Architecture**: Agents delegate to specialists, don't execute directly.

Pattern: "Use {subagent} to {task}"
Example: Controller -> backend-developer (question) -> architect (question) -> synthesis -> backend-developer (implementation)

Benefits: Modularity, specialization, parallelization (up to 50 concurrent), reusability, expert coordination

## Task Completion Protocol

**MANDATORY**: 100% completion with verified evidence, or it's not complete. See @.claude/rules/quality/completion.md for full protocol.

**Enforced by**: Controllers (verify acceptance criteria), universal-executor (check coordination_log), universal-validator (quality gates), orchestrator (phase validation)

**Requirements**: All objectives met with evidence, outputs production-quality, coordination_log.yaml complete, specific evidence (file paths, metrics), no partial completion

**Files**: `Agent_Memory/_system/task_completion_protocol.yaml`, `Agent_Memory/sessions/{session_id}/workflow/coordination_log.yaml`

## Commands

### /run - Universal Entry Point
Auto-routes to super-domain, executes full workflow with controller-centric coordination.
```bash
/run Fix auth bug              # -> Make domain (tier 2: engineering-manager controller)
/run Write fantasy story       # -> Make domain (tier 2: creative-director controller)
/run Plan Q4 campaign          # -> Grow domain (tier 3: marketing-strategist + campaign-manager)
/run Create budget             # -> Operate domain (tier 4: cfo + operations-manager)
/run Hire software engineer    # -> People domain (tier 3: hr-manager + talent-acquisition)
/run Handle customer complaint # -> Serve domain (tier 2: customer-success-manager)
/run Design game mechanics     # -> Make domain (tier 2: game-designer controller)
```

### /explore - Interactive Discovery
Asks questions to flesh out ideas across all domains. Runs until canceled.

### /review - Enhanced Review
Universal review with 8 enhancements:
1. Intelligent agent selection (30-50% faster)
2. Severity-based early reporting (81% faster to critical)
3. Auto-fix suggestions (98% more actionable)
4. Priority intelligence (security first)
5. Diff-aware analysis
6. Context-aware (cross-file)
7. Real-time progress
8. Pattern learning (78% detection)

```bash
/review src/              # Code review
/review --focus security  # Security focus
```

Config: `Agent_Memory/_system/commands/review/`
Patterns: `Agent_Memory/_knowledge/procedural/review_patterns.yaml`

### /optimize - Universal Optimizer
Trigger-style workflow with controller-centric coordination, supports 8 optimization types: code, content, process, data, infrastructure, campaign, creative, sales.

**Usage**:
```bash
/optimize                              # Auto-detect everything
/optimize "Make the app faster"        # Natural language goal
/optimize src/ --type code             # Specific target
/optimize --continuous --interval 1d   # Background monitoring
```

**5-Phase Workflow**: detection -> analysis -> planning -> execution -> validation. Creates `inst_{id}` folder, uses controller coordination, measures before/after metrics.

See `core/commands/optimize.md` for detailed documentation.

### /memory - Memory Management
Interactive memory management and viewing:
```bash
/memory                    # View all loaded memory files
/memory edit               # Open project CLAUDE.md in editor
/memory edit --user        # Open ~/.claude/CLAUDE.md
/memory edit --local       # Open CLAUDE.local.md
```

### /init - Bootstrap Project Memory
Create initial CLAUDE.md for new projects:
```bash
/init                      # Create CLAUDE.md with project structure
```

## Agent Memory

**Full Structure**: See @.claude/rules/memory/agent-memory.md for detailed memory organization.

```
Agent_Memory/
├── _system/                          # System-level configs
│   ├── config/                       # Global configuration
│   ├── commands/                     # Command-specific configs
│   │   ├── run/                      # /run command configs
│   │   ├── explore/                  # /explore command configs
│   │   ├── review/                   # /review command configs
│   │   └── optimize/                 # /optimize command configs
│   └── domains/{domain}/             # Domain configs (5 files each)
├── _knowledge/                       # Patterns, calibration, learnings
├── _archive/                         # Completed sessions
├── _communication/                   # Agent messaging
└── sessions/                         # All command sessions (STANDARDIZED)
    ├── run_{YYYYMMDD_HHMMSS}/        # /run workflow sessions
    ├── explore_{YYYYMMDD_HHMMSS}/    # /explore design sessions
    ├── review_{YYYYMMDD_HHMMSS}/     # /review sessions
    └── optimize_{YYYYMMDD_HHMMSS}/   # /optimize sessions
```

**Session ID Format**: `{command}_{YYYYMMDD}_{HHMMSS}` (consistent across all commands)

**Key Files** (per session):
- `workflow/plan.yaml` - Objectives + controller assignment (not tasks)
- `workflow/coordination_log.yaml` - Q&A exchanges, synthesis, implementation tasks
- `workflow/execution_summary.yaml` - Aggregated outputs from controller

**Principles**: File-based, session-scoped, parallel-safe, pause/resume capable, consistent naming

See `docs/CONTEXT_MANAGEMENT.md` for context handling details.

## Recursive Workflows

Complex tasks spawn child workflows (max depth: 5, max children: 100)

Example: `/run Write 10-chapter novel` -> 1 parent + 10 child workflows

Each child workflow follows the pattern (objectives -> controller -> questions -> synthesis -> implementation)

## Creating Agents

**Agent Patterns**: See @.claude/rules/core/execution.md for execution agent guidelines and frontmatter requirements.

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
super_domain: make
coordination_style: question_based
question_limit: 15
typical_questions: ["What is current implementation?", "What are constraints?", ...]
---
```

**Frontmatter (Execution)**:
```yaml
---
name: backend-developer
tier: execution
domain: make
super_domain: make
answers_questions: ["implementation details", "technical constraints", ...]
executes_tasks: ["implement endpoints", "write tests", ...]
---
```

## Creating Domains

1. Create 5 config files: `Agent_Memory/_system/domains/{domain}/*.yaml`
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
├── core/                    # Core infrastructure (tier 1)
│   ├── agents/              # 12 core agents
│   └── commands/            # 4 universal commands
├── shared/                  # Shared cross-domain capabilities (14 agents)
│   ├── agents/              # Leadership, planning, data, quality, customer, ops
│   └── .claude-plugin/      # Shared manifest
├── make/                    # MAKE super-domain (108 agents)
│   ├── agents/              # Engineering, creative, product, devops, qa, game development
│   └── .claude-plugin/      # Make manifest
├── grow/                    # GROW super-domain (37 agents)
│   ├── agents/              # Marketing, sales, partnerships
│   └── .claude-plugin/      # Grow manifest
├── operate/                 # OPERATE super-domain (13 agents)
│   ├── agents/              # Finance, operations, procurement
│   └── .claude-plugin/      # Operate manifest
├── people/                  # PEOPLE super-domain (19 agents)
│   ├── agents/              # HR, talent, culture
│   └── .claude-plugin/      # People manifest
├── serve/                   # SERVE super-domain (28 agents)
│   ├── agents/              # Customer experience, legal, compliance, support
│   └── .claude-plugin/      # Serve manifest
├── docs/                    # Project documentation
│   └── *.md                 # Implementation guides, standards, release notes
├── .claude/                 # Memory system
│   └── rules/               # Modular rules (14 files across 4 categories)
├── .claude-plugin/          # Root manifest
└── Agent_Memory/            # Runtime state (git-ignored)
    └── _system/
        └── domains/{domain}/*.yaml    # Domain configs
```

**Root Directory Policy**: Only CLAUDE.md, README.md, and workflow_agent_interactions.md should exist in the root. All other documentation belongs in `docs/` or `archive/docs/`.

## Performance Benchmarks

**Aggressive Decomposition**: Comprehensive work breakdowns (30+ items from simple request), implicit requirement discovery, dependency mapping
**Controller Pattern**: 30-40% simpler planning (objectives vs tasks), 20-30% fewer tokens (no detailed task lists)
**Reviewer**: 33% faster, 81% faster to critical, 98% more actionable, 78% pattern detection
**Parallel Execution**: 50x speedup (swarm), 80%+ efficiency
**Optimizer**: 20-50% faster, 30-60% smaller bundles, 15-40% less memory
**Task Inventory**: 60-80% context savings for 20+ task workflows

See `docs/OPTIMIZATION_PROGRESS.md` for detailed optimization tracking.

## Quick Reference

**Commands**: `/run`, `/explore`, `/review`, `/optimize`, `/memory`, `/init` | **Agents**: 231 total (12 core + 14 shared + 205 domain specialists across 5 super-domains)
**Super-Domains**: Make (108), Grow (37), Operate (13), People (19), Serve (28)
**Key Files**: `CLAUDE.md` (this file), `.claude/rules/*.md`, `Agent_Memory/_system/domains/{domain}/*.yaml`, `Agent_Memory/sessions/{command}_{id}/workflow/decomposition.yaml`
**Critical**: 100% task completion required, aggressive decomposition mandatory (tier 2+), work items with acceptance criteria, dependency-aware coordination

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
| Memory not loading | Run `/memory` to view loaded files, check file locations |
| Local preferences not applied | Ensure CLAUDE.local.md in .gitignore, check loading order |

See `docs/WORKFLOW_EVALUATION_FIXES.md` for recent workflow issue resolutions.

---

**Total Agents**: 231 (12 core + 14 shared + 205 domain specialists)
**Architecture**: Controller-Centric Coordination with Task Inventory
**Super-Domains**: 5 (Make, Grow, Operate, People, Serve)
**Directories**: 7 (core, shared, make, grow, operate, people, serve)
**Key Innovation**: CSV-based task inventory for large workflows + aggressive decomposition
**Dependencies**: None (file-based, self-contained)
**Version**: 7.5.1
