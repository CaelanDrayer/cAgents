# Capacity Planning Guide

Comprehensive guide to forecasting resource needs, modeling capacity, and planning for sustainable delivery.

## Capacity Planning Fundamentals

### What Capacity Planning Answers

- How much work can the team realistically deliver in a given period?
- Do we have enough people with the right skills for planned initiatives?
- When will we hit capacity limits if demand continues to grow?
- Where should we invest in hiring, training, or tooling?

### Capacity vs. Allocation

| Concept | Definition | Time Horizon | Key Question |
|---------|-----------|-------------|--------------|
| **Capacity** | Total available work output | Medium to long term (quarters, years) | "How much can we do?" |
| **Allocation** | Assignment of capacity to specific work | Short to medium term (sprints, months) | "Who is doing what?" |
| **Demand** | Total work requested | Ongoing | "How much is asked of us?" |
| **Throughput** | Actual work completed | Historical | "How much did we actually do?" |

## Capacity Calculation

### Step 1: Raw Capacity

Start with the theoretical maximum:

```
Raw Capacity = Number of People x Working Days in Period x Hours per Day
```

Example: 8 people x 22 working days x 8 hours = 1,408 person-hours per month

### Step 2: Adjusted Capacity

Subtract known reductions:

| Reduction | Typical Impact | Calculation |
|-----------|---------------|-------------|
| Holidays and PTO | 10-15% | Subtract planned leave days |
| Meetings and overhead | 10-20% | Estimate recurring meeting load |
| On-call and support | 5-15% | Subtract rotation commitments |
| Training and development | 3-5% | Subtract planned learning time |
| Administrative tasks | 3-5% | Subtract reviews, reporting, admin |

```
Adjusted Capacity = Raw Capacity - (Holidays + Meetings + Support + Training + Admin)
```

### Step 3: Effective Capacity

Apply a productivity factor to account for context switching, interruptions, and ramp-up:

```
Effective Capacity = Adjusted Capacity x Productivity Factor (0.70 - 0.85)
```

**Productivity Factor Guidelines**:
- 0.85: Focused team, minimal interruptions, stable environment
- 0.80: Typical team with moderate interruptions
- 0.75: Team with frequent context switches or high unplanned work
- 0.70: Team in transition, new members ramping up, high disruption

### Step 4: Reserve Capacity

Set aside buffer for unplanned work:

```
Plannable Capacity = Effective Capacity x (1 - Unplanned Reserve)
```

**Unplanned Reserve Guidelines**:
- 10%: Mature team with stable, well-understood workload
- 15%: Typical team with moderate incident and support volume
- 20%: Team with high support burden or volatile demand
- 25%: Team in crisis mode or undergoing significant change

## Demand Forecasting

### Demand Sources

| Source | Predictability | Forecasting Approach |
|--------|---------------|---------------------|
| Roadmap initiatives | High | Top-down estimate from project plans |
| Maintenance and BAU | Medium-High | Historical average with seasonal adjustment |
| Bug fixes and incidents | Medium | Historical rate with trend analysis |
| Unplanned requests | Low | Reserve capacity based on historical volume |
| Technical debt | Low-Medium | Backlog grooming and prioritization |

### Forecasting Methods

| Method | Approach | Best For |
|--------|----------|----------|
| **Bottom-Up** | Break into tasks, estimate individually, apply 1.2-1.5x contingency | Near-term (1-3 months) with defined scope |
| **Top-Down** | Use historical throughput for similar initiatives | Medium-term (3-12 months) with rough scope |
| **Trend Analysis** | Plot historical demand, extrapolate with confidence intervals | Long-term (6-18 months) and hiring forecasts |

Accuracy decreases with time horizon: current sprint +/-10-20%, next quarter +/-25-40%, next half +/-40-60%. Re-estimate as work approaches.

## Capacity Modeling Scenarios

### Scenario Planning

Create multiple scenarios to prepare for different outcomes:

| Scenario | Assumptions | Key Questions |
|----------|-------------|---------------|
| **Baseline** | Current team, planned hiring, committed roadmap | Is capacity sufficient for commitments? |
| **Growth** | Baseline plus additional business demand | How many people needed? When? What skills? |
| **Constraint** | Reduced team (hiring freeze, departures) | What must be deferred? What is the impact? |
| **Disruption** | Major unplanned event (incident, regulatory change) | How quickly can capacity redirect? What gets dropped? |

Compare scenarios across team size, demand, capacity, gap, and action needed to inform contingency plans.

## Skills and Continuous Improvement

### Skills Inventory

Maintain a skills matrix for the team using proficiency levels:

- **Expert**: Can work independently and mentor others
- **Proficient**: Can work independently on standard tasks
- **Beginner**: Can work with guidance
- **None**: No experience (training needed)

### Skill Gap Analysis

1. List skills required for planned initiatives
2. Compare against team skills inventory
3. Identify gaps (required skills with no expert or proficient team member)
4. Prioritize gaps by frequency of need, criticality, and time to develop
5. Plan mitigations: training, hiring, contracting, or scope adjustment
6. Cross-train to ensure each critical skill has at least two proficient members

### Capacity Planning Retrospective

After each planning cycle, review:

- How accurate were capacity estimates vs. actuals?
- What unplanned work consumed capacity not anticipated?
- Were there skill gaps that caused delays?
- Did the buffer prove sufficient or insufficient?
- What should change for the next planning cycle?
