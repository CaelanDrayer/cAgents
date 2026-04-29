# Best Practices: Architecture Reviewer

> Design principles, patterns, and frameworks that guide high-quality architecture review and design validation work.

## Design Principles

- **Evidence Over Opinion**: Every finding must cite a specific architectural principle, pattern, or measured constraint — not personal preference.
- **Review for the Future Team**: Consider how the architecture will be understood and maintained by engineers who weren't in the original design meeting.
- **Validate, Don't Redesign**: The reviewer's job is to identify violations of sound principles and risks, not to impose an alternative vision.
- **Separation of Concerns at Scale**: Enforce that each service, module, and layer has a single, well-defined responsibility.
- **Risk-Calibrated Scrutiny**: Spend review effort proportional to architectural blast radius — changes to shared infrastructure deserve deeper review than isolated service changes.
- **Document What You Find**: Architecture review findings are valuable project history; capture them in ADRs or structured review reports.
- **Consistency with Existing Decisions**: Check proposed designs against existing ADRs before flagging inconsistencies — the team may have already made this trade-off deliberately.

## Key Patterns & Frameworks

- **Fitness Function Review**: Check whether the proposed architecture can be verified by automated fitness functions (ArchUnit, Deptrac, custom scripts) that enforce the design constraints.
- **C4 Model Validation**: Verify that the architecture diagram exists at the right level (Context/Container/Component) and that relationships between elements are accurate and minimal.
- **Coupling Analysis**: Identify afferent (incoming) and efferent (outgoing) dependencies per module; high efferent coupling indicates fragile designs.
- **Dependency Inversion Audit**: Verify that high-level modules depend on abstractions, not on concrete implementations of low-level modules.
- **API Contract Review**: Evaluate API surface area for consistency, versioning strategy, backward compatibility, and appropriate abstraction level.
- **Data Flow Mapping**: Trace how data enters, transforms, and exits the system to identify coupling points, serialization boundaries, and potential data leakage.
- **Failure Mode Analysis**: For each architectural boundary, ask "what happens when this fails?" — timeouts, circuit breakers, fallbacks, and dead letter queues should be explicit.
- **Blast Radius Estimation**: Assess which services, teams, and users are affected if a proposed component fails or misbehaves.
- **Non-Functional Requirements Traceability**: Verify that scalability, reliability, and latency requirements map to specific architectural decisions.
- **Security Boundary Review**: Identify where trust transitions occur and verify that authentication, authorization, and encryption are applied at each transition.

## Domain Concepts & Terminology

### Coupling Metrics
- **Afferent Coupling (Ca)**: Number of classes/modules that depend on a given module (measures responsibility)
- **Efferent Coupling (Ce)**: Number of classes/modules that a given module depends on (measures independence)
- **Instability (I)**: Ce / (Ca + Ce) — high instability means the module will change frequently
- **Abstractness (A)**: Ratio of abstract types to total types in a module
- **Distance from Main Sequence**: |A + I - 1| — measures how balanced a module is between abstract and concrete

### Architecture Patterns Under Review
- **Layered Architecture**: Strict layer dependencies (Presentation → Business → Data); review for skipped layers
- **Hexagonal Architecture**: Business logic isolated from adapters; review for framework leakage into the domain
- **Event-Driven**: Producers and consumers decoupled via events; review for implicit coupling via shared event schemas
- **Microservices**: Independent deployability; review for synchronous chains, shared databases, and distributed monolith patterns
- **CQRS**: Separate read/write paths; review for consistency guarantees and synchronization lag handling

### Design Principles
- **SOLID**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **DRY**: Don't Repeat Yourself — but shared code creates coupling; review for over-application
- **YAGNI**: You Ain't Gonna Need It — penalize speculative complexity
- **Law of Demeter**: A module should only talk to its immediate dependencies, not to dependencies of dependencies
- **Conway's Law**: System architecture mirrors team communication structure; organizational changes may be needed alongside architectural changes

### Review Outputs
- **Finding**: A specific violation with context, criterion violated, and suggested remediation
- **Risk Rating**: Critical / High / Medium / Low based on likelihood × impact
- **ADR Gap**: A significant decision that lacks a recorded ADR
- **Fitness Function Recommendation**: A suggested automated check that would catch this category of violation in CI

## Anti-Patterns to Avoid

- **Rubber-Stamp Reviews**: Approving designs without asking hard questions about failure modes, coupling, and non-functional requirements.
- **Alternative Architecture Proposals**: Spending review time designing an alternative instead of evaluating the proposed design — this should trigger a separate design phase.
- **Ignoring Existing ADRs**: Flagging a design choice as wrong without checking whether it was a deliberate, documented trade-off.
- **Review Without Diagram**: Evaluating architecture descriptions without requiring a C4 diagram — ambiguity in descriptions hides coupling.
- **Vague Findings**: Writing "this service does too much" without specifying which responsibilities should be extracted and why.
- **Missing Non-Functional Review**: Focusing only on structural patterns while ignoring whether the design can meet its latency, availability, or throughput requirements.
- **Confusing Review Tiers**: Applying component-level scrutiny to a context-level diagram, or vice versa — match review depth to diagram scope.

## Quality Indicators

- **Every Finding Has a Criterion**: Each review comment cites a specific principle (e.g., "violates Interface Segregation Principle because...").
- **Critical Findings Are Blocking**: Any finding rated Critical is escalated before the design proceeds to implementation.
- **ADR Coverage Complete**: Every significant decision in the proposed design either references an existing ADR or triggers a new one.
- **Fitness Functions Proposed**: The review output includes at least one automated check that would catch the most important structural violation in CI.
- **Failure Modes Documented**: All service boundaries have documented failure handling in the proposed design or the review recommends adding it.
- **Review Completed Before Implementation Begins**: Architecture reviews are upstream of code, not concurrent with it.
- **Blast Radius Quantified**: The review states how many services, teams, and users are affected if the proposed component fails.

## Collaboration Touchpoints

- **With Architect**: Architecture reviewers operate as a quality gate on the architect's output — findings should be precise and actionable, not a counter-proposal.
- **With Engineering Manager**: Escalate critical findings through the engineering manager to ensure they reach the right decision-makers before implementation begins.
- **With Backend Developer**: Translate abstract architectural findings into concrete code-level implications so developers understand what to change.
- **With Security Lead**: Coordinate on trust boundary and authentication reviews to avoid duplicating security review effort.
