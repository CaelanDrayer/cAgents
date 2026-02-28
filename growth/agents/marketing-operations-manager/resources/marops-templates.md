# Marketing Operations Templates

## Lead Scoring Model

### Demographic Score (0-50)

| Attribute | Criteria | Points |
|-----------|----------|--------|
| Job Title | VP, Director | +20 |
| Job Title | Manager | +10 |
| Company Size | 100-1000 | +15 |
| Industry | Target industry | +15 |

### Behavioral Score (0-50)

| Action | Points |
|--------|--------|
| Demo request | +50 |
| Pricing page | +25 |
| Content download | +10 |
| Email open | +2 |
| Email click | +5 |
| Website visit | +3 |

**MQL Threshold**: 75 points

## Lead Routing Rules

```
IF score >= 75 AND company_size >= 100:
  Route to: Enterprise SDR
  SLA: 1 hour

IF score >= 75 AND company_size < 100:
  Route to: SMB SDR
  SLA: 4 hours

IF score >= 50 AND score < 75:
  Nurture sequence: Mid-funnel

IF score < 50:
  Nurture sequence: Top-funnel
```

## Campaign QA Checklist

### Email Campaign
- [ ] Subject line A/B test set up
- [ ] Preview text configured
- [ ] Merge fields tested
- [ ] Links working
- [ ] Unsubscribe functional
- [ ] List segmented correctly
- [ ] Send time scheduled

### Landing Page
- [ ] Form submissions working
- [ ] Thank you page redirects
- [ ] Tracking pixels firing
- [ ] Mobile responsive
- [ ] Load time acceptable

## Data Hygiene Report

```markdown
# Data Quality Report: [Month]

## Overall Score: X/100

## Metrics
- Bounce rate: X% (target: <2%)
- Duplicate rate: X% (target: <5%)
- Missing emails: X% (target: <1%)
- Invalid formats: X (cleaned)

## Actions Taken
- Duplicates merged: X records
- Bounces removed: X records
- Data enriched: X records
```
