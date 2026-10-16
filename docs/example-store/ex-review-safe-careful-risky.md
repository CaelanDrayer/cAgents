---
name: ex-review-safe-careful-risky
description: "Example: risk-tiered auto-apply for code-quality findings. SAFE findings apply at once, CAREFUL findings apply and then re-run the guard for one file, and RISKY findings are flagged only. Each finding cites file:line and states its cost, and a Chesterton's-Fence check runs before any removal. Load for Stage-2 review design."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-review-safe-careful-risky
  category: review
  source_repo: NousResearch/hermes-agent
  source_url: "https://github.com/NousResearch/hermes-agent"
  source_commit: ca069e12239a2c8d13887ac9f983557d00bdcfd2
  applies_to:
    - cagents:reviewer
    - cagents:qa-lead
  demonstrates: "Risk-tiered auto-apply (SAFE, CAREFUL, RISKY) with file:line-cited findings, a cost field, and a Chesterton's-Fence check."
  added: "2026-07-10"
  reviewed: "2026-10-15"
---

# Example: SAFE, CAREFUL, and RISKY Auto-Apply Tiers

## Context
The Stage-2 code-quality review in `pat-two-stage-review.md` tags each finding with
a severity: CRITICAL, HIGH, or LOW. Severity alone does not say if a fix is safe to
apply without a human. This example adds an apply tier that is independent of the
severity. Mechanical fixes then land at once, and real risks go to the controller.

This review is a cleanup pass on code that already works. It is not a search for
correctness bugs. Use the Stage-1 spec review and the security audit for bugs.

## Example

Four narrow reviewers run in parallel. Each reviewer gets the **entire** diff,
because a split diff hides cross-file problems. Each reviewer looks for one class
of problem only:

| Reviewer | Looks for |
|----------|-----------|
| Reuse | new code that copies a helper or a constant that already exists |
| Quality | redundant state, parameter sprawl, deep nesting, copy-paste variants |
| Efficiency | repeated work, missed concurrency, silent failures, broad reads |
| Altitude | a fix at the wrong depth: a special case or a workaround on shared code |

The Altitude reviewer asks one question: does this change patch one call site
while the shared mechanism keeps the flaw? If yes, it names the deeper fix. If the
deeper fix is large, it says so and proposes a separate work item.

Each finding must cite `file:line` and state its **cost**. The cost is what the
problem wastes, duplicates, or makes harder to maintain. If a reviewer cannot
state a cost, the finding is a nit. Drop it.

Each finding also carries an apply tier:

| Tier | Rule | Examples |
|------|------|----------|
| **SAFE** | Apply with no confirmation | unused imports, dead variables, typos in strings |
| **CAREFUL** | Apply, then re-run the guard for that one file | rename a local variable, extract a private helper |
| **RISKY** | Flag only. Never apply it automatically. | public API rename, signature change, edit that changes behavior |

```yaml
findings:
  - reviewer: reuse
    tier: SAFE
    location: "src/auth/session.ts:3"
    cost: "unused import adds a load-time dependency"
    action: applied
  - reviewer: quality
    tier: CAREFUL
    location: "src/auth/hash.ts:15"
    cost: "name hides that the value is a salt"
    action: applied
    verify: "npm test src/auth -> 12/12 pass"
  - reviewer: altitude
    tier: RISKY
    location: "src/api/routes.ts:88"
    cost: "special case for one caller; two sibling routes keep the same flaw"
    action: flagged        # the controller decides
    confidence: low
```

**Chesterton's-Fence rule**: before you flag code for removal, run `git blame` on
it. If you cannot find why the code exists, mark `confidence: low` and make the
finding flag-only. An apparent workaround can be a deliberate boundary, such as a
compatibility shim or a staged migration. Do not flag those.

**No Agent tool**: if the reviewer cannot spawn subagents, it does not skip any
reviewer. It runs all four reviews in sequence in its own context, with the same
finding format. The final summary then says that a single inline pass ran in place
of the parallel fan-out. The controller then knows what ran.

## Why it matters
A cAgents reviewer can tell "safe to fix and note" from "escalate" without an
extra revision round for mechanical cleanups. The cost field removes nits, and the
Chesterton's-Fence rule stops confident but wrong deletions. Distilled from
NousResearch/hermes-agent `skills/software-development/simplify-code/SKILL.md`,
version 1.1.0.
