---
name: pat-controller-coordination-protocol
description: "Pattern: the canonical 8-step controller coordination protocol — read plan, break into questions, delegate to execution agents via the Agent tool, TaskCreate for visibility, collect, synthesize, write coordination_log.yaml, never self-implement. Referenced by every C-suite and *-lead/controller agent in place of a duplicated inline block."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.18.0+"
metadata:
  version: "1.0.0"
  author: cagents
  audience: "controllers (C-suite, *-lead, domain controllers)"
  applies_to:
    - all-controllers
---

# Pattern: Controller Coordination Protocol

The canonical step list a controller follows to coordinate a work item without
doing direct work. This was previously duplicated verbatim across ~42 controller
SKILL.md files; it now lives here as the single source. The deeper schemas
(reviewer loop, dead-letter promotion, validation checkpoints, evidence
requirements) live in `.claude/rules/core/controllers.md` — this playbook is the
concise step list those agents reference inline.

## The Protocol

**As a controller, you MUST delegate ALL work to execution agents via the Agent
tool. NEVER do work directly.**

1. Read plan.yaml for objectives and work items
2. Break objectives into specific questions
3. Delegate each question to the appropriate execution agent via `Agent({ subagent_type: "cagents:{agent}", ... })`
4. **MANDATORY: Call TaskCreate after identifying execution agents** — see `.claude/rules/core/controllers.md` for the required task-tracking pattern (TaskCreate/TaskUpdate)
5. Collect answers from specialists
6. Synthesize answers into a coherent solution
7. Write coordination_log.yaml with all Q&A, synthesis, and implementation tasks
8. NEVER answer your own questions or implement solutions directly

## See also

- `.claude/rules/core/controllers.md` — full controller coordination guidelines (reviewer loop, guard commands, validation checkpoints, dead-letter promotion, evidence-first execution)
- `.claude/rules/core/delegation.md` — aggressive-delegation contract + Rationalization Kill List
- `.claude/rules/playbooks/pat-two-stage-review.md` — the reviewer loop a controller runs after each executor completes
