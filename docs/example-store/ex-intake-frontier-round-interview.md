---
name: ex-intake-frontier-round-interview
description: "Example: interview a user in rounds over a decision tree. Each round asks every decision that is unblocked now, numbered, with a recommended answer worded so that 'yes' accepts it. Fact lookups go to subagents. The interview ends when no open decision remains. Load when you gather requirements or stress-test a plan with a user."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-intake-frontier-round-interview
  category: intake
  source_repo: mattpocock/skills
  source_url: "https://github.com/mattpocock/skills"
  source_commit: 49dd158d1076134a641b33efb035946536778336
  reviewed: "2026-10-15"
  applies_to:
    - cagents:market-research-analyst
    - cagents:product-owner
    - cagents:architect
    - cagents:life-coach
  demonstrates: "Ask the whole frontier of unblocked decisions per round, each with a recommended answer that 'yes' accepts; look up facts with subagents; stop when the frontier is empty."
  added: "2026-10-15"
---

# Example: Frontier-Round Interview

## Context
`ex-intake-assumption-surfacing` and `ex-intake-ambiguous-request-disambiguation`
cover one pass at intake. Some work needs a full interview: a requirements
document, a product decision, a career move, an architecture choice. Asking one
question at a time is slow. Asking everything at once asks questions whose
answers depend on earlier answers. The frontier round fixes both.

## Example

Map the request as a decision tree. Each decision branches into the decisions
that depend on it. The **frontier** is every decision whose prerequisites are
settled. Ask the whole frontier in one round, then wait for the answers.

Request: "Help me plan a move from teaching into instructional design."

```
Round 1 (frontier: 3 decisions, nothing settled yet)

Q1. Timeline. Do you want to make the move within 12 months?
    Recommended: yes. A 12-month plan fits one portfolio and one certificate.

Q2. Income floor. Is a salary near your current one acceptable in year one?
    Recommended: yes, as a default. The salary lookup below can change this.

Q3. Sector. Do you want to target corporate training first?
    Recommended: yes. You named corporate clients as the audience you prefer.

(Looking up: entry-level salary range in your region. Q2 can change when it returns.)
```

Rules for each round:

- Word each question so that "yes" accepts the recommended answer. The user can
  settle a round with one word.
- If a question depends on another question in the same round, move it to the
  next round.
- Facts are the agent's job, and decisions are the user's job. Send a subagent
  to find a fact. Never ask the user for a fact that you can look up.
- Do not block the round on a lookup. Only the questions that depend on the
  lookup wait.
- After each round, recompute the frontier. Settled answers unblock new
  questions.
- Stop when the frontier is empty: each branch is visited and nothing is
  assumed in silence. Get the user's confirmation before you act on the result.

## Why it matters
This works for requirements, product scope, coaching, and design choices in any
domain. It cuts the number of round trips and still waits for the user at each
round. An agent with a one-question-at-a-time tool can use the same frontier to
choose which questions to ask next. Distilled from mattpocock/skills
`skills/productivity/grilling/SKILL.md`.
