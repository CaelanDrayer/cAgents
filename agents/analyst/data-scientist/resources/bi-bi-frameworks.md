# Business Intelligence Frameworks

## Data Warehouse Architecture

### Star Schema
```
         ┌─────────────┐
         │ Dim_Product │
         └──────┬──────┘
                │
┌──────────────┐│┌──────────────┐
│ Dim_Customer ├┼┤ Fact_Sales   │
└──────────────┘│└──────────────┘
                │
         ┌──────┴──────┐
         │ Dim_Time    │
         └─────────────┘
```

**Components**:
- Fact Tables: Metrics and measures (revenue, quantity)
- Dimension Tables: Context (customer, product, time)
- Foreign Keys: Connect facts to dimensions

### ETL Pipeline Design
```yaml
pipeline:
  extract:
    sources: [CRM, ERP, Support, Marketing]
    frequency: daily/hourly/real-time
    method: CDC/full_refresh

  transform:
    cleanse: Handle nulls, duplicates, format
    enrich: Join sources, calculate metrics
    model: Build facts and dimensions

  load:
    target: Data warehouse
    approach: incremental/SCD Type 2
    validation: Row counts, checksums
```

## Dashboard Framework

### Executive Dashboard Structure
1. **Header**: KPI summary cards
2. **Trends**: Time series charts
3. **Breakdown**: By dimension (segment, region)
4. **Comparisons**: vs. target, vs. prior period
5. **Alerts**: Out-of-range indicators

### Dashboard Design Principles
- One key metric per chart
- Consistent date ranges
- Clear titles and labels
- Appropriate chart types
- Mobile-responsive

## Semantic Layer Best Practices

### Metric Definitions
```yaml
metrics:
  revenue:
    definition: Sum of order amounts
    formula: SUM(orders.amount)
    filters: status = 'completed'
    grain: daily

  customer_count:
    definition: Distinct paying customers
    formula: COUNT(DISTINCT customer_id)
    filters: mrr > 0
```

### Dimension Hierarchies
```yaml
dimensions:
  geography:
    levels: [region, country, state, city]

  time:
    levels: [year, quarter, month, week, day]

  product:
    levels: [category, subcategory, product]
```

## Self-Service Enablement

### Data Model Tiers
1. **Curated**: Pre-built models for common use cases
2. **Explored**: Validated datasets for ad-hoc analysis
3. **Raw**: Source data for advanced users

### Training Program
- Level 1: Dashboard consumption
- Level 2: Basic analysis and filtering
- Level 3: Report building
- Level 4: Data modeling

### Governance
- Certified vs. uncertified content
- Publishing workflow
- Data refresh SLAs
- Access controls
