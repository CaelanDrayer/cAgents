# cAgents

**Universal Multi-Domain Agent System for Claude Code**

V7.3.0 - Production-ready controller-centric architecture with 229 agents across 5 super-domains. Game Dev Edition.

## Overview

cAgents transforms AI-assisted work across any domain through specialized agent teams that collaborate autonomously. From software engineering to marketing, operations to creative work - one unified system handles it all.

**V7.3.0 Release** (2026-01-19):
- ✅ Game Development Edition: 28 new game dev agents added to Make domain
- ✅ Expanded Make domain: 80 → 108 agents (35% increase)
- ✅ Total agents: 201 → 229 (14% increase)
- ✅ Complete game dev pipeline: design, programming, art, audio, production

## Architecture

**V7.0 Controller-Centric Question-Based Delegation**

229 agents organized into:
- **Core** (10): Infrastructure (trigger, orchestrator, hitl, optimizer, 5 universal workflow agents)
- **Shared** (14): Cross-domain capabilities (leadership, planning, data, quality, customer, operations)
- **Make** (108): Creation (engineering, creative, product, devops, qa, **game development**)
- **Grow** (37): Acquisition (marketing, sales, partnerships)
- **Operate** (13): Operations (finance, operations, procurement)
- **People** (19): Talent (HR, culture, talent acquisition)
- **Serve** (28): Support & Governance (customer experience, legal, compliance, support)

```
User Request → Trigger → Orchestrator
    ↓
Routing (classify tier 0-4)
    ↓
Planning (define objectives)
    ↓
Coordinating (controller questions → specialists answer → synthesis)
    ↓
Executing (implementation)
    ↓
Validating (quality gates) → Complete
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
```

Then configure Claude Code to load the plugin directory.

## Quick Start

### Universal /trigger Command

One command handles ANY request type - routing happens automatically:

```bash
# Engineering work
/trigger Fix the authentication bug

# Creative writing
/trigger Write a sci-fi short story about AI

# Marketing
/trigger Plan Q4 product launch campaign

# Operations
/trigger Create annual budget for 2027

# HR/People
/trigger Design onboarding program for engineers

# Customer Support
/trigger Create knowledge base article about refunds
```

The system automatically:
1. Analyzes your request and identifies intent
2. Routes to the appropriate super-domain (Make/Grow/Operate/People/Serve)
3. Classifies complexity tier (0-4)
4. Selects appropriate controllers and execution agents
5. Orchestrates the workflow through all phases
6. Delivers validated results

### Complexity Tiers

| Tier | Type | Coordination | Example | Workflow |
|------|------|--------------|---------|----------|
| 0 | Trivial | None | "What is X?" | routing → answer |
| 1 | Simple | None | "Fix typo" | routing → planning → executing → validating |
| 2 | Moderate | 1 controller | "Fix bug" | routing → planning → **coordinating** → executing → validating |
| 3 | Complex | 1 primary + 1-2 supporting | "Add feature" | routing → planning → **coordinating** → executing → validating |
| 4 | Expert | 1 executive + 1 primary + 2-4 supporting + HITL | "Major refactor" | routing → planning → **coordinating** → executing → validating + HITL |

### Universal Commands

```bash
/designer   # Interactive design assistant (works across all domains)
/reviewer   # Comprehensive review (code, documents, strategies, campaigns)
/optimize   # Universal optimizer (8 types: code, content, process, data, infrastructure, campaign, creative, sales)
```

## Super-Domains

### Make (Creation) - 108 agents
Engineering, creative writing, product design, devops, QA, **game development**
- **Controllers**: engineering-manager, architect, creative-director, product-manager, game-director, cto, cco
- **Execution**: backend-developer, frontend-developer, copywriter, story-architect, gameplay-programmer, level-designer, game-artist, audio-engineer, qa-lead, security-specialist
- **Use cases**: Software development, creative content, product design, technical writing, **game development (Unity, Unreal, Godot)**

### Grow (Acquisition) - 37 agents
Marketing, sales, partnerships
- **Controllers**: marketing-strategist, campaign-manager, sales-strategist, cro
- **Execution**: content-strategist, copywriter, seo-specialist, sales-development-rep, account-executive
- **Use cases**: Marketing campaigns, sales strategies, content marketing, SEO, demand generation

### Operate (Operations) - 13 agents
Finance, operations, procurement
- **Controllers**: operations-manager, finance-manager, cfo, coo
- **Execution**: financial-analyst, budget-analyst, procurement-specialist, supply-chain-manager
- **Use cases**: Financial planning, budgeting, operations optimization, procurement

### People (Talent) - 19 agents
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

### Enhanced Commands (V7.0)
- **Trigger V2.0**: 2-3x faster initialization, 90%+ domain accuracy, context-aware detection
- **Designer V2.0**: Smart chunking, context discovery, adaptive questioning
- **Optimizer V7.0**: Zero-arg invocation, auto-detection, 8 optimization types
- **Reviewer V3.0**: 33% faster, 81% faster to critical issues, 98% more actionable suggestions

### Ralph Loop-Inspired Bash Infrastructure
6 library modules with 86 functions, 14 lifecycle hooks, atomic file operations, markdown frontmatter state management.

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

## Documentation

- **CLAUDE.md** - Complete architecture, commands, and agent reference (this is the main documentation)
- **README.md** - Quick start guide (this file)
- **docs/** - Implementation guides, standards, optimization tracking
- **.claude/rules/** - Modular topic-specific rules (controllers, execution, memory, quality)

## Performance

**V7.0 Architecture**:
- 30-40% simpler planning (objectives vs detailed tasks)
- 20-30% fewer tokens (no detailed task lists)
- Up to 50x speedup with parallel execution (swarm mode)

**Enhanced Commands**:
- Reviewer V3.0: 33% faster, 81% faster to critical issues
- Optimizer V7.0: 20-50% faster code, 30-60% smaller bundles
- Task consolidation: 40-88% context reduction

**V7.3.0 Game Dev Edition**:
- 28 new game development agents (complete pipeline coverage)
- Make domain expanded: 80 → 108 agents
- Total agents: 229 (10 core + 14 shared + 205 domain specialists)
- Game engines supported: Unity, Unreal Engine, Godot

## Version History

- **V7.3.0** (2026-01-19) - Game Development Edition: 28 new game dev agents, Make domain expanded to 108 agents, total 229 agents
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

**Built with Claude Code** | **cAgents V7.3.0 Game Dev Edition** | 229 agents across 5 super-domains
