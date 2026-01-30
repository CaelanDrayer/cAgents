# Regulatory Framework Requirements

Detailed requirements for each compliance framework.

## GDPR (General Data Protection Regulation)

**Scope**: Processing personal data of EU residents

### Key Requirements

| Requirement | Implementation |
|-------------|---------------|
| Lawful basis | Document processing basis for each data type |
| Consent | Implement granular consent management |
| Data minimization | Only collect necessary data |
| Purpose limitation | Use data only for stated purposes |
| Storage limitation | Define and enforce retention periods |
| Data subject rights | Implement DSAR handling process |
| Breach notification | 72-hour notification capability |
| Data protection officer | Appoint if required |
| Privacy by design | Build privacy into new features |

### Data Subject Rights (Articles 15-22)
- Right of access (Art. 15)
- Right to rectification (Art. 16)
- Right to erasure/"be forgotten" (Art. 17)
- Right to restrict processing (Art. 18)
- Right to data portability (Art. 20)
- Right to object (Art. 21)
- Rights related to automated decisions (Art. 22)

### Checklist
- [ ] Data inventory documented
- [ ] Legal basis for each processing activity
- [ ] Consent mechanism implemented
- [ ] DSAR process in place
- [ ] Breach response plan tested
- [ ] Data Processing Agreements with vendors
- [ ] Privacy policy updated

## HIPAA (Health Insurance Portability and Accountability Act)

**Scope**: Protected Health Information (PHI)

### Key Requirements

| Rule | Requirements |
|------|-------------|
| Privacy Rule | Limits PHI use and disclosure |
| Security Rule | Administrative, physical, technical safeguards |
| Breach Notification | Notify within 60 days |
| Enforcement Rule | Penalties for violations |

### Technical Safeguards
- Access controls
- Audit controls
- Integrity controls
- Transmission security (encryption)

### Checklist
- [ ] Risk analysis completed
- [ ] Policies and procedures documented
- [ ] Workforce training completed
- [ ] Business Associate Agreements in place
- [ ] Incident response plan tested
- [ ] Audit logs enabled and reviewed

## SOC 2 (Service Organization Control 2)

**Scope**: Service providers storing customer data

### Trust Service Criteria

| Criteria | Focus |
|----------|-------|
| Security | Protection against unauthorized access |
| Availability | System availability per SLA |
| Processing Integrity | Complete, accurate processing |
| Confidentiality | Data protection as committed |
| Privacy | Personal information handling |

### Control Categories
1. Control environment
2. Risk assessment
3. Information and communication
4. Monitoring activities
5. Control activities

### Checklist
- [ ] Scope defined
- [ ] Controls documented
- [ ] Evidence collection automated
- [ ] Monitoring in place
- [ ] Annual audit scheduled

## PCI-DSS (Payment Card Industry Data Security Standard)

**Scope**: Organizations handling payment card data

### 12 Requirements

1. Install and maintain firewall
2. Change vendor-supplied defaults
3. Protect stored cardholder data
4. Encrypt transmission
5. Protect against malware
6. Develop secure systems
7. Restrict access by need-to-know
8. Identify and authenticate access
9. Restrict physical access
10. Track and monitor access
11. Regularly test security
12. Maintain information security policy

### Compliance Levels

| Level | Criteria | Validation |
|-------|----------|-----------|
| 1 | >6M transactions/year | Annual onsite audit (QSA) |
| 2 | 1-6M transactions/year | Annual SAQ |
| 3 | 20K-1M e-commerce | Annual SAQ |
| 4 | <20K e-commerce | Annual SAQ |

### Checklist
- [ ] Cardholder data flow documented
- [ ] Network segmentation implemented
- [ ] Encryption at rest and in transit
- [ ] Vulnerability scans quarterly
- [ ] Penetration testing annual
- [ ] Security awareness training

## CCPA (California Consumer Privacy Act)

**Scope**: California residents' personal information

### Consumer Rights
- Right to know (what data collected)
- Right to delete
- Right to opt-out of sale
- Right to non-discrimination

### Business Obligations
- Privacy notice at collection
- Process consumer requests (45 days)
- Train employees handling requests
- Implement reasonable security

### Checklist
- [ ] Data inventory includes CA residents
- [ ] Privacy notice updated
- [ ] "Do Not Sell" link if applicable
- [ ] Request handling process
- [ ] Verification procedures
- [ ] Service provider contracts updated

## ISO 27001 (Information Security Management)

**Scope**: Information security management system

### ISMS Requirements
- Context of organization
- Leadership commitment
- Planning (risk assessment)
- Support (resources, awareness)
- Operation (risk treatment)
- Performance evaluation
- Improvement

### Annex A Controls (114 controls in 14 domains)
- A.5: Information security policies
- A.6: Organization of information security
- A.7: Human resource security
- A.8: Asset management
- A.9: Access control
- A.10: Cryptography
- A.11: Physical security
- A.12: Operations security
- A.13: Communications security
- A.14: System acquisition, development
- A.15: Supplier relationships
- A.16: Incident management
- A.17: Business continuity
- A.18: Compliance

### Checklist
- [ ] ISMS scope defined
- [ ] Risk assessment methodology
- [ ] Risk treatment plan
- [ ] Statement of Applicability
- [ ] Internal audit schedule
- [ ] Management review meetings
