# cAgents

**Universal Multi-Domain Agent System for Claude Code**

cAgents transforms AI-assisted work across any domain - software engineering, creative writing, business operations, and beyond - through specialized agent teams that collaborate autonomously.

## Overview

cAgents is a modular ecosystem where you install domain plugins based on your needs:

- **Software engineers** get `@cagents/software` (46 specialized agents)
- **Business teams** get `@cagents/business` (23 agents for strategy, operations, sales, project management, forecasting)
- **Writers** get `@cagents/creative` (coming Phase 2: agents for novels, stories, worldbuilding)
- **Future domains**: Sales, Marketing, Finance, Operations, Support, HR, Legal

All domains share the same core infrastructure and work together seamlessly.

## Architecture (V2 Universal Workflow)

```
cAgents V2.0/
+-- core/                    # @cagents/core - Required foundation
|   +-- agents/              # 8 core agents:
|   |   +-- trigger.md       # Entry point + domain routing
|   |   +-- orchestrator.md  # Phase management conductor
|   |   +-- hitl.md          # Human escalation
|   |   +-- universal-router.md      # ↓ V2 Universal Workflow Agents
|   |   +-- universal-planner.md     # Work across ALL domains via
|   |   +-- universal-executor.md    # configuration-driven behavior
|   |   +-- universal-validator.md   # (replaces 55 domain-specific
|   |   +-- universal-self-correct.md # workflow agents)
|   +-- memory/              # Agent_Memory system
|   +-- commands/            # /trigger, /designer, /reviewer
|
+-- Agent_Memory/            # Configuration-driven domain behaviors
|   +-- _system/domains/     # 55 domain configs (11 domains × 5 configs)
|       +-- software/        # router, planner, executor, validator, self-correct configs
|       +-- business/        # (configuration defines domain-specific behavior)
|       +-- creative/
|       +-- planning/
|       +-- sales/
|       +-- marketing/
|       +-- finance/
|       +-- operations/
|       +-- hr/
|       +-- legal/
|       +-- support/
|
+-- software/       # @cagents/software - 46 team agents
+-- business/       # @cagents/business - 18 team agents
+-- creative/       # @cagents/creative - 17 team agents
+-- planning/       # @cagents/planning - 16 team agents
+-- sales/          # @cagents/sales - 17 team agents
+-- marketing/      # @cagents/marketing - 21 team agents
+-- finance/        # @cagents/finance - 16 team agents
+-- operations/     # @cagents/operations - 15 team agents
+-- hr/             # @cagents/hr - 19 team agents
+-- legal/          # @cagents/legal - 14 team agents
+-- support/        # @cagents/support - 15 team agents
```

### V2 Universal Workflow Architecture

**V2 Architecture** (5 universal workflow agents):
- 5 universal workflow agents work across ALL domains via YAML configuration
- Domain behavior defined in `Agent_Memory/_system/domains/{domain}/*.yaml` files
- Adding new domains only requires creating 5 config files, no code changes
- Consistent workflow logic across all domains
- Streamlined from 283 agents to 228 agents (-19.4%) by replacing domain-specific workflow agents

**Universal Agent Delegation**:
```
User Request → Trigger (detect domain)
                  ↓
            Orchestrator (phase management)
                  ↓
         Universal-Router (load domain config)
                  ↓
        Universal-Planner (load domain config)
                  ↓
       Universal-Executor (delegate to domain team agents)
                  ↓
       Universal-Validator (load domain config)
                  ↓
    Universal-Self-Correct (if needed)
```

**Recursive Workflows** (NEW in V2):
- Workflows can spawn child workflows (e.g., novel → chapters → scenes)
- Maximum depth: 5 levels
- Maximum children per parent: 20
- Circular reference prevention
- Parent-child result aggregation

## Installation

### From Claude Code Marketplace (Recommended)

/plugin CaelanDrayer/cAgents

This installs both Core and Software domains by default.

## Quick Start

```bash
# Start any task with /trigger - routing happens automatically
/trigger Fix the login timeout bug
/trigger Write a novel about space pirates
/trigger Create Q4 sales forecast

# Universal commands (work across all domains)
/designer   # Interactive design assistant (for any domain)
/reviewer   # Comprehensive review (code, documents, strategies)
```

## Core Concepts

### Unified /trigger Command

