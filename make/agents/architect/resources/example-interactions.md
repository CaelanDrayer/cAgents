# Architect Example Interactions

Detailed examples of architect workflows for different architectural tasks.

## Example 1: Design Microservices Architecture for E-Commerce Platform

**Request**: "Design a microservices architecture for the e-commerce platform"

**Architect Actions**:
1. ✅ Understand requirements:
   - Functional: Product catalog, shopping cart, checkout, payments, order management, inventory
   - Non-functional: 10k concurrent users, 99.9% uptime, PCI compliance, global deployment
2. ✅ Analyze existing: Currently monolithic Rails app, PostgreSQL database, all-in-one deployment
3. ✅ Explore options:
   - Option 1: Strangler Fig migration (incremental microservices extraction)
   - Option 2: Big Bang rewrite (build new microservices, migrate data)
   - Option 3: Hybrid (extract high-change services first, keep stable services in monolith)
4. ✅ Assess trade-offs:
   - Option 1: Lower risk, gradual migration, longer timeline (6 months)
   - Option 2: High risk, faster if successful, 3 months but could fail catastrophically
   - Option 3: Balanced risk, focus on high-value services, 4 months
5. ✅ Consult Security: "Payment service isolation is critical for PCI compliance" → Option 1 or 3
6. ✅ Select Option 3 (Hybrid): Extract payments and inventory first (high change rate, compliance), keep product catalog in monolith temporarily
7. ✅ Document ADR: Strangler fig hybrid approach, payment/inventory → microservices, catalog remains monolith
8. ✅ Create design artifacts: C4 diagram (context, container, component), API contracts for new services, event schema
9. ✅ Review with Tech Lead: "Team has Node.js experience, migration plan is feasible"
10. ✅ Update knowledge: Record microservice boundaries and communication patterns

**Outcome**: Hybrid architecture designed, payment/inventory services extracted first, catalog migration deferred, gradual migration path established.

---

## Example 2: Create API Contract for User Authentication Service

**Request**: "Create an API contract for the user authentication service"

**Architect Actions**:
1. ✅ Understand requirements: User registration, login, logout, password reset, OAuth2 social login (Google, GitHub)
2. ✅ Analyze existing: No existing auth system, greenfield design
3. ✅ Explore options:
   - Option 1: RESTful API with JWT tokens
   - Option 2: OAuth2 server with authorization code flow
   - Option 3: Hybrid (REST for basic auth, OAuth2 for social login)
4. ✅ Assess trade-offs:
   - Option 1: Simple, stateless, but JWT revocation is difficult
   - Option 2: Full OAuth2 spec compliance, complex implementation
   - Option 3: Pragmatic balance, familiar REST patterns + OAuth2 for social
5. ✅ Consult Security: "JWT is acceptable if we implement short expiry (15min) + refresh tokens"
6. ✅ Select Option 3: REST endpoints for registration/login + OAuth2 for social providers
7. ✅ Document ADR: REST + OAuth2 hybrid approach, JWT access tokens (15min), refresh tokens (30 days), secure httpOnly cookies
8. ✅ Create OpenAPI spec:
   ```yaml
   /api/v1/auth/register: POST (email, password) → {user, access_token, refresh_token}
   /api/v1/auth/login: POST (email, password) → {access_token, refresh_token}
   /api/v1/auth/logout: POST (refresh_token) → 204 No Content
   /api/v1/auth/refresh: POST (refresh_token) → {access_token}
   /api/v1/auth/oauth/google: GET → redirect to Google
   /api/v1/auth/oauth/callback: GET (code) → {access_token, refresh_token}
   ```
9. ✅ Review with Security and Backend Dev: Security approves token expiry, Backend Dev confirms feasibility
10. ✅ Update knowledge: Record OAuth2 integration pattern for future services

**Outcome**: Complete API contract with 6 endpoints, JWT + refresh token strategy, OpenAPI spec ready for implementation.

---

## Example 3: Evaluate Database Options for High-Write Analytics System

**Request**: "Evaluate database options for a high-write analytics system (100k events/second)"

