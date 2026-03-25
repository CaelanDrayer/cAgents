# Best Practices: Technical Support Engineer

> Design principles, patterns, and frameworks that guide high-quality technical escalation support, log analysis, and engineering coordination work.

## Design Principles

- **Reproduce Before Concluding**: Never accept a bug report or diagnose a root cause without first reproducing the issue; unreproduced issues lead to wrong conclusions and wasted engineering time
- **Evidence Over Assumptions**: Base every technical conclusion on observable evidence — logs, error traces, metrics, and reproduction steps — not on what "should" be happening
- **Systematic Investigation**: Resist the impulse to jump to the most familiar explanation; use structured investigation methods that consider multiple hypotheses before converging on a conclusion
- **Customer Impact Translation**: When escalating to engineering, always translate technical findings into customer business impact; engineering prioritization requires understanding who is affected and how severely
- **Workaround First, Fix Second**: While root cause investigation proceeds, find a workaround to restore customer function; customers in pain can't wait for a permanent fix to be released
- **Documentation as Product Contribution**: Every bug report, runbook, and investigation note contributes to team knowledge and engineering efficiency; write them as if the next person is equally capable but lacks your current context
- **Security-First Triage**: Any issue that might involve a security vulnerability, data exposure, or authentication bypass requires immediate priority escalation regardless of apparent severity

## Key Patterns & Frameworks

- **Investigation Framework (Gather → Reproduce → Analyze → Solve → Validate → Document)**: Six-stage workflow from initial context collection through customer-confirmed resolution and KB documentation
- **Five-Layer Diagnostic Stack**: Application (errors, logic) → Platform (configuration, integrations) → Database (queries, locks, connectivity) → Network (DNS, load balancer, SSL) → Infrastructure (compute, storage, memory); investigate systematically from application layer down
- **Log Analysis Protocol**: Identify the relevant log sources → filter to the relevant time window → search for error patterns → trace request IDs across service boundaries → correlate with metrics spikes
- **Bug Report Template**: Title (one-line summary) → Severity (P1-P4 with rationale) → Customer Impact (who, how many, business consequence) → Reproduction Steps (exact environment, steps, inputs) → Expected vs. Actual behavior → Evidence (logs, screenshots, trace IDs) → Root Cause Hypothesis
- **Severity Classification Matrix**: P1 (complete service unavailable, data loss, security breach — 30-minute response, immediate engineering escalation) → P2 (major functionality broken, significant users affected — 2-hour response) → P3 (non-critical feature broken, workaround available — 8-hour response) → P4 (cosmetic, minor inconvenience — next sprint)
- **Hypothesis Testing Loop**: Form hypothesis about root cause → design test that would confirm or refute it → run test → evaluate result → refine or confirm hypothesis → repeat until confident; prevents thrashing between random fixes
- **Engineering Escalation Decision Framework**: Escalate when: reproducible with clear evidence, no viable workaround, customer-visible impact, clear product defect (vs. misconfiguration or user error)
- **Runbook Development Pattern**: For every recurring technical issue, write a runbook with the investigation checklist, common causes, diagnostic steps, and resolution options; builds team knowledge faster than individual expertise

## Domain Concepts & Terminology

### Investigation & Debugging
- **Root Cause**: The fundamental reason an issue occurred; distinct from symptoms, which are what is observed
- **Reproduction**: Replicating the exact conditions under which an issue occurs in a controlled environment
- **Minimal Reproducible Example**: The simplest version of a problem that still exhibits the issue; strips away irrelevant complexity
- **Correlation vs. Causation**: Two events happening together doesn't mean one caused the other; investigation must establish a mechanism
- **Race Condition**: Bug that occurs only when events happen in a specific timing sequence; difficult to reproduce
- **Edge Case**: Situation outside normal operating parameters that reveals unexpected behavior

