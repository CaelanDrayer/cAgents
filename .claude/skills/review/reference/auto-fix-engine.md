# Auto-Fix Engine

## Fix Generation Process

For each finding, generate an auto-fix if applicable:

1. **Load fix template** from patterns or framework-specific rules
2. **Calculate fix confidence** score (0.0-1.0)
3. **Classify fix safety level**:

| Safety Level | Confidence | Description | Action |
|-------------|-----------|-------------|--------|
| **SAFE** | >= 0.9 | Proven pattern, no side effects | Auto-applicable |
| **MEDIUM** | >= 0.7 | Requires testing | Apply with validation |
| **RISKY** | < 0.7 | Significant changes | Manual review required |

## Fix Validation

If `--run-tests` enabled:
1. Run unit tests
2. Run integration tests
3. Check for regressions
4. Rollback if any test fails

## Interactive Approval

If not `--apply-safe-fixes`:
1. Show user each fix with before/after
2. Display confidence score and safety level
3. Ask: "Apply this fix? (yes/no/skip)"

## Fix Application

1. **Create backup** before applying
2. **Apply fix** atomically
3. **Run tests** if `--run-tests`
4. **Rollback on failure** if `--rollback-on-failure`

## Fix Result Tracking

Track per fix:
- Success rate
- Test pass/fail
- User acceptance rate

Write results to `reports/auto_fixes.yaml`:

```yaml
auto_fixes:
  total_generated: 15
  safe: 10
  medium: 4
  risky: 1

  applied:
    - finding_id: F-001
      safety: SAFE
      confidence: 0.95
      status: applied
      tests_passed: true

  pending:
    - finding_id: F-012
      safety: MEDIUM
      confidence: 0.78
      reason: "Awaiting user approval"

  rejected:
    - finding_id: F-015
      safety: RISKY
      confidence: 0.55
      reason: "User chose manual review"
```
