---
name: ex-intake-ambiguous-request-disambiguation
description: "Example: map a vague request ('make the search faster') to named interpretations with different effort and scope before you generate work items, so the plan does not rest on a silent guess. Load at intake or decomposition time for an underspecified request."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-intake-ambiguous-request-disambiguation
  category: intake
  source_repo: multica-ai/andrej-karpathy-skills
  source_url: "https://github.com/multica-ai/andrej-karpathy-skills"
  source_commit: 2c606141936f1eeef17fa3043a72095b4765b9c2
  reviewed: "2026-10-15"
  applies_to:
    - cagents:planner
    - cagents:orchestrator
    - cagents:market-research-analyst
  demonstrates: "Map a vague request to named interpretations with distinct effort before generating work items."
  added: "2026-07-10"
---

# Example: Ambiguous-Request Disambiguation

## Context
cAgents' `completion.md` bans vague completion claims. The intake side has no
equal rule. When the planner decomposes a vague request, it can pick one reading
silently and generate 30 work items on the wrong one. This example maps the vague
request to named interpretations first. The same transform works for a
requirements interview in any domain.

## Example

Request: **"Make the search faster."**

Do not decompose yet. List the distinct interpretations, each with its own scope
and effort. Then confirm one, or state the assumption:

| Interpretation | What it means | Rough effort |
|----------------|---------------|--------------|
| A. Latency | reduce p95 query response time (index, caching) | medium |
| B. Perceived speed | UI feels faster (debounce, skeleton, optimistic render) | small |
| C. Throughput | handle more concurrent searches (scaling, pooling) | large |
| D. Relevance-as-speed | user finds the right result in fewer tries (ranking) | large |

Then ask one question, or state the assumption:

```
"Make the search faster" has (at least) 4 readings: latency, perceived speed,
throughput, or result relevance. Which are you after? If unspecified I'll assume
A (latency) since that's the most common meaning of "faster", and note it in the plan.
```

The intake table is a transform that you can use again: a vague verb plus an
object becomes named interpretations with distinct effort. Work items that
follow a stated reading cannot build a whole plan on the wrong axis.

## Why it matters
This gives the `planner`, the `orchestrator`, and a requirements interviewer an
intake-side match for the completion-side red-flag table. Fewer work items rest
on a silent guess. It pairs with `ex-intake-assumption-surfacing`. Distilled from
multica-ai/andrej-karpathy-skills `EXAMPLES.md` (Example 2, Multiple
Interpretations).
