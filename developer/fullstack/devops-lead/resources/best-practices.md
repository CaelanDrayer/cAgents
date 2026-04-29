# Best Practices: DevOps Lead

> Design principles, patterns, and frameworks that guide high-quality DevOps team coordination, infrastructure strategy, and delivery excellence.

## Design Principles

- **Platform Thinking**: Build internal developer platforms that make the right thing the easy thing — self-service infrastructure with guardrails beats manual approval gates.
- **Reliability as an Engineering Discipline**: SLOs, error budgets, and SRE practices are engineering work, not operational theater — apply rigorous measurement and feedback loops.
- **Security and Delivery Are Not in Tension**: Well-designed pipelines enforce security controls automatically — shift left, not slow down.
- **Standardize and Automate Before Scaling**: Standardize deployment patterns and tooling before growing the team — inconsistency multiplies with headcount.
- **Incident Response as a System**: Design incident response as a repeatable process (detect, triage, mitigate, resolve, learn) not as heroics.
- **Cost Engineering is Part of the Job**: Infrastructure cost is an engineering metric; unmanaged cloud spend is a delivery risk and a team credibility problem.
- **Empower Developers**: The best DevOps team is the one developers barely notice — because they have fast, reliable, self-service tooling.

## Key Patterns & Frameworks

- **SRE Error Budget Model**: Define an SLO (e.g., 99.9% availability); the error budget (0.1%) is consumed by both failures and risky releases — when exhausted, halt changes until reliability is restored.
- **DORA Metrics**: Track Deployment Frequency, Lead Time for Changes, Change Failure Rate, and MTTR — the four validated predictors of software delivery performance.
- **Platform Engineering Model**: Build an Internal Developer Platform (IDP) that abstracts infrastructure complexity; use tools like Backstage, Port, or custom CLI wrappers.
- **Infrastructure Cost Governance**: Tag all resources with team/service/environment; set budget alerts; review cost anomalies weekly — FinOps practices applied to engineering.
- **On-Call Rotation Design**: Balance coverage, sustainability, and knowledge distribution — no single point of failure in the on-call roster.
- **Chaos Engineering**: Deliberately inject failures (GameDays, Chaos Monkey) to validate system resilience and expose hidden single points of failure.
- **Runbook-First Incident Response**: Every alert has a runbook with diagnostic steps and remediation actions — reduces MTTR by enabling on-call rotation across skill levels.
- **GitOps at Scale**: Multi-cluster GitOps with environment promotion pipelines — ArgoCD ApplicationSets or Flux multi-tenancy for managing many clusters.
- **Progressive Delivery Governance**: Define organization-wide standards for canary percentage thresholds, bake time, and automated rollback triggers.
- **CI/CD Maturity Model**: Assess and systematically improve pipeline reliability, speed, and security coverage across all services.

## Domain Concepts & Terminology

### SRE Concepts
- **SLI (Service Level Indicator)**: A metric that measures the quality of service (e.g., request success rate, latency P99)
- **SLO (Service Level Objective)**: Target value for an SLI (e.g., 99.9% success rate over 30 days)
- **SLA (Service Level Agreement)**: Contractual commitment to an SLO; breach triggers business consequences
- **Error Budget**: 1 - SLO; the allowed budget for failures; consumed by both incidents and risky deployments
- **Toil**: Repetitive, manual, automatable operational work — reducing toil is an explicit SRE goal
- **Reliability Hierarchy**: Monitoring → Incident Response → Postmortem → Fixing Root Cause → Prevention

### Platform Engineering
- **Internal Developer Platform (IDP)**: Self-service platform providing infrastructure, CI/CD, and observability to developers
- **Golden Path**: Opinionated, supported path for building and deploying a service — makes the right approach the default
- **Service Catalog**: Registry of all services with ownership, runbooks, SLOs, and dependency graphs (e.g., Backstage)
- **Developer Experience (DevEx)**: How productive and frictionless it is to develop, test, and deploy — measured by cycle time and survey

### Observability
- **RED Method**: Rate (requests/sec), Errors (error rate), Duration (latency) — key metrics for any service
- **USE Method**: Utilization, Saturation, Errors — key metrics for any infrastructure resource
- **Distributed Tracing**: Following a request across multiple services using trace IDs (OpenTelemetry, Jaeger, Zipkin)
- **Structured Logging**: Log entries as JSON with consistent fields (timestamp, level, trace_id, service) — enables programmatic querying
- **Alert Fatigue**: When on-call engineers receive so many low-quality alerts they start ignoring them — symptom of missing alert tuning

### Incident Management
- **Severity Levels**: P1 (customer-facing, full outage) → P4 (low impact); define with business stakeholders
- **Incident Commander**: Coordinates the incident response; delegates diagnosis, communication, and remediation
- **Postmortem (Blameless)**: Analysis of what happened, why, and what changes prevent recurrence — never blame individuals
- **MTTR (Mean Time to Recover)**: Average time from incident detection to full service restoration
- **RCA (Root Cause Analysis)**: Analysis of the underlying cause; use "5 Whys" or fishbone diagram

## Anti-Patterns to Avoid

- **Hero On-Call Culture**: Relying on a small number of experts for all incidents — creates burnout and single points of failure.
- **Alert-Driven Operations**: Reacting to alerts without SLOs or error budgets — teams optimize for alert volume rather than user experience.
- **Infrastructure Snowflakes at Scale**: Allowing teams to use different CI systems, IaC tools, and deployment strategies — creates support overhead that grows with team count.
- **Missing Postmortems**: Treating incidents as operational noise rather than signals of systemic gaps — organizations that skip postmortems repeat the same incidents.
- **Cost Blindness**: Provisioning infrastructure without cost tagging or budget awareness — cloud bills surprise leadership and create reactive cost-cutting pressure.
- **Toil Accumulation**: Allowing manual operational work to grow without automation investment — reduces velocity as operational burden compounds.
- **Security as a Gate**: Treating security checks as a final approval step rather than integrating them throughout the pipeline — creates bottlenecks and adversarial dynamics.

## Quality Indicators

- **Deployment Frequency ≥ 1/Day per Team**: Teams deploy to production at least daily — measured via DORA dashboard.
- **MTTR < 1 Hour for P1 Incidents**: Average time to restore service from critical incidents.
- **Change Failure Rate < 15%**: Percentage of deployments requiring rollback or hotfix.
- **Error Budget Consumption Visible**: All services have SLOs and error budget dashboards visible to their teams.
- **On-Call Burden < 2 Hours/Week**: Average on-call time excluding real incidents — excess toil triggers automation investment.
- **Zero Manual Infrastructure Changes**: All production infrastructure changes tracked through GitOps — measured via audit logs.
- **Platform Adoption Rate**: Percentage of services using the standard deployment platform — measures platform value.

## Collaboration Touchpoints

- **With DevOps Engineer**: Provide direction on tooling choices, pipeline standards, and infrastructure patterns; unblock engineering problems that require architectural decisions.
- **With Engineering Manager**: Report DORA metrics, SLO performance, and infrastructure cost trends as business metrics — translate DevOps outcomes into delivery impact.
- **With Security Lead**: Coordinate on pipeline security controls, secrets management standards, and compliance automation — security requirements must be built into the platform, not bolted on.
- **With Backend Lead**: Align on deployment strategies, health check standards, and rollback procedures for backend services — delivery standards need developer buy-in.
