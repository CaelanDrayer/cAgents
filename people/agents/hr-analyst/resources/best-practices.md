# Best Practices: HR Analyst

> Design principles, patterns, and frameworks that guide high-quality people analytics and HR reporting work.

## Design Principles

- **Insight Over Output**: A dashboard with 40 metrics is less valuable than a 5-metric report that drives a decision; always ask "what decision does this enable?" before building.
- **Privacy by Design**: People data carries ethical obligations beyond legal requirements; minimize data collection, anonymize where possible, and question whether analysis serves employee interests alongside business interests.
- **Correlation is Not Causation**: HR data analysis frequently reveals correlations that are tempting to act on; resist causal claims without appropriate research design.
- **Context Transforms Data**: Headcount growth rate means nothing without business growth rate; turnover rate means nothing without regrettable/non-regrettable breakdown — always provide context.
- **Reproducibility Over Novelty**: Analysis that can't be reproduced or understood by stakeholders creates dependency and erodes trust; document methods, sources, and assumptions.
- **Data Quality Before Analysis**: Garbage in, garbage out; validate source data quality before building models or dashboards that leaders will act on.
- **Democratize Access Thoughtfully**: Self-service analytics empower managers but require guardrails around sensitive data and sample sizes that could de-anonymize individuals.

## Key Patterns & Frameworks

- **Analytics Maturity Ladder**: Descriptive (what happened) → Diagnostic (why it happened) → Predictive (what will happen) → Prescriptive (what should we do); most orgs over-invest in descriptive and under-invest in diagnostic and predictive.
- **Turnover Decomposition Model**: Break turnover into voluntary/involuntary, regrettable/non-regrettable, and by cohort (tenure, function, manager, level) to identify meaningful intervention points.
- **Flight Risk Modeling**: Predictive model using engagement scores, manager quality, compensation compa-ratio, tenure, and promotion recency to identify at-risk employees before they resign.
- **HR Metrics Pyramid**: Strategic KPIs (executive layer) → Operational metrics (HR team) → Diagnostic data (investigation layer); different audiences need different granularity.
- **Cohort Analysis Pattern**: Follow a group (new hire class, post-promotion employees) over time to measure outcome trajectories that point-in-time snapshots miss.
- **Source Attribution Analysis**: Measure quality-of-hire by source (LinkedIn, referral, job board, agency) across time-to-productivity, performance rating, and retention to optimize recruiting spend.
- **Small N Suppression Rule**: Suppress (or aggregate) data for groups with fewer than 5-10 individuals to prevent de-anonymization; build this into every dashboard design.
- **Benchmark Integration**: Always pair internal metrics with external benchmarks (LinkedIn Talent Insights, SHRM, Radford workforce data) to distinguish organizational issues from market trends.

## Domain Concepts & Terminology

### Core HR Metrics
- **Headcount**: Total number of employees (full-time equivalents or total bodies); always clarify the definition
- **Time-to-Fill**: Days from job requisition approval to accepted offer; benchmark: 30-45 days for most roles
- **Time-to-Hire**: Days from candidate first contact to accepted offer; measures recruiting speed independent of approval delays
- **Cost-per-Hire**: Total recruiting spend (internal cost + agency fees + advertising) / total hires
- **Quality of Hire**: Composite score measuring new hire performance, retention, and hiring manager satisfaction at 90 days and 1 year
- **Offer Acceptance Rate**: % of extended offers accepted; benchmark: 80-85% for healthy recruiting
- **Voluntary Turnover Rate**: Voluntary separations / average headcount; most closely tracks organizational health
- **Regrettable Turnover**: Departures of employees the organization wanted to retain; more meaningful than total voluntary turnover
- **Internal Mobility Rate**: % of open roles filled internally (promotion + lateral transfer); indicates career development health

### Workforce Analytics
- **Span of Control**: Average number of direct reports per manager; healthy range: 5-10 depending on role complexity
- **Manager Ratio**: % of workforce in management roles; too high (>20%) indicates organizational bloat
- **Revenue per Employee**: Total revenue / headcount; productivity benchmark that varies by industry ($150-300K for SaaS)
- **HR-to-Employee Ratio**: # of HR staff / total headcount; benchmark 1:75-100 for mid-size companies
- **Diversity Demographics**: Workforce representation by gender, race/ethnicity, age, and disability status by level and function
- **Retention Rate**: % of employees who stay over a given period; 1 minus turnover rate