**Architect Actions**:
1. ✅ Understand requirements:
   - Writes: 100k events/second (864M/day)
   - Reads: Time-series queries, aggregations by day/hour
   - Retention: 90 days hot, 2 years cold
   - Query latency: <1s for aggregations
2. ✅ Analyze existing: Currently using PostgreSQL, struggling at 10k events/second
3. ✅ Explore options:
   - Option 1: Time-series database (InfluxDB, TimescaleDB)
   - Option 2: Column-family store (Cassandra, ScyllaDB)
   - Option 3: Distributed log + stream processing (Kafka + ClickHouse)
4. ✅ Assess trade-offs:
   - Option 1: Purpose-built for time-series, but InfluxDB has clustering limits at this scale
   - Option 2: Horizontally scalable, proven at scale, but query complexity is higher
   - Option 3: Best write performance (Kafka), ClickHouse excellent for OLAP queries
5. ✅ Consult Tech Lead: "Team has limited Kafka experience, training needed"
6. ✅ Select Option 3: Kafka for event ingestion (proven at 100k+/sec), ClickHouse for analytics (optimized for aggregations)
7. ✅ Document ADR: Kafka + ClickHouse architecture, Kafka handles writes, ClickHouse materialized views for aggregations
8. ✅ Create design artifacts: Data flow diagram (events → Kafka → ClickHouse), partitioning strategy (by date), retention policy (90d hot, 2y S3 cold)
9. ✅ Review with SysAdmin and Backend Dev: SysAdmin confirms Kafka operations, Backend Dev confirms consumer pattern
10. ✅ Update knowledge: Record Kafka + ClickHouse pattern for high-write analytics

**Outcome**: Kafka + ClickHouse selected, handles 100k writes/sec, sub-second query latency, team training plan created.

---

## Example 4: Design Caching Strategy to Reduce Database Load by 80%

**Request**: "Design a caching strategy to reduce database load by 80%"

**Architect Actions**:
1. ✅ Understand current state: Database CPU at 90%, 10k requests/second, 80% read traffic, hot data is user profiles and product catalog
2. ✅ Analyze query patterns: 60% user profile lookups (by user_id), 20% product catalog (by product_id), 20% complex queries
3. ✅ Explore caching options:
   - Option 1: Application-level cache (Redis) for user profiles and products
   - Option 2: Database query cache + CDN for static content
   - Option 3: Multi-tier caching (L1: in-memory, L2: Redis, L3: CDN)
4. ✅ Assess trade-offs:
   - Option 1: Simple, effective for key-value lookups, reduces DB load significantly
   - Option 2: Database query cache is limited, CDN only helps static assets
   - Option 3: Maximum performance, but adds complexity (cache invalidation across 3 tiers)
5. ✅ Consult Tech Lead: "Redis is already in use for sessions, can extend for caching"
6. ✅ Select Option 1: Redis cache for user profiles (1h TTL) and product catalog (24h TTL)
7. ✅ Document ADR: Cache-aside pattern, Redis for hot data, write-through for user profile updates, cache warming for product catalog
8. ✅ Create design artifacts:
   - Cache key patterns: `user:{user_id}`, `product:{product_id}`
   - TTL strategy: User profiles (1h), Products (24h), invalidate on update
   - Cache warming: Preload top 1000 products at startup
9. ✅ Review with Backend Dev: "Cache-aside pattern is straightforward, we can implement in 2 days"
10. ✅ Estimate impact: 60% (user profiles) + 20% (products) = 80% of reads cached → 80% DB load reduction ✅

**Outcome**: Redis caching strategy designed, 80% database load reduction achieved, cache-aside pattern with TTL-based invalidation.

---

## Example 5: Plan Migration from Monolith to Microservices

**Request**: "Plan the migration from monolith to microservices architecture"

**Architect Actions**:
1. ✅ Understand monolith: Ruby on Rails app, 200k LOC, 15 database tables, auth + products + orders + payments + notifications
2. ✅ Analyze pain points: Deployments risky (all-or-nothing), scaling inefficient (entire app must scale), slow release cycle
3. ✅ Explore migration strategies:
   - Option 1: Strangler Fig (gradually extract services, run in parallel with monolith)
   - Option 2: Big Bang (rewrite everything, switch over)
   - Option 3: Extract-and-isolate (extract to libraries first, then services later)
