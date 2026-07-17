---
name: ex-review-distrust-self-report
description: "Example: a reviewer dispatch prompt that treats the executor's self-report — including its stated design rationale — as an unverified claim to check against the diff, never as evidence. Load when writing or tightening a cAgents reviewer/controller prompt."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-review-distrust-self-report
  category: review
  source_repo: obra/superpowers
  source_url: "https://github.com/obra/superpowers"
  applies_to:
    - cagents:reviewer
    - all-controllers
  demonstrates: "Reviewer treats the implementer's self-report (incl. stated rationale) as an unverified claim to verify against the diff."
  added: "2026-07-10"
---

# Example: Distrust the Self-Report

## Context
cAgents' two-stage review (`pat-two-stage-review.md`) and evidence-first execution
(`pat-evidence-first-execution.md`) ask for specific evidence, but neither tells the
*reviewer* to distrust what the executor claims. A DONE report, a `self_validation`
YAML, or a `ponytail:` "kept it simple per YAGNI" marker is a *claim*, not proof.
Add this instruction to any reviewer/controller dispatch prompt.

## Example

Add a short "Do Not Trust the Report" block to the reviewer prompt:

```
You are reviewing WI-{N}. You were given: the diff (git SHAs), the acceptance
criteria, and the implementer's report.

Do NOT trust the report. The implementer's summary — including any stated design
rationale ("kept it simple per YAGNI", "deferred per ponytail: marker",
"validated elsewhere") — is an UNVERIFIED CLAIM. Your job is to check each claim
against the actual diff:

  - Report says "added token-expiry check" -> find it in the diff, cite file:line.
  - Report says "tests pass"               -> the diff must contain the test, and
                                               you re-run it; a claimed pass is not a pass.
  - Report gives a rationale for an omission -> verify the omission is actually safe,
                                               do not let the rationale lower a finding's severity.

If a claim cannot be located in the diff, that is a REVISE, not a pass.
```

And a rule for the *dispatcher* (controller): never pre-judge findings in the
dispatch prompt. Phrases like "you probably won't find anything" or "at most a
Minor issue here" bias the reviewer — omit them. The reviewer decides severity.

## Why it matters
superpowers frames "Agent said success" as an *insufficient* basis for a completion
claim, sourced from real trust-loss incidents. This one paragraph closes the gap
where a cAgents controller or reviewer takes a self-validation YAML or `ponytail:`
marker at face value — turning the existing evidence-first rule into a
reviewer-enforced one. Distilled from obra/superpowers `task-reviewer-prompt.md`.
