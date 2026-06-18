> Sub-resource for mode `supply-chain` — relocated verbatim from `agents/operator/business-ops/supply-chain-manager/resources/supplychain-templates.md` (zero-loss consolidation).

# Supply Chain Templates

## Supply Chain KPI Dashboard

```markdown
# Supply Chain Metrics - [Period]

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Perfect order rate | 95% | X% | [Status] |
| Inventory turns | 8x | Xx | [Status] |
| Fill rate | 98% | X% | [Status] |
| On-time delivery | 95% | X% | [Status] |
| Supply chain cost % | 7% | X% | [Status] |
| Cash-to-cash cycle | 45 days | X days | [Status] |

**Issues**: [Key problems]
**Actions**: [Planned responses]
```

## ABC Inventory Analysis

| Class | Items % | Value % | Strategy |
|-------|---------|---------|----------|
| A | 20% | 80% | Tight control, frequent review |
| B | 30% | 15% | Moderate control |
| C | 50% | 5% | Loose control, safety stock |

## Safety Stock Calculation

```
Safety Stock = Z-score x Lead Time x Demand Variability

Where:
- Z-score: Service level (95% = 1.65, 99% = 2.33)
- Lead time: Days from order to receipt
- Demand variability: Standard deviation of demand

Example:
95% service level, 10 day lead time, 50 units/day variability
Safety Stock = 1.65 x 10 x 50 = 825 units
```

## Supplier Scorecard

| Criteria | Weight | Score |
|----------|--------|-------|
| Quality | 30% | [1-5] |
| Delivery | 25% | [1-5] |
| Price | 25% | [1-5] |
| Service | 10% | [1-5] |
| Risk | 10% | [1-5] |
| **Total** | 100% | [Score] |

## S&OP Process

1. **Data Gathering**: Sales forecast, inventory, capacity
2. **Demand Planning**: Consensus forecast
3. **Supply Planning**: Production/procurement plan
4. **Pre-S&OP**: Gap analysis, scenarios
5. **Executive S&OP**: Decisions, alignment
6. **Execution**: Implement agreed plan
