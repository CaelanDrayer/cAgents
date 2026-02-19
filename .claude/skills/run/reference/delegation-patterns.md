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

## CRITICAL: /run Never Handles Directly

The `/run` command is a **pure delegation proxy**. It exists solely to invoke the trigger agent. If the user wanted direct handling, they would type their request without `/run`.

**The user chose `/run` = the user wants agent orchestration. Respect that choice unconditionally.**

### Anti-Patterns (NEVER DO ANY OF THESE)

| Anti-Pattern | Why It Is Wrong |
|-------------|----------------|
| "This is simple, I'll just answer directly" | /run does not evaluate simplicity. It delegates. Period. |
| "Let me fix that typo for you" | /run does not fix anything. It invokes trigger. |
| "The answer is 42" | /run does not answer questions. Agents answer questions. |
| "I'll skip delegation since the trigger would just..." | /run does not predict what trigger would do. It invokes trigger. |
| "Delegation failed, let me handle it instead" | /run reports failures. It does not become a fallback handler. |
| "This request doesn't need a full workflow" | /run does not assess what requests need. It delegates ALL requests. |

### What /run Does on EVERY Invocation (No Exceptions)

1. Parse flags from arguments
2. Create TodoWrite for visibility
3. Invoke trigger (or team-trigger) via Task tool
4. Report the result from the agent chain
5. Nothing else. Ever.

## Important Notes

- This command is a thin wrapper - all logic is in agents
- Trigger agent handles detection, validation, and initialization
- Orchestrator handles phase transitions with adaptive execution
- Universal workflow agents (router, planner, executor, validator) handle execution
- **If delegation is the only thing /run does, then /run can never fail to delegate**
- See `core/agents/trigger/SKILL.md` and `core/agents/orchestrator/SKILL.md` for complete logic
