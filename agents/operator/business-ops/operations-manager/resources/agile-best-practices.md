> Sub-resource for mode `agile` — relocated verbatim from `agents/operator/business-ops/agile-coach/resources/best-practices.md` (zero-loss consolidation).

# Best Practices: Agile Coach / Scrum Master

> Design principles, patterns, and frameworks that guide high-quality agile coaching and sprint facilitation work.

## Design Principles

- **Servant Leadership First**: Remove impediments and shield the team from distractions rather than directing work — the coach exists to amplify the team, not manage it.
- **Inspect and Adapt Religiously**: Never skip retrospectives; every sprint is a controlled experiment with a built-in learning loop.
- **Empirical Process Control**: Base decisions on observation and data (velocity, cycle time, defect rate) rather than guesswork or historical assumptions.
- **Sustainable Pace**: Protect the team from crunch cycles that create short-term output gains at the cost of long-term quality and morale.
- **Facilitate, Don't Dominate**: Own the process, not the content — let the team make decisions so they own the outcomes.
- **Make Work Visible**: Impediments, WIP limits, and blocked items must be surfaced immediately, not buried in status reports.
- **Value Outcomes Over Outputs**: Shipped features don't matter if they don't move the needle; always tie sprint goals to measurable business outcomes.

## Key Patterns & Frameworks

- **Scrum Framework**: Iterative delivery with defined roles (PO, SM, Dev Team), ceremonies (planning, daily, review, retro), and artifacts (product backlog, sprint backlog, increment). Apply for teams needing structured cadence.
- **Kanban Method**: Flow-based approach using WIP limits and explicit policies to maximize throughput. Apply when work is continuous and unpredictable in size, or as a bridge before Scrum.
- **SAFe (Scaled Agile Framework)**: Enterprise scaling model with Program Increments, ARTs, and portfolio alignment. Apply when multiple teams need synchronized delivery.
- **Velocity Tracking**: Measure completed story points per sprint using trailing 3-sprint average for planning. Never use velocity as a performance metric.
- **Sprint Goal Pattern**: Each sprint has a single overarching goal defining success even if individual items shift. Prevents "completion theater" where all items ship but no outcome is achieved.
- **Definition of Done (DoD)**: Team-owned checklist gating when work is truly complete (reviewed, tested, deployed, documented). Expand DoD as team maturity grows.
- **Impediment Escalation Ladder**: Classify blockers by urgency and owner — team-resolvable vs. SM-escalatable vs. executive-required. Resolve team-level impediments within the sprint.
- **Retrospective Formats (Mad/Sad/Glad, 4Ls, Sailboat)**: Vary formats to prevent retro fatigue. Always end with ≤3 actionable commitments with owners.
- **Cumulative Flow Diagram (CFD)**: Visualize WIP, throughput, and cycle time trends. Expanding bands signal bottlenecks before they cause delays.
- **Planning Poker**: Consensus-based estimation using Fibonacci-sequence cards to surface assumptions and reduce anchoring bias.
- **DORA Metrics**: Deployment frequency, lead time for changes, change failure rate, time to restore — four metrics measuring delivery performance.
- **Team Health Radar**: Periodic assessment of team health dimensions (fun, speed, mission, learning, support) to surface issues before they become crises.

## Domain Concepts & Terminology

### Core Scrum Concepts
- **Sprint**: Time-boxed iteration (1-4 weeks) producing a potentially shippable increment
- **Sprint Backlog**: Team-selected items plus plan for achieving the sprint goal
- **Product Backlog**: Ordered list of everything that might be done, owned by the PO
- **Increment**: Usable output of a sprint meeting the definition of done
- **Sprint Review**: Stakeholder demo and feedback session at sprint end
- **Daily Standup**: 15-minute sync on progress, today's plan, and impediments

