# Best Practices: Planning Analyst

> Design principles, patterns, and frameworks that guide high-quality planning metrics analysis, KPI tracking, trend forecasting, and data-driven planning insights work.

## Design Principles

- **Data Quality Is the Foundation**: Insights derived from dirty data are worse than no insights — invest in data validation and source understanding before analysis begins.
- **Insights Enable Decisions**: Analytics output that doesn't inform a specific decision is overhead — every analysis should connect to a planning question someone is trying to answer.
- **Context Over Numbers**: A metric without context (trend, benchmark, target) is meaningless — always present numbers in context that enables interpretation.
- **Leading Indicators Are More Valuable**: Metrics that predict future outcomes enable proactive management; lagging indicators only confirm what already happened.
- **Variance Demands Explanation**: Deviations from plan are the most important signal — every material variance should produce a root cause and recommended response.
- **Reproducibility Enables Trust**: Analysis should be reproducible by another analyst using the same data — undocumented methodology produces insight that cannot be audited or improved.
- **Simplicity Over Sophistication**: A clear, simple metric consistently tracked beats a complex composite index nobody understands — prefer actionable simplicity.

## Key Patterns & Frameworks

- **KPI Hierarchy (Outcome → Driver → Activity)**: Top-level outcomes (revenue, profit) driven by intermediate metrics (conversion, retention) driven by activity metrics (calls, content, features). Apply to build KPI frameworks with clear causal logic.
- **Variance Analysis Framework**: Plan vs. Actual → Magnitude → Favorable/Unfavorable → Root cause (volume, price, mix, timing) → Recommendation. Apply monthly to all material KPIs.
- **Trend Analysis (Moving Averages)**: 3-period and 12-period moving averages smooth noise from underlying trends. Apply to distinguish seasonal patterns from structural trend changes.
- **Year-over-Year (YoY) and Quarter-over-Quarter (QoQ) Comparison**: Normalize for seasonality (YoY) while tracking recent momentum (QoQ). Apply together for complete trend picture.
- **Cohort Analysis**: Segment metrics by when a unit entered (customer acquisition month, product launch quarter) to isolate vintage performance from aggregate trends.
- **Waterfall Analysis**: Decompose metric movements into additive components (what drove the change from last period to this period). Apply to revenue, cost, or headcount changes.
- **Driver Tree**: Hierarchical decomposition of a top-level metric into its mathematical components. Apply to identify which lever to pull for greatest impact on the target metric.
- **Forecast vs. Actuals Tracking**: Running comparison of each rolling forecast to eventual actuals — measures forecast quality and surfaces systematic bias.
- **Benchmark Comparison**: Internal performance vs. industry benchmarks, peer companies, or historical best periods. Apply to contextualize whether current performance is good, bad, or average in absolute terms.
- **Sensitivity Analysis**: Model how a target metric responds to ±X% changes in key input assumptions. Apply to quantify planning risk and identify which assumptions most require active monitoring.

## Domain Concepts & Terminology

### Planning Metrics
- **KPI (Key Performance Indicator)**: Metric specifically selected because it indicates progress toward a strategic or operational objective
- **Lagging Indicator**: Metric that confirms outcomes after the fact (revenue, profit, turnover rate)
- **Leading Indicator**: Metric that predicts future outcomes (pipeline coverage, employee engagement, NPS)
- **Baseline**: Historical or current-state measurement used as the reference point for target-setting and improvement tracking
- **Target**: Planned value a metric should reach by a defined date
- **Threshold / Guardrail**: Metric boundary that, if crossed, triggers escalation or intervention

### Analysis Concepts
- **Variance**: Difference between planned and actual values; positive variance is favorable for revenue metrics, unfavorable for cost metrics
- **Run Rate**: Annualized projection based on current period performance (current month × 12 or current quarter × 4)
- **Seasonality**: Predictable periodic fluctuation in metrics caused by calendar patterns (Q4 revenue spikes, summer hiring slowdowns)
- **Trend Line**: Statistical best-fit line through historical data points, showing the underlying direction of movement
- **Moving Average**: Average of the last N data points, updated as each new point is added — smooths short-term volatility
- **CAGR (Compound Annual Growth Rate)**: Geometric growth rate over multiple periods — standardized metric for comparing growth across different bases and time horizons