### Technical Domains
- **API**: Application Programming Interface; layer where external systems interact with the product
- **Webhook**: HTTP callback from the system to an external URL when an event occurs; common source of integration issues
- **OAuth**: Authorization protocol for third-party application access; authentication failures are common support issues
- **TLS/SSL Certificate**: Certificate enabling encrypted HTTPS connections; expiration causes connection failures
- **DNS (Domain Name System)**: System translating domain names to IP addresses; misconfiguration causes connectivity failures
- **Load Balancer**: Traffic distribution system; misconfigurations can cause intermittent failures or incorrect routing
- **Database Deadlock**: Situation where two transactions each hold locks the other needs; typically resolves but may require query optimization

### Log Analysis
- **Log Level**: Classification of log entry severity — DEBUG, INFO, WARN, ERROR, CRITICAL
- **Stack Trace**: Sequence of function calls captured at the point of an error; critical for identifying the location of a bug
- **Request ID / Trace ID**: Unique identifier attached to a request that allows tracing it across multiple services and log sources
- **Error Rate**: Percentage of requests resulting in errors; spike indicates a problem
- **Latency Percentile**: P50/P95/P99 distribution of response times; P99 reveals tail latency issues that affect the worst-affected users

### Escalation
- **Engineering Escalation**: Formal handoff of a reproducible product defect to the engineering team with complete documentation
- **Hot Fix**: Emergency code deployment to resolve a critical production issue; bypasses normal release cycle
- **Rollback**: Reverting to a previous version of software to resolve a regression introduced in a recent deployment
- **Postmortem**: Post-incident review of what happened, why, and what changes prevent recurrence

## Anti-Patterns to Avoid

- **Diagnosing Without Reproducing**: Drawing root cause conclusions from customer-reported symptoms without reproducing the issue in a controlled environment; leads to wrong hypotheses and wasted engineering cycles
- **Premature Escalation**: Sending incomplete bug reports to engineering without reproduction steps, relevant logs, or severity assessment; wastes engineering time and undermines credibility
- **Over-Escalation**: Escalating configuration issues, user errors, or known limitations as product bugs; pollutes the engineering bug queue with non-defects
- **Workaround as Resolution**: Providing a workaround without also documenting and escalating the underlying product bug; the bug remains and will recur for other customers
- **Security Deprioritization**: Treating potential security vulnerabilities as normal P3/P4 issues; security issues require immediate escalation regardless of apparent customer impact scope
- **Investigation Without Documentation**: Resolving a complex technical issue without writing a runbook or KB article; the next occurrence requires the same investigation from scratch
- **Jargon-Heavy Customer Communication**: Explaining technical root causes to customers using engineering terminology; translate to business impact and timeline

## Quality Indicators

- **Reproduction Rate**: Percentage of escalated bugs that include confirmed reproduction steps; high rate indicates investigation quality
- **Engineering Escalation Acceptance Rate**: Percentage of escalated bugs confirmed as product defects (vs. returned as user error or misconfig); high rate indicates accurate triage
- **Customer Workaround Provision**: Percentage of P1/P2 tickets where a functional workaround was provided while permanent fix is in development
- **Resolution Documentation Rate**: Percentage of novel technical issues resulting in a new runbook or KB article
- **Escalation Completeness**: All escalations include severity, reproduction steps, customer impact, evidence, and root cause hypothesis
- **Time to Reproduction**: Average time from ticket intake to confirmed reproduction; measures investigation efficiency
- **Ticket Accuracy**: Percentage of technical conclusions that hold up under engineering review; measures diagnostic quality

## Collaboration Touchpoints

- **With Customer Support Rep**: Receive tier 2 escalations with initial context; provide clear communication back to CSR about status and workarounds so they can update the customer
- **With Escalation Manager**: Coordinate on critical customer escalations — TSE owns the technical investigation while escalation manager owns customer communication and cross-functional coordination
- **With Backend Developer / Engineering**: Deliver complete bug reports with reproduction steps and evidence; receive status updates on fix timelines to communicate to customers
- **With Knowledge Base Manager**: Contribute technical troubleshooting articles from resolved investigation cases; TSE expertise is the highest-value source for complex troubleshooting KB content
