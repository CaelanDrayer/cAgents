# Getting Started with cAgents V10.0.0

Quick start guide for the cAgents universal multi-domain agent system.

## Prerequisites

- Claude Code CLI installed
- Git repository (recommended)
- Node.js (optional, recommended for advanced hooks)

## Quick Start

### 1. Install cAgents

```bash
# Clone the repository
git clone https://github.com/CaelanDrayer/cAgents.git
cd cAgents
./setup.sh  # Configures hooks based on Node.js availability

# Or add as a plugin to existing project
claude --plugin-dir /path/to/cAgents
```

### 2. Run Your First Workflow

```bash
# Basic usage - auto-detects domain
/run Fix the login bug

# Creative work
/run Write a marketing email

# Complex task
/run Add user authentication
```

### 3. Understand the Output

cAgents will:
1. **Detect domain** (engineering, creative, business, growth, people, service, leadership)
2. **Classify tier** (2-4 based on complexity, minimum tier 2 enforced)
3. **Select controllers** (coordinate work via questions)
4. **Execute workflow** (routing -> planning -> coordinating -> executing -> validating)
5. **Report results** (validation status and outputs)

## Core Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `/run` | Universal workflow entry point | `/run Fix auth bug` |
| `/team` | Parallel team execution | `/team Build user dashboard` |
| `/designer` | Interactive design exploration | `/designer` |
| `/review` | Code and content review | `/review src/` |
| `/optimize` | Universal optimization | `/optimize` |
| `/helper` | Interactive command guide | `/helper` |

## Understanding Workflows

### Complexity Tiers

| Tier | Type | Duration | Example |
|------|------|----------|---------|
| 2 | Moderate | 15-45 min | "Fix bug", "What is X?", "Fix typo" |
| 3 | Complex | 1-4 hours | "Add feature" |
| 4 | Expert | 4+ hours | "Major refactor" |

**Note**: Tiers 0-1 are deprecated and automatically upgraded to Tier 2.

### Workflow Phases

```
routing -> planning -> coordinating -> executing -> validating
```

1. **Routing**: Detects domain, classifies complexity tier
2. **Planning**: Defines objectives, selects controllers
3. **Coordinating**: Controllers ask questions, synthesize answers
4. **Executing**: Implementation based on coordinated solution
5. **Validating**: Quality gates verify outputs

## Business Domains

cAgents supports 8 business domains:

| Domain | Agents | Keywords | Example Requests |
|--------|--------|----------|-----------------|
| **engineering** | 33 | fix, bug, feature, code, api, database, architecture | "Fix auth bug", "Add user model" |
| **creative** | 24 | write, story, content, narrative, game, design | "Write a novel", "Design game levels" |
| **business** | 33 | budget, forecast, operations, procurement, product | "Create annual budget", "Plan product roadmap" |
| **growth** | 36 | campaign, sales, marketing, SEO, leads | "Plan Q4 launch", "Improve conversions" |
| **people** | 19 | recruit, onboard, culture, HR, talent | "Design onboarding program" |
| **service** | 33 | support, legal, compliance, contract | "Review vendor contract" |
| **leadership** | 10 | strategy, C-suite, executive decisions | "Align executive strategy" |
| **shared** | 4 | cross-domain utilities | (auto-selected) |

## Agent Architecture

```
Tier 1: Core Infrastructure (15 agents)
  - orchestrator, trigger, hitl, optimizer, team-trigger, team-lead-adapter,
    universal-router, universal-planner, universal-executor, universal-validator,
    universal-self-correct, task-consolidator, task-decomposer, task-inventory,
    prompt-engineer

Tier 2: Controllers
  - engineering-manager, architect, campaign-manager...

Tier 3: Execution
  - backend-developer, copywriter, financial-analyst...

Tier 4: Support
  - scribe, data-extractor...
```

**Total**: 207 agents (15 core + 4 shared + 10 leadership + 178 domain specialists)

**Key Concept**: Controllers coordinate work via question-based delegation. They ask questions to specialists, synthesize answers, and coordinate implementation.

**Event-Driven Pipeline (V9.23+)**: `/run` is a config-driven state machine reading `pipeline_config.yaml`. Each enrichment agent runs sequentially at level 1. Controllers spawn executors and reviewers at level 2 with revision loops.

## Configuration

### Agent Memory Structure

```
Agent_Memory/
├── _system/           # Registry, configs
├── _knowledge/        # Patterns, learnings
└── sessions/          # Per-command sessions (standardized)
    └── {command}_{YYYYMMDD_HHMMSS}/
        ├── instruction.yaml
        ├── status.yaml
        ├── workflow/
        └── outputs/
```

### Project Memory

```
.claude/
├── rules/             # Modular rules (20 files across 5 categories)
├── hooks/             # CJS hook implementations (18 files: 15 hooks + utils + launcher + eval CLI)
├── skills/            # Skill definitions (run, team, designer, review, optimize, helper)
└── settings.json      # Hook registration, permissions, and environment
```

## Advanced Usage

### Advanced Flags

```bash
# Dry run (preview without executing)
/run Add feature --dry-run

# Interactive mode (asks preferences)
/run Refactor auth --interactive

# Template-based
/run Fix bug --template bug_fix

# Stream progress
/run Deploy --stream
```

### Hooks

cAgents uses a CJS-only hook system (V9.5+) with the `createHook()` factory pattern:

```
.claude/hooks/
├── hook-utils.cjs         # Shared utilities and createHook() factory
├── run-hook.cjs           # Hook launcher (all hooks invoked via this)
├── session-catchup.cjs    # SessionStart: detect incomplete sessions
├── team-stop.cjs          # SessionEnd: finalize team metrics
├── verify-completion.cjs  # Stop: verify completion criteria
├── bash-validator.cjs     # PreToolUse[Bash]: block dangerous commands
├── secret-detection.cjs   # PreToolUse[Write|Edit]: detect secrets
├── subagent-tracker.cjs   # SubagentStart: log agent spawns
├── ...                    # + 7 more hooks (15 total)
└── eval-runner.cjs        # CLI tool: quality evaluations
```

Hook registration is in `.claude/settings.json`. See `.claude/rules/core/hooks.md` for full documentation.

### Scripts

Bash utilities for programmatic access:

```bash
# Initialize workflow
./scripts/commands/trigger-init.sh "Fix bug"

# Discover agents
./scripts/utils/agent-discovery.sh count

# Generate manifests
./scripts/utils/manifest-generator.sh all
```

## Best Practices

1. **Use /run for all workflows** - It auto-routes to the right domain
2. **Start with --interactive** for new workflow types
3. **Use --dry-run** to preview complex workflows
4. **Don't ask Claude for permission** - Workflows proceed automatically
5. **Check Agent_Memory/** for workflow state and outputs

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Wrong domain detected | Use explicit domain keywords |
| Workflow stuck | Check `Agent_Memory/{id}/status.yaml` |
| No progress updates | Ensure TodoWrite is being used |
| Missing outputs | Check `Agent_Memory/{id}/outputs/` |

## Next Steps

1. Read [CLAUDE.md](../CLAUDE.md) for full architecture details
2. Explore [ARCHITECTURE.md](ARCHITECTURE.md) for architecture design
3. Check [workflow_agent_interactions.md](../workflow_agent_interactions.md) for patterns
4. Review domain-specific agents in `{domain}/agents/`

---

**Version**: 10.0.0
**Questions?** Check the troubleshooting guide or explore the codebase.
