# Gap Analysis Methods

Systematic approaches to identifying and documenting gaps between current and desired states.

## Gap Analysis Process

### Phase 1: Define Current State

Establish a thorough understanding of how things work today.

**Assessment Areas**:
- Business processes and workflows
- Technology systems and integrations
- Team capabilities and capacity
- Data flows and information architecture
- Performance metrics and benchmarks
- Compliance and regulatory posture

**Data Collection Methods**:
- Process observation and shadowing
- System audits and inventory
- Performance metric extraction
- Stakeholder interviews (see requirements-gathering-framework.md)
- Document review and artifact analysis

**Current State Documentation**:
1. Process flow diagrams showing actual (not ideal) workflows
2. System architecture diagrams with integration points
3. Capability matrix mapping skills to roles
4. Performance baseline with quantified metrics
5. Known issues log with severity and frequency

### Phase 2: Define Desired State

Articulate the target state with measurable outcomes.

**Vision Development**:
- Align with strategic objectives and business goals
- Define success criteria with specific metrics
- Identify required capabilities and features
- Establish timeline expectations
- Document constraints and non-negotiable boundaries

**Desired State Documentation**:
1. Target process flows with efficiency improvements
2. Target architecture with required capabilities
3. Performance targets with measurable thresholds
4. Capability requirements mapped to business outcomes
5. Compliance requirements mapped to regulations

### Phase 3: Identify Gaps

Compare current and desired states systematically.

**Gap Categories**:

| Category | Description | Examples |
|----------|-------------|---------|
| Process | Missing or inefficient workflows | Manual steps that should be automated |
| Technology | Missing systems or capabilities | No API integration between CRM and billing |
| People | Skill or capacity shortfalls | No team member trained on Kubernetes |
| Data | Missing or poor quality data | Customer data spread across 4 unlinked systems |
| Compliance | Regulatory non-conformance | Missing audit trail for financial transactions |
| Performance | Metrics below target thresholds | Page load time 4.2s vs target 2.0s |

**Gap Documentation Template**:

```
Gap ID: GAP-001
Category: Technology
Current State: Manual CSV export from system A, manual import to system B
Desired State: Real-time API integration between system A and system B
Impact: 8 hours/week manual effort, 24-hour data latency, error rate 3%
Severity: High
Dependencies: API availability on system A (vendor roadmap Q3)
```

### Phase 4: Analyze Impact

Assess each gap's business impact to drive prioritization.

**Impact Dimensions**:
- Revenue impact (lost revenue, missed opportunities)
- Cost impact (operational inefficiency, waste)
- Risk impact (compliance exposure, security vulnerability)
- Customer impact (satisfaction, retention, experience)
- Employee impact (productivity, morale, turnover)
- Strategic impact (competitive positioning, market readiness)

**Impact Scoring Matrix**:

| Score | Revenue | Cost | Risk | Customer | Strategic |
|-------|---------|------|------|----------|-----------|
| 5 - Critical | >$1M loss | >$500K waste | Regulatory penalty | Churn >10% | Blocks strategy |
| 4 - High | $500K-$1M | $200-500K | Audit finding | Churn 5-10% | Delays strategy |
| 3 - Medium | $100-500K | $50-200K | Policy violation | NPS drop >10 | Limits growth |
| 2 - Low | $10-100K | $10-50K | Best practice gap | Minor friction | Cosmetic |
| 1 - Minimal | <$10K | <$10K | Theoretical risk | Unnoticed | No impact |

### Phase 5: Develop Recommendations

Create actionable recommendations for closing each gap.

**Recommendation Structure**:
- Gap reference (link to specific gap)
- Proposed solution (what to do)
- Rationale (why this approach)
- Estimated effort (time, cost, resources)
- Expected benefit (quantified improvement)
- Implementation approach (build, buy, partner, defer)
- Dependencies and prerequisites
- Risks and mitigation strategies

**Solution Evaluation Criteria**:
1. Alignment with desired state
2. Cost-benefit ratio
3. Implementation complexity
4. Time to value
5. Risk profile
6. Scalability and future-proofing

## Gap Analysis Frameworks

### Fishbone (Ishikawa) Diagram

Organize gaps by root cause categories:
- People (skills, capacity, motivation)
- Process (workflows, procedures, policies)
- Technology (systems, tools, infrastructure)
- Data (quality, availability, integration)
- Environment (market, regulatory, competitive)
- Management (governance, oversight, decision-making)

### SWOT-Gap Integration

Map gaps against SWOT analysis:
- Gaps in Strengths area: protect and maintain
- Gaps in Weakness area: prioritize for improvement
- Gaps in Opportunity area: invest for growth
- Gaps in Threat area: mitigate urgently

### Maturity Model Assessment

Evaluate capabilities on a maturity scale:

| Level | Name | Description |
|-------|------|-------------|
| 1 | Initial | Ad-hoc, unpredictable, reactive |
| 2 | Managed | Planned, tracked, controlled at project level |
| 3 | Defined | Standardized, documented, proactive |
| 4 | Quantitatively Managed | Measured, data-driven, predictable |
| 5 | Optimizing | Continuous improvement, innovative |

Rate each capability area at current and target maturity levels. The difference reveals gaps and informs the improvement roadmap.

## Deliverables

### Gap Analysis Report Structure

1. **Executive Summary** - Key findings, critical gaps, top recommendations
2. **Current State Assessment** - Documented baseline with evidence
3. **Desired State Definition** - Target state with success criteria
4. **Gap Inventory** - Complete catalog of identified gaps
5. **Impact Analysis** - Prioritized gaps by business impact
6. **Recommendations** - Actionable solutions with effort estimates
7. **Roadmap** - Phased implementation plan
8. **Appendices** - Supporting data, interview summaries, detailed analysis

### Gap Tracking Dashboard Metrics

- Total gaps identified vs. closed
- Gaps by category and severity
- Time to close by gap category
- Business impact mitigated (quantified)
- Implementation progress by phase

## Common Pitfalls

- Confusing symptoms with root causes (dig deeper)
- Focusing only on technology gaps (process and people gaps are equally important)
- Not quantifying impact (vague gaps get deprioritized)
- Ignoring interdependencies between gaps
- Recommending solutions before fully understanding gaps
- Not validating findings with multiple stakeholder groups
- Setting unrealistic desired state targets
- Failing to reassess gaps as conditions change
