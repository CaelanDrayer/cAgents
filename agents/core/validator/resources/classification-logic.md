# Classification Logic

Deterministic PASS/FIXABLE/BLOCKED rules.

## Classification Matrix

| Classification | Conditions | Next Agent |
|----------------|------------|------------|
| **PASS** | All critical+major gates pass, criteria met, minor ≤ 3 | Complete (archive) |
| **FIXABLE** | Fixable in <30min, no critical failures, structure complete | self-correct |
| **BLOCKED** | Critical failures, coordination violations, >50% tests fail | HITL (escalate) |

## BLOCKED Triggers

### Coordination Violations (Immediate BLOCKED)
- coordination_log.yaml missing (tier 2-4)
- Circular delegation detected
- No questions asked (tier 2-4)
- No synthesis or implementation tasks
- Synthesis completely incoherent

### Delegation Compliance Violations (Immediate BLOCKED)
- Self-answered questions > 0
- Direct work anti-patterns detected
- Task not delegated to execution agent

### Traditional Quality Failures
- >50% of tests fail
- Critical security vulnerability found
- Data corruption risk
- Self-correct tried ≥3 times

## FIXABLE Conditions

### Can Be Auto-Corrected
- Synthesis missing one objective (controller can address)
- Minor test failures (<30% failing)
- Documentation incomplete
- Question limit exceeded (work usable)
- Tasks don't match outputs (naming discrepancy)

### Time Bound
- Estimated fix time < 30 minutes
- Clear path to resolution
- No external dependencies needed

### Structure Intact
- coordination_log.yaml exists
- Basic structure valid
- Core work completed

## PASS Conditions

### All Quality Gates Pass
- All critical gates: PASS
- All major gates: PASS
- Minor issues ≤ 3

### Acceptance Criteria Met
- All objectives achieved with evidence
- Work items have captured evidence
- Evidence chain validates

### Coordination Quality High
- Questions asked and answered
- Synthesis coherent and complete
- Implementation tasks match outputs

## Validation Report Format

```yaml
validation_id: validation_{instruction_id}_{timestamp}
domain: {domain}
tier: {0-4}
classification: PASS | FIXABLE | BLOCKED
confidence: {0.0-1.0}

summary:
  total_quality_gates: {count}
  passed_gates: {count}
  critical_failures: {count}
  objectives_met: {count}
  coordination_quality: {high/medium/low}

coordination_validation:
  coordination_log_exists: true/false
  questions_asked_count: {count}
  circular_delegation_detected: true/false
  synthesis_quality: {high/medium/low/missing}
  coordination_health: PASS | FIXABLE | BLOCKED

delegation_compliance:
  self_answered_questions: {count}  # MUST be 0
  direct_work_patterns_detected: {count}  # MUST be 0
  delegation_compliance_status: PASS | BLOCKED

issues_found:
  critical: [list]
  major: [list]
  minor: [list]

recommendations: [list]

next_action:
  classification: {PASS|FIXABLE|BLOCKED}
  action: "{description}"
  agent: "{next_agent}"
```

## Next Agent Routing

| Classification | Route To | Action |
|----------------|----------|--------|
| PASS | orchestrator | Archive workflow, report success |
| FIXABLE | self-correct | Provide fix guidance |
| BLOCKED | hitl | Escalate with full context |

## Error Handling

| Scenario | Classification | Action |
|----------|---------------|--------|
| Missing coordination_log (tier 2-4) | BLOCKED | Escalate to HITL |
| Circular delegation | BLOCKED | Architecture violation, escalate |
| Missing config | Continue | Log warning, use generic validation |
| Check fails | Continue | Log output, proceed with remaining |
| Ambiguous criteria | Try multiple | Check coordination_log for clarity |