4. ✅ Assess trade-offs:
   - Option 1: Lowest risk, incremental value, but long migration timeline (12-18 months)
   - Option 2: Highest risk, could fail completely, but fast if successful (3-6 months)
   - Option 3: Medium risk, improves monolith first, then easier service extraction (9-12 months)
5. ✅ Consult Tech Lead: "Team prefers low-risk incremental approach, we've had failed rewrites before"
6. ✅ Select Option 1: Strangler Fig migration, extract services one at a time
7. ✅ Document ADR: Strangler Fig pattern, extract based on business capability, prioritize high-change/independent services first
8. ✅ Create migration plan:
   - Phase 1 (Months 1-3): Extract Notifications service (independent, high-change)
   - Phase 2 (Months 4-6): Extract Payments service (PCI compliance, security isolation)
   - Phase 3 (Months 7-9): Extract Orders service (business critical, moderate coupling)
   - Phase 4 (Months 10-12): Extract Products service (high read traffic, cache-friendly)
   - Phase 5 (Months 13-18): Decompose Auth or keep in monolith (decision deferred)
9. ✅ Review with Tech Lead and Product Owner: Timeline approved, phased approach reduces risk
10. ✅ Update knowledge: Record strangler fig migration pattern and service extraction criteria

**Outcome**: 18-month migration plan, services extracted in business value order, strangler fig pattern minimizes risk.

---

## Example 6: Review Proposed Event-Driven Architecture for Order Processing

**Request**: "Review the proposed event-driven architecture for order processing"

**Proposed Design**: Kafka for events, OrderCreated → InventoryReserved → PaymentProcessed → OrderFulfilled

**Architect Actions**:
1. ✅ Understand requirements: Order creation, inventory reservation, payment processing, fulfillment coordination
2. ✅ Review proposed design:
   - Events: OrderCreated, InventoryReserved, PaymentProcessed, OrderFulfilled
   - Consumers: Inventory Service, Payment Service, Fulfillment Service
   - Pattern: Saga (orchestrated vs choreographed?)
3. ✅ Identify issues:
   - ⚠️ No error handling: What if payment fails after inventory reserved?
   - ⚠️ No idempotency: Events could be processed multiple times
   - ⚠️ No compensation: How do we undo inventory reservation if payment fails?
4. ✅ Assess saga pattern: Choreographed saga (event-driven) vs Orchestrated saga (coordinator)
   - Current design is choreographed (each service publishes next event)
   - Risk: Distributed state management is complex, hard to debug
5. ✅ Consult Tech Lead: "Team is new to event-driven architecture, need something maintainable"
6. ✅ Recommend improvements:
   - Add compensation events: InventoryReleased, PaymentRefunded
   - Implement idempotency keys in event headers
   - Consider orchestrated saga with Order Coordinator Service for better observability
   - Add dead letter queues for failed events
7. ✅ Document architectural review:
   - **Approve with changes**: Event-driven approach is sound, but needs error handling and compensation
   - **Required changes**: Idempotency, compensation events, DLQ, timeout handling
   - **Recommendation**: Start with orchestrated saga for better debugging, move to choreographed later if needed
8. ✅ Create refined design:
   - Order Coordinator service manages saga state machine
   - Sends commands to services (ReserveInventory, ProcessPayment, FulfillOrder)
   - Receives events (InventoryReserved/Failed, PaymentProcessed/Failed)
   - Implements compensation logic (ReleaseInventory, RefundPayment)
9. ✅ Review with Senior Developer: "Orchestrated saga is clearer to implement and debug, approved"
10. ✅ Update knowledge: Record orchestrated saga pattern for future distributed transactions

**Outcome**: Design approved with changes, orchestrated saga recommended for better maintainability, compensation logic added.

---

## Example 7: Design Integration Pattern for Third-Party Payment Providers

**Request**: "Design an integration pattern for third-party payment providers (Stripe, PayPal, Square)"

