# Deployment Checklist

Safety procedures for production deployments.

## Pre-Deployment Checklist

### Code Readiness
- [ ] Code reviewed and approved
- [ ] All tests passing in CI
- [ ] No critical security vulnerabilities
- [ ] Feature flags configured (if applicable)
- [ ] Database migrations reviewed

### Staging Validation
- [ ] Successfully deployed to staging
- [ ] QA sign-off received
- [ ] Performance tests completed
- [ ] Integration tests passing
- [ ] Smoke tests verified

### Infrastructure Readiness
- [ ] Sufficient capacity available
- [ ] No ongoing incidents
- [ ] Monitoring healthy
- [ ] Backup completed recently
- [ ] No conflicting deployments scheduled

### Rollback Preparation
- [ ] Rollback procedure documented
- [ ] Previous version artifact available
- [ ] Rollback tested in staging
- [ ] Database rollback plan (if migrations)
- [ ] Feature flag kill switch ready

### Communication
- [ ] Deployment window approved
- [ ] Team notified of deployment
- [ ] Status page updated (maintenance)
- [ ] Support team informed
- [ ] Stakeholders aware

## During Deployment

### Execution Steps
1. [ ] Announce deployment start in #deployments
2. [ ] Enable maintenance mode (if needed)
3. [ ] Execute deployment command/pipeline
4. [ ] Monitor deployment progress
5. [ ] Watch for errors in logs
6. [ ] Verify pods/instances healthy

### Health Checks
- [ ] Application responding to health endpoint
- [ ] Database connections successful
- [ ] External service connections healthy
- [ ] No error rate spike
- [ ] Latency within acceptable range

### Validation Tests
- [ ] Critical user flows working
- [ ] API endpoints responding correctly
- [ ] UI renders properly
- [ ] Authentication working
- [ ] Key features functional

## Post-Deployment

### Monitoring (First 30 Minutes)
- [ ] Error rates stable
- [ ] Latency stable
- [ ] CPU/Memory usage normal
- [ ] No unusual alerts
- [ ] User complaints checked

### Documentation
- [ ] Deployment logged with version
- [ ] Release notes updated
- [ ] Changelog updated
- [ ] Runbook updated (if changes)
- [ ] Status page updated (resolved)

### Communication
- [ ] Team notified of successful deployment
- [ ] Stakeholders informed
- [ ] Support team updated
- [ ] Close deployment ticket

## Rollback Procedure

### Triggers for Rollback
- Error rate exceeds threshold (e.g., >1%)
- Latency exceeds SLA (e.g., p99 > 2s)
- Critical feature broken
- Security vulnerability discovered
- Data integrity issues

### Rollback Steps
1. Announce rollback decision
2. Execute rollback command
3. Monitor rollback progress
4. Verify previous version healthy
5. Validate critical flows working
6. Document rollback reason
7. Create incident ticket for investigation

### Post-Rollback
- [ ] System stable on previous version
- [ ] Root cause investigation started
- [ ] Stakeholders notified
- [ ] Post-mortem scheduled

## Deployment Strategies

### Rolling Update
**Best for:** Standard deployments, zero downtime
```
Strategy:
- Replace pods gradually
- Old pods serve until new ready
- maxSurge: 1, maxUnavailable: 0
- Easy rollback
```

### Blue-Green
**Best for:** Major releases, instant rollback needed
```
Strategy:
- Two identical environments
- Deploy to inactive (green)
- Test green thoroughly
- Switch traffic instantly
- Keep blue ready for rollback
```

### Canary
**Best for:** High-risk changes, gradual rollout
```
Strategy:
- Deploy to small % of traffic (5-10%)
- Monitor for errors
- Gradually increase (25%, 50%, 100%)
- Fast rollback if issues
```

## Database Migration Safety

### Before Migration
- [ ] Backup database
- [ ] Test migration on staging
- [ ] Test rollback migration
- [ ] Estimate migration time
- [ ] Schedule maintenance window (if needed)

### Migration Best Practices
- Always use forward-compatible changes
- Add columns before code that uses them
- Remove columns after code stops using them
- Never rename columns (add new, migrate, remove old)
- Use online schema change tools for large tables

### After Migration
- [ ] Verify data integrity
- [ ] Check application working
- [ ] Monitor query performance
- [ ] Keep rollback script ready for 24h

## Emergency Deployment (Hotfix)

### When to Use
- Critical security vulnerability
- Production-breaking bug
- Data integrity issue
- P0 incident fix

### Abbreviated Checklist
- [ ] Fix reviewed by at least 1 engineer
- [ ] Unit tests for the fix
- [ ] Deploy to staging, quick smoke test
- [ ] Deploy to production
- [ ] Monitor for 15 minutes
- [ ] Full test suite can run post-deploy

### Post-Hotfix
- Document incident and fix
- Schedule full review
- Update tests to catch regression
- Consider rollback if issues persist
