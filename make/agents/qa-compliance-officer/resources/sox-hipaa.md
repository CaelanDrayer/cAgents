# SOX and HIPAA Compliance

## SOX Compliance (Financial Controls)

### Required

- Audit trails for all financial transactions
- Access controls for financial systems
- Change management procedures
- Segregation of duties
- Regular security assessments

### Code Patterns

```javascript
// Audit logging for financial transactions
auditLog.record({
  action: 'payment_processed',
  user: userId,
  amount: amount,
  timestamp: new Date()
});

// Segregation of duties
if (user.canApprove && user.canExecute) {
  throw new Error('SOX violation: same user cannot approve and execute');
}
```

### Checklist

- [ ] Audit logs for all financial transactions
- [ ] Access controls for financial systems
- [ ] Segregation of duties enforced
- [ ] Change management process documented
- [ ] Regular security assessments conducted

## HIPAA Compliance (Healthcare Data)

### Required

- PHI encryption at rest and in transit
- Access controls and audit trails
- Business Associate Agreements (BAA)
- Minimum necessary access
- Breach notification procedures
- Security risk assessments

### Code Patterns

```javascript
// PHI must be encrypted
const encrypted = encrypt(patientData, ENCRYPTION_KEY);

// Access logging
logAccess({
  user: userId,
  resource: 'patient_record',
  patientId: patientId,
  action: 'view'
});
```

### Checklist

- [ ] PHI encrypted at rest and in transit
- [ ] Business Associate Agreements signed
- [ ] Access logging for PHI access
- [ ] Minimum necessary access enforced
- [ ] Breach notification procedures documented
- [ ] Security risk assessment completed
