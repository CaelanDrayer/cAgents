# Best Practices: Backend Developer

> Design principles, patterns, and frameworks that guide high-quality server-side development work.

## Design Principles

- **API as Contract**: Treat every public API endpoint as a versioned contract with consumers — breaking changes require versioning, not silent modification.
- **Defense in Depth**: Validate input at every system boundary, never trust data from external sources, and apply authorization checks in the business layer — not only at the routing layer.
- **Fail Fast and Loudly**: Return meaningful error responses with specific codes and messages; log the full stack trace server-side while returning safe summaries to clients.
- **Idempotency by Default**: Design mutating operations so they can be safely retried without unintended side effects — especially for payment and event-driven flows.
- **Data Consistency over Convenience**: Prefer explicit transactions and constraint enforcement at the database level over application-level workarounds.
- **Observability First**: Every request must generate a trace ID, structured log entries at key decision points, and metrics for latency and error rate.
- **Minimize Shared Mutable State**: Shared state across requests is a source of race conditions — use per-request context, database transactions, or distributed locks when sharing is necessary.

## Key Patterns & Frameworks

- **Repository Pattern**: Abstract data access behind an interface so business logic is independent of the database technology; enables clean testing with in-memory fakes.
- **Service Layer Pattern**: Encapsulate business logic in services that coordinate repositories and external dependencies; keep controllers thin.
- **Middleware Chain**: Compose cross-cutting concerns (auth, logging, rate limiting, request ID injection) as middleware that wraps handlers.
- **Circuit Breaker**: Stop cascading failures by failing fast when a dependency exceeds error or latency thresholds; use libraries like `opossum` (Node.js) or `resilience4j` (Java).
- **Retry with Exponential Backoff**: Retry transient failures with increasing delays and jitter; always set a maximum retry count and timeout.
- **Outbox Pattern**: Ensure database writes and event publishes are atomic by writing events to an outbox table in the same transaction, then relaying them asynchronously.
- **Pagination Patterns**: Use cursor-based pagination for stable large dataset traversal; avoid offset pagination on large tables due to performance degradation.
- **Rate Limiting**: Apply token bucket or sliding window rate limiting per client identity; return `429 Too Many Requests` with `Retry-After` headers.
- **Structured Error Responses**: Use RFC 7807 Problem Details format for consistent error responses across all endpoints.
- **Database Migration Strategy**: Use versioned migration tools (Flyway, Alembic, Drizzle) and always include both up and down migrations.
- **Health Check Endpoints**: Expose `/health/live` (process is running) and `/health/ready` (dependencies are reachable) separately for orchestrators.

## Domain Concepts & Terminology

### API Design
- **REST**: Representational State Transfer — stateless, resource-based HTTP API design
- **HTTP Methods Semantics**: GET (safe, idempotent), POST (non-idempotent create), PUT (idempotent replace), PATCH (partial update), DELETE (idempotent)
- **Status Codes**: 2xx (success), 4xx (client error), 5xx (server error) — use specific codes (201 Created, 409 Conflict, 422 Unprocessable Entity)
- **Content Negotiation**: `Accept` and `Content-Type` headers for format negotiation (JSON, XML, MessagePack)
- **HATEOAS**: Hypermedia as the Engine of Application State — links to related actions in responses (Level 3 REST)
- **GraphQL**: Query language allowing clients to specify exactly which fields they need; reduces over-fetching

### Authentication & Authorization
- **JWT (JSON Web Token)**: Signed token carrying claims; verify signature and expiry on every request
- **OAuth 2.0**: Delegation protocol for third-party authorization; authorization code flow for web apps, client credentials for service-to-service
- **RBAC**: Role-Based Access Control — permissions assigned to roles, roles assigned to users
- **ABAC**: Attribute-Based Access Control — fine-grained policies based on user, resource, and environment attributes
- **API Key**: Simple shared secret for service-to-service auth; rotate regularly and store hashed

### Database & ORM
- **N+1 Query Problem**: Loading a collection then issuing one query per item — always eager-load with joins or use DataLoader batching
- **Connection Pool**: Reuse database connections across requests; size pool to match database connection limits
- **Transaction Isolation Level**: Read Committed (default), Repeatable Read, Serializable — choose based on consistency requirements
- **Optimistic Locking**: Detect concurrent modifications via version column or ETag; retry on conflict
- **Pessimistic Locking**: `SELECT FOR UPDATE` — serialize access to rows; use sparingly to avoid contention

### Performance
- **Caching Strategies**: Cache-aside (application manages), write-through (cache on write), write-behind (async write), read-through (cache fills on miss)
- **CDN**: Content Delivery Network — cache static assets and API responses at edge locations
- **Connection Pooling**: Reuse expensive connections (DB, HTTP) rather than creating per-request
- **Async I/O**: Non-blocking I/O for high-throughput servers (Node.js event loop, Python asyncio, Go goroutines)

### Error Handling
- **Panic vs. Error**: Distinguish programmer errors (should crash) from operational errors (should return error response)
- **Dead Letter Queue**: Messages that cannot be processed after max retries; inspect and reprocess manually

## Anti-Patterns to Avoid

- **God Endpoint**: A single endpoint that accepts arbitrary actions via a `type` field — breaks REST semantics and makes authorization logic unmanageable.
- **Business Logic in Controllers**: Putting validation, calculation, and orchestration directly in route handlers — makes the logic untestable and the controller bloated.
- **Raw SQL Concatenation**: Building SQL queries via string interpolation — always use parameterized queries or query builders to prevent SQL injection.
- **Synchronous Calls Everywhere**: Building deep chains of synchronous service calls — increases latency, reduces availability, and creates distributed deadlocks.
- **Catching All Exceptions Silently**: `catch (err) {}` swallows errors without logging — always log and re-throw or handle explicitly.
- **Missing Idempotency Keys**: Payment, email, and notification endpoints that lack idempotency keys cause duplicate charges and emails on client retries.
- **Hardcoded Secrets**: Embedding API keys, passwords, or tokens in source code — always use environment variables or a secrets manager.

## Quality Indicators

- **Zero Hardcoded Secrets**: Running `git-secrets` or `truffleHog` in CI returns zero findings.
- **All Inputs Validated**: Every request body and query parameter passes explicit schema validation before processing.
- **P99 Latency Under SLO**: Key endpoints meet their latency SLOs under production-representative load.
- **Error Rate < 0.1%**: HTTP 5xx error rate is below threshold on healthy traffic (measured in observability dashboard).
- **Test Coverage ≥ 80% for Business Logic**: Core service layer and domain logic have high unit test coverage.
- **No N+1 Queries**: Database query logs show no repeated single-row fetches where a join or batch would suffice.
- **All Migrations Are Reversible**: Every migration file has a working down migration that restores the previous schema state.

## Collaboration Touchpoints

- **With Frontend Developer**: Define API contracts (OpenAPI spec) before implementation begins; agree on error response format and pagination strategy together.
- **With DBA**: Review query plans for any new query that joins more than two tables or returns more than 1,000 rows; collaborate on index design.
- **With Security Engineer**: Get security review on authentication flows, authorization checks, and any endpoint that handles sensitive data.
- **With QA Lead**: Provide a list of edge cases (empty inputs, concurrent requests, auth boundary cases) so QA can build targeted test scenarios.
