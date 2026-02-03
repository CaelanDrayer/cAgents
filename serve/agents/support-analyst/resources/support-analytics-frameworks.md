# Support Analytics Frameworks

## Dashboard Templates

### Daily Real-Time Dashboard
- Current backlog and trend
- SLA breaches
- Average wait time
- Agent availability
- Critical escalations

### Weekly Report Structure
```yaml
executive_summary:
  total_tickets: X (+/-% vs last week)
  csat: X% (vs target)
  sla_compliance: X%
  top_issue: "[Category] (X tickets, +/-X%)"

sections:
  volume_trends: By day, channel, category
  performance: Response/resolution times, FCR
  quality: CSAT scores and themes
  emerging_issues: New patterns
  team_highlights: Top performers
```

## Key Metrics Definitions

### Volume Metrics
- **Total Tickets**: All tickets created
- **By Channel**: Email, chat, phone breakdown
- **By Category**: Product area distribution
- **By Priority**: P1/P2/P3/P4 distribution

### Timing Metrics
- **First Response Time**: Creation to first reply (median, p95, SLA%)
- **Resolution Time**: Creation to resolved (by priority)
- **Handle Time**: Active work time per ticket

### Quality Metrics
- **CSAT**: % positive ratings (target >92%)
- **NPS**: Promoters - Detractors (target >45)
- **FCR**: First contact resolution (target >70%)
- **Reopen Rate**: Reopened within 7 days (target <5%)

### Efficiency Metrics
- **Tickets/Agent/Day**: Target 15-25
- **Agent Utilization**: Productive time % (target 70-80%)
- **Self-Service Rate**: KB deflection
- **Cost/Ticket**: Total cost / tickets resolved

## Analysis Techniques

### Trend Identification
```sql
-- Growing issue categories
SELECT category, week, COUNT(*) as tickets
FROM tickets
WHERE created_at > NOW() - INTERVAL '3 months'
GROUP BY category, week
ORDER BY week, tickets DESC;
```

Look for:
- Sudden spikes (product issue)
- Gradual growth (feature gap)
- Seasonal patterns

### Root Cause Analysis (5 Whys)
1. Problem: [Symptom]
2. Why? [Cause 1]
3. Why? [Cause 2]
4. Why? [Cause 3]
5. Why? [Root Cause]

### Customer Segmentation
- **High-touch**: >10 tickets/month (enterprise)
- **Growing concerns**: Increasing tickets, declining CSAT
- **Healthy**: Low tickets, high CSAT
- **At-risk**: Escalations, negative feedback

## From Data to Action

### Example: Ticket Spike
**Data**: Category X +45% (187 vs 129)
**Investigation**: Started after Monday release
**Root Cause**: Code broke backward compatibility
**Actions**:
1. Immediate: Engineering hotfix
2. Short-term: Proactive customer communication
3. Long-term: Add compatibility testing

### Example: CSAT Decline
**Data**: CSAT 94% → 87% in past month
**Investigation**: Negative themes match understaffing period
**Root Cause**: Team restructuring + new hire ramp
**Actions**:
1. Immediate: Overtime/contractor support
2. Short-term: Accelerate hiring
3. Long-term: Build capacity buffer
