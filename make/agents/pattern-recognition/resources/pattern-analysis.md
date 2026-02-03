# Pattern Analysis Methodology

## Data Collection

Read from Agent_Memory to gather pattern data:

```bash
# Read completed workflows
Agent_Memory/_archive/inst_*/episodic/timeline.yaml

# Read validation outcomes
Agent_Memory/_archive/inst_*/validation_report.yaml

# Read self-correction attempts
Agent_Memory/_archive/inst_*/self_correct/attempts.yaml

# Read routing decisions
Agent_Memory/_archive/inst_*/decisions/router.yaml
```

## Pattern Identification

Look for patterns across **5+ workflows** minimum:

### Failure Patterns
- "Task X fails in 80% of workflows" -> Missing prerequisite or unclear requirements
- "Security reviews always find issue Y" -> Gap in developer training
- "Performance issues in Z module" -> Architectural problem

### Success Patterns
- "Workflows with early architecture review complete 30% faster" -> Add architecture review to tier 2+
- "Test-first approaches have 50% fewer validation failures" -> Recommend TDD
- "Small batch tasks complete more reliably" -> Encourage task decomposition

### Process Patterns
- "Planner estimates are consistently 2x actual time" -> Calibrate estimation model
- "Executor invokes senior-dev for 90% of tier 2 tasks" -> Adjust routing thresholds
- "Self-correct succeeds 85% of time for linting errors" -> Automate linting fixes

## Pattern Documentation

```yaml
# Agent_Memory/_knowledge/procedural/patterns.yaml

patterns:
  - pattern_id: pat_001
    type: failure
    category: security
    description: "JWT secret exposure in 8/10 auth implementations"
    frequency: 80%
    workflows_affected: [inst_20260101_003, inst_20260102_005, ...]
    root_cause: "Developers unfamiliar with environment variable best practices"
    recommendation:
      action: "Add security-specialist proactive review for all auth tasks"
      estimated_impact: "Reduce security issues by 70%"
      priority: high
```
