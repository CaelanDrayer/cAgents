# Quality Gates

Domain-specific and universal quality gates.

## Coordination Quality Gates

| Gate | Severity | Pass Criteria |
|------|----------|---------------|
| **Coordination Completeness** | CRITICAL | All required fields present |
| **Question-Based Delegation** | CRITICAL | ≥1 question for tier 2-3, ≥5 for tier 4 |
| **No Circular Delegation** | CRITICAL | No controller → controller delegation |
| **Delegation Compliance** | CRITICAL | 0 self-answered questions |
| **Minimum Subagent Usage** | MAJOR | ≥2 execution agents per objective |
| **Synthesis Quality** | MAJOR | All objectives mentioned |
| **Implementation Tasks** | MAJOR | ≥3 tasks, specific, actionable |
| **Question Limit Adherence** | MINOR | questions ≤ max_questions |
| **Answer Quality** | MINOR | ≥80% answers have evidence |

## Universal Quality Gates

### Completeness (Critical)
- All objectives achieved
- Outputs exist for all deliverables
- No pending work items

### Functionality (Critical)
- Acceptance criteria met
- No regressions introduced
- Tests pass

## Domain-Specific Gates

### Engineering
```yaml
quality_gates:
  - name: tests_pass
    severity: critical
    command: npm test
  - name: coverage
    severity: major
    threshold: ">= 80%"
  - name: linting
    severity: minor
    command: npm run lint
  - name: security
    severity: critical
    command: npm audit
```

### Creative
```yaml
quality_gates:
  - name: word_count
    severity: major
    threshold: "within 10% of target"
  - name: grammar_check
    severity: minor
    tool: grammarly_api
  - name: style_consistency
    severity: major
    check: manual_or_tool
```

### Business
```yaml
quality_gates:
  - name: data_accuracy
    severity: critical
    check: source_verification
  - name: calculations_correct
    severity: critical
    check: formula_validation
  - name: stakeholder_approval
    severity: major
    type: hitl_gate
```

## Acceptance Criteria Verification

### Verification Methods

| Method | How to Verify |
|--------|---------------|
| `file_exists` | Glob for file pattern |
| `file_contains` | Grep for pattern |
| `test_result` | Run test command |
| `scan_result` | Run scan command |
| `metric_check` | Compare metrics |
| `output_exists` | Check output file |
| `manual_review` | HITL verification |

### Two-Level Verification

**Level 1: Work Item Verification**
```yaml
for each work_item in decomposition.work_items:
  for each criterion in work_item.acceptance_criteria:
    evidence = verify(criterion.verification_method)
    captured = coordination_log.work_item_status[id].evidence
    status = (evidence.found AND captured.verified)
```

**Level 2: Objective Verification**
```yaml
for each objective in plan.objectives:
  for work_item_id in objective.derived_from:
    if work_item_status[work_item_id] != completed:
      objective_status = INCOMPLETE

  for criterion in objective.success_criteria:
    evidence = verify(criterion.verification_method)
    criterion_status = evidence.found
```

## Evidence Chain Validation

### Forward Trace (Work Item → Objective)
- Verify objective criteria satisfied by work items
- Check all derived_from work items have evidence

### Backward Trace (Evidence → Work Item → Objective)
- For each evidence, trace to work item
- From work item, trace to objective
- Verify chain is complete
