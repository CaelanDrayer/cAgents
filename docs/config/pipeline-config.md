# Pipeline Configuration

## Location

`cagents-memory/_system/config/pipeline_config.yaml`

## Structure (v12.0.0 — 5-state collapse)

In v12.0.0 the pipeline collapsed from 7 states to 5. `task-decomposer` and
`prompt-engineer` were absorbed into `universal-planner` per Q1 of the v12
revamp. Legacy names are preserved via `scripts/migration/v12-aliases.yaml`.

```yaml
version: "2.0"

states:
  INIT:
    agent: cagents:orchestrator
    next: ORCHESTRATED
    outputs: [enriched_context.yaml]
  ORCHESTRATED:
    agent: cagents:planner
    next: PLANNED
    inputs: [enriched_context.yaml]
    outputs: [plan.yaml, objectives.yaml]
  PLANNED:
    agent: dynamic  # resolved from plan.yaml controller_assignment
    next: COORDINATED
    inputs: [plan.yaml, work_items.yaml]
    outputs: [coordination_log.yaml]
    nested_execution: true
  COORDINATED:
    agent: cagents:validator
    next: VALIDATED
    inputs: [coordination_log.yaml, work_items.yaml]
    outputs: [validation_report.yaml]
  VALIDATED:
    terminal: true

paths:
  minimal:
    threshold: 0.25
    states: [PLANNED, COORDINATED, VALIDATED]
  medium:
    threshold: 0.65
    states: [PLANNED, COORDINATED, VALIDATED]
  full:
    threshold: 1.0
    states: [INIT, ORCHESTRATED, PLANNED, COORDINATED, VALIDATED]

revision:
  max_cycles: 3  # lowered 5 -> 3 in v12.0.0 (audit basis: lower-cap-safe)
  on_fail: PLANNED
  on_revise: PLANNED
  escalation: user_hitl
```

## Key Concepts

- **States**: Each state has an agent, inputs, outputs, and next state
- **Progressive paths**: Complexity scoring determines which states to skip
- **Revision routing**: FAIL re-executes from PLANNED, REVISE re-plans
- **Terminal state**: VALIDATED ends the pipeline
- **v12 absorption**: `task-decomposer` and `prompt-engineer` were folded into
  `universal-planner`'s resources/ in v12.0.0; controllers fall back to
  standard prompts (formerly produced by prompt-engineer).
