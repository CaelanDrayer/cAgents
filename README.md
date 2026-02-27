# cAgents

**Universal Multi-Domain Agent System for Claude Code**

V9.20 with 238 agents across 5 super-domains. Flattened 2-level delegation, CJS-only hook system, Agent Teams parallel execution, Claude 4.6 model routing (Opus 4.6, Sonnet 4.6, Haiku 4.5).

## Overview

cAgents transforms AI-assisted work across any domain through specialized agent teams that collaborate autonomously. From software engineering to marketing, operations to creative work - one unified system handles it all.

**V9.19 Release**:
- Flattened 2-level delegation chain (`/run -> controller -> execution`) replacing unreliable 5-level chain
- CJS-only hook system (14 hooks via `createHook()` factory, shell hooks removed in V9.5)
- Agent Teams integration for parallel team-based execution (40-60% time reduction)
- Claude 4.6 model routing: Opus 4.6 (reasoning), Sonnet 4.6 (execution), Haiku 4.5 (support), opusplan hybrid for controllers
- Progressive skill disclosure (all agents use SKILL.md format with resources/)
- Session management with three-file pattern and waypoints
- Total agents: 238 (14 core + 14 shared + 210 domain specialists)

## Requirements

- **Claude Code** (required)
- **Node.js** (optional, recommended) - Required for advanced hooks:
  - Session catchup (resume incomplete sessions)
  - Completion verification (validate task completion)
  - Secret detection (block secrets in file writes)
  - Pre-compact state preservation with coordination state
  - Subagent tracking and tool failure tracking
  - Team coordination (start, stop, task completion, idle handling)
  - Permission handling
  - Notification logging

Without Node.js, hooks are not available (CJS-only architecture since V9.5).

## Architecture

**Controller-Centric Question-Based Delegation**

238 agents organized into:
- **Core** (14): Infrastructure (trigger, team-trigger, team-lead-adapter, orchestrator, hitl, optimizer, task-consolidator, task-decomposer, task-inventory, 5 universal workflow agents)
- **Shared** (14): Cross-domain capabilities (data, analytics, quality, compliance, customer, operations)
- **Make** (111): Creation (engineering, creative, product, devops, qa, **game development**)
- **Grow** (38): Acquisition (marketing, sales, partnerships)
- **Operate** (13): Operations (finance, operations, procurement)
- **People** (20): Talent (HR, culture, talent acquisition)
- **Serve** (28): Support & Governance (customer experience, legal, compliance, support)

```
User Request -> /run (inline: routing + planning + orchestration)
    |
    v
Controller (question-based delegation -> specialists answer -> synthesis)
    |
    v
Execution Agents (actual implementation work)
    |
    v
/run validates outputs -> Complete
```

**Key Innovation**: Controllers use question-based delegation to specialists, synthesize answers, and coordinate implementation. Planning defines WHAT (objectives), controllers determine HOW (questions + synthesis).

## Installation

### From Claude Code Marketplace

```bash
/plugin CaelanDrayer/cAgents
```

This installs the complete system with all super-domains.

### Manual Installation

```bash
git clone https://github.com/CaelanDrayer/cAgents.git
cd cAgents
./setup.sh  # Configures hooks based on Node.js availability
```

Then configure Claude Code to load the plugin directory.

### Setup Script

The `setup.sh` script configures the hook system:

```bash
# Configure hooks and verify Node.js
./setup.sh
```

**Requires Node.js**: All hooks are CJS-only (V9.5+). Shell hooks were removed.

## Quick Start

### Universal /run Command

One command handles ANY request type - routing happens automatically:

```bash
# Engineering work
/run Fix the authentication bug

# Creative writing
/run Write a sci-fi short story about AI

# Marketing
/run Plan Q4 product launch campaign

# Operations
/run Create annual budget for 2027

# HR/People
/run Design onboarding program for engineers

# Customer Support
/run Create knowledge base article about refunds
```

The system automatically:
1. Analyzes your request and identifies intent
2. Routes to the appropriate super-domain (Make/Grow/Operate/People/Serve)
3. Classifies complexity tier (2-4, minimum tier 2 enforced)
4. Selects appropriate controllers and execution agents
5. Orchestrates the workflow through all phases
6. Delivers validated results

### Complexity Tiers

