---
name: ex-gates-context-budget-tiers
description: "Example: a proactive context-budget policy with four tiers: PEAK, GOOD, DEGRADING, and POOR. Each tier changes the read depth and the delegation behavior of an agent as its context fills. The policy writes a checkpoint BEFORE the harness forces compaction. Load for long controller and team-lead sessions."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-gates-context-budget-tiers
  category: gates
  source_repo: NousResearch/hermes-agent
  source_url: "https://github.com/NousResearch/hermes-agent"
  source_commit: ca069e12239a2c8d13887ac9f983557d00bdcfd2
  applies_to:
    - all-controllers
    - cagents:team-lead
    - cagents:execution-monitor
  demonstrates: "PEAK, GOOD, DEGRADING, and POOR context bands that change the read depth and write a checkpoint before compaction."
  added: "2026-07-10"
  reviewed: "2026-10-15"
---

# Example: Context-Budget Tiers That Act Before Compaction

## Context
Context management in cAgents is *reactive*. The PreCompact and PostCompact hooks
run when the harness decides to compact. This example is a *proactive* policy
that the agent monitors itself. The agent changes its behavior as its context
fills, and it writes a checkpoint before the harness forces compaction. Use it
for long controller sessions and long `/team` lead sessions.

## Example

Four bands map to the fraction of the context window in use. Each band
changes the behavior:

| Tier | Context used | Behavior |
|------|--------------|----------|
| **PEAK** | 0-30% | read full bodies, spawn in parallel, explore widely |
| **GOOD** | 30-50% | read the frontmatter or a summary in place of a full body |
| **DEGRADING** | 50-70% | read the frontmatter only; warn the user; open no new large files |
| **POOR** | 70%+ | write a checkpoint at once; do NO new reads; finish the current item and stop |

Scale the read *depth* to the actual window, such as 200k or 1M. Do not assume a
fixed size.

**Early-warning rule**: degradation shows in your own output *before* the hard
threshold. The signs are vague phrases such as "appropriate handling" or "as
needed", skipped protocol steps, and general claims in place of citations. If you
see these signs, drop one tier and write a checkpoint.

```
At DEGRADING: write a waypoint (mission + completed WIs + next action) now, so a
POOR-tier compaction has a clean resume artifact. Do not wait for PreCompact to fire.
```

## Why it matters
Controllers and wave subagents in cAgents get a self-reported policy. The policy
changes the read depth and the delegation level *before* forced compaction. It
also gives a self-check that treats vague phrases as an early warning. It adds to
the reactive PreCompact and PostCompact hooks. Distilled from
NousResearch/hermes-agent
`optional-skills/software-development/subagent-driven-development/references/context-budget-discipline.md`.
