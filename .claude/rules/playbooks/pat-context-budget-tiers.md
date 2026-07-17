---
name: pat-context-budget-tiers
description: "ADVISORY pattern (self-reported, not hook-enforced): a long-running controller or /team lead self-monitors its context fill across four bands — PEAK / GOOD / DEGRADING / POOR — changing read-depth and delegation aggressiveness BEFORE forced compaction, checkpointing a waypoint at DEGRADING, and treating vague phrasing in its own output as an early-warning signal."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  version: "1.0.0"
  author: cagents
  audience: "controllers, /team leads"
  applies_to:
    - all-controllers
    - all-team-leads
---

# Pattern: Context-Budget Tiers (proactive, self-monitored)

> **ADVISORY — self-reported, NOT hook-enforced.** No hook measures an agent's
> context fill or changes its behavior based on it. This pattern is a discipline a
> long-running controller or `/team` lead applies to *itself*. It complements the
> *reactive* PreCompact / PostCompact hooks (which fire only when the harness
> forces compaction) by acting *before* that point is reached.

## The four bands

Key behavior to the fraction of the context window used. Scale read *depth* to the
actual window size (200k vs 1M) — the fractions, not fixed token counts, are what
matter.

| Band | Context used | Behavior |
|------|--------------|----------|
| **PEAK** | 0–30% | Full-body reads, parallel spawns, richest exploration. |
| **GOOD** | 30–50% | Prefer frontmatter / summary reads over full bodies. |
| **DEGRADING** | 50–70% | Frontmatter-only reads; warn the user; stop opening new large files; **checkpoint now**. |
| **POOR** | 70%+ | Checkpoint immediately, NO new reads, finish the current item and stop. |

## Checkpoint at DEGRADING (don't wait for PreCompact)

At the DEGRADING band, proactively write a waypoint — mission + completed work
items + the single next action — so that if a POOR-band forced compaction lands,
there is already a clean resume artifact on disk. Waiting for
`pre-compact-save.cjs` to fire risks checkpointing from a context that is already
degraded.

## Early-warning heuristic: watch your own phrasing

Context degradation shows up in your **own output before you hit the hard
threshold**. Treat these as a signal to drop a band proactively and checkpoint:

- Vague filler — "appropriate handling", "as needed", "handle accordingly" —
  in place of specific `file:line` citations.
- Skipped protocol steps (e.g. not re-reading plan objectives before synthesis).
- Hand-waving ("this should work") instead of evidence.

When you notice this in your own drafting, you are already further into DEGRADING
than the raw fraction suggests — checkpoint and delegate more aggressively rather
than pushing on.

## See also

- `@docs/example-store/ex-gates-context-budget-tiers.md` — worked example this playbook distills.
- `.claude/rules/core/hooks.md` — the reactive PreCompact / PostCompact hooks this complements.
- `.claude/rules/memory/agent-memory.md` — waypoint types and the checkpoint contract.
- `.claude/rules/core/controllers.md` — Read-Before-Decide (re-read plan objectives to combat drift).
