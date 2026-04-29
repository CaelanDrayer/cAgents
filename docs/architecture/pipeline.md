# Progressive Pipeline

## Overview

The cAgents pipeline uses a state machine engine (`/run`) that reads `pipeline_config.yaml` and executes agents sequentially. v10 introduces progressive pipeline paths that skip unnecessary agents for simpler requests.

## State Machine

```
INIT -> ORCHESTRATED -> PLANNED -> DECOMPOSED -> PROMPTS_READY -> COORDINATED -> VALIDATED
                                                                                    |
                                                                              FAIL -> PROMPTS_READY
                                                                              REVISE -> PLANNED
```

## Pipeline Paths

### 9-Signal Complexity Scoring
| Signal | Weight | Description |
|--------|--------|-------------|
| Component count | High | Number of distinct components to build |
| Domain breadth | High | Number of domains involved |
| Requirement ambiguity | Medium | Clarity of requirements |
| Dependency depth | Medium | Complexity of dependency graph |
| Risk level | Medium | Security, data, infrastructure risk |
| Stakeholder count | Low | Number of stakeholders involved |
| Iteration likelihood | Low | Probability of revision needed |
| Timeline constraints | Low | Urgency of delivery |
| Novelty | Low | How novel vs routine the work is |

### Three Paths
| Path | Score Range | Agents | Typical Use |
|------|------------|--------|-------------|
| **Minimal** | < 0.25 | orchestrator, controller, validator | Bug fixes, typos, simple answers |
| **Medium** | 0.25 - 0.65 | orchestrator, planner, controller, validator | Feature additions, moderate changes |
| **Full** | >= 0.65 | orchestrator, planner, decomposer, prompt-engineer, controller, validator | Complex systems, multi-component |

## Pipeline Agents

| State | Agent | Output | Purpose |
|-------|-------|--------|---------|
| INIT | orchestrator | enriched_context.yaml | Context enrichment |
| ORCHESTRATED | universal-planner | plan.yaml | Objectives + controller selection |
| PLANNED | task-decomposer | work_items.yaml | Work item decomposition |
| DECOMPOSED | prompt-engineer | delegation_prompts.yaml | Optimized delegation prompts |
| PROMPTS_READY | controller | coordination_log.yaml | Question-based coordination |
| COORDINATED | universal-validator | validation_report.yaml | Quality validation |

## Revision Routing

| Outcome | Route To | Max Cycles | Purpose |
|---------|----------|------------|---------|
| PASS | VALIDATED (complete) | - | All criteria met |
| FAIL | PROMPTS_READY | 5 | Re-execute with feedback |
| REVISE | PLANNED | 5 | Re-plan with feedback |

After 5 cycles: escalate to user (HITL).

## Controller-Level Revision

Controllers include internal reviewer loops:
1. Executor implements work item
2. Reviewer evaluates against acceptance criteria
3. If REVISE: executor gets feedback, tries again (max 3 rounds)
4. If still REVISE after 3 rounds: accept best result, escalate to validator

## Configuration

Pipeline is defined in `cagents-memory/_system/config/pipeline_config.yaml`:
```yaml
version: "2.0"
states:
  INIT:
    agent: cagents:orchestrator
    next: ORCHESTRATED
    outputs: [enriched_context.yaml]
  # ...

progressive_pipeline:
  minimal:
    threshold: 0.25
    stages: [INIT, PROMPTS_READY, COORDINATED, VALIDATED]
  medium:
    threshold: 0.65
    stages: [INIT, ORCHESTRATED, PROMPTS_READY, COORDINATED, VALIDATED]
  full:
    threshold: 1.0
    stages: [INIT, ORCHESTRATED, PLANNED, DECOMPOSED, PROMPTS_READY, COORDINATED, VALIDATED]

revision:
  max_cycles: 5
  on_fail: PROMPTS_READY
  on_revise: PLANNED
```
