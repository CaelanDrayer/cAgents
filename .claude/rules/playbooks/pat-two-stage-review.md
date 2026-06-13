---
name: pat-two-stage-review
description: "Pattern: every reviewer loop runs two ordered stages — Stage 1 spec compliance (binary PASS/REVISE on acceptance criteria) before Stage 2 code quality (severity-tagged findings). No code quality review begins until spec compliance passes."
license: MIT
compatibility: "Claude Code 2.x, cAgents 10.22.0+"
metadata:
  version: "1.0.0"
  author: cagents
  audience: "controllers, reviewers"
  applies_to:
    - cagents:reviewer
    - all-controllers
---

# Pattern: Two-Stage Review Protocol (V10.22.0)

Every reviewer loop MUST use two distinct review stages, in strict order. No code quality review before spec compliance passes.

## Stage 1: Spec Compliance Review

Does the implementation meet the acceptance criteria exactly?

```
Reviewer prompt (Stage 1):
  "Review TASK-{N} for SPEC COMPLIANCE ONLY.
   Acceptance criteria: {criteria from work_items.yaml}

   For each criterion:
   - MET: cite specific file:line evidence
   - NOT MET: describe what is missing or incorrect
   - PARTIAL: describe what is done and what remains

   Verdict: PASS (all criteria MET) or REVISE (any NOT MET/PARTIAL)

   DO NOT comment on code quality, style, or maintainability in this stage."
```

### Stage 1 checks

- Every acceptance criterion has a MET/NOT MET/PARTIAL status
- Evidence is specific (file paths, line numbers, test output)
- No subjective quality judgments in this stage
- Verdict is binary: all criteria MET = PASS, otherwise REVISE

**If Stage 1 returns REVISE**: Send feedback to execution agent with the specific unmet criteria. Do NOT proceed to Stage 2. The execution agent must address all unmet criteria before code quality review begins.

## Stage 2: Code Quality Review

Is the implementation well-written, maintainable, and secure?

```
Reviewer prompt (Stage 2):
  "Review TASK-{N} for CODE QUALITY.
   Spec compliance has PASSED -- all acceptance criteria are met.

   Review for:
   - Correctness: edge cases, error handling, null safety
   - Maintainability: naming, structure, complexity, DRY
   - Security: injection, auth bypass, data exposure, trust boundaries
   - Performance: obvious inefficiencies, N+1 queries, memory leaks
   - Conventions: project style guide, existing patterns, consistency

   Verdict: PASS (acceptable quality) or REVISE (quality issues that should be fixed)
   Severity per finding: CRITICAL (must fix) / HIGH (should fix) / LOW (nice to fix)

   Only REVISE for CRITICAL or 2+ HIGH findings."
```

### Stage 2 checks

- Only runs after Stage 1 PASS
- Findings are severity-tagged (CRITICAL/HIGH/LOW)
- REVISE threshold: any CRITICAL or 2+ HIGH findings
- LOW findings are recorded but do not trigger REVISE
- Apply the subtractive lens — what can be deleted, and could stdlib/native/an existing dependency replace new code? See @.claude/rules/playbooks/pat-minimal-solution-ladder.md.

## Why two stages

- Prevents "code is beautiful but doesn't meet requirements" false passes
- Ensures functional correctness before spending review budget on quality
- Separates objective (spec compliance) from subjective (code quality) assessment
- Reduces revision round waste (fixing quality issues in code that doesn't meet spec)

## Coordination log format

```yaml
implementation_tasks:
  - task_id: WI-1
    assigned_to: cagents:backend-developer
    stage_1_result: PASS    # spec compliance
    stage_2_result: PASS    # code quality
    review_result: PASS     # overall (both must PASS)
    review_rounds: 1
```

## See also

- `.claude/rules/playbooks/pat-evidence-first-execution.md` — Stage 1 evidence specificity requirements
- `.claude/rules/core/controllers.md` — Guard Command Pattern + Regression Validation Chain (run after Stage 2 PASS)