**Architect Actions**:
1. ✅ Understand requirements: Support multiple payment providers, switch providers without code changes, handle different APIs
2. ✅ Analyze provider APIs: Stripe (REST), PayPal (REST + SDK), Square (REST), each has different authentication and webhooks
3. ✅ Explore integration patterns:
   - Option 1: Adapter pattern (one adapter per provider)
   - Option 2: Strategy pattern (pluggable payment strategies)
   - Option 3: Anti-corruption layer with unified internal API
4. ✅ Assess trade-offs:
   - Option 1: Simple, straightforward, but coupled to provider APIs
   - Option 2: Flexible, runtime selection, but complex configuration
   - Option 3: Best isolation, internal API stable, but requires translation layer
5. ✅ Consult Senior Developer: "Adapter pattern is familiar, we've used it before"
6. ✅ Select Option 3: Anti-corruption layer with adapter pattern per provider
7. ✅ Document ADR: Anti-corruption layer isolates internal code from provider changes, adapters translate unified API to provider-specific calls
8. ✅ Create design artifacts:
   ```typescript
   // Unified internal API
   interface PaymentProvider {
     createPayment(amount, currency): Promise<PaymentResult>
     refund(paymentId, amount): Promise<RefundResult>
     getStatus(paymentId): Promise<PaymentStatus>
   }

   // Adapters
   class StripeAdapter implements PaymentProvider { ... }
   class PayPalAdapter implements PaymentProvider { ... }
   class SquareAdapter implements PaymentProvider { ... }

   // Factory
   class PaymentProviderFactory {
     getProvider(name: 'stripe' | 'paypal' | 'square'): PaymentProvider
   }
   ```
9. ✅ Review with Backend Dev and Security: Backend approves design, Security requests encryption for stored credentials
10. ✅ Update knowledge: Record payment provider integration pattern (anti-corruption layer + adapter)

**Outcome**: Anti-corruption layer design, adapters for 3 providers, unified internal API isolates provider-specific details.

---

## Example 8: Create Scalability Plan for 10x Traffic Growth

**Request**: "Create a scalability plan for handling 10x traffic growth (from 1k to 10k req/sec)"

**Architect Actions**:
1. ✅ Understand current architecture: 3 app servers, 1 database (PostgreSQL), 1 Redis cache, load balancer
2. ✅ Analyze bottlenecks:
   - Database: CPU at 60%, can handle ~5k req/sec before saturation
   - App servers: CPU at 40%, can scale horizontally
   - Redis: Not a bottleneck
3. ✅ Explore scalability options:
   - Horizontal scaling: Add more app servers (easy, proven)
   - Database read replicas: Offload reads to replicas (80% of traffic is reads)
   - Database sharding: Partition data across multiple databases (complex, only if needed)
   - Caching: Increase cache hit rate (currently 70%, target 90%)
4. ✅ Assess trade-offs:
   - Horizontal scaling: Easy, cost scales linearly, solves app server capacity
   - Read replicas: Reduces DB load for reads, adds replication lag complexity
   - Sharding: High complexity, avoid unless absolutely necessary
   - Caching: High ROI, reduces DB load significantly
5. ✅ Consult Tech Lead: "Budget allows for 10 app servers + 2 read replicas"
6. ✅ Create scalability plan:
   - **Phase 1** (Immediate): Increase cache hit rate from 70% to 90% (cache warming, longer TTLs) → 3k req/sec
   - **Phase 2** (Month 1): Add 2 PostgreSQL read replicas, route reads to replicas → 6k req/sec
   - **Phase 3** (Month 2): Add 7 app servers (3 → 10 total) → 10k req/sec
   - **Phase 4** (Future): If growth continues, consider database sharding or migration to cloud-native DB
7. ✅ Document ADR: Horizontal scaling + read replicas + caching improvements, avoid premature sharding
8. ✅ Create capacity plan:
   - Target: 10k req/sec sustained, 15k req/sec peak (50% headroom)
   - App servers: 10 @ 1k req/sec each
   - Database: 1 primary (writes) + 2 replicas (reads split across 2)
   - Cache: Increase Redis memory from 4GB to 16GB (larger working set)
9. ✅ Review with SysAdmin and Tech Lead: Infrastructure approved, cost within budget
10. ✅ Update knowledge: Record horizontal scaling pattern and capacity planning approach

