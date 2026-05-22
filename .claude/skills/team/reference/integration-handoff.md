# Integration Handoff Contract

How the integration controller (final wave) hands off to the team lead so the lead never re-reads raw per-wave outputs.

## The Problem (CI-5 from enriched_context)

Today, Step 6a spawns an integration controller but the integration outputs flow back into lead context for final-validation handoff. The lead also holds N-1 waves' worth of coordination_log entries before writing the final coordination_log.yaml. That's a major late-run context spike.

## The Contract

The integration controller, spawned at depth-1 by the lead, MUST write TWO artifacts:

### 1. `integrated_outputs.yaml`

Location: `${SESSION_DIR}/outputs/integration/integrated_outputs.yaml`

Schema:
```yaml
schema_version: "1"
session_id: "{session_id}"
integration_controller: cagents:{controller_name}
integrated_at: "{ISO_TIMESTAMP}"
merged_artifacts:
  - source_wave: 1
    source_task: WI-2
    artifact_path: "outputs/wave-1/task-2/work_meta.yaml"
    consumed_by: "integration test runner"
  # one entry per merged artifact
cross_wave_conflicts:
  - description: "{conflict if any}"
    resolution: "{how resolved}"
  # empty array if none
status: complete | partial | failed
```

### 2. `integration_summary.md` (the only thing the lead reads)

Location: `${SESSION_DIR}/outputs/integration/integration_summary.md`

**Hard limit: ≤200 tokens.** The lead reads this and ONLY this. If the integration controller writes more, that's a contract violation.

Required structure:
```markdown
# Integration Summary

**Status**: complete | partial | failed
**Waves integrated**: N
**Artifacts merged**: M
**Conflicts resolved**: K (or "none")

## What landed
- Wave 1: {1-line summary}
- Wave 2: {1-line summary}
- ...

## What did not land
- {WI ID}: {1-line reason}
  # or "all WIs landed cleanly"

## Hand-off pointer
Full detail in `outputs/integration/integrated_outputs.yaml`.
Final validation should target `outputs/integration/`.
```

## Lead Behavior

After spawning the integration controller, the lead:

1. Receives the controller's stop message
2. Reads `outputs/integration/integration_summary.md` (≤200 tokens)
3. Spawns `cagents:validator` with `validation_target: outputs/integration/`
4. Reads validator's 1-line PASS/FAIL/REVISE result
5. Does NOT re-read any wave's outputs directly

If the integration controller doesn't have Agent at depth-1 (depth-1 stripping), it gracefully degrades to direct execution per `.claude/rules/core/controllers.md` § Graceful Degradation and still writes both artifacts.

## Token Budget Comparison

| Mode | Lead-context tokens at integration phase |
|------|------------------------------------------|
| Pre-v12.1 (lead re-reads outputs) | 2000-5000 |
| v12.1 contract (lead reads summary only) | ~200 |
| Savings | ~90% |

## Coordination Log Integration

`coord-log-writer` consumes `outputs/integration/integrated_outputs.yaml` when assembling the final `coordination_log.yaml`. The summary.md is for the lead's eyes only; the YAML carries the structured data for the log-writer.
