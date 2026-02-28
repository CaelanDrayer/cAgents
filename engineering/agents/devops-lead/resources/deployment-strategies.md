# Deployment Strategies

Reference for deployment approaches, rollout patterns, and release management.

## Deployment Patterns

### Rolling Deployment

Replace instances gradually with zero downtime.

```
Phase 1: [v1] [v1] [v1] [v1]    (all old)
Phase 2: [v2] [v1] [v1] [v1]    (1 updated)
Phase 3: [v2] [v2] [v1] [v1]    (2 updated)
Phase 4: [v2] [v2] [v2] [v2]    (all new)
```

**Pros**: Zero downtime, gradual rollout, easy rollback
**Cons**: Two versions running simultaneously, slow for large fleets
**Use when**: Standard releases, stateless services

### Blue-Green Deployment

Maintain two identical environments, switch traffic atomically.

```
Before:  [Load Balancer] -> [Blue: v1] (active)
                            [Green: v1] (idle)

Deploy:  [Load Balancer] -> [Blue: v1] (active)
                            [Green: v2] (deploying)

Switch:  [Load Balancer] -> [Green: v2] (active)
                            [Blue: v1] (standby/rollback)
```

**Pros**: Instant rollback, full environment testing before switch
**Cons**: Double infrastructure cost, database migration complexity
**Use when**: Critical services, compliance requirements, predictable traffic

### Canary Deployment

Route small percentage of traffic to new version, gradually increase.

```
Phase 1:  1% traffic -> [v2],  99% -> [v1]   (smoke test)
Phase 2:  5% traffic -> [v2],  95% -> [v1]   (monitor errors)
Phase 3: 25% traffic -> [v2],  75% -> [v1]   (validate performance)
Phase 4: 50% traffic -> [v2],  50% -> [v1]   (confidence check)
Phase 5: 100% traffic -> [v2]                  (full rollout)
```

**Pros**: Minimal blast radius, real production validation
**Cons**: Complex routing, monitoring overhead, longer rollout
**Use when**: High-risk changes, performance-sensitive services

### Feature Flags

Deploy code but control activation independently from deployment.

```javascript
if (featureFlags.isEnabled('new-checkout', { userId: user.id })) {
  return newCheckoutFlow(req, res);
} else {
  return legacyCheckoutFlow(req, res);
}
```

**Pros**: Decouple deploy from release, targeted rollouts, instant kill switch
**Cons**: Code complexity, flag cleanup discipline needed
**Use when**: A/B testing, gradual feature rollouts, emergency toggles

## Rollback Procedures

### Automated Rollback Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate | > 1% (5 min window) | Auto-rollback |
| Latency p99 | > 2x baseline | Alert + manual decision |
| Health check | 3 consecutive failures | Auto-rollback instance |
| CPU/Memory | > 90% sustained (10 min) | Alert + scale or rollback |

### Rollback Checklist

- [ ] Identify the failing deployment version
- [ ] Trigger rollback (revert to last known good version)
- [ ] Verify health checks pass on rolled-back version
- [ ] Check database compatibility (backward-compatible migrations?)
- [ ] Notify stakeholders of rollback
- [ ] Create post-mortem ticket
- [ ] Verify monitoring shows recovery

## CI/CD Pipeline Stages

```
[Code Push] -> [Build] -> [Unit Tests] -> [Integration Tests]
     -> [Security Scan] -> [Stage Deploy] -> [E2E Tests]
     -> [Approval Gate*] -> [Canary Deploy] -> [Monitor]
     -> [Full Deploy] -> [Smoke Tests] -> [Done]

* Approval gate for production only (tier 3+)
```

### Pipeline Configuration

| Stage | Timeout | Failure Action | Required |
|-------|---------|---------------|----------|
| Build | 10 min | Block | Yes |
| Unit Tests | 15 min | Block | Yes |
| Integration Tests | 30 min | Block | Yes |
| Security Scan | 20 min | Warn (block if critical) | Yes |
| E2E Tests | 30 min | Block for production | Staging+ |
| Canary | 30 min | Auto-rollback | Production |

## Database Migration Strategy

### Forward-Only Migration Rules

1. **Add column**: Always nullable or with default (safe)
2. **Remove column**: Stop reading first, deploy, then drop (2-phase)
3. **Rename column**: Add new, dual-write, migrate reads, drop old (3-phase)
4. **Add index**: Use CONCURRENTLY flag (non-blocking)
5. **Change type**: Add new column, migrate data, swap reads, drop old

### Migration Ordering

```
Deploy phase 1: New code that writes to both old + new schema
Deploy phase 2: Migrate existing data in batches
Deploy phase 3: New code reads from new schema only
Deploy phase 4: Remove old column/table (cleanup)
```
