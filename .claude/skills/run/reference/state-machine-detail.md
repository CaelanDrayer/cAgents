# /run State Machine: Full Detail

Detailed state-by-state semantics for the /run event-driven pipeline. The SKILL.md body holds the high-level diagram; this file holds the per-state contracts, transitions, and revision routing.

## State Machine Overview

```
/run (state machine loop -- level 0)
  |
  Phase 1: Sequential enrichment (all level 1, spawned by /run)
  +-> orchestrator (level 1)    -> enriched_context.yaml
  +-> planner (level 1)         -> plan.yaml
  +-> decomposer (level 1)      -> work_items.yaml
  +-> prompt-engineer (level 1)  -> delegation_prompts.yaml
  |
  Phase 2: Nested execution (level 1 + 2)
  +-> controller (level 1)
       +-> executor (level 2)   -> implementation
       +-> reviewer (level 2)   -> review_report.yaml
       +-> revision loop (level 2, max 3 rounds)
  |
  Phase 3: Validation (level 1)
  +-> validator (level 1)       -> validation_report.yaml
  |
  Revision loop (max 5 rounds):
    FAIL   -> back to Phase 2 (PROMPTS_READY)
    REVISE -> back to Phase 1 (PLANNED, re-plan)
```

## Per-State Contracts

| State | Agent | Inputs | Outputs | Next State |
|-------|-------|--------|---------|-----------|
| INIT | orchestrator | instruction.yaml | enriched_context.yaml | ORCHESTRATED |
| ORCHESTRATED | universal-planner | enriched_context.yaml | plan.yaml | PLANNED |
| PLANNED | task-decomposer | plan.yaml | work_items.yaml | DECOMPOSED |
| DECOMPOSED | prompt-engineer (optional) | work_items.yaml | delegation_prompts.yaml | PROMPTS_READY |
| PROMPTS_READY | controller (dynamic) | plan.yaml + work_items.yaml + delegation_prompts.yaml | coordination_log.yaml | COORDINATED |
| COORDINATED | universal-validator | coordination_log.yaml + plan.yaml | validation_report.yaml | VALIDATED |
| VALIDATED | (terminal) | validation_report.yaml | execution_summary.yaml | (none) |

## State Machine Loop Algorithm

```
while current_state is not terminal (VALIDATED):
  1. Look up current_state in pipeline_config.yaml
  2. Determine agent to spawn (or "dynamic" for controller from plan.yaml)
  3. Spawn agent at level 1 via Agent tool
  4. After agent returns, read completion event from workflow/events/
  5. MANDATORY: Update status.yaml with new state
     a. Set pipeline_state to next_state
     b. Compute duration_ms for the PREVIOUS state_history entry:
        duration_ms = (now_ms - previous_entered_at_ms)
     c. Append new state_history entry with entered_at=now, duration_ms=null
  6. Update events/index.yaml: read existing events list, append new EVT-{N}, write back
     (This is /run's responsibility -- do NOT rely on spawned agents to maintain the index)
  7. Call TaskUpdate to reflect progress
  8. Check for revision: if validator returned FAIL or REVISE, route accordingly
  9. Advance to next_state from event file
```

The verify-completion.cjs hook, attention-injection.cjs hook, and session discovery all read pipeline_state from status.yaml. If you skip the status.yaml update, hooks see stale state and cannot detect mid-pipeline stops.

## Pre-Enrichment Detection (for /team teammate flows)

If `--session` was provided, check which enrichment files already exist:
- `enriched_context.yaml` exists -> skip INIT, start from ORCHESTRATED
- `plan.yaml` exists -> skip INIT+ORCHESTRATED, start from PLANNED
- `work_items.yaml` exists -> skip through PLANNED, start from DECOMPOSED

Set `current_state` to the first state that needs execution. Use the `pre_enrichment.skip_if_exists` mapping from pipeline_config.yaml if loaded; otherwise apply the default skip logic above.

## Revision Routing

After the COORDINATED state, read `workflow/validation_report.yaml`:

| Verdict | Action | Next State | Notes |
|---------|--------|-----------|-------|
| **PASS** | Advance to VALIDATED (terminal) | VALIDATED | Loop exits, proceed to Step 4 |
| **FAIL** | Re-run controller with feedback | PROMPTS_READY | Increment revision_round and validation_cycles |
| **REVISE** | Re-run planner with feedback | PLANNED | Increment revision_round and validation_cycles |
| **BLOCKED** (V10.26.17+, debug-mode only) | Re-run controller with falsification annotation | PROMPTS_READY | Annotates controller prompt with hypotheses_tested[] count |

Max 5 total revision cycles. If `revision_round >= 5`: escalate to user (HITL). Report what completed and what failed.

### BLOCKED Verdict (Debug-Mode Only)

When validator emits BLOCKED, route identically to FAIL but annotate the controller revision prompt with the falsification count:

```
"Validator BLOCKED: 3 falsified hypotheses without confirmed root cause.
Do not retry the same hypotheses; expand scope or escalate."
```

This prevents infinite revision loops on fundamentally stuck debug sessions. Non-debug runs never see verdict BLOCKED (validator gate enforces this).

## Status.yaml Updates on Revision

```yaml
pipeline_state: PROMPTS_READY  # or PLANNED for REVISE
revision_round: {N}            # incremented
validation_cycles: {N}         # incremented (total FAIL+REVISE loops)
```

## Loop Exit Contract

When the loop exits at any terminal state (VALIDATED, COORDINATED in minimal path, or any other terminal), execute Step 4 (MANDATORY) in SKILL.md before stopping. The verify-completion.cjs Stop hook will block stop if execution_summary.yaml is missing or auto-generated. Stopping after the loop exits without completing Step 4 is the #1 cause of incomplete pipeline runs.

## Event File Format

Each pipeline agent writes a completion event to `workflow/events/EVT-{N}.yaml`:

```yaml
event_id: EVT-{N}
type: "state_transition"
agent_id: "{agent_id}"
agent_type: "cagents:{agent_name}"
timestamp: "{ISO_TIMESTAMP}"
state_from: "{current_state}"
state_to: "{next_state}"
payload:
  inputs_consumed: [{inputs}]
  outputs_produced: [{outputs}]
```

After writing each event, the agent updates `workflow/events/index.yaml` with the ordered event list:

```yaml
events: [EVT-1, EVT-2, EVT-3, ...]
```

This provides authoritative event ordering without requiring numeric sort of filenames.
