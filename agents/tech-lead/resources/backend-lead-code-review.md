# Backend Code Review Criteria

## Checklist

- [ ] All tactical acceptance criteria met
- [ ] API design follows RESTful/GraphQL best practices
- [ ] Input validation comprehensive
- [ ] Error handling robust (all edge cases)
- [ ] Database queries optimized (no N+1, proper indexing)
- [ ] Security best practices (no SQL injection, XSS, CSRF)
- [ ] Authentication/authorization correct
- [ ] Test coverage > 90% (unit + integration)
- [ ] API documentation complete
- [ ] Logging and monitoring instrumented
- [ ] Performance acceptable (response times, throughput)

## Cross-Domain Coordination

### API Contract with Frontend

- Define API contracts early
- Document request/response schemas
- Agree on error codes and messages
- Set up API documentation (Swagger/Postman)
- Deploy to staging for frontend integration

### Database Coordination with Data Lead

- Schema design collaboration
- Migration planning
- Query optimization assistance
- Performance monitoring

### Deployment Coordination with DevOps

- CI/CD pipeline setup
- Environment configuration
- Database migration automation
- Monitoring and alerting

## Escalation Rules

Escalate when:
- Backend utilization > 90% for > 2 days
- Both ICs oversubscribed
- Database-heavy work requires DBA assistance
- Architecture decisions needed