| Tier | Type | Coordination | Example | Workflow |
|------|------|--------------|---------|----------|
| 2 | Moderate | 1 controller | "Fix bug", "What is X?", "Fix typo" | routing -> planning -> **coordinating** -> executing -> validating |
| 3 | Complex | 1 primary + 1-2 supporting | "Add feature" | routing -> planning -> **coordinating** -> executing -> validating |
| 4 | Expert | 1 executive + 1 primary + 2-4 supporting + HITL | "Major refactor" | routing -> planning -> **coordinating** -> executing -> validating + HITL |

**Note**: Tiers 0-1 are deprecated and automatically upgraded to Tier 2 for multi-agent specialist coverage.

### Team Execution

```bash
/team Implement OAuth2 authentication    # Full team execution
/team Build user dashboard --dry-run     # Preview team composition
/team Create API endpoints --members 4   # Limit team size
```

### Universal Commands

```bash
/designer   # Interactive design discovery (ALWAYS uses AskUserQuestion)
/review     # Comprehensive review (code, documents, strategies, campaigns)
/optimize   # Universal optimizer (8 types: code, content, process, data, infrastructure, campaign, creative, sales)
```

## Super-Domains

### Make (Creation) - 111 agents
Engineering, creative writing, product design, devops, QA, **game development**
- **Controllers**: engineering-manager, architect, creative-director, product-manager, game-director, cto, cco
- **Execution**: backend-developer, frontend-developer, copywriter, story-architect, gameplay-programmer, level-designer, game-artist, audio-engineer, qa-lead, security-specialist
- **Use cases**: Software development, creative content, product design, technical writing, **game development (Unity, Unreal, Godot)**

### Grow (Acquisition) - 38 agents
Marketing, sales, partnerships
- **Controllers**: marketing-strategist, campaign-manager, sales-strategist, cro
- **Execution**: content-strategist, copywriter, seo-specialist, sales-development-rep, account-executive
- **Use cases**: Marketing campaigns, sales strategies, content marketing, SEO, demand generation

### Operate (Operations) - 13 agents
Finance, operations, procurement
- **Controllers**: operations-manager, finance-manager, cfo, coo
- **Execution**: financial-analyst, budget-analyst, procurement-specialist, supply-chain-manager
- **Use cases**: Financial planning, budgeting, operations optimization, procurement

### People (Talent) - 20 agents
HR, talent acquisition, culture
- **Controllers**: hr-manager, talent-acquisition-specialist, chro
- **Execution**: recruiter, onboarding-specialist, culture-champion, learning-development-specialist
- **Use cases**: Recruiting, onboarding, performance management, culture initiatives

### Serve (Support & Governance) - 28 agents
Customer experience, legal, compliance, support
- **Controllers**: customer-success-manager, legal-counsel, compliance-officer, cx-director
- **Execution**: support-specialist, technical-writer, compliance-analyst, legal-researcher
- **Use cases**: Customer support, legal review, compliance audits, documentation

## Core Features

### Controller-Centric Coordination
Controllers ask questions to specialists, synthesize answers, coordinate implementation. No more rigid task lists - adaptive, expert-driven workflows.

### Objective-Driven Planning
Plans define high-level objectives (WHAT), controllers determine implementation approach (HOW) through question-based delegation.

### Universal Workflow Agents
5 universal agents (router, planner, executor, validator, self-correct) work across ALL domains via YAML configuration. No domain-specific workflow code needed.

### Parallel Execution
Up to 50 concurrent agents with 4 execution modes (Sequential, Pipeline, Swarm, Mesh) for up to 50x speedup.

### Skills System (V9.0)
- **/run**: Universal workflow engine - routes through specialist agents
- **/team**: Parallel team execution with peer-to-peer messaging and shared task lists
- **/designer**: Interactive design discovery (ALWAYS uses AskUserQuestion)
- **/review**: Comprehensive review with intelligent agent selection
- **/optimize**: Universal optimizer with 8 optimization types and atomic rollback

### Agent Teams (V8.6+)
Parallel team-based execution with 40-60% time reduction, peer-to-peer messaging, shared task lists, and team leads operating in delegate mode.

## Agent_Memory System

All state persists in `Agent_Memory/` at your project root:

```
Agent_Memory/
├── _system/              # Registry, config, agent status
├── _knowledge/           # Patterns, calibration, learnings
├── _archive/             # Completed instructions
└── {instruction_id}/     # Per-task working memory
    ├── instruction.yaml  # Request + metadata
    ├── status.yaml       # Current phase
    ├── workflow/         # Plan, coordination_log, execution state
    ├── tasks/            # pending/, in_progress/, completed/
    └── outputs/          # Deliverables
```

