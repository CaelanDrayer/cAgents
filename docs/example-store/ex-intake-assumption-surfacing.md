---
name: ex-intake-assumption-surfacing
description: "Example: a before/after where an agent silently assumes scope/format/fields and proceeds, vs explicitly listing its assumptions (or asking) before writing code. Load when an execution agent or controller is about to start work on a request with unstated details."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-intake-assumption-surfacing
  category: intake
  source_repo: multica-ai/andrej-karpathy-skills
  source_url: "https://github.com/multica-ai/andrej-karpathy-skills"
  applies_to:
    - cagents:planner
    - cagents:backend-developer
    - all-controllers
  demonstrates: "State assumptions explicitly (or ask) instead of silently guessing scope/format/fields, then proceeding."
  added: "2026-07-10"
---

# Example: Assumption-Surfacing Before Implementation

## Context
cAgents controllers are told to "ask, don't assign", but there's no worked
illustration of the specific failure it prevents: an agent silently assuming an
unstated detail, then building on the guess. This is the "don't hide confusion —
surface tradeoffs" discipline.

## Example

Request: "Add an endpoint to export users to a file."

Bad — silent assumptions baked into code (each `?` was guessed, never stated):

```python
@app.get("/users/export")            # ? GET vs POST — guessed GET
def export_users():
    users = db.query(User).all()     # ? all users vs current-org only — guessed all
    return csv_of(users)             # ? CSV vs JSON vs XLSX — guessed CSV
                                     # ? which fields, incl. email/PII? — guessed all
```

Good — surface the assumptions (or ask) before writing:

```
Before I build /users/export, here are my assumptions — correct any:
  1. Format: CSV (alternatives: JSON, XLSX)
  2. Scope: users in the caller's org only (not all users across tenants)
  3. Fields: id, name, created_at — EXCLUDING email/phone (PII) unless you need them
  4. Method: GET with a signed URL, or POST if the export is expensive
Unless you say otherwise I'll proceed with 1-4 and note them in the work item.
```

The rule: don't assume, and don't *hide* confusion — either ask, or state the
assumption explicitly so a reviewer can catch a wrong one. Assumptions about a
trust/PII boundary (item 3) especially must be surfaced, never silent.

## Why it matters
A concrete template for the "state assumptions explicitly, or ask" behavior that
complements evidence-first execution — and stops a PII/scope guess from silently
shipping. Pairs with `ex-intake-ambiguous-request-disambiguation`. Distilled from
multica-ai/andrej-karpathy-skills `EXAMPLES.md` (Hidden Assumptions).
