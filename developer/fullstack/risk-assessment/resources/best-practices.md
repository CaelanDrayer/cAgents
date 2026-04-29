# Best Practices: Risk Assessment

> Design principles, patterns, and frameworks that guide high-quality technical risk analysis, failure prediction, and proactive mitigation.

## Design Principles

- **Risk is Probability × Impact**: Every risk has two dimensions — how likely it is to materialize and how bad it will be if it does; both must be estimated explicitly.
- **Quantify to Communicate**: Vague risk language ("this might be slow") is not actionable; specific language ("this adds 50ms P99 latency under 2x load") enables decision-making.
- **Blast Radius First**: Before assessing likelihood, determine how bad the worst case is — high blast radius risks deserve disproportionate attention even at low probability.
- **Surface Risks Early**: A risk identified in design costs a conversation; the same risk discovered in production costs an incident, a postmortem, and customer trust.
- **Residual Risk Acknowledgment**: After applying mitigations, document the residual risk explicitly — decisions should be made knowing the remaining exposure, not assuming risk is zero.
- **Systemic Thinking**: Individual components fail predictably; cascading failures and emergent behaviors are harder to foresee — always model the system, not just the component.
- **Risk Owners, Not Risk Reports**: Every identified risk must have a named owner responsible for mitigation or acceptance — unowned risks don't get addressed.

## Key Patterns & Frameworks

- **Risk Matrix (5×5)**: Classify each risk by likelihood (1-5) and impact (1-5); plot in a matrix to prioritize — quadrant 4 (high likelihood, high impact) is always the top priority.
- **ROAM Framework**: Resolve (eliminate the risk), Own (accept with a mitigation plan), Accept (acknowledge with no action), Mitigate (reduce probability or impact) — every risk in the register must have one of these dispositions.
- **STRIDE Threat Model**: For security risks — Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege; apply to every new system boundary.
- **Failure Mode and Effects Analysis (FMEA)**: For each component, enumerate potential failure modes, estimate their probability and severity, and identify detection mechanisms.
- **Blast Radius Mapping**: For every change, map which services, data stores, users, and downstream systems are affected if the change causes a failure.
- **Pre-mortem Analysis**: Before implementing, imagine the change has failed catastrophically — work backward to identify what went wrong and how to prevent it.
- **Monte Carlo Simulation**: For delivery risk, run probabilistic simulations on task completion time distributions — produces realistic confidence intervals vs. point estimates.
- **Dependency Risk Analysis**: Map external dependencies (third-party APIs, vendor services, shared libraries) and assess each for availability, reliability, and end-of-life risk.
- **Change Risk Scoring**: Score every proposed change on dimensions (size, blast radius, reversibility, test coverage, deployment frequency) to produce a standardized risk rating.
- **Circuit Breaker Analysis**: Identify service dependencies that lack circuit breakers — synchronous chains without failure isolation are systemic risks.

## Domain Concepts & Terminology

### Risk Classification
- **Technical Risk**: The technical approach may not achieve the intended outcome
- **Delivery Risk**: The work may not complete within the agreed scope, schedule, or budget
- **Architectural Risk**: Design decisions that create future constraints or failure modes
- **Operational Risk**: Systems may fail to operate reliably or securely in production
- **Third-Party Risk**: External dependency failures, deprecations, or license changes
- **Compliance Risk**: Regulatory requirements not met by the current or proposed implementation

### Risk Metrics
- **Probability**: Likelihood that a risk materializes (1=rare, 5=almost certain)
- **Impact**: Business consequence if the risk materializes (1=negligible, 5=critical)
- **Risk Score**: Probability × Impact — used for prioritization
- **Residual Risk**: Risk remaining after mitigations are applied
- **Risk Appetite**: The level of risk the organization is willing to accept for a given business outcome

### Failure Analysis
- **Single Point of Failure (SPOF)**: A component whose failure causes total system failure — should always be mitigated or explicitly accepted
- **Cascading Failure**: A failure in one component propagates to dependent components — occurs when coupling is tight and isolation is absent
- **Failure Mode**: A specific way a component can fail (crash, return wrong data, time out, corrupt data)
- **Detection Mechanism**: How a failure mode will be discovered (monitoring alert, user report, automated test)
- **Mean Time Between Failures (MTBF)**: Average time a system operates before failing — higher is better
- **Recovery Time Objective (RTO)**: Maximum tolerable downtime — drives infrastructure redundancy decisions

### Security Risk
- **Attack Surface**: All entry points through which an attacker could interact with the system
- **Threat Actor**: Entity that could exploit a vulnerability (external attacker, compromised insider, automated bot)
- **Exploit**: Mechanism by which a vulnerability is attacked
- **Compensating Control**: An alternative safeguard that reduces risk when the primary control cannot be applied

## Anti-Patterns to Avoid

- **Risk by Anecdote**: Identifying risks based on past experiences or gut feel without systematic analysis — misses unknown unknowns and introduces bias.
- **Binary Risk Thinking**: Categorizing risks as simply "present" or "absent" without quantifying probability and impact — makes prioritization impossible.
- **Mitigation Theater**: Documenting mitigations that don't materially reduce the probability or impact of the risk — creates false confidence.
- **Missing Residual Risk**: Closing a risk after applying a mitigation without documenting the remaining exposure — decisions downstream assume zero remaining risk.
- **Risk as Someone Else's Problem**: Identifying risks without assigning owners — unowned risks don't get mitigated.
- **Static Risk Assessment**: Performing a risk assessment once at project start and never revisiting — risk profiles change as systems and context evolve.
- **Ignoring Low-Probability/High-Impact Risks**: Deprioritizing catastrophic but unlikely risks — these are the events that define an organization's reliability record.

## Quality Indicators

- **All Risks Have Owners**: Every item in the risk register has a named engineer or team responsible for mitigation.
- **Residual Risk Documented**: After mitigation, remaining risk exposure is explicitly stated alongside every risk entry.
- **Risk Register Reviewed Monthly**: Active risk register reviewed and updated with current status on a monthly cadence.
- **Critical Risks Mitigated Before Launch**: No Critical-rated risks remain unaddressed at production deployment time.
- **STRIDE Applied to New Boundaries**: Every new service boundary or API introduced in the past quarter has a completed STRIDE analysis.
- **Pre-mortem Coverage**: All Tier 3+ changes have documented pre-mortem analysis before implementation begins.
- **Blast Radius Quantified**: Every risk assessment states the number of services, users, and data sets affected in the worst case.

## Collaboration Touchpoints

- **With Engineering Manager**: Risk assessments should directly inform go/no-go decisions — provide quantified risk scores and residual risk in a format the manager can use for stakeholder communication.
- **With Architect**: Architecture-level risks (cascading failures, SPOF, coupling) are often best identified during architecture review — coordinate to ensure risk assessment informs design decisions.
- **With Security Lead**: Security risks identified during technical risk assessment should be escalated to the security lead for STRIDE analysis and mitigations.
- **With QA Lead**: Testing coverage is a primary mitigation for many technical risks — coordinate to ensure risk assessment informs QA prioritization.
