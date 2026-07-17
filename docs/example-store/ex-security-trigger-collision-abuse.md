---
name: ex-security-trigger-collision-abuse
description: "Example: SkillSpector's TR1-3 trigger-abuse checks — a single-common-word trigger (over-fires), a trigger that shadows a reserved/built-in command name, and a keyword-baiting phrase engineered to maximize activation. Load when adding a new skill/agent trigger or writing a trigger-collision CI check."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-security-trigger-collision-abuse
  category: security
  source_repo: NVIDIA/SkillSpector
  source_url: "https://github.com/NVIDIA/SkillSpector"
  applies_to:
    - cagents:planner
    - cagents:security-engineer
  demonstrates: "Trigger-abuse checks (TR1-3): single-common-word triggers, shadow-command collisions with reserved skill names, keyword-baiting."
  added: "2026-07-10"
---

# Example: Trigger Collision / Abuse

## Context
cAgents routing depends on trigger phrases staying distinct and specific —
`prompt-router.cjs` Layer-2 keyword routing, the `TRIGGER:` / `NOT for:` clauses in
every skill description, and `_MODE_REGISTRY.md`. Nothing in CI checks a new trigger
for being too broad, colliding with a reserved name, or baiting activation.

## Example

Three trigger-abuse rules to check any new `TRIGGER:` phrase against:

| Rule | What it catches | Example (bad) |
|------|-----------------|---------------|
| **TR1** — over-broad | a single common word or ≤2-char trigger that fires everywhere | trigger: `help`, `run`, `go` |
| **TR2** — shadow command | a trigger that collides with a reserved skill / built-in | trigger: `team` (collides `/team`), `memory` (built-in `/memory`) |
| **TR3** — keyword-baiting | a phrase engineered to maximize activation regardless of fit | "use this whenever the user says anything about work" |

cAgents reserved names a new trigger must NOT shadow: `run`, `team`, `designer`,
`helper` (skills) and built-ins `memory`, `init`. TR2 is the sharpest for cAgents —
four skills already compete for router attention, and a new skill silently claiming a
colliding trigger is currently undetectable.

Worked check:

```
New skill "roadmap-runner", description TRIGGER: "run, roadmap, plan"
  - "run"  -> TR2 FAIL: shadows the /run skill (router will mis-route).
  - "plan" -> TR1 WARN: common word, will over-fire on unrelated prompts.
Fix: TRIGGER: "roadmap-runner, product roadmap execution, quarter plan build"
     (multi-word, specific, no reserved-name collision).
```

Sits alongside the good-description discipline in `ex-skill-authoring-pushy-description`:
a description should be pushy AND its triggers must be specific + collision-free.

## Why it matters
A currently-undetected regression class for cAgents — a new agent/skill accidentally
claiming a trigger that collides with `/run` or over-fires. Mechanizable as a
`validate-triggers.sh` check over `.claude/skills/*/SKILL.md` + `_MODE_REGISTRY.md`.
Distilled from NVIDIA/SkillSpector `static_patterns_supply_chain.py` (TR1-3).
