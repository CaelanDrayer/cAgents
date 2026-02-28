# Technical Troubleshooting Frameworks

## Investigation Process

### 1. Collect Information
```yaml
customer_context:
  - What trying to do?
  - When did it start?
  - How many affected?

technical_details:
  - Error messages (exact)
  - Reproduction steps
  - Browser/client version
  - Network environment
  - Recent changes

system_data:
  - Application logs
  - Database logs
  - API logs
  - Infrastructure metrics
```

### 2. Reproduce Issue
- Set up test environment
- Follow exact customer steps
- Document variations

### 3. Analyze
- **Logs**: Search patterns, correlate timestamps
- **Data**: Query tables, check consistency
- **Monitoring**: CPU/memory, network, request rates
- **Code**: Examine source, check recent changes

### 4. Develop Solution
- Immediate workaround (with limitations)
- Permanent fix (if support can implement)
- Engineering escalation (if code change needed)

## Common Debugging Commands

### Log Analysis
```bash
# Search errors in timeframe
grep "2026-01-10 14:[0-9][0-9]" /var/log/app.log | grep ERROR

# Count error frequency
grep ERROR /var/log/app.log | cut -d':' -f3 | sort | uniq -c | sort -rn

# Extract user IDs from failures
grep "request_failed" /var/log/app.log | grep -oP 'user_id=\K[0-9]+'
```

### Database Debugging
```sql
-- Check query performance
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC LIMIT 20;

-- Long-running queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '5 minutes';
```

### API Testing
```bash
# Test endpoint
curl -v -X GET https://api.example.com/resource \
  -H "Authorization: Bearer ${TOKEN}"

# Check response times
time curl -s https://api.example.com/health
```

## Common Scenarios

### Performance Degradation
**Causes**: Missing indexes, N+1 queries, pool exhaustion, resource contention
**Resolution**: Add indexes, optimize queries, increase pool, add caching

### Intermittent API Failures
**Causes**: Rate limiting, timeouts, network issues, peak load
**Resolution**: Adjust limits, tune timeouts, improve retry logic, scale

### Authentication Failures
**Causes**: Token expiration, clock skew, OAuth misconfiguration, CORS
**Resolution**: Token refresh, sync clocks, correct config, configure CORS

## Bug Report Template

```yaml
bug_report:
  title: "Concise description"
  severity: critical | high | medium | low

  customer_impact:
    affected: "[Customers or 'all users']"
    business_impact: revenue_blocking | feature_unavailable | degraded
    workaround: yes/no

  reproduction:
    - "Step 1"
    - "Step 2"
    - "Expected: X"
    - "Actual: Y"

  technical_details:
    environment: production | staging | all
    version: "x.y.z"
    errors: "[Exact messages]"
    logs: "[Relevant entries]"

  root_cause_hypothesis: "[Your analysis]"
  suggested_fix: "[If ideas]"
```

## Working with Engineering

- **Advocate**: Communicate urgency based on business impact
- **Partner**: Provide detailed info, test fixes
- **Bridge**: Translate jargon for customers, explain needs to engineers
