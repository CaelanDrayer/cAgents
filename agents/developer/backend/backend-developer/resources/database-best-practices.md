# Best Practices: Database Administrator

> Design principles, patterns, and frameworks that guide high-quality database design, optimization, and administration.

## Design Principles

- **Data Integrity is Sacred**: Constraints (NOT NULL, UNIQUE, FOREIGN KEY, CHECK) exist to enforce business rules at the database level — never relax them for convenience.
- **Schema is an API**: Every schema change is a migration that affects downstream consumers; plan, communicate, and version every structural change.
- **Performance is Designed, Not Tuned**: Good index design and schema normalization at creation time is far less expensive than emergency optimization in production.
- **Backups Are Not Optional**: A database without tested, automated, and monitored backups is a liability — backup and restore must be tested regularly, not just assumed to work.
- **Least Privilege for Database Access**: Application accounts should only have the permissions they need; DBA accounts should be audited and rotated.
- **Understand the Query Planner**: Every significant query should be analyzed with EXPLAIN/EXPLAIN ANALYZE; optimizer decisions can surprise even experienced developers.
- **Measure Before Optimizing**: Profile actual query patterns under production load before adding indexes — premature indexing wastes write performance and storage.

## Key Patterns & Frameworks

- **Normalization (1NF through 3NF)**: Eliminate data redundancy and update anomalies; go to Boyce-Codd NF for mission-critical schemas.
- **Strategic Denormalization**: Selectively duplicate data in read-heavy tables (pre-aggregated columns, materialized views) where join cost is prohibitive.
- **Index Design Patterns**: B-tree (equality/range), Hash (equality only), GiST/GIN (full-text, arrays, JSONB), BRIN (sequential time-series data).
- **Composite Index Prefix Rule**: A composite index on (A, B, C) satisfies queries filtering on A, A+B, or A+B+C — but not B alone.
- **Partial Index**: Index with a WHERE clause — smaller, faster, and ideal for sparse predicates (e.g., `WHERE deleted_at IS NULL`).
- **Covering Index**: Include all columns needed by a query in the index to enable index-only scans without touching the heap.
- **Read Replica Strategy**: Route read-heavy queries to read replicas to reduce primary load; set application-level read preference.
- **Connection Pooling with PgBouncer/ProxySQL**: Multiplex thousands of application connections over a small number of database connections — critical for high-concurrency deployments.
- **Zero-Downtime Migration Pattern**: Add columns with defaults → backfill in batches → add constraints → cut over; never lock large tables in production.
- **EXPLAIN ANALYZE Protocol**: Run `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` on any query that takes > 100ms in production; target sequential scan → index scan improvements.

## Domain Concepts & Terminology

### Query Performance
- **Sequential Scan (Seq Scan)**: Reading every row in the table — often avoidable with the right index
- **Index Scan**: Using an index to find matching rows — generally fast for selective predicates
- **Index-Only Scan**: Retrieving data entirely from the index without touching the table heap — fastest possible read
- **Bitmap Index Scan**: Combining multiple indexes via bitmap operations — used for OR conditions
- **Nested Loop / Hash Join / Merge Join**: Three join strategies; the planner selects based on table statistics
- **Cost Model**: Planner uses page cost and CPU cost estimates to choose the optimal plan; can be wrong if statistics are stale

### Indexing Concepts
- **Selectivity**: Fraction of rows an index predicate eliminates — high selectivity (few rows returned) means index is valuable
- **Index Bloat**: Dead index entries from updates/deletes; periodic `VACUUM` or `REINDEX` reclaims space
- **Write Amplification**: Each index adds overhead to INSERT/UPDATE/DELETE — don't index every column
- **Covering Index**: Index that includes all columns needed by a query; enables index-only scans
- **Functional Index**: Index on an expression rather than a column (e.g., `LOWER(email)`)

