# Best Practices: Data Analyst

> Design principles, patterns, and frameworks that guide high-quality data analysis, pipeline development, and business intelligence work.

## Design Principles

- **Data Quality is Non-Negotiable**: Insights built on bad data are worse than no insights — validate data quality before every analysis.
- **Reproducibility by Default**: Every analysis should be reproducible from raw data with a single command — no undocumented manual steps.
- **Question-First Methodology**: Start with the business question, then find the data — avoid the trap of "exploring interesting patterns" without a hypothesis.
- **Uncertainty is Information**: Always report confidence intervals, sample sizes, and data quality caveats alongside findings — precision without uncertainty is misleading.
- **Incremental Processing**: Design pipelines to process only new data rather than reprocessing the full dataset on every run — crucial for scale.
- **Immutable Raw Data**: Never modify raw source data; always transform into a separate layer — raw data is the audit trail.
- **Meaningful Visualization**: A chart should answer a specific question, not decorate a dashboard — every visualization needs a title that states the finding.

## Key Patterns & Frameworks

- **ETL vs. ELT**: ETL (Extract-Transform-Load) transforms before loading; ELT (Extract-Load-Transform) loads raw then transforms in the warehouse — prefer ELT for modern cloud data warehouses.
- **Medallion Architecture (Bronze/Silver/Gold)**: Raw data (Bronze) → cleaned/validated data (Silver) → business-ready aggregates (Gold); separate concerns across layers.
- **Slowly Changing Dimensions (SCD)**: Handle historical changes in dimension data — SCD Type 1 (overwrite), Type 2 (add row with versioning), Type 3 (add column).
- **Kimball Star Schema**: Fact tables (events/measurements) joined to dimension tables (entities); optimized for analytical queries.
- **Data Vault**: Hub-Link-Satellite pattern for auditable, flexible raw data integration; handles evolving schemas well.
- **Window Functions**: SQL window functions (PARTITION BY, RANK, LAG/LEAD) for running totals, cohort analysis, and sessionization without self-joins.
- **Cohort Analysis**: Group users by a shared start event (signup date, first purchase) and track behavior over time — reveals retention and lifecycle patterns.
- **Funnel Analysis**: Measure step-by-step conversion through a defined sequence — identify where users drop off.
- **A/B Test Analysis**: Statistical significance testing (t-test, chi-square, Mann-Whitney) to validate experimental results before shipping changes.
- **Data Lineage Tracking**: Document how each dataset is derived — which sources, which transformations — for audit and debugging purposes.
- **dbt (Data Build Tool)**: SQL-first transformation framework with testing, documentation, and lineage; standard for modern ELT pipelines.

## Domain Concepts & Terminology

### SQL & Query Patterns
- **CTE (Common Table Expression)**: Named subquery using `WITH` clause — improves readability over nested subqueries
- **Window Function**: Computation over a set of rows related to the current row (`ROW_NUMBER`, `RANK`, `SUM OVER`, `LAG`)
- **Execution Plan**: Query optimizer's plan for how to execute a query — always inspect for full table scans on large tables
- **Cardinality**: Number of distinct values in a column — low cardinality columns are good partition keys; high cardinality columns need hash-based distribution
- **Predicate Pushdown**: Query optimizer moves filter conditions closer to the data source to reduce data scanned

### Data Pipeline Concepts
- **Idempotency**: Running a pipeline multiple times produces the same result — achieved via upsert patterns and watermarking
- **Watermark**: The last-processed timestamp or offset; used to determine which records to process on the next run
- **Backfill**: Reprocessing historical data, typically after pipeline fixes or schema changes
- **Partitioning**: Dividing data by a key (date, region) to enable partition pruning in queries
- **Deduplication**: Removing duplicate records using ROW_NUMBER() OVER (PARTITION BY unique_key ORDER BY updated_at DESC)

### Statistical Concepts
- **Confidence Interval**: Range of values likely to contain the true population parameter at a given confidence level (e.g., 95%)
- **p-value**: Probability of observing the data if the null hypothesis is true — threshold typically 0.05
- **Statistical Power**: Probability of detecting a real effect — underpowered tests miss real differences
- **Sample Bias**: When the sample doesn't represent the population — invalidates conclusions
- **Simpson's Paradox**: A trend that appears in aggregated data but reverses when data is segmented — always check for confounding variables

### Data Quality Dimensions
- **Completeness**: Are all expected records and fields present?
- **Accuracy**: Does the data reflect reality?
- **Consistency**: Is the same fact represented the same way across systems?
- **Timeliness**: Is the data fresh enough for its intended use?
- **Uniqueness**: Are there unexpected duplicates?

## Anti-Patterns to Avoid

- **Undocumented Manual Steps**: Transformations applied outside the pipeline (Excel manipulations, one-off database updates) that aren't reproducible.
- **Metrics Without Definitions**: Publishing a "retention rate" or "conversion rate" without a precise definition — different people will interpret it differently.
- **Ignoring Null Handling**: Treating NULL as zero or empty string without explicit consideration — NULLs propagate through aggregations in non-obvious ways.
- **SELECT * in Production Queries**: Fetching all columns when only a few are needed — wastes I/O and causes pipeline fragility when schema changes.
- **Analysis Without Data Quality Check**: Running cohort analysis or funnel analysis on data before validating completeness and accuracy.
- **Over-Indexing on Averages**: Reporting mean values without distribution context — averages hide bimodal distributions, outliers, and P99 behavior.
- **Dashboard Proliferation**: Creating a new dashboard for every request instead of extending existing ones — leads to metric fragmentation and conflicting numbers.

## Quality Indicators

- **Pipeline Idempotency Verified**: Running the pipeline twice produces the same output dataset.
- **Data Quality Tests Pass**: dbt tests (not_null, unique, accepted_values, relationships) pass on every pipeline run.
- **Query Execution Time Under SLO**: Dashboard queries complete within the agreed latency budget (e.g., < 5 seconds for interactive queries).
- **Metric Definitions Documented**: Every metric published to a dashboard has a definition in the data catalog with formula, source, and owner.
- **Backfill Tested**: Pipeline can successfully backfill 90 days of historical data without manual intervention.
- **Analysis Reproducible from Scratch**: A colleague can reproduce any analysis from raw data using the provided SQL/code alone.
- **Freshness SLA Met**: Data pipelines deliver data within the agreed latency (e.g., daily data available by 8 AM).

## Collaboration Touchpoints

- **With DBA**: Coordinate on query optimization — data analysts write the queries, DBAs tune the indexes and execution plans.
- **With Data Lead**: Surface data quality issues and schema inconsistencies — the data lead owns the architecture decisions that fix root causes.
- **With Business Stakeholders**: Translate business questions into precise analytical definitions; always confirm the question before delivering the answer.
- **With Frontend Developer / BI Specialist**: Define dashboard requirements as structured specs (metric, dimension, filter, refresh rate) before implementation begins.
