---
name: ex-intake-ambiguous-request-disambiguation
description: "Example: mapping a vague request ('make the search faster') to distinct named interpretations with different effort/scope before generating work items, so the plan isn't built on a silently-guessed reading. Load at intake / decomposition time for an underspecified request."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-intake-ambiguous-request-disambiguation
  category: intake
  source_repo: multica-ai/andrej-karpathy-skills
  source_url: "https://github.com/multica-ai/andrej-karpathy-skills"
  applies_to:
    - cagents:planner
    - cagents:orchestrator
    - cagents:designer
  demonstrates: "Map a vague request to named interpretations with distinct effort before generating work items."
  added: "2026-07-10"
---

# Example: Ambiguous-Request Disambiguation

## Context
cAgents' `completion.md` bans vague *completion claims* but there's no equivalent
discipline on the *intake* side. When the planner decomposes a vague request, it can
silently pick one interpretation and generate 30 work items on a wrong reading. This
example maps the vague ask to named interpretations first.

## Example

Request: **"Make the search faster."**

Do not decompose yet — enumerate the distinct interpretations, each with its own scope
and effort, then confirm (or state the assumption):

| Interpretation | What it means | Rough effort |
|----------------|---------------|--------------|
| A. Latency | reduce p95 query response time (index, caching) | medium |
| B. Perceived speed | UI feels faster (debounce, skeleton, optimistic render) | small |
| C. Throughput | handle more concurrent searches (scaling, pooling) | large |
| D. Relevance-as-speed | user finds the right result in fewer tries (ranking) | large |

Then either ask one question or surface the assumption:

```
"Make the search faster" has (at least) 4 readings — latency, perceived speed,
throughput, or result relevance. Which are you after? If unspecified I'll assume
A (latency) since that's the most common meaning of "faster", and note it in the plan.
```

The intake table is a reusable transform: vague verb + object -> named
interpretations with distinct effort. Generating work items against a *stated* reading
(vs a silent guess) prevents an entire plan built on the wrong axis.

## Why it matters
Gives the `planner` / `orchestrator` an intake-side counterpart to the completion-side
red-flag table — reducing work items built on a silently-guessed interpretation.
Pairs with `ex-intake-assumption-surfacing`. Distilled from
multica-ai/andrej-karpathy-skills `EXAMPLES.md` (Multiple Interpretations).
