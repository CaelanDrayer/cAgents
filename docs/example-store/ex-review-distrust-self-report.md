---
name: ex-review-distrust-self-report
description: "Example: a reviewer dispatch prompt that treats the executor's self-report, including its stated design rationale, as an unverified claim to check against the diff. Load when you write or tighten a cAgents reviewer or controller prompt."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-review-distrust-self-report
  category: review
  source_repo: obra/superpowers
  source_url: "https://github.com/obra/superpowers"
  source_commit: bb92a77741419a4ab5f06e711a283343f1ada0c3
  reviewed: "2026-10-15"
  applies_to:
    - cagents:reviewer
    - all-controllers
  demonstrates: "Reviewer treats the implementer's self-report (incl. stated rationale) as an unverified claim to verify against the diff."
  added: "2026-07-10"
---

# Example: Distrust the Self-Report

## Context
cAgents' two-stage review (`pat-two-stage-review.md`) and evidence-first execution
(`pat-evidence-first-execution.md`) ask for specific evidence. Neither tells the
reviewer to distrust what the executor claims. A DONE report, a `self_validation`
YAML, or a `ponytail:` "kept it simple per YAGNI" marker is a claim, not proof.
Add this instruction to each reviewer or controller dispatch prompt.

## Example

Add a short "Do not trust the report" block to the reviewer prompt:

```
You are reviewing WI-{N}. You have the diff (git SHAs), the acceptance
criteria, and the implementer's report.

Do not trust the report. The implementer's summary is an unverified claim.
This includes each stated design rationale ("kept it simple per YAGNI",
"deferred per ponytail: marker", "validated elsewhere"). Check each claim
against the actual diff:

  - Report says "added token-expiry check" -> find it in the diff, cite file:line.
  - Report says "tests pass"               -> find the test in the diff and the
                                               reported output. Run a focused test
                                               only when the code gives you a
                                               specific doubt. Do not re-run the
                                               whole suite to confirm the report.
  - Report gives a rationale for an omission -> verify that the omission is safe.
                                               A rationale never lowers a
                                               finding's severity.
  - The brief lists N files                -> each listed file must have a hunk.
                                               A listed file with no hunk is a
                                               Missing finding.
  - Evidence looks truncated or unreadable -> re-read it at its stated path.
                                               Unreadable is not invalid. Report
                                               it as a gap, not as a failure.

If you cannot find a claim in the diff, the verdict is REVISE, not PASS.
You review. You do not dispatch subagents.
```

Add one rule for the dispatcher (the controller): do not pre-judge findings in
the dispatch prompt. Phrases such as "you probably will not find anything",
"at most a Minor issue here", or "the plan chose this" bias the reviewer.
Leave them out. The reviewer decides severity.

## Why it matters
superpowers lists "Agent said success" as an insufficient basis for a
completion claim. This block closes the gap where a cAgents controller or
reviewer accepts a self-validation YAML or a `ponytail:` marker at face value.
The focused-test rule keeps review cost low: the reviewer reads evidence first
and runs code only to settle a specific doubt. Distilled from obra/superpowers
`skills/subagent-driven-development/task-reviewer-prompt.md` and
`skills/subagent-driven-development/SKILL.md` (dispatcher rule).
