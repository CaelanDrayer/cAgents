# Quality Management Frameworks

## Quality Management System

### QMS Components
1. **Policy**: Quality commitment and objectives
2. **Processes**: Documented procedures
3. **Metrics**: Quality KPIs and targets
4. **Audits**: Regular assessments
5. **Improvement**: Continuous improvement cycle

### Quality Policy Template
```markdown
# Quality Policy

## Commitment
[Organization] is committed to delivering products/services
that meet customer requirements and exceed expectations.

## Objectives
1. Customer satisfaction score > 90%
2. Defect rate < 1%
3. On-time delivery > 95%
4. Continuous improvement culture

## Responsibilities
- Leadership: Provide resources, set direction
- Managers: Implement QMS, monitor performance
- Employees: Follow procedures, report issues
```

## Quality Metrics

### Key Quality Indicators
| Metric | Definition | Target |
|--------|------------|--------|
| Defect Rate | Defects / Total units | <1% |
| First Pass Yield | Good units / Total units | >95% |
| Customer Complaints | Complaints / Customers | <0.5% |
| NPS | Net Promoter Score | >50 |
| CSAT | Customer Satisfaction | >90% |
| Rework Rate | Rework hours / Total hours | <5% |

### Quality Dashboard
```yaml
Leading Indicators:
  - Process compliance rate
  - Training completion
  - Audit findings closed

Lagging Indicators:
  - Defect rate
  - Customer complaints
  - Cost of quality

Trending:
  - Monthly quality scores
  - Year-over-year improvement
```

## Root Cause Analysis

### 5 Whys Method
```markdown
Problem: [Describe the problem]

Why 1: [First why]
Why 2: [Second why]
Why 3: [Third why]
Why 4: [Fourth why]
Why 5: [Root cause - usually reached by 5th why]

Countermeasure: [Action to address root cause]
```

### Fishbone Diagram Categories
| Category | Example Causes |
|----------|---------------|
| People | Training, skills, errors |
| Process | Procedures, workflow, timing |
| Equipment | Machines, tools, software |
| Materials | Inputs, suppliers, quality |
| Environment | Conditions, workspace |
| Measurement | Metrics, calibration, inspection |

## Continuous Improvement

### PDCA Cycle
1. **Plan**: Identify opportunity, plan change
2. **Do**: Implement on small scale
3. **Check**: Measure results, compare to goals
4. **Act**: Standardize if successful, or adjust

### Kaizen Events
```yaml
Kaizen Event:
  Focus Area: [Process to improve]
  Duration: 3-5 days
  Team: Cross-functional (5-8 people)

  Agenda:
    Day 1: Current state analysis
    Day 2: Root cause identification
    Day 3: Solution development
    Day 4: Implementation
    Day 5: Results and standardization

  Expected Outcomes:
    - Process improvement
    - Documented new standard
    - Measurable results
```

## Quality Audits

### Audit Schedule
| Audit Type | Frequency | Scope |
|------------|-----------|-------|
| Internal | Quarterly | All processes |
| Supplier | Annual | Key suppliers |
| Certification | Annual | QMS (ISO 9001) |
| Customer | As required | Specific areas |

### Audit Checklist Template
```yaml
Process: [Process name]
Date: [Date]
Auditor: [Name]

Checklist:
  - [ ] Documented procedure exists
  - [ ] Procedure is current (reviewed within 12 months)
  - [ ] Staff trained on procedure
  - [ ] Records maintained per requirements
  - [ ] Process metrics defined and tracked
  - [ ] Nonconformances addressed
  - [ ] Improvements implemented

Findings:
  - [Finding 1]
  - [Finding 2]

Score: [Rating]
```

## Cost of Quality

### Quality Cost Categories
| Category | Examples |
|----------|----------|
| Prevention | Training, process design, quality planning |
| Appraisal | Inspection, testing, audits |
| Internal Failure | Rework, scrap, root cause analysis |
| External Failure | Warranty, returns, complaints |

### Cost of Quality Analysis
```yaml
Prevention Costs: $X (target: increase)
Appraisal Costs: $Y (optimize)
Internal Failure: $Z (reduce)
External Failure: $W (eliminate)

Total Cost of Quality: $X + $Y + $Z + $W
Target: <5% of revenue

Goal: Increase prevention to reduce failure costs
```

## Training Program

### Quality Training Matrix
| Role | Core QMS | Root Cause | Statistical | Audit |
|------|----------|------------|-------------|-------|
| All Staff | Required | | | |
| Team Leads | Required | Required | | |
| QA Team | Required | Required | Required | Required |
| Auditors | Required | Required | | Required |
