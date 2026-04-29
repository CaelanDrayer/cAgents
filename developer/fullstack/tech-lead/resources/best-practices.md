# Best Practices: Tech Lead

> Design principles, patterns, and frameworks that guide high-quality technical leadership, delivery coordination, and engineering standards enforcement.

## Design Principles

- **Technical Direction, Not Technical Dictatorship**: The tech lead sets direction and makes final calls on contentious decisions, but actively solicits team input and explains rationale — ownership is shared.
- **Delivery is the Metric**: Technical excellence serves delivery; perfect code that never ships delivers no value — balance quality with velocity.
- **Technical Debt is a Risk Register Entry**: Document technical debt explicitly with business risk framing; prioritize repayment based on delivery impact, not engineering aesthetics.
- **Standards Enable Autonomy**: Clear, enforced standards let engineers make decisions independently without constant alignment — invest in standards to reduce coordination overhead.
- **Context is the Missing Input**: Most engineering conflicts arise from context gaps — share business goals, constraints, and tradeoffs liberally across the team.
- **First, Do No Harm**: Before making technical changes, understand what the current system gets right — chesterton's Fence applied to code.
- **Unblock Early, Escalate Fast**: The tech lead's primary delivery function is removing blockers — identify blockers before they delay the sprint, not after.

## Key Patterns & Frameworks

- **Architecture Decision Records (ADRs)**: Document every significant technical decision with its context, options considered, and rationale — provides institutional memory and communicates intent.
- **Engineering Standards Document**: A living document defining coding conventions, error handling patterns, testing requirements, and API design standards — reviewed quarterly.
- **Sprint Technical Backlog**: Maintain a separate technical backlog alongside the product backlog — technical debt, refactoring, and infrastructure work need explicit prioritization.
- **Technical Risk Log**: List known technical risks with likelihood, impact, and mitigation status — reviewed at every sprint planning.
- **Code Review Standard**: Define what constitutes a blocking vs. non-blocking review comment and establish turnaround SLAs — consistent application builds trust.
- **On-Call Rotation Ownership**: Tech lead is responsible for ensuring on-call is sustainable, knowledge is distributed, and runbooks are current — reliability is a technical leadership concern.
- **Tech Spike Protocol**: When uncertainty is high, time-box exploration with a defined question to answer and a deliverable (ADR or design doc) — avoids infinite research loops.
- **Definition of Done**: Explicit, team-agreed criteria that code must meet before a story is considered complete — includes tests, documentation, and operational readiness.
- **Pair Programming Schedule**: Structured pairing for knowledge distribution, complex problem-solving, and onboarding — not just emergency use.
- **Retrospective Action Ownership**: Tech lead owns retrospective action items that are technical in nature — process improvements need ownership to get done.

## Domain Concepts & Terminology

### Technical Leadership
- **Technical Vision**: The desired future state of the system's architecture, quality, and capability — guides prioritization decisions
- **Technical Strategy**: The plan for moving from current state to technical vision — sequenced, feasible, and aligned with product roadmap
- **Engineering Standards**: Agreed-upon conventions, quality requirements, and design patterns — reduce decision overhead and enable consistent code quality
- **Technical Roadmap**: Sequence of architectural and infrastructure investments required to enable business capabilities

### Delivery Concepts
- **Sprint Velocity**: Story points completed per sprint — trend matters more than absolute value; sudden drops indicate blockers or process issues
- **Definition of Done**: Explicit criteria that a work item must satisfy before being marked complete
- **WIP (Work In Progress) Limit**: Maximum concurrent in-flight items — reducing WIP typically increases throughput
- **Dependency Management**: Identifying and resolving cross-team technical dependencies before they become blockers
- **Scope Creep**: Uncontrolled expansion of work beyond the original estimate — tech lead identifies and negotiates scope changes

### Code Quality Leadership
- **Fitness Functions**: Automated tests that verify architectural properties (dependency direction, layer compliance, complexity thresholds) in CI
- **Technical Debt Ratio**: Estimated remediation time / development time — used for prioritizing debt repayment
- **Code Review Quality Gate**: Defined criteria for what must be resolved before merge — code review is only effective if standards are consistently applied
- **Refactoring vs. Rewrite Decision**: Refactor when the existing structure is sound; rewrite when the foundation is wrong — most rewrites are overambitious; prefer strangler fig

### Escalation
- **Blocker**: A work item that cannot proceed without external resolution — always escalate with context, impact, and a proposed resolution
- **Technical Risk Escalation**: A technical risk that has reached a probability × impact threshold requiring management visibility
- **Architecture Escalation**: A proposed design that has significant long-term implications requiring architect review before proceeding

## Anti-Patterns to Avoid

- **Technical Leadership by Heroics**: The tech lead who implements critical path items themselves — creates single points of failure and prevents team growth.
- **Standards Without Enforcement**: Documenting coding standards in a wiki page without automated enforcement — inevitably drifts to non-compliance.
- **Infinite Tech Spikes**: Research tasks without a time-box and a defined deliverable — spikes should answer a specific question within a fixed duration.
- **Backlog Avoidance**: Deferring technical debt indefinitely because product backlog is full — debt accumulates interest; negotiate for technical backlog capacity explicitly.
- **Unilateral Architecture Decisions**: Making significant design decisions without team input or documented rationale — reduces ownership and trust.
- **On-Call Heroism**: Allowing a small number of engineers to handle all on-call incidents — creates burnout, knowledge hoarding, and unsustainable operational burden.
- **Scope Creep Acceptance**: Accepting expanding requirements without replanning estimates and timelines — misrepresents delivery capability and builds unrealistic expectations.

## Quality Indicators

- **ADRs for All Significant Decisions**: All architectural and design decisions from the past quarter have documented ADRs in the repository.
- **Definition of Done Enforced**: Zero stories merged without meeting the team's Definition of Done — tracked via PR review compliance.
- **On-Call Burden Sustainable**: On-call engineers average < 2 hours of interrupt work per week excluding real incidents.
- **Technical Debt Register Current**: All known debt is documented with owner, business risk, and priority — reviewed monthly.
- **Blocker Resolution < 48 Hours**: Technical blockers are identified and escalated within 24 hours; resolved within 48 hours.
- **Sprint Commitment Met ≥ 80%**: Team delivers on sprint commitments at a rate that reflects realistic planning, not heroics.
- **Fitness Functions in CI**: Key architectural constraints are verified automatically in every CI run — no reliance on manual review alone.

## Collaboration Touchpoints

- **With Engineering Manager**: Report on delivery velocity, technical risks, and team health — the engineering manager makes resourcing and escalation decisions based on this input.
- **With Architect**: Align on ADRs for significant decisions; escalate design choices that have cross-service implications for architectural review.
- **With QA Lead**: Define Definition of Done jointly — quality gates are part of the technical standard, not a separate QA concern.
- **With Backend Lead / Frontend Lead**: Coordinate on cross-domain technical standards (API contracts, error formats, logging conventions) — consistency across domains reduces cognitive load.
