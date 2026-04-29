# Analytics Best Practices

## SQL Query Optimization

### Filter Early
```sql
-- GOOD: Filter in WHERE clause
SELECT user_id, SUM(amount)
FROM orders
WHERE created_at >= '2024-01-01'
GROUP BY user_id;

-- BAD: Filter after aggregation
SELECT user_id, total
FROM (
    SELECT user_id, SUM(amount) AS total, MAX(created_at) AS last_order
    FROM orders
    GROUP BY user_id
)
WHERE last_order >= '2024-01-01';
```

### Avoid SELECT *
```sql
-- GOOD: Specify columns
SELECT user_id, email, created_at
FROM users;

-- BAD: Select all columns
SELECT * FROM users;
```

### Aggregate Before Joining
```sql
-- GOOD: Aggregate, then join
WITH order_totals AS (
    SELECT user_id, SUM(amount) AS total
    FROM orders
    GROUP BY user_id
)
SELECT u.email, o.total
FROM users u
JOIN order_totals o ON u.id = o.user_id;

-- BAD: Join, then aggregate (larger intermediate result)
SELECT u.email, SUM(o.amount)
FROM users u
JOIN orders o ON u.id = o.user_id
GROUP BY u.email;
```

### Use CTEs for Readability
```sql
WITH
active_users AS (
    SELECT user_id
    FROM logins
    WHERE login_date >= CURRENT_DATE - 30
    GROUP BY user_id
),
user_orders AS (
    SELECT user_id, COUNT(*) AS order_count
    FROM orders
    GROUP BY user_id
)
SELECT
    au.user_id,
    COALESCE(uo.order_count, 0) AS order_count
FROM active_users au
LEFT JOIN user_orders uo ON au.user_id = uo.user_id;
```

## Dashboard Design Principles

### Start with Key Metrics
- Identify 3-5 most important KPIs
- Place at top of dashboard
- Use large, clear numbers
- Show trend (vs prior period)

### Choose Right Visualizations

| Data Type | Best Chart |
|-----------|------------|
| Trend over time | Line chart |
| Comparison | Bar chart |
| Part of whole | Pie/Donut (< 5 segments) |
| Distribution | Histogram |
| Correlation | Scatter plot |
| Geographic | Map |

### Provide Context
- Compare to previous period
- Show targets/goals
- Include trend arrows
- Add annotations for events

### Enable Exploration
- Date range filters
- Segment filters (region, product)
- Drill-down capabilities
- Export options

### Optimize Performance
- Pre-aggregate data for dashboards
- Cache results where possible
- Limit query time to < 5 seconds
- Use incremental refreshes

## KPI Framework

### Acquisition
- New users/signups
- Traffic sources
- Conversion rate

### Activation
- Onboarding completion
- First key action
- Time to value

### Retention
- Daily/Monthly Active Users (DAU/MAU)
- Retention cohorts
- Churn rate

### Revenue
- MRR/ARR
- ARPU (Average Revenue Per User)
- LTV (Lifetime Value)

### Referral
- NPS (Net Promoter Score)
- Referral rate
- Viral coefficient

## Analysis Frameworks

### RFM Analysis (Customer Segmentation)
- **R**ecency: Days since last purchase
- **F**requency: Number of purchases
- **M**onetary: Total spend

### Funnel Analysis
1. Define funnel steps
2. Measure conversion at each step
3. Identify biggest drop-offs
4. Segment by user attributes
5. A/B test improvements

### Cohort Analysis
- Group users by signup date
- Track behavior over time
- Compare cohort performance
- Identify retention patterns
