---
name: ex-review-standards-vs-spec-two-axis
description: "Example: two orthogonal review axes — Standards (conventions + code smells) and Spec (does the diff match the originating work item) — run as parallel sub-agents and presented side-by-side, deliberately never merged into one score. Load when designing a parallel reviewer variant."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-review-standards-vs-spec-two-axis
  category: review
  source_repo: mattpocock/skills
  source_url: "https://github.com/mattpocock/skills"
  applies_to:
    - cagents:reviewer
    - cagents:qa-lead
    - all-controllers
  demonstrates: "Two orthogonal review axes (Standards vs Spec) run in parallel and never merged or reranked into one score."
  added: "2026-07-10"
---

# Example: Standards-vs-Spec Two-Axis Review (Never Merged)

## Context
cAgents' Two-Stage Review sequences spec-compliance (Stage 1) then code-quality
(Stage 2) inside one reviewer call. This example shows the *parallel, never-merged*
alternative: two sub-agents review two orthogonal axes at once, and their reports are
kept separate because a change can pass one axis and fail the other — merging masks it.

## Example

Spawn two `general-purpose` sub-agents in ONE message:

```
Reviewer 1 — STANDARDS axis:
  Check the diff against (a) repo-documented conventions and (b) a fixed code-smell
  baseline. For each smell: what it is -> how to fix.
  Baseline (Fowler 12): Mysterious Name, Duplicated Code, Feature Envy, Data Clumps,
  Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change,
  Speculative Generality, Message Chains, Middle Man, Refused Bequest.

Reviewer 2 — SPEC axis:
  Does the diff match the originating work item / acceptance criteria? Include a
  sub-check for UNDOCUMENTED SCOPE CREEP (changed lines that trace to no criterion).
```

Present the two reports under separate headings — **do not rerank or combine into a
single PASS/score**:

```
## Standards review
- [HIGH] Feature Envy: src/order.ts:40 pulls 5 fields off Customer -> move method.
## Spec review
- [PASS] All 3 acceptance criteria met.
- [SCOPE CREEP] src/order.ts:12 renamed unrelated helper — not in any criterion.
```

A diff can be `Standards: PASS / Spec: FAIL` (clean code, wrong feature) or
`Standards: FAIL / Spec: PASS` (works, but a mess). One merged score hides that.

## Why it matters
Prior-art for a cAgents parallel-reviewer variant and a concrete Fowler-smell
baseline reviewers can cite. The "never merge orthogonal axes" rule is the key
insight `pat-two-stage-review.md` can adopt. Distilled from mattpocock/skills
`skills/engineering/code-review/SKILL.md`.
