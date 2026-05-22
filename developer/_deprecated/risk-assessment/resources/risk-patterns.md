# Risk Pattern Categories

Common risk patterns to analyze during assessment.

## Security Risks

```yaml
patterns:
  - pattern: "User input -> database query"
    risk: SQL injection
    severity: critical
    mitigation: "Add parameterized queries or ORM usage"

  - pattern: "JWT_SECRET hardcoded"
    risk: Secret exposure
    severity: critical
    mitigation: "Move secrets to environment variables"

  - pattern: "No authentication on API endpoint"
    risk: Unauthorized access
    severity: high
    mitigation: "Add authentication middleware"

  - pattern: "eval() or exec() usage"
    risk: Code injection
    severity: critical
    mitigation: "Remove dynamic code execution"

  - pattern: "dangerouslySetInnerHTML"
    risk: XSS vulnerability
    severity: high
    mitigation: "Sanitize HTML or use safe alternatives"
```

## Data Loss Risks

```yaml
patterns:
  - pattern: "Database schema change without migration"
    risk: Data loss during deployment
    severity: critical
    mitigation: "Create rollback-safe migration script"

  - pattern: "DELETE without WHERE clause"
    risk: Accidental data deletion
    severity: critical
    mitigation: "Add soft delete or confirmation step"

  - pattern: "No backup before destructive operation"
    risk: Irrecoverable data loss
    severity: high
    mitigation: "Add backup step before operation"
```

## Performance Risks

```yaml
patterns:
  - pattern: "N+1 query in loop"
    risk: Performance degradation at scale
    severity: high
    mitigation: "Implement eager loading or batch queries"

  - pattern: "Synchronous operation in request handler"
    risk: Request timeout under load
    severity: medium
    mitigation: "Move to async/background job"

  - pattern: "Large file processing in memory"
    risk: Memory exhaustion
    severity: high
    mitigation: "Use streaming processing"

  - pattern: "No pagination on list endpoints"
    risk: Response timeout on large datasets
    severity: medium
    mitigation: "Add pagination support"
```

## Integration Risks

```yaml
patterns:
  - pattern: "Third-party API call without timeout"
    risk: Application hang
    severity: high
    mitigation: "Add timeout and circuit breaker"

  - pattern: "External dependency without fallback"
    risk: Service outage
    severity: medium
    mitigation: "Implement graceful degradation"

  - pattern: "No retry logic for transient failures"
    risk: Intermittent failures
    severity: medium
    mitigation: "Add retry with exponential backoff"
```

## Edge Case Risks

```yaml
patterns:
  - pattern: "Array access without bounds check"
    risk: Index out of bounds error
    severity: medium
    mitigation: "Add array length validation"

  - pattern: "Division without zero check"
    risk: Division by zero error
    severity: medium
    mitigation: "Add zero check and error handling"

  - pattern: "Null/undefined access"
    risk: Runtime null pointer error
    severity: medium
    mitigation: "Add null checks or optional chaining"

  - pattern: "Empty input handling"
    risk: Unexpected behavior on empty data
    severity: low
    mitigation: "Add empty input validation"
```

## Detection Commands

```bash
# Security patterns
grep -r "eval\|exec\|dangerouslySetInnerHTML" src/
grep -r "TODO\|FIXME\|XXX" src/

# Secret patterns
grep -r "SECRET\|PASSWORD\|API_KEY" --include="*.ts" --include="*.js" src/

# SQL patterns
grep -r "DELETE FROM\|DROP TABLE\|TRUNCATE" src/
```
