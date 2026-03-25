# Best Practices: Dependency Auditor

> Design principles, patterns, and frameworks that guide high-quality dependency security auditing, vulnerability detection, and package health assessment.

## Design Principles

- **CVE Awareness is Continuous**: Dependency vulnerabilities emerge continuously — auditing is not a one-time activity but an ongoing automated process with human escalation.
- **Severity-Based Triage**: Not all vulnerabilities require immediate action; prioritize by CVSS score, exploitability in context, and whether a fix exists.
- **Transitive Dependencies are Your Responsibility**: A vulnerability in a dependency of a dependency is still your problem — audit the full tree, not just direct dependencies.
- **License Compliance is Legal Risk**: Incompatible licenses (GPL in proprietary products, missing attribution) are a legal liability, not just a policy concern.
- **Minimize Dependency Surface**: The best dependency is one you don't have — evaluate whether each dependency justifies its security and maintenance risk.
- **Pinned Versions for Reproducibility**: Lock dependency versions in production (package-lock.json, poetry.lock, go.sum) to prevent unexpected updates introducing vulnerabilities.
- **Upgrade Cadence Beats Emergency Patches**: Teams with regular dependency upgrade cadences accumulate less vulnerability debt and respond to critical CVEs faster.

## Key Patterns & Frameworks

- **Software Composition Analysis (SCA)**: Automated scanning of dependency trees against vulnerability databases (NVD, GitHub Advisory, OSV) — tools: Snyk, Dependabot, OWASP Dependency-Check, Trivy.
- **CVE Triage Workflow**: For each finding: assess CVSS score → check if vulnerable code path is reachable → check if fix version exists → prioritize by business risk.
- **Dependency Update Automation**: Configure Dependabot or Renovate Bot to automatically open PRs for dependency updates — reviewed by humans before merge.
- **License Scanning**: Use FOSSA, LicenseChecker, or license-checker npm package to identify licenses across the dependency tree; flag GPL, AGPL, and SSPL for legal review.
- **Supply Chain Security (SLSA)**: Framework for hardening the software supply chain — verify provenance, integrity, and build process of dependencies.
- **Lockfile Integrity Check**: Verify that lockfiles (package-lock.json, yarn.lock, poetry.lock) are committed and unchanged between environments.
- **Pinned Container Images**: Reference container base images by SHA256 digest rather than mutable tags (`:latest`, `:stable`) to prevent supply chain substitution.
- **Vulnerability Suppression with Justification**: When a known vulnerability is not exploitable in context, suppress it with a documented justification and re-review date.
- **Transitive Dependency Audit**: Use `npm ls`, `pip-tree`, or `go mod graph` to surface the full dependency tree including transitive dependencies.
- **Security Patch SLA Enforcement**: Define and enforce response time targets by severity (Critical: 24h, High: 7d, Medium: 30d, Low: 90d).

## Domain Concepts & Terminology

### Vulnerability Databases
- **NVD (National Vulnerability Database)**: NIST-maintained authoritative CVE database with CVSS scores
- **GitHub Advisory Database**: GitHub's curated security advisories for open source packages
- **OSV (Open Source Vulnerabilities)**: Google-maintained vulnerability database covering multiple ecosystems
- **CVE (Common Vulnerabilities and Exposures)**: Standardized identifiers for known security vulnerabilities (format: CVE-YYYY-NNNNN)
- **CVSS (Common Vulnerability Scoring System)**: 0-10 score measuring severity: Critical (9.0-10.0), High (7.0-8.9), Medium (4.0-6.9), Low (0.1-3.9)

### Supply Chain Security
- **Software Bill of Materials (SBOM)**: Machine-readable inventory of all components in a software package (formats: SPDX, CycloneDX)
- **Dependency Confusion Attack**: Attacker publishes a malicious package with the same name as an internal package to a public registry
- **Typosquatting**: Malicious packages with names similar to popular packages (e.g., `lodash` → `1odash`)
- **Compromised Maintainer Attack**: Legitimate package's publisher account is compromised; malicious code injected into a new version
- **Pinning**: Specifying an exact version rather than a range to prevent automatic upgrades to potentially malicious versions
- **Provenance**: Cryptographic proof of where a package was built, by what process, and from what source

### License Categories
- **Permissive**: MIT, BSD, Apache 2.0 — use freely in commercial products with attribution
- **Copyleft (Weak)**: LGPL — library can be used in proprietary software; modifications to the library must be open-sourced
- **Copyleft (Strong)**: GPL v2/v3 — any software linking to GPL code must also be GPL
- **Network Copyleft**: AGPL, SSPL — copyleft extends to software used over a network; creates SaaS compliance obligations
- **Proprietary**: No redistribution or modification rights

### Package Health Metrics
- **Abandonment Risk**: No commits in > 12 months, no maintainers, no response to issues — indicates high risk
- **Bus Factor**: Number of contributors whose departure would critically affect maintenance — single-maintainer packages are high risk
- **Download Trends**: Declining download counts may indicate the ecosystem is moving away from the package

## Anti-Patterns to Avoid

- **Ignoring Transitive Vulnerabilities**: Only scanning direct dependencies while ignoring the full dependency tree — most vulnerabilities enter through transitive dependencies.
- **Suppressing Without Justification**: Disabling vulnerability alerts without documenting why the vulnerability is not exploitable in context — suppression without review accumulates unacknowledged risk.
- **Floating Version Ranges in Production**: Using `^1.0.0` or `~1.2` in production without lockfiles — allows automatic upgrades that could introduce vulnerabilities or breaking changes.
- **No License Scanning**: Shipping a product without knowing the licenses of all dependencies — creates legal exposure that surfaces during due diligence or acquisition.
- **One-Time Security Scan**: Running a dependency audit only at project start and never again — new vulnerabilities are disclosed continuously.
- **Alert Fatigue from Low Severity**: Treating all vulnerability alerts equally — engineers will start ignoring all alerts if low-severity findings flood the queue.
- **Delaying Critical Patches**: Treating Critical (CVSS 9+) CVEs the same as Medium — critical vulnerabilities need an expedited patch process.

## Quality Indicators

- **Zero Unaddressed Critical CVEs**: No known Critical CVSS vulnerabilities remain unpatched beyond the 24-hour SLA.
- **Dependency Audit in CI**: Every PR triggers an automated dependency scan; results block merge on Critical/High findings.
- **SBOM Generated per Release**: A machine-readable SBOM is generated and attached to every release artifact.
- **License Compliance Rate 100%**: All dependencies have reviewed and approved licenses in the FOSSA or equivalent license inventory.
- **Suppression Justifications Current**: Every suppressed vulnerability has a re-review date in the future and a documented rationale.
- **Lockfile Committed and Consistent**: Package lockfiles are committed to the repository and consistent between developer machines and CI.
- **Upgrade Cadence Maintained**: Non-security dependency updates are reviewed and applied on a defined schedule (e.g., weekly sprint task).

## Collaboration Touchpoints

- **With Security Engineer**: Escalate Critical and High CVEs for context on exploitability and prioritization; security engineer decides whether emergency patch or compensating control.
- **With Backend Developer / Frontend Developer**: Provide specific upgrade paths and migration guides alongside vulnerability reports — make the fix easy, not just visible.
- **With DevOps Engineer**: Coordinate on SBOM generation as part of the build pipeline and container image scanning as part of the CI/CD gate.
- **With Code Reviewer**: Surface new high-risk dependencies added in PRs before they merge — a dependency review should be part of code review for any `package.json` or `requirements.txt` change.
