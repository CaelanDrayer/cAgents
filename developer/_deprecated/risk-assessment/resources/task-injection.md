# Task Injection & Reporting

How to create preventive tasks and report risks.

## Task Injection Format

For each identified risk, create a preventive task:

```yaml
# Write to cagents-memory/{instruction_id}/intelligence/interventions.yaml

interventions:
  - id: int_001
    timestamp: 2026-01-04T10:15:30Z
    agent: risk-assessment
    intervention_type: task_injection
    triggered_by: task_003_implement_auth
    risk_identified:
      category: security
      severity: critical
      description: "JWT secret hardcoded in src/auth/jwt.ts:12"
      likelihood: 100%
      impact: "Secret exposure in version control"

    task_injected:
      id: task_007_secure_jwt_secret
      title: "Move JWT_SECRET to environment variable"
      description: "Extract JWT_SECRET and load from process.env"
      priority: critical
      blocking: true
      estimated_effort: 15min
      acceptance_criteria:
        - No hardcoded secrets in source code
        - JWT_SECRET loaded from .env file
        - Example .env.example file created
```

## Task File Creation

```yaml
# cagents-memory/{instruction_id}/tasks/pending/task_007_secure_jwt_secret.yaml

id: task_007_secure_jwt_secret
title: "Move JWT_SECRET to environment variable"
type: security_fix
priority: critical
blocking: true
injected_by: intelligence:risk-assessment
```

## Risk Report Format

```yaml
# cagents-memory/{instruction_id}/intelligence/risk_report.yaml

risk_assessment_id: risk_20260104_001
timestamp: 2026-01-04T10:15:30Z
instruction_id: inst_20260104_005
phase: after_planning

risks_identified: 5
tasks_injected: 3

risks:
  - id: risk_001
    category: security
    severity: critical
    description: "JWT secret hardcoded"
    status: task_injected
    task_id: task_007_secure_jwt_secret

  - id: risk_002
    category: performance
    severity: high
    description: "N+1 query in user listing"
    status: task_injected
    task_id: task_008_optimize_user_query

  - id: risk_003
    category: edge_case
    severity: medium
    description: "No email validation on signup"
    status: noted
    recommendation: "Add to backlog"

summary:
  critical_risks_blocked: 1
  high_risks_mitigated: 1
  medium_risks_noted: 3
  estimated_additional_work: 2 hours
```

## Output Format

```
=== Risk Assessment Report ===
Instruction: inst_20260104_005
Phase: After Planning

## Risks Identified: 5

[CRITICAL] JWT Secret Hardcoded
  File: src/auth/jwt.ts:12
  Risk: Secret exposure in version control
  -> TASK INJECTED: task_007_secure_jwt_secret (BLOCKING)

[HIGH] N+1 Query Pattern
  File: src/api/users.ts:45
  Risk: Performance degradation at scale
  -> TASK INJECTED: task_008_optimize_user_query

[MEDIUM] Missing Email Validation
  File: src/api/signup.ts:23
  Risk: Invalid emails in database
  -> NOTED (add to backlog)

## Actions Taken

- 3 preventive tasks injected
- 1 critical risk blocking workflow
- 2 risks noted for future consideration
- Estimated additional work: 2 hours
```

## Integration Points

### With Intelligence Layer Peers
- **Pattern Recognition**: Learn from past risks
- **Dependency Analyzer**: Coordinate on dependency risks
- **Predictive Analyst**: Share risk patterns

### With QA Layer
- **Security Analyst**: Hand off security risks
- **Performance Analyzer**: Hand off performance risks
- **Compliance Officer**: Hand off compliance risks

### With Workflow Tier
- **Planner**: Inject preventive tasks into plan
- **Executor**: Monitor execution, inject dynamically
- **Orchestrator**: Block phase transitions for critical risks
