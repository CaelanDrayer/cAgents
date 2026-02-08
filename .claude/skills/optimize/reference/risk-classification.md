# Risk Classification

## Risk Levels

| Risk Level | Score | Auto-Apply? | Validation Required |
|------------|-------|-------------|-------------------|
| **SAFE** | 0-20 | Yes | Basic (lint + type check) |
| **LOW** | 21-40 | Yes | Standard (+ unit tests) |
| **MEDIUM** | 41-60 | Yes | Comprehensive (+ integration tests) |
| **HIGH** | 61-80 | No -- ask user | Full (+ architect review) |
| **CRITICAL** | 81-100 | No -- hand off to `/run` | Full (+ executive approval) |

## Prioritization Formula

```
priority = (impact_score x ease_score x confidence) / risk_score
```

### Scoring Values

**Impact scores**: high=10, medium=5, low=2
**Ease scores**: low_effort=10, medium_effort=5, high_effort=2
**Risk scores**: safe=1, low=1.5, medium=2, high=4, critical=8

### Context Multipliers

From `scan_patterns.yaml`:
- Hot spot (changed >5 times in 7 days): x1.5
- Recent change: x1.2
- PR context: x1.3
- Critical path: x1.4
- Performance bottleneck: x1.6

## Grouping for Parallel Execution

- **Independent group**: Opportunities touching different files -> execute in parallel
- **Dependent group**: Opportunities touching same files -> execute sequentially
- **Ordered group**: Opportunities with explicit dependencies -> execute in dependency order

## CRITICAL Optimization Handoff

When CRITICAL (81-100 risk) optimizations are found:
1. Generate optimization design document with full context
2. Write to `Agent_Memory/sessions/{session_id}/optimization_design.md`
3. Trigger `/run`: `Skill({skill: "run", args: "implement optimization plan from {session_id}"})`

## Quality Gates

All quality gates must pass after optimization:
1. **All tests pass** -- Unit, integration, type checking
2. **No new lint errors** -- Lint error count <= baseline
3. **Performance improved or maintained** -- No metric worse than baseline x 1.05
4. **Bundle size didn't increase** -- Bundle <= baseline x 1.02
5. **Test coverage didn't decrease** -- Coverage >= baseline (optional gate)

If any gate fails: rollback affected optimizations, report failure reason.
