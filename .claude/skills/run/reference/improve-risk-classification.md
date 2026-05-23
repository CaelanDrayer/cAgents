# Risk Classification

Canonical risk-classification rules for `/run improve --mode optimize` (and
`/run review|audit` via the v12.1.2 keyword router). Both review-mode
auto-fix and optimize-mode EXECUTING phases share a common
snapshot / apply / test / keep-or-rollback primitive, inlined below.

## Atomic Rollback Primitive

The atomic-rollback primitive wraps every auto-applied change in a
four-step transaction. It is the safety mechanism that makes auto-fix
acceptable for SAFE / LOW / MEDIUM risk findings:

1. **Snapshot**: Before applying any change, capture the pre-change
   state. Two snapshot strategies are supported:
   - **Git snapshot** (preferred): `git stash push -u -m "improve-{N}"`
     creates a restore point that survives across files and includes
     untracked additions.
   - **File backup** (fallback when git unavailable or in a non-repo
     working tree): copy the target file(s) to `cagents-memory/sessions/{id}/snapshots/improve-{N}/`.
2. **Apply**: Make the change (Edit/Write/Bash). The change MUST be
   confined to the files declared in the finding's `affected_files`
   list — broader edits trigger an automatic rollback before the
   verification step.
3. **Test**: Run the verification chain appropriate to the risk tier
   (see the Validation Required column in the Risk Levels table below).
   The verification command MUST complete without errors AND produce
   evidence (exit code 0 + matching output for `metric_check` /
   `test_result` verifications).
4. **Keep-or-rollback**: If verification PASSES, commit the change
   (release the snapshot — `git stash drop` or remove the backup
   directory). If verification FAILS, restore the snapshot
   (`git stash pop` or copy the backup back) and mark the finding as
   `rejected_by_guard` in the optimize report with the failing
   command's output appended.

The primitive is invoked once per finding. Multiple findings batched into
one apply step are NOT supported — each finding gets its own snapshot
and its own keep-or-rollback decision, so a single failing change does
not block the remaining queue.

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
2. Write to `cagents-memory/sessions/{session_id}/optimization_design.md`
3. Trigger `/run`: `Skill({skill: "run", args: "implement optimization plan from {session_id}"})`

## Quality Gates

All quality gates must pass after optimization:
1. **All tests pass** -- Unit, integration, type checking
2. **No new lint errors** -- Lint error count <= baseline
3. **Performance improved or maintained** -- No metric worse than baseline x 1.05
4. **Bundle size didn't increase** -- Bundle <= baseline x 1.02
5. **Test coverage didn't decrease** -- Coverage >= baseline (optional gate)

If any gate fails: rollback affected optimizations, report failure reason.
