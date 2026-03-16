# CI/CD Pipeline Patterns

Comprehensive guide to CI/CD platforms and pipeline design.

## CI/CD Platforms

### Jenkins
- Pipeline as code (Jenkinsfile)
- Rich plugin ecosystem
- Groovy-based DSL
- Multi-branch pipeline support

### GitLab CI
- YAML-based pipelines (.gitlab-ci.yml)
- Built-in container registry
- Auto DevOps features
- Runner management

### GitHub Actions
- Workflow files in .github/workflows/
- Marketplace actions
- Matrix builds
- Composite actions

### CircleCI
- config.yml in .circleci/
- Orbs for reusable config
- Docker layer caching
- Workflows and jobs

### Azure DevOps
- YAML pipelines
- Release management
- Multi-stage pipelines
- Integration with Azure services

## Pipeline Design Best Practices

### Stage Organization
```yaml
stages:
  - build      # Compile, lint, static analysis
  - test       # Unit tests, integration tests
  - scan       # Security scanning, dependency audit
  - deploy-staging
  - test-e2e   # E2E tests against staging
  - deploy-production
```

### Fail Fast Strategy
- Run fastest tests first
- Lint and static analysis before build
- Parallel test execution
- Early exit on failure

### Build Caching
- Cache dependency directories (node_modules, .m2, .cache)
- Use Docker layer caching
- Cache build artifacts between stages
- Implement incremental builds

### Build Optimization
- Multi-stage Docker builds
- Parallel job execution
- Selective path triggers
- Dependency deduplication

## Example Pipeline (GitHub Actions)

```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3

  security-scan:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=critical
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  deploy-staging:
    needs: [test, security-scan]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build
      - run: ./deploy.sh staging

  deploy-production:
    needs: [test, security-scan]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build
      - run: ./deploy.sh production
```

## Pipeline Metrics

Track these metrics for pipeline health:

- **Build Success Rate**: % of builds passing (target: >95%)
- **Build Time**: Time from commit to artifact (target: <10min)
- **Lead Time**: Time from commit to production (target: <1 day)
- **Deployment Frequency**: How often you deploy (target: daily+)
- **MTTR**: Mean time to recovery (target: <1 hour)

## Common Issues and Solutions

### Slow Builds
- Add caching (dependencies, Docker layers)
- Parallelize test execution
- Use incremental builds
- Optimize Docker images

### Flaky Tests
- Isolate test dependencies
- Use test retries with limits
- Fix non-deterministic behavior
- Quarantine flaky tests

### Security Scanning Failures
- Triage by severity (critical vs low)
- Set up ignore rules for false positives
- Create remediation tickets
- Block only on critical/high

### Environment Drift
- Use infrastructure as code
- Pin dependency versions
- Container-based environments
- Environment parity checks
