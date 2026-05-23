# Organizational Planning

Reference for workforce planning, org design, and succession planning.

## Workforce Planning Framework

### 1. Current State Assessment

**Headcount Analysis**:
| Department | Current HC | Open Reqs | Attrition Rate | Avg Tenure |
|-----------|-----------|-----------|----------------|------------|
| Engineering | | | | |
| Product | | | | |
| Sales | | | | |
| Operations | | | | |

**Skills Inventory**:
- Map current capabilities against strategic needs
- Identify skill gaps by team and function
- Assess depth (single points of failure vs. distributed knowledge)
- Rate proficiency levels: Learning, Competent, Expert, Master

### 2. Future State Modeling

**Demand Drivers**:
- Business growth targets (revenue, customers, products)
- New market entry or product launches
- Technology changes requiring new skills
- Regulatory changes requiring new roles

**Supply Factors**:
- Predicted attrition (historical rate + known departures)
- Internal mobility and promotion pipeline
- External labor market conditions
- Ramp time for new hires by role type

### 3. Gap Analysis

```
Gap = Future Demand - (Current Supply - Predicted Attrition + Planned Hires)
```

**Gap Resolution Options**:
| Strategy | Timeline | Cost | Use When |
|----------|----------|------|----------|
| Hire externally | 2-6 months | High | Skill doesn't exist internally |
| Develop internally | 6-18 months | Medium | Growth opportunity, retention |
| Contract/Outsource | 1-4 weeks | Variable | Temporary need, specialized skill |
| Restructure | 1-3 months | Low | Skills exist but misallocated |
| Automate | 3-12 months | High upfront | Repetitive, scalable tasks |

## Org Design Principles

### Span of Control Guidelines

| Role Level | Recommended Span | Rationale |
|-----------|-----------------|-----------|
| IC Manager | 5-8 direct reports | Hands-on coaching, code review |
| Senior Manager | 6-10 | Mix of ICs and leads |
| Director | 5-8 managers | Strategic oversight |
| VP/SVP | 4-7 directors | Cross-functional alignment |

### Team Topology Patterns

**Stream-Aligned Team**: Aligned to a flow of work (product feature, user journey)
- Size: 5-9 members
- Capabilities: Full-stack, can deliver end-to-end
- Autonomy: High (own their roadmap)

**Platform Team**: Provides internal services to stream-aligned teams
- Size: 3-7 members
- Focus: Developer experience, infrastructure, tooling
- Interface: Self-service APIs and documentation

**Enabling Team**: Helps other teams adopt new capabilities
- Size: 2-5 members
- Temporary engagement with other teams
- Focus: Teaching, not doing

**Complicated Subsystem Team**: Deep specialist knowledge required
- Size: 3-5 members
- Focus: ML models, cryptography, real-time processing
- Interface: APIs consumed by stream-aligned teams

### Reporting Structure Template

```
CEO
  CTO
    VP Engineering
      Engineering Manager (Team A)
        Senior Engineers (3-4)
        Engineers (2-3)
      Engineering Manager (Team B)
    VP Product
      Product Managers (3-4)
  CRO
    VP Sales
    VP Marketing
  CFO
    Finance Manager
    Operations Manager
```

## Succession Planning

### 9-Box Grid Assessment

```
         Low Performance  |  Solid Performance  |  High Performance
High     Enigma           |  Future Star         |  Star
Potential (Develop or move)|  (Accelerate growth) |  (Retain, promote)

Medium   Underperformer   |  Core Contributor    |  High Performer
Potential (Performance plan)|  (Develop in role)  |  (Expand scope)

Low      Risk             |  Solid Professional  |  Mastery
Potential (Exit plan)      |  (Maintain, reward)  |  (Leverage expertise)
```

### Critical Role Identification

A role is critical if:
- Vacancy would significantly impact business results within 30 days
- Specialized knowledge that takes 12+ months to develop
- External market for this skill is highly competitive
- Role is on the critical path for strategic initiatives

### Succession Readiness Levels

| Level | Definition | Action |
|-------|-----------|--------|
| Ready Now | Can step into role immediately | Prepare transition plan |
| Ready 1-2 Years | Needs specific development | Create development plan |
| Ready 3-5 Years | High potential, early career | Assign stretch projects |
| No Successor | No internal candidate identified | External pipeline needed |

## Planning Cadence

| Activity | Frequency | Participants |
|----------|-----------|-------------|
| Headcount review | Monthly | HRBP + hiring managers |
| Workforce plan update | Quarterly | HRBP + VP/Directors |
| Org design review | Semi-annually | HRBP + C-suite |
| Succession review | Annually | HRBP + CEO + leadership |
| Skills gap analysis | Annually | HRBP + L&D + managers |
