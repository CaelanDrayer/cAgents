# Knowledge Transfer Patterns

Protocols and patterns for effective knowledge transfer, mentoring, and onboarding learning paths.

## Knowledge Transfer Framework

### Transfer Types

| Type | Description | Duration | Best For |
|------|-------------|----------|----------|
| Structured handoff | Formal session with documentation | 1-2 weeks | Role transitions, project handovers |
| Shadowing | Observer follows expert through workflow | 3-5 days | Process learning, tacit knowledge |
| Paired work | Two people work together on real tasks | 2-4 weeks | Skill building, code knowledge |
| Documentation-first | Written guides with Q&A follow-up | Ongoing | Reference knowledge, procedures |
| Reverse mentoring | Junior teaches senior (new tools, trends) | Ongoing | Cross-generational knowledge |

### Knowledge Capture Process

1. **Identify critical knowledge** - Map what the expert knows that others do not
2. **Categorize by type** - Explicit (documentable) vs. tacit (experiential)
3. **Select transfer method** - Match knowledge type to transfer approach
4. **Schedule sessions** - Protected time with no interruptions
5. **Document outcomes** - Capture decisions, context, and reasoning
6. **Validate transfer** - Recipient demonstrates competency independently
7. **Archive artifacts** - Store in accessible, searchable location

### Critical Knowledge Categories

```
Explicit Knowledge (easy to transfer):
  - Architecture decisions and rationale
  - Configuration and deployment procedures
  - API contracts and integration points
  - Troubleshooting runbooks
  - Business rules and domain logic

Tacit Knowledge (requires interaction):
  - Why certain approaches were chosen over alternatives
  - Stakeholder relationships and communication preferences
  - Unwritten team norms and cultural context
  - Intuition for debugging and root cause analysis
  - Historical context for legacy decisions
```

## Mentoring Protocols

### Mentor-Mentee Pairing Criteria

Match mentors to mentees using these factors:

| Factor | Weight | Rationale |
|--------|--------|-----------|
| Skill complementarity | High | Mentor should be strong where mentee needs growth |
| Communication style compatibility | Medium | Reduces friction, builds trust faster |
| Domain overlap | Medium | Shared context enables practical guidance |
| Availability alignment | High | Consistent meeting cadence is essential |
| Career path relevance | Low-Medium | Inspirational but not strictly required |

### Mentoring Cadence

```
First Month (Establishing):
  - Meet 2x per week, 30 minutes each
  - Set 3 concrete learning goals
  - Mentor reviews all mentee work output
  - Weekly written progress reflection

Months 2-3 (Building):
  - Meet 1x per week, 45 minutes
  - Mentee leads the agenda
  - Shift from review to advisory
  - Introduce stretch assignments

Months 4-6 (Sustaining):
  - Meet biweekly, 30-60 minutes
  - Mentee operates independently
  - Focus on career development and strategy
  - Evaluate goal completion, set new goals

Ongoing (Alumni):
  - Monthly or quarterly check-ins
  - Available for ad-hoc questions
  - Mentee begins mentoring others
```

### Mentoring Session Structure

A productive mentoring session follows this pattern:

1. **Check-in** (5 min) - How is the mentee doing? Any blockers?
2. **Review** (10 min) - Discuss recent work, decisions, challenges
3. **Teaching moment** (15 min) - Deep dive into one topic or skill
4. **Forward planning** (10 min) - Next steps, assignments, goals
5. **Reflection** (5 min) - What was most valuable? Any adjustments needed?

### Mentor Responsibilities

- Provide timely, constructive feedback
- Share relevant experiences and lessons learned
- Challenge assumptions while maintaining psychological safety
- Connect mentee with relevant people and resources
- Escalate concerns about progress or well-being appropriately
- Model professional behavior and growth mindset

## Onboarding Learning Paths

### Onboarding 30-60-90 Day Framework

| Phase | Objective | Key Activities |
|-------|-----------|----------------|
| Days 1-30 | Understand codebase, team, processes | Setup, architecture review, pair on first task, shadow rotation |
| Days 31-60 | Deliver independently | Own medium features, participate in design, start on-call |
| Days 61-90 | Take domain ownership | Lead feature end-to-end, present deep-dive, set 6-month goals |

Each phase ends with a formal checkpoint: assessment with manager, mentor feedback, and updated development plan.

### Cross-Team Knowledge Sharing

| Format | Frequency | Duration | Purpose |
|--------|-----------|----------|---------|
| Tech talk | Biweekly | 30 min | Share expertise broadly |
| Lunch and learn | Weekly | 45 min | Informal deep dives |
| Architecture review | Monthly | 60 min | Cross-system alignment |
| Post-mortem | As needed | 60 min | Learn from incidents |
| Rotation program | Quarterly | 2-4 weeks | Build cross-team empathy |

## Knowledge Retention Strategies

### Bus Factor Mitigation

Reduce single-point-of-failure knowledge risks:

1. **Identify** - Map which knowledge is held by only one person
2. **Prioritize** - Rank by business criticality and departure risk
3. **Spread** - Pair on critical systems, cross-train team members
4. **Document** - Write decision logs, runbooks, and architecture records
5. **Verify** - Test that secondary people can operate independently
6. **Maintain** - Reassess quarterly as teams and systems evolve

## Anti-Patterns

- Treating documentation as a substitute for interactive knowledge transfer
- Assuming knowledge transfer is complete after a single session
- Pairing mentors and mentees without considering compatibility
- Skipping the validation step (recipient must demonstrate, not just observe)
- Front-loading all training in week one instead of spacing it out
- Ignoring tacit knowledge because it is harder to capture
