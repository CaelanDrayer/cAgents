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

### Distrust the self-report

Treat the executor's own account of its work as an unverified claim, not as evidence. A `self_validation` YAML block, a `ponytail:` deliberate-shortcut marker, or a stated rationale like "kept it simple per YAGNI" or "validated elsewhere" is something to check against the actual diff — never something that lowers a finding's severity. If a claim cannot be located in the diff, that is a REVISE, not a pass. See @.claude/rules/examples/ex-review-distrust-self-report.md.

## Why two stages

- Prevents "code is beautiful but doesn't meet requirements" false passes
- Ensures functional correctness before spending review budget on quality
- Separates objective (spec compliance) from subjective (code quality) assessment
- Reduces revision round waste (fixing quality issues in code that doesn't meet spec)

## Fresh reviewer per round

On each REVISE round, re-spawn a fresh reviewer with no carried context — it receives the diff and the rubric only. A reviewer that carries its own prior REVISE reasoning tends to anchor on that earlier judgment, so starting each round clean keeps the assessment independent. This is the canonical statement of the rule; `controllers.md` references it.

## Auto-apply eligibility tiers (SAFE / CAREFUL / RISKY)

Stage-2 severity (CRITICAL/HIGH/LOW) says how much a finding matters. A separate, orthogonal question is how safe the fix is to apply without a human in the loop. Tag each Stage-2 finding with one apply-eligibility tier so mechanical cleanups land immediately while real risks are surfaced rather than silently changed.

| Tier | Rule | Examples |
|------|------|----------|
| **SAFE** | Auto-apply, no confirmation | unused imports, dead variables, obvious string typos |
| **CAREFUL** | Apply, then re-run the guard for that one file to confirm nothing broke | rename a local variable, extract a private helper |
| **RISKY** | Flag only — never auto-apply | public API rename, signature change, behavior-affecting edit |

The tier is independent of severity: a HIGH finding can be SAFE (an unused import that trips a lint gate), and a LOW finding can be RISKY (a cosmetic rename of a public export). Decide the tier by blast radius, not by how much the finding matters.

**Chesterton's-Fence rule**: before flagging any code for removal, run `git blame` on it. If you cannot determine why it exists, treat the fix as flag-only regardless of its apparent tier, and record `confidence: low` — do not delete code whose purpose is unclear.

See @.claude/rules/examples/ex-review-safe-careful-risky.md for a worked example with a findings-log shape.

## Optional variant: two-axis parallel review

The default remains the sequential two-stage flow above (Stage 1 then Stage 2). This variant is an optional alternative for a controller that wants the two concerns assessed at once by independent reviewers.

Spawn two sub-reviewers in one message and give each the entire diff:

- **Standards axis** — checks the diff against repo conventions and a fixed code-smell baseline.
- **Spec axis** — checks the diff against the originating work item and acceptance criteria, plus a sub-check for **undocumented scope creep**: changed lines that trace to no criterion.

Keep the two reports separate. Do not merge them into a single PASS/score, because a change can pass one axis and fail the other — clean code implementing the wrong feature (`Standards: PASS / Spec: FAIL`), or the right feature written as a mess (`Standards: FAIL / Spec: PASS`). Merging masks that split.

Fowler 12-smell baseline the standards reviewer can cite: Mysterious Name, Duplicated Code, Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change, Speculative Generality, Message Chains, Middle Man, Refused Bequest.

See @.claude/rules/examples/ex-review-standards-vs-spec-two-axis.md for the full variant with reviewer prompts.

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
