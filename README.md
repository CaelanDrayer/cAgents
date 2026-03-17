# cAgents

**Universal Multi-Domain Agent System for Claude Code**

208 agents across 8 business domains. One command handles any request -- engineering, creative, business, people, or service work -- through coordinated specialist agents with quality gates.

## Usage Warning

cAgents spawns multiple subagents per request (3-10+). Each consumes API tokens independently. A single `/run` can use 10-50x more tokens than a direct Claude Code interaction. `/team` and `/org` amplify this further. Monitor usage closely.

## Requirements

- **Claude Code 2.1.69+** (required)
- **Node.js** (recommended) -- powers 16 CJS hooks for session management, secret detection, team coordination, and completion verification

| cAgents | Min Claude Code | Highlights |
|---------|----------------|------------|
| 10.6.0+ | 2.1.69+ | Confidence tiers, blind review, handoff documents |
| 10.5.0+ | 2.1.69+ | Clean team lifecycle, hook reliability |
| 10.0-10.4 | 2.1.47+ | Custom model routing in teammates |

## Installation

```bash
# From Claude Code Marketplace
/plugin CaelanDrayer/cAgents

# Manual
git clone https://github.com/CaelanDrayer/cAgents.git
cd cAgents && ./setup.sh
```

## Quick Start

```bash
/run Fix the authentication bug          # Engineering
/run Write a sci-fi short story          # Creative
/run Plan Q4 product launch campaign     # Business
/run Design onboarding program           # People
/run Create knowledge base article       # Service
```

The system automatically detects domain, selects controllers, and orchestrates specialist agents through the full pipeline.

## Commands

| Command | What it does |
|---------|-------------|
| `/run` | Execute any task through auto-routed specialist agents |
| `/team` | Parallel multi-agent execution with wave-based quality gates |
| `/org` | Cross-domain strategy via C-suite agents and sequential teams |
| `/designer` | Interactive design exploration with guided Q&A |
| `/review` | Quality review with parallel specialists and auto-fix |
| `/optimize` | Performance optimization with before/after metrics |
| `/helper` | Command guide that recommends the right skill |
| `/context` | Shared product context that persists across sessions |

## Architecture

```
User Request -> /run (state machine loop)
  -> orchestrator     (context enrichment)
  -> planner          (objectives + controller selection)
  -> decomposer       (work items with acceptance criteria)
  -> prompt-engineer  (optimized delegation prompts)
  -> controller       (question-based coordination + reviewer loops)
  -> validator         (quality gates -> PASS/FAIL/REVISE)
```

Controllers ask questions of specialist agents, synthesize answers, and coordinate implementation. The validator drives revision routing: FAIL re-runs the controller, REVISE re-runs the planner (max 5 cycles).

### Domains

| Domain | Agents | Scope |
|--------|--------|-------|
| **Engineering** | 32 | Software, infrastructure, security, QA, game dev |
| **Creative** | 30 | Writing, narrative, literary criticism, game art, audio |
| **Business** | 31 | Strategy, product, operations, finance |
| **Growth** | 35 | Marketing, sales, revenue operations |
| **People** | 19 | HR, talent acquisition, culture |
| **Service** | 32 | Customer support, CX, legal, compliance |
| **Leadership** | 10 | C-suite executives (used by /org) |
| **Core** | 15 | Pipeline infrastructure agents |
| **Shared** | 4 | Cross-domain intelligence |

### Complexity Tiers

| Tier | Coordination | Example |
|------|-------------|---------|
| 2 (Moderate) | 1 controller | Fix a bug, answer a question |
| 3 (Complex) | 1 primary + 1-2 supporting | Add a feature, create a system |
| 4 (Expert) | Executive + primary + supporting + HITL | Major refactor, architecture migration |

## Key Features

- **Event-driven pipeline** -- config-driven state machine with revision routing
- **Controller-centric coordination** -- question-based delegation to specialists
- **Reviewer loops** -- acceptance criteria validation with blind review for tier 3+
- **N-wave parallel teams** -- 40-60% time reduction with per-wave quality gates
- **Confidence scoring** -- 0.0-1.0 per work item, low scores trigger extra scrutiny
- **16 CJS hooks** -- session management, secret detection, attention injection, team lifecycle

## Documentation

| Resource | Content |
|----------|---------|
| `CLAUDE.md` | Complete architecture and agent reference |
| `docs/` | 19 guides (architecture, commands, skills, team mode, etc.) |
| `.claude/rules/` | 20 modular topic-specific rules |
| `SECURITY.md` | Security policy and vulnerability reporting |

## Version History

See `docs/RELEASE_NOTES.md` for detailed history. Recent:

- **V10.15.0** -- Redesigned TodoWrite templates with hierarchy, indentation, and granularity
- **V10.14.0** -- Post-completion follow-up handling in /run pipeline
- **V10.13.1** -- /run state machine duration_ms, events/index.yaml, execution_summary fixes
- **V10.13.0** -- Standardize session tracking schemas across all 6 skills
- **V10.12.1** -- File locking for agent_tree.yaml to prevent race conditions
- **V10.12.0** -- AgentPath plugin integration with 15 session visualization improvements
- **V10.11.0** -- Agent reorganization (5 consolidations, 11 renames, 3 tier fixes), gstack-inspired improvements
- **V10.9.0** -- Documentation overhaul, concise help text, version-registry rule
- **V10.8.0** -- Agent relationship injection, expanded routing, 38 audit fixes
- **V10.7.1** -- AI writing tools with humanizer patterns
- **V10.6.0** -- Confidence tiers, blind review, dead-letter queue, handoff documents, signal file intervention
- **V10.5.0** -- Clean team lifecycle, hook reliability
- **V10.3.0** -- Creative domain overhaul (24->30 agents, all on Opus 4.6)
- **V10.0.0** -- 8 business domains, agent chaining with topological execution

## AgentPath - Session Visualizer

[AgentPath](https://github.com/CaelanDrayer/AgentPath) *(incoming)* is a companion web UI for visualizing cAgents session data. It reads from `Agent_Memory/sessions/` and renders agent trees, pipeline timelines, work item DAGs, and file change logs in real time.

## License

MIT License - See [LICENSE](LICENSE) for details.

---

**Built with Claude Code** | 208 agents across 8 business domains | Powered by Claude Opus 4.6, Sonnet 4.6, and Haiku 4.5
