# Compliance Requirements

## SOC 2 Type II

- Security policies documented
- Access controls implemented
- Audit logging enabled
- Incident response procedures
- Regular security assessments

## GDPR

- Data privacy controls
- Consent management
- Data subject rights
- Breach notification (72 hours)
- Data protection impact assessments

## HIPAA

- PHI encryption
- Access controls and audit trails
- Business Associate Agreements
- Minimum necessary access
- Security risk assessments

## PCI-DSS

- No CVV storage
- Cardholder data encryption
- Secure payment gateways
- Regular security testing
- Access controls for cardholder data

## Cross-Domain Coordination

### With Backend
- Review authentication/authorization implementation
- Input validation review
- Secrets management review
- API security

### With Frontend
- XSS prevention review
- CSRF token implementation
- Secure storage (localStorage vs cookies)
- CSP headers

### With DevOps
- Secrets management (Vault, AWS Secrets Manager)
- Network security (firewalls, security groups)
- SSL/TLS configuration
- Container security
