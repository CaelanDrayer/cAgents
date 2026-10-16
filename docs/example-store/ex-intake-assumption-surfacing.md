---
name: ex-intake-assumption-surfacing
description: "Example: a before/after where an agent silently assumes scope, format, and fields and then proceeds, compared with an agent that lists its assumptions (or asks) before it writes code. Load when an execution agent or controller is about to start work on a request with unstated details."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-intake-assumption-surfacing
  category: intake
  source_repo: multica-ai/andrej-karpathy-skills
  source_url: "https://github.com/multica-ai/andrej-karpathy-skills"
  source_commit: 2c606141936f1eeef17fa3043a72095b4765b9c2
  reviewed: "2026-10-15"
  applies_to:
    - cagents:planner
    - cagents:backend-developer
    - all-controllers
  demonstrates: "State assumptions explicitly (or ask) instead of silently guessing scope/format/fields, then proceeding."
  added: "2026-07-10"
---

# Example: Assumption-Surfacing Before Implementation

## Context
cAgents tells controllers to "ask, don't assign". No worked example shows the
failure that this rule prevents. An agent assumes an unstated detail in silence,
and then builds on the guess. The discipline is: do not hide confusion, and show
the tradeoffs.

## Example

Request: "Add an endpoint to export users to a file."

Bad. Silent assumptions are in the code. The agent guessed each `?` and stated none:

```python
@app.get("/users/export")            # ? GET vs POST: guessed GET
def export_users():
    users = db.query(User).all()     # ? all users vs current-org only: guessed all
    return csv_of(users)             # ? CSV vs JSON vs XLSX: guessed CSV
                                     # ? which fields, incl. email/PII? guessed all
```

Good. State the assumptions (or ask) before you write code:

```
Before I build /users/export, here are my assumptions. Correct any of them:
  1. Format: CSV (alternatives: JSON, XLSX)
  2. Scope: users in the caller's org only (not all users across tenants)
  3. Fields: id, name, created_at, EXCLUDING email/phone (PII) unless you need them
  4. Method: GET with a signed URL, or POST if the export is expensive
Unless you say otherwise I'll proceed with 1-4 and note them in the work item.
```

The rule: do not assume, and do not hide confusion. Ask, or state the assumption
explicitly so that a reviewer can catch a wrong one. Always state an assumption
about a trust boundary or about personal data (item 3). Never leave it silent.

## Why it matters
This is a concrete template for the "state assumptions explicitly, or ask"
behavior. It adds to evidence-first execution, and it stops a guess about scope
or personal data from shipping in silence. It pairs with
`ex-intake-ambiguous-request-disambiguation`. Distilled from
multica-ai/andrej-karpathy-skills `EXAMPLES.md` (Example 1, Hidden Assumptions)
and `CLAUDE.md` section 1 (the "surface tradeoffs" principle).
