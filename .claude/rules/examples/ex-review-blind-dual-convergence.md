---
name: ex-review-blind-dual-convergence
description: "Example: the Santa Method blind dual-review protocol — two independent reviewers with no shared context and an identical rubric must BOTH pass, with a fresh reviewer per revision round to defeat anchoring bias. Load for tier-3+ controller review design."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-review-blind-dual-convergence
  category: review
  source_repo: affaan-m/ECC
  source_url: "https://github.com/affaan-m/ECC"
  applies_to:
    - cagents:reviewer
    - cagents:tech-lead
    - all-controllers
  demonstrates: "Two independent blind reviewers, fresh agent per round (anti-anchoring), both must PASS; failure-mode + metrics table."
  added: "2026-07-10"
---

# Example: Blind Dual-Review with a Convergence Loop

## Context
cAgents' `controllers.md` says "Tier 3+: Blind review with 2-3 independent reviewers
+ Devil's Advocate" in one line. This example operationalizes it for a tier-3+
controller: two blind reviewers, both must pass, fresh reviewers each REVISE round.

## Example

```
Round R:
  Spawn Reviewer A and Reviewer B in ONE message (parallel, no shared context).
  Each gets ONLY: the diff + the identical rubric. Neither sees the other's verdict,
  nor its own verdict from a prior round.

  Each returns strict JSON:
    { "passed": true|false, "findings": [ {criterion, verdict, evidence: "file:line"} ] }

  Gate: passed ONLY if A.passed AND B.passed.
        Either FAIL -> collect union of findings -> executor fixes ->
        Round R+1 with FRESH A' and B' (never reuse a reviewer's context).
```

**Fresh-agent-per-round is the load-bearing rule** — a re-spawned reviewer carrying
its prior REVISE reasoning anchors on its own earlier judgment.

Track and log into `coordination_log.yaml`:

| Metric | Meaning |
|--------|---------|
| first_pass_rate | % items passing both reviewers on round 1 |
| mean_iterations | avg rounds to convergence |
| reviewer_agreement | % of items where A and B agreed |
| escape_rate | defects found after PASS (post-hoc) |

Named failure modes to guard against: infinite loop (cap rounds -> dead_letter),
rubber-stamping (require file:line evidence per criterion), reviewer-agreement bias
(the two must not share context), fix regression (re-run the full rubric, not just
the changed criterion).

## Why it matters
Gives cAgents' one-line blind-review mention a fully specified, logged protocol with
an explicit anti-anchoring rule the current Two-Stage Review omits. Distilled from
affaan-m/ECC `skills/santa-method/SKILL.md`.
