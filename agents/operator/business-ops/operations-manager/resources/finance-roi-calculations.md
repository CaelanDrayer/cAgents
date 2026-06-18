> Sub-resource for mode `finance` — relocated verbatim from `agents/operator/business-ops/finance-manager/resources/roi-calculations.md` (zero-loss consolidation).

# ROI and Financial Calculations

Formulas and methods for IT financial analysis.

## Return on Investment (ROI)

### Basic ROI Formula

```
ROI = (Net Benefit / Total Cost) × 100

Where:
Net Benefit = Total Benefits - Total Costs
```

**Example:**
- Project cost: $50,000
- Annual savings: $30,000
- Over 3 years: Benefits = $90,000
- ROI = ($90,000 - $50,000) / $50,000 × 100 = 80%

### Simple Payback Period

```
Payback Period = Total Investment / Annual Benefit

Example:
$50,000 investment / $30,000 annual savings = 1.67 years
```

### ROI with Time Value of Money (NPV)

```
NPV = Σ (Cash Flow_t / (1 + r)^t) - Initial Investment

Where:
t = time period
r = discount rate (typically 10-15%)
```

**Example NPV Calculation:**
```
Initial Investment: $50,000
Annual Cash Flow: $20,000 for 5 years
Discount Rate: 10%

Year 1: $20,000 / 1.10 = $18,182
Year 2: $20,000 / 1.21 = $16,529
Year 3: $20,000 / 1.33 = $15,038
Year 4: $20,000 / 1.46 = $13,699
Year 5: $20,000 / 1.61 = $12,422

Total PV of Benefits: $75,870
NPV: $75,870 - $50,000 = $25,870 (positive = good)
```

## Total Cost of Ownership (TCO)

### TCO Components

```
TCO = Acquisition Costs + Operating Costs + Exit Costs

Acquisition Costs:
- Hardware/software purchase
- Implementation/migration
- Training
- Integration

Operating Costs (Annual):
- Licenses/subscriptions
- Maintenance/support
- Infrastructure (hosting, storage)
- Personnel (FTE allocation)
- Upgrades/patches

Exit Costs:
- Data migration
- Contract termination
- Decommissioning
```

### TCO Comparison Template

| Cost Category | Option A | Option B | Option C |
|---------------|----------|----------|----------|
| **Acquisition** | | | |
| - Software | $X | $X | $X |
| - Implementation | $X | $X | $X |
| - Training | $X | $X | $X |
| **Annual Operations** | | | |
| - Licenses | $X | $X | $X |
| - Support | $X | $X | $X |
| - Personnel | $X | $X | $X |
| - Infrastructure | $X | $X | $X |
| **3-Year TCO** | $X | $X | $X |
| **5-Year TCO** | $X | $X | $X |

## Cost-Benefit Analysis

### Benefit Categories

**Hard Benefits (Quantifiable):**
- Labor savings (hours × rate)
- Infrastructure cost reduction
- Revenue increase
- Error/defect reduction
- Processing time reduction

**Soft Benefits (Qualitative):**
- Improved employee satisfaction
- Better customer experience
- Reduced risk
- Competitive advantage
- Strategic alignment

### Cost Categories

**Direct Costs:**
- Software/hardware purchase
- Professional services
- Training
- Infrastructure

**Indirect Costs:**
- Internal staff time
- Productivity loss during transition
- Opportunity cost
- Risk mitigation

**Hidden Costs:**
- Integration complexity
- Change management
- Ongoing maintenance
- Future upgrades

### Break-Even Analysis

```
Break-Even Point = Total Fixed Costs / (Benefit per Period)

Example:
- Implementation cost: $100,000
- Monthly savings: $8,000
- Break-even: $100,000 / $8,000 = 12.5 months
```

## Cloud Cost Analysis

### On-Premises vs Cloud TCO

| Factor | On-Premises | Cloud |
|--------|-------------|-------|
| Hardware | CapEx (upfront) | OpEx (monthly) |
| Data Center | Real estate, power, cooling | Included |
| Personnel | Full-time staff | Shared responsibility |
| Scalability | Capacity planning | On-demand |
| Maintenance | Internal | Provider |
| Depreciation | 3-5 years | None |

### Cloud Cost Projection

```
Monthly Cloud Cost =
  Compute (instances × hours × rate) +
  Storage (GB × rate) +
  Network (GB transfer × rate) +
  Services (databases, analytics, etc.) +
  Support (% of spend or fixed)

Annual Cost = Monthly × 12 × Growth Factor
```

### Reserved Instance Savings

```
Savings = (On-Demand Rate - Reserved Rate) × Hours × Instances

Example:
- On-Demand: $0.10/hour
- Reserved (1yr): $0.06/hour
- Usage: 8,760 hours (1 year)
- Instances: 10

Savings = ($0.10 - $0.06) × 8,760 × 10 = $3,504/year
```

## Project Financial Analysis

### Business Case Template

**Executive Summary:**
- Recommendation
- Total investment required
- Expected ROI
- Payback period

**Problem Statement:**
- Current state and pain points
- Business impact of problem

**Proposed Solution:**
- Solution description
- Implementation approach
- Timeline

**Cost Analysis:**
- Implementation costs
- Operating costs
- Total 3-year cost

**Benefit Analysis:**
- Quantified benefits
- Qualitative benefits
- Risk reduction

**Financial Summary:**
| Metric | Value |
|--------|-------|
| Total Investment | $X |
| Annual Benefit | $X |
| Payback Period | X months |
| 3-Year ROI | X% |
| 5-Year NPV | $X |

**Risk Assessment:**
- Implementation risks
- Adoption risks
- Mitigation strategies

**Recommendation:**
- Proceed / Defer / Reject
- Rationale

## Budget Variance Analysis

### Variance Calculation

```
Variance = Actual - Budget
Variance % = (Actual - Budget) / Budget × 100

Favorable: Actual < Budget (spent less)
Unfavorable: Actual > Budget (overspent)
```

### Variance Report Template

| Category | Budget | Actual | Variance | % | Explanation |
|----------|--------|--------|----------|---|-------------|
| Infrastructure | $X | $X | $X | X% | Reason |
| Software | $X | $X | $X | X% | Reason |
| Personnel | $X | $X | $X | X% | Reason |
| **Total** | $X | $X | $X | X% | |

### Common Variance Causes

**Favorable (Under Budget):**
- Project delays (timing)
- Cost savings initiatives
- Lower vendor costs than estimated
- Vacancies/hiring delays

**Unfavorable (Over Budget):**
- Scope creep
- Underestimated complexity
- Vendor price increases
- Unplanned requirements
- Emergency fixes
