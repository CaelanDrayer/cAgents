# Database Migration Patterns

## Zero-Downtime Migration Strategy

### The Expand-Contract Pattern

```
Phase 1: EXPAND (add new, keep old)
  - Add new column/table alongside old
  - Application writes to both

Phase 2: MIGRATE (backfill data)
  - Copy data from old to new
  - Verify consistency

Phase 3: TRANSITION (read from new)
  - Application reads from new
  - Continues writing to both

Phase 4: CONTRACT (remove old)
  - Stop writing to old
  - Remove old column/table
```

### Example: Rename Column

```sql
-- Phase 1: Add new column
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);

-- Phase 2: Backfill
UPDATE users SET full_name = name WHERE full_name IS NULL;

-- Phase 3: Application code updated to use full_name
-- Phase 4: Remove old
ALTER TABLE users DROP COLUMN name;
```

## Safe Migration Practices

### 1. Add Column (Safe)
```sql
-- PostgreSQL: Adding nullable column is instant
ALTER TABLE users ADD COLUMN middle_name VARCHAR(100);

-- Adding with DEFAULT requires table rewrite (slow on large tables)
-- PostgreSQL 11+ is instant, older versions are slow
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';
```

### 2. Create Index (Safe with CONCURRENTLY)
```sql
-- PostgreSQL: Non-blocking index creation
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- MySQL: pt-online-schema-change for large tables
pt-online-schema-change --execute --alter "ADD INDEX idx_email (email)" D=mydb,t=users
```

### 3. Rename Column (Careful)
```sql
-- Don't do this directly! Use expand-contract pattern
-- ALTER TABLE users RENAME COLUMN name TO full_name; -- DANGEROUS

-- Instead:
-- 1. Add new column
-- 2. Update application to write both
-- 3. Backfill
-- 4. Update application to read new
-- 5. Drop old column
```

### 4. Change Column Type (Careful)
```sql
-- Safe: Widening (INT → BIGINT in MySQL 8+, PostgreSQL)
ALTER TABLE orders ALTER COLUMN amount TYPE NUMERIC(15,2);

-- Unsafe: Narrowing or incompatible types
-- Use expand-contract pattern instead
```

### 5. Drop Column (After Transition)
```sql
-- Only after application no longer uses it
ALTER TABLE users DROP COLUMN deprecated_field;
```

## Migration Tools

### Flyway
```sql
-- V1__create_users_table.sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE
);

-- V2__add_name_column.sql
ALTER TABLE users ADD COLUMN name VARCHAR(255);
```

### Liquibase
```xml
<changeSet id="1" author="dba">
    <createTable tableName="users">
        <column name="id" type="BIGINT" autoIncrement="true">
            <constraints primaryKey="true"/>
        </column>
        <column name="email" type="VARCHAR(255)">
            <constraints nullable="false" unique="true"/>
        </column>
    </createTable>
</changeSet>
```

### Alembic (Python)
```python
def upgrade():
    op.add_column('users', sa.Column('name', sa.String(255)))

def downgrade():
    op.drop_column('users', 'name')
```

## Rollback Planning

### Every Migration Needs Rollback
```sql
-- Migration: Add column
ALTER TABLE users ADD COLUMN bio TEXT;

-- Rollback: Remove column
ALTER TABLE users DROP COLUMN bio;
```

### When Rollback Is Hard
- Data transformations that lose information
- Column type changes that truncate data
- Dropping columns with data

**Solution**: Backup before migration, test rollback in staging

## Migration Checklist

### Pre-Migration
- [ ] Backup database
- [ ] Test on staging with production-size data
- [ ] Review execution plan and timing
- [ ] Schedule during low-traffic window
- [ ] Prepare rollback script
- [ ] Notify stakeholders

### During Migration
- [ ] Monitor database metrics
- [ ] Check replication lag
- [ ] Verify application still working
- [ ] Watch for lock contention

### Post-Migration
- [ ] Verify data integrity
- [ ] Check query performance
- [ ] Monitor for errors
- [ ] Update documentation
- [ ] Archive backup after confirmed success
