# Task Completion Protocol

**MANDATORY**: All tasks must be fully completed with verified evidence before marking as done.

## Core Rule

**100% completion with verified evidence, or it's not complete.**

See `validation-framework.md` for the full traceability chain from planning to validation.

## The Completion Chain

```
Planning Phase:
  ├── Work items have acceptance_criteria
  ├── Criteria have verification_method
  └── Objectives have derived_from (links to work items)

Coordination Phase:
  ├── Controllers track work_item_status
  ├── Evidence captured per criterion
  └── completed_at/completed_by recorded

Validation Phase:
  ├── Verify each criterion using verification_method
  ├── Check evidence chain exists
  └── Confirm all derived_from work items complete
```

## Enforcement Points

### Decomposer/Planner
- Every work item MUST have `acceptance_criteria`
- Every criterion MUST have `verification_method`
- Every objective MUST link to `derived_from` work items

### Controllers
- Track `work_item_status` in coordination_log.yaml
- Capture `evidence` for each completed criterion (file paths, test results, metrics)
- Mark `completed_at` and `completed_by` for every item
- No partial completion - 100% with evidence or in_progress

### Universal-Executor
- Verifies coordination_log completeness before phase transition
- Checks all work items have `status: completed`
- Validates evidence exists for each criterion

### Universal-Validator
- Verifies each objective's success criteria
- Checks evidence chain (criterion → evidence → source)
- Confirms all derived_from work items are complete
- Classifies: PASS (all verified), FIXABLE (evidence missing), BLOCKED (work incomplete)

### Orchestrator
- Validates coordination_log exists and is complete
- Checks phase transitions have evidence
- Ensures no phase skipped

## Evidence Requirements

### Good Evidence (Specific, Verifiable)
```yaml
- criterion: "User model has password_hash"
  evidence: "src/models/user.ts:15 - password_hash: string"
  verification: file_contains

- criterion: "Tests pass"
  evidence: "pytest: 45/45 passed (0.8s)"
  verification: test_result

- criterion: "Bundle size reduced"
  evidence: "2.8MB → 1.8MB (-36%)"
  verification: metric_check
```

### Bad Evidence (Vague, Unverifiable)
```yaml
- "Tests probably pass"
- "File mostly done"
- "Should be faster now"
- "I think it works"
```

## Verification Methods

| Type | How Validator Checks | Example |
|------|---------------------|---------|
| `file_exists` | Check file at path | `migrations/20260122_auth.sql` |
| `file_contains` | Grep for pattern | `password_hash in user.ts` |
| `test_result` | Run test suite | `pytest auth/ - PASS` |
| `scan_result` | Run scan tool | `npm audit - 0 critical` |
| `metric_check` | Compare metric | `coverage: 85% > 80%` |
| `output_exists` | Check output file | `outputs/design.md exists` |
| `manual_review` | HITL verification | Tier 4 approval gate |

## Context Overhead

Add 3K tokens per coordination cycle for evidence tracking (included in planning budget).

## Quick Reference

**At Planning:**
- [ ] Work items have acceptance_criteria
- [ ] Criteria have verification_method
- [ ] Objectives link to derived_from work items

**At Coordination:**
- [ ] work_item_status tracked in coordination_log
- [ ] Evidence captured for each criterion
- [ ] completed_at/completed_by recorded

**At Validation:**
- [ ] Every criterion verified using its method
- [ ] Evidence chain confirmed
- [ ] All derived_from work items complete

## Protocol Location

`Agent_Memory/_system/task_completion_protocol.yaml`

---

**Part of**: cAgents Completion Validation Framework
