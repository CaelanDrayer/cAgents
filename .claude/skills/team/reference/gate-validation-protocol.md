# Gate Validation Protocol

This file gives the 7 gate validation checks for /team. It also gives the
validation YAML template and the storage format.

## GATE Validation Standards

The GATE validation criteria are different for each wave type. The lead uses
these criteria at each gate. Step 5d is the step that applies them.

| Wave Type | Validation Criteria | Method |
|-----------|-------------------|--------|
| **Research / Analysis** | All research outputs exist; each has summary section; key findings documented | `file_exists` + `content_check` |
| **Design / Architecture** | Design artifacts exist; interfaces defined; decisions documented with rationale | `file_exists` + `content_check` |
| **Core Implementation** | Implementation files created/modified; no syntax errors; acceptance criteria addressed | `file_exists` + `syntax_check` + `grep_criteria` |
| **Supporting Implementation** | Integration points connected; supporting features functional; no regressions | `file_exists` + `syntax_check` |
| **Testing / QA** | Test files exist for implemented features; test execution attempted (pass or documented failure) | `file_exists` + `test_run` |
| **Documentation** | Doc files updated; API changes reflected; examples provided | `file_exists` + `content_check` |

### Gate Validation Algorithm

1. For each work item in the wave, make sure that the output directory
   `outputs/task-{N}/` exists.
2. Apply the criteria for that wave type from the table above.
3. Compute the gate score with `completed_criteria / total_criteria`.
4. Read the gate result from this list:
   - If the score is 0.9 or more, the result is **PASS**. Go on to the next
     wave.
   - If the score is 0.7 or more and no check has a critical failure, the
     result is **CONDITIONAL_PASS**. Go on to the next wave, and write down
     each gap.
   - If the score is less than 0.7, or a check has a critical failure, the
     result is **FAIL**. Try a fix-up, or escalate.

**Conditional pass**: If blocked items caused the gap, write the gaps to the
log. Then go on to the next wave. The integration wave is the last wave. Its
validation accounts for these gaps.

## Evidence-Based Gate Validation Protocol (V10.23.0)

Before the team lead marks a gate as complete, the lead MUST run all 7 gate
validation checks. This applies to every gate: GATE-0, GATE-1, and each gate
after them. A gate passes only when all 7 checks pass.

### Gate Validation Checklist

| # | Check | What It Verifies | Failure Action |
|---|-------|-----------------|----------------|
| 1 | Task Completion | All wave tasks marked completed in TaskList | HOLD: wait for the remaining tasks |
| 2 | Evidence Presence | Every completed task has non-empty evidence | HOLD: request evidence from the subagent |
| 3 | Evidence Specificity | Evidence cites file:line, not vague descriptions | WARN: request re-verification |
| 4 | Acceptance Criteria Coverage | Every acceptance criterion has matching evidence | FAIL: the task is not complete |
| 5 | Contract Fulfillment | All inter-wave contracts have artifacts | HOLD: the contract provider must deliver |
| 6 | Regression Check | Guard commands pass (tests, lint, type check) | FAIL: a regression was introduced |
| 7 | Cross-Wave Consistency | New wave outputs don't contradict previous wave | WARN: review for conflicts |

### Gate Validation YAML Template

```yaml
gate_validation:
  gate_id: "GATE-1"
  wave: 1
  checks:
    task_completion: {passed: true, total: 3, completed: 3}
    evidence_presence: {passed: true, items_checked: 3, items_with_evidence: 3}
    evidence_specificity: {passed: true, avg_score: 2.7}
    acceptance_coverage: {passed: true, criteria_total: 9, criteria_covered: 9}
    contract_fulfillment: {passed: true, contracts_checked: 2, fulfilled: 2}
    regression_check: {passed: true, command: "npm test", result: "45/45 passed"}
    cross_wave_consistency: {passed: true, conflicts_found: 0}
  overall: PASS  # PASS only if all 7 checks pass
  timestamp: "{ISO_TIMESTAMP}"
```

### Gate Validation Task (TaskCreate)

When the team lead validates a gate, the lead MUST add a validation TaskCreate
entry:

```
TaskCreate({
  subject: "[team-lead] GATE-1 validation",
  description: "Task completion: 3/3 done; Evidence: 3/3 with file:line citations; Criteria coverage: 9/9 covered; Contracts: 2/2 fulfilled; Regression: npm test 45/45 passed; Consistency: no conflicts; GATE-1: PASS (7/7 checks)"
})
TaskUpdate({ taskId: "{id}", status: "completed" })
```

### Gate Validation Storage

Append each gate validation result to
`${SESSION_DIR}/workflow/gate_validations.yaml`:

```yaml
gate_validations:
  - gate_id: "GATE-0"
    wave: 0
    overall: PASS
    checks: {task_completion: {passed: true}, ...}
    timestamp: "..."
  - gate_id: "GATE-1"
    wave: 1
    overall: PASS
    checks: {task_completion: {passed: true}, ...}
    timestamp: "..."
```

### Integration with Gate Validation Algorithm (Step 5d)

The protocol of 7 checks replaces the simple gate validation by score. At Step
5d, do the 7 checks in order. If any check returns FAIL, the gate fails. The
other checks do not change that result. If any check returns HOLD, stop until
the hold condition is resolved. If the checks return only PASS and WARN, the
gate passes. A WARN goes to the log, and it does not block the gate.
