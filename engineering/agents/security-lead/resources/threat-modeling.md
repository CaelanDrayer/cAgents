# Threat Modeling

## STRIDE Methodology

- **S**poofing: Can attacker impersonate another user/system?
- **T**ampering: Can attacker modify data in transit/at rest?
- **R**epudiation: Can attacker deny actions performed?
- **I**nformation Disclosure: Can attacker access sensitive data?
- **D**enial of Service: Can attacker disrupt service availability?
- **E**levation of Privilege: Can attacker gain unauthorized access?

## Threat Model Checklist

- [ ] All entry points identified
- [ ] Trust boundaries defined
- [ ] Data flows mapped
- [ ] Threats identified (STRIDE)
- [ ] Mitigations proposed for high/critical risks

## Attack Surface Analysis

- Public APIs and endpoints
- User input fields
- Authentication mechanisms
- External integrations
- Database connections
- File uploads
- Session management

## Risk Assessment

Calculate risk: **Likelihood x Impact**

| Likelihood | Impact | Risk Level |
|------------|--------|------------|
| High | High | Critical |
| High | Medium | High |
| Medium | High | High |
| Medium | Medium | Medium |
| Low | Any | Low |
