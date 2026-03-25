# Best Practices: Security Lead

> Design principles, patterns, and frameworks that guide high-quality security team coordination, threat modeling, and organizational security posture.

## Design Principles

- **Security Enables Business**: Security controls that block business capability without proportional risk reduction are failures — the goal is managed risk, not zero risk.
- **Threat-Led Security**: Security priorities should be driven by realistic threat models, not compliance checklists — understand your actual adversaries.
- **Build a Security Culture**: Sustainable security comes from developers who think about security, not from a security team that reviews everything — invest in enablement.
- **Risk is the Common Language**: Communicate security findings as business risk (impact, likelihood, cost to remediate) not as technical CVEs — executives make better decisions with risk framing.
- **Assume Breach, Design for Response**: Perfect prevention is impossible; invest proportionally in detection and response capability — visibility is as valuable as prevention.
- **Compliance is the Floor, Not the Ceiling**: Regulatory compliance (SOC 2, PCI-DSS, GDPR) establishes minimum requirements; actual security requires going further.
- **Shift Left, Continuously**: Security reviews at the end of development are expensive and slow; embed security thinking in design, code review, and CI.

## Key Patterns & Frameworks

- **Security Development Lifecycle (SDL)**: Microsoft's framework for embedding security at each development phase — requirements (security requirements), design (threat model), implementation (secure coding), verification (SAST/DAST/pen test), release (final security review), response (incident management).
- **Threat Modeling (STRIDE + DREAD)**: Systematically identify threats at every architecture boundary; prioritize by DREAD score for remediation planning.
- **Security Champion Program**: Embed security-minded engineers within each product team — scales security review capacity without scaling the security team linearly.
- **Vulnerability Management Program**: Standardized process for CVE discovery, severity classification, SLA enforcement, and remediation tracking — metrics reported monthly.
- **Penetration Test Program**: Annual external pen test + quarterly internal red team exercises — scope covers web apps, APIs, infrastructure, and social engineering.
- **Security Incident Response Plan**: Documented playbooks for each incident class (data breach, credential compromise, ransomware, DDoS) — tested via tabletop exercises.
- **Security Training Curriculum**: Mandatory secure coding training for all engineers; role-specific training for security champions, DevOps, and leads.
- **AppSec Feedback Loop**: Security findings from pen tests, bug bounty, and SAST tools feed back into developer training and coding standards.
- **Third-Party Risk Assessment**: Vendor security questionnaires, SOC 2 review, and data flow analysis for all software vendors handling sensitive data.
- **Bug Bounty Program**: Managed vulnerability disclosure program — provides continuous external security research with defined scope and reward structure.

## Domain Concepts & Terminology

### Security Frameworks
- **NIST Cybersecurity Framework**: Identify, Protect, Detect, Respond, Recover — comprehensive framework for organizational security posture
- **MITRE ATT&CK**: Taxonomy of real-world adversary tactics, techniques, and procedures — used for threat modeling and detection engineering
- **CIS Controls**: 18 prioritized security controls; Implementation Group 1 (basic) to Group 3 (advanced)
- **SOC 2**: Service Organization Control 2 — audit standard for security, availability, processing integrity, confidentiality, privacy
- **ISO 27001**: International standard for information security management systems

### Compliance
- **PCI-DSS**: Payment Card Industry Data Security Standard — for organizations handling cardholder data
- **GDPR**: EU General Data Protection Regulation — governs personal data of EU residents
- **HIPAA**: Health Insurance Portability and Accountability Act — US healthcare data protection
- **SOX**: Sarbanes-Oxley — financial reporting controls for public companies; affects IT systems supporting financial reporting

### Penetration Testing
- **Black Box Testing**: Testing without prior knowledge of the system — simulates an external attacker
- **White Box Testing**: Full access to source code, architecture, and documentation — most comprehensive coverage
- **Gray Box Testing**: Partial knowledge (user-level credentials, high-level architecture) — simulates a compromised insider
- **Scope Definition**: Explicit agreement on what systems, IP ranges, attack vectors, and timeframes are in scope for testing
- **Rules of Engagement**: Legal authorization document defining constraints — written authorization required before any testing begins

### Incident Response
- **CSIRT (Computer Security Incident Response Team)**: Organizational unit responsible for security incident response
- **Incident Classification**: Severity levels (P1: active breach, P2: suspected breach, P3: significant vulnerability, P4: low-risk finding)
- **Chain of Custody**: Documentation of evidence handling for potential legal proceedings
- **Forensic Investigation**: Evidence-preserving analysis of compromised systems to determine scope and root cause
- **Breach Notification**: Legal obligation to notify affected parties within specified timeframes (GDPR: 72 hours)

### Security Metrics
- **Mean Time to Detect (MTTD)**: Average time from breach to detection — target < 24 hours
- **Mean Time to Respond (MTTR)**: Average time from detection to containment
- **Vulnerability Age**: How long known vulnerabilities persist unpatched — drives SLA enforcement
- **Security Debt**: Accumulation of unaddressed security findings — tracked in the vulnerability register

## Anti-Patterns to Avoid

- **Security Theater**: Implementing controls that look good on a compliance checklist but don't reduce actual risk — wastes resources and creates false confidence.
- **Security as a Gate**: Treating security review as a final approval step that blocks delivery — creates adversarial dynamics; integrate security throughout.
- **Compliance-as-Security**: Treating SOC 2 or PCI-DSS compliance as equivalent to being secure — compliance is a minimum bar, not a security strategy.
- **Vulnerability Count as KPI**: Measuring security performance by vulnerability count rather than risk exposure or time-to-remediate — incentivizes not finding vulnerabilities.
- **Missing Incident Response Rehearsal**: Having an incident response plan that has never been tested — under pressure, untested plans fail at the worst moments.
- **Centralized Security Bottleneck**: Requiring every security decision to go through the security team — doesn't scale; invest in champions and enablement.
- **Ignoring Insider Threats**: Focusing entirely on external threats while neglecting privileged access abuse, credential theft, and social engineering.

## Quality Indicators

- **Zero P1/P2 Security Incidents**: No active breaches or suspected breaches in the past quarter.
- **Critical Vulnerabilities Patched Within SLA**: 100% of Critical CVEs patched within 24 hours; High CVEs within 7 days.
- **Pen Test Findings Remediated**: All Critical/High findings from annual pen test resolved within 90 days.
- **Security Champion Coverage**: At least one trained security champion in every product engineering team.
- **MFA Adoption 100%**: All employees use MFA on all company accounts — measured via identity provider.
- **Incident Response Plan Exercised**: Tabletop exercise conducted within the past 6 months for each major incident class.
- **SAST/DAST in CI for All Services**: All production services have automated security scanning in their CI pipeline.

## Collaboration Touchpoints

- **With Security Engineer**: Provide threat models and prioritized finding lists; security engineers implement the controls and validate mitigations.
- **With Engineering Manager**: Translate security findings into business risk language; recommend go/no-go on releases with significant unmitigated security findings.
- **With DevOps Lead**: Embed security controls into the CI/CD pipeline — SAST, DAST, container scanning, secrets detection, and image signing.
- **With Architect**: Review every new architectural boundary for trust zone transitions; security requirements must inform architecture decisions, not be retrofit.