**Outcome**: 3-phase scalability plan designed, achieves 10k req/sec with 50% headroom, avoids premature optimization.

---

## Example 9: Design Multi-Tenant SaaS Architecture

**Request**: "Design a multi-tenant SaaS architecture for our project management tool"

**Architect Actions**:
1. ✅ Understand requirements:
   - Tenants: 1000+ customers, 10-10,000 users per tenant
   - Isolation: Data must be completely isolated per tenant
   - Customization: Each tenant can customize workflows
   - Compliance: Some tenants require data residency (EU, US)
2. ✅ Analyze multi-tenancy options:
   - Option 1: Shared database, shared schema (tenant_id column on every table)
   - Option 2: Shared database, schema per tenant (PostgreSQL schemas)
   - Option 3: Database per tenant (full isolation)
3. ✅ Assess trade-offs:
   - Option 1: Highest density, lowest cost, but security risk (one SQL injection compromises all tenants)
   - Option 2: Good balance, logical isolation, migrations complex (N schemas)
   - Option 3: Best isolation, easy to move tenants, but highest operational cost
4. ✅ Consult Security: "Regulated customers (healthcare, finance) need database-level isolation"
5. ✅ Consult Tech Lead: "We have 50 large enterprise customers, 950 SMB customers"
6. ✅ Select Hybrid approach:
   - Enterprise tier (50 customers): Database per tenant (Option 3) → full isolation, dedicated resources
   - SMB tier (950 customers): Shared database with schema per tenant (Option 2) → cost-effective, good isolation
7. ✅ Document ADR: Hybrid multi-tenancy, tier-based isolation, enterprise → dedicated DB, SMB → shared DB with schema isolation
8. ✅ Create design artifacts:
   - Tenant routing: Subdomain-based routing (customer1.app.com → tenant1 DB)
   - Schema naming: `tenant_{tenant_id}` for SMB tier
   - Migration strategy: Database migration runs once per SMB tenant schema, per enterprise DB
   - Data residency: Separate database clusters for EU and US regions
9. ✅ Review with Tech Lead and Compliance: Isolation strategy meets compliance requirements
10. ✅ Update knowledge: Record hybrid multi-tenancy pattern and tier-based isolation

**Outcome**: Hybrid multi-tenancy architecture, enterprise tier gets dedicated databases, SMB tier shares with schema isolation.

---

## Example 10: Evaluate Service Mesh vs Traditional Load Balancing

**Request**: "Should we adopt a service mesh (Istio) or stick with traditional load balancing?"

**Architect Actions**:
1. ✅ Understand current state: Kubernetes cluster, 15 microservices, traditional Kubernetes services + Ingress
2. ✅ Analyze pain points: No distributed tracing, manual retry/timeout configuration, difficult to implement canary deployments
3. ✅ Explore options:
   - Option 1: Add Istio service mesh (full observability, traffic management, security)
   - Option 2: Stick with traditional load balancing + add APM tool (DataDog, New Relic)
   - Option 3: Lightweight service mesh (Linkerd, smaller footprint than Istio)
4. ✅ Assess trade-offs:
   - Option 1: Best features (mTLS, traffic splitting, observability), but high complexity and resource overhead
   - Option 2: Simple, familiar, but requires custom code for retries/timeouts/circuit breakers
   - Option 3: Middle ground, easier than Istio, but fewer features
5. ✅ Consult Tech Lead: "Team has limited Kubernetes experience, concerned about Istio complexity"
6. ✅ Consult SysAdmin: "Istio adds 200MB memory overhead per pod, costs $5k/month in extra resources"
7. ✅ Decision: Option 2 for now (traditional + APM), revisit service mesh when team has more Kubernetes experience
8. ✅ Rationale: Team not ready for service mesh complexity, APM tool (DataDog) provides observability without operational overhead, can adopt service mesh in 6-12 months when team is more mature
9. ✅ Document ADR: Defer service mesh adoption, use DataDog APM for observability, implement circuit breakers in application code for now
10. ✅ Update knowledge: Record service mesh evaluation criteria and adoption readiness factors

**Outcome**: Service mesh deferred, team not ready for operational complexity, APM tool selected for immediate observability needs.
