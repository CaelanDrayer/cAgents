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

### Three Paths (v12.0.0 5-state pipeline)
| Path | Score Range | Agents | Typical Use |
|------|------------|--------|-------------|
| **Minimal** | < 0.25 | orchestrator, controller, validator | Bug fixes, typos, simple answers |
| **Medium** | 0.25 - 0.65 | orchestrator, planner, controller, validator | Feature additions, moderate changes |
| **Full** | >= 0.65 | orchestrator, planner, controller, validator (planner runs full decomposition + delegation-prompt assembly internally) | Complex systems, multi-component |

## Pipeline Agents (5-state machine since v12.0.0)

| State | Agent | Output | Purpose |
|-------|-------|--------|---------|
| INIT | orchestrator | enriched_context.yaml | Context enrichment |
| ORCHESTRATED | planner | plan.yaml + work_items.yaml (+ delegation_prompts.yaml on Full path) | Objectives + controller selection + decomposition + prompt assembly (task-decomposer and prompt-engineer were folded into the planner in v12.0.0) |
| PLANNED | controller | coordination_log.yaml | Question-based coordination (executes work items via Agent tool delegation + reviewer loops) |
| COORDINATED | validator | validation_report.yaml | Quality validation |
| VALIDATED | — | (complete) | Pipeline terminal state |

## Revision Routing

| Outcome | Route To | Max Cycles | Purpose |
|---------|----------|------------|---------|
| PASS | VALIDATED (complete) | - | All criteria met |
| FAIL | PLANNED | 3 | Re-execute controller with feedback (max_revision_cycles tightened from 5 → 3 in v12.0.0 per audit) |
| REVISE | ORCHESTRATED | 3 | Re-plan with feedback |

After 3 cycles: escalate to user (HITL).

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
