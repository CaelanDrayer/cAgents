# Best Practices: IT Support Specialist

> Design principles, patterns, and frameworks that guide high-quality technical support, incident resolution, and user enablement.

## Design Principles

- **Diagnose Before Fixing**: Understand the root cause before applying a solution — treating symptoms without root cause analysis leads to recurring incidents.
- **Document Everything**: Every resolution becomes a knowledge base article — the second person with the same problem should find the answer, not wait for support.
- **Communicate Proactively**: Users waiting in silence assume nothing is happening — provide updates even when there's no resolution yet.
- **Least Privilege for Access**: Never grant more access than the minimum required for the user's role — access creep is a security risk that accumulates over time.
- **Reproducibility is Diagnosis**: If you can reproduce the problem, you understand it well enough to fix it — reproduction steps are the first goal.
- **Standardize the Environment**: Consistent development environments reduce support load dramatically — invest in environment standardization to reduce ticket volume.
- **User Empowerment**: Teach users to handle common issues themselves via self-service resources — reduces repeat tickets and builds user confidence.

## Key Patterns & Frameworks

- **Incident Triage Matrix**: Classify tickets by severity (P1: blocking all work, P2: major impact, P3: partial impact, P4: low impact) and urgency (SLA-driven response times).
- **Structured Troubleshooting (OSI-Style)**: For network issues, work from physical layer upward (cable → switch → router → DNS → application) — prevents jumping to complex explanations before checking simple ones.
- **Five Whys Root Cause Analysis**: For recurring issues, drill down from symptom to root cause by asking "why" five times — surfaces systemic problems vs. isolated incidents.
- **Known Error Database (KEDB)**: Catalog of known bugs with their workarounds — enables fast resolution without diagnosis for recurring issues.
- **Self-Service Portal**: User-facing knowledge base with searchable articles, FAQs, and guided troubleshooting wizards — diverts tier-1 tickets.
- **Ticket Categorization Taxonomy**: Consistent categorization (hardware, software, network, access, account) enables accurate volume trending and staffing decisions.
- **Change Management Integration**: Link support tickets to change management records — correlate incident spikes with recent changes for faster root cause identification.
- **Remote Diagnosis Checklist**: Structured questions before asking users to reproduce issues — get logs, screenshots, error messages, and steps to reproduce before scheduling a call.
- **Escalation Path Definition**: Clear criteria for when to escalate (time exceeded, complexity exceeded, domain expertise required) — prevents tickets stalling at the wrong tier.
- **SLA Tracking and Reporting**: Monitor first-response time, resolution time, and SLA breach rate — visibility drives accountability and staffing decisions.

## Domain Concepts & Terminology

### ITIL Framework
- **Incident**: Unplanned interruption or reduction in quality of an IT service
- **Problem**: Root cause of one or more incidents — problem management is the process of identifying and resolving root causes
- **Change**: Addition, modification, or removal of anything that could affect IT services
- **Service Request**: Formal request from a user for something to be provided (password reset, software install)
- **Configuration Item (CI)**: Any component that needs to be managed to deliver a service (server, laptop, software license)
- **CMDB (Configuration Management Database)**: Repository of CI data and relationships

### Ticket Management
- **First Response Time (FRT)**: Time between ticket creation and the first meaningful response — key SLA metric
- **Resolution Time**: Time from ticket creation to closure — MTTR at the support level
- **First Call Resolution (FCR)**: Percentage of tickets resolved on the first contact without escalation — higher is better
- **Reopen Rate**: Percentage of closed tickets reopened by the user — high rate indicates premature closure
- **Escalation Rate**: Percentage of tickets escalated to tier 2/3 — should decrease as knowledge base grows

### Common Technical Domains
- **Active Directory / LDAP**: Directory services for user authentication and authorization management
- **DNS**: Domain Name System — the most common cause of "it's not working" for network issues
- **DHCP**: Dynamic Host Configuration Protocol — automatically assigns IP addresses; lease expiry causes connectivity issues
- **VPN**: Virtual Private Network — remote access; split tunnel vs. full tunnel configurations
- **MDM (Mobile Device Management)**: Centralized management for mobile and desktop devices (Jamf, Intune, Kandji)
- **SSO (Single Sign-On)**: Authentication that grants access to multiple systems with one credential (Okta, Azure AD, Google Workspace)

### Development Environment Support
- **PATH Variable**: System variable listing directories searched for executable commands — common source of "command not found" errors
- **Environment Variables**: Configuration values passed to processes — `.env` files for local development
- **Package Manager**: Tool managing software dependencies (npm, pip, brew, apt) — version conflicts are common support scenarios
- **Port Conflict**: Two processes attempting to bind the same TCP port — resolve with `lsof -i :PORT` or `netstat`
- **Permissions**: File and directory access control — `chmod`, `chown` on Linux/macOS; ACLs on Windows

## Anti-Patterns to Avoid

- **Closing Without Resolution**: Marking a ticket resolved before verifying with the user that the issue is actually fixed — inflates FCR metrics while degrading user experience.
- **Tribal Knowledge Hoarding**: Resolving issues without documenting solutions — creates single points of failure and prevents self-service.
- **Symptom-Only Treatment**: Restarting a service to clear an error without investigating why it crashed — the same issue recurs next week.
- **Access Inflation**: Granting elevated permissions for temporary needs without removing them afterward — security risk accumulates over time.
- **Missing Escalation Criteria**: Working a ticket past its SLA without escalating — unclear escalation triggers cause SLA breaches.
- **Ignoring Ticket Volume Trends**: Treating every ticket as isolated rather than analyzing patterns — recurring issues should trigger problem management, not repeated incident resolution.
- **Reactive-Only Mode**: Only responding to tickets without proactive monitoring — problems should be detected before users notice them.

## Quality Indicators

- **First Response SLA Adherence**: Percentage of tickets receiving first response within the agreed time per priority level — target > 95%.
- **First Call Resolution Rate**: Percentage of tickets resolved on first contact — target > 70% for tier-1 tickets.
- **Knowledge Base Article Coverage**: Percentage of ticket categories with at least one self-service article — growing coverage reduces ticket volume.
- **SLA Breach Rate < 5%**: Percentage of tickets that exceed resolution time SLA.
- **User Satisfaction Score > 4/5**: Post-ticket survey score — measures quality of resolution and communication.
- **Recurring Incident Rate Trending Down**: Percentage of tickets that are reopened versions of previously resolved issues — measures knowledge base and root cause effectiveness.
- **Mean Time to Detect (MTTD)**: How quickly proactive monitoring detects issues before users report them — lower is better.

## Collaboration Touchpoints

- **With Sysadmin**: Escalate infrastructure-level issues (server outages, network configuration, storage failures) with full diagnostic information collected during triage.
- **With DevOps Engineer**: Report recurring development environment issues that indicate missing automation or inconsistent tooling — these should become platform improvements.
- **With Security Engineer**: Report any ticket involving potential security incidents (suspected account compromise, unusual access patterns) immediately — security incidents need expedited escalation.
- **With Backend Developer**: Report application errors with full context (log excerpts, reproduction steps, user impact) — make it easy for developers to reproduce and diagnose.
