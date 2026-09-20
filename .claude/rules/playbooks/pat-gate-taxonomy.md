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

Every quality checkpoint in cAgents reduces to exactly one of four types. A name
for each type gives controllers, the validator, and the wave-reviewer one shared
vocabulary. Without those names, the vocabulary is the scattered set of BLOCKED,
WARN, ESCALATE, HOLD, and AUTO-FIX verbs. Those verbs are spread across
`controller-validation-checklist.md` and the dead-letter contract.

## The four types

Each gate answers three fixed questions. **What triggers it? What happens on
failure? Who resumes, and from where?**

| Type | Purpose | On failure | Who resumes |
|------|---------|-----------|-------------|
| **Pre-flight** | Blocks entry; no partial work allowed past a malformed input | Reject before any work starts | Producer, from scratch |
| **Revision** | Loops back to the producer, bounded round cap | Send findings back; iterate | Producer, from the fix |
| **Escalation** | Pause and ask a human. Never guess. | Halt; await human input | Human, then producer |
| **Abort** | Terminate + checkpoint to prevent damage | Stop, save state | Nobody (session/item ends) |

## Mapping onto cAgents surfaces

| Gate type | cAgents surface |
|-----------|-----------------|
| **Pre-flight** | Controller **Pre-Execution Validation**, which is Checks 0–6 in `controller-validation-checklist.md`. A malformed plan never reaches an executor, and neither does a plan with a missing acceptance criterion. |
| **Revision** | The **reviewer loop**, bounded by `controller_revision.max_internal_rounds: 2`. The Stage-1 spec review and the Stage-2 quality review send REVISE feedback back to the executor. |
| **Escalation** | The **tier-4 HITL gate**, or the **NEEDS_CONTEXT** status of a subagent. The controller escalates to the user, and does not guess the missing context. |
| **Abort** | **dead_letter promotion** after 2 consecutive failed rounds, or an unrecoverable error. The item is checkpointed to `dead_letter_items[]`, and coordination continues on the other items. |

## Stall-detection rule (Revision gates)

A Revision gate is bounded, with a maximum of 2 internal rounds. Do not spend the
second round on a retry that cannot work. **If the finding count does NOT shrink
between round 1 and round 2, escalate immediately.** Do not burn the last round.

```yaml
gate: { type: revision, round: 2, findings_prev: 4, findings_now: 4 }
# no shrink between rounds -> stalled -> escalate now (promote to dead_letter / HITL),
# do NOT run the final allotted round
```

A finding count that shrinks from 4 to 1 means the loop is converging. Keep
iterating inside the cap. A count that stays at 4 means the executor is stuck on
the same wall. The round cap will be reached anyway. Escalate one round early,
and save the token budget of the reviewer call.

## Stall-detection rule (a parent that has spawned children)

The rule above governs a Revision gate, which is a loop that is still running.
This rule governs a parent that has stopped. **A parent that has spawned children
and then goes silent is a STALL, not progress.** Silence after a spawn looks
exactly like work in flight.

**The detection signal is observable, and it needs no theory about the cause.**
The artifacts of the children are complete on disk, and the parent has sent
nothing since the last of them landed. That is the entire condition. Act on it.
The cause of any one stall can stay unknown.

A stalled parent is the most expensive failure in the taxonomy. **It costs
strictly more than never delegating at all.** The children spent their tokens and
ran their work to completion. Then nobody read the results. If you do not
delegate, those tokens at least buy you something.

An Abort gate saves state on its way down. A stall checkpoints nothing, because
nobody is left to write the checkpoint. A stall also leaves no trace. No file
records the outcome of a spawn, so nobody can reconstruct the stall after the
session ends.

### Recovery: start from the artifacts, not from zero

A controller that recovers from a stall **reads the on-disk artifacts of the
children first, and resumes from them.** It does not re-spawn those children, and
it does not start over. Follow these steps:

1. List the session `outputs/` directory. Treat every artifact there as done.
2. Read those artifacts. They are the hand-back, and they outlive the parent.
3. Resume at the first step that has no artifact backing it.

If you re-spawn a child whose artifact is already on disk, you pay for that work
twice. You also discard the copy that already exists. That is the failure this
rule prevents. It is not a recovery from the failure.

Session `act_subagent-token-budget_260909_001` showed this. A parent went 53
minutes with no activity. The completed output of its two children sat on disk
the whole time. Three competing explanations fit the symptom, and **none was
confirmed**. This rule therefore keys on the observable condition, not on a
mechanism.

One point *is* established. A parent can stall for an unlimited time with
completed work on disk. Nothing detects the stall except a watcher outside the
parent.

**Advisory.** Agents apply this rule themselves. No hook measures the silence of
a parent. No timer kills a stalled parent, and there is no threshold.

## See also

- `@docs/example-store/ex-gates-taxonomy-four-types.md`: the worked example that
  this playbook distills.
- `.claude/rules/core/resources/controller-validation-checklist.md`: the
  Pre-flight checks, which are Checks 0–6.
- `.claude/rules/playbooks/pat-two-stage-review.md`: the reviewer loop of the
  Revision gate.
- `.claude/rules/playbooks/pat-subagent-status-protocol.md`: NEEDS_CONTEXT for
  Escalation, and dead_letter for Abort.
- `.claude/rules/core/controllers.md`: the dead-letter promotion contract.
- `.claude/rules/playbooks/pat-context-budget-tiers.md`: why a child writes its
  artifact to disk at all. That habit is what makes stall recovery possible.
