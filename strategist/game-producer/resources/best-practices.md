# Best Practices: Game Producer

> Design principles, patterns, and frameworks that guide high-quality game production management, milestone delivery, and cross-discipline team coordination.

## Design Principles

- **Scope Is the Primary Risk**: Game projects consistently fail or ship poorly due to unconstrained scope, not lack of talent — the producer's most important job is protecting scope ruthlessly.
- **Milestones Are Contracts, Not Aspirations**: Every milestone must have clear deliverables, acceptance criteria, and go/no-go decisions — "mostly done" is not a milestone.
- **Surface Blockers Early, Not Late**: A blocker raised at the last minute is a production failure — create a culture where teams surface risks and issues at earliest possible discovery.
- **Protect the Team's Creative Energy**: Administrative overhead, unclear priorities, and unnecessary meetings drain creative capacity — the producer's job is to remove friction, not add it.
- **Track Everything, Decide What Matters**: Capture all production data, then select the indicators that actually predict delivery risk — not every metric warrants action.
- **Ship Date Is a Constraint, Scope Is a Variable**: Unless marketing has shipped the date publicly, always protect quality by adjusting scope before shipping broken or incomplete experiences.
- **Post-Mortems Drive Studio Growth**: Every shipped title generates lessons; documenting and acting on them is what separates studios that improve from studios that repeat mistakes.

## Key Patterns & Frameworks

- **Milestone Planning Framework**: Alpha (complete first playable) → Beta (feature complete) → Gold (ship candidate) — each milestone has defined criteria and cross-discipline sign-off requirements.
- **Agile for Games (Scrum-Adapted)**: Sprint-based iteration adapted for game development — 2-week sprints, daily standups, sprint reviews with playable builds, retrospectives feeding process improvement.
- **Critical Path Method (CPM)**: Identify the longest dependency chain from current state to ship — all delays on the critical path directly delay ship date. Focus risk mitigation here.
- **Risk Register (Games)**: Documented inventory of production risks (scope creep, key person dependency, platform certification delays, content creation bottlenecks) with probability, impact, and mitigation plans.
- **Feature Triage Framework**: For every requested feature: Must Ship / Should Ship / Nice to Have / Cut — applied at each milestone review to manage scope pressure.
- **Cross-Discipline Sync (XD Sync)**: Weekly meeting with leads from Art, Engineering, Design, Audio, and QA to surface inter-discipline dependencies before they become blockers.
- **Burn-Down / Burn-Up Tracking**: Visual tracking of work remaining vs. work completed over sprint or milestone — detects velocity problems weeks before deadline pressure.
- **Content Pipeline Management**: Track asset creation status (concept → WIP → review → final → integrated) across all content types to prevent final-week integration crises.
- **Platform Certification Planning**: Build first-party certification requirements (TRC/TCR) into production schedule at least 8 weeks before target submission date.
- **Post-Mortem Framework**: What went well → What went wrong → What we'd do differently — conducted within 2 weeks of ship; findings documented and shared with studio leadership.

## Domain Concepts & Terminology

### Production Phases
- **Pre-Production**: Concept validation, prototype development, team formation, pipeline establishment — typically 6-18 months
- **Production**: Full team executing against approved design and schedule — the primary development phase
- **Alpha**: First complete playable build with all major features implemented (possibly rough); formal QA begins
- **Beta**: Feature-complete build with primary focus on bug fixing, polish, and performance
- **Gold (RTM / Release to Manufacturing)**: Final approved build meeting all certification requirements; sent to platform holders
- **Live Operations (LiveOps)**: Ongoing content, events, and updates delivered post-launch for live service titles

### Scheduling & Tracking
- **WBS (Work Breakdown Structure)**: Hierarchical decomposition of all work required to complete the project to its smallest trackable units
- **Critical Path**: Longest sequence of dependent tasks determining minimum project duration — any delay here delays ship
- **Float / Slack**: Time a non-critical task can slip without delaying the project end date
- **Velocity**: Rate of task completion over time — used to forecast remaining work completion date
- **Burn Rate**: Rate of budget consumption vs. plan — high burn rate vs. milestone progress signals schedule risk

