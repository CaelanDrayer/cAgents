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
