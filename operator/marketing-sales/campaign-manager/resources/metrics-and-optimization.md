# Campaign Metrics and Optimization Playbook

Detailed guidance for measuring campaign performance and executing optimization strategies.

## Core Metrics Framework

### Metric Hierarchy

Organize campaign metrics into three tiers for clear reporting:

**Tier 1 - Business Outcomes** (Report to executives)
- Revenue attributed to campaign
- Return on Ad Spend (ROAS)
- Customer Acquisition Cost (CAC)
- Pipeline contribution ($)
- Payback period

**Tier 2 - Campaign Performance** (Report to stakeholders)
- Marketing Qualified Leads (MQLs)
- Cost per Lead (CPL)
- Conversion rate (visitor to lead)
- Lead-to-opportunity rate
- Channel-level ROI

**Tier 3 - Operational Metrics** (Internal optimization)
- Click-through rate (CTR)
- Cost per click (CPC)
- Impressions and reach
- Email open/click rates
- Landing page bounce rate
- Time on page
- Form completion rate

### Metric Definitions and Benchmarks

| Metric | Formula | Good | Average | Needs Work |
|--------|---------|------|---------|-----------|
| CTR (Search) | Clicks / Impressions | > 3.5% | 2-3.5% | < 2% |
| CTR (Display) | Clicks / Impressions | > 0.5% | 0.2-0.5% | < 0.2% |
| CTR (Email) | Clicks / Delivered | > 3% | 1.5-3% | < 1.5% |
| Conv Rate (Landing) | Conversions / Visitors | > 5% | 2-5% | < 2% |
| Email Open Rate | Opens / Delivered | > 25% | 15-25% | < 15% |
| CPL (B2B SaaS) | Spend / Leads | < $50 | $50-150 | > $150 |
| ROAS | Revenue / Ad Spend | > 5x | 2-5x | < 2x |
| MQL-to-SQL Rate | SQLs / MQLs | > 30% | 15-30% | < 15% |

## Performance Dashboards

### Daily Dashboard (Automated)

Monitor these metrics every day during an active campaign:

```
Campaign: [Name]
Date: [Today]
Budget: $X spent / $Y total (Z% utilized)

Channel Performance:
| Channel    | Spend   | Clicks | CTR   | Leads | CPL    |
|-----------|---------|--------|-------|-------|--------|
| Search    | $X      | X      | X%    | X     | $X     |
| LinkedIn  | $X      | X      | X%    | X     | $X     |
| Email     | --      | X      | X%    | X     | --     |

Alerts:
- [Any metric that crossed threshold]
- [Any channel underperforming]
```

### Weekly Report Structure

1. **Executive Summary** (2-3 sentences on overall trajectory)
2. **Key Metrics vs Target** (table with RAG status)
3. **Channel Breakdown** (performance per channel)
4. **Optimization Actions Taken** (what changed this week)
5. **Next Week Plan** (what will be tested/changed)
6. **Budget Status** (remaining budget, projected spend rate)

## A/B Testing Framework

### What to Test (Priority Order)

1. **Audience targeting** (highest impact, test first)
   - Segment A vs Segment B
   - Lookalike audiences vs interest-based
   - Job title targeting vs seniority targeting

2. **Offer/value proposition** (high impact)
   - Different lead magnets (ebook vs webinar vs tool)
   - Pricing/discount variations
   - Free trial vs demo request

3. **Ad creative** (medium impact)
   - Image vs video
   - Lifestyle vs product shots
   - Different headline angles

4. **Copy and messaging** (medium impact)
   - Pain-point focused vs benefit-focused
   - Short vs long copy
   - Social proof vs authority

5. **Landing page elements** (medium impact)
   - Form length (3 fields vs 6 fields)
   - CTA button text and color
   - Page layout and content order

### Testing Protocol

**Before Starting a Test**:
- Define hypothesis: "Changing X will improve Y by Z%"
- Calculate required sample size for statistical significance
- Set test duration (minimum 7 days for B2B, 3 days for B2C)
- Define primary metric and guardrail metrics

