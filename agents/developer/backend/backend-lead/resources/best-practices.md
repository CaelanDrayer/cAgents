# Best Practices: Backend Lead

> Design principles, patterns, and frameworks that guide high-quality backend team coordination and technical leadership.

## Design Principles

- **Standards Enable Speed**: Consistent coding conventions, API patterns, and error-handling strategies let the team move faster by reducing cognitive load on every PR review.
- **Coordinate, Don't Implement**: The backend lead's value is in raising the quality of many engineers' output — direct implementation by the lead is an anti-pattern that blocks scale.
- **Technical Debt is a Liability**: Track it explicitly, schedule repayment, and never let it accumulate silently — undocumented debt is the most dangerous kind.
- **API Contracts are Shared Agreements**: Backend leads own the contract between the server and all consumers; breaking changes require a migration path, not a unilateral refactor.
- **Align Architecture with Team Structure**: Conway's Law is real — the software architecture will mirror team boundaries; design teams and architecture together.
- **Visibility Over Heroics**: Prefer solutions that are easy to understand and debug by the whole team over clever solutions understood only by the author.
- **Security is Not Optional**: Every backend API surface is a potential attack vector; security review is part of every technical decision, not an afterthought.

## Key Patterns & Frameworks

- **RFC (Request for Comments) Process**: For significant API or architecture changes, write a short RFC and circulate for team review before implementation begins — surfaces concerns early.
- **Technical Debt Register**: Maintain a living document of known technical debt with estimated cost, business risk, and priority; review quarterly.
- **API Versioning Strategy**: Define a team-wide convention (URL versioning, header versioning) and enforce it consistently; deprecation timelines must be communicated to consumers.
- **Backend Architecture Decision Records (ADRs)**: Document significant technical decisions with context, rationale, and consequences; store in the repository.
- **Code Review Standards**: Define what constitutes a blocking vs. non-blocking review comment; establish SLAs for review turnaround (e.g., ≤24 hours).
- **Service Boundary Definition**: Work with architects to define clear service boundaries — what data each service owns, what it must not access directly, and how it communicates.
- **Incident Retrospective Process**: After every P1/P2 incident, run a blameless retrospective and produce action items with owners and deadlines.
- **Dependency Upgrade Cadence**: Establish a regular schedule (weekly/monthly) for reviewing and applying dependency patches; security patches are always expedited.
- **Backend Test Standards**: Define minimum coverage thresholds, which tests run in CI vs. pre-deploy, and what categories of tests (unit, integration, contract) are required for each layer.
- **Onboarding Runbook**: Maintain a living document that lets a new backend engineer be productive within their first week — environment setup, architecture overview, first PR guide.

## Domain Concepts & Terminology

### Coordination Patterns
- **Tech Lead vs. Engineering Manager**: Tech lead owns technical quality; engineering manager owns delivery and people — backend lead bridges both
- **Delegation by Competency**: Match work items to engineers based on skill and growth opportunity, not just availability
- **Technical Mentoring**: Code review as teaching, pair programming for knowledge transfer, architecture discussions for senior skill development
- **Sprint Planning Input**: Backend lead translates business requirements into technical estimates and surfaces hidden complexity

### API Governance
- **Breaking Change**: Any change that requires consumers to modify their integration (renamed fields, removed endpoints, changed semantics)
- **Non-Breaking Change**: Additive changes (new optional fields, new endpoints) that consumers can ignore safely
- **API Deprecation**: The process of sunsetting an API version — announce timeline, provide migration guide, monitor consumer adoption
- **Contract Testing**: Tests that verify producer and consumer agree on the API shape (Pact, Spring Cloud Contract)

### Backend Architecture
- **Service Mesh**: Infrastructure layer for service-to-service communication (Istio, Linkerd) — handles mTLS, retries, tracing
- **Event-Driven Architecture**: Services communicate via events on a broker (Kafka, RabbitMQ, SQS) rather than synchronous calls
- **CQRS**: Command Query Responsibility Segregation — separate read and write models for independent scaling
- **Saga Pattern**: Distributed transaction management via coordinated local transactions with compensating actions

### Quality Metrics
- **MTTR (Mean Time to Recover)**: Average time to restore service after an incident
- **MTBF (Mean Time Between Failures)**: Average time between incidents — longer is better
- **Error Budget**: Allowance for downtime defined by SLO (e.g., 99.9% = 8.7 hours/year)
- **Lead Time for Changes**: Time from code commit to production — key DORA metric
- **Change Failure Rate**: Percentage of deployments that cause incidents — target < 15%

## Anti-Patterns to Avoid

- **Hero Culture**: Allowing one engineer to be the sole expert on a critical system — creates single points of failure and burnout risk.
- **Inconsistent API Design**: Different endpoints following different naming, error, and pagination conventions — makes the API unpredictable for consumers.
- **Missing Contract Tests**: Assuming that because the backend and frontend teams both changed their code, the integration still works — contract tests catch misalignments before production.
- **Unreviewed Architecture Changes**: Allowing significant backend structural changes to merge without architectural review — small changes accumulate into big problems.
- **Infinite Technical Debt Accumulation**: Adding new features on top of unstable foundations without scheduled debt repayment — eventually velocity collapses.
- **Siloed Domain Knowledge**: Code that only one person understands — enforce pair programming, ADRs, and documentation for critical systems.
- **Skipping Incident Retrospectives**: Treating incidents as isolated failures rather than signals of systemic gaps — retrospectives are the primary source of reliability improvement.

## Quality Indicators

- **Review Turnaround ≤ 24 Hours**: All PRs receive a first review within the agreed SLA, measured via PR analytics.
- **Zero Unowned Technical Debt Items**: Every item in the debt register has an owner and a priority.
- **API Breaking Changes are Zero-Downtime**: All API changes are deployed without requiring synchronized consumer deployments.
- **New Engineers Are Productive in Week 1**: Onboarding runbook is complete and validated by the last new hire.
- **All Critical Systems Have Runbooks**: Every service that pages on-call has a documented runbook for the most common failure modes.
- **Test Coverage Meets Standards**: Backend services meet the team's defined minimum coverage thresholds in CI.
- **Incident Action Items Have Owners**: Every retrospective produces action items assigned to named engineers with deadlines.

## Collaboration Touchpoints

- **With Backend Developer**: Set clear standards and review PRs as a teaching opportunity; escalate patterns to team standards when seen repeatedly.
- **With Architect**: Translate architectural decisions into backend implementation guidelines and ensure the team understands and applies them consistently.
- **With Frontend Lead**: Agree on API contract process, versioning strategy, and change notification protocol before either team begins implementation.
- **With QA Lead**: Define what constitutes sufficient backend test coverage for each type of change, and which tests must pass before deployment.
- **With Engineering Manager**: Surface velocity blockers, technical debt risk, and team capacity constraints early — the manager needs this to plan effectively.