### Engagement & Performance
- **Engagement Score**: Survey composite score measuring emotional commitment; typically benchmarked against industry peer group
- **eNPS (Employee Net Promoter Score)**: % Promoters - % Detractors from "recommend as employer" question
- **Performance Rating Distribution**: % of employees at each rating level; healthy bell curve vs. grade inflation patterns
- **High-Performer Retention Rate**: % of top-rated employees retained year-over-year; most important talent retention metric
- **360 Completion Rate**: % of eligible employees who received multi-rater feedback in the review cycle

### Analytics Concepts
- **Regression to the Mean**: Natural tendency of extreme values to move toward average over time; don't over-interpret a single high/low data point
- **Selection Bias**: Analyzing only the employees who stayed (not those who left) produces biased insights; exit data is critical
- **Interaction Effect**: When the effect of one variable depends on the value of another; compensation × engagement interaction on retention is a common example
- **Lagging Indicator**: Metric that reflects past outcomes (turnover); harder to act on but confirms trends
- **Leading Indicator**: Metric that predicts future outcomes (engagement score, 1:1 frequency); enables proactive intervention

## Anti-Patterns to Avoid

- **Vanity Metrics Reporting**: Tracking metrics because they're easy to measure (training hours logged) rather than because they drive decisions (time to productivity improvement).
- **Point-in-Time Turnover Snapshots**: Reporting monthly turnover without trailing 12-month context makes normal variation look like crises; use rolling averages.
- **De-Anonymizing Small Groups**: Showing demographic data for teams of 3-4 people effectively identifies individuals; suppress small N data consistently.
- **Dashboard Proliferation**: Building a new dashboard for every stakeholder request without governance creates maintenance debt and data inconsistency; build a canonical data model first.
- **Analysis Paralysis**: Waiting for perfect data before sharing insights; communicate findings with confidence intervals and caveats rather than waiting indefinitely for clean data.
- **HR Data Silos**: Keeping HRIS, ATS, and engagement data in separate systems without integration prevents the diagnostic analysis that creates real insights.
- **Benchmarking Without Context**: Citing industry benchmarks without considering company stage, geography, and business model creates misleading comparisons.

## Quality Indicators

- **Data Freshness**: Core HR dashboards updated within 24-48 hours of HRIS data refresh; no stale data in leadership reporting
- **Metric Definition Consistency**: All reported metrics have documented definitions; zero instances of "different numbers for the same metric" across teams
- **Forecast Accuracy**: Headcount and attrition forecasts within ±5% of actuals on a rolling 12-month basis
- **Dashboard Adoption**: 70%+ of target stakeholders access self-service dashboards monthly (measures whether analysis is actually useful)
- **Analysis Turnaround**: 80% of ad-hoc analysis requests completed within 5 business days; complex projects scoped and planned within 2 days
- **Privacy Compliance**: Zero instances of small-N data exposure or unauthorized people data access
- **Insight-to-Action Rate**: Track what % of delivered analyses led to documented decisions or changes; the real measure of analytics value

## Collaboration Touchpoints

- **With Compensation Analyst**: Joint owner of pay equity analysis; HR analyst builds the regression infrastructure, compensation analyst drives interpretation and remediation actions.
- **With Workforce Planning Analyst**: HR analyst provides historical data and trend analysis; workforce planning analyst uses that data to build forward-looking capacity models.
- **With HR Business Partner**: HRBPs consume HR analytics to advise business leaders; analyst must understand HRBP decision contexts to build the right metrics at the right altitude.
- **With HRIS Administrator**: Data quality and system integration are shared responsibilities; analyst identifies data quality issues, HRIS admin resolves them at the source.
- **With HR Manager**: HR analytics agenda is set by HR strategy priorities; manager aligns on which metrics matter most given current people strategy focus areas.
