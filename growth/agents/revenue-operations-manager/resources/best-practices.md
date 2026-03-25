# Best Practices: Revenue Operations Manager

> Design principles, patterns, and frameworks that guide high-quality revenue operations, funnel alignment, and go-to-market efficiency work.

## Design Principles

- **RevOps is the Architecture Layer**: Revenue operations builds and maintains the systems, data, and processes that allow sales, marketing, and CS to run efficiently — it doesn't run the functions, it enables them
- **Single Source of Truth**: When marketing, sales, and CS work from different data, they fight about the numbers instead of improving them — invest in a unified data model
- **Process Before Technology**: Technology enables good processes; it doesn't create them — document and validate the process before selecting or configuring tools
- **Funnel Definitions Must Be Shared**: Marketing, sales, and CS must use the same definitions for every funnel stage; ambiguity generates finger-pointing
- **Metrics Alignment Drives Behavioral Alignment**: What you measure shapes what each team optimizes for — metrics must be designed to reward collaboration, not functional isolation
- **Data Quality is Everyone's Responsibility, Managed by RevOps**: RevOps sets the standards and enforces them; everyone who touches the CRM is responsible for maintaining them
- **Predictability is the Ultimate Goal**: The best RevOps function enables accurate forecasting — it removes the surprises that break planning cycles

## Key Patterns & Frameworks

- **Revenue Funnel Architecture**: Define every stage from MQL through post-sale expansion with entry/exit criteria, owner, and SLA — the shared framework that eliminates inter-team blame
- **RevOps Tech Stack Audit**: Map all GTM technology (CRM, MAP, CSP, BI, revenue intelligence) against data flow, integration quality, and usage — identify redundancy, gaps, and technical debt
- **Pipeline Coverage Model**: Required pipeline as a multiple of quota (typically 3–4×) by segment and stage — provides the demand generation target for marketing
- **Forecast Methodology**: Deal-by-deal commit + pipeline probability (stage-weighted) + historical trend analysis → triangulated forecast; owner at each layer reduces single-point-of-failure risk
- **GTM Data Dictionary**: Shared definitions for every key term (MQL, SQL, opportunity, stage, churned, expanded) used in revenue reporting — signed off by marketing, sales, and CS leadership
- **Revenue Operations QBR Format**: Review prior quarter (attainment, efficiency, funnel health) → diagnose systemic issues → present process or system fixes → preview next quarter priorities
- **Lead-to-Revenue Funnel Report**: Cohort-based analysis of conversion rates at each stage from first touch to closed/won and first value realized — identifies the highest-leverage optimization points
- **CRM Health Dashboard**: Field completeness, duplicate rate, stage progression timestamps, and SLA adherence — monitors data quality in real time rather than reacting to audit failures
- **SLA Enforcement Mechanism**: Automated alerts when leads exceed response time SLAs, dashboards showing SLA adherence by rep and team — converts agreements into accountabilities
- **Commission Plan Modeling**: Modeling how different incentive structures would change selling behavior and revenue outcomes before plan finalization — ensures commission plans drive desired behaviors

## Domain Concepts & Terminology

### RevOps Architecture
- **RevOps (Revenue Operations)**: The function that aligns marketing, sales, and customer success operations around a unified view of the revenue funnel
- **GTM (Go-to-Market)**: The integrated strategy and operational plan for reaching customers and generating revenue
- **Revenue Funnel**: The end-to-end pipeline from first marketing touch through customer retention and expansion
- **Funnel Stage**: A defined point in the buyer or customer journey with explicit entry criteria, owner, and exit criteria
- **SLA (Service Level Agreement)**: A contractual commitment about response time or performance standard between two functions (e.g., marketing delivers MQLs; sales contacts within 4 hours)

### CRM & Data
- **CRM (Customer Relationship Management)**: The system of record for all contact, account, and opportunity data (Salesforce, HubSpot)
- **Data Hygiene**: The ongoing practice of maintaining CRM data quality — removing duplicates, updating stale records, enforcing field standards
- **Tech Stack Integration**: The set of API connections and data flows between marketing automation, CRM, customer success, and analytics tools
- **CPQ (Configure, Price, Quote)**: Software that enables sales to generate accurate proposals and quotes — connected to CRM for opportunity management
- **Revenue Intelligence**: Tools (Gong, Chorus, Clari) that analyze sales activity data to surface deal risks and coaching opportunities

### Forecasting & Analytics
- **Pipeline Coverage**: The ratio of pipeline value to revenue target — healthy coverage typically 3–4× quota
- **Win Rate**: Percentage of qualified opportunities that close as won — key input to pipeline coverage model
- **Average Sales Cycle**: Median days from opportunity creation to close — used in pipeline aging and forecast models
- **Cohort Analysis**: Tracking a group of opportunities created in the same period to understand stage-by-stage conversion rates and timing
- **Bookings vs. Revenue**: Bookings are signed contracts; revenue is recognized as the contract is delivered — RevOps models both

## Anti-Patterns to Avoid

- **RevOps as a Reporting Function Only**: Building dashboards without fixing the processes and systems that generate the data produces beautiful reports of broken operations
- **Inconsistent Funnel Definitions**: Allowing each team to use slightly different stage definitions creates attribution conflicts and makes funnel analysis meaningless
- **Technology Solves Process Problems**: Buying a new tool to fix a broken process installs the broken process in the new tool at higher cost
- **Siloed Metrics**: Marketing optimizing for MQL volume, sales for close rate, and CS for NPS — without shared revenue metrics — creates local optimization that hurts the whole funnel
- **No Forecast Methodology Discipline**: A different person using a different method to generate each quarterly forecast produces numbers that aren't comparable and can't be improved
- **CRM Debt Accumulation**: Allowing duplicate records, stale fields, and non-standard data to accumulate creates a system that salespeople stop trusting and stop updating
- **RevOps Without Executive Sponsorship**: Without C-suite mandate, RevOps recommendations for process changes are advisory at best — establish clear authority and ownership boundaries

## Quality Indicators

- **Forecast Accuracy**: Actual vs. forecasted revenue within ±10% for the quarter — the primary RevOps outcome metric
- **Pipeline Coverage Ratio**: Marketing + sales generated pipeline as a multiple of quarterly quota — below 3× is at-risk
- **MQL-to-SQL Conversion Rate**: Trending metric that reflects marketing lead quality and sales follow-up discipline
- **CRM Data Quality Score**: Field completeness, duplicate rate, and SLA adherence — monitored weekly
- **Sales Cycle Length Trend**: Is the average time from opportunity creation to close getting shorter or longer?
- **Tech Stack Integration Health**: Are all critical data flows between tools functioning without sync errors?
- **Cross-Functional Agreement on Metrics**: Do marketing, sales, and CS leadership consistently quote the same pipeline and attainment numbers?

## Collaboration Touchpoints

- **With Marketing Ops Specialist**: Marketing and sales data must integrate cleanly; co-own the CRM-MAP data model and field definitions — sync weekly to prevent data drift
- **With Sales Ops Specialist**: RevOps governs the overall revenue architecture; sales ops executes territory, quota, and CRM configuration within it — clear role delineation prevents duplication
- **With Marketing Analyst**: Revenue attribution models require joint ownership; RevOps provides the data architecture, analyst builds the attribution logic
- **With Sales Strategist**: Revenue operations supports the sales strategy's execution — quarterly alignment on territory design, quota models, and coverage targets
- **With Finance Manager**: Revenue recognition, bookings definitions, and commission plan models require finance alignment; RevOps models the revenue; finance approves the definitions
