# Getting Started with cAgents V7.5.1

Quick start guide for the cAgents universal multi-domain agent system.

## Prerequisites

- Claude Code CLI installed
- Git repository (recommended)
- Node.js (optional, for npm commands)

## Quick Start

### 1. Install cAgents

```bash
# Clone the repository
git clone https://github.com/CaelanDrayer/cAgents.git
cd cAgents

# Or add as a plugin to existing project
claude --plugin-dir /path/to/cAgents
```

### 2. Run Your First Workflow

```bash
# Basic usage - auto-detects domain
/trigger Fix the login bug

# With domain override
/trigger Write a marketing email --domain revenue

# Interactive mode (recommended for first time)
/trigger Add user authentication --interactive
```

### 3. Understand the Output

cAgents will:
1. **Detect domain** (engineering, creative, revenue, etc.)
2. **Classify tier** (0-4 based on complexity)
3. **Select controllers** (coordinate work via questions)
4. **Execute workflow** (routing -> planning -> coordinating -> executing -> validating)
5. **Report results** (validation status and outputs)

## Core Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `/trigger` | Universal workflow entry point | `/trigger Fix auth bug` |
| `/designer` | Interactive design exploration | `/designer` |
| `/reviewer` | Code and content review | `/reviewer src/` |
| `/optimize` | Universal optimization | `/optimize` |

## Understanding Workflows

### Complexity Tiers

| Tier | Type | Duration | Example |
|------|------|----------|---------|
| 0 | Trivial | Seconds | "What is X?" |
| 1 | Simple | Minutes | "Fix typo" |
| 2 | Moderate | 15-45 min | "Fix bug" |
| 3 | Complex | 1-4 hours | "Add feature" |
| 4 | Expert | 4+ hours | "Major refactor" |

### Workflow Phases

```
routing -> planning -> coordinating -> executing -> validating
```

1. **Routing**: Detects domain, classifies complexity tier
2. **Planning**: Defines objectives, selects controllers
3. **Coordinating**: Controllers ask questions, synthesize answers
4. **Executing**: Implementation based on coordinated solution
5. **Validating**: Quality gates verify outputs

## Domains

cAgents supports 8 domains:

| Domain | Keywords | Example Requests |
|--------|----------|-----------------|
| Engineering | fix, bug, feature, code | "Fix authentication bug" |
| Creative | write, story, character | "Write a fantasy novel" |
| Revenue | campaign, sales, marketing | "Plan Q4 launch" |
| Finance-Operations | budget, forecast, expense | "Create 2024 budget" |
| People-Culture | recruit, onboard, culture | "Design onboarding program" |
| Customer-Experience | support, feedback, SLA | "Improve support tickets" |
| Legal-Compliance | contract, GDPR, policy | "Review vendor contract" |
| Universal | analyze, document, review | "Document the API" |

## Agent Architecture (V7.0)

```
Tier 1: Core (10 agents)
  - orchestrator, trigger, planner, executor, validator...

Tier 2: Controllers (~50 agents)
  - engineering-manager, architect, campaign-manager...

Tier 3: Execution (~150 agents)
  - backend-developer, copywriter, financial-analyst...

Tier 4: Support (~19 agents)
  - scribe, data-extractor...
```

**V7.0 Key Concept**: Controllers coordinate work via question-based delegation. They ask questions to specialists, synthesize answers, and coordinate implementation.

## Configuration

### Agent Memory Structure

```
Agent_Memory/
├── _system/           # Registry, configs
├── _knowledge/        # Patterns, learnings
└── inst_{id}/         # Per-workflow state
    ├── instruction.yaml
    ├── status.yaml
    ├── workflow/
    └── outputs/
```

### Project Memory

```
.claude/
├── CLAUDE.md          # Project instructions
├── rules/             # Modular rules
├── cagents-session.local.md  # Session state
└── workflow/          # Active workflows
```

## Advanced Usage

### V2.0 Trigger Flags

```bash
# Dry run (preview without executing)
/trigger Add feature --dry-run

# Interactive mode (asks preferences)
/trigger Refactor auth --interactive

# Template-based
/trigger Fix bug --template bug_fix

# Stream progress
/trigger Deploy --stream
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

1. **Use /trigger for all workflows** - It auto-routes to the right domain
2. **Start with --interactive** for new workflow types
3. **Use --dry-run** to preview complex workflows
4. **Don't ask Claude for permission** - Workflows proceed automatically
5. **Check Agent_Memory/** for workflow state and outputs

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Wrong domain detected | Use `--domain` flag to override |
| Workflow stuck | Check `Agent_Memory/{id}/status.yaml` |
| No progress updates | Ensure TodoWrite is being used |
| Missing outputs | Check `Agent_Memory/{id}/outputs/` |

## Next Steps

1. Read [CLAUDE.md](../CLAUDE.md) for full architecture details
2. Explore [ARCHITECTURE.md](ARCHITECTURE.md) for architecture design
3. Check [workflow_agent_interactions.md](../workflow_agent_interactions.md) for patterns
4. Review domain-specific agents in `{domain}/agents/`

---

**Version**: 7.5.1
**Questions?** Check the troubleshooting guide or explore the codebase.
