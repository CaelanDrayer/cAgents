# Best Practices: Sales Ops Specialist

> Design principles, patterns, and frameworks that guide high-quality CRM administration, sales process optimization, and pipeline hygiene work.

## Design Principles

- **The CRM is the System of Record, Not a Reporting Tool**: Every deal, contact, and activity should live in the CRM — not in spreadsheets, email, or personal notes
- **Process Before Configuration**: Define the ideal sales process before building it in the CRM; building in a system before the process is designed creates expensive rework
- **Reps Should Spend Time Selling, Not Administrating**: Every CRM friction point that slows data entry is a tax on revenue-generating time — minimize it
- **Forecast Integrity Requires Data Discipline**: Accurate forecasts depend on accurate opportunity data; enforce data standards with automation, not hope
- **Changes Require Communication**: CRM workflow changes, new field requirements, or process updates announced without training and lead time create confusion and adoption failure
- **Automation Serves Accuracy, Not Quantity**: Automate data entry, routing, and reminders to reduce errors; don't automate for the sake of automation
- **Territory Design is a Revenue Decision**: How territory is carved determines sales coverage, rep motivation, and revenue potential — treat it as strategic, not administrative

## Key Patterns & Frameworks

- **CRM Architecture Review**: Annual review of object model (lead, contact, account, opportunity, activity), field utilization, workflow performance, and technical debt accumulation — prevents configuration decay
- **Sales Process Stage Gate Definitions**: For each pipeline stage, define: entry criteria, required fields, maximum time to next stage, and owner actions — codified in CRM as validation rules
- **Territory Design Framework**: Segmentation criteria (geo + firmographic), coverage model (named accounts vs. geographic), quota distribution methodology, and conflict resolution rules — documented before territory assignment
- **Quota Setting Methodology**: Historical attainment analysis + market opportunity data + rep ramp status + headcount plan → bottoms-up quota model reviewed with sales leadership
- **Pipeline Hygiene Enforcement**: Automated alerts for stale opportunities (no activity in 14 days), past close dates, and missing required fields — reduces manual cleanup work
- **CRM Adoption Monitoring**: Tracking login frequency, activity logging rate, and field completion rates by rep — identifies low adoption before it becomes a data quality crisis
- **Lead Routing Rules Documentation**: Matrix of lead qualification criteria × territory assignment × round-robin rules — changes require version control and communication before deployment
- **Sales Report Library**: Standardized report set for weekly forecast review, monthly performance analysis, and quarterly business review — consistent definitions and filters across all reports
- **Change Request Protocol**: Structured process for sales team CRM change requests — description, business justification, stakeholders affected, implementation estimate — prevents undocumented ad hoc configuration
- **Rep Onboarding CRM Training**: Standardized module covering lead management, opportunity hygiene, required fields, activity logging, and forecasting — delivered in first week, retested at 90 days

## Domain Concepts & Terminology

### CRM Operations
- **CRM (Customer Relationship Management)**: The platform (Salesforce, HubSpot) that serves as the system of record for all sales activity, pipeline, and customer data
- **Object Model**: The data structure of the CRM — the relationship between leads, contacts, accounts, opportunities, and custom objects
- **Workflow / Process Automation**: Automated CRM actions triggered by data changes (e.g., auto-assign lead based on territory, send alert when opportunity is past close date)
- **Validation Rule**: CRM logic that prevents saving a record unless specified conditions are met — enforces data quality at the point of entry
- **Custom Object**: A CRM data structure created for business-specific needs beyond the standard objects
- **Report and Dashboard**: Sales performance visibility tools built on CRM data — must use consistent field definitions to be trustworthy

### Sales Process
- **Pipeline Stage**: A defined point in the sales cycle with entry/exit criteria and a conversion rate — the building block of a sales pipeline model
- **Opportunity**: A qualified deal being actively worked toward a purchase decision — has a value, close date, and stage
- **Pipeline Hygiene**: The practice of keeping opportunity data accurate, current, and stage-appropriate to produce trustworthy forecasts
- **Activity Log**: Record of all calls, emails, and meetings associated with an opportunity — required for coaching and deal review
- **Close Date**: The projected date when an opportunity is expected to close — must be realistic, not aspirational

### Territory & Quota
- **Territory**: The defined set of accounts, contacts, or geography assigned to a specific rep or team
- **Quota**: The revenue target assigned to a rep or team for a given period
- **SPIFs (Sales Performance Incentive Funds)**: Short-term incentive bonuses for specific behaviors or products — configured in CRM for tracking
- **Ramp**: The period during which a new rep is building toward full quota attainment — often included in quota modeling

## Anti-Patterns to Avoid

- **Multiple Systems of Record**: Allowing spreadsheets, shared drives, and CRM to all hold "authoritative" deal data creates version conflicts and reporting inconsistency
- **Unrestricted Admin Access**: Multiple people with unchecked CRM admin permissions creating ad hoc fields, workflows, and reports produces a configuration disaster over time
- **No Change Control Process**: Undocumented CRM changes break downstream reports and workflows without a paper trail for diagnosis
- **Too Many Required Fields**: Over-engineering required field validation makes the CRM burdensome to use, driving reps to enter junk values to pass validation
- **Stale Report Library**: Reports built for one business context that accumulate and never get retired create confusion about which version of the truth is correct
- **Territory Changes Without Process**: Changing territories mid-year without a clear protocol for opportunity ownership transition creates commission disputes and CRM confusion
- **Configuration Debt Accumulation**: Adding fields, workflows, and automation without ever removing obsolete ones creates a CRM that's slow, confusing, and expensive to maintain

## Quality Indicators

- **Opportunity Data Completeness**: Percentage of open opportunities with required fields populated (close date, stage, next step, ARR) — target > 90%
- **CRM Activity Logging Rate**: Percentage of sales calls and meetings logged as activities in CRM — below 70% indicates process or adoption issues
- **Pipeline Hygiene Score**: Percentage of opportunities without stage-specific hygiene issues (stale activity, past close dates, missing required fields)
- **Forecast Accuracy**: Month-end and quarter-end forecast vs. actual — influenced by CRM data quality and process discipline
- **CRM Adoption Rate**: Percentage of reps logging in and updating records at the frequency required by the sales process
- **Change Deployment Success Rate**: Percentage of CRM changes that deploy without rework due to insufficient testing or stakeholder communication
- **Report Usage**: Are sales managers actively using standardized reports in team meetings, or building one-off spreadsheet versions?

## Collaboration Touchpoints

- **With Revenue Operations Manager**: RevOps sets the GTM architecture and data model; sales ops configures and administers the CRM implementation within that framework — clear scope boundaries prevent duplication
- **With Sales Analyst**: Sales analyst designs the reports and analyses; sales ops builds and maintains the CRM infrastructure those analyses run on — co-own data model quality
- **With Sales Enablement Specialist**: CRM training is part of onboarding; sales ops owns the tool training component while enablement owns the process and methodology components
- **With Marketing Ops Specialist**: Lead routing between MAP and CRM requires joint ownership; sync cadence on lead record data flows, field mapping, and integration monitoring
- **With Sales Strategist**: Territory and quota design decisions require strategic input from the sales strategist; sales ops operationalizes those decisions in the CRM
