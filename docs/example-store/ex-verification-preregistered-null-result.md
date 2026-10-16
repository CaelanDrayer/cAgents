---
name: ex-verification-preregistered-null-result
description: "Example: evaluate a gate, a rule, or an intervention with hypotheses written before the run, placebo and ablation arms, a fixed sample, and a rule to report the result whichever way it comes out, including a null and the cost. Load when an agent designs or reports a test of whether a change works."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-verification-preregistered-null-result
  category: verification
  source_repo: affaan-m/ECC
  source_url: "https://github.com/affaan-m/ECC"
  source_commit: b92f181b3b748d1abbc2afd94af6aa7d8c8fca29
  reviewed: "2026-10-15"
  applies_to:
    - cagents:scholar
    - cagents:data-scientist
    - cagents:social-scientist
    - cagents:optimizer
  demonstrates: "Pre-register hypotheses, arms, sample, and the reporting rule; include placebo and ablation arms; report the null and the cost; never cite an unconfirmed effect."
  added: "2026-10-15"
---

# Example: Pre-Registered Evaluation That Reports the Null

## Context
Use this pattern when an agent must show that a change works. The change can
be a review gate, a new onboarding email, a tutoring method, or a pricing test.
CLAUDE.md says that a MEASURED figure and an ESTIMATE must never be conflated.
This example shows how to design the measurement so that a null result is
possible, and how to report it when it comes.

This pattern covers the plan and the statistics. For blind judging, a
weighted rubric, and runner isolation, see `ex-verification-blind-baseline-eval`.
Use both when an instruction change decides a release.

## Example

Write the plan before the first trial. Do not change it after you see results.

```yaml
evaluation_plan:            # frozen before the run
  hypotheses:
    H1: "The change passes more cases than no change (arm: off)."
    H2: "The change passes more cases than a placebo with the same friction
         but generic content (arm: placebo). If not, the gain comes from the
         pause, not from the content."
    H3: "Removing the part aimed at one failure (arm: minus-target) lowers the
         pass rate on that failure."
    H4: "Report the cost (time, turns, spend) next to the effect."
  primary_outcome: "pass, paired by case and repetition; exact McNemar; alpha 0.05"
  sample: "48 pairs, fixed now from a power estimate. No extension after a near miss."
  frozen_inputs: [cases, graders, prompts, arms, model]
  validity: "Exclude and count trials with tool errors. If >10% are invalid, report inconclusive."
  reporting: "Report the result whichever way it comes out, including a null."
```

Before you trust the cases, ask why they could fail to measure anything:

| Check | Fault it finds |
|---|---|
| Can the agent find the deciding fact without the change? | The test measures where the change cannot help. |
| Is the channel the change depends on turned on? | A clarifying-question gate tested with no one to answer. |
| Did you write the pass criterion in the change's own vocabulary? | The check passes by construction. |
| Does a decoy answer score below the reference answer? | The grader cannot tell good from bad. |

Report in this shape. The upstream author published this null for their own gate:

```
Primary: gate 25/48 (52%), off 18/48 (38%). Exact McNemar p = 0.210.
Verdict: NOT CONFIRMED at the pre-registered alpha.
Cost: +37% turns, +40% spend. This held in every run.
Observed: no trial passed without the deciding fact (association, not cause).
To settle it: about 177 pairs for 80% power at the observed effect.
Runs are not pooled: the protocol changed between them.
```

## Why it matters
`optimizer`, `scholar`, `data-scientist`, and `social-scientist` all report
effects that steer decisions. A placebo arm separates "the content worked" from
"any pause worked". A frozen sample stops a run from growing until it looks
good. A published null with its cost tells the user whether to keep paying for
the change. Distilled from affaan-m/ECC `docs/gateguard/question-effectiveness.md`
(Hypotheses, Arms, Why it measured nothing, Confirmatory run).
