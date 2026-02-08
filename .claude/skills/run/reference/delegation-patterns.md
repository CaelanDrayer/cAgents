# /run Delegation Patterns

## Delegation Chain

Every request follows this chain, with each arrow being a Task tool invocation:

```
/run -> trigger -> orchestrator -> controller -> execution_agents
```

## What Each Agent Does

| Agent | Responsibility |
|-------|---------------|
| **trigger** | Domain detection, intent classification, template matching, pre-flight validation |
| **orchestrator** | Phase conductor (routing -> planning -> coordinating -> executing -> validating) |
| **controller** | Question-based delegation, synthesis, implementation coordination |
| **execution agents** | Actual implementation work (coding, writing, analysis) |

## Trigger Agent Capabilities

1. **Context-aware domain detection** (project structure, git history, frameworks)
2. **Intent classification** (bug fix, feature, question, etc.)
3. **Template matching** (12 pre-defined templates)
4. **Pre-flight validation** (4-level: context, feasibility, resources, conflicts)
5. **Interactive mode** (if enabled, ask user preferences)
6. **Dry-run preview** (if enabled, show plan without executing)
7. **Instruction initialization** with enhanced metadata
8. **Delegation to orchestrator** with recommendations

## Domain-to-Controller Mapping

| Request Type | Domain | Controller |
|-------------|--------|-----------|
| "Fix auth bug" | Make (engineering) | engineering-manager |
| "Write fantasy story" | Make (creative) | creative-director |
| "Plan Q4 campaign" | Grow | campaign-manager / marketing-strategist |
| "Create budget" | Operate | finance-manager / cfo |
| "Hire software engineer" | People | hr-manager |
| "Handle customer complaint" | Serve | customer-success-manager |
| "Design game mechanics" | Make (game dev) | game-designer |

## Configuration Files

| Config | Path | Purpose |
|--------|------|---------|
| Domain detection | `Agent_Memory/_system/trigger/domain_detection.yaml` | Detection rules |
| Workflow templates | `Agent_Memory/_system/trigger/workflow_templates.yaml` | Template catalog |
| Pre-flight validation | `Agent_Memory/_system/trigger/preflight_validation.yaml` | Validation framework |
| Workflow analytics | `Agent_Memory/_system/trigger/workflow_analytics.yaml` | Analytics config |
| Aggressive delegation | `Agent_Memory/_system/config/aggressive_delegation.yaml` | Delegation policy |

## Session Structure

```
Agent_Memory/sessions/run_{YYYYMMDD_HHMMSS}/
├── instruction.yaml
├── status.yaml
├── task_plan.md
├── findings.md
├── progress.md
├── workflow/
│   ├── plan.yaml
│   ├── decomposition.yaml
│   ├── coordination_log.yaml
│   └── execution_summary.yaml
├── waypoints/
├── tasks/
├── outputs/
└── validation/
```

## Important Notes

- This command is a thin wrapper - all logic is in agents
- Trigger agent handles detection, validation, and initialization
- Orchestrator handles phase transitions with adaptive execution
- Universal workflow agents (router, planner, executor, validator) handle execution
- See `core/agents/trigger/SKILL.md` and `core/agents/orchestrator/SKILL.md` for complete logic
