# Best Practices: Engineering Manager

> Design principles, patterns, and frameworks that guide high-quality engineering coordination, risk management, and strategic oversight.

## Design Principles

- **Delegate, Don't Implement**: The engineering manager's output is the quality and velocity of the team's work, not individual code — direct implementation by the manager blocks scale.
- **Risk is the Primary Currency**: The most important thing an engineering manager manages is risk — technical, delivery, people, and organizational risk.
- **Transparency Enables Alignment**: The team cannot make good decisions without context; share business goals, constraints, and tradeoffs openly.
- **Decisions Require Evidence**: Go/no-go decisions must be grounded in specific evidence (test results, metrics, architectural review) not gut feel or optimism.
- **People are the System**: Engineering quality is bounded by team health; burnout, confusion, and low morale produce poor output regardless of technical competence.
- **Process Serves Delivery**: Every process must demonstrably improve delivery speed or quality — if it doesn't, remove it.
- **Escalate Early, Resolve Fast**: Surface blockers and risks to stakeholders before they become crises; surprises are management failures.

## Key Patterns & Frameworks

- **Risk Assessment Matrix**: Evaluate each initiative on likelihood × impact; high-likelihood/high-impact risks are blockers, not acceptable residual risk.
- **RACI Matrix**: Define who is Responsible, Accountable, Consulted, and Informed for each decision type — eliminates confusion about ownership.
- **Go/No-Go Checklist**: Structured pre-deployment decision framework covering technical readiness (tests pass, load tested, security reviewed), operational readiness (runbooks, monitoring, rollback plan), and stakeholder alignment.
- **Priority Arbitration Framework**: When multiple urgent requests compete for the same resources, evaluate by impact × urgency × risk; document the decision and communicate tradeoffs.
- **OKRs (Objectives and Key Results)**: Align team effort to measurable outcomes; quarterly OKRs make progress and priority visible.
- **Engineering Metrics Dashboard (DORA)**: Track Deployment Frequency, Lead Time, Change Failure Rate, MTTR — use as conversation starters, not judgment tools.
- **1:1 Framework**: Structured weekly 1:1s with each direct report: status update (5 min), blockers (10 min), career and development (10 min), manager topics (5 min).
- **Blameless Postmortem Process**: After incidents, focus on systemic causes rather than individual blame — produces more durable improvements and preserves psychological safety.
- **Technical Debt Review Cadence**: Monthly review of the technical debt register with the team — prioritize repayment based on accumulating risk and velocity impact.
- **Capacity Planning Model**: Track actual velocity vs. planned capacity; factor in toil, on-call burden, and planned leave when committing to delivery timelines.

## Domain Concepts & Terminology

### Delivery Management
- **Velocity**: Story points or work items completed per sprint — trend matters more than absolute value
- **Throughput**: Work items shipped per unit time — a more stable metric than velocity for planning
- **Cycle Time**: Time from work item start to completion — shorter is better; measures process efficiency
- **Lead Time**: Time from work item creation to completion — longer lead time = more work in queue
- **WIP (Work In Progress) Limit**: Cap on concurrent in-flight work items — reduces context switching and improves throughput
- **Bottleneck**: The step in the value stream with the least capacity — overall throughput is bounded by the bottleneck

### Risk Management
- **Technical Risk**: Risk that the technical approach will fail to deliver the intended outcome
- **Delivery Risk**: Risk that work will not complete within the agreed timeline or scope
- **Architectural Risk**: Risk that the design creates future constraints on scalability, maintainability, or security
- **People Risk**: Key person dependencies, burnout, skill gaps, and team instability
- **Third-Party Risk**: Vendor reliability, API deprecation, license changes, or supply chain compromise
- **ROAM Framework**: Resolve (eliminate), Own (accept with mitigation), Accept (live with it), Mitigate (reduce probability/impact)

### Engineering Culture
- **Psychological Safety**: Team members feel safe raising concerns, admitting mistakes, and proposing ideas without fear of punishment
- **Blameless Culture**: Problems are attributed to systems and processes, not individuals — enables honest retrospectives
- **Learning Organization**: Team systematically learns from failures, successes, and external sources
- **Autonomy with Alignment**: Teams have freedom to choose how to deliver within clear outcome boundaries

### Stakeholder Management
- **Executive Briefing**: Summary at the right level of abstraction for non-technical stakeholders — focus on impact, risk, and timeline, not implementation details
- **Status Report Format**: Current state, next steps, risks, and decisions needed — structured consistently to build stakeholder trust
- **Escalation Path**: Documented process for raising unresolvable blockers to the next organizational level

## Anti-Patterns to Avoid

- **Micro-Management**: Dictating implementation details to engineers — reduces ownership, creativity, and intrinsic motivation.
- **Hero Culture**: Rewarding individual heroics over team-based reliability — creates single points of failure and burnout.
- **Committed Without Buffer**: Committing to delivery timelines that assume 100% availability and zero unexpected complexity — always account for interruptions and discovery.
- **Missing Go/No-Go Criteria**: Deploying without explicit, pre-agreed readiness criteria — leads to "good enough" deployments that become incidents.
- **Deferred Risk Acknowledgment**: Knowing about a risk and not surfacing it to stakeholders — the risk becomes the manager's responsibility when it materializes.
- **Process for Process's Sake**: Adding meetings, approvals, and ceremonies without evaluating their delivery value — process debt accumulates as fast as technical debt.
- **Feedback Avoidance**: Avoiding hard performance conversations because they're uncomfortable — unresolved performance problems compound over time.

## Quality Indicators

- **DORA Metrics in Target Range**: Deployment frequency, lead time, change failure rate, and MTTR all within organizational targets.
- **Risk Register Current**: All known risks are documented, owned, and have mitigation plans — reviewed at least monthly.
- **Zero Surprise Incidents**: Production incidents are preceded by visible leading indicators (rising error rates, test failures, known debt) — no true surprises.
- **Team Satisfaction > 7/10**: Team health survey scores are tracked and trending positive or stable.
- **On-Call Burden Sustainable**: On-call engineers average < 2 hours of interrupt work per week excluding real incidents.
- **Decisions Documented**: All significant technical and delivery decisions are recorded with rationale and communicated to affected stakeholders.
- **Delivery Commitments Met ≥ 80%**: Team delivers against sprint commitments at a rate that reflects realistic planning, not heroics.

## Collaboration Touchpoints

- **With Architect**: Receive architectural risk assessments before committing to implementation timelines; ensure architectural decisions have documented rationale.
- **With Tech Lead**: Align on technical standards, review processes, and debt prioritization — the tech lead executes what the engineering manager enables.
- **With QA Lead**: Set quality gates and release criteria together; QA lead reports on readiness, engineering manager makes the go/no-go call.
- **With VP Engineering**: Report on DORA metrics, team health, and strategic risks; escalate organizational blockers that require VP-level resolution.
