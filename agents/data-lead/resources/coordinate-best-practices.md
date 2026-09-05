> Sub-resource for `coordinate` mode — relocated verbatim from `agents/data-lead/resources/best-practices.md` (zero-loss consolidation).

# Best Practices: Data Lead

> Design principles, patterns, and frameworks that guide high-quality data engineering leadership and data infrastructure decisions.

## Design Principles

- **Data as a Product**: Treat data pipelines and datasets as products with owners, SLAs, documentation, and consumer feedback loops — not as infrastructure side-effects.
- **Schema is a Contract**: Every schema change is a potential breaking change for downstream consumers; version schemas explicitly and communicate changes early.
- **Single Source of Truth**: Each business concept should have one authoritative data source; multiple definitions of the same metric erode organizational trust in data.
- **Quality Gates Over Volume**: Better to publish less data with high quality guarantees than more data with unknown quality — data consumers trust what they can rely on.
- **Separation of Ingestion, Transformation, and Serving**: Keep pipeline concerns distinct across layers; changes in one layer should not require changes in others.
- **Observability for Pipelines**: Data pipelines need the same observability as application code — freshness monitoring, row count alerts, and schema drift detection.
- **Cost Awareness**: Data infrastructure costs scale with data volume; design pipelines with partition pruning, compression, and query optimization as first-class concerns.

## Key Patterns & Frameworks

- **Medallion Architecture**: Organize data into Bronze (raw), Silver (cleaned/validated), and Gold (business-aggregated) layers with clear quality guarantees per layer.
- **Data Catalog**: Maintain a searchable catalog of all datasets with ownership, schema, quality metrics, and lineage — prevents dataset proliferation and confusion.
- **Data Mesh Principles**: Treat each domain's data as a product; domain teams own their data pipelines end-to-end; federated governance with global standards.
- **Schema Registry**: Use a schema registry (Confluent Schema Registry, AWS Glue) to enforce compatibility rules (backward, forward, full) on event schemas.
- **Data Contracts**: Formal agreements between data producers and consumers specifying schema, SLA, and quality expectations — use tools like `soda-core` or `great-expectations`.
- **CDC (Change Data Capture)**: Capture database changes as events using Debezium or database log-based CDC — enables real-time pipelines without polling.
- **Partition Strategy**: Partition large tables by date and high-cardinality dimension; document partition strategy in the data catalog.
- **Backfill Protocol**: Standardize how backfills are triggered, monitored, and validated — prevent accidental overwrites of production data.
- **Pipeline Dependency Management**: Use DAG-based orchestration (Airflow, Prefect, dbt) to define and enforce pipeline dependencies explicitly.
- **Data Quality Framework**: Implement automated data quality checks (freshness, row count, null rate, referential integrity) as pipeline steps, not afterthoughts.

## Domain Concepts & Terminology

### Data Architecture
- **Data Warehouse**: Columnar analytical store optimized for reads (Snowflake, BigQuery, Redshift)
- **Data Lake**: Object storage for raw data in any format (S3, GCS, ADLS) — flexible but needs governance
- **Data Lakehouse**: Combines lake flexibility with warehouse query performance (Delta Lake, Apache Iceberg, Apache Hudi)
- **OLAP vs. OLTP**: OLAP (Online Analytical Processing) for analytical queries; OLTP (Online Transaction Processing) for operational databases
- **Dimensional Modeling**: Kimball's approach — fact tables and dimension tables organized for analytical queries

### Pipeline Orchestration
- **DAG (Directed Acyclic Graph)**: Representation of pipeline dependencies — nodes are tasks, edges are dependencies
- **Backpressure**: Mechanism for a downstream system to slow an upstream producer to prevent overload
- **Dead Letter Queue (DLQ)**: Destination for messages that fail processing — inspect and reprocess manually
- **Idempotent Pipeline**: Can be run multiple times safely; uses watermarks and upsert logic to avoid duplicates
- **SLA Monitoring**: Alerts when pipelines don't complete by their expected time — critical for data freshness guarantees

### Data Governance
- **Data Lineage**: Traceability of data from origin through all transformations to final use
- **PII Classification**: Identifying Personally Identifiable Information fields that require special handling (masking, encryption, access control)
- **Data Retention Policy**: How long different categories of data are kept; driven by regulatory requirements (GDPR, CCPA, HIPAA)
- **Access Control**: Row-level security, column-level masking, dataset-level permissions — least-privilege principle applied to data

### Schema Management
- **Schema Evolution**: Adding, removing, or modifying fields over time
- **Backward Compatible Change**: New schema can read old data (adding optional fields)
- **Forward Compatible Change**: Old schema can read new data (ignoring unknown fields)
- **Breaking Change**: Schema change that requires all consumers to update simultaneously

## Anti-Patterns to Avoid

- **Monolithic Pipelines**: Single pipelines that ingest, transform, and serve data — impossible to debug, slow to modify, and fragile.
- **Schema Without Versioning**: Publishing schema changes without version incrementing or consumer notification — causes silent downstream failures.
- **No Data Ownership**: Datasets with no designated owner — quality degrades because no one is accountable for SLA or accuracy.
- **Pipeline Polling**: Checking for new data by running queries on a fixed schedule rather than using event-driven triggers — wastes compute and increases latency.
- **Shared Mutable Tables**: Multiple pipelines writing to the same table without coordination — causes race conditions and data corruption.
- **Missing Freshness Monitoring**: Publishing data without monitoring whether it arrived on time — stale data served as current data erodes trust.
- **Data Swamp**: A data lake without governance, catalog, or quality standards — becomes a graveyard of data no one can find or trust.

## Quality Indicators

- **Pipeline SLA Adherence**: Percentage of pipelines delivering data within their agreed freshness window — target > 99%.
- **Data Quality Test Pass Rate**: Automated quality checks (null rate, row count, referential integrity) passing on every pipeline run.
- **Dataset Coverage in Catalog**: Percentage of production datasets documented in the data catalog with owner, schema, and SLA.
- **Schema Breaking Change Rate**: Number of unannounced breaking schema changes per quarter — target zero.
- **Mean Time to Detect Data Issues**: How quickly data quality problems are detected after they occur — target < 1 hour for critical pipelines.
- **Cost per Query / Cost per GB**: Data infrastructure costs trending flat or decreasing despite volume growth, via optimization.
- **Consumer Satisfaction**: Downstream data consumers rate pipeline reliability and documentation — measured quarterly.

## Collaboration Touchpoints

- **With DBA**: Coordinate on schema design for operational databases that feed pipelines; align on CDC strategy and replication lag.
- **With Data Analyst**: Surface data quality issues and schema inconsistencies from analyst feedback; translate analytical needs into pipeline design decisions.
- **With Backend Developer**: Define event schemas for application events that feed the data platform; enforce schema registry compatibility rules.
- **With Engineering Manager**: Report on pipeline SLA performance, data quality metrics, and infrastructure cost trends — frame as business risk, not technical metrics.