### Transaction & Concurrency
- **ACID**: Atomicity, Consistency, Isolation, Durability — guaranteed by relational databases
- **Isolation Levels**: Read Uncommitted → Read Committed → Repeatable Read → Serializable; higher isolation = more locking
- **MVCC (Multi-Version Concurrency Control)**: Readers don't block writers, writers don't block readers — used by PostgreSQL and MySQL InnoDB
- **Deadlock**: Two transactions waiting on locks held by each other; resolved by automatic rollback of one transaction
- **Lock Contention**: Multiple sessions competing for the same lock; high contention indicates schema or application design issues
- **Advisory Locks**: Application-level locking mechanism for distributed coordination (PostgreSQL `pg_advisory_lock`)

### Backup & Recovery
- **RPO (Recovery Point Objective)**: Maximum acceptable data loss — drives backup frequency
- **RTO (Recovery Time Objective)**: Maximum acceptable downtime — drives restore strategy and replica topology
- **WAL (Write-Ahead Log)**: Transaction log that enables point-in-time recovery (PITR) and replication
- **Continuous Archiving**: Streaming WAL segments to object storage for PITR capabilities
- **Logical Replication**: Row-level replication that allows selective replication of tables/schemas

### Replication
- **Streaming Replication**: Physical replication via WAL streaming — bit-for-bit copy of the primary
- **Logical Replication**: Row-level change replication — allows selective table replication and cross-version replication
- **Replication Lag**: Delay between primary writes and replica reflection — monitor and alert on excessive lag
- **Failover**: Promoting a replica to primary after primary failure; automated with tools like Patroni, PgBouncer

## Anti-Patterns to Avoid

- **EAV (Entity-Attribute-Value) Schema**: Storing all attributes as rows in a key-value table — destroys query performance and makes schema validation impossible.
- **Using Sequences for Business Keys**: Exposing auto-increment IDs as public identifiers — reveals record counts and enables enumeration attacks; use UUIDs for external identifiers.
- **Missing Foreign Key Constraints**: Relying on application code to enforce referential integrity — database constraints catch bugs that code cannot.
- **Unbounded Column Growth**: JSONB or TEXT columns that grow without bound — causes page bloat, vacuum overhead, and table bloat.
- **Locking Large Tables in Production**: `ALTER TABLE ADD COLUMN` with a default on a large table takes a full table lock in older PostgreSQL versions — use `SET DEFAULT` after.
- **SELECT * in Application Queries**: Fetching all columns when only a few are needed — wastes I/O, invalidates covering indexes, and causes brittleness on schema changes.
- **Untested Backups**: Assuming backups work without periodically running a restore test — backup systems fail silently until the moment they're needed.

## Quality Indicators

- **Query P99 Under SLO**: Critical queries complete within the agreed latency budget under production load.
- **No Full Table Scans on Large Tables**: EXPLAIN ANALYZE shows index scans or index-only scans for all queries on tables > 100k rows.
- **Backup Restore Tested Monthly**: Automated restore test completes successfully and data integrity is verified.
- **Replication Lag < 30 Seconds**: Read replica lag is monitored and stays within the agreed bound under normal load.
- **Zero Lock Contention Incidents**: No production incidents caused by lock contention or deadlocks in the past quarter.
- **Connection Pool Utilization < 80%**: Connection pool has headroom; approaching 100% causes connection queue buildup.
- **Autovacuum Running Effectively**: Table bloat and dead tuple counts remain low; autovacuum is not falling behind on large tables.

## Collaboration Touchpoints

- **With Backend Developer**: Review every new query for index usage and review every migration for locking risk before it runs in production.
- **With Data Lead**: Align on CDC strategy, read replica routing, and schema versioning for data pipeline integration.
- **With DevOps Engineer**: Coordinate on backup automation, monitoring alerts (replication lag, connection count, disk usage), and failover runbooks.
- **With Security Engineer**: Review database user permissions quarterly; ensure application accounts follow least privilege; audit access logs for sensitive tables.
