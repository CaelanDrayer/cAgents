> Sub-resource for `analyze` mode — relocated verbatim from `agents/developer/fullstack/data-analyst/resources/pipeline-patterns.md` (zero-loss consolidation).

# Data Pipeline Patterns

## Batch ETL Pipeline

### Architecture
```
Source Systems → Extract → Transform → Load → Data Warehouse
                   ↓          ↓          ↓
              Staging    Processing   Final Tables
```

### Implementation Steps

1. **Extract**
   - Pull data from source systems (APIs, databases, files)
   - Handle pagination, rate limits
   - Store raw data in staging

2. **Transform**
   - Clean and normalize data
   - Handle nulls and duplicates
   - Apply business logic
   - Aggregate and denormalize

3. **Load**
   - Write to data warehouse
   - Update fact and dimension tables
   - Handle slowly changing dimensions

4. **Schedule**
   - Airflow DAGs for orchestration
   - Nightly or hourly runs
   - Dependency management

5. **Monitor**
   - Pipeline health checks
   - Data quality alerts
   - SLA tracking

## ELT (Modern Data Warehouse)

### Architecture
```
Source → Extract → Load (Raw) → Transform (in warehouse) → Data Marts
                      ↓                ↓
                  Raw Layer      Transformation Layer
```

### Benefits
- Leverage warehouse compute power
- Faster iteration (SQL transforms)
- Better data lineage (DBT)
- Version controlled transformations

### DBT Pattern
```yaml
# models/staging/stg_users.sql
SELECT
    id AS user_id,
    email,
    created_at::date AS signup_date
FROM {{ source('application', 'users') }}
WHERE email IS NOT NULL

# models/marts/dim_users.sql
SELECT
    user_id,
    email,
    signup_date,
    DATEDIFF('day', signup_date, CURRENT_DATE) AS account_age_days
FROM {{ ref('stg_users') }}
```

## Stream Processing Pipeline

### Architecture
```
Events → Kafka → Stream Processor → Real-time Store → Dashboard
                     (Flink)           (Redis)
```

### Use Cases
- Real-time dashboards
- Live event monitoring
- Fraud detection
- User activity tracking

### Windowed Aggregations
- **Tumbling windows**: Fixed, non-overlapping (5-min counts)
- **Sliding windows**: Overlapping (5-min avg, updated every 1 min)
- **Session windows**: Activity-based (user sessions)

## Data Warehouse Schema

### Star Schema
```
           dim_users
              ↑
dim_products → fact_orders ← dim_dates
              ↓
           dim_stores
```

### Benefits
- Simple queries
- Good performance
- Easy to understand

## Pipeline Tools

| Category | Tools |
|----------|-------|
| Orchestration | Airflow, Prefect, Dagster |
| Transformation | DBT, Spark, Pandas |
| Streaming | Kafka, Flink, Spark Streaming |
| Data Integration | Airbyte, Fivetran, Singer |
| Warehouse | Snowflake, BigQuery, Redshift |
