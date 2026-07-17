---
name: ex-structured-io-schema-role-contract
description: "Example: a role + input_schema + output_schema + instructions contract written inline for data-transform agents, contrasted with a vague English instruction — the schema-constrained version is what a hook can verify. Load when authoring an agent whose job is fundamentally a data transform."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-structured-io-schema-role-contract
  category: structured-io
  source_repo: f/prompts.chat
  source_url: "https://github.com/f/prompts.chat"
  applies_to:
    - cagents:data-scientist
    - cagents:task-state
    - cagents:backend-developer
  demonstrates: "role + input_schema + output_schema + instructions as an inline contract for data-transform agents (vague vs schema-constrained)."
  added: "2026-07-10"
---

# Example: Schema-Shaped Role Contract

## Context
For an agent whose job is fundamentally a data transform, a vague English instruction
leaves the output shape to inference. The prompts.chat `STRUCTURED` type (298 rows)
converged on a `role / input_schema / output_schema / instructions` object — the same
shape as a schema-constrained acceptance criterion, and the only shape a hook can
verify.

## Example

Vague (output shape is anyone's guess):

```
Act as a data transformer. I'll give you messy records, you clean them up.
```

Schema-constrained (the contract IS the instruction):

```json
{
  "role": "Data Transformer",
  "input_schema": {
    "records": [{ "name": "string", "email": "string", "signup": "string (any date format)" }]
  },
  "output_schema": {
    "records": [{ "full_name": "string", "email": "string (lowercased)", "signup_iso": "string (YYYY-MM-DD)" }],
    "dropped": [{ "reason": "string", "raw": "object" }]
  },
  "instructions": "Normalize each record to output_schema. Lowercase emails. Parse any
    date format to ISO. Any record failing validation goes to `dropped` with a reason —
    never silently discard. Return ONLY the JSON object, no prose."
}
```

Why this beats prose: the `output_schema` is a checkable acceptance criterion (a
reviewer/hook can assert the returned object matches it); `dropped[]` forces explicit
handling of the failure path instead of silent loss; "return ONLY the JSON" constrains
the reply surface.

## Why it matters
Shows agent authors how to write a verifiable role/schema/instructions contract inline
for transform agents (`data-scientist`, `task-state`), pairing with evidence-first
review's bad-vs-good contrast. Distilled from f/prompts.chat `STRUCTURED`-type entries
(`RegEx Generator`, `Data Transformer`).
