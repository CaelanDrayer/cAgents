# Compliance Risk Assessment Methodology

Systematic approach to identifying, assessing, and treating compliance risks.

## Risk Assessment Process

### Step 1: Asset Identification
Identify assets requiring compliance:
- Personal data stores
- Payment processing systems
- Healthcare information systems
- Critical infrastructure
- Third-party integrations

### Step 2: Threat Identification
Common compliance threats:
- Unauthorized access
- Data breaches
- Policy violations
- Regulatory changes
- Vendor non-compliance
- Human error
- System failures

### Step 3: Vulnerability Assessment
Identify control weaknesses:
- Missing controls
- Ineffective controls
- Outdated controls
- Insufficient monitoring
- Inadequate training

### Step 4: Impact Analysis

**Impact Levels**:

| Level | Financial | Regulatory | Reputational |
|-------|-----------|-----------|--------------|
| Critical | >$10M | License revocation | Major media coverage |
| High | $1-10M | Significant fines | Industry press |
| Medium | $100K-1M | Minor fines | Customer complaints |
| Low | <$100K | Warning | Internal only |

### Step 5: Likelihood Assessment

| Level | Probability | Historical |
|-------|-------------|-----------|
| Almost Certain | >90% | Occurred multiple times |
| Likely | 50-90% | Occurred before |
| Possible | 10-50% | Could reasonably occur |
| Unlikely | 1-10% | Not seen but possible |
| Rare | <1% | Highly improbable |

## Risk Scoring Matrix

```
           IMPACT
           Low   Med   High  Crit
LIKELIHOOD
Certain    Med   High  Crit  Crit
Likely     Med   Med   High  Crit
Possible   Low   Med   Med   High
Unlikely   Low   Low   Med   Med
Rare       Low   Low   Low   Med
```

## Risk Treatment Options

### Accept
- Risk within tolerance
- Cost of mitigation exceeds benefit
- Requires management approval

### Mitigate
- Implement additional controls
- Enhance existing controls
- Increase monitoring

### Transfer
- Insurance
- Contractual transfer
- Third-party service

### Avoid
- Discontinue activity
- Change approach
- Exit market

## Control Assessment

### Control Effectiveness Rating

| Rating | Definition |
|--------|-----------|
| Effective | Control operating as designed, achieving objectives |
| Partially Effective | Control has gaps but provides some protection |
| Ineffective | Control not operating or not achieving objectives |
| Not Implemented | Control does not exist |

### Testing Methods

**Design Effectiveness**:
- Review control documentation
- Interview control owners
- Walkthrough process

**Operating Effectiveness**:
- Sample testing
- Re-performance
- Observation
- Automated monitoring

## Risk Register Template

```yaml
risk_id: RISK-2026-001
risk_name: "Unauthorized access to PII"
category: Data Privacy
regulatory_context: [GDPR, CCPA]

assessment:
  impact: High
  likelihood: Possible
  inherent_risk: High

controls:
  - control_id: AC-001
    name: "Role-based access control"
    effectiveness: Effective

  - control_id: AC-002
    name: "Quarterly access reviews"
    effectiveness: Partially Effective

residual_risk: Medium
risk_owner: "Security Manager"
treatment: Mitigate
treatment_plan: "Automate access reviews to improve consistency"
target_date: 2026-Q2
```

## Continuous Risk Monitoring

### Key Risk Indicators (KRIs)

| KRI | Threshold | Frequency |
|-----|-----------|-----------|
| Failed access attempts | >100/day | Daily |
| Policy exceptions | >5/month | Monthly |
| Overdue access reviews | >0 | Weekly |
| Critical vulnerabilities | >0 | Daily |
| Training completion | <95% | Monthly |

### Automated Monitoring
- SIEM alerts for access anomalies
- Compliance dashboard metrics
- Vendor risk score changes
- Regulatory update tracking

### Reporting Cadence
- **Daily**: Security incident summary
- **Weekly**: KRI dashboard review
- **Monthly**: Risk register update
- **Quarterly**: Full risk assessment
- **Annual**: Comprehensive risk review
