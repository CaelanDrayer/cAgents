# Priority Arbitration Framework

Decision framework for resolving multi-instruction resource conflicts.

## Priority Factors

```yaml
factors:
  - business_impact
  - deadline_urgency
  - customer_commitment
  - technical_dependency
  - team_morale
```

## Decision Matrix

| Scenario | Decision |
|----------|----------|
| Both critical | Escalate to HITL |
| One critical | Prioritize critical |
| Both high | Consider parallelization |
| Customer commitment | Prioritize commitment |
| Default | FIFO with capacity check |

## Priority Decision Template

```yaml
# Agent_Memory/_system/decisions/priority_arbitration_{timestamp}.yaml
conflicting_instructions:
  - inst_id: inst_001
    tier: 3
    priority: high
    business_impact: customer_commitment
    deadline: 2026-01-20
    capacity_required: 60% backend

  - inst_id: inst_002
    tier: 4
    priority: critical
    business_impact: revenue_impact
    deadline: 2026-01-25
    capacity_required: 80% backend

conflict: backend_oversubscribed (140% capacity requested)

decision: prioritize_inst_002_defer_inst_001

rationale: |
  inst_002 is critical priority with revenue impact.
  inst_001 is high priority but can be delayed 5 days.

  Action:
  - Pause inst_001 after current sprint
  - Allocate full backend capacity to inst_002
  - Resume inst_001 after inst_002 completion

  Impact:
  - inst_001 delayed 5 days (acceptable buffer)
  - inst_002 gets full resources (critical for revenue)
```

## Escalation Triggers

Escalate to HITL when:

1. **Both critical priority**: Cannot deprioritize either
2. **Customer commitment conflict**: External commitments at risk
3. **Strategic ambiguity**: Business direction unclear
4. **Resource crisis**: Insufficient capacity for critical work
5. **Political sensitivity**: Team dynamics at risk

## Parallelization Considerations

Before forcing priority:

1. Can tasks run in parallel with reduced scope?
2. Can capacity be temporarily increased?
3. Can non-critical subtasks be deferred?
4. Are there shared components to leverage?
