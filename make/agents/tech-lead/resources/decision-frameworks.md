# Tech Lead Decision Frameworks

Decision-making approaches and frameworks for common tech lead scenarios.

## Priority Classification Framework

### Critical (Immediate Response)
- Production incidents affecting revenue or users
- Security vulnerabilities in production
- Contract/compliance deadlines
- Data loss or corruption risk

**Response**: Drop everything, mobilize team, resolve within hours

### High (Same Day)
- Blockers affecting delivery
- Security issues in staging/development
- Customer-facing bugs
- Resource conflicts affecting timeline

**Response**: Address within business day, reallocate resources if needed

### Medium (This Week)
- Technical debt paydown
- Process improvements
- Non-blocking bugs
- Performance optimizations (not critical)

**Response**: Schedule within current sprint, balance with other work

### Low (Backlog)
- Nice-to-have features
- Exploratory work
- Documentation improvements
- Minor refactoring

**Response**: Add to backlog, address when capacity allows

---

## Build vs. Buy Decision Framework

### Evaluate These Factors

| Factor | Build | Buy |
|--------|-------|-----|
| Core competency | Yes | No |
| Competitive advantage | Yes | No |
| Customization needed | High | Low |
| Time to market | Long OK | Short needed |
| Maintenance capacity | Have it | Limited |
| Budget | Limited | Available |
| Risk tolerance | High | Low |

### Decision Tree

1. **Is this a core competency?**
   - Yes → Lean toward build
   - No → Continue

2. **Does a solution exist that meets 80%+ of needs?**
   - Yes → Lean toward buy
   - No → Continue

3. **Can we afford the maintenance burden?**
   - Yes → Build is viable
   - No → Buy or simplify

4. **Is time-to-market critical?**
   - Yes → Buy if available
   - No → Build may be worth it

### Example
- Build: Custom recommendation engine (competitive advantage)
- Buy: Payment processing (not core, mature solutions exist)

---

## Refactoring Decision Framework

### When to Refactor

1. **Before adding features to problematic code**
   - New feature touches messy module
   - High bug risk without refactor
   - Refactor investment pays off in feature quality

2. **When maintenance cost exceeds threshold**
   - Every bug fix takes 2x longer than expected
   - New team members struggle to understand
   - Code review cycles are excessive

3. **When technical debt blocks progress**
   - Can't add monitoring/testing
   - Performance can't be improved
   - Security can't be hardened

### When NOT to Refactor

1. **Code works and won't change**
   - Stable module with no planned changes
   - "If it ain't broke, don't fix it"

2. **No budget/timeline**
   - Critical deadline approaching
   - No capacity to absorb delay

3. **Better to rewrite**
   - Refactor effort > rewrite effort
   - Architecture fundamentally wrong

### Refactor ROI Calculation

```
Refactor Cost = (Days to refactor) × (Team cost per day)
No-Refactor Cost = (Extra time per future change) × (Expected changes) × (Team cost)

If No-Refactor Cost > Refactor Cost → Refactor
```

---

## Risk Assessment Framework

### Risk Identification

For each initiative, ask:
- What could go wrong technically?
- What could go wrong with timeline?
- What could go wrong with team/resources?
- What could go wrong with dependencies?
- What could go wrong with requirements?

### Risk Classification

| Likelihood | Impact: Low | Impact: Medium | Impact: High |
|------------|-------------|----------------|--------------|
| High | Medium | High | Critical |
| Medium | Low | Medium | High |
| Low | Accept | Low | Medium |

### Risk Mitigation Strategies

1. **Avoid**: Change approach to eliminate risk
2. **Mitigate**: Take action to reduce likelihood or impact
3. **Transfer**: Shift risk to another party (vendor, insurance)
4. **Accept**: Acknowledge and monitor

### Example Risk Register

| Risk | Likelihood | Impact | Level | Mitigation |
|------|------------|--------|-------|------------|
| API provider outage | Medium | High | High | Implement caching, circuit breaker |
| Key developer leaves | Low | High | Medium | Knowledge sharing, documentation |
| Scope creep | High | Medium | High | Clear requirements, change control |

---

## Trade-off Analysis Framework

### Quality vs. Speed

```
Question: Can we ship faster with lower quality?

Analyze:
- What quality can be deferred? (polish, edge cases)
- What quality cannot be deferred? (security, data integrity)
- What's the cost of fixing later vs. doing now?
- What's the business cost of delay?

Decision: Trade-off is acceptable when:
- Deferred quality doesn't create technical debt
- Business value of speed exceeds cost of later fixes
- Core functionality and security are maintained
```

