---
name: ex-gates-taxonomy-four-types
description: "Example: name each workflow checkpoint as one of four types: Pre-flight, Revision, Escalation, or Abort. Each type answers a fixed template of 3 questions: the trigger, the behavior on failure, and who resumes. A stall-detection rule ends a revision loop early. Load when you design controller or validator gates."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-gates-taxonomy-four-types
  category: gates
  source_repo: NousResearch/hermes-agent
  source_url: "https://github.com/NousResearch/hermes-agent"
  source_commit: ca069e12239a2c8d13887ac9f983557d00bdcfd2
  applies_to:
    - all-controllers
    - cagents:validator
    - cagents:wave-reviewer
  demonstrates: "Name each checkpoint Pre-flight, Revision, Escalation, or Abort with a fixed template of 3 questions, plus revision stall-detection."
  added: "2026-07-10"
  reviewed: "2026-10-15"
---

# Example: Gate Taxonomy with Four Named Checkpoint Types

## Context
The checkpoint concepts of cAgents are BLOCKED, WARN, ESCALATE, HOLD, and
AUTO-FIX. They are in `controller-validation-checklist.md` and in the dead-letter
contract, with no shared vocabulary. This example names four checkpoint *types*.
Controllers, the validator, and the wave-reviewer can cite each type by name.

## Example

Each gate is exactly one of four types. Each type answers three fixed questions:
**what triggers it, what happens on failure, and who resumes from where**.

| Type | Purpose | On failure | Resumes |
|------|---------|-----------|---------|
| **Pre-flight** | blocks entry; no partial work is allowed | reject before any work starts | the producer, from the start |
| **Revision** | loops back to the producer, with a cap on rounds | send the findings back and iterate | the producer, from the fix |
| **Escalation** | pause and ask the human; never guess | halt and wait for human input | the human, then the producer |
| **Abort** | stop and save a checkpoint to prevent damage | stop and save the state | nobody, because the session ends |

The types map onto these cAgents surfaces:

- Pre-flight is the controller Pre-Execution Validation, Checks 0-6. A malformed
  plan never gets to an executor.
- Revision is the reviewer loop, with `max_internal_rounds: 2`.
- Escalation is the tier-4 HITL gate, or a NEEDS_CONTEXT status.
- Abort is a dead_letter promotion, or an unrecoverable error.

**Stall-detection rule for Revision gates**: this is the addition that transfers
to cAgents. If the count of findings does NOT get smaller from round 1 to round 2,
escalate at once. Do not spend the last round on a retry that will fail.

```yaml
gate: { type: revision, round: 2, findings_prev: 4, findings_now: 4 }
# no shrink -> stalled -> escalate now (do not burn the last round)
```

## Why it matters
The gate vocabulary of cAgents gets one clear naming scheme. The stall-detection
rule saves about one full reviewer round of token budget on each retry that would
fail. Distilled from NousResearch/hermes-agent
`optional-skills/software-development/subagent-driven-development/references/gates-taxonomy.md`.
