# Agent Memory Structure

File-based memory organization for cAgents.

## Directory Structure

```
Agent_Memory/
├── _system/              # Registry, config, agent status
│   ├── domains/          # Domain configs (router, planner, executor, validator, self_correct)
│   ├── config/           # Global configuration
│   └── templates/        # Shared templates
├── _knowledge/           # Patterns, calibration, learnings
├── _archive/             # Completed instructions
└── {instruction_id}/     # Per-task working memory
    ├── instruction.yaml  # Request + metadata
    ├── status.yaml       # Current phase
    ├── workflow/         # Plan, coordination_log, execution state
    ├── tasks/            # pending/, in_progress/, completed/
    └── outputs/          # Deliverables
```

## V7.0 Key Files

Per instruction folder:

- `instruction.yaml` - User request, domain, metadata
- `status.yaml` - Current phase, phase history
- `workflow/plan.yaml` - Objectives + controller assignment (NOT tasks)
- `workflow/coordination_log.yaml` - Q&A exchanges, synthesis, tasks (V7.0)
- `workflow/execution_summary.yaml` - Aggregated outputs
- `validation/validation_report.yaml` - Quality checks

## Domain Configs

Each domain has 5 config files in `Agent_Memory/_system/domains/{domain}/`:

1. `router_config.yaml` - Tier classification logic
2. `planner_config.yaml` - Objectives + controller_catalog
3. `executor_config.yaml` - Execution monitoring patterns
4. `validator_config.yaml` - Quality gates
5. `self_correct_config.yaml` - Recovery patterns

## Memory Principles

- **File-based**: All state persists to disk
- **Instruction-scoped**: Isolated per task
- **Parallel-safe**: Multiple workflows simultaneously
- **Pause/resume**: Can stop and continue workflows
- **Git-ignored**: Agent_Memory/ excluded from version control
