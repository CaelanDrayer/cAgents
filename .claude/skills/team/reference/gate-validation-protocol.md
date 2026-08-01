# Gate Validation Protocol

7-check evidence-based gate validation, validation YAML template, and storage format for /team.

## GATE Validation Standards

GATE validation criteria are standardized by wave type. The lead uses these criteria when validating each gate (Step 5d).

| Wave Type | Validation Criteria | Method |
|-----------|-------------------|--------|
| **Research / Analysis** | All research outputs exist; each has summary section; key findings documented | `file_exists` + `content_check` |
| **Design / Architecture** | Design artifacts exist; interfaces defined; decisions documented with rationale | `file_exists` + `content_check` |
| **Core Implementation** | Implementation files created/modified; no syntax errors; acceptance criteria addressed | `file_exists` + `syntax_check` + `grep_criteria` |
| **Supporting Implementation** | Integration points connected; supporting features functional; no regressions | `file_exists` + `syntax_check` |
| **Testing / QA** | Test files exist for implemented features; test execution attempted (pass or documented failure) | `file_exists` + `test_run` |
| **Documentation** | Doc files updated; API changes reflected; examples provided | `file_exists` + `content_check` |

### Gate Validation Algorithm

1. For each work item in the wave, check if output directory exists (`outputs/task-{N}/`)
2. Apply wave-type-specific criteria from the table above
3. Compute gate score: `completed_criteria / total_criteria`
4. Gate result:
   - Score >= 0.9: **PASS** (proceed to next wave)
   - Score >= 0.7 with no critical failures: **CONDITIONAL_PASS** (proceed with noted gaps)
   - Score < 0.7 or critical failures: **FAIL** (attempt fix-up or escalate)

**Conditional pass**: If blocked items caused the gap, log the gaps and proceed. The integration wave (final) accounts for these gaps in its validation.

## Evidence-Based Gate Validation Protocol (V10.23.0)

Before marking ANY gate (GATE-0, GATE-1, ...) as complete, the team lead MUST run ALL 7 gate validation checks. No gate passes without 7/7 checks passing.

### Gate Validation Checklist

| # | Check | What It Verifies | Failure Action |
|---|-------|-----------------|----------------|
| 1 | Task Completion | All wave tasks marked completed in TaskList | HOLD — wait for remaining tasks |
| 2 | Evidence Presence | Every completed task has non-empty evidence | HOLD — request evidence from subagent |
| 3 | Evidence Specificity | Evidence cites file:line, not vague descriptions | WARN — request re-verification |
| 4 | Acceptance Criteria Coverage | Every acceptance criterion has matching evidence | FAIL — task not actually complete |
| 5 | Contract Fulfillment | All inter-wave contracts have artifacts | HOLD — contract provider must deliver |
| 6 | Regression Check | Guard commands pass (tests, lint, type check) | FAIL — regression introduced |
| 7 | Cross-Wave Consistency | New wave outputs don't contradict previous wave | WARN — review for conflicts |

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

When validating a gate, the team lead MUST add a validation TaskCreate entry:

```
TaskCreate({
  subject: "[team-lead] GATE-1 validation",
  description: "Task completion: 3/3 done; Evidence: 3/3 with file:line citations; Criteria coverage: 9/9 covered; Contracts: 2/2 fulfilled; Regression: npm test 45/45 passed; Consistency: no conflicts; GATE-1: PASS (7/7 checks)"
})
TaskUpdate({ taskId: "{id}", status: "completed" })
```

### Gate Validation Storage

Gate validation results are appended to `${SESSION_DIR}/workflow/gate_validations.yaml`:

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

The 7-check protocol supersedes the simple score-based gate validation. When running Step 5d, execute the 7 checks in order. If any check returns FAIL, the gate fails regardless of other checks. If any check returns HOLD, pause until the hold condition is resolved. If checks return only PASS and WARN, the gate passes (WARNs are logged but do not block).