### Estimation & Flow
- **Story Points**: Relative effort units (not hours) used to estimate backlog items
- **Velocity**: Average story points completed per sprint (rolling 3-sprint average)
- **Cycle Time**: Time from work start to delivery for a single item
- **Lead Time**: Time from request to delivery, including wait time before work starts
- **WIP Limit**: Maximum number of items allowed in any workflow state
- **Throughput**: Number of items completed per sprint or time period
- **Little's Law**: Average WIP = Average Throughput × Average Cycle Time

### Team Health
- **Psychological Safety**: Environment where members can raise risks and ideas without fear of reprisal
- **Team Topologies**: Framework for organizing teams by interaction mode (stream-aligned, enabling, platform)
- **Tuckman's Stages**: Forming → Storming → Norming → Performing — predictable team development phases
- **Bus Factor**: Number of team members who must leave before a project fails due to knowledge concentration

### Scaling Concepts
- **Program Increment (PI)**: SAFe planning cadence, typically 8-12 weeks across multiple teams
- **Agile Release Train (ART)**: SAFe team-of-teams (5-12 teams) aligned to a value stream
- **Communities of Practice (CoP)**: Cross-team groups sharing expertise in a domain (e.g., QA guild)

## Anti-Patterns to Avoid

- **Scrum Theater**: Running ceremonies without purpose — teams go through motions but don't inspect or adapt. Fix: tie every ceremony to a concrete decision or outcome.
- **Velocity Gaming**: Teams inflate story points to look productive or POs pressure unsustainable commitments. Fix: use velocity for forecasting only, never for performance measurement.
- **Missing Sprint Goals**: Sprint has 15 items but no unifying goal, making partial completion indistinguishable from failure. Fix: define and publicize a single sprint goal before planning.
- **Retro Without Action**: Team identifies the same problems every sprint but takes no action. Fix: close each retro with ≤3 commitments; review them at the next retro's start.
- **SM as Project Manager**: Scrum Master assigns tasks and tracks individual progress, replacing self-organization with micromanagement. Fix: coach the team to self-organize; ask questions rather than direct.
- **Perpetual Backlog Debt**: Items enter the backlog but are never estimated, prioritized, or removed. Fix: dedicate 10% of capacity to refinement; archive items untouched for 3 sprints.
- **Hidden Impediments**: Team members work around blockers quietly instead of surfacing them. Fix: normalize impediment escalation in standup; treat silence as a signal to probe.

## Quality Indicators

- **Sprint Goal Achievement Rate**: % of sprints where the sprint goal is met (target: >85%) — distinguishes meaningful delivery from item-count completion.
- **Velocity Stability**: Standard deviation of sprint velocity across 6 sprints — high variance signals planning or capacity issues.
- **Retrospective Action Closure Rate**: % of retro commitments completed by next retro (target: >75%).
- **Impediment Resolution Time**: Average days to resolve a raised impediment (target: within current sprint for team-level blockers).
- **Escaped Defect Rate**: Defects found post-sprint per sprint — rising rate indicates DoD is too weak or testing is being skipped.
- **Team Satisfaction Score**: Qualitative pulse (1-5 weekly vote) — leading indicator of health before burnout or attrition.
- **WIP Violations**: Count of WIP limit breaches per sprint — signals bottlenecks or multitasking pressure.

## Collaboration Touchpoints

- **With Product Owner**: Quality looks like sprint goals derived from prioritized backlog items, acceptance criteria defined before sprint start, and PO available for mid-sprint clarifications within 4 hours.
- **With Engineering Team**: Quality looks like self-organizing task breakdown, daily impediment surfacing, and team-owned estimates not dictated from outside.
- **With Project Manager**: Quality looks like clear separation — PM owns scope/budget/timeline reporting; SM owns process health and impediment removal. Overlap minimized through explicit handoffs.
- **With Stakeholders (Sprint Review)**: Quality looks like working software demonstrated against the sprint goal, concrete feedback captured as backlog items, and no surprises because stakeholders were engaged mid-sprint.
