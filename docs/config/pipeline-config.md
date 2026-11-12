# Pipeline Configuration

## Location

`cagents-memory/_system/config/pipeline_config.yaml`

## Structure (v12.0.0 5-state collapse)

In v12.0.0 the pipeline collapsed from 7 states to 5. `task-decomposer` and
`prompt-engineer` were absorbed into `planner`. Legacy names resolve through
`scripts/migration/v12-aliases.yaml`.

In v12.3.0 the score-based path selector was deleted. The file has no
`paths:` block. Two named paths remain, and `/act` selects them in its skill
body, not in this file. The `fast` path skips the orchestrator (`INIT`) for
tier-2-clear requests. The `standard` path runs all 5 states. See
`docs/architecture/pipeline.md` and
`.claude/skills/act/reference/adaptive-pipeline.md`.

The excerpt below omits the comments and the `description:` fields.

```yaml
version: "2.0"
max_nesting_depth: 3

states:
  INIT:
    agent: cagents:orchestrator
    next: ORCHESTRATED
    outputs: [enriched_context.yaml]
  ORCHESTRATED:
    agent: cagents:planner
    next: PLANNED
    inputs: [enriched_context.yaml]
    outputs: [plan.yaml, work_items.yaml]
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

revision:
  max_cycles: 3
  on_fail: PLANNED
  on_revise: PLANNED
  escalation: user_hitl

controller_revision:
  max_internal_rounds: 2
  escalation: dead_letter

classification_mapping:
  PARTIAL_PASS: PASS

signals:
  enabled: true
  check_interval: before_transition
  signal_dir: signals/
  supported: [PAUSE, STOP, RESUME]
```

## Key Concepts

- **States**: Each state has an agent, inputs, outputs, and a next state.
- **Nesting**: `max_nesting_depth: 3` is the subagent nesting ceiling. The skill loop is depth 0.
- **Revision routing**: A FAIL or a REVISE verdict routes back to PLANNED. After 3 cycles, the pipeline escalates to the user.
- **Reviewer loop**: Inside the PLANNED state, a controller runs at most 2 executor and reviewer rounds for each item. After that, the item goes to the dead-letter list.
- **Classification mapping**: A `PARTIAL_PASS` verdict counts as `PASS`. The dead-letter items are reported, but they do not block the pipeline.
- **Signals**: A `PAUSE`, `STOP`, or `RESUME` file in the session `signals/` folder controls the run before each transition.
- **Terminal state**: VALIDATED ends the pipeline.
- **v12 absorption**: `task-decomposer` and `prompt-engineer` were folded into
  `planner` in v12.0.0. Controllers use standard delegation prompts.
