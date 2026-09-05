# Escalation Management Frameworks

## Severity Matrix

| Severity | Definition | Response | Escalation Path |
|----------|------------|----------|-----------------|
| SEV-1 | Service down, all customers | 15 min | VP + Executive |
| SEV-2 | Major feature broken, many affected | 1 hour | Director + Manager |
| SEV-3 | Feature degraded, subset affected | 4 hours | Manager + Lead |
| SEV-4 | Minor issue, workaround available | 24 hours | Team Lead |

## Incident Command Structure

### Incident Commander (IC)
- Overall coordination
- Decision authority
- Stakeholder communication
- Resource allocation

### Technical Lead
- Technical investigation
- Solution implementation
- Engineering coordination

### Communications Lead
- Customer updates
- Internal stakeholders
- Status page management

### Scribe
- Timeline documentation
- Action item tracking
- Post-mortem notes

## Response Protocol

### Declaration (0-15 min)
1. Confirm impact and severity
2. Assemble response team
3. Establish communication channels
4. Notify stakeholders

### Investigation (15 min - 2 hr)
1. Gather symptoms and data
2. Form hypotheses
3. Test and validate
4. Identify root cause

### Resolution (2-4 hr)
1. Implement fix or mitigation
2. Verify resolution
3. Monitor for recurrence
4. Update customers

### Recovery (4-24 hr)
1. Confirm stability
2. Close incident
3. Schedule post-mortem
4. Document lessons learned

## Communication Templates

### Initial Notification
```
ESCALATION: [SEV-X] [Brief description]
Impact: [Number of customers/accounts affected]
Status: Investigating
Next update: [Time]
IC: [Name]
Bridge: [Link]
```

### Status Update
```
UPDATE: [SEV-X] [Brief description]
Current status: [Investigating/Mitigating/Resolved]
Progress: [What's been done]
Next steps: [What's happening next]
ETA: [If known]
Next update: [Time]
```

### Resolution
```
RESOLVED: [SEV-X] [Brief description]
Resolution: [What fixed it]
Duration: [Time from start to resolution]
Affected: [Final impact count]
Post-mortem: [Scheduled date]
```

## Customer Recovery Actions

| Impact Level | Recovery Options |
|--------------|------------------|
| Minor inconvenience | Apology, documentation |
| Lost productivity | Service credits |
| Business impact | Proactive outreach, compensation |
| Material harm | Executive engagement, custom resolution |

## Post-Mortem Template

1. **Timeline**: What happened and when
2. **Impact**: Customers, revenue, reputation
3. **Root Cause**: Why it happened
4. **Contributing Factors**: What made it worse
5. **What Went Well**: Effective responses
6. **What Went Poorly**: Areas for improvement
7. **Action Items**: Preventive measures with owners and dates
