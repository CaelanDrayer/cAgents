# Incident Response Procedures

Comprehensive guide to incident handling and post-mortems.

## Incident Severity Framework

### P0 (Critical - All Hands)
**Characteristics:**
- Production completely down
- Data loss or corruption
- Security breach
- Revenue impact immediate

**Response Time:** Immediate
**Escalation:** All technical leads, management

**Actions:**
1. Page on-call team immediately
2. Establish incident commander
3. Create war room (Slack/Teams channel)
4. Communicate every 15 minutes
5. All hands until resolved

### P1 (High - Urgent)
**Characteristics:**
- Significant feature degradation
- Multiple users affected
- Workaround exists but poor
- High revenue impact

**Response Time:** Within 1 hour
**Escalation:** On-call + relevant team lead

**Actions:**
1. On-call begins investigation
2. Assess impact and root cause
3. Implement fix or escalate
4. Communicate every 30 minutes
5. Update status page

### P2 (Medium)
**Characteristics:**
- Minor feature degradation
- Small user group affected
- Good workaround available
- Low revenue impact

**Response Time:** Within 4 hours
**Escalation:** On-call handles, inform team lead

**Actions:**
1. Log incident ticket
2. Investigate during business hours
3. Schedule fix in next sprint if needed
4. Update affected users

### P3 (Low)
**Characteristics:**
- Monitoring alert, no user impact
- Optimization opportunity
- Nice-to-have improvement
- No revenue impact

**Response Time:** Within 24 hours
**Escalation:** None (standard workflow)

**Actions:**
1. Log for tracking
2. Prioritize in backlog
3. Address when capacity allows

## Incident Response Checklist

### Detection Phase
- [ ] Alert received from monitoring
- [ ] User report received
- [ ] Impact assessed (users, systems, revenue)
- [ ] Severity level assigned

### Triage Phase
- [ ] Incident commander assigned
- [ ] Communication channel created
- [ ] Initial stakeholder notification sent
- [ ] Root cause hypothesis formed
- [ ] Relevant team members engaged

### Mitigation Phase
- [ ] Immediate workaround identified
- [ ] Workaround implemented
- [ ] User impact reduced
- [ ] Monitoring enhanced for issue
- [ ] Timeline for full fix estimated

### Resolution Phase
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Fix validated in staging
- [ ] Fix deployed to production
- [ ] Full resolution verified
- [ ] Monitoring confirms recovery

### Post-Incident Phase
- [ ] Incident timeline documented
- [ ] Root cause analysis completed
- [ ] Post-mortem meeting scheduled
- [ ] Action items created
- [ ] Status page updated (resolved)
- [ ] Stakeholders notified of resolution

## Communication Templates

### Initial Notification
```
INCIDENT: [P0/P1/P2/P3] - [Brief Description]

Impact: [User-facing impact description]
Started: [Time UTC]
Status: Investigating

Current Actions: [What we're doing]
Next Update: [Time UTC]

Incident Commander: @[name]
Channel: #incident-[number]
```

### Status Update
```
UPDATE: [P0/P1/P2/P3] - [Brief Description]

Status: [Investigating/Identified/Mitigating/Resolved]
Impact: [Current user impact]

What we know:
- [Finding 1]
- [Finding 2]

What we're doing:
- [Action 1]
- [Action 2]

Next Update: [Time UTC]
```

### Resolution Notice
```
RESOLVED: [Brief Description]

Duration: [Start time] - [End time] (X hours Y minutes)
Impact: [Final impact summary]

Root Cause: [Brief description]
Resolution: [What was done]

Post-mortem: [Link to doc]
Action Items: [Link to tickets]
```

## Post-Mortem Template

### Incident Summary
- **Date/Time:**
- **Duration:**
- **Severity:**
- **Impact:**
- **Detection Method:**

### Timeline
| Time (UTC) | Event | Actor |
|------------|-------|-------|
| HH:MM | Alert fired | Monitoring |
| HH:MM | Incident declared | On-call |
| ... | ... | ... |
| HH:MM | Resolution verified | SysAdmin |

### Root Cause Analysis
**What happened:**
[Detailed technical explanation]

**Why it happened:**
[Chain of events leading to incident]

**5 Whys Analysis:**
1. Why? [First level cause]
2. Why? [Second level cause]
3. Why? [Third level cause]
4. Why? [Fourth level cause]
5. Why? [Root cause]

### Impact
- Users affected: X
- Revenue impact: $Y
- Data loss: [Yes/No, details]
- SLA breach: [Yes/No]

### What Went Well
- [Positive 1]
- [Positive 2]

### What Could Be Improved
- [Improvement 1]
- [Improvement 2]

### Action Items
| Action | Owner | Priority | Due Date |
|--------|-------|----------|----------|
| [Action 1] | @name | High | YYYY-MM-DD |
| [Action 2] | @name | Medium | YYYY-MM-DD |

## On-Call Best Practices

### Preparation
- Know escalation paths
- Have runbooks accessible
- Test VPN and tooling access
- Keep laptop charged and available

### During Incident
- Stay calm, think methodically
- Document everything as you go
- Ask for help early, not late
- Focus on mitigation before root cause

### After Resolution
- Don't skip post-mortem
- Update runbooks with learnings
- Thank team members
- Take care of yourself (rest)
