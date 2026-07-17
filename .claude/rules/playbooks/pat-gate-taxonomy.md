---
name: pat-gate-taxonomy
description: "Pattern: every cAgents quality checkpoint reduces to one of four named types — Pre-flight, Revision, Escalation, Abort — each defined by what triggers it, what happens on failure, and who resumes; plus the stall-detection rule (escalate immediately when the finding count does not shrink between reviewer rounds)."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  version: "1.0.0"
  author: cagents
  audience: "controllers, validator, wave-reviewer"
  applies_to:
    - all-controllers
    - cagents:validator
    - cagents:wave-reviewer
---

# Pattern: Gate Taxonomy — Four Checkpoint Types

Every quality checkpoint in cAgents reduces to exactly one of four types. Naming
them gives controllers, the validator, and the wave-reviewer a shared vocabulary
instead of the scattered BLOCKED / WARN / ESCALATE / HOLD / AUTO-FIX verbs spread
across `controller-validation-checklist.md` and the dead-letter contract.

## The four types

Each gate answers three fixed questions — **what triggers it / what happens on
failure / who resumes and from where**.

| Type | Purpose | On failure | Who resumes |
|------|---------|-----------|-------------|
| **Pre-flight** | Blocks entry; no partial work allowed past a malformed input | Reject before any work starts | Producer, from scratch |
| **Revision** | Loops back to the producer, bounded round cap | Send findings back; iterate | Producer, from the fix |
| **Escalation** | Pause and ask a human — never guess | Halt; await human input | Human, then producer |
| **Abort** | Terminate + checkpoint to prevent damage | Stop, save state | Nobody (session/item ends) |

## Mapping onto cAgents surfaces

| Gate type | cAgents surface |
|-----------|-----------------|
| **Pre-flight** | Controller **Pre-Execution Validation** (Checks 0–6 in `controller-validation-checklist.md`) — a malformed plan or missing acceptance criteria never reaches an executor. |
| **Revision** | The **reviewer loop** (`controller_revision.max_internal_rounds: 2`) — Stage-1 spec / Stage-2 quality review sends REVISE feedback back to the executor. |
| **Escalation** | **Tier-4 HITL gate** / a subagent's **NEEDS_CONTEXT** status — the controller escalates to the user rather than guessing missing context. |
| **Abort** | **dead_letter promotion** (2 consecutive failed rounds) / unrecoverable error — the item is checkpointed to `dead_letter_items[]` and coordination continues on the remaining items. |

## Stall-detection rule (Revision gates)

A Revision gate is bounded (max 2 internal rounds). Do not spend the second round
on a doomed retry: **if the finding count does NOT shrink between round 1 and
round 2, escalate immediately** rather than burning the last round.

```yaml
gate: { type: revision, round: 2, findings_prev: 4, findings_now: 4 }
# no shrink between rounds -> stalled -> escalate now (promote to dead_letter / HITL),
# do NOT run the final allotted round
```

A shrinking finding count (4 -> 1) means the loop is converging — keep iterating
within the cap. A flat count (4 -> 4) means the executor is stuck on the same
wall; the round cap will be hit anyway, so escalate one round early and save the
reviewer-call token budget.

## See also

- `@docs/example-store/ex-gates-taxonomy-four-types.md` — worked example this playbook distills.
- `.claude/rules/core/resources/controller-validation-checklist.md` — the Pre-flight checks (Checks 0–6).
- `.claude/rules/playbooks/pat-two-stage-review.md` — the Revision-gate reviewer loop.
- `.claude/rules/playbooks/pat-subagent-status-protocol.md` — NEEDS_CONTEXT (Escalation) + dead_letter (Abort).
- `.claude/rules/core/controllers.md` — dead-letter promotion contract.
