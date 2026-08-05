---
paths:
  - ".claude/rules/playbooks/pat-minimal-solution-ladder.md"
  - ".claude/rules/core/execution.md"
  - ".claude/rules/playbooks/pat-two-stage-review.md"
  - "agents/**"
  - ".claude/skills/run/**"
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

cAgents biases hard toward **aggressive decomposition** — the planner unpacks a
one-line request into 30+ work items, and controllers spawn specialists for each.
That bias is correct for *coordination*, but left unchecked it leaks into
*implementation*: agents reach for a new abstraction, a new helper module, or a
new dependency when something far smaller would do. This playbook is the missing
minimalism counterweight. Its north star, borrowed from the external `ponytail`
skill: **the best code is the code you never wrote.**

Decomposition tells you *what concerns exist*. The ladder tells you *how little
to write per concern*.

## The Ladder

Before writing new code (or before adding a work item that implies new code),
walk these rungs top-down. Stop at the first rung that satisfies the requirement.
Only reach "write new code" when every cheaper rung genuinely fails.

| Rung | Question | Example |
|------|----------|---------|
| 1. **YAGNI** | Is this needed *now*, or speculative? | Drop the "configurable strategy" no caller uses. |
| 2. **stdlib** | Does the language/runtime stdlib already do this? | `crypto.randomUUID()` not a uuid dep; `Array.prototype.flat` not lodash. |
| 3. **native platform feature** | Does the platform/framework/DB give this for free? | A DB unique constraint instead of app-level dedup; CSS `:has()` instead of a JS observer. |
| 4. **existing dependency** | Is a dep already in the tree that covers this? | Reuse the installed `yaml` parser; don't add `js-yaml` alongside it. |
| 5. **one-liner** | Can a single expression replace the proposed block/file? | `items.reduce(...)` instead of a 20-line accumulator class. |
| 6. **minimum viable change** | What is the smallest diff that meets the acceptance criteria? | Edit one function; don't refactor the module around it. |
| 7. **write new code** | Only here, after 1-6 fail | Genuinely new behavior with no cheaper substitute. |

The ladder is a default, not a dogma — a rung is "satisfied" only when it meets
the acceptance criteria, not merely when it compiles.

## When it applies

- **Execution agents** implementing a work item: walk the ladder *before* the
  first Write/Edit. If a cheaper rung wins, note the rung in your evidence.
- **Reviewer Stage-2 (code quality)**: use the ladder as a subtractive lens —
  "what can be deleted? could stdlib/native/an existing dep replace this new
  code?" This pairs with the Simplicity Override Rule (equal results + less
  code = KEEP). See @.claude/rules/playbooks/pat-two-stage-review.md.

## When it does NOT apply

- The requirement *genuinely needs the abstraction* — e.g., three call sites
  already duplicate the logic (rule-of-three earns the extraction), a public
  contract must be stable, or a security/compliance boundary requires an
  explicit, auditable layer. Minimalism is not an excuse to skip error handling,
  validation, or tests that the acceptance criteria require.
- Removing code would violate an acceptance criterion. The ladder reduces
  *means*, never *ends*.
- The "cheaper" rung is cheaper in lines but materially worse in correctness,
  readability, or security. A 10-line clear function beats a clever one-liner
  that needs a comment to decode.

## Deliberate-shortcut comment convention

When you *intentionally* pick a minimal choice that a future reader might
mistake for an oversight, mark it with a self-documenting `ponytail:` marker so
the intent is auditable. This maps onto cAgents' existing deferral / dead-letter
vocabulary — it is the *inline* counterpart of a deferral note:

```
// ponytail: stdlib crypto.randomUUID() — no uuid dep needed (ladder rung 2)
// ponytail: deferred config knob — YAGNI until a second caller appears (rung 1)
```

Convention:

- Prefix: `ponytail:` (lowercase), in the language's comment syntax.
- Body: the rung that justified the choice + a one-clause why.
- For a *deferred* abstraction (rung 1 / YAGNI), say what would re-open it
  (e.g., "until a second caller appears") — this is the inline twin of a
  `deferral_list.md` entry, and reviewers treat it the same way: a documented,
  intentional minimal choice, not a dead_letter or a TODO debt.

A `ponytail:` marker is *not* a code smell and reviewers should not flag it as
incomplete work — it is the opposite: evidence that minimalism was a considered
decision.

## See also

- `.claude/rules/playbooks/pat-two-stage-review.md` — Stage-2 code-quality lens
- `.claude/rules/core/execution.md` — execution agent patterns
- `agents/developer/quality/code-reviewer/SKILL.md` — Simplicity Override Rule
