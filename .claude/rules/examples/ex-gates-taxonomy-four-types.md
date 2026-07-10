---
name: ex-gates-taxonomy-four-types
description: "Example: naming every workflow checkpoint as one of four types — Pre-flight, Revision, Escalation, Abort — each answering a fixed 3-question template (trigger / failure behavior / who resumes), plus a revision-loop stall-detection rule. Load when designing controller/validator gates."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-gates-taxonomy-four-types
  category: gates
  source_repo: NousResearch/hermes-agent
  source_url: "https://github.com/NousResearch/hermes-agent"
  applies_to:
    - all-controllers
    - cagents:validator
    - cagents:wave-reviewer
  demonstrates: "Name every checkpoint Pre-flight / Revision / Escalation / Abort with a fixed 3-question template + revision stall-detection."
  added: "2026-07-10"
---

# Example: Gate Taxonomy — Four Named Checkpoint Types

## Context
cAgents' checkpoint concepts (BLOCKED/WARN/ESCALATE/HOLD/AUTO-FIX) are scattered
across `controller-validation-checklist.md` and the dead-letter contract with no
shared vocabulary. This example names four checkpoint *types* controllers, the
validator, and wave-reviewer can cite by name.

## Example

Every gate is exactly one of four types, and each answers three fixed questions —
**what triggers it / what happens on failure / who resumes and from where**:

| Type | Purpose | On failure | Resumes |
|------|---------|-----------|---------|
| **Pre-flight** | blocks entry; no partial work allowed | reject before any work starts | producer, from scratch |
| **Revision** | loops back to the producer, bounded cap | send findings back; iterate | producer, from the fix |
| **Escalation** | pause and ask the human — never guess | halt; await human input | human, then producer |
| **Abort** | terminate + checkpoint to prevent damage | stop, save state | nobody (session ends) |

Map onto cAgents surfaces:
- Pre-flight = controller Pre-Execution Validation (Checks 0-6) — malformed plan never
  reaches an executor.
- Revision = the reviewer loop (`max_internal_rounds: 2`).
- Escalation = tier-4 HITL gate / NEEDS_CONTEXT.
- Abort = dead_letter promotion / unrecoverable error.

**Stall-detection rule for Revision gates** (the transferable addition): if the
findings count does NOT shrink between round 1 and round 2, escalate *immediately*
rather than spending the second allotted round on a doomed retry.

```yaml
gate: { type: revision, round: 2, findings_prev: 4, findings_now: 4 }
# no shrink -> stalled -> escalate now (do not burn the last round)
```

## Why it matters
Gives cAgents' scattered gate vocabulary one crisp naming scheme, and the
stall-detection rule saves ~a full reviewer round of token budget on doomed retries.
Distilled from NousResearch/hermes-agent
`subagent-driven-development/references/gates-taxonomy.md`.
