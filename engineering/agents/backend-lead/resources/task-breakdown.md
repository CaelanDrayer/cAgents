# Tactical Task Breakdown

## Backend Task Categories

- API development (REST, GraphQL, WebSocket)
- Database operations (schema, migrations, queries)
- Microservices development
- Backend security (auth, authz, encryption)
- Performance optimization
- Integration with external services

## Tactical Breakdown Example

**Strategic Task**: "Implement authentication API with JWT"

**Tactical Tasks**:
- TT2.1: Implement POST /auth/login endpoint (4h, backend-developer)
- TT2.2: Implement POST /auth/logout endpoint (2h, backend-developer)
- TT2.3: Implement JWT middleware for route protection (6h, senior-developer)
- TT2.4: Implement token refresh mechanism (4h, senior-developer)
- TT2.5: Add rate limiting to auth endpoints (2h, backend-developer)
- TT2.6: Write integration tests for auth flow (4h, backend-developer)

## Skill Matrix

```yaml
backend-developer:
  python: advanced
  nodejs: expert
  sql: advanced
  api_design: advanced
  security: intermediate

senior-developer:
  python: expert
  nodejs: expert
  sql: expert
  api_design: expert
  security: expert
  architecture: expert
```

## Capacity Management

```yaml
domain: backend
total_capacity: 16h_per_day  # 2 ICs
utilization_threshold:
  ideal: 75%
  warning: 85%
  critical: 95%
```
