---
name: ex-verification-verify-and-stop
description: "Example: turn the acceptance criteria into the smallest proof set, reuse current results, run focused checks first, report pass, fail, unavailable, or blocked as four distinct states, and stop when the proof is complete. Load when a validator or a gate must prove existing work without scope growth."
license: Apache-2.0
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-verification-verify-and-stop
  category: verification
  source_repo: juliusbrussee/caveman
  source_url: "https://github.com/juliusbrussee/caveman"
  source_commit: d262ab3882952a59312ff3537cd86d894523c5ab
  reviewed: "2026-10-15"
  applies_to:
    - cagents:validator
    - cagents:wave-reviewer
    - cagents:operations-manager
    - cagents:general-counsel
  demonstrates: "Map each acceptance criterion to the smallest sufficient proof; reuse results for the same state; focused checks before wide gates; report pass, fail, unavailable, and blocked distinctly; stop with no polish once the proof is complete."
  added: "2026-10-15"
---

# Example: Verify and Stop

## Context
Use this pattern when the task is to prove that existing work meets its
acceptance criteria. The task is not to improve the work. A validator, a wave
gate, a compliance check of a contract, and a quality audit of a process all
fit. Without a stop condition, a check tends to grow into a review of
everything, and the cost goes up with no change to the verdict.

## Example

Scope growth. The check never ends:

```
Ran the full test suite. Also fixed 3 lint warnings, added 2 tests for edge
cases, and cleaned up the README. One integration test could not start
because the database was down, so I marked it as passed.
```

The last sentence is the worst fault. An unrunnable check became a pass.

Verify-and-stop procedure:

1. Write one row for each acceptance criterion. Name the smallest check that
   proves it.
2. If a result for the same state already exists and is current, reuse it.
   For code, the same state means the same commit and a clean tree. For a
   document, it means the same version.
3. Run the focused checks first. Run a wide gate only if a criterion needs it.
4. Give each row one of four states. Do not merge them.
5. Do not edit the work unless the request includes fixes.
6. When each row has a state, stop. Do not add polish, cleanup, or new tests.

The four states:

| State | Meaning | Next action |
|---|---|---|
| pass | The check ran and the criterion holds. | none |
| fail | The check ran and the criterion does not hold. | revise the work |
| unavailable | The check could not run, for example a missing tool or a service that is down. | restore the check, then run it again |
| blocked | The check needs a decision or an input from a person. | escalate |

Report for a code gate:

```
| Criterion                         | Check                          | State       |
| AC-1 hook denies the write        | vitest tests/hook-deny.test.js | pass        |
| AC-2 counts pinned in CLAUDE.md   | scripts/ci/validate-counts.sh  | pass        |
| AC-3 migration runs on staging DB | npm run migrate:staging        | unavailable |
Unresolved risk: AC-3 has no proof. The staging DB did not respond.
Verdict: not PASS until AC-3 runs.
```

Report for a contract review:

```
| Criterion                         | Check                          | State       |
| C-1 liability cap present         | clause 9.2 read against policy | pass        |
| C-2 data-processing terms signed  | DPA annex in the signed copy   | blocked     |
Unresolved risk: C-2 needs the signed annex from the client.
```

Map to the cAgents verdicts. Any `fail` row gives FAIL or REVISE. Any
`blocked` row gives BLOCKED. An `unavailable` row gives BLOCKED until the
check runs. It never counts as a pass. The report must name the check that
could not run.

## Why it matters
cAgents validators and wave reviewers can drift into scope growth, and an
unrunnable check can pass with no record. The four states stop an unrunnable check from passing, and
the stop rule keeps the gate cost in proportion to the criteria. The pattern
works for code, contracts, processes, and research. Distilled from
juliusbrussee/caveman `skills/verify-and-stop/SKILL.md` (Apache-2.0).
