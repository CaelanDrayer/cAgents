# /act State Machine: Full Detail

This file gives the state-by-state semantics of the /act event-driven pipeline. The SKILL.md body holds the high-level diagram. This file holds the per-state contracts, the transitions, and the revision routing.

## State Machine Overview (v12.0.0 — 5 states)

```
/act (state machine loop -- level 0)
  |
  Phase 1: Sequential enrichment (all level 1, spawned by /act)
  +-> orchestrator (level 1)         -> enriched_context.yaml
  +-> planner (level 1)    -> plan.yaml + work_items.yaml (decomposition inline)
  |
  Phase 2: Nested execution (level 1 + 2)
  +-> controller (level 1)
       +-> executor (level 2)        -> implementation
       +-> reviewer (level 2)        -> review_report.yaml
       +-> revision loop (level 2, max 3 rounds)
  |
  Phase 3: Validation (level 1)
  +-> validator (level 1)            -> validation_report.yaml
  |
  Revision loop (max 3 rounds, lowered from 5 in v12.0.0):
    FAIL   -> back to Phase 2 (PLANNED, re-run controller with feedback)
    REVISE -> back to Phase 1 (PLANNED, re-plan)
```

**v12.0.0 collapse**: `cagents:planner` absorbed `task-decomposer` and `prompt-engineer`. The planner produces both `plan.yaml` and `work_items.yaml` inline. Controllers fall back to the standard delegation prompts, and the pipeline writes no separate `delegation_prompts.yaml` artifact. The DECOMPOSED state and the PROMPTS_READY state no longer exist.

## Per-State Contracts (v12.0.0)

| State | Agent | Inputs | Outputs | Next State |
|-------|-------|--------|---------|-----------|
| INIT | orchestrator | instruction.yaml | enriched_context.yaml | ORCHESTRATED |
| ORCHESTRATED | planner | enriched_context.yaml | plan.yaml + work_items.yaml | PLANNED |
| PLANNED | controller (dynamic) | plan.yaml + work_items.yaml | coordination_log.yaml | COORDINATED |
| COORDINATED | validator | coordination_log.yaml + plan.yaml | validation_report.yaml | VALIDATED |
| VALIDATED | (terminal) | validation_report.yaml | execution_summary.yaml | (none) |

## State Machine Loop Algorithm

```
while current_state is not terminal (VALIDATED):
  1. Look up current_state in pipeline_config.yaml
  2. Determine agent to spawn (or "dynamic" for controller from plan.yaml)
  3. Spawn agent at level 1 via Agent tool
  4. After agent returns, read the agent's primary output file
     (enriched_context.yaml / plan.yaml / coordination_log.yaml / validation_report.yaml)
  5. MANDATORY: Update status.yaml with new state
     a. Set pipeline_state to next_state
     b. Append new state_history entry with entered_at=now
        (v12.6.0: duration_ms is NO LONGER emitted — drop the field)
     c. If the state was skipped (orchestrator-skip enumerated allowlist),
        also write `skipped: true` and `skipped_reason: <enum>` to the entry.
        See `state_history Skip Fields (v12.7.0)` below.
  6. (v12.6.0: workflow/events/ emission removed. The agent's primary output file
     is the canonical signal for state advancement; do not write EVT-*.yaml or
     events/index.yaml.)
  7. Call TaskUpdate to reflect progress
  8. Check for revision: if validator returned FAIL or REVISE, route accordingly
  9. Advance to next_state per pipeline_config.yaml
```

Three consumers read pipeline_state from status.yaml. They are the verify-completion.cjs hook, the post-compact-restore.cjs hook, and the session discovery. If you skip the status.yaml update, the hooks see a stale state. They then cannot detect a stop in the middle of the pipeline.

## Pre-Enrichment Detection (for /team subagent flows)

If the caller gave `--session`, check which enrichment files already exist:
- `enriched_context.yaml` exists -> skip INIT, start from ORCHESTRATED
- `plan.yaml` AND `work_items.yaml` exist -> skip INIT+ORCHESTRATED, start from PLANNED

Set `current_state` to the first state that needs execution. If pipeline_config.yaml is loaded, use its `pre_enrichment.skip_if_exists` mapping. If it is not loaded, apply the default skip logic above.

## Revision Routing (v12.0.0)

After the COORDINATED state, read `workflow/validation_report.yaml`:

