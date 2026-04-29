# Best Practices: Marketing Ops Specialist

> Design principles, patterns, and frameworks that guide high-quality marketing operations, automation platform management, and data hygiene work.

## Design Principles

- **Simplicity in Workflows First**: Complex automation breaks in complex ways — build the simplest process that achieves the objective before adding sophistication
- **Data Flows Before Campaigns**: Clean, well-structured data in the CRM and MAP is the prerequisite for everything else — invest in the foundation before the programs
- **Document Everything You Build**: Undocumented workflows become time bombs when the builder leaves; every workflow needs a description, owner, and last-reviewed date
- **Lead Lifecycle Ownership**: Someone must own the definition, routing, and SLA for every stage from lead creation to closed/won — marketing ops holds the architecture
- **Platform as Leverage**: The marketing tech stack exists to multiply the output of human effort; evaluate every tool addition against this standard
- **Change Management for Process Changes**: Workflow changes without stakeholder communication create confusion and broken programs — announce changes before making them
- **Test in Sandbox, Deploy to Production**: Never test automation changes on live campaigns; every platform should have a test environment or record set

## Key Patterns & Frameworks

- **Lead Lifecycle Architecture**: Define every stage from anonymous visitor → lead → MQL → SAL → SQL → Opportunity → Customer with explicit entry/exit criteria, owner, and SLA at each transition
- **Lead Scoring Model Design**: Demographic/firmographic fit score (company size, industry, role) + behavioral engagement score (page visits, email clicks, content downloads, webinar attendance) → threshold = MQL
- **Lead Routing Rules Documentation**: Matrix of lead source × qualification criteria → assigned owner with SLA — prevents black-hole leads and sales complaints
- **Martech Stack Audit**: Quarterly review of all marketing technology tools against active usage, integration quality, data quality, and cost — identify overlap, gaps, and tools to deprecate
- **Data Hygiene Program**: Automated duplicate detection, bounce management, enrichment workflows, field standardization, and opt-out compliance — running continuously, not as a one-time cleanup
- **UTM Governance Framework**: Standardized naming conventions for source, medium, campaign, content, and term values — documented and enforced to maintain attribution integrity
- **Campaign Operations Checklist**: Pre-launch QA covering list targeting, workflow enrollment, email rendering, tracking links, CRM sync, and suppression lists — completed before every campaign launch
- **Field Naming Convention Standards**: Company-wide agreed field names, values, and data types for leads, contacts, accounts, and opportunities in both MAP and CRM — prevents data fragmentation
- **Integration Architecture Documentation**: Map of every API connection between marketing tech stack components, data flow direction, sync frequency, and field mappings — essential for troubleshooting
- **Performance Reporting Stack**: Weekly operational metrics (leads created, MQLs generated, campaign sends, deliverability) vs. strategic metrics (pipeline sourced, CAC, channel ROI) — two separate report types for different audiences

## Domain Concepts & Terminology

### Marketing Technology
- **MAP (Marketing Automation Platform)**: Software (HubSpot, Marketo, Pardot, ActiveCampaign) for email automation, lead management, and campaign execution
- **CRM (Customer Relationship Management)**: System of record for contacts, accounts, and opportunities (Salesforce, HubSpot CRM)
- **CDP (Customer Data Platform)**: Unified customer data repository that aggregates data from multiple sources for segmentation and activation
- **Integration / Connector**: Technical bridge between two software systems that syncs data bidirectionally or unidirectionally
- **API**: Application Programming Interface — the technical method by which systems exchange data programmatically
- **Webhook**: Event-driven data notification sent from one system to another when a specific action occurs

### Lead Management
- **Lead Source**: The channel or campaign that first created the lead record — critical attribution field
- **Lead Scoring**: A numerical model that rates leads on fit (who they are) and engagement (what they've done) to identify MQL threshold
- **MQL Threshold**: The minimum lead score (or explicit criteria) that triggers a lead to be routed to sales
- **Lead Routing**: The rules determining which sales rep or team receives each new MQL based on territory, segment, or round-robin assignment
- **Lead Decay**: The process of reducing or zeroing a lead score for contacts who stop engaging — prevents stale high-scores from triggering false MQLs
- **Suppression List**: Contacts excluded from campaign sends (current customers, competitors, unsubscribers, active opportunities)

### Data Quality
- **Duplicate Records**: Multiple CRM records representing the same individual or company — degrades reporting accuracy and creates sales confusion
- **Data Enrichment**: Automatically appending missing firmographic, technographic, or contact data from third-party providers
- **Field Standardization**: Enforcing consistent values in key fields (e.g., country names, job title normalization, industry codes)
- **GDPR / CCPA Compliance**: Data privacy regulations governing consent tracking, data access requests, and deletion requirements — marketing ops is responsible for technical compliance

## Anti-Patterns to Avoid

- **Undocumented Workflows**: Automation workflows without documentation are technical debt that becomes a crisis when someone needs to modify or debug them
- **Scoring Model Neglect**: Lead scoring models drift from reality as buyer behavior and product positioning change; without regular calibration, scores become meaningless
- **UTM Anarchy**: Multiple team members creating UTM parameters without a naming convention produces attribution data that can't be trusted for channel comparison
- **Over-Automated Nurture**: Enrolling every new lead in every available nurture track creates overlapping, contradictory email sequences and drives unsubscribes
- **No CRM Sync Monitoring**: Bidirectional CRM-MAP syncs fail silently; without monitoring, sync errors compound into data quality disasters
- **Tool Sprawl**: Adding new marketing technology without deprecating overlap creates integration complexity, data silos, and budget waste
- **Testing in Production**: Making workflow changes without a safe test environment risks breaking live campaigns and sending incorrect emails to active prospects

## Quality Indicators

- **Lead Routing SLA Compliance**: Percentage of MQLs assigned to sales within the agreed time window (e.g., < 1 hour for hot inbound)
- **Data Completeness Rate**: Percentage of lead records with all required fields populated (email, company, job title, lead source) — target > 90%
- **Duplicate Rate**: Percentage of CRM records identified as duplicates of other records — below 3% indicates healthy hygiene processes
- **MAP-CRM Sync Latency**: Average time for data changes in MAP to reflect in CRM and vice versa — flag any delays beyond 15 minutes
- **Campaign QA Pass Rate**: Percentage of campaigns that pass pre-launch checklist without critical errors
- **Workflow Documentation Coverage**: Percentage of active automation workflows with current documentation including owner, purpose, and last review date
- **Platform Utilization Score**: Feature usage relative to license capability — identifies overpaying for unused capabilities

## Collaboration Touchpoints

- **With Campaign Manager**: Campaign operations (list building, workflow setup, QA, launch) are co-owned; weekly pre-launch checklist reviews prevent costly errors
- **With Email Marketing Specialist**: ESP configuration, segmentation logic, and automation workflow design are built by ops but designed by the email specialist — close collaboration prevents design-build misalignment
- **With Revenue Operations Manager**: Marketing ops data must integrate cleanly with sales ops data; joint ownership of the CRM data model and field definitions prevents fragmentation
- **With Marketing Analyst**: Analytics dashboards require clean, well-structured data from the MAP and CRM; data model design decisions in ops directly affect analytical capability
- **With Demand Generation Manager**: Lead scoring, routing, and nurture program configurations are the operational backbone of demand gen strategy; changes require joint design sessions
