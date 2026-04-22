# Quality Gate Validation

## Gate Thresholds

| Gate Level | Behavior |
|-----------|----------|
| **strict** | Block on any critical issue |
| **standard** | Block on 3+ critical issues |
| **relaxed** | Warn only, don't block |

## Validation Steps

1. **Check quality gate thresholds** against findings
2. **Run regression tests** (if `--run-tests`):
   - Execute test suite
   - Check for new failures
   - Validate performance hasn't degraded
3. **Rollback on failure** (if `--rollback-on-failure`):
   - Restore from backup
   - Report rollback reason
   - Suggest manual review
4. **Report gate status**:
   - PASSED: All gates passed
   - FAILED: Quality gate blocked review
   - WARNING: Issues found but not blocking

## Gate Output

Write to `reports/quality_gates.yaml`:

```yaml
quality_gates:
  level: standard
  status: PASSED

  checks:
    - gate: "Critical issue threshold"
      result: PASSED
      details: "2 critical issues (threshold: 3)"

    - gate: "Regression tests"
      result: PASSED
      details: "142/142 tests passed"

    - gate: "Performance baseline"
      result: PASSED
      details: "No performance degradation detected"

  auto_fixes_applied: 8
  auto_fixes_rolled_back: 0
```