### Resource & Team
- **Discipline Lead**: Senior representative for each craft (Art Lead, Engineering Lead, QA Lead) responsible for team planning and deliverable quality
- **Embedded Producer**: Producer assigned to a specific feature team or discipline rather than the whole project
- **Outsourcing / Extern Work**: Content or code created by external studios — requires clear asset specifications, QA pipeline, and integration workflow
- **Key Person Risk**: Dependency on a single individual whose absence would critically delay production — requires documentation and backup planning

### Quality & Certification
- **TRC (Technical Requirements Checklist)**: PlayStation certification requirements covering saves, network behavior, accessibility, and performance
- **TCR (Technical Certification Requirements)**: Xbox/Microsoft equivalent of TRC
- **Lotcheck**: Nintendo's certification process for Switch titles
- **Bug Severity Levels**: Critical (blocks ship) → High (must fix pre-ship) → Medium (should fix) → Low (nice to fix) — severity triage drives QA prioritization
- **First-Party Submission**: Submitting a build to platform holders (Sony, Microsoft, Nintendo) for certification review

## Anti-Patterns to Avoid

- **Milestone Padding**: Adding buffer to every milestone estimate without tracking whether buffer is consumed, leading to false confidence and late-stage crunch. Fix: track buffer consumption actively; visible buffer erosion triggers scope review.
- **Death March Crunch**: Relying on sustained overtime to recover from schedule slips rather than adjusting scope. Fix: use crunch as a last resort, time-bounded, and post-mortemed — never as a production strategy.
- **Feature Lock Avoidance**: Continuing to add features past the agreed feature lock date "just this one more." Fix: enforce feature lock as a sacred milestone; exceptions require executive sign-off with scope offset.
- **Silent Escalation**: Team members knowing a task is at risk but not escalating until it's too late. Fix: establish weekly risk reporting with psychological safety; early escalation is rewarded, not penalized.
- **Scope Without Impact Assessment**: Adding work items without removing equivalent work to compensate. Fix: every addition to scope must identify what is removed or deferred — zero-sum scope discipline.
- **QA as Final Phase**: Treating QA as something that happens at the end of development rather than throughout. Fix: integrate QA from prototype; bugs found late are 10x more expensive to fix.
- **Post-Mortem Skipping**: Shipping and immediately starting the next project without documenting lessons learned. Fix: mandate post-mortems within 2 weeks of ship; findings must produce actionable process changes.

## Quality Indicators

- **Milestone Hit Rate**: % of milestones delivered on time with agreed acceptance criteria met (target: >85%).
- **Blocker Resolution Time**: Average days from blocker identification to resolution — long times signal escalation process failure.
- **Bug Escape Rate**: Bugs found post-certification per submission — rising rate indicates QA process gaps or insufficient pre-submission testing.
- **Sprint Velocity Stability**: Standard deviation of sprint velocity over 6 sprints — high variance signals estimation or capacity problems.
- **Overtime Hours per Week**: Average team overtime — consistent >10% overtime signals schedule unreality requiring scope or timeline adjustment.
- **Feature Scope vs. Plan**: % of originally planned features shipped in final product — large deviations (either direction) signal planning process failures.
- **Post-Mortem Action Closure**: % of post-mortem action items completed before next project milestone — measures whether studio actually learns.

## Collaboration Touchpoints

- **With Game Designer**: Quality looks like design scope clearly defined for each milestone, design change requests evaluated through formal impact assessment, and design debt tracked with resolution plans.
- **With Engineering Lead**: Quality looks like technical risk surfaced at pre-production, architecture decisions documented, and technical milestone acceptance criteria defined with engineering before the milestone date.
- **With QA Lead**: Quality looks like QA integrated from early production, bug triage process agreed, and certification requirements mapped to production schedule with buffer for resubmission.
- **With Studio Leadership / Executive Producer**: Quality looks like milestone dashboards providing transparent project health, scope change decisions escalated with clear trade-off analysis, and risk register reviewed monthly.