One command handles ANY request type. The system automatically:
1. Parses your request and identifies intent
2. Routes to the appropriate domain (software, creative, etc.)
3. Classifies complexity (tier 0-4)
4. Orchestrates the right team of agents
5. Delivers validated results

### Complexity Tiers

| Tier | Type | Example | Approach |
|------|------|---------|----------|
| 0 | Trivial | "What is X?" | Direct answer |
| 1 | Simple | "Fix typo" | Execute + Validate |
| 2 | Moderate | "Fix bug" | Plan + Execute + Validate |
| 3 | Complex | "Add feature" | Parallel team execution |
| 4 | Expert | "Major refactor" | Full orchestration + HITL |

### Agent_Memory System

All state persists in the `Agent_Memory/` folder at your project root:

- `_system/` - Registry, config, agent status
- `_archive/` - Completed instructions
- `_knowledge/` - Persistent learning across domains
- `_communication/` - Inter-agent messaging
- `{instruction_id}/` - Per-task working memory

## Domain Plugins

### @cagents/core (Required)

Shared infrastructure for all domains (8 agents):

**Core Agents**:
- **Trigger** - Entry point, intent detection, domain routing, recursive workflow support
- **Orchestrator** - Phase management conductor (planning → executing → validating)
- **HITL** - Human-in-the-loop escalation for complex decisions

**Universal Workflow Agents** (NEW in V2):
- **Universal-Router** - Tier classification across all domains via config
- **Universal-Planner** - Task decomposition across all domains via config
- **Universal-Executor** - Team coordination across all domains via config
- **Universal-Validator** - Quality gates across all domains via config
- **Universal-Self-Correct** - Adaptive recovery across all domains via config

**Universal Commands**: /trigger, /designer, /reviewer (work across all domains)

### @cagents/software (Default)

46 specialized software engineering team agents:

**Workflow**: Handled by universal agents + software domain configs
**Executive**: CEO, CTO, CFO, COO, VP Engineering
**Leadership**: Tech Lead, Architect, Senior Developer
**Development**: Frontend, Backend, QA, Security, DevOps, DBA
**Intelligence**: Pattern Recognition, Risk Assessment, Dependency Analyzer
**QA Layer**: Architecture Reviewer, Code Standards Auditor, Security Analyst

_Note: Domain-specific workflow agents (router, planner, executor, validator, self-correct) are deprecated in V2. Use universal workflow agents instead._

### @cagents/business (Fully Functional)

18 specialized business operations team agents:

**Workflow**: Handled by universal agents + business domain configs
**Executive**: CSO (Chief Strategy Officer)
**Strategic Management**: Business Development Manager, Market Analyst
**Operations**: Operations Manager, Process Improvement, Supply Chain, Quality Manager
**Project & Change**: Project Manager, Program Manager, Change Manager, Business Analyst
**Customer & Sales**: Customer Success Manager, Account Manager, Sales Operations Manager
**Specialized**: Risk Manager, Compliance Manager, Procurement Specialist, Facilities Manager

_Note: Domain-specific workflow agents (router, planner, executor, validator, self-correct) are deprecated in V2. Use universal workflow agents instead._

### @cagents/creative (Fully Configured)

17 creative writing team agents:

**Workflow**: Handled by universal agents + creative domain configs
**Executive**: CCO (Chief Creative Officer)
**Narrative**: Story Architect, Plot Developer, Narrative Designer
**Characters & World**: Character Designer, Character Psychologist, Worldbuilder, Setting Designer, Lore Keeper
**Craft**: Prose Stylist, Dialogue Specialist, Editor, Copy Editor
**Quality**: Continuity Checker, Research Specialist, Sensitivity Reader

_Note: Domain-specific workflow agents (router, planner, executor, validator, self-correct) are deprecated in V2. Use universal workflow agents instead._

## License

MIT License - See [LICENSE](LICENSE) for details.

## Version History

- **6.0.0** - V2 Universal Workflow Architecture: 5 universal agents replace 55 domain-specific workflow agents via configuration. All 11 domains fully configured (283 total agents: 8 core + 275 domain team agents). Recursive workflows support. Configuration-driven domain behavior.
- **5.0.0** - Orchestration V2 with realistic organizational hierarchy, 11 domains planned
- **4.1.0** - Complete business domain (23 agents), universal commands moved to core, 72 total agents
- **4.0.0** - cAgents multi-domain architecture (Phase 1: Core + Software)
- **3.0.x** - agent-design plugin (software engineering only)

---

Built with Claude Code
