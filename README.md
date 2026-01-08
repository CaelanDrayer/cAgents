# cAgents

**Universal Multi-Domain Agent System for Claude Code**

cAgents transforms AI-assisted work across any domain - software engineering, creative writing, business operations, and beyond - through specialized agent teams that collaborate autonomously.

## Overview

cAgents is a modular ecosystem where you install domain plugins based on your needs:

- **Software engineers** get `@cagents/software` (46 specialized agents)
- **Writers** get `@cagents/creative` (18 agents for novels, stories, worldbuilding)
- **Business teams** get domain-specific plugins for Sales, Marketing, Finance, etc.

All domains share the same core infrastructure and work together seamlessly.

## Architecture

```
cAgents/
+-- core/           # @cagents/core - Required foundation
|   +-- agents/     # Trigger, Orchestrator, HITL
|   +-- memory/     # Agent_Memory system
|   +-- commands/   # /trigger command
|
+-- software/       # @cagents/software - Software engineering
|   +-- agents/     # 46 specialized agents
|   +-- commands/   # /designer, /reviewer, /plugins
|
+-- creative/       # @cagents/creative - Creative writing (Phase 2)
+-- sales/          # @cagents/sales - Sales strategy (Future)
+-- marketing/      # @cagents/marketing - Marketing campaigns (Future)
+-- finance/        # @cagents/finance - Financial analysis (Future)
+-- operations/     # @cagents/operations - Process optimization (Future)
+-- support/        # @cagents/support - Customer success (Future)
+-- hr/             # @cagents/hr - Human resources (Future)
+-- legal/          # @cagents/legal - Legal compliance (Future)
```

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

# Domain-specific commands (software)
/designer   # Interactive design assistant
/reviewer   # Comprehensive code review
/plugins    # List available agents
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

Shared infrastructure for all domains:
- **Trigger** - Entry point, intent detection, domain routing
- **Orchestrator** - Phase management (planning -> executing -> validating)
- **HITL** - Human-in-the-loop escalation for complex decisions

### @cagents/software (Default)

46 specialized software engineering agents:

**Workflow**: Router, Planner, Executor, Validator, Self-Correct
**Executive**: CEO, CTO, CFO, COO, VP Engineering
**Leadership**: Tech Lead, Architect, Senior Developer
**Development**: Frontend, Backend, QA, Security, DevOps, DBA
**Intelligence**: Pattern Recognition, Risk Assessment, Dependency Analyzer
**QA Layer**: Architecture Reviewer, Code Standards Auditor, Security Analyst

### @cagents/creative (Phase 2)

18 creative writing agents (coming soon):

**Narrative**: Story Architect, Plot Designer, Scene Crafter
**Worldbuilding**: Character Developer, Location Specialist, Systems Designer, Historian
**Craft**: Writer, Dialogue Specialist, Style Editor
**Quality**: Continuity Checker, Pacing Analyst, Emotion Tracker

## License

MIT License - See [LICENSE](LICENSE) for details.

## Version History

- **4.0.0** - cAgents multi-domain architecture (Phase 1: Core + Software)
- **3.0.x** - agent-design plugin (software engineering only)

---

Built with Claude Code
