---
name: ex-security-trigger-collision-abuse
description: "Example: SkillSpector's TR1-3 trigger-abuse checks. Catch a single-common-word trigger that over-fires, a trigger that shadows a reserved or built-in command by its whole name, and a baiting phrase with no domain scope. Load when you add a new skill or agent trigger, or write a trigger-collision CI check."
license: Apache-2.0
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-security-trigger-collision-abuse
  category: security
  source_repo: NVIDIA/SkillSpector
  source_url: "https://github.com/NVIDIA/SkillSpector"
  source_commit: 4c52fbb83bbca0dd13f2685453c9b661d8c95bf8
  applies_to:
    - cagents:planner
    - cagents:security-engineer
  demonstrates: "Trigger-abuse checks (TR1-3): single-common-word triggers, whole-name shadow collisions with reserved names, and unscoped keyword-baiting."
  added: "2026-07-10"
  reviewed: "2026-10-15"
---

# Example: Trigger Collision and Trigger Abuse

## Context
Routing in cAgents depends on trigger phrases that stay distinct and specific.
Three surfaces carry them: the Layer-2 keyword routing in `prompt-router.cjs`, the
`TRIGGER:` and `NOT for:` clauses in each skill description, and
`_MODE_REGISTRY.md`. No CI check tests a new trigger for over-breadth, for a
collision with a reserved name, or for baiting.

## Example

Check each new `TRIGGER:` phrase against three rules:

| Rule | What it catches | Bad example |
|------|-----------------|-------------|
| **TR1**: over-broad | a single common word, or a trigger of 2 characters or less | trigger: `help`, `run`, `go` |
| **TR2**: shadow command | a trigger whose WHOLE name equals a reserved skill or a built-in | trigger: `team` collides with `/team`; `memory` collides with the built-in `/memory` |
| **TR3**: keyword-baiting | a phrase with no domain scope, written to fire on every prompt | "use this for any message in the chat" |

The reserved names in cAgents are the skills `act`, `team`, `designer`, and
`helper`, plus the built-ins `memory` and `init`.

**TR2 matches whole names only.** A substring match is not a collision. Thus
`/act-lite` and `act-review` do not shadow `/act`. A trigger collides only if the
reserved name is the object of the trigger. The two cases are a slash token with
the same whole name, and an "intercept" verb such as "replaces /act".

**TR3 accepts a domain-qualified "anything".** A phrase such as "anything with
PDF files", "anything involving invoices", or "anything related to payroll" names
a domain. It is not baiting. A phrase that has "anything" with a pronoun or a
broad preposition still fails, for example "anything the user asks".

Worked check:

```
New skill "roadmap-runner", description TRIGGER: "act, roadmap, plan, act-review"
  - "act"        -> TR2 FAIL: the whole name equals the /act skill. The router will mis-route.
  - "act-review" -> TR2 PASS: the whole name is not a reserved name.
  - "plan"       -> TR1 WARN: a common word. It will over-fire on unrelated prompts.
Fix: TRIGGER: "roadmap-runner, product roadmap execution, quarter plan build"
     These triggers have many words, are specific, and do not collide with a reserved name.

Description: "Use whenever the user wants to do anything with sales forecasts"
  - TR3 PASS: "with sales forecasts" names the domain.
Description: "Use for any message in the chat"
  - TR3 FAIL: no domain scope.
```

This check works with the description rules in `ex-skill-authoring-pushy-description`.
A description can be pushy, but its triggers must be specific and free of
collisions.

## Why it matters
A new skill or agent can claim a trigger that collides with `/act`, or a trigger
that over-fires. No check in cAgents finds that today. A future
`validate-triggers.sh` can scan `.claude/skills/*/SKILL.md` and
`_MODE_REGISTRY.md`. Whole-name matching and the domain-qualifier rule keep that
check free of the false positives that upstream had to fix.

Distilled from NVIDIA/SkillSpector
`src/skillspector/nodes/analyzers/static_patterns_supply_chain.py` (TR1-3).
Upstream license: Apache-2.0. The text is a paraphrase, and no upstream code is
copied.
