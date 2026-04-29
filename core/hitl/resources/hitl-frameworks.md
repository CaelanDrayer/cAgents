# HITL Escalation Frameworks

## HITL Request Format

```yaml
hitl_request:
  id: hitl_{timestamp}
  instruction_id: {instruction_id}
  domain: {domain}
  urgency: low|medium|high|critical
  created_at: {timestamp}

  summary: |
    One paragraph explaining: goal, attempts, why blocked,
    impact of delay, why human decision needed.

  context:
    instruction_objective: "{objective}"
    current_phase: {phase}
    failed_task: {task_id}
    attempts_made: {count}
    blocking_issue: "{description}"

  options:
    - id: 1
      name: "{short name}"
      description: "{what it does}"
      pros: ["{advantage}"]
      cons: ["{disadvantage}"]
      risk_level: low|medium|high
      estimated_time: "{duration}"

  recommendation:
    option_id: 1
    rationale: "{why this is best}"

  timeout:
    warning_at: {minutes}
    escalate_at: {minutes}
    default_action: abort|recommendation

  domain_context:
    relevant_patterns_file: "_knowledge/calibration/{domain}_hitl_patterns.yaml"
    prior_similar_decisions: {count}
```

## Urgency Classification

| Level | Response Time | Examples |
|-------|---------------|----------|
| Low | 24 hours | Style choices, optional improvements |
| Medium | 4 hours | Implementation approach, technical tradeoffs |
| High | 1 hour | Blocking issues, security concerns |
| Critical | 15 minutes | Production incidents, data loss risk |

## Options Presentation

### Always Include
1. **Primary options** (2-4): Viable solutions
2. **Recommendation**: Your suggested option with rationale
3. **Abort option**: Always last option

### Option Analysis Format
```yaml
option:
  name: "Use express-rate-limit with Redis"
  description: "Industry standard package with distributed support"
  pros:
    - "Well-maintained, production-tested"
    - "Supports distributed architecture"
  cons:
    - "External dependency"
    - "Redis required for distributed"
  risk_level: low
  estimated_time: "2-3 hours"
  prerequisites: ["Redis available", "npm registry access"]
```

## Domain-Isolated Learning

### Pattern Recording
```yaml
# File: _knowledge/calibration/{domain}_hitl_patterns.yaml
patterns:
  - pattern_id: {domain}_{pattern_name}
    domain: {domain}
    category: implementation_choice|security_decision|resource_allocation

    situation:
      description: "{when this pattern applies}"
      context: ["{trigger 1}", "{trigger 2}"]

    decision:
      option: "{selected option}"
      specific: "{details}"
      rationale: "{why}"

    occurrences: {count}
    consistency: {0.0-1.0}
    automation_candidate: {true|false}
    automation_scope: {domain}
```

### Automation Thresholds
| Occurrences | Consistency | Action |
|-------------|-------------|--------|
| 1-2 | Any | Log pattern |
| 3+ | < 0.8 | Track, don't automate |
| 3+ | >= 0.8 | Flag as automation candidate |
| 5+ | >= 0.9 | Suggest automation rule |

## Workflow Pause/Resume

### Pause Workflow
```yaml
# Update status.yaml
phase: blocked
hitl_status: awaiting_decision
hitl_request_id: hitl_{id}
paused_at: {timestamp}
resume_instructions: |
  Waiting for human decision on {issue}.
  Options: {option_summary}
```

### Resume Workflow
```yaml
# Signal to orchestrator
type: delegation
from: hitl
to: orchestrator
instruction_id: {id}
domain: {domain}
priority: high

message: |
  Human decision received for HITL request {hitl_id}.
  Option {N} selected: "{option_name}"

resume_instructions:
  phase: {resume_phase}
  task: {resume_task}
  approach: "{selected approach}"
```

## Timeout Handling

### Timeout Actions
| Urgency | Warning | Escalate | Default |
|---------|---------|----------|---------|
| Low | 12h | 24h | Use recommendation |
| Medium | 2h | 4h | Use recommendation |
| High | 30m | 1h | Use recommendation |
| Critical | 10m | 15m | Abort (safe default) |

### Default Action Logic
- **Non-destructive decision**: Apply recommendation
- **Destructive decision**: Abort and require explicit approval
- **Ambiguous**: Abort and escalate to next level

## Error Handling

### Human Unavailable
1. Send reminder at warning threshold
2. Escalate to backup contact at escalate threshold
3. Apply default action if no response
4. Document decision path for audit

### Invalid Selection
1. Confirm selection is within option range
2. If invalid, prompt for re-selection
3. Log invalid attempts (may indicate UI issue)
