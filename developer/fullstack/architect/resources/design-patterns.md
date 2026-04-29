# Architectural Design Patterns

Reference guide for common architecture patterns.

## System Architecture Patterns

### Microservices
- **When**: Large teams, independent deployment needed
- **Trade-offs**: Operational complexity, network latency
- **Pattern**: Domain-driven service boundaries

### Event-Driven
- **When**: Loose coupling, async processing
- **Trade-offs**: Eventual consistency, debugging complexity
- **Pattern**: Publish-subscribe, event sourcing

### Serverless
- **When**: Variable load, pay-per-use economics
- **Trade-offs**: Cold starts, vendor lock-in
- **Pattern**: Functions as a Service (FaaS)

### Clean/Hexagonal Architecture
- **When**: Business logic isolation, testability
- **Trade-offs**: Initial overhead, learning curve
- **Pattern**: Ports and adapters

## API Design Patterns

### REST
- **When**: Standard CRUD, broad compatibility
- **Best practices**: Resource naming, HTTP semantics, HATEOAS

### GraphQL
- **When**: Flexible queries, mobile clients
- **Trade-offs**: Caching complexity, N+1 queries

### gRPC
- **When**: Internal services, high performance
- **Trade-offs**: Browser support, debugging tools

## Data Patterns

### CQRS
- **When**: Read/write asymmetry, complex domains
- **Trade-offs**: Complexity, eventual consistency

### Event Sourcing
- **When**: Audit trail, temporal queries
- **Trade-offs**: Storage growth, query complexity

### Saga Pattern
- **When**: Distributed transactions
- **Trade-offs**: Compensation logic, complexity

## Resilience Patterns

### Circuit Breaker
- **When**: External service calls
- **Implementation**: Hystrix, Polly, custom

### Bulkhead
- **When**: Resource isolation needed
- **Implementation**: Thread pools, containers

### Retry with Backoff
- **When**: Transient failures expected
- **Implementation**: Exponential backoff, jitter
