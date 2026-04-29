# Risk Management Frameworks

## Risk Register Entry Template

```markdown
# RISK-[ID]: [Risk Name]

**Category**: [Operational/Strategic/Financial/Compliance]
**Likelihood**: [1-5] | **Impact**: [1-5]
**Risk Score**: [X] ([Extreme/High/Medium/Low])

**Potential Impact**: [Financial, operational, reputational]

**Current Controls**:
- [Control 1]
- [Control 2]
**Control Effectiveness**: [Strong/Moderate/Weak]

**Residual Risk**: [Score after controls]

**Mitigation Plan**:
1. [Action]: Timeline, cost
2. [Action]: Timeline, cost

**Risk Owner**: [Name]
**Status**: [% complete]
**Next Review**: [Date]
```

## Risk Matrix

|              | Negligible | Minor | Moderate | Major | Catastrophic |
|--------------|------------|-------|----------|-------|--------------|
| Almost Certain | Medium | High | High | Extreme | Extreme |
| Likely | Low | Medium | High | High | Extreme |
| Possible | Low | Medium | Medium | High | High |
| Unlikely | Low | Low | Medium | Medium | High |
| Rare | Low | Low | Low | Medium | Medium |

## Business Continuity Template

| Function | RTO | RPO | Priority |
|----------|-----|-----|----------|
| [Critical system] | 4hr | 15min | Critical |
| [Important system] | 24hr | 1hr | High |
| [Standard system] | 48hr | 4hr | Medium |

**RTO**: Recovery Time Objective (how long to restore)
**RPO**: Recovery Point Objective (data loss tolerance)

## DR Scenarios

1. Data center outage
2. Cybersecurity incident
3. Key vendor failure
4. Natural disaster
5. Pandemic/workforce unavailable
