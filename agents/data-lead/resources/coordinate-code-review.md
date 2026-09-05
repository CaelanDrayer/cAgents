> Sub-resource for `coordinate` mode — relocated verbatim from `agents/data-lead/resources/code-review.md` (zero-loss consolidation).

# Data Code Review Criteria

## Schema Review

- [ ] Schema design follows normalization principles (or justified denormalization)
- [ ] Primary keys properly defined
- [ ] Foreign keys establish relationships
- [ ] Constraints enforce data integrity (NOT NULL, UNIQUE, CHECK)
- [ ] Data types appropriate for storage and performance

## Migration Review

- [ ] Migrations are safe (tested in staging)
- [ ] Rollback plan exists and tested
- [ ] Data transformations preserve integrity
- [ ] Lock contention minimized
- [ ] Backward compatible with running application

## Index Review

- [ ] Indexes support common query patterns
- [ ] No redundant indexes
- [ ] No missing indexes on frequently filtered columns
- [ ] Composite indexes ordered correctly

## Query Review

- [ ] No N+1 query patterns
- [ ] Proper joins used (avoid subqueries where joins work)
- [ ] EXPLAIN plan reviewed for expensive queries
- [ ] Pagination implemented for large result sets
- [ ] Transactions used appropriately

## Data Quality Review

- [ ] Validation rules defined at database level
- [ ] Constraints prevent invalid data
- [ ] Triggers/functions documented
- [ ] Audit columns present (created_at, updated_at)

## Documentation Review

- [ ] ERD diagram current
- [ ] Schema documentation complete
- [ ] Migration history documented
- [ ] Data dictionary maintained
