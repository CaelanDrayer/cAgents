# Legal Analytics Frameworks

## Legal Spend Dashboard Structure

```markdown
# Legal Spend Dashboard - [Period]

## Spend Summary
- Total Legal Spend: $X
- Outside Counsel: X%
- Litigation & Settlements: X%
- Personnel: X%
- Technology: X%

## Outside Counsel Breakdown
- By Law Firm (Top 5)
- By Practice Area

## Litigation Analysis
- Active matters
- Cost drivers
- Projected outcomes

## Key Insights and Recommendations
1. Finding + Recommendation + Projected Savings
```

## Risk Quantification Model

```yaml
risk_scoring:
  exposure: Total potential financial impact
  likelihood: Probability percentage
  expected_loss: Exposure × Likelihood

risk_categories:
  litigation: Active lawsuits, settlements
  regulatory: Compliance violations, fines
  contractual: Liability exposure, disputes
  ip_infringement: Patent/trademark risks

priority_matrix:
  critical: Expected loss >$500K
  high: Expected loss $100K-$500K
  medium: Expected loss $50K-$100K
  low: Expected loss <$50K
```

## Settlement vs. Trial Analysis

```yaml
settlement_analysis:
  settlement_cost: Amount + legal fees to settle
  trial_expected_cost: (Probability loss × Damages) + Trial costs

  decision: Settle if settlement_cost < trial_expected_cost
```

## Key Performance Indicators

### Matter Management
- Matter volume (opened, closed, active)
- Cycle time (open to close)
- Backlog vs. capacity

### Outside Counsel
- Spend per matter
- Rate compliance
- Budget adherence

### Litigation
- Win rate
- Settlement rate
- Average settlement as % of claim

## Industry Benchmarks

| Metric | Target |
|--------|--------|
| Legal spend as % of revenue | <0.5% |
| In-house to outside ratio | 60:40 |
| Contracts per attorney | 200-300/year |
| Litigation win rate | 65-75% |

## Dashboard Design Principles

1. Key metrics prominently displayed
2. Visual hierarchy (larger = more important)
3. Right chart type for data
4. Color coding (green/yellow/red)
5. Actionable insights, not just data
