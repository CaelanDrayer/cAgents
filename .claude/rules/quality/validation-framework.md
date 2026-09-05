---
paths:
  - "agents/validator/**"
  - "agents/execution-monitor/**"
---

# Completion Validation Framework

End-to-end traceability from "what is done" definition to completion verification.

**Canonical validation-number statement**: the validation surface is three honest layers — **5 enforced** (hook-enforced cross-cutting checks) + **advisory-by-convention** (controller pre-execution 7 + mid-execution 5; executor self-validation 5, verifier hook deferred; two-stage review — real guidance, NOT hook-enforced) + **24 aspirational-deferred** (Phases 1-3 in `docs/FUTURE_VALIDATION_FRAMEWORK.md`, which does NOT auto-load into agent context). See the single legible **Validation Layers** map in `@.claude/rules/quality/completion.md`. *(HISTORICAL: the original framework was framed as 29 = those same 5 active + 24 aspirational; the 15→5 and 29→5 churn is history, not the live count.)*

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
  id: TASK-03
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
      derived_from: [TASK-03, TASK-04, TASK-05]  # Traceability
    - criterion: "No security vulnerabilities"
      verification_method: "Security scan: 0 critical findings"
      evidence_type: scan_result
      derived_from: [TASK-10, TASK-11]
```

**Key Addition**: `derived_from` links objectives to work items.

## Phase 2: Track Progress (Coordination)

### Coordination Log Tracks Evidence

```yaml
# coordination_log.yaml
work_item_status:
  - id: TASK-03
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

  - id: TASK-04
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
        work_items_verified: [TASK-03, TASK-04, TASK-05]
        status: PASS

      - criterion: "No security vulnerabilities"
        verification_method: "Security scan: 0 critical findings"
        evidence_source: outputs/security_scan.json
        evidence_found: "0 critical, 2 low severity findings"
        work_items_verified: [TASK-10, TASK-11]
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
Work Items: [TASK-03, TASK-04, TASK-05] all completed with evidence
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
  example: "TASK-03 criterion 'migration created' has no evidence path"
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
  example: "TASK-10, TASK-11 not started (security tests)"
```

## Key Principles

1. **Define verification at planning** - Don't wait until validation to figure out how to verify
2. **Capture evidence during execution** - Controllers record evidence as work completes
3. **Trace everything** - Every objective links to work items, every criterion has verification method
4. **Fail fast** - If evidence is missing, fail early in validation
5. **Be specific** - Evidence must be concrete (file paths, test outputs, metrics)

## Workflow YAML Schema Validation (V10.23.0)

Every workflow YAML file MUST conform to its schema. Five schema files are validated:

**plan.yaml**: plan_id, tier (2-4), domain, mission (len>10), objectives (>=1), controller_assignment (primary field required), success_criteria (>=1 each with verification_method)

**work_items.yaml**: work_items array (>=1) with id (WI-N format), title (len>5), type (understand|design|build|verify|document), acceptance_criteria (>=1), assigned_to (cagents:{name}), dependencies (valid WI-N refs)

**coordination_log.yaml**: schema_version ("1"), controller (cagents:{name}), objectives, implementation_tasks (>=1 each with task_id, assigned_to, status), status (completed|in_progress|failed)

**execution_summary.yaml**: session_id, final_state (VALIDATED|FAILED|INTERRUPTED), status, revision_rounds_used (0-3), states_executed, total_duration_ms

**status.yaml**: pipeline_state, revision_round (0-3), validation_cycles, created_at (ISO 8601), state_history (>=1 each with state + entered_at)

> **Revision-round range**: `0-3` is canonical — the outer FAIL/REVISE pipeline loop is capped at **3 total cycles** (`revision.max_cycles: 3` in `pipeline_config.yaml`, lowered from 5 in v12.0.0; after 3, escalate to user HITL). This is distinct from the controller's **2** internal executor-reviewer rounds (`controller_revision.max_internal_rounds: 2`, lowered from 3 in LP-27). Any `(0-5)` range elsewhere is stale and should read `(0-3)`.

The schema summaries above document the required fields for each workflow YAML file.

---

**Part of**: cAgents Completion Validation Framework