| Verdict | Action | Next State | Notes |
|---------|--------|-----------|-------|
| **PASS** | Advance to VALIDATED (terminal) | VALIDATED | Loop exits, proceed to Step 4 |
| **FAIL** | Re-run controller with feedback | PLANNED | Increment in-memory revision counter (v12.6.0: not persisted to status.yaml) |
| **REVISE** | Re-run planner with feedback | PLANNED (orchestrator may also re-run) | Increment in-memory revision counter (v12.6.0: not persisted to status.yaml) |
| **BLOCKED** (V10.26.17+, debug-mode only) | Re-run controller with falsification annotation | PLANNED | Annotates controller prompt with hypotheses_tested[] count |

The pipeline allows a maximum of 3 revision cycles in total, and v12.0.0 lowered that limit from 5. If the in-memory revision counter reaches 3, escalate to the user through HITL. Report what completed, and report what failed. In v12.6.0, `/act` holds the counter in its working state, and it does not persist the counter to status.yaml.

**v12.0.0 routing change**: FAIL and REVISE both route back to PLANNED. Earlier, FAIL routed to PROMPTS_READY, where the controller re-ran with the same plan. REVISE routed to PLANNED, where the planner re-planned from the start. PROMPTS_READY is now gone. FAIL therefore re-runs the controller from PLANNED, with the existing plan plus the validator feedback. REVISE re-runs the planner, and it can also re-run the orchestrator, to produce a new plan.

### BLOCKED Verdict (Debug-Mode Only)

When the validator emits BLOCKED, route it as you route FAIL. Also annotate the controller revision prompt with the falsification count:

```
"Validator BLOCKED: 3 falsified hypotheses without confirmed root cause.
Do not retry the same hypotheses; expand scope or escalate."
```

This rule stops an infinite revision loop on a debug session that is stuck at its root. A non-debug run never sees the BLOCKED verdict, because the validator gate enforces that limit.

## Status.yaml Updates on Revision (v12.6.0)

```yaml
pipeline_state: PLANNED     # both FAIL and REVISE route here in v12.0.0+
# v12.6.0: revision_round and validation_cycles fields are NO LONGER written to status.yaml.
# Track revision count in /act's working state; enforce the 3-cycle cap there.
```

## Loop Exit Contract

The loop can exit at any terminal state. Those states are VALIDATED, COORDINATED on the minimal path, and any other terminal state. When the loop exits, execute Step 4 in SKILL.md before you stop. Step 4 is MANDATORY. The verify-completion.cjs Stop hook blocks the stop when execution_summary.yaml is missing, and when that file is auto-generated. A stop after the loop exits, with Step 4 incomplete, is the #1 cause of an incomplete pipeline run.

## Event File Format (REMOVED in v12.6.0)

Historical note: a pre-v12.6 session wrote its completion events to `workflow/events/EVT-{N}.yaml`, plus an index at `workflow/events/index.yaml`. Those were external-UI-only signals. No cAgents hook and no cAgents agent consumes them. v12.6.0 removed the emission in full. The primary output file of each agent now drives the state advancement. Those files are `enriched_context.yaml`, `plan.yaml`, `coordination_log.yaml` and `validation_report.yaml`, and the `/act` loop reads them at level 0.

An archived pre-v12.6 session keeps `workflow/events/` on disk for the record.

## state_history Skip Fields (v12.7.0)

Sometimes the orchestrator-skip enumerated allowlist skips a pipeline state.
That allowlist is in `.claude/skills/act/SKILL.md` Step 3c and in
`reference/adaptive-pipeline.md`. In that case the state_history entry MUST
record the skip with these two fields:

```yaml
state_history:
  - state: INIT
    entered_at: "{ISO_TIMESTAMP}"
    skipped: true
    skipped_reason: tier-2-fast-path
```

`skipped` is a boolean. `skipped_reason` is a closed enum:

| Value | Meaning |
|-------|---------|
| `tier-2-clear` | General tier-2 + clear-domain skip label. |
| `tier-2-fast-path` | Skip driven by the `fast` path selector (tier 2, unambiguous, non-debug). |
| `disabled-by-flag` | Skip driven by an explicit CLI flag or env override. |

The pre-v12.7 freeform `note` field on a state_history entry is
**deprecated**. New code MUST emit `skipped_reason`. A reader SHOULD accept
either field for back-compat, and it SHOULD prefer `skipped_reason` when both
fields are present. Any value of `skipped_reason` outside the three values
above is a schema violation.

## Historical Note: 7-State Machine (pre-v12.0.0)

A pre-v12 session used a 7-state machine. It placed `DECOMPOSED` and `PROMPTS_READY` between PLANNED and COORDINATED. An archived session from before May 2026 keeps these state names in its workflow artifacts. A new session uses the 5-state machine above. See `cagents-memory/sessions/team_v12-revamp-phase-abc_260520_002/outputs/v12-migration/revamp-design-v2.md` Q1 for the rationale.
