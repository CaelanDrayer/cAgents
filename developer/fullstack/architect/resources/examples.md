# Architecture Examples

Reference examples for common architectural decisions and patterns.

## Example 1: Authentication System Design

**Request**: "Design authentication for a multi-tenant SaaS application"

**Architecture Decision**:
- JWT with refresh tokens for stateless API auth
- OAuth2/OIDC for third-party SSO
- Per-tenant isolation via tenant ID in JWT claims
- Redis for token blacklist and rate limiting

**Key Trade-offs**:
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Session-based | Simple, easy revocation | Stateful, scaling issues | Rejected |
| JWT only | Stateless, scalable | Can't revoke easily | Partial |
| JWT + refresh | Stateless + revocable | More complexity | Selected |

**ADR Reference**: See @resources/adr-template.md for documenting this decision.

## Example 2: Event-Driven Order Processing

**Request**: "Design order processing for high-volume e-commerce"

**Architecture**:
```
[API Gateway] -> [Order Service] -> [Message Queue]
                                        |
                    +-------------------+-------------------+
                    |                   |                   |
              [Payment Service]  [Inventory Service]  [Notification Service]
                    |                   |                   |
              [Payment DB]       [Inventory DB]       [Email/SMS Provider]
```

**Pattern Selection**:
- Saga pattern for distributed transactions (choreography-based)
- Event sourcing for order state (audit trail, replay capability)
- CQRS for read-heavy product catalog vs. write-heavy order flow

**Failure Handling**:
- Compensating transactions for payment failures
- Dead letter queue for unprocessable events
- Circuit breaker on external payment gateway

## Example 3: Microservices Migration

**Request**: "Break monolith into microservices"

**Strangler Fig Approach**:
1. Identify bounded contexts via domain analysis
2. Extract one service at a time (start with least coupled)
3. Route traffic through facade/proxy
4. Gradually shift traffic to new service
5. Deprecate monolith component when fully migrated

**Service Boundaries**:
| Service | Responsibility | Data Store | Communication |
|---------|---------------|------------|---------------|
| User | Auth, profiles | PostgreSQL | Sync (REST) |
| Product | Catalog, search | PostgreSQL + Elasticsearch | Sync (REST) |
| Order | Order lifecycle | PostgreSQL | Async (events) |
| Payment | Transactions | PostgreSQL | Async (events) |
| Notification | Email, SMS, push | Redis | Async (events) |

## Example 4: API Gateway Design

**Request**: "Design API gateway for mobile and web clients"

**BFF Pattern** (Backend for Frontend):
```
[Mobile App] -> [Mobile BFF] -> [Services]
[Web App]    -> [Web BFF]    -> [Services]
[Admin]      -> [Admin BFF]  -> [Services]
```

**Gateway Responsibilities**:
- Authentication/authorization
- Rate limiting (per client, per user, per endpoint)
- Request/response transformation
- Caching (CDN for static, in-memory for dynamic)
- Circuit breaking and retry logic
- Request aggregation (combine multiple service calls)

## Example 5: Database Scaling Decision

**Request**: "Database is hitting performance limits at 10M rows"

**Decision Tree**:
1. **Read-heavy?** -> Add read replicas, caching layer
2. **Write-heavy?** -> Vertical scaling first, then sharding
3. **Both?** -> CQRS with separate read/write stores
4. **Complex queries?** -> Materialized views, denormalization
5. **Full-text search?** -> Elasticsearch alongside primary DB

**Sharding Strategy Selected**: Hash-based on tenant_id
- Even distribution across shards
- All tenant data co-located (no cross-shard joins needed)
- Consistent hashing for adding shards without full redistribution
