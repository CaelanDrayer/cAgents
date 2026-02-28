# Coverage Metrics

## Line Coverage

- **90%+**: Excellent
- **80-89%**: Good
- **70-79%**: Acceptable
- **<70%**: Insufficient (HIGH severity)

## Branch Coverage

- **85%+**: Excellent
- **75-84%**: Good
- **60-74%**: Acceptable
- **<60%**: Insufficient (HIGH severity)

## Function Coverage

- All public functions should be tested
- Private functions tested via public interface

## Integration with Tools

### JavaScript (Jest)
```bash
npm test -- --coverage --coverageThreshold='{"global": {"lines": 80, "branches": 75}}'
```

### Python (pytest)
```bash
pytest --cov=src --cov-report=html --cov-fail-under=80
```

### Output Format

```yaml
review_id: test_001
agent: test-coverage-validator
severity: high
blocking: true

coverage_summary:
  line_coverage: 68%
  branch_coverage: 55%
  function_coverage: 72%
  status: insufficient

findings:
  - issue: "Authentication logic has no test coverage"
    file: "src/auth/authenticate.js"
    coverage: 0%
    type: untested_critical_path
    severity: critical
    blocking: true
```
