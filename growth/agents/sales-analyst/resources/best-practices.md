# Best Practices: Sales Analyst

> Design principles, patterns, and frameworks that guide high-quality sales pipeline analysis, revenue forecasting, and performance insight work.

## Design Principles

- **Pipeline Data Must Be Current to Be Credible**: Stale CRM data produces stale forecasts; data quality is a prerequisite for analytical value
- **Forecast Accuracy is the Measure of the Model**: A forecasting model that's consistently wrong has zero operational value regardless of its sophistication
- **Patterns, Not Points**: Single data points are noisy; trends across periods reveal the signal that informs decisions
- **Segment Before Generalizing**: Average win rates hide the fact that some reps win 40% and others 10% — always segment before drawing conclusions
- **Analysis Produces Recommendations**: Descriptive analysis explains what happened; the value is in the prescriptive recommendation that follows
- **Sales Managers Need Coaching Insights, Not Just Dashboards**: The highest-value analysis identifies which reps and behaviors to change, not just what the aggregate numbers say
- **Timing Matters**: Analysis delivered after a decision is made is trivia; analysis delivered before the decision is strategy

## Key Patterns & Frameworks

- **Sales Velocity Formula**: Revenue = Number of Opportunities × Average Deal Size × Win Rate ÷ Sales Cycle Length — diagnoses which input to improve for the most impact
- **Pipeline Waterfall Analysis**: Tracking pipeline from one period's beginning to end (created, advanced, closed won, lost, slipped) — reveals movement quality, not just closing snapshot
- **Cohort Close Rate Analysis**: Grouping opportunities by creation month and tracking their eventual outcome — more accurate than snapshot win rates for forecasting
- **Rep Performance Quadrant**: Activity level (calls, emails, meetings) vs. conversion efficiency (stage conversion rates) — identifies coaching priorities: high activity/low conversion vs. low activity/high conversion
- **Deal Risk Scoring**: Flagging opportunities with missing next steps, stale stage dates, no economic buyer engaged, or price not discussed — surfaces at-risk deals before they slip
- **Forecast Rollup Model**: Bottom-up (rep-level commit + upside + pipeline) × historical stage conversion rates → management adjustment → executive forecast — each layer adds discipline
- **Seasonality Adjustment**: Modeling historical booking patterns by quarter to adjust raw pipeline coverage into expected-close-weighted pipeline
- **Win/Loss Pattern Analysis**: Clustering won and lost deals by company size, industry, deal size, competitive presence, and sales rep — identifies highest-probability segments and selling environments
- **Sales Cycle Stage Duration Analysis**: Average days spent in each pipeline stage by segment — long stage durations indicate qualification or progression process problems
- **Territory Performance Benchmarking**: Comparing quota attainment, pipeline coverage, and activity metrics across territories — identifies high performers to replicate and underperformers to diagnose

## Domain Concepts & Terminology

### Pipeline Metrics
- **Pipeline Coverage**: Total open pipeline divided by remaining quota target — typically requires 3–5× to achieve quota
- **Weighted Pipeline**: Sum of (deal value × probability) — gives probability-adjusted estimate of expected bookings
- **Average Deal Size (ADS)**: Mean contract value of closed opportunities — a velocity input and segmentation dimension
- **Win Rate**: Percentage of qualified opportunities that close as won — must be segmented by rep, segment, and source to be actionable
- **Sales Cycle Length**: Median days from opportunity creation to close — a velocity input and deal quality signal
- **Slippage Rate**: Percentage of opportunities that move their close date from the predicted quarter — indicates forecast quality

### Forecasting
- **Bottom-Up Forecast**: Aggregating rep-level commit and upside estimates — captures rep confidence but subject to rep optimism bias
- **Stage-Weighted Forecast**: Applying historical win rates at each stage to current pipeline — more objective but misses deal-specific context
- **Commit**: A rep's declaration that a deal will close in the current quarter — high-confidence signal
- **Best Case / Upside**: Deals the rep believes could close this quarter but aren't guaranteed — probabilistic signal
- **Pipeline / Below the Line**: Early-stage opportunities unlikely to close this quarter — used for future quarter planning
- **Forecast Accuracy**: Actual bookings as a percentage of forecasted bookings — the primary forecast quality metric

### Performance Analysis
- **Quota Attainment**: Actual bookings as a percentage of the rep's assigned quota
- **Ramp Rate**: The rate at which a new hire's productivity approaches full quota attainment — used for headcount planning
- **Activity Metrics**: Calls made, emails sent, demos completed, meetings booked — leading indicators of pipeline health
- **Conversion Rate by Stage**: Percentage of opportunities that advance from one stage to the next — pipeline efficiency signal

## Anti-Patterns to Avoid

- **Snapshot Reporting Without Trend**: Reporting this quarter's win rate without showing last 4 quarters makes it impossible to identify whether performance is improving or declining
- **Ignoring Data Quality**: Running sophisticated analysis on CRM data with missing fields and stale records produces confident wrong answers
- **Aggregate Analysis Without Segmentation**: Reporting company-wide win rates and cycle times obscures the fact that enterprise deals look nothing like SMB deals
- **Forecast Without Historical Calibration**: Building a forecast model without calibrating it against historical forecasting accuracy produces numbers that haven't been validated
- **Analysis Without Action**: Delivering pipeline risk reports without recommended specific actions leaves sales managers with data they don't know how to use
- **Latency in Reporting**: Delivering quarterly performance analysis after the quarter ends eliminates the opportunity to intervene — aim for real-time and weekly cadences
- **Over-Engineering Early**: Building complex predictive models before basic data hygiene is established wastes effort on foundations built on bad data

## Quality Indicators

- **Forecast Accuracy**: Actual vs. forecasted bookings within ±10% at quarter-end — the primary output quality metric
- **Pipeline Data Freshness**: Percentage of opportunities updated within the last 7 days — stale data degrades all downstream analysis
- **Analysis Adoption Rate**: Are sales managers actively using dashboards and reports in coaching conversations?
- **Warning Lead Time**: How far in advance of quarter-end does pipeline risk analysis identify at-risk quota? Earlier is better
- **Segmentation Depth**: Is analysis routinely broken down by rep, segment, deal size, and source before conclusions are drawn?
- **CRM Field Completeness**: Percentage of open opportunities with close date, stage entry date, and next step populated
- **Win/Loss Attribution Accuracy**: What percentage of closed opportunities have a documented reason for the outcome?

## Collaboration Touchpoints

- **With Sales Strategist**: Sales strategy must be informed by pipeline and win/loss data; provide quarterly performance summaries that surface segment performance and competitive patterns
- **With Revenue Operations Manager**: CRM data architecture and pipeline stage definitions directly affect analytical quality; co-own the data model and escalate data quality issues
- **With Sales Ops Specialist**: Sales ops manages the CRM and reporting infrastructure; sales analyst designs the reports and analyses that run on that infrastructure
- **With Marketing Analyst**: Revenue attribution requires that marketing and sales data be joined; co-design shared metrics definitions and attribution models
- **With Sales Trainer**: Rep performance analysis identifies which skills and behaviors are correlated with high win rates — share those insights to inform training content priorities
