---
name: ex-structured-io-schema-role-contract
description: "Example: a role + input_schema + output_schema + instructions contract written inline for data-transform agents, compared with a vague English instruction. A hook can check the schema-constrained version. Load when you author an agent whose main job is a data transform."
license: CC0-1.0
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-structured-io-schema-role-contract
  category: structured-io
  source_repo: f/prompts.chat
  source_url: "https://github.com/f/prompts.chat"
  source_commit: bbd0529530d99fa76ab2f51809b6184ea4b625b8
  reviewed: "2026-10-15"
  applies_to:
    - cagents:data-scientist
    - cagents:task-state
    - cagents:backend-developer
  demonstrates: "role + input_schema + output_schema + instructions as an inline contract for data-transform agents (vague vs schema-constrained)."
  added: "2026-07-10"
---

# Example: Schema-Shaped Role Contract

## Context
Some agents do one main job: a data transform. A vague English instruction
leaves the output shape to inference. The prompts.chat corpus has a
`STRUCTURED` prompt type (323 rows at upstream commit `bbd05295`). Most of
those rows are plain JSON or a prose role. One entry, `Data Transformer`, shows
the full `role / input_schema / output_schema / instructions` object. That
shape matches a schema-constrained acceptance criterion, and a hook can check it.

## Example

Vague. Nobody can predict the output shape:

```
Act as a data transformer. I'll give you messy records, you clean them up.
```

Schema-constrained. The contract is the instruction:

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
    date format to ISO. Put each record that fails validation in `dropped` with a
    reason. Do not discard records silently. Return only the JSON object, no prose."
}
```

This is better than prose for three reasons:

- The `output_schema` is an acceptance criterion that a reviewer or a hook can
  check against the returned object.
- `dropped[]` makes the agent handle the failure path. Records cannot disappear
  without a reason.
- "Return only the JSON object" limits the reply to one surface.

## Why it matters
This shows agent authors how to write a role, schema, and instructions contract
that a check can verify. It fits transform agents such as `data-scientist` and
`task-state`, and it pairs with the bad-vs-good contrast in evidence-first
review. Distilled from f/prompts.chat `prompts.csv` (CC0-1.0 prompt data), the
`STRUCTURED` row `Data Transformer`.
