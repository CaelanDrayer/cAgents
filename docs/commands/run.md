# /run - Event-Driven Pipeline Engine

## Usage
```bash
/run <request>
/run Fix auth bug                    # Engineering (tier 2)
/run Write fantasy story             # Creative (tier 2)
/run Plan Q4 campaign                # Business (tier 3)
/run Build microservice --analytics  # With execution analytics
/run --resume <session_id>           # Resume interrupted session
```

## How It Works

1. Classifies request into domain + complexity tier
2. Selects pipeline path (minimal/medium/full) based on complexity scoring
3. Runs pipeline agents sequentially via state machine
4. Controllers spawn executors + reviewers at level 2
5. Validator produces PASS/FAIL/REVISE

## Pipeline Paths

| Path | Complexity | Agents |
|------|-----------|--------|
| Minimal | Simple fixes, typos | orchestrator -> controller -> validator |
| Medium | Features, moderate | orchestrator -> planner -> controller -> validator |
| Full | Complex systems | orchestrator -> planner (runs full decomposition + delegation-prompt assembly internally) -> controller -> validator (task-decomposer + prompt-engineer were folded into planner in v12.0.0; 5-state pipeline) |

## Options

- `--analytics`: Show execution timing and agent performance
- `--resume <id>`: Resume an interrupted session
- `--team`: Redirect to /team for parallel execution
- `--dry-run`: Preview domain/tier classification without executing

## Context Mode

`context: none` -- runs inline (not forked) to minimize subagent nesting.

## Session Files

Written to `cagents-memory/sessions/run_{timestamp}/`:
- `instruction.yaml`, `status.yaml`
- `workflow/enriched_context.yaml`, `workflow/plan.yaml`
- `workflow/work_items.yaml`, `workflow/delegation_prompts.yaml`
- `workflow/coordination_log.yaml`
- `validation/validation_report.yaml`

## See Also
- [Pipeline Architecture](../architecture/pipeline.md)
- [Controller Architecture](../architecture/controllers.md)
