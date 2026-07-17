---
name: ex-gates-context-budget-tiers
description: "Example: a proactive four-tier context-budget policy (PEAK / GOOD / DEGRADING / POOR) that changes an agent's read-depth and delegation behavior as its context fills, and triggers a checkpoint BEFORE the harness forces compaction. Load for long controller/team-lead sessions."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-gates-context-budget-tiers
  category: gates
  source_repo: NousResearch/hermes-agent
  source_url: "https://github.com/NousResearch/hermes-agent"
  applies_to:
    - all-controllers
    - cagents:team-lead
    - cagents:execution-monitor
  demonstrates: "PEAK / GOOD / DEGRADING / POOR context bands that change read-depth and trigger proactive checkpointing before compaction."
  added: "2026-07-10"
---

# Example: Context-Budget Tiers (Proactive, Not Reactive)

## Context
cAgents' context management is *reactive* — PreCompact/PostCompact hooks fire when the
harness decides to compact. This example is a *proactive*, self-monitored policy: the
agent changes its own behavior as its context fills, checkpointing before compaction
is forced. Useful for long controller and `/team` lead sessions.

## Example

Four bands, keyed to fraction of the context window used, each changing behavior:

| Tier | Context used | Behavior |
|------|--------------|----------|
| **PEAK** | 0–30% | full-body reads, parallel spawns, richest exploration |
| **GOOD** | 30–50% | prefer frontmatter/summary reads over full bodies |
| **DEGRADING** | 50–70% | frontmatter-only reads; warn the user; stop opening new large files |
| **POOR** | 70%+ | checkpoint immediately, NO new reads, finish the current item and stop |

Scale read *depth* to the actual window (200k vs 1M), not a fixed assumption.

**Early-warning heuristic** — degradation shows up in your own output *before* the
hard threshold: vague phrasing ("appropriate handling", "as needed"), skipped protocol
steps, or hand-waving instead of citations. Treat those as a signal to drop a tier
proactively and checkpoint.

```
At DEGRADING: write a waypoint (mission + completed WIs + next action) now, so a
POOR-tier compaction has a clean resume artifact — don't wait for PreCompact to fire.
```

## Why it matters
Gives cAgents controllers/teammates a self-reported policy that changes read-depth and
delegation aggressiveness *before* forced compaction, plus a "vague phrasing = early
warning" self-check — complementing the reactive PreCompact/PostCompact hooks.
Distilled from NousResearch/hermes-agent
`subagent-driven-development/references/context-budget-discipline.md`.
