# Best Practices: Business Intelligence Specialist

> Design principles, patterns, and frameworks that guide high-quality business intelligence, dashboard development, and data warehousing work.

## Design Principles

- **Answer First**: Design dashboards around the question, not the data — identify the business decision before choosing a metric
- **Single Source of Truth**: All metrics derive from the semantic layer; no ad-hoc SQL producing divergent numbers
- **Progressive Disclosure**: Lead with executive summary (1 KPI), drill to operational detail, then raw data — each level answers a different question
- **Self-Service First**: Build models and semantic layers so business users can explore without opening a ticket
- **Performance as UX**: A dashboard that loads in 10 seconds will not be used; optimize queries before publishing
- **Governance Over Growth**: Track metric ownership, lineage, and definitions — undocumented metrics become land mines
- **Incremental Over Full Refresh**: Design ETL pipelines for incremental loads by default; full refresh is a fallback

## Key Patterns & Frameworks

- **Star Schema**: Central fact table surrounded by denormalized dimension tables — the gold standard for analytic query performance and BI tool compatibility
- **Slowly Changing Dimensions (SCD Type 2)**: Track historical state of dimension records with effective-date rows; required for accurate time-series reporting
- **Medallion Architecture**: Bronze (raw ingestion) → Silver (cleaned, validated) → Gold (business-ready aggregates) — enforces data quality stages before exposure
- **Semantic Layer / Headless BI**: Define metrics once in a centralized layer (dbt metrics, LookML, Cube.dev) and expose to all downstream tools; eliminates metric sprawl
- **Kimball Dimensional Modeling**: Fact-centric design with conformed dimensions shared across subject areas; enables cross-functional analysis without data movement
- **ELT over ETL**: Load raw data first, transform in-warehouse using SQL — leverages cloud warehouse compute and preserves raw audit trail
- **Idempotent Transforms**: Every transformation step produces the same output when re-run; essential for reliable incremental pipelines
- **Metric Trees**: Decompose top-level KPIs (e.g., Revenue) into driver trees (Volume × Price × Mix) so root-cause analysis is traceable
- **Dashboard Governance Model**: Each dashboard has an owner, a refresh schedule, a certified/uncertified status, and a retirement date
- **Pre-aggregation / Materialization**: Compute expensive aggregates as scheduled materializations; expose fast summaries, not raw joins, to BI tools

## Domain Concepts & Terminology

### Data Warehouse Architecture
- **Fact Table**: Numeric measurements at a specific grain (e.g., one row per order line); contains foreign keys to dimensions
- **Dimension Table**: Descriptive context for facts (Customer, Product, Date, Geography)
- **Grain**: The most atomic level of detail a fact table represents; must be declared before modeling
- **Conformed Dimension**: A dimension shared identically across multiple fact tables (e.g., shared Date dimension)
- **Bridge Table**: Resolves many-to-many relationships between facts and dimensions without row explosion
- **Data Vault**: Hub-Satellite-Link architecture for highly auditable, source-agnostic warehousing; favored in regulated industries
- **Surrogate Key**: Warehouse-generated integer key replacing natural source keys; decouples warehouse from source system changes

### ETL/ELT Pipelines
- **Incremental Load**: Process only new or changed records since the last run using watermarks or CDC
- **Change Data Capture (CDC)**: Stream database transaction logs to detect inserts, updates, deletes in near real-time
- **Idempotency**: Re-running a pipeline step produces the same result; no duplicates on retry
- **Data Lineage**: Full audit trail from source field to dashboard metric; required for debugging and compliance
- **Schema Evolution**: Handling upstream source schema changes (new columns, renamed fields) without breaking downstream consumers
- **Orchestration**: Scheduling and dependency management for pipeline DAGs (Airflow, dbt, Dagster)

### Business Intelligence & Dashboards
- **KPI (Key Performance Indicator)**: A quantified measure tied directly to a strategic objective
- **Leading Indicator**: Predictive metric that signals future performance (e.g., pipeline coverage ratio)
- **Lagging Indicator**: Outcome metric reflecting past performance (e.g., closed revenue)
- **Drill-Down**: Navigation from summary to detail within the same dashboard context
- **Slice and Dice**: Filtering and pivoting a dataset across multiple dimensions simultaneously
- **Cohort Analysis**: Grouping users/customers by a shared time-based attribute (e.g., signup month) to track behavior over time
- **Funnel Analysis**: Measuring conversion rate across sequential steps in a process
- **Semantic Layer**: Business-friendly abstraction over raw tables defining metrics, hierarchies, and relationships

### Data Quality
- **Completeness**: Percentage of expected records and fields that are populated
- **Freshness SLA**: Maximum acceptable delay between source event and dashboard visibility
- **Cardinality**: Number of distinct values in a column; high cardinality affects index and join performance
- **Referential Integrity**: Every foreign key in a fact table has a matching record in its dimension table

## Anti-Patterns to Avoid

- **Metric Sprawl**: Defining the same metric differently in five dashboards — always route through the semantic layer to prevent divergence
- **God Dashboard**: One dashboard trying to serve all audiences (CEO + operations + support) — segment by persona, each with their own grain and context
- **Overloaded Dimensions**: Cramming unrelated attributes into a single dimension table — split by conceptual domain; fat dimensions hide modeling errors
- **Full Refresh on Large Tables**: Running full-table refreshes on billion-row fact tables — implement incremental loads with watermarks or CDC from the start
- **Undocumented Metrics**: Publishing a metric called "Active Users" with no definition — every metric needs a business owner, formula, and example calculation
- **Premature Aggregation**: Aggregating in the ETL layer before understanding query patterns — aggregate in the semantic layer where it can be adjusted without pipeline changes
- **Certified Without Testing**: Publishing a dashboard as "certified" before validating against a source-of-record — always reconcile totals against the authoritative system before promotion

## Quality Indicators

- **Query P95 Latency**: Dashboard queries complete in under 3 seconds at the 95th percentile under normal load
- **Metric Definition Coverage**: 100% of published metrics have a documented owner, formula, and grain in the semantic layer
- **Pipeline Freshness Adherence**: Data arrives within the declared SLA (e.g., T+1 hour) on 99%+ of runs
- **Self-Service Adoption Rate**: Percentage of ad-hoc data requests resolved via self-service tools vs. analyst-built reports — target >60%
- **Data Quality Score**: Composite of completeness, freshness, and referential integrity checks passing per pipeline run
- **Dashboard Engagement**: Active weekly users / total published dashboards — low ratios signal dashboard sprawl or poor discoverability
- **Regression Rate**: Number of metric definition changes that required downstream dashboard corrections per quarter

## Collaboration Touchpoints

- **With Data Scientist**: Provide clean, well-modeled Gold-layer tables as feature inputs; integrate model outputs (scores, predictions) as metrics back into dashboards
- **With Domain Business Leads**: Validate metric definitions and grain decisions before build — a metric defined wrong is worse than no metric
- **With Engineering / DevOps**: Coordinate pipeline scheduling, warehouse scaling, and access control — BI pipelines share infrastructure with product systems
- **With Data Analyst**: Semantic layer definitions should enable analysts to self-serve; surface governance issues (conflicting metrics, stale tables) from analyst feedback
