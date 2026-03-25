# Best Practices: DevOps Engineer

> Design principles, patterns, and frameworks that guide high-quality CI/CD automation, infrastructure as code, and deployment engineering.

## Design Principles

- **Everything as Code**: Infrastructure, configuration, pipelines, and policies should all be version-controlled, reviewed, and tested like application code.
- **Pipelines are Products**: CI/CD pipelines are first-class software artifacts — they need tests, documentation, and maintenance like any other system.
- **Fail Fast in the Pipeline**: Surface failures as early as possible in the pipeline (lint before test, test before build, build before deploy) — every minute saved catching failures early is hours saved in production.
- **Immutable Infrastructure**: Never modify running infrastructure in place; replace it with a new version — eliminates configuration drift and enables reproducible environments.
- **Least Privilege for Automation**: CI/CD pipelines should have exactly the permissions they need — no standing admin access, use short-lived credentials.
- **Observability Before Deployment**: Monitoring, alerting, and logging must be configured before a service goes to production, not added as a follow-up.
- **Rollback is a First-Class Feature**: Every deployment strategy must have a tested rollback path; "we can't roll back" is not acceptable.

## Key Patterns & Frameworks

- **Trunk-Based Development**: All developers commit to the main branch at least daily; feature flags control what's enabled in production — enables continuous integration.
- **Blue-Green Deployment**: Two identical production environments (Blue = current, Green = new); switch traffic atomically after validation — enables instant rollback.
- **Canary Deployment**: Gradually route a percentage of traffic to the new version (1% → 10% → 50% → 100%); monitor error rate and latency at each stage.
- **Rolling Deployment**: Replace instances one at a time (or in batches) while keeping the service available — simpler than blue-green but harder to roll back.
- **Feature Flags (Feature Toggles)**: Decouple deployment from release; code ships disabled and is enabled progressively via configuration — enables dark launching and A/B testing.
- **GitOps**: The Git repository is the single source of truth for cluster state; a controller (ArgoCD, Flux) reconciles cluster state to match the repository.
- **Infrastructure as Code (IaC)**: Define infrastructure declaratively using Terraform, Pulumi, or CloudFormation — versioned, reviewed, and applied via pipelines.
- **Pipeline as Code**: Define CI/CD pipelines in YAML/code files stored in the repository (GitHub Actions, GitLab CI, Jenkinsfile).
- **Shift Left Security**: Integrate SAST, dependency scanning, and container scanning into CI — catch vulnerabilities before they reach production.
- **Artifact Promotion**: Build once, promote the same artifact through environments (Dev → Staging → Production) — prevents "works in staging" issues from environment differences.
- **Health Check Gates**: Before switching traffic in any deployment strategy, verify the new version passes health checks and smoke tests.

## Domain Concepts & Terminology

### CI/CD Concepts
- **Continuous Integration (CI)**: Developers integrate code frequently; automated build and test on every commit
- **Continuous Delivery (CD)**: Every commit is releasable; deployment to production is a manual decision
- **Continuous Deployment**: Every passing commit is automatically deployed to production
- **Artifact**: A versioned, immutable build output (Docker image, JAR file, binary) identified by SHA256 digest
- **Pipeline Stage**: A logical group of jobs (build, test, security scan, deploy) with clear pass/fail gates
- **Build Matrix**: Running the same pipeline across multiple combinations of OS, language version, or dependency version

### Container & Orchestration
- **Docker Image Layer Caching**: Ordering Dockerfile instructions from least-changed to most-changed maximizes cache hit rate
- **Multi-Stage Build**: Separating build toolchain from runtime image — reduces final image size by 5-20x
- **Kubernetes Deployment**: Declarative specification of desired pod replica count, image, and update strategy
- **Helm Chart**: Package manager for Kubernetes manifests — parameterized templates for environment-specific configuration
- **Rolling Update Strategy**: `maxUnavailable` and `maxSurge` control update speed vs. availability trade-off
- **Pod Disruption Budget (PDB)**: Minimum number of healthy pods during cluster maintenance or rolling updates

### Infrastructure as Code
- **Idempotency**: Applying the same Terraform plan multiple times produces the same result — essential for reliable infrastructure management
- **State File**: Terraform's record of the current infrastructure state; must be stored remotely (S3 + DynamoDB) and treated as sensitive
- **Resource Drift**: Infrastructure state that no longer matches the IaC definition — detected by `terraform plan`
- **Workspace**: Terraform mechanism for managing multiple environments (dev, staging, prod) from the same configuration
- **Module**: Reusable Terraform configuration component — encapsulates a set of related resources

### Deployment Strategies
- **Rollback**: Reverting to the previous stable version — always test rollback procedures before they're needed
- **Dark Launch**: Deploying code to production but routing zero traffic to it — validates deployment without user impact
- **Shadow Mode**: Running new version in parallel with old version, comparing responses without affecting users

## Anti-Patterns to Avoid

- **Snowflake Servers**: Manually configured, unique servers that cannot be reproduced — when they fail, recovery is a crisis.
- **Long-Lived Feature Branches**: Branches that diverge from main for weeks or months — causes painful merge conflicts and integration failures.
- **Manual Production Access**: Engineers making direct changes to production infrastructure without automation — bypasses review, approval, and audit trail.
- **Implicit Pipeline Dependencies**: Pipeline stages that require manual setup steps not captured in code — causes "works on my machine" failures in CI.
- **Missing Rollback Procedures**: Deploying without a tested, documented rollback plan — forces high-risk forward-only deployments under incident pressure.
- **Hardcoded Secrets in Pipelines**: API keys, passwords, or tokens in CI/CD YAML files or environment variables that appear in logs.
- **All-or-Nothing Deployments**: Deploying all services simultaneously rather than independently — maximizes blast radius and makes root cause analysis harder.

## Quality Indicators

- **Pipeline Pass Rate > 95%**: Percentage of CI runs that pass on the first attempt — flaky tests are a pipeline quality issue.
- **Deployment Frequency**: Number of deployments per day/week — DORA metric indicating delivery capability.
- **Mean Time to Restore (MTTR) < 1 Hour**: Average time to recover from a deployment-caused incident.
- **Change Failure Rate < 15%**: Percentage of deployments that require a rollback or hotfix — DORA metric.
- **Zero Manual Infrastructure Changes**: All infrastructure changes go through IaC pipelines — zero manual modifications to production.
- **Lead Time for Changes < 1 Day**: Time from code commit to production deployment — measures pipeline efficiency.
- **Rollback Time < 5 Minutes**: Time to roll back a bad deployment to the previous stable version.

## Collaboration Touchpoints

- **With Backend Developer**: Define what constitutes a successful health check and smoke test for each service; collaborate on structured logging format for observability.
- **With Sysadmin**: Coordinate on infrastructure provisioning handoffs — DevOps engineers automate what sysadmins previously did manually.
- **With Security Engineer**: Integrate SAST, container scanning, and secrets detection into pipelines; enforce image signing and provenance verification.
- **With QA Lead**: Define which test suites run at which pipeline stage; coordinate on test environment provisioning and data seeding.
