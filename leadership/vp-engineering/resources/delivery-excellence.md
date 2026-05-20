# Delivery Excellence

Sprint management, release engineering, and velocity optimization.

## Sprint Management

### Sprint Planning

**Before Planning:**
- Backlog groomed (stories estimated, prioritized)
- Dependencies identified
- Acceptance criteria clear
- Technical approach discussed

**During Planning:**
- Review sprint goal
- Team selects stories (pull, don't push)
- Break into tasks
- Identify blockers early
- Commit to reasonable amount

**Capacity Calculation:**
```
Team Capacity =
  (Engineers × Days × Hours/Day × Focus Factor) -
  (PTO + Meetings + On-call)

Focus Factor = 0.6-0.8 (account for interruptions)
```

### Sprint Execution

**Daily Standup (15 min max):**
- What did I complete?
- What am I working on?
- Any blockers?

**NOT for:**
- Problem solving
- Status reports to management
- Design discussions

**Mid-Sprint Health Check:**
- Burndown on track?
- Blockers being resolved?
- Scope changes needed?

### Sprint Review/Demo

**Format:**
- Demo working software
- Stakeholder feedback
- What's next

**Tips:**
- Show real features, not slides
- Let developers demo their work
- Celebrate achievements
- Capture feedback for backlog

### Sprint Retrospective

**Format (60-90 min):**
1. What went well? (10 min)
2. What didn't go well? (10 min)
3. What to try differently? (10 min)
4. Vote on top items (5 min)
5. Define action items (15 min)

**Retrospective Formats:**
- Start/Stop/Continue
- Mad/Sad/Glad
- 4Ls (Liked, Learned, Lacked, Longed For)
- Sailboat (wind, anchors, rocks)

## Velocity Management

### Measuring Velocity

```
Velocity = Story Points Completed / Sprint

Rolling Average = (V1 + V2 + V3) / 3 sprints
```

**Good Practices:**
- Use relative estimation (Fibonacci)
- Only count "Done" stories
- Track rolling average (not single sprint)
- Don't compare teams

**Anti-patterns:**
- Velocity as performance metric
- Comparing team velocities
- Pushing for higher points
- Changing estimates mid-sprint

### Improving Velocity

**Technical Improvements:**
- Reduce build times
- Automate testing
- Improve CI/CD
- Reduce technical debt
- Better tooling

**Process Improvements:**
- Smaller, clearer stories
- Better backlog grooming
- Reduce meeting overhead
- Improve code review speed
- Reduce context switching

**Team Improvements:**
- Reduce team changes
- Cross-training
- Pair programming
- Better communication
- Psychological safety

## Release Management

### Release Types

**Continuous Deployment:**
- Every commit to main deploys
- Feature flags control release
- Requires mature CI/CD
- Lowest risk per deployment

**Release Train:**
- Fixed schedule (e.g., bi-weekly)
- Features batch together
- Predictable for stakeholders
- Medium risk per release

**Manual Release:**
- On-demand deployment
- Explicit approval gates
- Higher risk per release
- More ceremony

### Release Checklist

**Pre-Release:**
- [ ] All features code complete
- [ ] Tests passing
- [ ] Code review complete
- [ ] QA sign-off
- [ ] Security scan passed
- [ ] Performance validated
- [ ] Documentation updated
- [ ] Release notes drafted
- [ ] Rollback plan documented

**Release Day:**
- [ ] Team notified
- [ ] Stakeholders informed
- [ ] Deploy to staging
- [ ] Smoke test staging
- [ ] Deploy to production
- [ ] Monitor metrics
- [ ] Verify critical flows

**Post-Release:**
- [ ] Monitor for 24-48 hours
- [ ] Address issues promptly
- [ ] Update documentation
- [ ] Retrospective if issues

### Feature Flags

**Benefits:**
- Decouple deploy from release
- Gradual rollout (canary)
- Quick kill switch
- A/B testing capability

**Best Practices:**
- Clean up old flags
- Default to off
- Document flag purpose
- Set expiration date

**Flag Lifecycle:**
```
Created -> Development -> Testing -> Rollout -> 100% -> Cleanup
```

## DORA Metrics

### Key Metrics

**Deployment Frequency:**
- Elite: Multiple per day
- High: Weekly to monthly
- Medium: Monthly to every 6 months
- Low: Every 6 months+

**Lead Time for Changes:**
- Elite: Less than 1 day
- High: 1 day to 1 week
- Medium: 1 week to 1 month
- Low: 1 month to 6 months

**Mean Time to Recovery:**
- Elite: Less than 1 hour
- High: Less than 1 day
- Medium: 1 day to 1 week
- Low: More than 1 week

**Change Failure Rate:**
- Elite: 0-15%
- High: 16-30%
- Medium: 31-45%
- Low: 46-60%

### Improving DORA Metrics

**Improve Deployment Frequency:**
- Automate testing
- Reduce batch size
- Feature flags
- Trunk-based development

**Reduce Lead Time:**
- Smaller PRs
- Faster code review
- Better CI/CD
- Reduce approval gates

**Reduce MTTR:**
- Better monitoring
- Runbooks
- Incident practice
- Automated rollback

**Reduce Change Failure Rate:**
- More testing
- Better code review
- Canary deployments
- Feature flags

## Technical Debt Management

### Tracking Technical Debt

**Categories:**
- Code debt (poor structure, duplication)
- Architecture debt (outdated patterns)
- Test debt (low coverage)
- Documentation debt
- Dependency debt (outdated libraries)

**Tracking Methods:**
- Dedicated backlog
- Tags on stories
- Quarterly review
- Tech debt ratio metric

### Paying Down Debt

**Allocation:**
- 15-20% of sprint capacity
- Dedicated "gardening" time
- Tech debt sprints (quarterly)
- Boy scout rule (leave better than found)

**Prioritization:**
| Priority | Criteria |
|----------|----------|
| High | Blocks features, security risk, causing incidents |
| Medium | Slows development, reliability concern |
| Low | Code smell, nice to have |

### Preventing Debt

- Definition of Done includes quality
- Code review standards
- Architecture review for major changes
- Refactoring as part of feature work
- Automated quality gates
