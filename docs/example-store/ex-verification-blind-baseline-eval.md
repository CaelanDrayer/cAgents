---
name: ex-verification-blind-baseline-eval
description: "Example: measure a prompt, skill, or rule change against a no-change baseline. Use a fixed case set, N trials, a blind judge, a weighted rubric with a blocker flag, isolated runners, and a comparative release gate. Load when you must show that an instruction change helps, not only that it reads better."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-verification-blind-baseline-eval
  category: verification
  source_repo: ayghri/i-have-adhd
  source_url: "https://github.com/ayghri/i-have-adhd"
  source_commit: 1ecea1993b7fce257ffbd686c070948b5e07eda6
  reviewed: "2026-10-15"
  applies_to:
    - cagents:optimizer
    - cagents:data-scientist
    - cagents:wave-reviewer
  demonstrates: "Blind A/B/C judge, weighted rubric plus blocker flag, runner isolation, identical (case, trial) coverage, recorded model and cost, comparative not absolute gate."
  added: "2026-10-15"
---

# Example: Blind Baseline Eval for an Instruction Change

## Context
cAgents changes its skills, rules, and agent bodies often. A change can read
better and still make the output worse. Use this pattern when a work item says
"improve" a prompt, a style rule, a template, or a piece of copy. The same
method fits a marketing message test or a support macro test.

This pattern grades instruction changes. It is not
`ex-review-blind-dual-convergence`, which grades one code change with two
reviewers.
For hypotheses written before the run, placebo and ablation arms, and a
significance test that can report a null, see
`ex-verification-preregistered-null-result`.

## Example

**1. Fix the case set.** Write each case once, with criteria and a risk tag.
Include cases where the change is meant to help, and cases where it must not hurt.
Examples are a request for a long explanation, a destructive step, and a
partial success.

**2. Run each condition with the same inputs.** Baseline is the bare prompt.
Candidate is the same prompt plus the change. Run N trials for each case,
where N is 3 or more.

**3. Isolate the runner.** Start each run without the user settings, hooks,
plugins, or memory of the operator. If you skip this step, an always-on hook
can put the candidate text into the baseline. The test then compares the
change with itself. Pin the model, because isolation also drops the saved
model choice.

**4. Judge blind.** Give the judge all conditions for one (case, trial) at the
same time. Relabel them A, B, C and change the order for each group. Send the
judge only the rubric block. Keep the gate rules and the condition names out of
that block, because they show which output is which.

**5. Score on a weighted rubric with a blocker flag.**

| Dimension | Weight | Measure |
|---|---:|---|
| Correctness | 35% | Facts and required details are correct |
| Autonomy | 25% | The agent does its own work and does not push it to the user |
| Actionability | 20% | The next action is easy to find and do |
| Safety | 10% | Risk, confirmation, and ambiguity are handled correctly |
| Concision | 10% | No filler, and no needed content is lost |

Set `blocker: true` for a dangerous instruction, a material error, a broken
output contract, or a task that the agent does not finish.

**6. Compare only like with like.** Both conditions need the same runner, the
same model, and identical (case, trial) rows. If a group is incomplete, report
it and leave it out. Record the date, the model, the CLI version, the trial
count, and the cost.

**7. Use a comparative gate.** Release the candidate when these are true:

- Correctness and safety are within 0.1 of baseline, or better.
- The weighted score is higher than baseline.
- The candidate has no more blockers than baseline, after you remove the
  cases that no run can pass.

The upstream gate used "zero blockers" as an absolute rule. The candidate cut
blockers from 7 to 3 and still failed. One case could not pass in any run,
because the runner gave the model no tools. An absolute gate with an
unpassable case can never pass.

**8. Read small numbers with care.** With 3 trials, a per-case delta below
about 0.5 is noise. Trust the aggregate more than a single row. A judge from
the same model family as the runner is a known bias, so add a second judge
model when the result decides a release.

## Why it matters
cAgents has `cagents-memory/_system/evals/` with measured performance runs, but
no measured arm for instruction quality. This pattern gives the validator and
the optimizer a method to prove that a rule change helps. The finding about
absolute gates also applies to wave-gate design in
`ex-gates-taxonomy-four-types`. Distilled from ayghri/i-have-adhd
`evals/rubric.md`, `evals/README.md`, and `evals/RESULTS.md`, at commit 1ecea19
(MIT).
