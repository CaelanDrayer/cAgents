---
name: ex-gates-fact-forcing-pre-hoc
description: "Example: GateGuard — a PreToolUse gate that DENIES the first Edit/Write/Bash on a target and forces the agent to present concrete investigation facts (importers, affected functions, schema fields, verbatim instruction) before allowing the retry. A pre-hoc evidence gate, the temporal inverse of evidence-first. Load when designing a write-gate hook."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-gates-fact-forcing-pre-hoc
  category: gates
  source_repo: affaan-m/ECC
  source_url: "https://github.com/affaan-m/ECC"
  applies_to:
    - cagents:backend-developer
    - all-controllers
  demonstrates: "Deny the FIRST write to a target until the agent presents concrete investigation facts (pre-hoc evidence gate)."
  added: "2026-07-10"
---

# Example: Fact-Forcing Pre-Hoc Gate (GateGuard)

## Context
cAgents' evidence-first pattern requires specific evidence *after* a change is made.
GateGuard is the temporal inverse: it requires investigation evidence *before* the
write is even permitted — a different failure mode (acting before understanding) that
post-hoc review doesn't catch. Self-evaluation ("Are you sure?" -> always "yes")
doesn't work; forcing concrete facts does.

## Example

A PreToolUse[Write|Edit|Bash] gate DENIES the *first* attempt on a given target and
demands four facts before ALLOW on retry:

```
DENIED (first write to src/api/order.ts). Present these facts, then retry:
  1. Importers/callers: who imports or calls what you're about to change?
     (grep the codebase — cite file:line)
  2. Affected public surface: which exported functions/types does this touch?
  3. Data-schema check: exact field names + formats you rely on
     (use redacted sample values, not guesses).
  4. Verbatim instruction: quote the user's/work-item's actual request.
```

On retry, if the four facts are present the write is ALLOWED. This forces the agent to
*look before it leaps* — an A/B test showed a measurable quality gap for gated vs
ungated first writes.

**Repetition-safety detail** (so the gate doesn't bloat context on multi-file work):
only the first N (default 3) denials per session emit the full four-fact block; later
denials condense to a single line, so near-identical prompts don't accumulate and
amplify.

## Why it matters
A template for a *pre-hoc* evidence gate complementing cAgents' *post-hoc*
`pat-evidence-first-execution.md` — it could extend `write-edit-dispatch.cjs` with an
"investigation receipt" requirement on an execution agent's first write to a file,
with the repetition-safety rule to avoid context bloat. Distilled from affaan-m/ECC
`skills/gateguard/SKILL.md`.