File-based, instruction-scoped, parallel-safe, pause/resume capable.

## Hooks System

cAgents uses Claude Code's hook system for workflow integration:

| Hook Type | CJS Hook |
|-----------|----------|
| SessionStart | session-catchup.cjs |
| SessionEnd | team-stop.cjs |
| Stop | verify-completion.cjs |
| SubagentStart | subagent-tracker.cjs, team-start.cjs |
| SubagentStop | subagent-stop-tracker.cjs |
| PreToolUse (Bash) | bash-validator.cjs |
| PreToolUse (Write/Edit) | secret-detection.cjs |
| PostToolUseFailure | tool-failure-tracker.cjs |
| TeammateIdle | teammate-idle-handler.cjs |
| TaskCompleted | team-task-complete.cjs |
| PermissionRequest | permission-handler.cjs |
| PreCompact | pre-compact-save.cjs |
| Notification | notification.cjs |

All hooks use the `createHook()` factory from `hook-utils.cjs` and are invoked via `run-hook.cjs`. See `.claude/rules/core/hooks.md` for details.

## Documentation

- **CLAUDE.md** - Complete architecture, commands, and agent reference (this is the main documentation)
- **README.md** - Quick start guide (this file)
- **docs/** - Implementation guides, standards, optimization tracking
- **.claude/rules/** - Modular topic-specific rules (controllers, execution, memory, quality)

## Performance

**V9.19 Flattened Architecture**:
- 2-level delegation chain (reliable) replaces 5-level chain
- CJS-only hook system with `createHook()` factory (14 hooks)
- Agent Teams: 40-60% execution time reduction for tier 3+ workflows
- Claude 4.6 model routing (Opus 4.6, Sonnet 4.6, Haiku 4.5) with opusplan hybrid for controllers

**Core Architecture**:
- 30-40% simpler planning (objectives vs detailed tasks)
- 20-30% fewer tokens (no detailed task lists)
- Up to 50x speedup with parallel execution (swarm mode)
- CSV-based task inventory for 20+ task workflows (60-80% context savings)
- Aggressive task decomposition with implicit requirement discovery
- Total agents: 238 (14 core + 14 shared + 210 domain specialists)
- Game engines supported: Unity, Unreal Engine, Godot

## Version History

- **V9.20.0** (2026-02-27) - TodoWrite blocking prerequisite enforcement, mandatory controller TodoWrite, stronger helper patterns
- **V9.19.1** (2026-02-27) - Flattened 2-level delegation, CJS-only hooks, TodoWrite progressive refinement, 238 agents
- **V9.0.0** (2026-02-07) - Platform Alignment Edition: Skills system, 14 hook event types, Agent Teams, opusplan model routing, 236 agents
- **V8.7.0** (2026-02-06) - Agent Teams integration, /run as universal execution path for /team work items
- **V8.6.0** (2026-02-05) - Claude Code Agent Teams integration, team-trigger and team-lead-adapter agents
- **V8.5.2** (2026-02-05) - Config consolidation, documentation cleanup, hook optimization
- **V8.0.7** (2026-01-28) - Infrastructure & Learning Edition: Hooks, SKILL.md, model routing, session management
- **V7.5.1** (2026-01-22) - Task Inventory Edition: CSV-based task inventory, aggressive decomposition, completion validation
- **V7.3.0** (2026-01-19) - Game Development Edition: 28 new game dev agents, Make domain expanded to 108 agents
- **V7.1.0** (2026-01-19) - Cleanup release: removed 358 legacy agents, streamlined to 7 directories, 201 production agents
- **V7.0.3** - Introduced 5 super-domains (Make, Grow, Operate, People, Serve), consolidated 8 legacy domains
- **V7.0.0** - Controller-centric architecture with question-based delegation, objective-driven planning
- **V6.0.0** - Universal workflow agents replace domain-specific workflow agents via configuration
- **V5.0.0** - Orchestration with realistic organizational hierarchy

## Support

- **Issues**: [GitHub Issues](https://github.com/CaelanDrayer/cAgents/issues)
- **Documentation**: See CLAUDE.md for complete reference
- **License**: MIT

## License

MIT License - See [LICENSE](LICENSE) for details.

---

**Built with Claude Code** | **cAgents V9.19** | 238 agents across 5 super-domains | Powered by Claude Opus 4.6, Sonnet 4.6 & Haiku 4.5
