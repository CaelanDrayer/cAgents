# Completion Validation Framework

End-to-end traceability from "what is done" definition to completion verification.

## The Validation Chain

```
Request → Decomposition → Plan → Coordination → Execution → Validation
   ↓           ↓            ↓         ↓            ↓           ↓
 Intent   Work Items   Objectives  Evidence   Outputs   Verified
          + Acceptance  + Success   + Task     + Final   Complete
            Criteria     Criteria   Status     Files
```

## Phase 1: Define "Done" (Planning)

### Decomposition Creates Work Items

Each work item MUST have:
```yaml
work_item:
  id: WI-003
  name: "Implement user model"
  acceptance_criteria:
    - criterion: "User model has password_hash field"
      verification_method: "Code inspection: search for password_hash"
      evidence_type: file_path
    - criterion: "Database migration created"
      verification_method: "File exists: migrations/*.sql"
      evidence_type: file_exists
```

**Key Addition**: `verification_method` tells validator HOW to check.

### Plan Creates Success Criteria

Each objective MUST have:
```yaml
objective:
  id: OBJ-1
  description: "Implement complete user authentication"
  success_criteria:
    - criterion: "Users can log in with email/password"
      verification_method: "Test: login_flow_test passes"
      evidence_type: test_result
      derived_from: [WI-003, WI-004, WI-005]  # Traceability
    - criterion: "No security vulnerabilities"
      verification_method: "Security scan: 0 critical findings"
      evidence_type: scan_result
      derived_from: [WI-010, WI-011]
```

**Key Addition**: `derived_from` links objectives to work items.

## Phase 2: Track Progress (Coordination)

### Coordination Log Tracks Evidence

```yaml
# coordination_log.yaml
work_item_status:
  - id: WI-003
    status: completed
    evidence:
      - criterion: "User model has password_hash field"
        verified: true
        evidence: "src/models/user.ts:15 - password_hash: string"
      - criterion: "Database migration created"
        verified: true
        evidence: "migrations/20260122_add_user_auth.sql"
    completed_at: "2026-01-22T10:30:00Z"
    completed_by: backend-developer

  - id: WI-004
    status: in_progress
    evidence:
      - criterion: "Auth service handles login"
        verified: false
        evidence: null  # Not yet completed
```

**Key Addition**: Structured evidence capture during coordination.

## Phase 3: Verify Complete (Validation)

### Validator Checks Evidence Chain

```yaml
# validation_report.yaml
objective_verification:
  - objective_id: OBJ-1
    description: "Implement complete user authentication"
    verification_status: PASS
    criteria_results:
      - criterion: "Users can log in with email/password"
        verification_method: "Test: login_flow_test passes"
        evidence_source: coordination_log
        evidence_found: "Test passed at 2026-01-22T11:00:00Z"
        work_items_verified: [WI-003, WI-004, WI-005]
        status: PASS

      - criterion: "No security vulnerabilities"
        verification_method: "Security scan: 0 critical findings"
        evidence_source: outputs/security_scan.json
        evidence_found: "0 critical, 2 low severity findings"
        work_items_verified: [WI-010, WI-011]
        status: PASS

work_item_verification:
  total: 33
  completed_with_evidence: 33
  missing_evidence: 0
  failed_criteria: 0

overall_status: PASS
confidence: 0.95
```

## Verification Methods

| Type | Method | Example |
|------|--------|---------|
| `file_exists` | Check file at path | `migrations/*.sql` |
| `file_contains` | Grep for pattern | `password_hash in user.ts` |
| `test_result` | Run test suite | `pytest auth_tests/` |
| `scan_result` | Run security scan | `npm audit` |
| `metric_check` | Compare metric | `coverage > 80%` |
| `manual_review` | Human verification | Tier 4 HITL gate |
| `output_exists` | Check output file | `outputs/design.md` |

## Traceability Requirements

### Forward Traceability (Planning → Validation)

```
Request: "Add authentication"
    ↓
Decomposition: 33 work items with acceptance criteria
    ↓
Plan: 5 objectives with success criteria (derived_from work items)
    ↓
Validation: Verify each criterion with specified verification method
```

### Backward Traceability (Validation → Planning)

```
Validation Report: "OBJ-1 PASS"
    ↑
Evidence: "Test passed, files exist, scan clean"
    ↑
Work Items: [WI-003, WI-004, WI-005] all completed with evidence
    ↑
Coordination Log: Evidence captured for each acceptance criterion
```

## Implementation Checklist

### For Decomposer/Planner

- [ ] Every work item has `acceptance_criteria`
- [ ] Every criterion has `verification_method`
- [ ] Every objective links to `derived_from` work items
- [ ] Every success criterion has `verification_method`

### For Controller

- [ ] Track `work_item_status` in coordination_log
- [ ] Capture `evidence` for each completed criterion
- [ ] Mark `completed_at` and `completed_by`

### For Validator

- [ ] Verify each objective's success criteria
- [ ] Check evidence chain (criterion → evidence → source)
- [ ] Verify all derived_from work items are complete
- [ ] Generate verification report with full traceability

## Failure Handling

### Missing Evidence

```yaml
If criterion missing evidence:
  status: FIXABLE
  action: Request controller to provide evidence
  example: "WI-003 criterion 'migration created' has no evidence path"
```

### Failed Verification

```yaml
If verification fails:
  status: FIXABLE (if recoverable) or BLOCKED (if not)
  action: Detail what failed and why
  example: "Test login_flow_test failed: timeout on line 42"
```

### Partial Completion

```yaml
If some work items incomplete:
  status: BLOCKED (cannot verify objectives)
  action: Identify missing work items
  example: "WI-010, WI-011 not started (security tests)"
```

## Key Principles

1. **Define verification at planning** - Don't wait until validation to figure out how to verify
2. **Capture evidence during execution** - Controllers record evidence as work completes
3. **Trace everything** - Every objective links to work items, every criterion has verification method
4. **Fail fast** - If evidence is missing, fail early in validation
5. **Be specific** - Evidence must be concrete (file paths, test outputs, metrics)

---

**Part of**: cAgents Completion Validation Framework
