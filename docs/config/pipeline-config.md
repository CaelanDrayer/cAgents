# Pipeline Configuration

## Location

`cagents-memory/_system/config/pipeline_config.yaml`

## Structure

```yaml
version: "2.0"

states:
  INIT:
    agent: cagents:orchestrator
    next: ORCHESTRATED
    outputs: [enriched_context.yaml]
  ORCHESTRATED:
    agent: cagents:universal-planner
    next: PLANNED
    inputs: [enriched_context.yaml]
    outputs: [plan.yaml]
  PLANNED:
    agent: cagents:task-decomposer
    next: DECOMPOSED
    inputs: [plan.yaml]
    outputs: [work_items.yaml]
  DECOMPOSED:
    agent: cagents:prompt-engineer
    next: PROMPTS_READY
    inputs: [work_items.yaml]
    outputs: [delegation_prompts.yaml]
  PROMPTS_READY:
    agent: "{controller_from_plan}"
    next: COORDINATED
    inputs: [delegation_prompts.yaml, work_items.yaml]
    outputs: [coordination_log.yaml]
  COORDINATED:
    agent: cagents:universal-validator
    next: VALIDATED
    inputs: [coordination_log.yaml]
    outputs: [validation_report.yaml]
  VALIDATED:
    terminal: true

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
  escalation: user_hitl
```

## Key Concepts

- **States**: Each state has an agent, inputs, outputs, and next state
- **Progressive paths**: Complexity scoring determines which states to skip
- **Revision routing**: FAIL re-executes, REVISE re-plans
- **Terminal state**: VALIDATED ends the pipeline
