---
paths:
  - ".claude/rules/playbooks/pat-two-stage-review.md"
  - ".claude/rules/core/controllers.md"
  - ".claude/rules/quality/completion.md"
  - ".claude/rules/playbooks/pat-minimal-solution-ladder.md"
  - "agents/**"
  - ".claude/skills/**"
  - "cagents-memory/sessions/**/workflow/coordination_log.yaml"
  - "cagents-memory/sessions/**/workflow/review_report.yaml"
  - "cagents-memory/sessions/**/outputs/**"
  - "tests/v12/playbook-extraction-cohesion.test.js"
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

Every reviewer loop MUST use two distinct review stages, in strict order. No code
quality review starts before the spec compliance review passes.

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

- Every acceptance criterion has a MET, NOT MET, or PARTIAL status.
- The evidence is specific: file paths, line numbers, and test output.
- This stage holds no subjective quality judgment.
- The verdict is binary. All criteria MET gives PASS. Anything else gives REVISE.

**If Stage 1 returns REVISE**: send the feedback to the execution agent with the
specific unmet criteria. Do NOT go on to Stage 2. The execution agent must
address every unmet criterion before the code quality review starts.

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

- Stage 2 runs only after Stage 1 gives PASS.
- Each finding carries a severity tag of CRITICAL, HIGH, or LOW.
- The REVISE threshold is any CRITICAL finding, or 2 or more HIGH findings.
- A LOW finding is recorded, but it does not trigger REVISE.
- Apply the subtractive lens. Ask what you can delete. Ask whether the stdlib, a
  native feature, or an existing dependency can replace the new code. See
  @.claude/rules/playbooks/pat-minimal-solution-ladder.md.

### Distrust the self-report

Treat the account that an executor gives of its own work as an unverified claim,
not as evidence. Check each of these against the actual diff:

- a `self_validation` YAML block;
- a `ponytail:` deliberate-shortcut marker;
- a stated rationale such as "kept it simple per YAGNI" or "validated elsewhere".

None of them lowers the severity of a finding. If you cannot find a claim in the
diff, that is a REVISE, not a pass. See
@docs/example-store/ex-review-distrust-self-report.md.

## Why two stages

- It prevents the false pass where the code is beautiful but does not meet the
  acceptance criteria.
- It confirms functional correctness before you spend review budget on quality.
- It separates the objective assessment of spec compliance from the subjective
  assessment of code quality.
- It reduces the waste in the revision rounds. You no longer fix quality issues
  in code that does not meet the spec.

## Fresh reviewer per round

On each REVISE round, re-spawn a fresh reviewer that carries no context. That
reviewer gets the diff and the rubric only. A reviewer that carries its own
earlier REVISE reasoning anchors on that earlier judgment. A clean start on each
round therefore keeps the assessment independent. This is the canonical statement
of the rule, and `controllers.md` references it.

## Auto-apply eligibility tiers (SAFE / CAREFUL / RISKY)

The Stage-2 severity of CRITICAL, HIGH, or LOW says how much a finding matters.
A separate, orthogonal question is how safe the fix is to apply with no human in
the loop. Tag each Stage-2 finding with one apply-eligibility tier. A mechanical
cleanup then lands at once, and a real risk is surfaced instead of silently
changed.

| Tier | Rule | Examples |
|------|------|----------|
| **SAFE** | Auto-apply, no confirmation | unused imports, dead variables, obvious string typos |
| **CAREFUL** | Apply, then re-run the guard for that one file to confirm nothing broke | rename a local variable, extract a private helper |
| **RISKY** | Flag only. Never auto-apply. | public API rename, signature change, behavior-affecting edit |

The tier is independent of the severity. A HIGH finding can be SAFE, such as an
unused import that trips a lint gate. A LOW finding can be RISKY, such as a
cosmetic rename of a public export. Decide the tier by the blast radius, not by
how much the finding matters.

**Chesterton's-Fence rule**: before you flag any code for removal, run
`git blame` on it. If you cannot find why the code exists, treat the fix as
flag-only, whatever its apparent tier. Record `confidence: low`. Do not delete
code whose purpose is unclear.

See @docs/example-store/ex-review-safe-careful-risky.md for a worked example with a findings-log shape.

## Optional variant: two-axis parallel review

The default stays the sequential two-stage flow above: Stage 1, then Stage 2.
This variant is an optional alternative. Use it when a controller wants two
independent reviewers to assess the two concerns at the same time.

Spawn two sub-reviewers in one message, and give each one the entire diff:

- **Standards axis**: it checks the diff against the repo conventions, and
  against a fixed code-smell baseline.
- **Spec axis**: it checks the diff against the originating work item and against
  the acceptance criteria. It also runs a sub-check for **undocumented scope
  creep**, which is a changed line that traces to no criterion.

Keep the two reports separate. Do not merge them into one PASS verdict, and do
not merge them into one score. A change can pass one axis and fail the other.
Clean code can
implement the wrong feature, which gives `Standards: PASS / Spec: FAIL`. The
right feature can be written as a mess, which gives `Standards: FAIL / Spec: PASS`.
A merge masks that split.

The standards reviewer can cite the Fowler 12-smell baseline. These are the 12
smells:

- Mysterious Name
- Duplicated Code
- Feature Envy
- Data Clumps
- Primitive Obsession
- Repeated Switches
- Shotgun Surgery
- Divergent Change
- Speculative Generality
- Message Chains
- Middle Man
- Refused Bequest

See @docs/example-store/ex-review-standards-vs-spec-two-axis.md for the full variant with reviewer prompts.

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

- `.claude/rules/playbooks/pat-evidence-first-execution.md`: how specific the
  evidence in Stage 1 must be.
- `.claude/rules/core/controllers.md`: the Guard Command Pattern and the
  Regression Validation Chain. Run both after a Stage 2 PASS.