### Scope vs. Timeline

```
Question: Should we reduce scope or extend timeline?

Analyze:
- Is deadline hard (contract, event) or soft (internal)?
- Which features are must-have vs. nice-to-have?
- What's the cost of missing deadline?
- What's the value of deferred features?

Decision: Reduce scope when:
- Deadline is hard and non-negotiable
- Clear distinction between must-have and nice-to-have
- Deferred features can be added later without rework
```

### Feature vs. Technical Debt

```
Question: New feature or pay down debt?

Analyze:
- How much does debt slow current development?
- How critical is the new feature?
- Will debt get worse if we wait?
- What's the payback period for debt work?

Decision: Pay debt when:
- Debt blocks or significantly slows the new feature
- Debt payback period < 3 months
- Feature can wait without business impact
```

---

## Escalation Decision Framework

### When to Escalate to HITL

1. **Budget/resource requests beyond authority**
   - New headcount needed
   - Significant budget for tools/services
   - External vendor contracts

2. **Strategic direction changes**
   - Major architectural shifts
   - Technology stack changes
   - Product direction pivots

3. **Unresolvable team conflicts**
   - Persistent disagreements after mediation
   - Conflicts affecting delivery
   - HR-related issues

4. **Risk acceptance beyond authority**
   - Security exceptions
   - Compliance risks
   - Major deadline changes

### Escalation Checklist

Before escalating, ensure you have:
- [ ] Clear problem statement
- [ ] Options with trade-offs
- [ ] Recommended approach with rationale
- [ ] Impact assessment
- [ ] Timeline requirements

---

## Incident Response Framework

### Severity Classification

| Severity | Description | Response Time | Communication |
|----------|-------------|---------------|---------------|
| SEV-1 | System down, data loss, security breach | Immediate | All hands, exec notification |
| SEV-2 | Major feature broken, significant impact | < 1 hour | Team mobilized, stakeholder update |
| SEV-3 | Minor feature broken, workaround exists | < 4 hours | Normal escalation |
| SEV-4 | Cosmetic, no user impact | Next business day | Bug tracking only |

### Incident Response Steps

1. **Detect & Classify**: Understand severity, impact
2. **Mobilize**: Get right people involved
3. **Communicate**: Notify stakeholders
4. **Investigate**: Find root cause
5. **Resolve**: Fix or mitigate
6. **Verify**: Confirm resolution
7. **Document**: Record for post-mortem
8. **Improve**: Prevent recurrence

### Post-Mortem Template

```markdown
## Incident Summary
- Date/Time:
- Duration:
- Severity:
- Impact:

## Timeline
- HH:MM - Detection
- HH:MM - Response started
- HH:MM - Root cause identified
- HH:MM - Resolution implemented
- HH:MM - Verified resolved

## Root Cause
[Technical explanation]

## Contributing Factors
- Factor 1
- Factor 2

## Action Items
- [ ] Preventive action 1
- [ ] Preventive action 2

## Lessons Learned
- Learning 1
- Learning 2
```

---

## Sprint Planning Framework

### Capacity Calculation

```
Available Capacity = Team Members × Days × Focus Factor

Where:
- Days = Sprint length (usually 10 days)
- Focus Factor = 0.6-0.8 (accounts for meetings, support, etc.)

Example:
- 4 developers × 10 days × 0.7 = 28 development days
```

### Task Estimation Guidelines

| Size | Points | Description |
|------|--------|-------------|
| XS | 1 | Hours of work, well-understood |
| S | 2 | 1 day, clear requirements |
| M | 3-5 | 2-3 days, some uncertainty |
| L | 8 | 1 week, needs breakdown |
| XL | 13+ | Too big, must split |

### Sprint Composition

```
Recommended allocation:
- 70% Committed features
- 20% Buffer for unknown
- 10% Technical debt / improvements

Warning signs:
- > 80% committed = overloaded
- < 60% committed = may be underutilized
```

---

## Knowledge Base

### Technical Leadership Principles

1. **Lead by example**: Model the behavior you expect
2. **Empower the team**: Give autonomy with accountability
3. **Make decisions**: Don't delay, iterate if needed
4. **Communicate clearly**: Over-communicate decisions and rationale
5. **Balance short and long term**: Features today, quality for tomorrow
6. **Learn from failures**: Blameless post-mortems, continuous improvement
7. **Protect the team**: Shield from unnecessary distractions
8. **Develop others**: Mentor, delegate, grow the team
