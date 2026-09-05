# Quality Gates and Validation

Comprehensive validation framework for optimizations.

## Automated Regression Testing

```yaml
regression_tests:
  unit_tests:
    command: npm test
    required: true
    timeout: 300000  # 5 minutes
  integration_tests:
    command: npm run test:integration
    required: true
    timeout: 600000  # 10 minutes
  e2e_tests:
    command: npm run test:e2e
    required: false  # optional
    timeout: 900000  # 15 minutes
  type_checking:
    command: npm run type-check
    required: true
    timeout: 60000
  linting:
    command: npm run lint
    required: true
    timeout: 60000
```

## Performance Benchmarking

```yaml
performance_benchmarks:
  lighthouse:
    enabled: true
    command: lighthouse ${url} --output json
    metrics: [fcp, lcp, tti, tbt, cls]
    thresholds:
      fcp: {max: 1000, improvement_required: true}
      lcp: {max: 2500, improvement_required: true}
  bundle_analysis:
    enabled: true
    command: npm run build && du -sh dist/
    threshold: {improvement_required: true}
  load_testing:
    enabled: false
    command: k6 run loadtest.js
    metrics: [rps, p95_latency, error_rate]
```

## Quality Gate Definitions

```yaml
quality_gates:
  - name: "All tests pass"
    required: true
    validation: test_results.passed == test_results.total
  - name: "No new linting errors"
    required: true
    validation: lint_errors_delta <= 0
  - name: "Performance improves or maintains"
    required: true
    validation: final_metrics.fcp <= baseline_metrics.fcp * 1.05
  - name: "Bundle size doesn't increase"
    required: true
    validation: final_bundle_size <= baseline_bundle_size * 1.02
  - name: "Test coverage doesn't decrease"
    required: false
    validation: final_coverage >= baseline_coverage
```

## Snapshot Comparisons

```bash
# Before optimization
git diff --stat main > baseline_diff.txt
du -sh dist/ > baseline_bundle_size.txt
npm test -- --coverage --json > baseline_test_results.json
lighthouse ${url} --output json > baseline_lighthouse.json

# After optimization
git diff --stat main > final_diff.txt
du -sh dist/ > final_bundle_size.txt
npm test -- --coverage --json > final_test_results.json
lighthouse ${url} --output json > final_lighthouse.json

# Generate comparison report
diff baseline_diff.txt final_diff.txt
```

## Incremental Application

```javascript
const optimizationQueue = prioritizeByRiskAndROI(opportunities)

for (const opt of optimizationQueue) {
  const snapshot = await createSnapshot(opt.id)

  try {
    await applyOptimization(opt)
    const validationResult = await validate(opt, {
      comprehensive: opt.risk_score > 40,
      regression_tests: true,
      performance_benchmarks: opt.type === 'code',
      quality_gates: true
    })

    if (validationResult.passed) {
      snapshot.commit()
      completed.push(opt)
    } else {
      snapshot.rollback()
      failed.push({opt, reason: validationResult.reason})
    }
  } catch (error) {
    snapshot.rollback()
    failed.push({opt, error})
  }
}
```

## Rollback on Failure

If any quality gate fails:
1. Restore from git snapshot
2. Log rollback reason
3. Report failure with details
4. Continue with next optimization (unless --stop-on-failure)
