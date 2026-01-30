# Database Performance Optimization Guide

## Query Analysis

### Using EXPLAIN ANALYZE
```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.email, COUNT(o.id) AS order_count
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.created_at >= '2024-01-01'
GROUP BY u.email;
```

### Key Metrics to Watch
- **Seq Scan**: Full table scan (often bad for large tables)
- **Index Scan**: Using index (good)
- **Nested Loop**: Join strategy (watch for N+1)
- **Hash Join**: Good for large joins
- **Sort**: May indicate missing index

## Index Strategies

### When to Create Indexes
- Columns in WHERE clauses
- Columns in JOIN conditions
- Columns in ORDER BY
- Foreign keys

### Index Types
```sql
-- B-tree (default, most common)
CREATE INDEX idx_users_email ON users(email);

-- Composite index (multi-column)
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- Partial index (filtered)
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';

-- GIN index (arrays, JSONB)
CREATE INDEX idx_users_tags ON users USING GIN(tags);

-- Concurrent (no blocking)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

### Index Anti-Patterns
- Over-indexing (slows writes)
- Indexing low-cardinality columns
- Unused indexes (waste space)
- Missing composite indexes

## Connection Pool Tuning

### PostgreSQL Settings
```ini
# Max connections
max_connections = 200

# Shared buffers (25% of RAM)
shared_buffers = 4GB

# Work memory (per operation)
work_mem = 64MB

# Maintenance work memory
maintenance_work_mem = 512MB
```

### Connection Pool Settings (PgBouncer)
```ini
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

## Slow Query Identification

### PostgreSQL
```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000; -- 1 second

-- Query pg_stat_statements
SELECT
    query,
    calls,
    mean_time,
    total_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

### MySQL
```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;

-- Query performance schema
SELECT
    DIGEST_TEXT,
    COUNT_STAR,
    AVG_TIMER_WAIT/1000000000 AS avg_seconds
FROM performance_schema.events_statements_summary_by_digest
ORDER BY AVG_TIMER_WAIT DESC
LIMIT 10;
```

## Common Optimization Patterns

### 1. Add Missing Index
```sql
-- Before: Seq Scan on orders (10M rows)
SELECT * FROM orders WHERE user_id = 123;

-- After: Index Scan
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

### 2. Covering Index
```sql
-- Query needs user_id, created_at, amount
CREATE INDEX idx_orders_covering ON orders(user_id, created_at, amount);
-- Index contains all needed columns, no table lookup required
```

### 3. Rewrite Inefficient Query
```sql
-- Before: Correlated subquery (slow)
SELECT * FROM users u
WHERE (SELECT COUNT(*) FROM orders WHERE user_id = u.id) > 5;

-- After: JOIN with HAVING (faster)
SELECT u.*
FROM users u
JOIN orders o ON u.id = o.user_id
GROUP BY u.id
HAVING COUNT(o.id) > 5;
```

### 4. Partition Large Tables
```sql
-- Range partitioning by date
CREATE TABLE orders (
    id BIGINT,
    created_at TIMESTAMP,
    amount DECIMAL
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2024_q1 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
```

## Performance Monitoring

### Key Metrics
- Query response time (p50, p95, p99)
- Queries per second
- Connection count
- Cache hit ratio (> 99% target)
- Disk I/O
- Replication lag

### Alerting Thresholds
| Metric | Warning | Critical |
|--------|---------|----------|
| Query time p95 | > 1s | > 5s |
| Connections | > 80% max | > 95% max |
| Cache hit ratio | < 95% | < 90% |
| Replication lag | > 10s | > 60s |
