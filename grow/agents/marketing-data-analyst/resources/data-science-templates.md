# Marketing Data Science Templates

## LTV Model Components

```
LTV = Average Order Value x Purchase Frequency x Customer Lifespan

Simplified:
LTV = ARPU x Avg Customer Lifespan

With churn:
LTV = ARPU / Churn Rate
```

## Customer Segmentation Framework

| Dimension | Variables |
|-----------|-----------|
| **Demographic** | Industry, company size, role |
| **Behavioral** | Engagement, usage, purchases |
| **Psychographic** | Preferences, motivations |
| **Value** | LTV, revenue, profitability |

## Propensity Scoring

| Score Type | Predicts | Use Case |
|------------|----------|----------|
| **Buy** | Purchase likelihood | Sales prioritization |
| **Churn** | Cancellation risk | Retention campaigns |
| **Expand** | Upsell potential | Expansion targeting |
| **Convert** | MQL to SQL | Lead scoring |

## A/B Test Analysis Checklist

- [ ] Sample size adequate
- [ ] Duration sufficient
- [ ] Statistical significance (p < 0.05)
- [ ] Effect size meaningful
- [ ] Novelty effect considered
- [ ] Guardrail metrics checked

## Cohort Analysis Template

```markdown
# Cohort Analysis: [Metric]

## Cohort Definition
- Grouping: [Month/Week of signup]
- Metric: [Retention/Revenue/Usage]

## Results Matrix
| Cohort | M0 | M1 | M2 | M3 | M6 | M12 |
|--------|----|----|----|----|----|----|
| Jan | 100% | 60% | 50% | 45% | 35% | 25% |
| Feb | 100% | 65% | 55% | 48% | 38% | -- |

## Insights
- Trend: [Improving/Declining]
- Best cohort: [Month]
- Key driver: [Factor]
```