### Forecasting
- **Time Series Forecast**: Prediction of future values based on patterns in historical data (trend, seasonality, cyclicality)
- **Bottom-Up Forecast**: Aggregation of granular unit-level forecasts (territory, product, customer) to produce top-line projection
- **Top-Down Forecast**: Starting from macro targets (total revenue) and allocating down to granular levels
- **Forecast Bias**: Systematic tendency to over-forecast or under-forecast — measured by tracking forecast vs. actuals over time
- **Confidence Interval**: Range within which the actual outcome is expected to fall at a given probability level (e.g., 80% confidence interval)

### Reporting
- **Dashboard**: Visual collection of KPIs and metrics, updated regularly, designed for at-a-glance operational monitoring
- **Management Report**: Periodic narrative report combining metrics, variance analysis, and commentary for decision-makers
- **Drill-Down**: Ability to move from aggregate metrics to underlying detail to understand drivers of summary-level changes
- **Data Source**: Origin system for metric data (ERP, CRM, HRIS, data warehouse) — source must be documented for each metric

## Anti-Patterns to Avoid

- **Vanity Metrics**: Tracking metrics that look impressive but don't influence decisions (total app downloads without activation rate). Fix: for every metric, ask "what decision would change if this number were different?" Remove metrics that don't answer this.
- **Metric Proliferation**: Dashboards with 50+ metrics overwhelming decision-makers. Fix: apply "vital few" principle — select 7-12 KPIs that genuinely drive decisions; archive the rest.
- **Unexplained Variance**: Reporting green/red status without investigating and explaining why variances occurred. Fix: require root cause commentary for every material variance in management reports.
- **Correlation Confusion**: Presenting two correlated metrics as if one causes the other without establishing the causal mechanism. Fix: use "correlated with" language unless causation is established; investigate the mechanism.
- **Stale Baselines**: Comparing current performance to baselines established years ago, rendered meaningless by business model changes. Fix: review and update baselines annually or when material business changes occur.
- **Single-Source Trust**: Accepting metric values from one system without cross-validation against related metrics or source systems. Fix: identify at least one corroborating signal for every critical KPI.
- **Analysis Without Recommendation**: Delivering analysis reports that describe what happened without recommending what to do. Fix: every analysis should conclude with at least one recommended action or decision.

## Quality Indicators

- **KPI Coverage**: % of strategic objectives with at least one measurable KPI linked to them (target: 100%).
- **Variance Explanation Rate**: % of material variances (>5% from plan) with documented root cause in management reports (target: 100%).
- **Forecast Accuracy**: Mean absolute percentage error (MAPE) of rolling forecasts vs. actuals by horizon (target: <10% MAPE at 3-month horizon).
- **Dashboard Adoption**: % of target audience accessing the dashboard weekly — low adoption signals irrelevance or poor usability.
- **Data Freshness**: % of dashboard metrics updated within their defined refresh frequency (daily, weekly) — stale data erodes trust.
- **Analysis Reproducibility**: % of analyses whose results can be independently reproduced from documented methodology and source data (target: 100%).
- **Decision Influence Rate**: % of major planning decisions where the analyst's output was referenced in deliberation — measures actual analytical impact.

## Collaboration Touchpoints

- **With Operations Manager**: Quality looks like operational KPIs reflecting process-level drivers, variance explanations grounded in operational root causes, and capacity metrics feeding capacity planning models.
- **With Strategic Planner**: Quality looks like planning assumptions derived from trend analysis, strategic KPIs reflecting outcomes (not activities), and scenario models informing strategic option evaluation.
- **With Finance Manager**: Quality looks like financial metrics consistent with accounting system sources, KPI trends aligned to financial forecasts, and cost metric definitions shared across functions.
- **With Predictive Analyst**: Quality looks like historical trend analysis informing predictive model inputs, forecast accuracy baselines shared for model validation, and uncertainty ranges appropriately communicated in joint outputs.
