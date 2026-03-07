# cAgents

**Universal Multi-Domain Agent System for Claude Code**

V10.6.0 with 213 agents across 8 business domains. Event-driven pipeline state machine, controller-centric delegation, CJS-only hook system, Agent Teams parallel execution, Claude 4.6 model routing (Opus 4.6, Sonnet 4.6, Haiku 4.5).

## Overview

cAgents transforms AI-assisted work across any domain through specialized agent teams that collaborate autonomously. From software engineering to marketing, operations to creative work - one unified system handles it all.

**V10.6.0 Release**:
- Confidence tiers in coordination_log and validation (0.0-1.0 scoring per work item)
- Blind review anti-sycophancy for tier 3+ workflows (independent reviewers, Devil's Advocate)
- Dead-letter queue with PARTIAL_PASS classification (failed work items do not block pipeline)
- Handoff documents protocol: persistent inter-stage communication that survives context compaction
- Signal file intervention: PAUSE/STOP/RESUME pipeline control via filesystem signals
- Append-only DECISIONS.md and CORRECTIONS.md logs for controller coordination
- Four Questions reboot check in pre-compact-save.cjs waypoints
- Character-budgeted context injection (MAX_SESSION_START_CHARS=1500, MAX_ATTENTION_CHARS=500)
- /context skill for shared product context across sessions
- 124 agent descriptions rewritten to trigger-only format

## Usage Warning

cAgents spawns multiple subagents per request (3-10+ depending on complexity tier). Each subagent consumes API tokens independently. A single `/run` command can use 10-50x more tokens than a direct Claude Code interaction, and `/team` or `/org` commands amplify this further. Monitor your usage closely, especially with tier 3-4 workflows.

## Requirements

- **Claude Code 2.1.69+** (required)
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

### Compatibility

| cAgents | Min Claude Code | Key Features |
|---------|----------------|--------------|
| 10.6.0+ | 2.1.69+ | Confidence tiers, blind review, dead-letter queue, handoff documents |
| 10.5.0+ | 2.1.69+ | Clean team lifecycle (`continue:false`), hook reliability fixes |
| 10.0-10.4 | 2.1.47+ | Custom model frontmatter in teammates |

## Architecture

**Event-Driven Pipeline State Machine with Controller-Centric Delegation**

213 agents organized into 8 business domains:
- **Core** (15): Infrastructure agents (trigger, team-trigger, team-lead-adapter, orchestrator, hitl, optimizer, prompt-engineer, task-consolidator, task-decomposer, task-inventory, 5 universal workflow agents)
- **Shared** (4): Cross-domain intelligence (BI specialist, data scientist, market research analyst, competitive intelligence analyst)
- **Engineering** (33): Software engineering, infrastructure, security, QA, game programming
- **Creative** (30): Creative writing, narrative design, literary criticism, game art, audio
- **Business** (69): Strategy, product, operations, finance, marketing, sales
- **Growth** (36): Legacy domain in growth/ - consolidated into business/
- **People** (19): HR, talent acquisition, culture
- **Service** (32): Customer support, CX, legal, compliance, governance
- **Leadership** (10): C-suite executives (used by /org, not directly routable)

```
User Request -> /run (state machine loop, reads pipeline_config.yaml)
  -> orchestrator     (context enrichment -> enriched_context.yaml)
  -> universal-planner (objectives + controller selection -> plan.yaml)
  -> task-decomposer  (work items -> work_items.yaml)
  -> prompt-engineer  (delegation prompts -> delegation_prompts.yaml)
  -> controller       (question-based coordination with executor + reviewer loops)
  -> universal-validator (quality gates -> PASS/FAIL/REVISE)
  -> Complete
```

**Key Innovation**: Controllers use question-based delegation to specialists, synthesize answers, and coordinate implementation. Planning defines WHAT (objectives), controllers determine HOW (questions + synthesis). The validator drives revision routing: FAIL routes back to the controller, REVISE routes back to the planner (max 5 cycles).

## Installation

### From Claude Code Marketplace

```bash
/plugin CaelanDrayer/cAgents
```

This installs the complete system with all business domains.

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
2. Routes to the appropriate business domain (Engineering, Creative, Business, People, Service, etc.)
3. Classifies complexity tier (2-4, minimum tier 2 enforced)
4. Selects appropriate controllers and execution agents
5. Orchestrates the workflow through all pipeline phases
6. Delivers validated results

### Complexity Tiers

| Tier | Type | Coordination | Example | Workflow |
|------|------|--------------|---------|----------|
| 2 | Moderate | 1 controller | "Fix bug", "What is X?", "Fix typo" | routing -> planning -> coordinating -> executing -> validating |
| 3 | Complex | 1 primary + 1-2 supporting | "Add feature" | routing -> planning -> coordinating -> executing -> validating |
| 4 | Expert | 1 executive + 1 primary + 2-4 supporting + HITL | "Major refactor" | routing -> planning -> coordinating -> executing -> validating + HITL |

**Note**: Tiers 0-1 are deprecated and automatically upgraded to Tier 2 for multi-agent specialist coverage.

### Team Execution

```bash
/team Implement OAuth2 authentication    # Full team execution (5-7 waves)
/team Build user dashboard --dry-run     # Preview wave structure
/team Build feature --waves 8            # Force minimum 8 waves
/run Build feature --team                # Team mode via flag
```

### All Skills

```bash
/run        # Universal workflow engine - routes to specialist agents
/team       # N-wave parallel team execution (40-60% time reduction for tier 3+)
/org        # Corporate hierarchy orchestration - CEO + C-suite + sequential /team per domain
/designer   # Interactive design discovery (ALWAYS uses AskUserQuestion at every step)
/review     # Comprehensive review with parallel agent execution
/optimize   # Universal optimizer with atomic rollback
/helper     # Interactive command guide
/context    # Shared product context document for all agents
```

## Business Domains

### Engineering (33 agents)
Software engineering, infrastructure, security, QA, game programming
- **Controllers**: engineering-manager, architect, security-lead, devops-lead
- **Execution**: backend-developer, frontend-developer, qa-lead, dba, ux-designer, dependency-analyzer
- **Use cases**: Software development, security review, infrastructure, technical architecture, game development (Unity, Unreal, Godot)

### Creative (30 agents)
Creative writing, narrative design, literary criticism, game art, audio
- **Controllers**: narrative-director
- **Execution**: copywriter, story-architect, literary-critic, voice-coach, theme-analyst, pacing-specialist, tension-architect
- **Note**: All creative execution agents run on Opus 4.6 for highest quality output

### Business (69 agents)
Strategy, product, operations, finance, marketing, sales
- **Controllers**: operations-manager, campaign-manager, strategic-planner, product-manager
- **Execution**: financial-analyst, market-research-analyst, project-manager, agile-coach, procurement-specialist

### People (19 agents)
HR, talent acquisition, culture
- **Controllers**: hr-manager, talent-acquisition-manager
- **Execution**: recruiter, recruiting-coordinator

### Service (32 agents)
Customer support, CX, legal, compliance, governance
- **Controllers**: customer-success-manager, vp-customer-support, general-counsel
- **Execution**: customer-support-rep, technical-writer, compliance-officer, paralegal

### Leadership (10 agents)
C-suite executives - used by /org, not directly routable
- **Agents**: cto, cco, cpo, cmo, cfo, coo, cro, cso, chro, general-counsel

### Core (15 agents)
Infrastructure - the pipeline engine
- trigger, orchestrator, hitl, optimizer, prompt-engineer
- team-trigger, team-lead-adapter
- universal-router, universal-planner, universal-executor, universal-validator, universal-self-correct
- task-consolidator, task-decomposer, task-inventory

### Shared (4 agents)
Cross-domain intelligence
- bi-specialist, data-scientist, market-research-analyst, competitive-intelligence-analyst

## Core Features

### Event-Driven Pipeline (V9.23+)
Config-driven state machine reads `pipeline_config.yaml`. Each agent writes a completion event file that /run reads to advance the state. Revision routing: FAIL -> re-run controller, REVISE -> re-run planner (max 5 cycles each).

### Controller-Centric Coordination
Controllers ask questions to specialists, synthesize answers, coordinate implementation. Adaptive, expert-driven workflows replace rigid task lists.

### Reviewer Loops (V9.23+)
After each executor completes, a reviewer evaluates against acceptance criteria. REVISE sends feedback back to the executor (max 3 internal rounds). Tier 3+ uses blind review with independent reviewers and a Devil's Advocate confirmation step.

### Confidence Tiers (V10.6.0)
Every completed work item includes a confidence score (0.0-1.0). Items below 0.7 trigger additional reviewer scrutiny. Validator uses confidence scores to prioritize verification.

### Objective-Driven Planning
Plans define high-level objectives (WHAT), controllers determine implementation approach (HOW) through question-based delegation.

### Agent Teams (V8.6+)
N-wave parallel execution with 40-60% time reduction. Each wave spawns fresh teammates, validates a GATE checkpoint, then proceeds. Prefer 5-7 waves for tier 3+ workflows.

### CSV Task Inventory
60-80% context savings for workflows with 20+ tasks. State persists to disk across compaction events.

## Agent_Memory System

All state persists in `Agent_Memory/` at your project root:

```
Agent_Memory/
├── _system/              # Registry, config, agent status
├── _knowledge/           # Patterns, calibration, learnings
├── _archive/             # Completed sessions
├── _communication/       # Agent messaging (inbox, broadcast)
├── _projects/            # Persistent cross-session project state (DECISIONS.md, CORRECTIONS.md)
└── sessions/             # All command sessions
    └── {command}_{YYYYMMDD_HHMMSS}/
        ├── instruction.yaml    # Request + metadata
        ├── status.yaml         # Current phase
        ├── task_plan.md        # Work item breakdown (three-file pattern)
        ├── findings.md         # Discoveries and decisions
        ├── progress.md         # Status and resume instructions
        ├── workflow/           # Plan, coordination_log, events, handoffs
        ├── waypoints/          # Resume checkpoints
        ├── tasks/              # pending/, in_progress/, completed/
        └── outputs/            # Deliverables
```

File-based, session-scoped, parallel-safe, pause/resume capable.

## Hooks System

cAgents registers 16 hooks across 13 event types. All use the `createHook()` factory from `hook-utils.cjs` and are invoked via `run-hook.cjs`.

| Event | Hook(s) |
|-------|---------|
| SessionStart | session-catchup.cjs |
| SessionEnd | team-stop.cjs |
| Stop | verify-completion.cjs |
| SubagentStart | subagent-tracker.cjs, team-start.cjs |
| SubagentStop | subagent-stop-tracker.cjs |
| PreToolUse[Bash] | bash-validator.cjs |
| PreToolUse[Write\|Edit] | secret-detection.cjs |
| PreToolUse[Write\|Edit\|Bash] | attention-injection.cjs |
| PostToolUse[Write\|Edit] | post-write-validator.cjs |
| PostToolUseFailure | tool-failure-tracker.cjs |
| TeammateIdle | teammate-idle-handler.cjs |
| TaskCompleted | team-task-complete.cjs |
| PermissionRequest | permission-handler.cjs |
| PreCompact | pre-compact-save.cjs |
| Notification | notification.cjs |

19 total .cjs files: 16 registered hooks + hook-utils.cjs (factory) + run-hook.cjs (launcher) + eval-runner.cjs (CLI tool).

See `.claude/rules/core/hooks.md` for full documentation.

## Documentation

- **CLAUDE.md** - Complete architecture, commands, and agent reference
- **README.md** - Quick start guide (this file)
- **docs/** - Implementation guides, ARCHITECTURE.md, SKILLS.md, TEAM_MODE.md, RELEASE_NOTES.md, COMMAND_SELECTION.md, and more (17 files)
- **.claude/rules/** - Modular topic-specific rules (controllers, execution, memory, quality)
- **SECURITY.md** - Security policy and vulnerability reporting

## Performance

**Event-Driven Pipeline**:
- 16 registered CJS hooks (19 .cjs files) via `createHook()` factory
- Agent Teams: 40-60% execution time reduction for tier 3+ workflows
- Claude 4.6 model routing: Opus 4.6 (controllers/reasoning), Sonnet 4.6 (execution), Haiku 4.5 (support)

**Core Architecture**:
- 30-40% simpler planning (objectives vs detailed tasks)
- 20-30% fewer tokens (no detailed task lists)
- Up to 50x speedup with parallel execution
- CSV-based task inventory for 20+ task workflows (60-80% context savings)
- Aggressive task decomposition with implicit requirement discovery (30+ work items)
- Total agents: 213 (15 core + 4 shared + 10 leadership + 184 domain specialists)

## Version History

- **V10.6.0** - Competitive improvements: confidence tiers, blind review anti-sycophancy, dead-letter queue, handoff documents protocol, signal file intervention (PAUSE/STOP/RESUME), append-only DECISIONS.md/CORRECTIONS.md, Four Questions reboot check, /context skill, 124 agent descriptions rewritten
- **V10.5.0** - Clean team lifecycle: `continue:false` + `stopReason` for TeammateIdle/TaskCompleted; minimum Claude Code version declaration (2.1.69+)
- **V10.4.0** - Manus-style context engineering: attention-injection.cjs PreToolUse hook, KV-cache optimization, planning reminders, 5-question reboot check, 2-action findings capture rule, read-before-decide pattern
- **V10.3.0** - Creative domain overhaul: 24->30 agents, 6 new specialists (literary-critic, voice-coach, theme-analyst, pacing-specialist, tension-architect, research-specialist), all creative execution agents on Opus 4.6
- **V10.2.3** - TRIGGER patterns and metadata fields on 124 agent descriptions
- **V10.0.0** - Domain restructure: 5 super-domains (Make/Grow/Operate/People/Serve) replaced by 8 business domains (Engineering/Creative/Business/Growth/People/Service/Leadership/Core); agent chaining with topological execution
- **V9.22.0** - Documentation sync, stale reference fixes
- **V9.0.0** - Platform Alignment Edition: Skills system, hook event types, Agent Teams, opusplan model routing
- **V8.0.7** - Infrastructure and Learning Edition: Hooks, SKILL.md, model routing, session management
- **V7.5.1** - Task Inventory Edition: CSV-based task inventory, aggressive decomposition, completion validation
- **V7.0.0** - Controller-centric architecture with question-based delegation, objective-driven planning

## Support

- **Issues**: [GitHub Issues](https://github.com/CaelanDrayer/cAgents/issues)
- **Documentation**: See CLAUDE.md for complete reference
- **License**: MIT

## License

MIT License - See [LICENSE](LICENSE) for details.

---

**Built with Claude Code** | **cAgents V10.6.0** | 213 agents across 8 business domains | Powered by Claude Opus 4.6, Sonnet 4.6 & Haiku 4.5
