# Validator — Phase Detail

Detailed validation phase descriptions for `cagents:validator`. The SKILL.md body keeps the phase list short; this resource carries the per-phase checks, output schemas, and verification logic.

## Phase 1: Coordination File Verification

- Check `coordination_log.yaml` exists (required for tier 2-4)
- Verify structure against schema
- Validate all required fields present

## Phase 2: Question-Based Delegation Validation

- Verify question count within limits
- Check question quality (specific, not vague)
- Validate answers are structured with evidence
- **CRITICAL**: Detect circular delegation (controller → controller)

## Phase 3: Synthesis Quality Validation

- Verify synthesis addresses all objectives
- Check for placeholder text
- Validate coherence and actionability

## Phase 4: Delegation Compliance Validation

- Verify controller delegated ALL work via Agent tool
- Detect self-answered questions (BLOCKED if > 0)
- Check minimum subagent usage per objective

## Phase 5: Implementation Tasks Validation

- Verify tasks created from synthesis
- Check task quality and alignment with objectives
- Validate outputs exist for expected deliverables

## Phase 6: Automated Verification (V10.23.0)

Run automated checks to verify implementation correctness beyond acceptance criteria review.

### 6a. File existence verification

For every file path cited in coordination_log evidence:

- Verify the file exists on disk (ls/stat)
- Verify the file is non-empty
- If a specific line number is cited, verify the file has at least that many lines

### 6b. Content verification

For every "file_contains" evidence claim:

- Read the cited file at the cited line number
- Verify the claimed content actually exists at that location
- Flag any evidence where cited content doesn't match

### 6c. Test verification

If any acceptance criteria mention tests:

- Run the test suite (npm test, pytest, etc.)
- Verify all tests pass
- Verify no new test failures compared to pre-implementation baseline

### 6d. Schema verification

For each workflow YAML file produced during the session:

- Verify valid YAML syntax (no tabs, no duplicate keys)
- Verify required fields are present per schema
- Files to check: `plan.yaml`, `work_items.yaml`, `coordination_log.yaml`, `execution_summary.yaml`

### 6e. Import/reference verification

For modified code files:

- Verify no broken imports introduced
- Verify no dangling references to removed functions/variables

### Phase 6 result schema

```yaml
phase_6_automated_verification:
  file_existence:
    checked: 12
    passed: 12
    failed: 0
    failures: []
  content_verification:
    checked: 8
    passed: 7
    failed: 1
    failures: ["WI-3: claimed line 45 has 'validateInput()' but actual content is 'processInput()'"]
  test_verification:
    tests_run: true
    total: 45
    passed: 45
    failed: 0
    new_failures: 0
  schema_verification:
    files_checked: 4
    all_valid: true
    issues: []
  import_verification:
    files_checked: 3
    broken_imports: 0
```

## Phase 7: Cross-Cutting Traceability Audit (V10.23.0)

Verify end-to-end traceability from user request through to implementation evidence.

### 7a. Request-to-objective traceability

- Every objective in `plan.yaml` traces back to the original user request
- No objective is disconnected from the mission statement

### 7b. Objective-to-work-item traceability

- Every work item in `work_items.yaml` maps to at least one objective
- Every objective has at least one work item assigned to it
- No orphan work items exist

### 7c. Work-item-to-evidence traceability

- Every completed work item has evidence in `coordination_log.yaml`
- Every evidence entry cites specific artifacts (files, test results, metrics)
- No work item has empty or vague evidence

### 7d. Evidence-to-artifact traceability

- Every cited artifact (file path, test output) exists and is verifiable
- Cross-reference with Phase 6 automated verification results

### 7e. Success-criteria-to-evidence mapping

- Every success criterion from plan.yaml maps to at least one piece of evidence
- Generate a coverage matrix: success_criteria x evidence

### Phase 7 result schema

```yaml
phase_7_traceability_audit:
  request_to_objectives:
    objectives_traced: 10
    untraced: 0
    coverage: 100%
  objectives_to_work_items:
    objectives_covered: 10
    orphan_work_items: 0
    coverage: 100%
  work_items_to_evidence:
    items_with_evidence: 16
    items_missing_evidence: 0
    vague_evidence: 0
    coverage: 100%
  success_criteria_coverage:
    total_criteria: 10
    criteria_with_evidence: 10
    coverage: 100%
  overall_traceability_score: 1.0  # 0.0 to 1.0
```

### Traceability failures

| Gap Type | Verdict Impact |
|----------|---------------|
| Untraced objective | REVISE — objectives may not match user intent |
| Orphan work item | warn — work item may be unnecessary |
| Missing evidence | FAIL — work item not verifiably complete |
| Vague evidence | REVISE — need specific file:line evidence |
| Uncovered success criterion | FAIL — plan success criteria not met |

## Validation Summary Dashboard

After all 7 phases complete, produce a summary dashboard:

```yaml
validation_dashboard:
  total_phases: 7
  phases_passed: 7
  phases_failed: 0

  acceptance_criteria_coverage: 100%
  evidence_specificity_score: 0.95  # 0.0 to 1.0 (vague=0, file:line=1.0)
  automated_verification_score: 0.98
  traceability_score: 1.0

  overall_verdict: PASS  # PASS if all scores >= 0.8, FAIL if any < 0.5, REVISE otherwise

  verdict_breakdown:
    - phase: 1
      result: PASS
      details: "Coordination file structure valid"
    - phase: 2
      result: PASS
      details: "All questions delegated with structured evidence"
    - phase: 3
      result: PASS
      details: "Synthesis addresses all objectives"
    - phase: 4
      result: PASS
      details: "All work delegated via Agent tool"
    - phase: 5
      result: PASS
      details: "All implementation tasks aligned with objectives"
    - phase: 6
      result: PASS
      details: "All file/content/test/schema/import checks passed"
    - phase: 7
      result: PASS
      details: "Full traceability from request to artifacts"
```
