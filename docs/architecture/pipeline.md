# Pipeline (5-State Machine)

## Overview

The cAgents pipeline uses a state machine engine (`/run`) that reads `pipeline_config.yaml` and executes agents sequentially. Since v12.0.0 the machine has **5 states**. Two named execution paths drive it: `fast` skips the orchestrator (the `INIT` state) for tier-2-clear requests, and `standard` runs all 5 states (tier 3+, ambiguous domain, or debug mode). What v12.3.0 removed was the old **score-based** 3-path selector (minimal/medium/full, driven by a 9-signal complexity score) — NOT the orchestrator-skip; v12.7.0 (P2-9) then finalized the current two-label model with an enumerated orchestrator-skip allowlist. See the canonical path catalog in `.claude/skills/run/reference/adaptive-pipeline.md`.

## State Machine

```
INIT -> ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED
                          ^                  |
                          |  FAIL / REVISE   |
                          +------------------+
```

On `COORDINATED`, the validator classifies the result. `PASS` advances to `VALIDATED` (complete); both `FAIL` and `REVISE` route back to `PLANNED` (max 3 cycles), then escalate to the user (HITL).

> **History**: The pre-v12.0.0 machine had 7 states (`INIT -> ORCHESTRATED -> PLANNED -> DECOMPOSED -> PROMPTS_READY -> COORDINATED -> VALIDATED`). v12.0.0 folded `task-decomposer` and `prompt-engineer` into the `planner`, collapsing the `DECOMPOSED` and `PROMPTS_READY` states. The `delegation_prompts.yaml` artifact those states produced was removed in v12.6.0 — controllers now use standard delegation prompts.

## Path Selection (fast vs standard)

Path selection is governed by an **enumerated orchestrator-skip allowlist**, not a complexity score. The pre-v12.3.0 score-based 3-path selector (minimal/medium/full, driven by a 9-signal complexity score) was deleted in v12.3.0; v12.7.0 (P2-9) replaced the remaining freeform skip heuristics with the closed allowlist below. The orchestrator-skip itself was preserved throughout — only the score-based *path selection* was removed.

| Path | States Executed | Orchestrator (`INIT`) | When Selected |
|------|-----------------|-----------------------|---------------|
| `fast` | ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED | SKIPPED | `tier == 2` AND `!ambiguous_domain` AND `mode != "debug"` |
| `standard` | INIT -> ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED | RUNS | every other case (tier 3+, ambiguous tier-2, debug mode, disabled-by-flag) |

`standard` is the default; `fast` is the only condition under which the orchestrator is skipped, and tier 3+ ALWAYS runs the orchestrator. When `fast` is selected, `/run` writes a minimal `enriched_context.yaml` inline and records `skipped: true, skipped_reason: tier-2-fast-path` in the `INIT` `state_history` entry. The canonical path catalog and the `skipped_reason` enum (`tier-2-clear` / `tier-2-fast-path` / `disabled-by-flag`) live in `.claude/skills/run/reference/adaptive-pipeline.md`.

## Pipeline Agents (5-state machine since v12.0.0)

| State | Agent | Output | Purpose |
|-------|-------|--------|---------|
| INIT | orchestrator | enriched_context.yaml | Context enrichment |
| ORCHESTRATED | planner | plan.yaml + work_items.yaml | Objectives, controller selection, and full decomposition (task-decomposer and prompt-engineer were folded into the planner in v12.0.0) |
| PLANNED | controller | coordination_log.yaml | Question-based coordination (executes work items via Agent tool delegation + reviewer loops; controllers use standard delegation prompts) |
| COORDINATED | validator | validation_report.yaml | Quality validation (PASS / FAIL / REVISE) |
| VALIDATED | — | (complete) | Pipeline terminal state |

## Revision Routing

| Outcome | Route To | Max Cycles | Purpose |
|---------|----------|------------|---------|
| PASS | VALIDATED (complete) | - | All criteria met |
| FAIL | PLANNED | 3 | Re-run controller with validator feedback |
| REVISE | PLANNED | 3 | Re-coordinate with feedback (more fundamental issue) |

After 3 cycles: escalate to user (HITL). (`max_revision_cycles` was tightened from 5 → 3 in v12.0.0 per audit recommendation.)

## Controller-Level Revision

Controllers include internal reviewer loops:
1. Executor implements work item
2. Reviewer evaluates against acceptance criteria
3. If REVISE: executor gets feedback, tries again (max 2 internal rounds; lowered from 3 in LP-27, v12.7.x)
4. If still REVISE after 2 rounds: promote the item to `dead_letter` and continue with the remaining work items

## Configuration

Pipeline is defined in `cagents-memory/_system/config/pipeline_config.yaml`:
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
    outputs: [plan.yaml, work_items.yaml]
  PLANNED:
    agent: dynamic            # resolved from plan.yaml controller_assignment
    next: COORDINATED
    nested_execution: true     # controller spawns level-2 executor + reviewer
    outputs: [coordination_log.yaml]
  COORDINATED:
    agent: cagents:validator
    next: VALIDATED
    outputs: [validation_report.yaml]
  VALIDATED:
    terminal: true

revision:
  max_cycles: 3
  on_fail: PLANNED
  on_revise: PLANNED
  escalation: user_hitl

controller_revision:
  max_internal_rounds: 2       # executor-reviewer loops within controller phase
  escalation: dead_letter
```
