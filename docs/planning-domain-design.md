# Planning Domain - Complete Design & Specification

**Domain**: @cagents/planning
**Version**: 1.0
**Created**: 2026-01-10
**Status**: Design Complete - Ready for Implementation

---

## Executive Summary

### Purpose

The **Planning Domain** is a specialized meta-domain that assists with strategic planning, project planning, roadmap development, and implementation design across ALL other domains. It serves as a bridge between high-level objectives and executable plans.

### Why Planning Needs Its Own Domain

**Rationale**:
1. **Cross-Domain Planning**: Plans often span multiple domains (e.g., product launch involves software, marketing, sales, support)
2. **Strategic vs. Tactical**: Planning requires different thinking than execution
3. **Methodology Expertise**: Planning frameworks (Agile, OKRs, roadmapping) are specialized knowledge
4. **Stakeholder Coordination**: Plans require extensive stakeholder input and alignment
5. **Meta-Planning**: Planning for implementing cAgents itself is a perfect use case

### Overview

**Total Agents**: 22 (5 workflow + 1 executive + 16 team)
**Focus**: Strategic planning, project planning, roadmapping, implementation design
**Unique Value**: Meta-planning capability for any domain or cross-domain initiative

---

## Table of Contents

1. [Workflow Agents](#workflow-agents)
2. [Executive Leadership](#executive-leadership)
3. [Team Agents](#team-agents)
4. [Templates & Patterns](#templates--patterns)
5. [Cross-Domain Integration](#cross-domain-integration)
6. [Implementation Guide](#implementation-guide)

---

## Workflow Agents (5)

### 1. Router

**Purpose**: Classify planning request complexity and match to planning templates

**Template Detection**:
- `strategic_plan` - Multi-year strategic planning (3-5 years)
- `annual_plan` - Annual goals, objectives, budgets
- `quarterly_plan` - Quarterly OKRs, initiatives, roadmaps
- `project_plan` - Project scope, timeline, resources, deliverables
- `roadmap` - Product/feature roadmap planning
- `implementation_plan` - Detailed implementation planning (like this cAgents expansion!)
- `initiative_design` - New initiative scoping and planning
- `change_plan` - Organizational change management planning

**Complexity Factors**:
- Scope (team vs. department vs. company vs. ecosystem)
- Time horizon (sprint vs. quarter vs. year vs. multi-year)
- Stakeholder count and diversity
- Cross-domain coordination requirements
- Strategic vs. tactical nature
- Risk and uncertainty level
- Resource requirements
- Change management complexity

**Tier Examples**:
- **Tier 0**: "What's our Q1 roadmap?" (simple query)
- **Tier 1**: "Create basic project plan for website redesign" (single domain, clear scope)
- **Tier 2**: "Develop Q2 OKRs for engineering team" (moderate complexity, one domain)
- **Tier 3**: "Create annual strategic plan with cross-functional initiatives" (complex, multi-domain)
- **Tier 4**: "Design and implement complete cAgents expansion with 8 new domains" (expert-level meta-planning)

**Agent Specification**:
```yaml
---
name: router
description: Planning domain complexity classification agent. Matches planning requests to templates, assigns complexity tiers (0-4), and determines planning workflow path. Invoked after Trigger creates a planning instruction.
capabilities: ["template_matching", "tier_assignment", "scope_assessment", "stakeholder_analysis", "planning_methodology_selection", "complexity_analysis", "calibration_learning", "cpo_consultation"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: opus
color: purple
domain: planning
---
```

### 2. Planner

**Purpose**: Decompose planning objectives into structured planning tasks

**Planning Breakdown Process**:
1. **Understand Objective**: What needs to be planned?
2. **Select Methodology**: Agile, Waterfall, OKRs, Strategic Planning Framework
3. **Identify Stakeholders**: Who needs to be involved?
4. **Define Phases**: Research → Analysis → Design → Review → Finalization
5. **Assign Tasks**: Planning team members (strategist, analyst, PM, etc.)
6. **Set Milestones**: Planning deliverables and review points
7. **Plan the Plan**: Meta-planning for the planning process itself

**Strategic Planning Tasks**:
```yaml
example_strategic_planning_breakdown:
  ST1:
    description: "Conduct stakeholder interviews and requirements gathering"
    owner: strategic-planner
    estimated_duration: "1 week"
    deliverables: ["stakeholder_needs.yaml", "requirements_doc.md"]

  ST2:
    description: "Analyze current state and identify gaps"
    owner: business-analyst
    estimated_duration: "3 days"
    deliverables: ["current_state_analysis.md", "gap_assessment.yaml"]

  ST3:
    description: "Define strategic objectives and success criteria"
    owner: strategic-planner
    dependencies: [ST1, ST2]
    estimated_duration: "2 days"
    deliverables: ["strategic_objectives.yaml", "success_metrics.yaml"]

  ST4:
    description: "Develop strategic initiatives with resource requirements"
    owner: program-manager
    dependencies: [ST3]
    estimated_duration: "5 days"
    deliverables: ["initiatives_roadmap.md", "resource_plan.yaml"]

  ST5:
    description: "Create implementation timeline and milestones"
    owner: project-manager
    dependencies: [ST4]
    estimated_duration: "3 days"
    deliverables: ["implementation_timeline.yaml", "milestone_schedule.yaml"]

  ST6:
    description: "Conduct stakeholder review and incorporate feedback"
    owner: strategic-planner
    dependencies: [ST5]
    estimated_duration: "2 days"
    deliverables: ["feedback_summary.md", "plan_v2.md"]

  ST7:
    description: "Finalize strategic plan with executive approval"
    owner: cpo
    dependencies: [ST6]
    estimated_duration: "1 day"
    deliverables: ["strategic_plan_final.md", "executive_summary.md"]
```

**Agent Specification**:
```yaml
---
name: planner
description: Planning domain task decomposition agent. Breaks down planning objectives into structured planning activities, identifies stakeholders, selects methodologies, and creates planning roadmaps.
capabilities: ["planning_decomposition", "stakeholder_identification", "methodology_selection", "phase_definition", "milestone_planning", "dependency_mapping", "agile_planning", "okr_framework", "strategic_planning"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: opus
color: purple
domain: planning
---
```

### 3. Executor

**Purpose**: Coordinate planning team execution of planning tasks

**Execution Responsibilities**:
- Assign planning tasks to appropriate planning specialists
- Facilitate stakeholder workshops and interviews
- Coordinate cross-domain input gathering
- Aggregate planning deliverables
- Manage planning artifacts and documentation
- Track planning milestones and progress
- Escalate planning blockers

**Planning Facilitation**:
- Stakeholder workshops
- Requirements gathering sessions
- Strategic planning offsites
- OKR planning meetings
- Roadmap review sessions
- Implementation planning workshops

**Agent Specification**:
```yaml
---
name: executor
description: Planning domain team coordination agent. Assigns planning tasks to planning specialists, facilitates stakeholder engagement, coordinates cross-domain input, and aggregates planning deliverables.
capabilities: ["task_assignment", "stakeholder_facilitation", "workshop_coordination", "cross_domain_coordination", "deliverable_aggregation", "progress_tracking", "planning_artifact_management"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite, Task
model: opus
color: purple
domain: planning
---
```

### 4. Validator

**Purpose**: Quality gate for planning deliverables

**Validation Criteria**:
- **Completeness**: All required sections present
- **Clarity**: Objectives, scope, success criteria clear
- **Feasibility**: Resources, timelines, dependencies realistic
- **Alignment**: Stakeholder buy-in, strategic alignment
- **Actionability**: Sufficient detail for execution
- **Risk Coverage**: Risks identified and mitigated
- **Measurement**: Success metrics defined

**Quality Checks**:
```yaml
planning_quality_checklist:
  strategic_plan:
    - "Vision and mission articulated"
    - "Strategic objectives defined (3-5)"
    - "Initiatives mapped to objectives"
    - "Success metrics specified"
    - "Resource requirements estimated"
    - "Timeline and milestones defined"
    - "Risks and mitigation strategies documented"
    - "Stakeholder alignment achieved"
    - "Executive approval obtained"

  project_plan:
    - "Scope clearly defined"
    - "Deliverables specified"
    - "Timeline with milestones"
    - "Resource allocation defined"
    - "Dependencies identified"
    - "Risks assessed"
    - "Communication plan included"
    - "Success criteria defined"

  roadmap:
    - "Time horizon specified"
    - "Themes/pillars defined"
    - "Features/initiatives prioritized"
    - "Dependencies mapped"
    - "Resource capacity considered"
    - "Flexibility/buffer included"
    - "Stakeholder input incorporated"
```

**Classification**:
- **PASS**: Plan meets all quality criteria, ready for execution
- **FIXABLE**: Minor gaps, can be refined (add detail, clarify scope, adjust timeline)
- **BLOCKED**: Major issues (stakeholder alignment missing, resources unavailable, scope unclear)

**Agent Specification**:
```yaml
---
name: validator
description: Planning domain quality gate agent. Validates planning deliverables for completeness, clarity, feasibility, alignment, actionability, and measurement. Classifies as PASS/FIXABLE/BLOCKED.
capabilities: ["completeness_check", "clarity_validation", "feasibility_assessment", "stakeholder_alignment_check", "actionability_validation", "risk_assessment", "metrics_validation"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: opus
color: purple
domain: planning
---
```

### 5. Self-Correct

**Purpose**: Adaptive recovery for planning deliverables

**Recovery Strategies**:
- **Add Missing Sections**: Fill in gaps in strategic plans, project plans
- **Clarify Objectives**: Refine unclear goals and success criteria
- **Adjust Timelines**: Recalibrate unrealistic timelines based on capacity
- **Document Assumptions**: Make implicit assumptions explicit
- **Refine Resource Estimates**: Adjust resource requirements based on feedback
- **Add Risk Mitigation**: Identify and address missing risk mitigation
- **Strengthen Stakeholder Alignment**: Gather additional stakeholder input
- **Improve Actionability**: Add detail to make plans more executable

**Learning Patterns**:
- Track common planning gaps (missing stakeholders, unrealistic timelines)
- Identify successful planning approaches by methodology
- Calibrate effort estimates for planning activities
- Improve template quality based on validation feedback

**Agent Specification**:
```yaml
---
name: self-correct
description: Planning domain adaptive recovery agent. Fixes planning deliverable issues using learned strategies. Tracks effectiveness and updates calibration data.
capabilities: ["gap_filling", "objective_clarification", "timeline_adjustment", "assumption_documentation", "resource_calibration", "risk_mitigation_enhancement", "stakeholder_alignment", "actionability_improvement"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: opus
color: purple
domain: planning
---
```

---

## Executive Leadership (1)

### Chief Planning Officer (CPO)

**Core Responsibility**: Strategic planning oversight, planning methodology, organizational alignment

**Strategic Focus Areas**:

#### 1. Strategic Planning Leadership
- **Long-term Vision**: 3-5 year strategic planning
- **Annual Planning**: Company-wide goal setting and resource allocation
- **OKR Framework**: Objectives and Key Results methodology
- **Planning Governance**: Planning processes, calendars, reviews

#### 2. Planning Methodologies
- **Strategic Planning**: Porter's 5 Forces, SWOT, Ansoff Matrix
- **Agile Planning**: Sprint planning, release planning, backlog management
- **Roadmapping**: Feature roadmaps, technology roadmaps, product roadmaps
- **Project Management**: Waterfall, Agile, Hybrid methodologies
- **Change Management**: ADKAR, Kotter's 8 Steps, Prosci

#### 3. Cross-Functional Alignment
- **Stakeholder Management**: Identify, engage, align stakeholders
- **Dependency Management**: Cross-team, cross-domain dependencies
- **Resource Orchestration**: Coordinate resources across initiatives
- **Priority Arbitration**: Resolve competing priorities

#### 4. Planning Excellence
- **Process Optimization**: Improve planning processes
- **Tool & Template Development**: Planning frameworks, templates, tools
- **Best Practice Sharing**: Disseminate planning best practices
- **Planning Training**: Educate teams on planning methodologies

**Capabilities**:
```yaml
strategic_planning_expertise:
  frameworks:
    - Strategic planning (3-5 year)
    - Annual planning (OKRs, goals, budgets)
    - Quarterly business reviews (QBRs)
    - Portfolio planning and prioritization

  methodologies:
    - Agile/Scrum (sprint planning, release planning)
    - Waterfall (phase-gate planning)
    - Lean (value stream mapping)
    - Design Thinking (discovery, ideation, prototyping)

  tools:
    - OKR frameworks
    - Roadmapping tools
    - Gantt charts / timelines
    - RACI matrices
    - Dependency mapping

cross_functional_coordination:
  stakeholder_management:
    - Stakeholder identification and analysis
    - Stakeholder engagement planning
    - Alignment workshops and offsites
    - Feedback incorporation

  dependency_orchestration:
    - Cross-domain dependency mapping
    - Critical path analysis
    - Resource conflict resolution
    - Timeline synchronization

planning_governance:
  planning_calendar:
    - Annual planning cycle
    - Quarterly planning rhythm
    - Monthly review cadence
    - Weekly check-ins

  planning_quality:
    - Planning template standards
    - Review and approval processes
    - Planning metrics and KPIs
    - Continuous improvement
```

**Agent Specification**:
```yaml
---
name: cpo
description: Chief Planning Officer providing strategic planning oversight, planning methodology expertise, and cross-functional alignment. Use PROACTIVELY for strategic plans, major initiatives, and complex multi-domain planning.
capabilities: ["strategic-planning", "okr-framework", "agile-planning", "roadmapping", "project-management", "change-management", "stakeholder-management", "planning-governance"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite, Task
model: opus
color: purple
layer: executive
tier: strategic
domain: planning
---
```

---

## Team Agents (16)

### Planning Leadership (2 agents)

#### 1. Strategic Planner
**Focus**: Long-term strategic planning, vision, multi-year initiatives

**Responsibilities**:
- Facilitate strategic planning processes
- Develop strategic frameworks and models
- Conduct environmental scans (PESTLE, Porter's 5 Forces)
- Define strategic objectives and KPIs
- Create strategic roadmaps
- Monitor strategy execution

**Methodologies**:
- Strategic planning frameworks
- Scenario planning
- Competitive analysis
- Blue Ocean Strategy
- Balanced Scorecard

**Agent Specification**:
```yaml
---
name: strategic-planner
description: Long-term strategic planning specialist. Facilitates strategic planning, develops frameworks, defines objectives, creates multi-year roadmaps.
capabilities: ["strategic-planning", "scenario-planning", "competitive-analysis", "swot-analysis", "strategic-frameworks", "vision-development", "long-term-roadmapping"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet
color: purple
domain: planning
---
```

#### 2. Planning Operations Manager
**Focus**: Planning process optimization, templates, tools, governance

**Responsibilities**:
- Design and optimize planning processes
- Develop planning templates and frameworks
- Manage planning tools and systems
- Coordinate planning calendar
- Track planning metrics
- Facilitate planning reviews

**Capabilities**:
- Planning process design
- Template development
- Tool administration
- Calendar coordination
- Metrics tracking
- Review facilitation

**Agent Specification**:
```yaml
---
name: planning-operations-manager
description: Planning process and operations specialist. Optimizes planning processes, develops templates, manages tools, coordinates planning governance.
capabilities: ["process-optimization", "template-development", "tool-management", "calendar-coordination", "metrics-tracking", "review-facilitation"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet
color: purple
domain: planning
---
```

### Project & Program Management (4 agents)

#### 3. Program Manager
**Focus**: Large-scale programs with multiple projects

**Responsibilities**:
- Program planning and charter development
- Multi-project coordination
- Program-level roadmapping
- Stakeholder management
- Risk and issue management
- Benefits realization tracking

**Agent Specification**:
```yaml
---
name: program-manager
description: Program planning and coordination specialist. Manages large-scale programs, coordinates multiple projects, tracks benefits realization.
capabilities: ["program-planning", "multi-project-coordination", "stakeholder-management", "risk-management", "benefits-tracking", "program-governance"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet
color: purple
domain: planning
---
```

#### 4. Project Manager
**Focus**: Individual project planning and execution

**Responsibilities**:
- Project charter and scope definition
- Work breakdown structure (WBS)
- Timeline and milestone planning
- Resource allocation
- Risk management
- Status reporting

**Methodologies**:
- Waterfall / Phase-Gate
- Agile / Hybrid
- PMBOK framework
- Critical Path Method

**Agent Specification**:
```yaml
---
name: project-manager
description: Project planning and execution specialist. Defines scope, creates timelines, allocates resources, manages risks, tracks progress.
capabilities: ["project-planning", "scope-definition", "timeline-planning", "resource-allocation", "risk-management", "status-reporting", "pmbok", "agile-hybrid"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet
color: purple
domain: planning
---
```

#### 5. Agile Coach / Scrum Master
**Focus**: Agile planning methodologies

**Responsibilities**:
- Sprint planning facilitation
- Release planning
- Backlog management and prioritization
- Velocity tracking and capacity planning
- Agile ceremonies facilitation
- Continuous improvement

**Methodologies**:
- Scrum
- Kanban
- SAFe (Scaled Agile Framework)
- Lean

**Agent Specification**:
```yaml
---
name: agile-coach
description: Agile planning and methodology specialist. Facilitates sprint planning, manages backlogs, tracks velocity, coaches teams on Agile practices.
capabilities: ["sprint-planning", "release-planning", "backlog-management", "velocity-tracking", "scrum", "kanban", "safe", "agile-ceremonies"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet
color: purple
domain: planning
---
```

#### 6. Portfolio Manager
**Focus**: Portfolio planning and prioritization

**Responsibilities**:
- Portfolio strategy and governance
- Initiative prioritization frameworks
- Resource capacity planning across portfolio
- Value vs. effort analysis
- Portfolio roadmapping
- Investment decision support

**Agent Specification**:
```yaml
---
name: portfolio-manager
description: Portfolio planning and prioritization specialist. Manages initiative portfolios, prioritizes investments, optimizes resource allocation.
capabilities: ["portfolio-planning", "prioritization-frameworks", "capacity-planning", "value-analysis", "portfolio-roadmapping", "investment-decisions"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet
color: purple
domain: planning
---
```

### Specialized Planning (6 agents)

#### 7. Roadmap Planner
**Focus**: Product and technology roadmapping

**Responsibilities**:
- Roadmap framework development
- Feature/theme prioritization
- Timeline planning with flexibility
- Stakeholder alignment on roadmap
- Roadmap communication and updates

**Agent Specification**:
```yaml
---
name: roadmap-planner
description: Product and technology roadmap specialist. Develops roadmaps, prioritizes features, aligns stakeholders, communicates roadmap evolution.
capabilities: ["roadmap-development", "feature-prioritization", "timeline-planning", "stakeholder-alignment", "roadmap-communication", "now-next-later-framework"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet
color: purple
domain: planning
---
```

#### 8. OKR Specialist
**Focus**: Objectives and Key Results planning

**Responsibilities**:
- OKR framework design and rollout
- Objective definition workshops
- Key result measurement design
- OKR cascade (company → team → individual)
- OKR tracking and scoring
- Quarterly OKR planning facilitation

**Agent Specification**:
```yaml
---
name: okr-specialist
description: OKR planning and implementation specialist. Designs OKR frameworks, facilitates objective setting, tracks key results, manages quarterly planning.
capabilities: ["okr-framework", "objective-setting", "key-result-definition", "okr-cascade", "scoring-methodology", "quarterly-planning"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet
color: purple
domain: planning
---
```

#### 9. Change Management Planner
**Focus**: Organizational change planning

**Responsibilities**:
- Change impact assessment
- Stakeholder analysis (support, resistance)
- Change strategy and roadmap
- Communication planning
- Training and adoption planning
- Resistance management

**Methodologies**:
- ADKAR (Awareness, Desire, Knowledge, Ability, Reinforcement)
- Kotter's 8 Steps
- Prosci change management
- Bridges' Transition Model

**Agent Specification**:
```yaml
---
name: change-management-planner
description: Organizational change planning specialist. Assesses change impact, plans change strategy, designs communication and training, manages resistance.
capabilities: ["change-impact-assessment", "stakeholder-analysis", "change-strategy", "communication-planning", "training-planning", "adkar", "kotter", "prosci"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet
color: purple
domain: planning
---
```

#### 10. Resource Planner
**Focus**: Resource capacity and allocation planning

**Responsibilities**:
- Capacity forecasting and modeling
- Resource allocation across initiatives
- Skill gap analysis
- Hiring and ramp-up planning
- Utilization tracking
- Constraint identification

**Agent Specification**:
```yaml
---
name: resource-planner
description: Resource capacity and allocation specialist. Forecasts capacity, plans resource allocation, identifies constraints, tracks utilization.
capabilities: ["capacity-forecasting", "resource-allocation", "skill-gap-analysis", "hiring-planning", "utilization-tracking", "constraint-analysis"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet
color: purple
domain: planning
---
```

#### 11. Risk & Dependency Planner
**Focus**: Risk identification and dependency management

**Responsibilities**:
- Risk identification and assessment
- Risk mitigation planning
- Dependency mapping (cross-team, cross-domain)
- Critical path analysis
- Contingency planning
- Risk monitoring and reporting

**Agent Specification**:
```yaml
---
name: risk-dependency-planner
description: Risk and dependency planning specialist. Identifies risks, plans mitigation, maps dependencies, analyzes critical paths, develops contingencies.
capabilities: ["risk-identification", "risk-assessment", "mitigation-planning", "dependency-mapping", "critical-path-analysis", "contingency-planning"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet
color: purple
domain: planning
---
```

#### 12. Business Analyst (Planning Focus)
**Focus**: Requirements gathering and analysis for planning

**Responsibilities**:
- Stakeholder interviews and requirements elicitation
- Current state analysis
- Gap analysis
- Process mapping
- Requirements documentation
- Acceptance criteria definition

**Agent Specification**:
```yaml
---
name: business-analyst-planning
description: Business analysis specialist for planning domain. Gathers requirements, analyzes current state, identifies gaps, documents acceptance criteria.
capabilities: ["requirements-elicitation", "stakeholder-interviews", "current-state-analysis", "gap-analysis", "process-mapping", "requirements-documentation"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet
color: purple
domain: planning
---
```

### Analytics & Research (4 agents)

#### 13. Planning Analyst
**Focus**: Planning data analysis and metrics

**Responsibilities**:
- Planning metrics definition and tracking
- Progress reporting and dashboards
- Variance analysis (plan vs. actual)
- Planning effectiveness measurement
- Data visualization
- Insight generation

**Agent Specification**:
```yaml
---
name: planning-analyst
description: Planning analytics and metrics specialist. Tracks planning metrics, creates dashboards, analyzes variances, measures effectiveness.
capabilities: ["metrics-definition", "progress-tracking", "variance-analysis", "effectiveness-measurement", "dashboard-creation", "data-visualization"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet
color: purple
domain: planning
---
```

#### 14. Market Research Analyst (Planning)
**Focus**: External research for strategic planning

**Responsibilities**:
- Market analysis and sizing
- Competitive intelligence gathering
- Industry trend identification
- Customer research synthesis
- Environmental scanning (PESTLE)

**Agent Specification**:
```yaml
---
name: market-research-analyst-planning
description: Market research specialist for planning. Analyzes markets, gathers competitive intel, identifies trends, conducts environmental scans.
capabilities: ["market-analysis", "competitive-intelligence", "trend-identification", "environmental-scanning", "pestle-analysis", "customer-research"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet
color: purple
domain: planning
---
```

#### 15. Scenario Planner
**Focus**: Scenario planning and modeling

**Responsibilities**:
- Scenario development (best/worst/likely)
- Assumption identification and testing
- Sensitivity analysis
- Scenario modeling and simulation
- Strategic option generation

**Agent Specification**:
```yaml
---
name: scenario-planner
description: Scenario planning and modeling specialist. Develops scenarios, tests assumptions, models outcomes, generates strategic options.
capabilities: ["scenario-development", "assumption-testing", "sensitivity-analysis", "scenario-modeling", "strategic-option-generation", "monte-carlo-simulation"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet
color: purple
domain: planning
---
```

#### 16. Planning Facilitator
**Focus**: Workshop design and facilitation

**Responsibilities**:
- Planning workshop design
- Facilitation of planning sessions
- Stakeholder workshop leadership
- Brainstorming and ideation facilitation
- Consensus building
- Documentation and synthesis

**Agent Specification**:
```yaml
---
name: planning-facilitator
description: Planning workshop and facilitation specialist. Designs workshops, facilitates planning sessions, builds consensus, synthesizes outcomes.
capabilities: ["workshop-design", "facilitation", "stakeholder-engagement", "brainstorming", "consensus-building", "synthesis", "design-thinking"]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
model: sonnet
color: purple
domain: planning
---
```

---

## Templates & Patterns

### Planning Templates

```yaml
strategic_plan_template:
  sections:
    - executive_summary
    - vision_and_mission
    - situation_analysis (SWOT, PESTLE, Porter's 5 Forces)
    - strategic_objectives
    - strategic_initiatives
    - resource_requirements
    - implementation_timeline
    - success_metrics
    - risk_and_mitigation
    - governance_and_review

annual_plan_template:
  sections:
    - annual_goals_and_okrs
    - quarterly_milestones
    - resource_allocation
    - budget_summary
    - cross_functional_initiatives
    - dependencies_and_risks
    - success_metrics
    - review_calendar

project_plan_template:
  sections:
    - project_charter
    - scope_definition
    - work_breakdown_structure
    - timeline_and_milestones
    - resource_plan
    - stakeholder_plan
    - communication_plan
    - risk_register
    - acceptance_criteria

roadmap_template:
  sections:
    - roadmap_vision
    - themes_and_pillars
    - now_next_later_framework
    - feature_prioritization
    - dependencies
    - capacity_considerations
    - stakeholder_input
    - flexibility_and_optionality

implementation_plan_template:
  sections:
    - implementation_objectives
    - phased_approach
    - detailed_task_breakdown
    - resource_assignments
    - timeline_with_milestones
    - dependencies_and_sequencing
    - risk_mitigation
    - success_criteria
    - governance_and_reviews
```

### Planning Methodologies

**Strategic Planning**:
- 3-5 year strategic planning cycles
- Annual planning with quarterly reviews
- SWOT, PESTLE, Porter's 5 Forces analysis
- Vision, mission, values development
- Strategic objectives and initiatives

**Agile Planning**:
- Sprint planning (2-week sprints)
- Release planning (quarterly)
- Backlog grooming and prioritization
- Velocity-based capacity planning
- Retrospectives and continuous improvement

**OKR Framework**:
- Quarterly objective setting
- Key result definition (3-5 per objective)
- Alignment cascade (company → team → individual)
- Weekly check-ins and monthly reviews
- Quarterly scoring and reflection

**Roadmapping**:
- Now / Next / Later framework
- Theme-based planning
- Feature prioritization (RICE, MoSCoW)
- Timeline with flexibility
- Stakeholder alignment

**Project Management**:
- Phase-gate / Waterfall (structured, sequential)
- Agile / Scrum (iterative, adaptive)
- Hybrid (best of both)
- Critical path method
- Resource leveling

---

## Cross-Domain Integration

### Planning for Other Domains

The Planning domain creates plans that are executed by other domains:

**Software Domain**:
- Planning creates: Technical roadmap, sprint plan, architecture plan
- Software executes: Implementation, testing, deployment

**Marketing Domain**:
- Planning creates: Marketing strategy, campaign plan, content calendar
- Marketing executes: Campaign launch, content creation, lead generation

**Sales Domain**:
- Planning creates: Sales strategy, territory plan, quota plan
- Sales executes: Selling, pipeline management, forecasting

**Finance Domain**:
- Planning creates: Budget plan, financial forecast, investment plan
- Finance executes: Accounting, reporting, treasury

### Cross-Domain Planning Workflows

**Product Launch Planning**:
```yaml
product_launch_planning:
  planning_phase:
    owner: planning_domain
    tasks:
      - Define launch objectives and success metrics
      - Identify stakeholders across domains
      - Create integrated launch timeline
      - Map dependencies (product → marketing → sales → support)
      - Define go/no-go criteria
    deliverable: product_launch_plan.md

  execution_phase:
    software_domain: Build product features
    marketing_domain: Create launch campaign
    sales_domain: Sales enablement and forecasting
    support_domain: Knowledge base and training

  coordination:
    weekly_sync: Cross-domain status updates
    milestone_reviews: Go/no-go decisions at key milestones
    issue_escalation: Planning domain facilitates resolution
```

**cAgents Expansion Planning** (Meta-Example):
```yaml
cagents_expansion_planning:
  planning_phase:
    owner: planning_domain
    tasks:
      - Analyze current cAgents state
      - Define expansion objectives (8 new domains)
      - Prioritize domain implementation order
      - Create phased implementation roadmap
      - Estimate resources and timelines
      - Identify risks and dependencies
      - Design governance and quality gates
    deliverable: cagents_expansion_implementation_plan.md

  execution_phase:
    software_domain: Create agent code and manifests
    planning_domain: Ongoing planning support and adjustment

  monitoring:
    milestone_tracking: Domain completion tracking
    quality_gates: Agent quality validation
    adjustment: Plan updates based on learnings
```

---

## Detection Keywords

Router detects planning domain from:
- **Keywords**: planning, plan, strategy, strategic, roadmap, OKR, objective, initiative, program, project, implementation, design, rollout, launch, timeline, milestone, phase, governance
- **Request Patterns**:
  - "Create strategic plan for..."
  - "Develop roadmap for..."
  - "Plan implementation of..."
  - "Design rollout for..."
  - "Set OKRs for..."
  - "Create project plan for..."
  - "Develop annual plan..."
  - "Plan Q2 initiatives..."

---

## Implementation Guide

### Phase 1: Create Planning Domain Structure (Week 1)

**Create Domain Folder**:
```bash
mkdir -p planning/{.claude-plugin,agents,commands,skills}
```

**Create Workflow Agents** (5):
1. `planning/agents/router.md`
2. `planning/agents/planner.md`
3. `planning/agents/executor.md`
4. `planning/agents/validator.md`
5. `planning/agents/self-correct.md`

**Create Executive Agent** (1):
6. `planning/agents/cpo.md`

### Phase 2: Create Team Agents (Week 2)

**Planning Leadership** (2):
7. `planning/agents/strategic-planner.md`
8. `planning/agents/planning-operations-manager.md`

**Project & Program Management** (4):
9. `planning/agents/program-manager.md`
10. `planning/agents/project-manager.md`
11. `planning/agents/agile-coach.md`
12. `planning/agents/portfolio-manager.md`

**Specialized Planning** (6):
13. `planning/agents/roadmap-planner.md`
14. `planning/agents/okr-specialist.md`
15. `planning/agents/change-management-planner.md`
16. `planning/agents/resource-planner.md`
17. `planning/agents/risk-dependency-planner.md`
18. `planning/agents/business-analyst-planning.md`

**Analytics & Research** (4):
19. `planning/agents/planning-analyst.md`
20. `planning/agents/market-research-analyst-planning.md`
21. `planning/agents/scenario-planner.md`
22. `planning/agents/planning-facilitator.md`

### Phase 3: Create Plugin Manifest

**planning/.claude-plugin/plugin.json**:
```json
{
  "name": "@cagents/planning",
  "version": "1.0.0",
  "description": "Planning domain for strategic planning, project planning, roadmapping, and implementation design",
  "agents": [
    "./agents/router.md",
    "./agents/planner.md",
    "./agents/executor.md",
    "./agents/validator.md",
    "./agents/self-correct.md",
    "./agents/cpo.md",
    "./agents/strategic-planner.md",
    "./agents/planning-operations-manager.md",
    "./agents/program-manager.md",
    "./agents/project-manager.md",
    "./agents/agile-coach.md",
    "./agents/portfolio-manager.md",
    "./agents/roadmap-planner.md",
    "./agents/okr-specialist.md",
    "./agents/change-management-planner.md",
    "./agents/resource-planner.md",
    "./agents/risk-dependency-planner.md",
    "./agents/business-analyst-planning.md",
    "./agents/planning-analyst.md",
    "./agents/market-research-analyst-planning.md",
    "./agents/scenario-planner.md",
    "./agents/planning-facilitator.md"
  ],
  "commands": [],
  "skills": []
}
```

### Phase 4: Update Core Trigger

Update `core/agents/trigger.md` to add planning domain detection:

```yaml
planning:
  keywords: [planning, plan, strategy, strategic, roadmap, okr, objective, initiative, program, project, implementation]
  request_patterns:
    - "Create strategic plan"
    - "Develop roadmap"
    - "Plan implementation"
    - "Set OKRs"
    - "Create project plan"
```

### Phase 5: Testing

Test tier 1-4 planning requests:
- Tier 1: "Create basic project plan for website redesign"
- Tier 2: "Develop Q2 OKRs for engineering"
- Tier 3: "Create annual strategic plan"
- Tier 4: "Design and implement cAgents expansion plan" (THIS REQUEST!)

---

## Success Metrics

### Planning Quality
- **Completeness**: >95% plans have all required sections
- **Clarity**: >90% stakeholder satisfaction with plan clarity
- **Actionability**: >85% plans successfully executed
- **Alignment**: >90% stakeholder buy-in achieved

### Planning Efficiency
- **Time to Plan**: Strategic plan (2 weeks), Project plan (1 week), Roadmap (3 days)
- **Revision Rate**: <2 major revisions per plan
- **Reuse Rate**: >60% template reuse

### Planning Effectiveness
- **Execution Success**: >80% of planned initiatives completed
- **Timeline Accuracy**: <20% variance from planned timelines
- **Resource Accuracy**: <15% variance from planned resources

---

## Conclusion

The **Planning Domain** fills a critical gap in cAgents by providing specialized meta-planning capabilities. It enables:

1. **Strategic planning** across any domain
2. **Project/program planning** for complex initiatives
3. **Roadmapping** for features, products, technology
4. **Implementation planning** (like this cAgents expansion!)
5. **Cross-domain coordination** for multi-domain initiatives

With 22 specialized agents, the Planning domain provides comprehensive planning capabilities that complement and enhance all other domains.

**Next**: Use the Planning domain to plan the implementation of all 8 new domains (Planning + Sales + Marketing + Finance + Operations + HR + Legal + Support)!

---

**Ready for implementation!**
