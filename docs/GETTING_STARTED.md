# Getting Started with cAgents V8.0

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
1. **Detect domain** (Make, Grow, Operate, People, Serve)
2. **Classify tier** (2-4 based on complexity, minimum tier 2 enforced)
3. **Select controllers** (coordinate work via questions)
4. **Execute workflow** (routing -> planning -> coordinating -> executing -> validating)
5. **Report results** (validation status and outputs)

## Core Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `/run` | Universal workflow entry point | `/run Fix auth bug` |
| `/designer` | Interactive design exploration | `/designer` |
| `/review` | Code and content review | `/review src/` |
| `/optimize` | Universal optimization | `/optimize` |

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

## Super-Domains

cAgents supports 5 super-domains:

| Super-Domain | Agents | Keywords | Example Requests |
|--------------|--------|----------|-----------------|
| **Make** | 109 | fix, bug, feature, code, write, story, game | "Fix auth bug", "Write a novel" |
| **Grow** | 38 | campaign, sales, marketing, SEO | "Plan Q4 launch" |
| **Operate** | 13 | budget, forecast, operations, procurement | "Create annual budget" |
| **People** | 20 | recruit, onboard, culture, HR | "Design onboarding program" |
| **Serve** | 28 | support, legal, compliance, contract | "Review vendor contract" |

## Agent Architecture (V8.0)

```
Tier 1: Core (12 agents)
  - orchestrator, trigger, planner, executor, validator, hitl, optimizer,
    task-consolidator, task-decomposer, task-inventory, router, self-correct

Tier 2: Controllers (~53 agents)
  - engineering-manager, architect, campaign-manager...

Tier 3: Execution (~147 agents)
  - backend-developer, copywriter, financial-analyst...

Tier 4: Support (~19 agents)
  - scribe, data-extractor...
```

**Total**: 234 agents (12 core + 14 shared + 208 domain specialists)

**Key Concept**: Controllers coordinate work via question-based delegation. They ask questions to specialists, synthesize answers, and coordinate implementation.

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
├── rules/             # Modular rules (19 files across 5 categories)
├── hooks/             # Hook implementations (6 Node.js hooks)
└── settings.json      # Hook registration and settings
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

cAgents supports lifecycle hooks:

```bash
hooks/
├── hooks.json         # Hook registration
├── workflow/
│   └── stop-workflow.sh
├── phase/
└── hitl/
```

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

**Version**: 8.0.28
**Questions?** Check the troubleshooting guide or explore the codebase.
