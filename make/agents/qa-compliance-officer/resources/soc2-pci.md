# SOC 2 and PCI-DSS Compliance

## SOC 2 Compliance (Security Controls)

### Trust Service Criteria

- **Security**: Access controls, encryption, monitoring
- **Availability**: Uptime, disaster recovery
- **Processing Integrity**: Data accuracy, completeness
- **Confidentiality**: Data protection, NDA
- **Privacy**: GDPR-like privacy controls

### Required

- Security policies documented
- Incident response procedures
- Vulnerability management
- Change management
- Vendor management

### Checklist

- [ ] Security policies documented
- [ ] Incident response plan documented
- [ ] Vulnerability scanning automated
- [ ] Access reviews conducted quarterly
- [ ] Vendor security assessments performed

## PCI-DSS Compliance (Payment Card Data)

### Requirements (if handling credit cards)

- Never store CVV/CVC codes
- Encrypt cardholder data
- Use secure payment gateways
- Regular security testing
- Access controls for cardholder data

### Code Patterns

```javascript
// BAD - Storing card data
const card = { number: req.body.cardNumber, cvv: req.body.cvv };

// GOOD - Use payment processor
const token = await stripe.tokens.create({ card: cardInfo });
```

## Integration with Compliance Tools

- **OneTrust** - Privacy management platform
- **Vanta** - SOC 2, ISO 27001 automation
- **Drata** - Continuous compliance monitoring
- **TrustArc** - Privacy compliance
- **Secureframe** - Compliance automation