**During a Test**:
- Do NOT peek at results before minimum sample size reached
- Monitor guardrail metrics (ensure test is not causing harm)
- Keep all other variables constant

**After a Test**:
- Verify statistical significance (95% confidence minimum)
- Document result: winner, lift percentage, confidence level
- Implement winner across campaign
- Archive test in learnings database

### Sample Size Guidelines

| Baseline Conv Rate | Min Detectable Effect | Required Sample (per variant) |
|-------------------|----------------------|-------------------------------|
| 1% | 50% lift (to 1.5%) | ~14,000 |
| 2% | 25% lift (to 2.5%) | ~12,000 |
| 5% | 20% lift (to 6%) | ~4,500 |
| 10% | 15% lift (to 11.5%) | ~3,500 |

## Optimization Playbook

### Underperforming Campaign Diagnosis

Follow this decision tree when a campaign is below targets:

```
Campaign below target?
|
+-- Check traffic volume
|   |-- Low traffic -> Increase budget or add channels
|   |-- Adequate traffic -> Check next level
|
+-- Check CTR
|   |-- Low CTR -> Creative/copy problem
|   |   |-- Test new headlines
|   |   |-- Test new images/video
|   |   |-- Refine targeting (wrong audience?)
|   |-- Adequate CTR -> Check next level
|
+-- Check conversion rate
|   |-- Low conversion -> Landing page problem
|   |   |-- Simplify form
|   |   |-- Improve page load speed
|   |   |-- Align messaging (ad -> page)
|   |   |-- Strengthen offer/CTA
|   |-- Adequate conversion -> Check next level
|
+-- Check lead quality
    |-- Low quality -> Targeting problem
    |   |-- Tighten audience criteria
    |   |-- Add negative keywords
    |   |-- Adjust lead scoring
    |-- Adequate quality -> Attribution or sales handoff issue
```

### Budget Reallocation Rules

Apply these rules during mid-campaign optimization:

| Scenario | Action | Threshold |
|----------|--------|-----------|
| Channel outperforming | Increase budget 20% | CPL 30%+ below target |
| Channel underperforming | Reduce budget 30% | CPL 50%+ above target after 2 weeks |
| Channel consistently flat | Pause and reallocate | No improvement after 3 optimization cycles |
| New channel test | Allocate 10-15% of total budget | N/A |
| Emergency pivot | Reallocate up to 50% in 48 hours | Campaign-level metrics critically below target |

### Optimization Cadence

| Timeframe | Actions |
|-----------|---------|
| Day 1-3 | Monitor only (data insufficient for decisions) |
| Day 4-7 | First CTR optimizations (pause low performers, boost high) |
| Week 2 | Conversion rate optimizations (landing page, form, offer) |
| Week 3 | Audience refinement (narrow or expand based on data) |
| Week 4+ | Budget reallocation, scaling winners, sunsetting losers |

## Post-Campaign Analysis

### Required Analysis Components

1. **Performance vs Targets**: Final metrics compared to campaign brief goals
2. **Channel Attribution**: Which channels drove which outcomes
3. **Audience Insights**: Which segments performed best and why
4. **Creative Learnings**: Which messages and visuals resonated
5. **Budget Efficiency**: Actual spend vs planned, CPL by channel
6. **Funnel Analysis**: Where did prospects drop off
7. **Recommendations**: What to repeat, stop, and start for next campaign

### Learnings Template

```
Campaign: [Name]
Date Range: [Start - End]
Overall Result: [Met/Exceeded/Missed target by X%]

Top 3 Wins:
1. [Specific win with metric]
2. [Specific win with metric]
3. [Specific win with metric]

Top 3 Learnings:
1. [What we learned and how to apply it]
2. [What we learned and how to apply it]
3. [What we learned and how to apply it]

Recommendations for Next Campaign:
- Repeat: [What worked well]
- Stop: [What did not work]
- Start: [New ideas to test]
```
