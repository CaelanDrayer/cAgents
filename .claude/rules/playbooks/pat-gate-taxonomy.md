---
paths:
  - ".claude/rules/playbooks/pat-gate-taxonomy.md"
  - ".claude/rules/core/resources/controller-validation-checklist.md"
  - ".claude/rules/playbooks/pat-two-stage-review.md"
  - ".claude/rules/playbooks/pat-subagent-status-protocol.md"
  - "agents/**"
  - ".claude/skills/team/**"
  - "cagents-memory/sessions/**/workflow/coordination_log.yaml"
  - "cagents-memory/sessions/**/workflow/validation_report.yaml"
  - "cagents-memory/sessions/**/gate_validations/**"
name: pat-gate-taxonomy
description: "Pattern: every cAgents quality checkpoint reduces to one of four named types — Pre-flight, Revision, Escalation, Abort — each defined by what triggers it, what happens on failure, and who resumes; plus two stall-detection rules — escalate immediately when the finding count does not shrink between reviewer rounds, and treat a parent that has spawned children and then gone silent as a stall rather than as progress, recovering from the children's on-disk artifacts."
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

## Stall-detection rule (a parent that has spawned children)

The rule above governs a Revision gate — a loop that is still running. This one
governs a parent that has stopped. **A parent that has spawned children and then
goes silent is a STALL, not progress.** Silence after a spawn looks exactly like
work in flight.

**The detection signal is observable and requires no theory about the cause:**
the children's artifacts are complete on disk, and the parent has emitted nothing
since the last of them landed. That is the entire condition. Act on it — the cause
of any given stall may never be established.

A stalled parent is the most expensive failure in the taxonomy: **it costs strictly
more than never delegating at all.** The children spent their tokens and ran their
work to completion, and then nobody read the results. Not delegating would at least
have bought something for those tokens. An Abort gate saves state on its way down; a
stall checkpoints nothing, because nobody is left to write the checkpoint. It also
leaves no trace: no file records spawn outcomes, so nobody can reconstruct the stall
after the session ends.

### Recovery: start from the artifacts, not from zero

A controller recovering from a stall **reads the children's on-disk artifacts
first and resumes from them.** It does not re-spawn those children and it does not
start over:

1. List the session `outputs/` directory. Treat every artifact there as done.
2. Read those artifacts — they are the hand-back, and they outlive the parent.
3. Resume at the first step that has no artifact backing it.

Re-spawning a child whose artifact is already on disk pays for that work twice and
discards the copy that already exists. That is the failure this rule exists to
prevent, not a recovery from it.

Observed in session `act_subagent-token-budget_260909_001`: a parent went 53
minutes with no activity while its two children's completed output sat on disk.
Three competing explanations fit the symptom; **none was confirmed** — which is why
this rule keys on the observable condition instead of on a mechanism. What *is*
established: a parent can stall indefinitely with completed work on disk, and
nothing detects it except something watching from outside.

**Advisory.** Agents apply this rule themselves. No hook measures parent silence, no
timer kills a stalled parent, and there is no threshold.

## See also

- `@docs/example-store/ex-gates-taxonomy-four-types.md` — worked example this playbook distills.
- `.claude/rules/core/resources/controller-validation-checklist.md` — the Pre-flight checks (Checks 0–6).
- `.claude/rules/playbooks/pat-two-stage-review.md` — the Revision-gate reviewer loop.
- `.claude/rules/playbooks/pat-subagent-status-protocol.md` — NEEDS_CONTEXT (Escalation) + dead_letter (Abort).
- `.claude/rules/core/controllers.md` — dead-letter promotion contract.
- `.claude/rules/playbooks/pat-context-budget-tiers.md` — why a child writes its
  artifact to disk in the first place, which is what makes stall recovery possible.
