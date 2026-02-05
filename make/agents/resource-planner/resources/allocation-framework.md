# Resource Allocation Framework

Structured approach to planning, assigning, and optimizing resource allocation across projects and initiatives.

## Allocation Principles

### Core Rules

1. **Demand exceeds supply** - Always assume more work exists than capacity allows. Allocation is about prioritization, not fitting everything in.
2. **People are not interchangeable** - Skills, experience, and context matter. A "resource" is a person with specific strengths.
3. **Partial allocation has overhead** - Splitting a person across many projects reduces effective output due to context switching. Minimize assignments below 40% allocation.
4. **Buffer is not waste** - Plan for 75-85% utilization, not 100%. The remaining capacity absorbs unplanned work, learning, and collaboration.
5. **Visibility enables decisions** - Decision-makers cannot prioritize what they cannot see. Make allocation transparent.

### Allocation Hierarchy

When demand exceeds supply, allocate in this priority order:

1. **Committed obligations** - Contractual deadlines, regulatory requirements, live incidents
2. **Strategic priorities** - Work aligned with top organizational goals
3. **Revenue-generating work** - Direct customer or revenue impact
4. **Enabling work** - Infrastructure, tooling, and platform improvements
5. **Improvement work** - Technical debt, process optimization, learning

## Allocation Process

### Step 1: Gather Demand

Collect all resource requests from project owners and stakeholders:

- Initiative name and owner
- Required skills and roles
- Estimated effort (person-days or person-weeks)
- Timeline and deadlines
- Priority classification (using the hierarchy above)
- Dependencies on other initiatives or teams

### Step 2: Assess Supply

Document available capacity for the planning period:

| Person | Role / Skills | Total Capacity | Pre-committed | Available |
|--------|--------------|----------------|---------------|-----------|
| Name | Backend, Python, AWS | 100% | 20% (on-call) | 80% |
| Name | Frontend, React, UX | 100% | 30% (support rotation) | 70% |

**Capacity Adjustments**:
- Subtract planned leave (vacation, holidays, training)
- Subtract recurring commitments (on-call, support rotation, meetings)
- Subtract organizational overhead (all-hands, reviews, admin)
- Apply a productivity factor (typically 0.75-0.85 of raw hours)

### Step 3: Match and Assign

Map demand to supply using a structured approach:

1. **Skill match**: Which people have the required skills?
2. **Availability match**: Which of those are available in the needed timeframe?
3. **Priority sort**: Assign highest-priority work first
4. **Conflict resolution**: When multiple initiatives need the same person, escalate to priority-based decision

### Step 4: Identify Gaps

After initial allocation, document shortfalls:

| Gap | Initiative Affected | Impact | Mitigation Options |
|-----|-------------------|--------|-------------------|
| No available backend developer | Project Alpha | 3-week delay | Hire contractor, shift timeline, reallocate from lower-priority work |
| Insufficient QA capacity | Projects Beta and Gamma | Reduced test coverage | Automate regression suite, defer Gamma testing by 1 sprint |

### Step 5: Optimize and Finalize

Review the allocation plan for efficiency:

- Are any individuals over-allocated (>85%)?
- Are any individuals significantly under-allocated (<50%)?
- Can work be resequenced to smooth demand peaks?
- Are there single points of failure (one person on a critical path)?
- Do all high-priority initiatives have adequate staffing?

## Conflict Resolution

### Common Conflict Types

| Conflict | Description | Resolution Approach |
|----------|-------------|-------------------|
| **Priority conflict** | Two initiatives claim equal priority for the same resource | Escalate to leadership for priority ranking |
| **Timeline conflict** | Resource needed for overlapping timeframes | Negotiate timeline shifts or partial allocation |
| **Skill conflict** | Only one person has the required skill | Cross-train a backup, hire, or contract |
| **Scope conflict** | Initiative scope expanded, consuming more resources than planned | Renegotiate scope or secure additional resources |

### Escalation Path

1. **Resource planner** attempts resolution through resequencing or partial allocation
2. **Project owners** negotiate directly on timeline or scope trade-offs
3. **Portfolio manager or leadership** makes priority-based decision
4. **Decision documented** with rationale in the allocation log

## Allocation Anti-Patterns

### What to Avoid

- **100% allocation**: Leaves no room for unplanned work, illness, or collaboration
- **Peanut butter spreading**: Allocating everyone thinly across all projects (10-20% each)
- **Hero dependency**: One person is critical to three or more initiatives simultaneously
- **Invisible allocation**: Commitments made informally without updating the central plan
- **Static plans**: Creating an allocation plan and never updating it

### Warning Signs

| Signal | What It Indicates | Action |
|--------|------------------|--------|
| People consistently working overtime | Over-allocation or underestimated effort | Rebalance or reduce scope |
| Frequent missed deadlines | Resource gaps or poor estimates | Audit allocation vs. actuals |
| High context-switching complaints | Too many concurrent assignments | Consolidate assignments |
| Unplanned work consuming >30% of capacity | Insufficient buffer or poor planning | Increase buffer or improve intake process |
| Key person unavailable causes project stoppage | Single point of failure | Cross-train or restructure dependencies |

## Tracking and Reporting

### Allocation Dashboard Metrics

| Metric | Target Range | Measurement |
|--------|-------------|-------------|
| Team utilization | 75-85% | Allocated hours / available hours |
| Allocation accuracy | >80% | Planned vs. actual allocation |
| Conflict resolution time | <48 hours | Time from conflict identified to resolved |
| Over-allocation incidents | <5% of team per period | Count of people allocated >90% |
| Unplanned work absorption | <20% of capacity | Unplanned hours / total hours |

### Reporting Cadence

- **Weekly**: Allocation status update (who is working on what, any blockers)
- **Bi-weekly or sprint boundary**: Allocation adjustments based on progress
- **Monthly**: Capacity utilization review and trend analysis
- **Quarterly**: Strategic allocation review aligned with portfolio priorities
