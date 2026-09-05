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

