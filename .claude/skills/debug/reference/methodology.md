# /debug 4-Phase Debugging Methodology

Ported from the pre-V10.26.18 `/debug` SKILL.md body so /run `--mode debug`
controllers can cite it without loading the shim. The shim (`SKILL.md`)
delegates invocation; this file preserves the prescriptive content.

## IRON LAW: No Guessing

**Never guess at the root cause.** Every hypothesis must be tested with
evidence before implementing a fix. If you cannot reproduce the bug, you
cannot fix the bug.

## Phase 1: Root Cause Investigation

**Goal**: Understand what is actually happening vs what should happen.

1. **Reproduce the bug**: Run the exact failing command/scenario. Capture the
   full error output.
2. **Read the error carefully**: Parse every line of the stack trace. Note the
   exact file, line, and function.
3. **Check recent changes**: `git log --oneline -20` and `git diff HEAD~5` to
   find what changed.
4. **Trace the data flow**: Follow the data from input to error point. Read
   each function in the call chain.
5. **Run diagnostics**: Execute targeted diagnostic commands (type checks,
   lint, test isolation).

**Output**: A clear description of WHAT is happening and WHERE it diverges
from expected behavior.

## Phase 2: Pattern Analysis

**Goal**: Identify what category of bug this is and what patterns apply.

| Bug Pattern | Indicators | Investigation Focus |
|-------------|-----------|---------------------|
| **State mutation** | Intermittent failures, order-dependent | Shared state, race conditions, closures |
| **Type mismatch** | Runtime crashes, undefined properties | Type coercion, null checks, interface contracts |
| **Timing/async** | Flaky tests, works-sometimes | Promise chains, event ordering, timeouts |
| **Data flow** | Wrong output, silent failures | Input validation, transformation chain, edge cases |
| **Configuration** | Works locally, fails in CI | Environment variables, paths, versions |
| **Integration** | Works in isolation, fails together | API contracts, version mismatches, assumptions |

**Output**: Bug pattern classification with confidence level.

## Phase 3: Hypothesis Testing

**Goal**: Form and test specific hypotheses about the root cause.

For each hypothesis:
1. **State the hypothesis clearly**: "The bug occurs because X causes Y when Z"
2. **Define the test**: "If this hypothesis is correct, then [specific
   observable outcome]"
3. **Run the test**: Execute the minimal reproduction that proves/disproves
4. **Record the result**: Confirmed or falsified, with evidence

**Rules**:
- Test ONE hypothesis at a time
- Start with the most likely hypothesis (from Phase 2 pattern analysis)
- A falsified hypothesis is valuable information — record it
- Maximum 5 hypotheses before escalation

## Phase 4: Implementation

**Goal**: Fix the root cause (not the symptom) with verification.

1. **Write a failing test** that reproduces the bug (mandatory per
   CLAUDE.md bug-driven testing)
2. **Implement the minimal fix** that addresses the confirmed root cause
3. **Run the failing test** — it must now pass
4. **Run the full test suite** — no regressions
5. **Verify the original reproduction scenario** — bug is gone
6. **Document**: Commit message with root cause analysis

## Escalation Rules

**If 3+ fix attempts have failed, STOP and escalate.** This is not a
suggestion — it is a hard rule.

Escalation triggers:
- 3 falsified hypotheses with no confirmed root cause
- Fix attempt introduces new failures
- Bug requires understanding of architecture you don't have access to
- Root cause appears to be in a dependency or external system

Escalation action:
- Document all findings (hypotheses tested, evidence gathered, what was ruled
  out)
- Flag to the controller or user: "Root cause investigation inconclusive
  after N attempts. Findings: [summary]. Recommend: architecture discussion /
  dependency investigation / domain expert review."
- Use `--escalate` flag to force escalation report

## Output Format

```yaml
debug_report:
  bug_description: "{original bug description}"
  reproduction: "{exact steps to reproduce}"
  root_cause:
    confirmed: true|false
    description: "{root cause explanation}"
    evidence: "{specific evidence that confirmed the root cause}"
  hypotheses_tested:
    - hypothesis: "{description}"
      result: confirmed|falsified
      evidence: "{what proved/disproved it}"
  fix:
    description: "{what was changed and why}"
    files_modified: ["{file paths}"]
    test_added: "{test file path}"
    test_result: "{pass/fail with output}"
    full_suite_result: "{pass/fail with summary}"
  escalated: false
  escalation_reason: null
```
