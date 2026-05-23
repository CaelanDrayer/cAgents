# Database Optimization

Reference for query optimization and database performance tuning.

## Query Optimization

### Index Strategy

**When to Add Indexes**:
- Columns in WHERE clauses (equality and range)
- Columns in JOIN conditions
- Columns in ORDER BY / GROUP BY
- Columns with high selectivity (many distinct values)

**When NOT to Index**:
- Small tables (< 1000 rows)
- Columns with low selectivity (boolean, status with 2-3 values)
- Frequently updated columns (index maintenance cost)
- Wide columns (large text/blob)

### Composite Index Ordering

Follow the **ESR rule** (Equality, Sort, Range):
```sql
-- Query: WHERE status = 'active' AND created_at > '2025-01-01' ORDER BY name
-- Index: (status, name, created_at)
--         ^Equality  ^Sort  ^Range
```

### Common Anti-Patterns

**Functions on indexed columns** (prevents index use):
```sql
-- Bad: Full table scan
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';

-- Good: Use functional index or store normalized
SELECT * FROM users WHERE email_lower = 'user@example.com';
```

**SELECT * when not needed**:
```sql
-- Bad: Fetches all columns, prevents covering index
SELECT * FROM orders WHERE user_id = 123;

-- Good: Only needed columns, can use covering index
SELECT id, total, status FROM orders WHERE user_id = 123;
```

**N+1 queries**:
```sql
-- Bad: 1 query for users + N queries for orders
SELECT * FROM users;
-- For each user: SELECT * FROM orders WHERE user_id = ?;

-- Good: Single query with JOIN or IN
SELECT u.*, o.* FROM users u
LEFT JOIN orders o ON o.user_id = u.id;
```

## PostgreSQL-Specific

### EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders WHERE user_id = 123 AND status = 'pending';
```

**Key metrics to check**:
- `Seq Scan` vs `Index Scan` (prefer index scans on large tables)
- `Rows Removed by Filter` (high count = missing index)
- `Buffers: shared hit` vs `shared read` (hit = cached, read = disk)
- `Planning Time` vs `Execution Time`

### Connection Pooling

Use PgBouncer or built-in pool:
- **Transaction mode**: Release connection after each transaction (recommended)
- **Session mode**: Hold connection for session lifetime
- Pool size: `(2 * CPU cores) + effective_spindle_count` (for disk-based)

### Vacuum and Maintenance

```sql
-- Check dead tuples
SELECT relname, n_dead_tup, n_live_tup,
       round(n_dead_tup::numeric / greatest(n_live_tup, 1) * 100, 2) as dead_pct
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

## Caching Strategies

### Cache-Aside (Lazy Loading)

```
Read:  App -> Cache (hit?) -> Yes: return
                           -> No: DB -> write to cache -> return

Write: App -> DB -> invalidate cache
```

### Write-Through

```
Write: App -> Cache -> DB (synchronous)
Read:  App -> Cache (always fresh)
```

### Cache Invalidation Patterns

| Pattern | Complexity | Consistency | Use When |
|---------|-----------|-------------|----------|
| TTL-based | Low | Eventual | Read-heavy, stale OK |
| Event-based | Medium | Near-real-time | Write-moderate |
| Write-through | High | Strong | Write-heavy, consistency critical |

### Redis Best Practices

- Set TTL on all keys (prevent memory leaks)
- Use hash types for objects (memory efficient)
- Pipeline multiple commands (reduce round trips)
- Use SCAN instead of KEYS (non-blocking)
- Monitor memory: `INFO memory`, `MEMORY USAGE key`

## Migration Best Practices

### Zero-Downtime Schema Changes

1. **Add column** (nullable, no default): Safe
2. **Add column with default**: Safe in PostgreSQL 11+ (virtual default)
3. **Drop column**: Remove code references first, then drop
4. **Rename column**: Add new, dual-write, migrate reads, drop old
5. **Add index**: Use `CREATE INDEX CONCURRENTLY` (PostgreSQL)

### Data Migration Pattern

```sql
-- Batch update to avoid locking
UPDATE users SET new_column = old_column
WHERE id IN (
  SELECT id FROM users
  WHERE new_column IS NULL
  LIMIT 1000
);
-- Repeat until no rows affected
```

## Performance Monitoring Queries

### Slow Queries
```sql
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Table Bloat
```sql
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
```
