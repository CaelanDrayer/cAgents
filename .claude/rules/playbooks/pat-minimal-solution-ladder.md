---
paths:
  - ".claude/rules/playbooks/pat-minimal-solution-ladder.md"
  - ".claude/rules/core/execution.md"
  - ".claude/rules/playbooks/pat-two-stage-review.md"
  - "agents/**"
  - ".claude/skills/act/**"
  - "scripts/**"
  - ".claude/hooks/**"
  - "tests/**"
  - "cagents-memory/sessions/**/workflow/work_items.yaml"
  - "cagents-memory/sessions/**/outputs/**"
name: pat-minimal-solution-ladder
description: "Pattern: a minimalism counterweight to cAgents' aggressive-decomposition bias. Before writing new code or adding a work item, walk a six-rung ladder (YAGNI -> stdlib -> native platform feature -> existing dependency -> one-liner -> minimum viable change) and only write new code when every cheaper rung fails. Use in execution agents and reviewer Stage-2."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.18.0+"
metadata:
  version: "1.0.0"
  author: cagents
  audience: "execution agents, reviewers"
  inspiration: "DietrichGebert/ponytail — 'the best code is the code you never wrote'"
  applies_to:
    - cagents:backend-developer
    - cagents:frontend-developer
    - cagents:reviewer
    - all-execution-agents
---

# Pattern: Minimal-Solution Ladder

cAgents biases hard toward **aggressive decomposition**. The planner unpacks a
one-line request into 30+ work items, and controllers spawn a specialist for each
one. That bias is correct for *coordination*. Left unchecked, it leaks into
*implementation*. Agents reach for a new abstraction, a new helper module, or a
new dependency when something far smaller would do.

This playbook is the missing minimalism counterweight. Its north star comes from
the external `ponytail` skill: **the best code is the code you never wrote.**

Decomposition tells you *what concerns exist*. The ladder tells you *how little
to write per concern*.

## The Ladder

Walk these rungs from the top down before you write new code. Walk them also
before you add a work item that implies new code. Stop at the first rung that
meets the need. Reach rung 7 and write new code only when every cheaper rung
genuinely fails.

| Rung | Question | Example |
|------|----------|---------|
| 1. **YAGNI** | Is this needed *now*, or speculative? | Drop the "configurable strategy" no caller uses. |
| 2. **stdlib** | Does the language/runtime stdlib already do this? | `crypto.randomUUID()` not a uuid dep; `Array.prototype.flat` not lodash. |
| 3. **native platform feature** | Does the platform/framework/DB give this for free? | A DB unique constraint instead of app-level dedup; CSS `:has()` instead of a JS observer. |
| 4. **existing dependency** | Is a dep already in the tree that covers this? | Reuse the installed `yaml` parser; don't add `js-yaml` alongside it. |
| 5. **one-liner** | Can a single expression replace the proposed block/file? | `items.reduce(...)` instead of a 20-line accumulator class. |
| 6. **minimum viable change** | What is the smallest diff that meets the acceptance criteria? | Edit one function; don't refactor the module around it. |
| 7. **write new code** | Only here, after 1-6 fail | Genuinely new behavior with no cheaper substitute. |

The ladder is a default, not a dogma. A rung is "satisfied" only when it meets
the acceptance criteria. A rung that only compiles is not satisfied.

## When it applies

- **Execution agents** that implement a work item: walk the ladder *before* the
  first Write or Edit. If a cheaper rung wins, name that rung in your evidence.
- **Reviewer Stage-2, which is the code-quality stage**: use the ladder as a
  subtractive lens. Ask what you can delete. Ask whether the stdlib, a native
  feature, or an existing dependency can replace this new code. This pairs with
  the Simplicity Override Rule: equal results plus less code means KEEP. See
  @.claude/rules/playbooks/pat-two-stage-review.md.

## When it does NOT apply

- The need *genuinely calls for the abstraction*. Three cases qualify. Three
  call sites already duplicate the logic, so the rule of three earns the
  extraction. A public contract must stay stable. A security boundary or a
  compliance boundary needs an explicit, auditable layer. Minimalism is not an
  excuse to skip error handling, validation, or the tests that the acceptance
  criteria ask for.
- A code removal would breach an acceptance criterion. The ladder reduces the
  *means*, never the *ends*.
- The "cheaper" rung saves lines, but it is much worse in correctness, in
  readability, or in security. A clear 10-line function beats a clever one-liner
  that needs a comment to decode.

## Deliberate-shortcut comment convention

Sometimes you pick a minimal choice on purpose, and a future reader can mistake
it for an oversight. Mark that choice with a self-documenting `ponytail:` marker,
so that the intent is auditable. The marker maps onto the deferral vocabulary and
the dead-letter vocabulary that cAgents already has. It is the *inline*
counterpart of a deferral note:

```
// ponytail: stdlib crypto.randomUUID() — no uuid dep needed (ladder rung 2)
// ponytail: deferred config knob — YAGNI until a second caller appears (rung 1)
```

Convention:

- Prefix: `ponytail:` in lowercase, in the comment syntax of the language.
- Body: the rung that justified the choice, and a one-clause reason.
- For a *deferred* abstraction at rung 1, which is YAGNI, say what would re-open
  it. An example is "until a second caller appears". This note is the inline twin
  of a `deferral_list.md` entry. Reviewers treat it the same way: it is a
  documented, intentional minimal choice, not a dead_letter and not a TODO debt.

A `ponytail:` marker is *not* a code smell. Reviewers must not flag it as
incomplete work. It is the opposite: it is evidence that minimalism was a
considered decision.

## See also

- `.claude/rules/playbooks/pat-two-stage-review.md`: the Stage-2 code-quality
  lens.
- `.claude/rules/core/execution.md`: the execution agent patterns.
- `agents/developer/quality/code-reviewer/SKILL.md`: the Simplicity Override
  Rule.
