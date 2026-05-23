# Database Query Optimization

## N+1 Query Detection

### BAD - N+1 queries
```javascript
users.forEach(user => {
  const posts = db.query(`SELECT * FROM posts WHERE user_id = ${user.id}`);
});
```

### GOOD - Single query with JOIN
```javascript
const usersWithPosts = db.query(`
  SELECT u.*, p.*
  FROM users u
  LEFT JOIN posts p ON u.id = p.user_id
`);
```

## Missing Indexes

Check for WHERE/JOIN columns without indexes:
```sql
SELECT * FROM users WHERE email = ?  -- Needs index on email
SELECT * FROM orders WHERE user_id = ?  -- Needs index on user_id
```

## Caching Opportunities

Identify expensive operations without caching:
- API responses (HTTP cache headers)
- Computed values (memoization)
- Database query results (Redis, in-memory)
- Static assets (CDN, browser cache)

## Output Format

```yaml
review_id: perf_001
agent: performance-analyzer
severity: high
blocking: true

findings:
  - issue: "N+1 query in user posts endpoint"
    file: "src/api/users.js:78"
    type: n_plus_one_query
    impact: "145 queries per request with 145 users"
    recommendation: "Use JOIN or load all posts in single query"
    severity: high
    blocking: true
```
