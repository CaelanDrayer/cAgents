# Risk Assessment Framework

Detailed risk assessment criteria for Engineering Manager.

## Risk Categories

```yaml
risk_categories:
  technical_complexity: 1-10
  scope_ambiguity: 1-10
  external_dependencies: 1-10
  security_sensitivity: 1-10
  performance_impact: 1-10
  data_integrity_risk: 1-10
```

## Decision Thresholds

| Total Risk Score | Decision |
|------------------|----------|
| < 15 | Approve automatically |
| 15-25 | Approve with monitoring |
| 26-35 | Approve with checkpoints |
| > 35 | Escalate to HITL |

## Risk Assessment Template

```yaml
# Agent_Memory/{inst_id}/decisions/em_risk_assessment.yaml
instruction_id: {inst_id}
objective: "{objective}"

risk_assessment:
  technical_complexity: {score}  # Rationale
  scope_ambiguity: {score}
  external_dependencies: {score}
  security_sensitivity: {score}
  performance_impact: {score}
  data_integrity_risk: {score}

  total_score: {sum}

decision: approve_automatically | approve_with_monitoring | approve_with_checkpoints | escalate_to_hitl

rationale: |
  {Explanation of decision}

  {If approved with checkpoints:}
  Checkpoint plan:
  - After ST{id}: Review {aspect}
  - After ST{id}: Validate {concern}

  {If escalated:}
  Escalation questions for HITL:
  - Question 1?
  - Question 2?
```

## Risk Scoring Guide

### Technical Complexity (1-10)

| Score | Description |
|-------|-------------|
| 1-2 | Trivial change, well-understood code |
| 3-4 | Standard feature, existing patterns |
| 5-6 | Moderate complexity, some unknowns |
| 7-8 | Complex, multiple systems affected |
| 9-10 | Highly complex, novel architecture |

### Scope Ambiguity (1-10)

| Score | Description |
|-------|-------------|
| 1-2 | Crystal clear requirements |
| 3-4 | Minor clarifications needed |
| 5-6 | Some requirements undefined |
| 7-8 | Significant unknowns |
| 9-10 | Vague or conflicting requirements |

### External Dependencies (1-10)

| Score | Description |
|-------|-------------|
| 1-2 | No external dependencies |
| 3-4 | Stable, well-documented APIs |
| 5-6 | Third-party services involved |
| 7-8 | Multiple external systems |
| 9-10 | Critical path on external team |

### Security Sensitivity (1-10)

| Score | Description |
|-------|-------------|
| 1-2 | No security impact |
| 3-4 | Minor security considerations |
| 5-6 | User data involved |
| 7-8 | Financial or PII data |
| 9-10 | Critical security infrastructure |

### Performance Impact (1-10)

| Score | Description |
|-------|-------------|
| 1-2 | No performance impact |
| 3-4 | Minor overhead acceptable |
| 5-6 | Performance testing needed |
| 7-8 | Critical path affected |
| 9-10 | System-wide performance impact |

### Data Integrity Risk (1-10)

| Score | Description |
|-------|-------------|
| 1-2 | Read-only operations |
| 3-4 | Low-risk data modifications |
| 5-6 | Important data affected |
| 7-8 | Schema migrations involved |
| 9-10 | Critical data at risk |

## Checkpoint Planning

When approving with checkpoints, define:

1. **Checkpoint triggers**: After which task/milestone
2. **Review criteria**: What to verify
3. **Rollback plan**: How to revert if issues found
4. **Escalation path**: Who to notify if blocked
