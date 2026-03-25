# Best Practices: Customer Support Representative

> Design principles, patterns, and frameworks that guide high-quality front-line customer support work.

## Design Principles

- **Resolution Over Deflection**: The goal is to solve the customer's problem, not to close the ticket; deflection without resolution drives repeat contacts and destroys satisfaction
- **Understand Before Answering**: Confirm understanding of the issue before proposing a solution; misdiagnosis is the leading cause of wrong answers and repeat contacts
- **Empathy First, Solution Second**: Acknowledge the customer's frustration before diving into troubleshooting; customers who feel heard are more cooperative and more satisfied
- **Documentation Drives Efficiency**: A well-documented ticket is fast to pick up, accurate to escalate, and valuable for knowledge base improvement; invest the 30 extra seconds
- **Escalation Is Not Failure**: Knowing when to escalate efficiently is a skill, not a gap; holding a complex ticket too long to avoid escalation harms the customer
- **Consistent Knowledge Application**: Use the knowledge base consistently; inconsistent answers across agents destroy customer trust and make root cause analysis impossible
- **Follow-Through on Commitments**: If you say you'll follow up, follow up; broken commitments undermine trust more than any technical failure

## Key Patterns & Frameworks

- **Incident Triage Framework**: Assess every incoming ticket against four dimensions: urgency (how time-sensitive?), impact (how many users/systems affected?), complexity (can this be resolved at L1?), and emotion (how distressed is the customer?); these four dimensions drive resolution priority and path
- **AHT (Average Handle Time) Discipline**: The fastest path to resolution is correct the first time; spending extra time understanding the issue before answering saves total time more often than it costs
- **Knowledge Base First Workflow**: Before composing any response, search the KB; answering from memory rather than documented procedures creates inconsistency and errors
- **CSAT Timing and Framing**: Request CSAT feedback immediately after confirming resolution, not during troubleshooting; framing the request as "Was I able to help today?" rather than "Rate us" improves response rates
- **Ticket Categorization Protocol**: Tag every ticket with issue type, product area, root cause, and resolution method at close; categories feed analytics, KB gaps, and engineering bug reports
- **Warm Escalation Standard**: Always brief the next tier on issue context, steps already attempted, and customer emotional state before transferring; cold escalations frustrate customers and waste expert time
- **FCR (First Contact Resolution) Mindset**: Design every support interaction to resolve completely in one contact; FCR is the single metric most correlated with customer satisfaction and support efficiency

## Domain Concepts & Terminology

### Support Metrics
- **First Contact Resolution (FCR)**: Percentage of tickets resolved without requiring a follow-up contact; target >70%
- **Average Handle Time (AHT)**: Total time from ticket open to close; target varies by complexity tier
- **CSAT (Customer Satisfaction Score)**: Post-interaction rating; target >4.5/5
- **Quality Score**: Internal evaluation score from quality review of ticket handling; target >95%
- **Reopen Rate**: Percentage of closed tickets reopened by the customer; indicator of resolution quality
- **Response Time (SLA)**: Time from ticket creation to first agent response; defined in SLA agreement

### Ticket Lifecycle
- **Intake**: Receipt and initial review of a new support request
- **Triage**: Assessment of urgency, complexity, and correct tier for the ticket
- **Acknowledgment**: First response confirming receipt and confirming understanding of the issue
- **Troubleshooting**: Systematic investigation of the issue using documented procedures
- **Resolution**: Confirmed fix or workaround that resolves the customer's problem
- **Escalation**: Transfer of a ticket to a higher tier with full context
- **Closure**: Formal closing of the ticket after resolution confirmation

### Troubleshooting Methods
- **Symptom → Cause → Solution**: Three-step troubleshooting path from observed symptom to root cause to corrective action
- **Reproduction**: Attempting to replicate the issue in a test environment to confirm the root cause
- **Isolation Testing**: Systematically eliminating variables (browser, network, account settings) to isolate the source of the issue
- **Known Issue Check**: Verifying whether the reported issue matches a documented known issue with an existing workaround or fix in progress

### Customer Communication
- **Empathy Statement**: Acknowledgment of the customer's frustration before presenting troubleshooting steps
- **Status Update**: Proactive communication on ticket progress when resolution is taking longer than expected
- **Resolution Confirmation**: Explicit check with the customer that the solution resolved their issue before closing
- **Escalation Notice**: Communication to the customer that their issue is being transferred to a specialized team

## Anti-Patterns to Avoid

- **Solution Before Understanding**: Providing a solution before confirming understanding of the exact issue; leads to wrong answers, frustrated customers, and repeat contacts
- **Copy-Paste Knowledge Base**: Pasting entire KB articles into ticket responses without framing, personalization, or confirmation that the article addresses the specific situation
- **Holding Escalatable Tickets**: Keeping tickets that belong at a higher tier too long to avoid the escalation; delays resolution and harms the customer
- **Closing Without Confirmation**: Closing a ticket after sending a resolution without confirming the customer successfully applied it; drives reopen rate up
- **Vague Categorization**: Tagging tickets as "general" or "other" rather than specific issue types; ruins analytics quality and makes knowledge base gap analysis impossible
- **Emotional Reactivity**: Matching a frustrated customer's emotional tone; responding to rudeness with defensiveness or coldness escalates rather than de-escalates
- **Commitment Without Follow-Through**: Promising a follow-up, callback, or specific action by a deadline and missing it; broken commitments damage trust more than slow resolution

## Quality Indicators

- **FCR >70%**: Most tickets resolved without follow-up contact
- **CSAT >4.5/5**: High post-interaction satisfaction
- **Quality Score >95%**: Internal QA reviews confirm consistent adherence to procedures
- **Response Time Within SLA**: First-response SLA met consistently
- **Zero Missed Follow-Up Commitments**: All committed follow-ups delivered on time
- **Ticket Categorization Completeness**: All tickets categorized with issue type, root cause, and resolution method at close
- **Reopen Rate <5%**: Tickets are resolved correctly the first time

## Collaboration Touchpoints

- **With Technical Support Engineer**: Escalate complex technical issues with full context — symptoms, reproduction steps, environment details, and steps already attempted; a complete escalation package saves significant time
- **With Knowledge Base Manager**: Surface recurring questions that lack KB articles or have outdated answers; front-line support sees knowledge gaps first
- **With Support Supervisor**: Escalate customer-requested supervisor contacts and time-sensitive issues; flag emerging issue patterns in team huddles
- **With Chat Support Specialist**: Coordinate handoffs between async and real-time channels; customers who start in chat and escalate to ticket need seamless context transfer
