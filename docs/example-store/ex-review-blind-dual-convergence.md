---
name: ex-review-blind-dual-convergence
description: "Example: the Santa Method blind dual-review protocol. Two independent reviewers with no shared context and the same rubric must BOTH pass, with a fresh reviewer for each revision round to stop anchoring bias. Load for tier-3+ controller review design."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-review-blind-dual-convergence
  category: review
  source_repo: affaan-m/ECC
  source_url: "https://github.com/affaan-m/ECC"
  source_commit: b92f181b3b748d1abbc2afd94af6aa7d8c8fca29
  reviewed: "2026-10-15"
  applies_to:
    - cagents:reviewer
    - cagents:tech-lead
    - all-controllers
  demonstrates: "Two independent blind reviewers, fresh agent per round (anti-anchoring), both must PASS; failure-mode + metrics table."
  added: "2026-07-10"
---

# Example: Blind Dual-Review with a Convergence Loop

## Context
cAgents' `controllers.md` has one line: "Tier 3+: Blind review with 2-3
independent reviewers + Devil's Advocate". This example turns that line into a
protocol for a tier-3+ controller. Two blind reviewers must both pass, and each
REVISE round gets fresh reviewers.

## Example

```
Round 1 (blind dual review):
  Spawn Reviewer A and Reviewer B in ONE message (parallel, no shared context).
  Each gets ONLY: the diff + the identical rubric. Neither sees the other's verdict.

  Each returns strict JSON:
    { "passed": true|false, "findings": [ {criterion, verdict, evidence: "file:line"} ] }

  Gate: passed ONLY if A.passed AND B.passed.
        Either FAIL -> collect union of findings -> executor fixes -> Round 2.

Round 2 (REVISE round, scoped):
  Spawn FRESH A' and B' by agent type (never reuse a reviewer's context, never a fork).
  Each gets: the identical rubric + the round-1 findings list (as input data)
             + the fix diff. No earlier conversation, no earlier verdict reasoning.
  Each marks every round-1 finding addressed or not addressed.
  Each looks for new breakage only inside the fix diff.
  A new observation outside the fix diff is a deferred note. It does not make
  the round REVISE.
  Gate: passed ONLY if A'.passed AND B'.passed. Else the item goes to dead_letter.
```

**A fresh agent for each round is the load-bearing rule.** A reviewer that
carries its earlier REVISE reasoning anchors on its own earlier judgement. The
fresh reviewer still gets the earlier findings, but only as a list to check. The
canonical round-2 input rule is in `.claude/rules/playbooks/pat-two-stage-review.md`
§ Fresh reviewer per round. That playbook wins if this example differs from it.

Record these metrics in `coordination_log.yaml`:

| Metric | Meaning |
|--------|---------|
| first_pass_rate | % of items that pass both reviewers in round 1 |
| mean_iterations | average rounds to convergence |
| reviewer_agreement | % of items where A and B agreed |
| escape_rate | defects found after PASS (post-hoc) |

Guard against these failure modes:

| Failure mode | Guard |
|---|---|
| Infinite loop | Cap the rounds, then send the item to dead_letter. cAgents caps the reviewer loop at 2 rounds (upstream uses 3). |
| Rubber stamp | Require file:line evidence for each criterion. |
| Reviewer-agreement bias | Keep the reviewers independent. Independence reduces this bias but does not remove it. For critical output, add a third reviewer or a human spot check. |
| Fix regression | Run the full rubric again, not only the changed criterion. |

**Large batches.** If one review covers many similar items, review a sample.
Upstream samples 10-15% of the batch, with a minimum of 5 items.

## Why it matters
This gives the one-line blind-review mention in cAgents a full protocol with a
log. It adds an explicit anti-anchoring rule that the current Two-Stage Review
does not have. Distilled from affaan-m/ECC `skills/santa-method/SKILL.md`.
