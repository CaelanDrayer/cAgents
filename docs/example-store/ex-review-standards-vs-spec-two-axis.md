---
name: ex-review-standards-vs-spec-two-axis
description: "Example: two independent review axes, Standards (conventions and code smells) and Spec (does the diff match the work item). They run as parallel sub-agents, show side by side, and never merge into one score. Load when you design a parallel reviewer variant."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-review-standards-vs-spec-two-axis
  category: review
  source_repo: mattpocock/skills
  source_url: "https://github.com/mattpocock/skills"
  source_commit: 49dd158d1076134a641b33efb035946536778336
  reviewed: "2026-10-15"
  applies_to:
    - cagents:reviewer
    - cagents:qa-lead
    - all-controllers
  demonstrates: "Two orthogonal review axes (Standards vs Spec) run in parallel and never merged or reranked into one score."
  added: "2026-07-10"
---

# Example: Standards-vs-Spec Two-Axis Review (Never Merged)

## Context
cAgents' Two-Stage Review does spec compliance (Stage 1) and then code quality
(Stage 2) in one reviewer call. This example shows the parallel alternative. Two
sub-agents review two independent axes at the same time. Their reports stay
separate, because a change can pass one axis and fail the other. A merged score
hides that.

## Example

**Pre-flight.** Fix the review target before you spawn anything. Resolve the
base and head with `git rev-parse` and make sure that the diff is not empty. If
the diff is empty, stop and report that there is nothing to review.

Then issue both sub-agent calls together, in the foreground:

```
Reviewer 1, STANDARDS axis:
  Check the diff against (a) the conventions that the repo documents and (b) a
  fixed code-smell baseline. For each finding: what it is -> how to fix it.
  The repo standard wins over the baseline. A baseline smell is always a
  judgement call, so label it "possible".
  Baseline (Fowler 12): Mysterious Name, Duplicated Code, Feature Envy, Data Clumps,
  Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change,
  Speculative Generality, Message Chains, Middle Man, Refused Bequest.

Reviewer 2, SPEC axis:
  Does the diff match the work item and its acceptance criteria? Include a
  sub-check for undocumented scope creep: changed lines that trace to no criterion.
```

Show the two reports under separate headings. Do not rerank them, and do not
combine them into one PASS or one score:

```
Summary: Standards 1 finding (worst: possible Feature Envy) | Spec 1 finding (worst: scope creep)

## Standards review
- [POSSIBLE] Feature Envy: src/order.ts:40 pulls 5 fields off Customer -> consider moving the method.
## Spec review
- [PASS] All 3 acceptance criteria met.
- [SCOPE CREEP] src/order.ts:12 renamed an unrelated helper. No criterion covers it.
```

The summary line gives the count for each axis and the worst finding in each
axis. A diff can be `Standards: PASS / Spec: FAIL` (clean code, wrong feature).
It can also be `Standards: FAIL / Spec: PASS` (it works, but the code is poor).
One merged score hides both cases.

## Why it matters
This is prior art for a cAgents parallel-reviewer variant. It also gives
reviewers a fixed smell list to cite, with the repo standard on top. The rule
"never merge independent axes" is the main point that `pat-two-stage-review.md`
can adopt. Distilled from mattpocock/skills `skills/engineering/code-review/SKILL.md`.
