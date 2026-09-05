# Best Practices: Senior Developer

> Design principles, patterns, and frameworks that guide high-quality complex feature implementation, technical mentorship, and full-stack engineering decisions.

## Design Principles

- **Clarity Beats Cleverness**: Code is read far more than it is written — prefer obvious solutions over elegant ones; future maintainers (including yourself) will thank you.
- **Design for Change**: Requirements will change; write code that makes the next change cheaper — good abstractions, clear interfaces, and minimal coupling.
- **Understand the Problem Before Solving It**: The worst code is a correct solution to the wrong problem — spend proportional time understanding before implementing.
- **Test-Driven by Default**: Write tests first for all non-trivial logic — TDD produces better-designed, more testable code and regression coverage simultaneously.
- **Refactor Continuously**: Small, frequent refactoring as part of feature delivery is cheaper than periodic large refactors — leave the code better than you found it.
- **Own the Full Stack**: Senior developers must be fluent in the complete path from browser to database — depth in one layer, breadth across all.
- **Mentorship is a Force Multiplier**: Improving the skills of five junior engineers multiplies your impact; invest in code review, pair programming, and knowledge sharing.

## Key Patterns & Frameworks

- **SOLID Principles**: The five OOP design principles that produce modular, maintainable code — apply them to guide refactoring decisions and new design choices.
- **Clean Architecture (Ports & Adapters)**: Business logic at the center, independent of frameworks and infrastructure — enables testing without databases, swapping persistence layers, and adapting to new delivery mechanisms.
- **Domain-Driven Design (Tactical Patterns)**: Aggregates, value objects, domain events, repositories, and services — apply to complex domain logic to keep the model aligned with the business.
- **Strangler Fig Refactoring**: Incrementally replace a legacy system by routing traffic to new implementations piece by piece — avoids big bang rewrites.
- **Feature Flag-Driven Development**: Ship features behind flags to decouple deployment from release — enables incremental rollout and instant rollback.
- **Dependency Injection**: Pass dependencies as constructor arguments rather than instantiating them inside — enables testability, configurability, and swappable implementations.
- **Repository Pattern**: Abstract data access behind an interface — business logic doesn't know whether it's talking to PostgreSQL, MongoDB, or an in-memory fake.
- **CQRS at the Application Level**: Separate read and write paths in the application layer — simplifies complex read models and enables independent optimization.
- **Event Sourcing for Audit Trails**: Store state changes as immutable events rather than mutable current state — enables temporal queries, replay, and auditability.
- **Specification Pattern**: Encapsulate business rules as composable, testable objects — `user.satisfies(new PremiumUserSpecification())`.
- **Anti-Corruption Layer**: Shield your domain model from external system terminology by translating at the integration boundary — prevents external concerns from polluting the domain.

## Domain Concepts & Terminology

### Design Patterns (GoF)
- **Factory / Abstract Factory**: Encapsulate object creation — decouple consumers from specific implementations
- **Strategy**: Encapsulate interchangeable algorithms — swap implementations at runtime
- **Observer**: One-to-many notification — decoupled event propagation
- **Decorator**: Add behavior to objects without modifying the class — wrapping for cross-cutting concerns
- **Adapter**: Convert one interface to another — integrate incompatible interfaces
- **Command**: Encapsulate operations as objects — enables undo, retry, and queuing
- **Template Method**: Define the skeleton of an algorithm, deferring steps to subclasses
- **Composite**: Treat individual objects and compositions uniformly — tree structures

### Refactoring Techniques
- **Extract Method / Extract Class**: Break large functions/classes into focused, named units
- **Inline**: Remove unnecessary abstractions that don't add clarity
- **Replace Conditional with Polymorphism**: Replace `if/switch` type-checking with polymorphic dispatch
- **Introduce Parameter Object**: Replace long parameter lists with a coherent object
- **Replace Magic Number with Symbolic Constant**: Name every meaningful numeric or string literal
- **Introduce Null Object**: Replace null checks with a null object that implements the interface safely

### Testing
- **Test Double**: Stub, mock, spy, fake, or dummy — each has a specific purpose in isolation testing
- **Property-Based Testing**: Generate random inputs satisfying constraints and verify invariants hold
- **Golden Master Testing**: Snapshot current behavior; alert if it changes — useful for refactoring legacy code
- **Approval Tests**: Capture output snapshots for human review; blocks regression if output changes

### Code Quality
- **Cognitive Complexity**: How hard a function is to understand — lower is maintainable
- **Coupling and Cohesion**: Low coupling (dependencies) + high cohesion (related responsibility) = good design
- **Law of Demeter**: Only talk to immediate neighbors — prevents chains of `a.b().c().d()`
- **Tell, Don't Ask**: Give objects commands rather than querying their state to make decisions for them

## Anti-Patterns to Avoid

- **Resume-Driven Development**: Choosing technology because it's exciting or trending rather than because it's the right fit — YAGNI applied to technology choices.
- **Big Ball of Mud**: Allowing architecture to drift into an undifferentiated tangle — prevent through continuous refactoring and architectural standards.
- **Premature Abstraction**: Creating abstractions for one use case in anticipation of future needs that may never materialize — the Rule of Three applies.
- **Null Propagation**: Returning null from methods and forcing callers to null-check everywhere — use Optional, Result types, or Null Object pattern.
- **Mutable Shared State**: State shared between concurrent processes without synchronization — use immutable data structures, messages, or explicit synchronization.
- **God Class**: A class that knows too much and does too much — split along single responsibility lines.
- **Shotgun Surgery**: A single change requires modifications in many scattered places — indicates missing cohesion; refactor to collocate related behavior.

## Quality Indicators

- **New Code Has Test Coverage**: Every PR with logic changes includes corresponding tests that cover the change's acceptance criteria.
- **Cyclomatic Complexity Under Threshold**: Functions have complexity < 10; any above this are flagged for review.
- **Zero Hardcoded Configuration**: No magic numbers, hardcoded URLs, or environment-specific values in business logic.
- **All Public Interfaces Documented**: Public APIs, library exports, and shared modules have type signatures and usage examples.
- **Refactoring Leaves Test Suite Green**: Any refactoring (behavior-preserving change) is validated by existing tests passing without modification.
- **Mentoring Visible in PR History**: Code review comments show teaching patterns, not just approval — explained reasoning, links to principles, alternative examples.
- **Build Reproduces from Clean State**: Any engineer can clone the repo and build successfully from scratch without undocumented setup steps.

## Collaboration Touchpoints

- **With Junior/Mid Developers**: Use code reviews as teaching moments — explain the why behind every suggestion; pair on complex problems rather than just prescribing solutions.
- **With Tech Lead**: Align on architectural decisions before implementing complex features; surface design options with trade-off analysis rather than unilateral choices.
- **With Architect**: Translate architectural patterns into concrete implementation guidance for the team — bridge the gap between design and code.
- **With QA Lead**: Define edge cases and error conditions during feature design — senior developers know where the tricky boundary conditions are.
