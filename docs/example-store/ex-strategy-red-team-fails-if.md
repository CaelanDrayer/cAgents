---
name: ex-strategy-red-team-fails-if
description: "Example: strategy red-team — steelman then attack a plan's load-bearing assumptions, write each failure as a falsifiable 'Fails if ___', and rank by impact x likelihood x cheapness-to-test so the output is the cheapest test to run this week, not a risk register. Load for strategy/plan stress-testing."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-strategy-red-team-fails-if
  category: strategy
  source_repo: phuryn/pm-skills
  source_url: "https://github.com/phuryn/pm-skills"
  applies_to:
    - cagents:strategic-planner
    - cagents:product-owner
  demonstrates: "Steelman then attack load-bearing assumptions; write each failure as a falsifiable 'Fails if ___' with a cheapest test to run this week."
  added: "2026-07-10"
---

# Example: Strategy Red-Team — "Fails If ___"

## Context
cAgents' pre-mortem coverage is buried in two resource files and outputs a risk
taxonomy, not an action. A red-team is different from a pre-mortem: a pre-mortem
imagines the plan already failed and narrates why; a red-team attacks the load-bearing
assumptions *now*, while there's still time to test the cheapest one. This gives
`strategic-planner` / `product-owner` a weekly-actionable stress test.

## Example

```
1. Extract every claim in the plan; KEEP ONLY the load-bearing ones
   (if false, the plan dies). Discard nice-to-haves.
2. Steelman FIRST, then attack the steelman — an attack on a weak version of the
   claim is worthless.
3. Write each failure mode as a falsifiable "Fails if ___" (concrete, testable),
   never a vague risk category like "market risk".
4. Rank by (impact if wrong) x (likelihood wrong) x (cheapness to test).
5. Self-refute, don't fabricate: default to "this risk is real" unless the plan cites
   counter-evidence; say plainly what's well-reasoned rather than manufacturing doubt.
```

For each surviving kill-assumption, output four fields:

```
Assumption: "Enterprises will self-serve onboard without a sales call."
  Fails if:            > 40% of trials stall at the SSO-config step.
  Evidence to get this week: instrument the trial funnel; read last 20 trial sessions.
  Kill criterion:      if median time-to-first-value > 30 min, the self-serve motion is dead.
  Cheapest test:       watch 5 real onboardings on a call this Thursday.
```

The output is a ranked list of what to *test this week*, ordered so the cheapest,
highest-impact kill-assumption is first — not a sorted risk register.

## Why it matters
Sharper and more actionable than cAgents' scattered pre-mortem coverage: it hands the
operator a concrete weekly action. Candidate for a `pat-red-team-assumptions.md`
playbook wired into `strategic-planner` (strategy) and `product-owner` (product).
Distilled from phuryn/pm-skills `pm-execution/skills/strategy-red-team/SKILL.md`.
