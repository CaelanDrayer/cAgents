# Integration Handoff Contract

This file shows how the integration controller hands off to the team lead. The
integration controller runs in the final wave. The handoff keeps the lead from
a re-read of the raw outputs of each wave.

## The Problem (CI-5 from enriched_context)

Step 6a spawns an integration controller. The integration outputs then flow
back into the context of the lead for the final validation handoff. The lead
also holds the coordination_log entries of N-1 waves before it writes the final
coordination_log.yaml. That is a large context spike late in the run.

## The Contract

The lead spawns the integration controller at depth-1. That controller MUST
write two artifacts:

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

**Hard limit: ≤200 tokens.** The lead reads this file, and the lead reads no
other file. If the integration controller writes more, that is a breach of the
contract.

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

After the lead spawns the integration controller, the lead does these steps:

1. Receives the stop message of the controller
2. Reads `outputs/integration/integration_summary.md`, which holds 200 tokens
   or fewer
3. Spawns `cagents:validator` with `validation_target: outputs/integration/`
4. Reads the 1-line PASS/FAIL/REVISE result of the validator
5. Does NOT re-read the outputs of any wave directly

On CC ≥ 2.1.172 the integration controller keeps the `Agent` tool at depth 1.
It then delegates as usual. In rare cases the `Agent` tool is verifiably
absent. The cause is the nesting ceiling, or a regressed or older harness.

The controller then degrades gracefully to direct execution. The rule for that
degradation is in `.claude/rules/core/controllers.md` § Nesting Model and
Graceful Degradation. The controller still writes both artifacts.

## Token Budget Comparison

| Mode | Lead-context tokens at integration phase |
|------|------------------------------------------|
| Pre-v12.1 (lead re-reads outputs) | 2000-5000 |
| v12.1 contract (lead reads summary only) | ~200 |
| Savings | ~90% |

## Coordination Log Integration

`coord-log-writer` reads `outputs/integration/integrated_outputs.yaml` when it
assembles the final `coordination_log.yaml`. The file summary.md is for the
lead only. The YAML file carries the structured data for the log-writer.
