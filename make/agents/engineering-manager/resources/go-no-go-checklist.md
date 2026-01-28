# Go/No-Go Decision Checklist

Criteria for deployment decisions on tier 3-4 work.

## Checklist Categories

### Mandatory (All must be true for GO)

- [ ] All strategic tasks complete
- [ ] All acceptance criteria met
- [ ] No critical bugs
- [ ] Rollback plan ready

### Quality Gates

- [ ] Test coverage adequate (target: 80%+)
- [ ] Security review passed (if applicable)
- [ ] Performance acceptable (meets SLAs)
- [ ] Monitoring in place

## Decision Rules

| Scenario | Decision |
|----------|----------|
| All criteria true | **GO** |
| Any mandatory false | **NO_GO** |
| Minor quality issues | **GO_WITH_CAVEATS** |

## Go/No-Go Template

```yaml
# Agent_Memory/{inst_id}/decisions/em_go_no_go.yaml
instruction_id: {inst_id}
objective: "{objective}"
tier: {tier}

checklist_results:
  # Mandatory
  all_strategic_tasks_complete: true
  all_acceptance_criteria_met: true
  no_critical_bugs: true
  rollback_plan_ready: true

  # Quality Gates
  test_coverage_adequate: true  # 92% (target 90%)
  security_review_passed: true
  performance_acceptable: false  # p95 latency 550ms (target <500ms)
  monitoring_in_place: true

decision: GO_WITH_CAVEATS

rationale: |
  Performance is slightly below target (550ms vs 500ms p95 latency).
  This is acceptable for initial launch with plan to optimize.

  Caveats:
  - Monitor p95 latency closely for 48h
  - If latency > 600ms, trigger performance sprint
  - Follow-up instruction created: inst_015 (perf tuning)

  All other criteria met. Safe to deploy.

approved_by: engineering-manager
approved_at: 2026-01-20T14:00:00Z
```

## NO_GO Recovery

When issuing NO_GO:

1. **Document blockers**: Specific issues preventing GO
2. **Define remediation**: What must be fixed
3. **Set timeline**: When to re-evaluate
4. **Assign owners**: Who fixes each blocker
5. **Schedule follow-up**: When to reconvene

## Caveats Documentation

For GO_WITH_CAVEATS, document:

1. **What's imperfect**: Specific shortcomings
2. **Why acceptable**: Business justification
3. **Monitoring plan**: How to detect issues
4. **Trigger conditions**: When to act
5. **Contingency plan**: What to do if triggered
6. **Follow-up work**: Instruction IDs for fixes
