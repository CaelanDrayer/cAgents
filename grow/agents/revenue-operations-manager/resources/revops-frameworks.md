# Revenue Operations Frameworks

## Handoff Definitions

### Marketing -> Sales
- **MQL Criteria**: Score >= 75, engaged with content
- **SLA**: Respond within 5 minutes
- **Handoff**: Auto-route to SDR or AE
- **Feedback**: Weekly quality review

### Sales -> CS
- **Handoff Trigger**: Contract signed
- **Required Info**: Use case, success criteria, contacts
- **SLA**: Introduction within 24 hours
- **Kickoff**: Within 5 business days

## Revenue Dashboard Structure

```markdown
# Revenue Dashboard

## Summary Metrics
- Total Revenue: $X (vs target)
- New Business: $Y
- Expansion: $Z
- Churn: $W

## Funnel Metrics
| Stage | Volume | Conversion | Velocity |
|-------|--------|------------|----------|
| Leads | X | - | - |
| MQL | Y | Z% | W days |
| SQL | Y | Z% | W days |
| Opp | Y | Z% | W days |
| Won | Y | Z% | W days |

## Team Performance
| Team | Target | Actual | % |
|------|--------|--------|---|
| Marketing | $X | $Y | Z% |
| Sales | $X | $Y | Z% |
| CS | $X | $Y | Z% |
```

## Tech Stack Integration

| System | Purpose | Integrations |
|--------|---------|--------------|
| CRM | Revenue truth | All systems |
| MA | Lead management | CRM, website |
| CS Platform | Retention | CRM, product |
| BI | Analytics | All systems |

## Attribution Models

| Model | Method | Best For |
|-------|--------|----------|
| First Touch | First interaction | Awareness |
| Last Touch | Final interaction | Direct response |
| Linear | Equal credit | Balanced |
| Time Decay | Recent weighted | Sales cycles |
| Position | 40/20/40 | Full funnel |
