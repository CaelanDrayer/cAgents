# /run State Machine: Full Detail

Detailed state-by-state semantics for the /run event-driven pipeline. The SKILL.md body holds the high-level diagram; this file holds the per-state contracts, transitions, and revision routing.

## State Machine Overview (v12.0.0 — 5 states)

```
/run (state machine loop -- level 0)
  |
  Phase 1: Sequential enrichment (all level 1, spawned by /run)
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

**v12.0.0 collapse**: `task-decomposer` and `prompt-engineer` were absorbed into `cagents:planner`. The planner produces both `plan.yaml` and `work_items.yaml` inline. Controllers fall back to standard delegation prompts (no separate `delegation_prompts.yaml` artifact). The DECOMPOSED and PROMPTS_READY states no longer exist.

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

The verify-completion.cjs hook, attention-injection.cjs hook, and session discovery all read pipeline_state from status.yaml. If you skip the status.yaml update, hooks see stale state and cannot detect mid-pipeline stops.

## Pre-Enrichment Detection (for /team teammate flows)

If `--session` was provided, check which enrichment files already exist:
- `enriched_context.yaml` exists -> skip INIT, start from ORCHESTRATED
- `plan.yaml` AND `work_items.yaml` exist -> skip INIT+ORCHESTRATED, start from PLANNED

Set `current_state` to the first state that needs execution. Use the `pre_enrichment.skip_if_exists` mapping from pipeline_config.yaml if loaded; otherwise apply the default skip logic above.

## Revision Routing (v12.0.0)

After the COORDINATED state, read `workflow/validation_report.yaml`:

| Verdict | Action | Next State | Notes |
|---------|--------|-----------|-------|
| **PASS** | Advance to VALIDATED (terminal) | VALIDATED | Loop exits, proceed to Step 4 |
| **FAIL** | Re-run controller with feedback | PLANNED | Increment in-memory revision counter (v12.6.0: not persisted to status.yaml) |
| **REVISE** | Re-run planner with feedback | PLANNED (orchestrator may also re-run) | Increment in-memory revision counter (v12.6.0: not persisted to status.yaml) |
| **BLOCKED** (V10.26.17+, debug-mode only) | Re-run controller with falsification annotation | PLANNED | Annotates controller prompt with hypotheses_tested[] count |

Max 3 total revision cycles (lowered from 5 in v12.0.0). If the in-memory revision counter reaches 3: escalate to user (HITL). Report what completed and what failed. (v12.6.0: the counter is held in `/run`'s working state, not persisted to status.yaml.)

**v12.0.0 routing change**: FAIL and REVISE both route back to PLANNED. Previously FAIL routed to PROMPTS_READY (re-run controller with same plan) and REVISE routed to PLANNED (re-plan from scratch). With PROMPTS_READY removed, FAIL re-runs the controller from PLANNED using the existing plan plus validator feedback; REVISE re-runs the planner (and may also re-run the orchestrator) to produce a new plan.

### BLOCKED Verdict (Debug-Mode Only)

When validator emits BLOCKED, route identically to FAIL but annotate the controller revision prompt with the falsification count:

```
"Validator BLOCKED: 3 falsified hypotheses without confirmed root cause.
Do not retry the same hypotheses; expand scope or escalate."
```

This prevents infinite revision loops on fundamentally stuck debug sessions. Non-debug runs never see verdict BLOCKED (validator gate enforces this).

## Status.yaml Updates on Revision (v12.6.0)

```yaml
pipeline_state: PLANNED     # both FAIL and REVISE route here in v12.0.0+
# v12.6.0: revision_round and validation_cycles fields are NO LONGER written to status.yaml.
# Track revision count in /run's working state; enforce the 3-cycle cap there.
```

## Loop Exit Contract

When the loop exits at any terminal state (VALIDATED, COORDINATED in minimal path, or any other terminal), execute Step 4 (MANDATORY) in SKILL.md before stopping. The verify-completion.cjs Stop hook will block stop if execution_summary.yaml is missing or auto-generated. Stopping after the loop exits without completing Step 4 is the #1 cause of incomplete pipeline runs.

## Event File Format (REMOVED in v12.6.0)

Historical note: pre-v12.6 sessions wrote completion events to `workflow/events/EVT-{N}.yaml` and an index at `workflow/events/index.yaml`. These were external-UI-only signals — no cAgents hook or agent consumes them. v12.6.0 removed the emission entirely. State advancement is now driven by each agent's primary output file (`enriched_context.yaml`, `plan.yaml`, `coordination_log.yaml`, `validation_report.yaml`), which the `/run` loop reads at level 0. Archived pre-v12.6 sessions retain `workflow/events/` on disk for record.

## state_history Skip Fields (v12.7.0)

When a pipeline state is skipped via the orchestrator-skip enumerated
allowlist (see `.claude/skills/run/SKILL.md` Step 3c and
`reference/adaptive-pipeline.md`), the state_history entry MUST record
the skip with two fields:

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

The pre-v12.7 freeform `note` field on state_history entries is
**deprecated**. New code MUST emit `skipped_reason`; readers SHOULD accept
either for back-compat but prefer `skipped_reason` when both are present.
Any value of `skipped_reason` outside the three listed above is a schema
violation.

## Historical Note: 7-State Machine (pre-v12.0.0)

Pre-v12 sessions used a 7-state machine with `DECOMPOSED` and `PROMPTS_READY` between PLANNED and COORDINATED. Archived sessions before May 2026 retain these state names in their workflow artifacts. New sessions use the 5-state machine documented above. See `cagents-memory/sessions/team_v12-revamp-phase-abc_260520_002/outputs/v12-migration/revamp-design-v2.md` Q1 for the rationale.
