---
paths:
  - ".claude/rules/playbooks/pat-controller-coordination-protocol.md"
  - ".claude/rules/core/controllers.md"
  - ".claude/rules/core/delegation.md"
  - "agents/**"
  - ".claude/skills/**"
  - "cagents-memory/sessions/**/workflow/plan.yaml"
  - "cagents-memory/sessions/**/workflow/coordination_log.yaml"
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

This is the canonical step list. A controller follows it to coordinate a work
item without doing direct work. Earlier, these steps were copied word for word
into ~42 controller SKILL.md files. They now live here as the single source.

The deeper schemas live in `.claude/rules/core/controllers.md`. Those schemas are
the reviewer loop, the dead-letter promotion, the validation checkpoints, and the
evidence that a controller needs. This playbook is the short step list that those
agents reference inline.

## The Protocol

**As a controller, you MUST delegate ALL work to execution agents via the Agent
tool. NEVER do work directly.**

1. Read plan.yaml for the objectives and the work items.
2. Break each objective into specific questions.
3. Delegate each question to the correct execution agent with `Agent({ subagent_type: "cagents:{agent}", ... })`.
4. **MANDATORY: call TaskCreate after you identify the execution agents.** See
   `.claude/rules/core/controllers.md` for the task-tracking pattern that
   TaskCreate and TaskUpdate follow.
5. Collect the answers from the specialists.
6. Synthesize the answers into one coherent solution.
7. Write coordination_log.yaml with all of the Q&A, the synthesis, and the
   implementation tasks.
8. NEVER answer your own questions, and NEVER implement a solution yourself.

## See also

- `.claude/rules/core/controllers.md`: the full controller coordination
  guidelines. They cover the reviewer loop, the guard commands, the validation
  checkpoints, the dead-letter promotion, and evidence-first execution.
- `.claude/rules/core/delegation.md`: the aggressive-delegation contract and the
  Rationalization Kill List.
- `.claude/rules/playbooks/pat-two-stage-review.md`: the reviewer loop that a
  controller runs after each executor completes.
