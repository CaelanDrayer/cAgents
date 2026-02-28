# Compliance Frameworks

## Compliance Program Structure

### Components
1. **Governance**: Board oversight, compliance committee
2. **Policies**: Written policies and procedures
3. **Risk Assessment**: Identify and prioritize risks
4. **Training**: Awareness and role-based training
5. **Monitoring**: Ongoing compliance checks
6. **Auditing**: Periodic compliance audits
7. **Reporting**: Incidents, metrics, status
8. **Enforcement**: Disciplinary procedures

## Regulatory Inventory Template

```markdown
# Regulatory Inventory

| Regulation | Applies To | Key Requirements | Owner | Last Review |
|------------|-----------|------------------|-------|-------------|
| GDPR | EU data | Consent, DSRs, DPIAs | Privacy | Q1 2026 |
| CCPA | CA data | Notice, opt-out, deletion | Privacy | Q1 2026 |
| SOX | Finance | Controls, certifications | Finance | Q4 2025 |
| HIPAA | Health data | PHI protection, BAAs | Compliance | Q2 2026 |
```

## Compliance Risk Assessment

### Risk Scoring
```yaml
likelihood:
  1: Rare (<10%)
  2: Unlikely (10-25%)
  3: Possible (25-50%)
  4: Likely (50-75%)
  5: Almost Certain (>75%)

impact:
  1: Minimal (warning, <$10K)
  2: Minor (small fine, <$100K)
  3: Moderate (fine, <$1M)
  4: Major (significant fine, <$10M)
  5: Critical (severe penalty, >$10M)

risk_score: likelihood × impact
```

### Risk Priority
- Critical (20-25): Immediate action
- High (13-19): Priority mitigation
- Medium (7-12): Monitor and control
- Low (1-6): Accept or monitor

## Policy Template

```markdown
# [Policy Name]

## Purpose
[Why this policy exists]

## Scope
[Who and what it applies to]

## Policy Statement
[What is required]

## Procedures
[How to comply]

## Roles and Responsibilities
| Role | Responsibility |
|------|---------------|
| [Role] | [Responsibility] |

## Exceptions
[How to request exceptions]

## Enforcement
[Consequences of non-compliance]

## Related Policies
[Links to related policies]

## Revision History
| Version | Date | Changes |
|---------|------|---------|
| 1.0 | [Date] | Initial release |
```

## Audit Checklist Template

```yaml
audit_area: "[Area]"
regulation: "[Regulation]"
date: "[Date]"

controls:
  - control: "[Control description]"
    test_procedure: "[How to test]"
    evidence_required: "[Documentation]"
    result: pass | fail | N/A
    findings: "[If fail, describe]"
    remediation: "[Required action]"
```

## Training Program

### Structure
- Annual compliance training (all employees)
- Role-based training (specific functions)
- New hire onboarding (within 30 days)
- Updates (on regulatory changes)

### Topics
- Code of conduct
- Data privacy
- Anti-corruption
- Information security
- Industry-specific (HIPAA, SOX, etc.)

### Metrics
- Completion rate: >95%
- Assessment scores: >85%
- Training currency: <365 days
