# /act - Event-Driven Pipeline Engine

## Usage
```bash
/act <request>
/act Fix auth bug                    # Engineering (tier 2)
/act Write fantasy story             # Creative (tier 2)
/act Plan Q4 campaign                # Business (tier 3)
/act Build microservice --analytics  # With execution analytics
/act --resume <session_id>           # Resume interrupted session
```

## How It Works

1. Classifies request into domain + complexity tier
2. Selects pipeline path (`fast` or `standard`) by tier — `fast` skips the orchestrator for tier-2-clear requests
3. Runs pipeline agents sequentially via state machine
4. Controllers spawn executors + reviewers at level 2
5. Validator produces PASS/FAIL/REVISE

## Pipeline Paths

| Path | When | States (5-state machine) |
|------|------|--------|
| `fast` | tier-2-clear (`tier == 2`, unambiguous domain, non-debug) | orchestrator (INIT) skipped → planner → controller → validator |
| `standard` | tier 3+, ambiguous tier-2, or debug mode | orchestrator → planner → controller → validator |

The pre-v12.3.0 score-based 3-path selector (minimal/medium/full, driven by a 9-signal complexity score) was removed in v12.3.0; the orchestrator-skip is now governed by an enumerated allowlist (task-decomposer + prompt-engineer were folded into the planner in v12.0.0). See [Pipeline Architecture](../architecture/pipeline.md).

## Options

- `--analytics`: Show execution timing and agent performance
- `--resume <id>`: Resume an interrupted session
- `--team`: Redirect to /team for parallel execution
- `--dry-run`: Preview domain/tier classification without executing

## Context Mode

`context: none` -- runs inline (not forked) to minimize subagent nesting.

## Session Files

Written to `cagents-memory/sessions/act_{timestamp}/`:
- `instruction.yaml`, `status.yaml`
- `workflow/enriched_context.yaml`, `workflow/plan.yaml`
- `workflow/work_items.yaml`
- `workflow/coordination_log.yaml`
- `validation/validation_report.yaml`

## See Also
- [Pipeline Architecture](../architecture/pipeline.md)
- [Controller Architecture](../architecture/controllers.md)
