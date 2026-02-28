# Data Quality Framework

## Six Dimensions of Data Quality

### 1. Completeness
- No unexpected null values
- All required fields populated
- No missing records

```sql
-- Check for unexpected nulls
SELECT
    COUNT(*) AS total,
    COUNT(email) AS with_email,
    COUNT(*) - COUNT(email) AS missing_email
FROM users;
```

### 2. Uniqueness
- No duplicate records
- Primary keys are unique
- Natural keys are unique

```sql
-- Check for duplicates
SELECT email, COUNT(*) AS cnt
FROM users
GROUP BY email
HAVING COUNT(*) > 1;
```

### 3. Validity
- Data within expected ranges
- Correct data types
- Business rules satisfied

```sql
-- Check for invalid values
SELECT *
FROM orders
WHERE amount < 0
   OR status NOT IN ('pending', 'completed', 'cancelled');
```

### 4. Consistency
- Relationships are correct
- Cross-system consistency
- Referential integrity

```sql
-- Check orphaned records
SELECT o.id
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
WHERE u.id IS NULL;
```

### 5. Freshness
- Data is up-to-date
- Meets SLA requirements
- Pipeline running on schedule

```sql
-- Check data freshness
SELECT MAX(updated_at) AS last_update,
       DATEDIFF('hour', MAX(updated_at), CURRENT_TIMESTAMP) AS hours_stale
FROM analytics.orders;
```

### 6. Accuracy
- Data matches source of truth
- No transformation errors
- Reconciles with external systems

```sql
-- Reconciliation check
SELECT
    (SELECT SUM(amount) FROM source.orders) AS source_total,
    (SELECT SUM(amount) FROM warehouse.fact_orders) AS warehouse_total,
    ABS(source_total - warehouse_total) AS discrepancy;
```

## Data Quality Checks

### Schema Checks
- [ ] Required columns exist
- [ ] Data types are correct
- [ ] Constraints enforced

### Freshness Checks
- [ ] Data loaded within SLA
- [ ] No gaps in time series
- [ ] Latest records present

### Volume Checks
- [ ] Row count within expected range
- [ ] No sudden drops in volume
- [ ] Growth rate reasonable

### Value Checks
- [ ] Values within valid ranges
- [ ] No unexpected nulls
- [ ] Business rules satisfied

## Implementation with Great Expectations

```python
import great_expectations as gx

# Define expectations
expectations = [
    gx.expect_column_values_to_not_be_null("user_id"),
    gx.expect_column_values_to_be_unique("email"),
    gx.expect_column_values_to_be_between("amount", min_value=0, max_value=100000),
    gx.expect_table_row_count_to_be_between(min_value=1000, max_value=1000000),
]
```

## Implementation with DBT Tests

```yaml
# schema.yml
models:
  - name: stg_orders
    columns:
      - name: order_id
        tests:
          - not_null
          - unique
      - name: amount
        tests:
          - not_null
          - dbt_expectations.expect_column_values_to_be_between:
              min_value: 0
              max_value: 100000
      - name: user_id
        tests:
          - relationships:
              to: ref('dim_users')
              field: user_id
```

## Alerting Strategy

### Critical (Immediate Action)
- Pipeline failure
- Data freshness > 2x SLA
- Primary key violations
- > 10% discrepancy in key metrics

### Warning (Investigate)
- Unexpected null rate increase
- Row count outside 20% normal range
- New unexpected values
- 5-10% discrepancy

### Info (Monitor)
- Minor volume fluctuations
- New dimension values
- Schema changes detected

## Quality Metrics Dashboard

| Metric | Target | Current |
|--------|--------|---------|
| Completeness | > 99% | |
| Uniqueness | 100% | |
| Freshness | < 1 hour | |
| Reconciliation | 100% | |
| Pipeline Success | > 99% | |
