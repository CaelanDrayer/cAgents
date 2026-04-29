# Best Practices: Architect

> Design principles, patterns, and frameworks that guide high-quality system design and architecture decision-making.

## Design Principles

- **Fitness for Purpose**: Architecture exists to serve business goals — every structural decision must map to a concrete requirement or constraint.
- **Evolutionary Design**: Prefer architectures that can change incrementally over "big bang" redesigns; optimize for replaceability of components.
- **Explicit Trade-offs**: No architecture is universally best — document the trade-offs of every significant decision and the context that made it the right choice.
- **Separation of Concerns**: Partition systems so that each module has one reason to change; coupling should be minimal and deliberate.
- **Failure as a First-Class Concern**: Design for failure modes first; assume network partitions, disk failures, and dependency outages will occur.
- **Boring Technology**: Prefer proven, well-understood technology over novel solutions; novelty introduces risk without guaranteed benefit.
- **Observability Built-In**: Architecture must make the system's runtime behavior visible — metrics, traces, and logs are structural requirements.

## Key Patterns & Frameworks

- **C4 Model**: Visualize architecture at four levels of abstraction (Context, Container, Component, Code) to communicate to different audiences.
- **Architecture Decision Records (ADRs)**: Lightweight documents capturing the context, decision, and consequences of significant architectural choices; use a template (Status/Context/Decision/Consequences).
- **Clean Architecture / Hexagonal Architecture**: Organize code so that business logic is at the center, independent of frameworks, databases, and delivery mechanisms; use ports (interfaces) and adapters (implementations).
- **Domain-Driven Design (DDD)**: Align software structure with business domain concepts; identify bounded contexts, aggregates, value objects, and domain events.
- **Event-Driven Architecture**: Decouple services via asynchronous events on a message bus; improves scalability but requires careful handling of ordering, idempotency, and eventual consistency.
- **CQRS (Command Query Responsibility Segregation)**: Separate read and write models to scale and optimize them independently; often paired with event sourcing.
- **Strangler Fig Pattern**: Incrementally replace a legacy system by routing traffic to a new system for specific paths, gradually expanding scope.
- **Saga Pattern**: Manage distributed transactions across services via a sequence of local transactions with compensating actions on failure.
- **API Gateway Pattern**: Centralize cross-cutting concerns (auth, rate limiting, routing) at the edge; enables independent service versioning.
- **Sidecar/Service Mesh**: Offload service-to-service communication concerns (mTLS, retries, circuit breaking) to a proxy sidecar (Envoy, Istio, Linkerd).
- **Bulkhead Pattern**: Isolate resources (thread pools, connection pools) per consumer to prevent a slow dependency from cascading failures.
- **Trade-off Analysis Matrix**: Evaluate options against weighted criteria (consistency, latency, cost, operational complexity) to make decisions defensible.

## Domain Concepts & Terminology

### System Quality Attributes
- **Scalability**: Ability to handle increasing load by adding resources (horizontal vs. vertical scaling)
- **Reliability**: Probability of correct operation over time; measured by MTBF, MTTR
- **Availability**: Percentage of time the system is operational; expressed as nines (99.9% = 8.7h downtime/year)
- **Consistency**: All nodes see the same data at the same time (strong) or eventually (eventual)
- **Durability**: Data survives failures (measured by RPO — Recovery Point Objective)
- **Latency**: Time to complete a single operation (P50, P95, P99 percentiles matter more than average)
- **Throughput**: Operations per unit time (RPS, TPS)

### Distributed Systems
- **CAP Theorem**: In a distributed system, you can only guarantee two of Consistency, Availability, Partition Tolerance
- **BASE**: Basically Available, Soft state, Eventually consistent — the alternative to ACID in distributed systems
- **Idempotency**: An operation that produces the same result regardless of how many times it is applied
- **Exactly-Once Semantics**: Guarantee a message is processed exactly once (typically expensive to achieve)
- **Circuit Breaker**: Stops calls to a failing service to allow recovery, then gradually re-enables traffic

### API Design
- **REST Maturity Model**: Richardson Maturity Model levels 0-3 (Level 3 = HATEOAS)
- **OpenAPI Specification**: Standard for describing REST APIs; enables code generation and documentation
- **GraphQL**: Query language for APIs that lets clients request exactly the data they need
- **gRPC**: High-performance RPC framework using Protocol Buffers; ideal for internal service communication
- **API Versioning**: URL versioning (`/v1/`), header versioning (`Accept: application/vnd.api+json;version=1`), or content negotiation

### Architectural Patterns
- **Microservices**: Small, independently deployable services organized around business capabilities
- **Monolith**: Single deployable unit; appropriate for small teams and early-stage products
- **Modular Monolith**: Monolith with strong internal module boundaries; easier to split later
- **Serverless**: Functions-as-a-Service; eliminates server management but adds cold start latency

## Anti-Patterns to Avoid

- **Distributed Monolith**: Splitting a monolith into services that are still tightly coupled — you pay the operational cost of microservices without the benefits.
- **Resume-Driven Architecture**: Choosing technology because it is exciting or fashionable rather than because it solves a real problem.
- **Big Ball of Mud**: Allowing architecture to drift toward an undifferentiated tangle of dependencies with no enforced boundaries.
- **Premature Optimization**: Over-engineering for scale or performance before measuring actual bottlenecks; YAGNI applies to architecture too.
- **God Service**: A service that knows too much and does too much — violates the single responsibility principle at the service level.
- **Synchronous Coupling Everywhere**: Building synchronous request-response chains across many services; a single slow dependency stalls the whole chain.
- **Missing ADRs**: Making significant architectural changes without recording the rationale, leaving future teams without the context to evaluate or change decisions.

## Quality Indicators

- **Low Coupling, High Cohesion**: Changes in one module rarely require changes in others; related behavior is co-located.
- **ADRs Are Current**: Every significant decision from the past 6 months has a corresponding ADR in the repository.
- **Fitness Functions Pass**: Automated architecture tests (ArchUnit, Deptrac) enforce structural constraints in CI.
- **Single Deployment Boundary per Team**: Each team owns a clear boundary — services, modules, or domains — without shared ownership ambiguity.
- **P99 Latency Under SLO**: Critical paths meet their latency SLOs under realistic load based on load tests.
- **Independent Deployability**: Any service can be deployed or rolled back without coordinating with other service deployments.
- **Runbook Coverage**: Every non-trivial failure mode has a runbook; no "tribal knowledge" required to diagnose an outage.

## Collaboration Touchpoints

- **With Engineering Manager**: Provide architecture options with explicit trade-offs and business impact assessments so go/no-go decisions have clear context.
- **With Backend Developer**: Translate architectural patterns (ports & adapters, event sourcing) into concrete implementation guidelines and reference implementations.
- **With Security Lead**: Review every architectural boundary for trust zone transitions; define where authentication, authorization, and encryption must occur.
- **With DevOps Lead**: Ensure architecture decisions account for deployment topology, infrastructure cost, and operational observability from day one.
- **With Tech Lead**: Align on ADR process and fitness function enforcement so architectural standards are maintained as the codebase evolves.
