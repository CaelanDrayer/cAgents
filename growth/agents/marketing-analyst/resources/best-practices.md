# Best Practices: Marketing Analyst

> Design principles, patterns, and frameworks that guide high-quality marketing analytics, attribution modeling, and data-driven optimization work.

## Design Principles

- **Define the Question Before the Query**: Knowing exactly what decision the analysis will inform determines what to measure and how — analysis without a question produces noise
- **Attribution Models are Approximations**: No model perfectly captures how marketing drives revenue; the goal is directionally useful, not mathematically perfect
- **Trends Matter More Than Points**: A single data point is trivia; a trend is insight — focus reporting on directional movement, not snapshots
- **Segment Before Aggregating**: Averages hide the distribution; segment by channel, audience, geography, and stage before drawing conclusions
- **Correlation Needs Causation Investigation**: Marketing data is full of correlated variables that aren't causally related — challenge your own analysis before presenting it
- **Data Quality is a Prerequisite**: Analysis built on dirty data produces confident wrong answers; invest in data quality upstream before adding analytical complexity
- **Communicate Insights, Not Just Data**: Stakeholders need recommendations, not spreadsheets — translate analysis into specific, actionable decisions

## Key Patterns & Frameworks

- **Attribution Model Selection Framework**: First-touch (new pipeline sourcing), last-touch (conversion credit), linear (equal distribution), time-decay (recency weighted), position-based (40/20/40 to first and last), algorithmic (data-driven) — match model to the decision it informs
- **Marketing Mix Modeling (MMM)**: Statistical regression analysis attributing sales to marketing and non-marketing factors over time — useful for budget allocation at portfolio level
- **Customer Lifetime Value (LTV) Modeling**: Historical LTV = average order value × purchase frequency × customer lifespan; predictive LTV uses cohort survival curves and revenue data
- **Cohort Analysis**: Grouping customers by acquisition date to compare retention, LTV, and engagement across different periods — essential for understanding channel quality, not just volume
- **Funnel Conversion Analysis**: Step-by-step conversion rates from awareness to revenue — identifies bottlenecks and prioritizes optimization investment
- **Channel Efficiency Dashboard**: CAC, ROAS, volume, and conversion rate by channel with trend lines and period-over-period comparison — weekly executive summary format
- **A/B Test Statistical Framework**: Setting significance threshold (95%), calculating required sample size from MDE and baseline rate, and documenting results with confidence intervals — prevents premature test conclusions
- **Customer Segmentation Analysis**: RFM analysis (Recency, Frequency, Monetary value) + behavioral and firmographic clustering to identify high-value segments for targeting
- **Marketing Forecasting Model**: Regression-based pipeline forecast using historical conversion rates at each stage × current pipeline volume × seasonality adjustment
- **Campaign Performance Decomposition**: Breaking campaign results into reach (how many?), response (what percentage acted?), and quality (how many converted downstream?) — isolates where performance variance originated

## Domain Concepts & Terminology

### Attribution
- **Attribution Model**: The rules for distributing conversion credit across marketing touchpoints in a buyer journey
- **Marketing Qualified Lead (MQL)**: A lead scoring threshold that attributes marketing credit for generating sales-ready prospects
- **Pipeline Attribution**: Connecting marketing programs to the opportunities they influenced — sourced (first touch) vs. influenced (any touch)
- **Revenue Attribution**: Connecting marketing investment to closed revenue — more direct than pipeline attribution but requires longer measurement windows
- **Multi-Touch Attribution (MTA)**: Distributing credit across multiple marketing interactions in the path to conversion

### Metrics Frameworks
- **CAC (Customer Acquisition Cost)**: Total marketing + sales spend ÷ new customers acquired — the cost efficiency of growth
- **LTV (Lifetime Value)**: Total expected revenue from a customer over their relationship with the company
- **LTV:CAC Ratio**: The fundamental unit economics health check; sustainable growth requires LTV > 3× CAC
- **Payback Period**: Months to recover CAC through gross margin — shorter is better; above 24 months creates cash flow risk
- **ROAS (Return on Ad Spend)**: Revenue generated per dollar of ad spend — channel-level efficiency metric
- **MoM/QoQ/YoY Growth**: Period-over-period comparisons that reveal trends and seasonality

### Statistical Concepts
- **Statistical Significance**: Probability threshold (typically 95%) that an observed difference is not due to chance
- **Confidence Interval**: The range around an estimate within which the true value likely falls
- **Correlation vs. Causation**: Two variables moving together does not mean one causes the other
- **Sample Bias**: When data doesn't represent the population you're drawing conclusions about — invalidates analysis
- **Regression to the Mean**: Extreme performance in one period tends to normalize in the next; avoid over-reacting to outlier periods

### Tools & Data
- **CRM Data**: Contact-level behavioral and firmographic data from Salesforce/HubSpot — primary source for pipeline attribution
- **Marketing Automation Data**: Email engagement, nurture progression, and campaign interaction data from MAP platforms
- **Web Analytics**: Session, source, and conversion data from GA4 or equivalent — requires UTM discipline to be useful
- **Data Warehouse**: Centralized repository combining marketing, sales, and product data for unified analysis

## Anti-Patterns to Avoid

- **Last-Touch Attribution Default**: Attributing all revenue to the final marketing touch ignores every earlier touchpoint's contribution — systematically undervalues awareness and nurture programs
- **Analysis Without Recommendation**: Presenting data and charts without a clear "so what" and recommended action leaves decision-makers without the value they need
- **Reporting Vanity Metrics**: Including impressions and clicks alongside pipeline contribution conflates engagement metrics with business outcomes
- **Over-Fitting Models**: Building overly complex statistical models that fit historical data perfectly but fail to predict future performance
- **Ignoring Data Quality Issues**: Presenting analysis without flagging data completeness or quality limitations misleads stakeholders into false confidence
- **One-Time Analysis**: Generating an insight without building a repeatable reporting process means the same question gets answered from scratch next quarter
- **Confusing Causation and Correlation**: The spike in pipeline the week after the conference could be a coincidence — test before attributing

## Quality Indicators

- **Attribution Coverage Rate**: Percentage of closed/won revenue with a traceable marketing attribution path
- **Forecast Accuracy**: Marketing pipeline forecast within 10% of actual at quarter-end — lagging indicator of model quality
- **Dashboard Adoption**: Are marketing and sales stakeholders actively using the dashboards built, or requesting data via ad hoc requests?
- **Analysis Turnaround Time**: Average hours from question posed to analysis delivered — a throughput metric
- **A/B Test Statistical Compliance**: Percentage of tests run to full sample size before calling results
- **Data Quality Score**: Percentage of CRM records with complete UTM attribution, stage timestamps, and channel source — the health of the data foundation
- **Insight-to-Action Rate**: What percentage of analytical recommendations are acted on within one quarter?

## Collaboration Touchpoints

- **With Campaign Manager**: Define measurement frameworks before campaign launch; provide weekly performance data and optimization recommendations during campaigns
- **With Marketing Strategist**: Strategy decisions require segmentation analysis, competitive benchmarking, and channel efficiency data — provide the analytical foundation for planning cycles
- **With Revenue Operations Manager**: Marketing and sales data must be integrated for pipeline attribution; co-own data model definitions and report consistency
- **With Growth Marketer**: Experiment design, statistical analysis, and cohort interpretation are core analytical contributions to the growth experimentation engine
- **With Demand Generation Manager**: Lead scoring model calibration, MQL-to-SQL conversion analysis, and channel efficiency comparisons require regular joint analysis sessions
