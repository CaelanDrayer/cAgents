# GATE Validation Standards

Standard quality gate criteria for each wave type. The lead applies these standards when validating gates between waves (Step 5d).

## Wave Type Standards

### Research / Analysis Waves

Waves focused on information gathering, analysis, and discovery.

**Criteria**:
1. All research output files exist in `outputs/wi-{N}/`
2. Each output has a structured summary section (minimum 200 words)
3. Key findings are documented with evidence (file paths, data points, references)
4. Gaps or unknowns are explicitly noted (not silently omitted)

**Validation method**: `file_exists` + `content_check`

**Pass threshold**: All outputs exist with summaries. Gaps noted are acceptable if documented.

### Design / Architecture Waves

Waves focused on design decisions, interface definitions, and architecture.

**Criteria**:
1. Design artifact files exist (diagrams, schemas, interface definitions)
2. Interfaces are explicitly defined (API contracts, data models, function signatures)
3. Design decisions are documented with rationale (why this approach, alternatives considered)
4. Integration points with other work items are identified

**Validation method**: `file_exists` + `content_check`

**Pass threshold**: All design artifacts exist. Interfaces defined. At least 80% of decisions have documented rationale.

### Core Implementation Waves

Waves focused on primary feature implementation.

**Criteria**:
1. Implementation files are created or modified as specified
2. No syntax errors in modified files (validate with appropriate linter/parser)
3. Acceptance criteria from work item are addressed (grep for key terms)
4. No placeholder implementations (TODO, FIXME, "implement later" -- unless documented)
5. Integration points from design wave are connected

**Validation method**: `file_exists` + `syntax_check` + `grep_criteria`

**Pass threshold**: All files exist with valid syntax. All acceptance criteria addressed. No unacknowledged placeholders.

### Supporting Implementation Waves

Waves focused on secondary features, integrations, and extensions.

**Criteria**:
1. Supporting feature files exist
2. Integration points with core implementation are connected
3. No regressions to core implementation (files from previous waves unchanged unless intended)
4. Error handling present for edge cases

**Validation method**: `file_exists` + `syntax_check` + `regression_check`

**Pass threshold**: Features exist and connect to core. No unintended regressions.

### Testing / QA Waves

Waves focused on testing, quality assurance, and security validation.

**Criteria**:
1. Test files exist for each implemented feature
2. Test execution was attempted (pass result or documented failure with reason)
3. Test coverage addresses acceptance criteria from work items
4. Security-relevant tests exist for authentication, authorization, input validation (if applicable)

**Validation method**: `file_exists` + `test_run`

**Pass threshold**: Test files exist. Execution attempted. 80%+ of tests pass, or failures are documented with reasons.

### Documentation Waves

Waves focused on documentation, cleanup, and polish.

**Criteria**:
1. Documentation files are updated to reflect implementation
2. API changes are reflected in API documentation
3. Usage examples are provided for new features
4. README or changelog updated if applicable

**Validation method**: `file_exists` + `content_check`

**Pass threshold**: Documentation exists and reflects current implementation.

## Gate Scoring Algorithm

```
For each criterion in wave_type_standards:
  Check criterion against outputs
  Score: met=1.0, partially_met=0.5, not_met=0.0

gate_score = sum(criterion_scores) / total_criteria

if gate_score >= 0.9:
  result = PASS
elif gate_score >= 0.7 and no critical_failures:
  result = CONDITIONAL_PASS
  note gaps for integration wave
else:
  result = FAIL
  attempt fix-up or escalate
```

## Critical Failures

These always cause a FAIL regardless of overall score:
- Syntax errors in implementation files
- Missing core implementation files
- Test execution crashes (not test failures -- crashes)
- Security-critical endpoints without authentication

## Gate Result Actions

| Result | Action |
|--------|--------|
| **PASS** | Mark GATE task as completed. Proceed to next wave. |
| **CONDITIONAL_PASS** | Mark GATE task as completed with notes. Log gaps in `workflow/gate_notes.yaml`. Proceed to next wave with degraded scope. |
| **FAIL** | Spawn fix-up teammates for failed criteria. Re-validate after fix-up (max 1 fix-up round per gate). If still fails: mark as CONDITIONAL_PASS if score >= 0.5, otherwise halt wave progression and report partial results. |

## Gate Notes Format

```yaml
# workflow/gate_notes.yaml
gates:
  GATE-1:
    wave: 1
    type: research
    score: 0.85
    result: CONDITIONAL_PASS
    gaps:
      - criterion: "Key findings documented"
        status: partial
        note: "WI-002 findings lack quantitative evidence"
    timestamp: "{ISO_TIMESTAMP}"
  GATE-2:
    wave: 2
    type: implementation
    score: 0.95
    result: PASS
    gaps: []
    timestamp: "{ISO_TIMESTAMP}"
```
