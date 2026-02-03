# GDPR Compliance (EU Data Privacy)

## Required

- Lawful basis for data processing
- Clear consent mechanisms
- Privacy policy and cookie notice
- Data subject rights implementation:
  - Right to access
  - Right to rectification
  - Right to erasure
  - Right to data portability
  - Right to object
- Data breach notification (72 hours)
- Data Protection Impact Assessments (DPIA)

## Code Patterns to Check

```javascript
// GDPR consent collection
const consent = user.consent?.marketing;  // Must be explicit, not implied

// Data retention
const retentionPeriod = config.dataRetention;  // Must be defined and enforced

// Right to erasure
app.delete('/users/:id/data', deleteUserData);  // Must be implemented
```

## Checklist

- [ ] Privacy policy published and accessible
- [ ] Cookie consent banner implemented
- [ ] Data processing agreements with vendors
- [ ] Data breach notification process documented
- [ ] Data subject rights request handling
- [ ] Data retention policy defined and enforced
- [ ] DPO (Data Protection Officer) appointed if required
