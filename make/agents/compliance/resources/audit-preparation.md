# Audit Preparation Guide

Comprehensive guide for preparing for compliance audits.

## Pre-Audit Preparation (4-6 weeks before)

### Week 1-2: Assessment
- [ ] Confirm audit scope and criteria
- [ ] Identify audit team and contacts
- [ ] Review previous audit findings
- [ ] Assess current control status
- [ ] Create evidence request list

### Week 3-4: Evidence Gathering
- [ ] Collect policy documents
- [ ] Gather procedure documentation
- [ ] Export system configurations
- [ ] Pull access control lists
- [ ] Generate audit log reports
- [ ] Compile training records

### Week 5-6: Final Preparation
- [ ] Conduct mock audit interviews
- [ ] Review evidence completeness
- [ ] Brief key personnel
- [ ] Prepare presentation materials
- [ ] Set up audit workspace

## Evidence Collection by Domain

### Access Control
```
Required Evidence:
- User access list with roles
- Access request/approval records
- Terminated user removal evidence
- Privileged access inventory
- Access review documentation
```

### Change Management
```
Required Evidence:
- Change request tickets
- Approval workflows
- Testing documentation
- Deployment records
- Rollback procedures
```

### Incident Management
```
Required Evidence:
- Incident tickets
- Response procedures
- Root cause analyses
- Communication records
- Remediation tracking
```

### Data Protection
```
Required Evidence:
- Data classification policy
- Encryption configurations
- Backup/restore test results
- Data retention records
- Data destruction logs
```

### Vendor Management
```
Required Evidence:
- Vendor inventory
- Risk assessments
- Due diligence records
- Contract review documentation
- SOC 2 reports from vendors
```

## Interview Preparation

### Common Interview Questions

**Policies & Procedures**
- "Walk me through your change management process"
- "How do you handle access requests?"
- "What is your incident response procedure?"

**Control Implementation**
- "How do you ensure controls are operating effectively?"
- "Show me evidence of this control"
- "What monitoring do you have in place?"

**Risk Management**
- "How do you identify and assess risks?"
- "What is your risk treatment approach?"
- "How are residual risks tracked?"

### Interview Best Practices
1. Listen carefully to the full question
2. Answer only what is asked
3. Provide evidence when claiming compliance
4. Say "I'll need to verify that" if unsure
5. Take notes on follow-up items

## Common Audit Findings

### High Risk Findings
| Finding | Prevention |
|---------|-----------|
| Missing access reviews | Automate quarterly reviews |
| Incomplete logs | Centralized logging solution |
| Unpatched systems | Automated patch management |
| Missing MFA | Enforce MFA for all users |
| Stale accounts | Automated deprovisioning |

### Medium Risk Findings
| Finding | Prevention |
|---------|-----------|
| Outdated policies | Annual policy review cycle |
| Incomplete training | LMS with tracking |
| Missing documentation | Document as you build |
| Weak passwords | Password policy enforcement |

## Remediation Tracking

### Finding Response Template
```yaml
finding_id: AUDIT-2026-001
finding: "User access reviews not performed quarterly"
severity: High
root_cause: "No automated process; manual tracking failed"

remediation:
  action: "Implement automated access review tool"
  owner: "Security Team"
  due_date: "2026-03-15"
  status: in_progress

validation:
  method: "Demonstrate tool operation and review evidence"
  validator: "Internal Audit"
  target_date: "2026-03-30"
```

### Tracking Metrics
- Total findings: {count}
- Closed findings: {count}
- Open > 30 days: {count}
- Average remediation time: {days}
