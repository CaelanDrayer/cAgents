# Organization Scaling Patterns

Guide to scaling engineering teams effectively.

## Team Structure Models

### Squad Model (Spotify-style)

```
Tribe (~40-150 people)
├── Squad A (5-9 people) - Feature team
├── Squad B (5-9 people) - Feature team
├── Squad C (5-9 people) - Platform team
└── Chapter (cross-squad skill group)
    ├── Backend developers from all squads
    └── Shared practices and standards
```

**Pros:**
- Autonomous teams
- End-to-end ownership
- Fast decision making

**Cons:**
- Coordination overhead
- Potential duplication
- Requires mature teams

### Pod Model

```
Pod = Mini startup
├── Product Manager
├── Engineering Lead
├── 3-5 Engineers
├── Designer
└── QA (shared or embedded)
```

**Pros:**
- Clear ownership
- Balanced skills
- Product focus

**Cons:**
- Resource intensity
- Cross-pod dependencies

### Traditional Hierarchy

```
VP Engineering
├── Engineering Manager (Team A)
│   └── Engineers (5-10)
├── Engineering Manager (Team B)
│   └── Engineers (5-10)
└── Engineering Manager (Platform)
    └── Engineers (5-10)
```

**Pros:**
- Clear reporting
- Defined career paths
- Simpler coordination

**Cons:**
- Slower decisions
- Silos between teams
- Less autonomy

## Scaling Milestones

### 0-10 Engineers
- Flat structure
- Everyone does everything
- Direct communication
- Minimal process

**Focus:** Ship fast, find product-market fit

### 10-25 Engineers
- Introduce tech lead role
- Split into 2-3 teams
- Basic sprint process
- Start on-call rotation

**Focus:** Establish foundation

### 25-50 Engineers
- Hire first Engineering Managers
- Clear team boundaries
- Dedicated platform/infra team
- Formal code review process

**Focus:** Scale without chaos

### 50-100 Engineers
- Multiple EM layers
- Architecture review board
- Career ladder formalized
- Engineering brand/culture

**Focus:** Maintain velocity and quality

### 100+ Engineers
- Director/VP structure
- Guilds/chapters for specialties
- Internal tools team
- Dedicated security team

**Focus:** Efficiency at scale

## Hiring Strategy

### Pipeline Building

```
Sourcing -> Screening -> Interview -> Offer -> Close
   |           |            |          |        |
  30%         50%          30%       90%      80%
 passthrough rates (typical)
```

**To hire 10 engineers:**
- ~40 offers extended
- ~130 final interviews
- ~260 screens
- ~800 sourced candidates

### Interview Process

**Stage 1: Recruiter Screen (30 min)**
- Role fit
- Motivation
- Salary expectations

**Stage 2: Technical Screen (60 min)**
- Coding problem
- Technical discussion
- Architecture basics

**Stage 3: On-site (4-5 hours)**
- System design
- Coding deep dive
- Behavioral/values
- Team fit
- Hiring manager

**Stage 4: Reference Check**
- 2-3 references
- Verify claims
- Red flag identification

### Making Offers

**Competitive Package:**
- Base salary (market rate + 10%)
- Equity/RSUs (meaningful stake)
- Sign-on bonus (if needed)
- Benefits (health, 401k, PTO)

**Closing Tips:**
- Fast turnaround (24-48 hours)
- Personal touch (team reach out)
- Address concerns proactively
- Deadline with flexibility

## Team Health Indicators

### Healthy Team Signs
- Sprint commitments met consistently
- Low turnover (<10% annual)
- Active participation in discussions
- Healthy code review culture
- Blameless post-mortems
- Engineers recommend company to friends

### Warning Signs
- Consistently missing commitments
- High turnover (>20% annual)
- Silent in meetings
- Rubber-stamp code reviews
- Blame culture
- Engineers not referring friends

## Capacity Planning

### Headcount Formula

```
Required Headcount =
  (Total Work Items × Average Effort) /
  (Sprint Capacity × Team Velocity × Available FTEs)

Buffer = 15-20% for unplanned work
```

### Allocation Guidelines

| Activity | % of Time |
|----------|-----------|
| Feature work | 60-70% |
| Technical debt | 15-20% |
| Innovation/learning | 10% |
| On-call/support | 5-10% |

### Contractor vs FTE Decision

**Use Contractors For:**
- Short-term projects (<6 months)
- Specialized skills not needed long-term
- Surge capacity
- Cover leave/transitions

**Use FTEs For:**
- Core product development
- Strategic technology
- Leadership roles
- Institutional knowledge

## Organization Design Principles

### Conway's Law
> Organizations design systems that mirror their communication structure

**Implication:** Design teams around desired architecture

### Two-Pizza Teams
> If a team can't be fed by two pizzas, it's too large

**Optimal size:** 5-9 people

### Dunbar's Number
> Humans can maintain ~150 stable relationships

**Implication:** Beyond 150 engineers, need formal coordination

### Span of Control
- IC Manager: 5-8 direct reports
- Manager of Managers: 4-6 direct reports
- Skip levels: Monthly with all reports

## Reorganization Playbook

### When to Reorg
- Growth outpacing structure
- Clear ownership gaps
- Persistent delivery issues
- Strategic shift requiring new teams
- Post-merger integration

### Reorg Process
1. Define goals (why reorg?)
2. Design new structure
3. Map people to roles
4. Communication plan
5. Announce (single day)
6. Transition period (2-4 weeks)
7. Stabilization (1-2 months)
8. Retrospective

### Common Mistakes
- Reorganizing too frequently
- Poor communication
- Unclear role definitions
- Ignoring emotional impact
- No transition support
- Declaring success too early
