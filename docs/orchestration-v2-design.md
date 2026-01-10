# Orchestration Layer V2 - Comprehensive Design

**Version**: 2.0
**Status**: Design Phase
**Target**: cAgents Software Domain
**Last Updated**: 2026-01-10

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Design Principles](#design-principles)
3. [Organizational Architecture](#organizational-architecture)
4. [Agent Roles and Responsibilities](#agent-roles-and-responsibilities)
5. [Planning System](#planning-system)
6. [Delegation and Assignment System](#delegation-and-assignment-system)
7. [Task Lifecycle and State Machine](#task-lifecycle-and-state-machine)
8. [Communication Protocols](#communication-protocols)
9. [Quality Management](#quality-management)
10. [Capacity and Resource Management](#capacity-and-resource-management)
11. [Escalation and Exception Handling](#escalation-and-exception-handling)
12. [Observability and Metrics](#observability-and-metrics)
13. [Learning and Calibration](#learning-and-calibration)
14. [Memory Architecture](#memory-architecture)
15. [Implementation Roadmap](#implementation-roadmap)
16. [Appendix: Detailed Examples](#appendix-detailed-examples)

---

## Executive Summary

### Vision

Create a **multi-layered orchestration system** that mirrors real software organizations, with:

- **4-tier organizational hierarchy**: Engineering Manager → Tech Lead → Domain Leads → Individual Contributors
- **Dynamic planning depth**: Strategic → Tactical → Execution based on complexity
- **Comprehensive quality gates**: Peer review → Domain approval → Cross-functional validation
- **Intelligent resource management**: Skill-based matching, workload balancing, capacity forecasting
- **Sophisticated state management**: 10+ task states with context-aware transitions
- **Continuous learning**: Calibration data feeds back to improve routing, planning, and execution

### Key Improvements Over V1

| Aspect | V1 (Current) | V2 (Enhanced) |
|--------|--------------|---------------|
| **Hierarchy** | 2 layers (Executor → IC) | 4 layers (EM → TL → DL → IC) |
| **Planning** | Single-phase, fixed depth | Multi-phase, dynamic depth |
| **Task Types** | Atomic tasks only | Strategic → Tactical → Execution |
| **Assignment** | Planner assigns or Executor routes | Domain Leads with skill/capacity matching |
| **Quality Gates** | Validator only | Peer + Domain + QA + Architecture |
| **Capacity Mgmt** | None | Workload tracking, forecasting, rebalancing |
| **Communication** | Inbox only | Multi-modal (inbox, broadcast, handoff, standup) |
| **State Machine** | 4 states | 10+ states with conditional transitions |
| **Metrics** | Basic completion tracking | Comprehensive (velocity, quality, capacity, bottlenecks) |
| **Learning** | Manual calibration | Automated pattern recognition and adaptation |

---

## Design Principles

### 1. Organizational Realism

**Principle**: Mirror how real software organizations delegate work.

**Implications**:
- Managers assign work based on skillsets, not just availability
- Specialists have autonomy within their domain
- Cross-functional coordination requires explicit handoffs
- Escalations follow organizational hierarchy with skip-level exceptions

**Example**: Frontend Lead knows which frontend developer is best at React performance optimization vs. UI design, and assigns accordingly.

### 2. Separation of Concerns

**Principle**: Each role has clear, non-overlapping responsibilities.

**Clarity Matrix**:

| Decision Type | Who Decides | Who Executes | Who Validates |
|---------------|-------------|--------------|---------------|
| **WHEN** to transition phases | Orchestrator | N/A | Orchestrator |
| **WHAT** to build | Planner (strategic) | Domain Leads (tactical) | Engineering Manager |
| **WHO** does the work | Domain Leads | Individual Contributors | Domain Leads |
| **HOW** to implement | Individual Contributors | Individual Contributors | Peer Reviewers |
| **WHETHER** to ship | Validator | Orchestrator | Engineering Manager |

### 3. Progressive Elaboration

**Principle**: Level of detail increases as work flows down the hierarchy.

**Elaboration Cascade**:

```
Planner:      "Implement authentication system"
              ↓ (strategic breakdown)

Domain Lead:  "Implement login endpoint"
              ↓ (tactical breakdown)

IC:           "Add JWT token generation logic to POST /auth/login handler"
              ↓ (implementation)

Code:         def generate_jwt_token(user_id, role):
                  payload = {"sub": user_id, "role": role, ...}
                  return jwt.encode(payload, SECRET_KEY, algorithm="HS256")
```

### 4. Explicit Over Implicit

**Principle**: All decisions, handoffs, and state transitions are explicitly tracked.

**Tracking Requirements**:
- Every task assignment logged with rationale
- Every handoff documented with checklist
- Every escalation includes context and decision request
- Every quality gate records criteria and outcome

### 5. Fail-Safe Defaults

**Principle**: When uncertain, choose the safer, more conservative option.

**Default Behaviors**:
- If tier ambiguous → assign higher tier
- If skillset uncertain → assign to senior developer
- If quality check borderline → request changes
- If blocker type unclear → escalate to Tech Lead
- If capacity tight → flag to Engineering Manager

### 6. Continuous Learning

**Principle**: System improves through feedback loops and pattern recognition.

**Learning Loops**:
- Router learns from tier misclassifications
- Planner learns from task estimation accuracy
- Domain Leads learn from specialist performance
- Validator learns from escaped defects

### 7. Observability First

**Principle**: System state is always transparent and inspectable.

**Visibility Requirements**:
- Real-time progress tracking at all hierarchy levels
- Historical decision audit trail
- Capacity and workload dashboards
- Bottleneck detection and alerting

---

## Organizational Architecture

### Hierarchy Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR (Core)                           │
│  - Phase lifecycle management                                    │
│  - Workflow state transitions                                    │
│  - Cross-instruction coordination                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────▼───────────────┐
                │  ENGINEERING MANAGER (New)  │
                │  - Risk assessment          │
                │  - Strategic oversight      │
                │  - Go/no-go decisions       │
                │  - Multi-instruction priority│
                └────────────┬───────────────┘
                             │
                  ┌──────────▼──────────────┐
                  │   TECH LEAD (Refocused) │
                  │  - Cross-domain coord   │
                  │  - Critical path mgmt   │
                  │  - Blocker resolution   │
                  └──────────┬──────────────┘
                             │
         ┌───────────────────┼───────────────────┬──────────────┐
         │                   │                   │              │
    ┌────▼─────┐      ┌─────▼──────┐     ┌─────▼──────┐  ┌───▼────┐
    │Frontend  │      │  Backend   │     │    QA      │  │DevOps  │
    │  Lead    │      │   Lead     │     │   Lead     │  │ Lead   │
    └────┬─────┘      └─────┬──────┘     └─────┬──────┘  └───┬────┘
         │                  │                   │             │
    ┌────▼────┐        ┌────▼────┐        ┌────▼────┐   ┌───▼────┐
    │Frontend │        │Backend  │        │   QA    │   │DevOps  │
    │  Dev    │        │  Dev    │        │Engineer │   │Engineer│
    └─────────┘        └─────────┘        └─────────┘   └────────┘

    (Plus Data Lead, Security Lead with their teams)
```

### Span of Control

**Engineering Manager**: 1 Tech Lead + strategic oversight of all Domain Leads
**Tech Lead**: 6 Domain Leads (Frontend, Backend, QA, DevOps, Data, Security)
**Domain Lead**: 2-5 Individual Contributors (depends on domain complexity)

**Rationale**: Keeps each layer manageable while enabling deep expertise.

### Decision Authority Levels

| Role | Autonomy Level | Decisions Without Escalation |
|------|----------------|------------------------------|
| **IC** | Task-level | Implementation approach, code structure, local refactoring |
| **Domain Lead** | Domain-level | Task assignment, code review approval, internal prioritization |
| **Tech Lead** | Cross-domain | Resource reallocation, cross-team dependencies, scope negotiation |
| **Engineering Manager** | Strategic | Plan approval, risk acceptance, go/no-go, HITL escalation |
| **Orchestrator** | Workflow-level | Phase transitions, workflow termination |

### Authority Escalation Triggers

**IC → Domain Lead**:
- Task complexity exceeds initial estimate by >2x
- Technical blocker within domain
- Need for domain-specific guidance

**Domain Lead → Tech Lead**:
- Cross-domain coordination needed
- Resource contention between domains
- Timeline risk to critical path

**Tech Lead → Engineering Manager**:
- Scope change request
- Risk level exceeds tolerance
- Multi-instruction priority conflict

**Engineering Manager → HITL**:
- Ambiguous requirements
- Business priority decision needed
- Ethical or policy consideration

---

## Agent Roles and Responsibilities

### 1. Orchestrator (Core - Unchanged Philosophy)

**Core Responsibility**: Workflow lifecycle conductor across all domains.

**New Capabilities in V2**:
- Multi-instruction orchestration (parallel tier 3-4 instructions)
- Instruction priority management
- Resource contention detection and escalation
- Cross-instruction dependency tracking

**Enhanced Behaviors**:

```yaml
# Multi-instruction coordination
parallel_instructions:
  - inst_001: tier 3, backend-heavy, 60% backend capacity
  - inst_002: tier 4, full-stack, 80% total capacity

  conflict_detection:
    backend_oversubscribed: true  # 140% capacity requested
    action: signal_engineering_manager
    recommendation: "Pause inst_001 or defer inst_002"
```

**Decision Framework**:

```python
def should_start_new_instruction(new_inst, active_insts):
    """Determine if new instruction can start given active workload."""

    # Calculate capacity usage across all active instructions
    total_capacity = calculate_total_capacity(active_insts)
    required_capacity = estimate_required_capacity(new_inst)

    if total_capacity + required_capacity < 0.85:  # 85% threshold
        return True, "Capacity available"

    if new_inst.priority == "critical":
        return "escalate_to_em", "Critical priority but capacity tight"

    return False, "Insufficient capacity, queue for later"
```

### 2. Engineering Manager (NEW)

**Core Responsibility**: Strategic oversight, risk management, and go/no-go decisions.

**Full Capability Set**:

#### Risk Assessment
```yaml
risk_assessment_framework:
  categories:
    - technical_complexity
    - scope_ambiguity
    - external_dependencies
    - security_sensitivity
    - performance_impact
    - data_integrity_risk

  scoring:
    low: 1-3
    medium: 4-6
    high: 7-9
    critical: 10

  decision_thresholds:
    total_risk_score < 15: approve_automatically
    total_risk_score 15-25: approve_with_monitoring
    total_risk_score 26-35: approve_with_checkpoints
    total_risk_score > 35: escalate_to_hitl
```

**Example Risk Assessment**:
```yaml
# Agent_Memory/inst_20260110_001/decisions/em_risk_assessment.yaml
instruction_id: inst_20260110_001
objective: "Migrate production database from MySQL to PostgreSQL"
risk_assessment:
  technical_complexity: 8  # Complex migration, data transformation
  scope_ambiguity: 3       # Well-defined, done before
  external_dependencies: 6 # Requires infrastructure team
  security_sensitivity: 5  # Data encryption must be maintained
  performance_impact: 9    # Downtime required, user-facing
  data_integrity_risk: 10  # CRITICAL - data loss unacceptable

  total_score: 41  # HIGH RISK

decision: escalate_to_hitl
rationale: |
  Risk score 41 exceeds threshold of 35. Primary concerns:
  1. Data integrity risk is CRITICAL (score 10)
  2. Performance impact requires downtime (score 9)
  3. Technical complexity high (score 8)

  This level of risk requires human oversight and approval.
  Recommend HITL review with following questions:
  - What is acceptable downtime window?
  - What is rollback plan if migration fails?
  - What data validation is required post-migration?

  If approved, recommend:
  - Tier 4 execution with multiple checkpoints
  - DBA Lead ownership of migration
  - Full rehearsal in staging environment first
  - Database snapshots before, during, and after
```

#### Multi-Instruction Priority Arbitration
```yaml
# When two tier 3-4 instructions compete for same resources
priority_decision_framework:
  factors:
    - business_impact
    - deadline_urgency
    - customer_commitment
    - technical_dependency
    - team_morale

  decision_matrix:
    both_critical: escalate_to_hitl
    one_critical: prioritize_critical
    both_high: consider_parallelization
    one_customer_commitment: prioritize_commitment
    default: fifo_with_capacity_check
```

#### Strategic Milestone Tracking
```yaml
# Agent_Memory/_system/strategic_milestones.yaml
quarter: Q1_2026
milestones:
  - id: M1
    name: "OAuth2 Authentication"
    target_date: 2026-02-15
    instructions: [inst_001, inst_002, inst_003]
    progress: 65%
    status: on_track

  - id: M2
    name: "Performance Optimization"
    target_date: 2026-03-01
    instructions: [inst_005, inst_008]
    progress: 30%
    status: at_risk
    blocker: "Waiting for infrastructure team"

em_monitoring:
  frequency: weekly
  alerts:
    - milestone_delayed_by: 1_week
    - milestone_blocked_for: 3_days
    - instruction_count_exceeds: 5_active
```

### 3. Tech Lead (REFOCUSED)

**Core Responsibility**: Cross-domain coordination and critical path management.

**Removed Responsibilities** (V1 → V2):
- ~~Direct task assignment to ICs~~ (now Domain Lead's job)
- ~~Individual work tracking~~ (now Domain Lead's job)
- ~~Code review~~ (now Domain Lead's job)

**Enhanced Responsibilities** (V2):

#### Critical Path Management
```yaml
# Agent_Memory/inst_20260110_001/workflow/critical_path.yaml
instruction_id: inst_20260110_001
critical_path_analysis:

  path: [ST1, ST2, ST5, ST8, ST10, ST12]  # Strategic tasks

  task_breakdown:
    ST1:  # Design auth schema
      owner: data-lead
      duration_estimate: 1_day
      status: completed
      actual_duration: 0.8_days

    ST2:  # Implement auth API
      owner: backend-lead
      duration_estimate: 3_days
      status: in_progress
      progress: 40%
      projected_completion: 2026-01-12

    ST5:  # Frontend integration
      owner: frontend-lead
      duration_estimate: 2_days
      status: blocked
      blocking_dependency: ST2
      ready_to_start: 2026-01-12

  critical_path_duration: 10_days
  actual_elapsed: 2_days
  projected_completion: 2026-01-18
  original_estimate: 2026-01-20
  slack: 2_days  # Ahead of schedule

  risks:
    - task: ST2
      risk: "Backend Lead reports complexity higher than estimated"
      impact: "May add 1 day to critical path"
      mitigation: "Senior Developer assisting Backend Dev on complex parts"
```

**Tech Lead Critical Path Actions**:
- **Monitor**: Check critical path tasks daily
- **Accelerate**: Assign additional resources to critical path tasks if delayed
- **Communicate**: Broadcast critical path status changes to all Domain Leads
- **Replan**: If critical path delayed >20%, consult Engineering Manager for scope adjustment

#### Cross-Domain Dependency Coordination

```yaml
# Agent_Memory/inst_20260110_001/dependencies/cross_domain.yaml
dependencies:

  - from_domain: backend
    from_task: ST2
    to_domain: frontend
    to_task: ST5
    type: api_contract
    status: in_progress

    coordination:
      contract_definition: completed
      contract_review: approved_by_both_leads
      staging_deployment: pending
      handoff_readiness: 60%

    tech_lead_actions:
      - "Confirmed API contract approved by both leads"
      - "Backend Lead committed to staging deployment by EOD 2026-01-11"
      - "Frontend Lead ready to start ST5 on 2026-01-12"
      - "Scheduled handoff meeting for 2026-01-12 9am"

  - from_domain: backend
    from_task: ST8
    to_domain: qa
    to_task: ST10
    type: feature_handoff
    status: pending

    coordination:
      test_environment: provisioned
      test_data: in_progress
      acceptance_criteria: defined
      handoff_readiness: 40%
```

**Dependency Management Protocol**:
1. **Identify**: Planner defines dependencies during strategic planning
2. **Coordinate**: Tech Lead ensures both Domain Leads aware of dependency
3. **Monitor**: Tech Lead tracks handoff readiness
4. **Facilitate**: Tech Lead schedules handoff meeting when upstream task 90% complete
5. **Validate**: Tech Lead confirms downstream Domain Lead ready to start

### 4. Domain Leads (6 NEW AGENTS)

**Common Core Responsibilities** (all Domain Leads):

1. **Tactical Planning**: Break strategic tasks → tactical tasks
2. **Assignment**: Match tactical tasks to ICs based on skill + workload + complexity
3. **Code Review**: Approve all work in their domain
4. **Progress Tracking**: Aggregate IC progress, report to Tech Lead
5. **Capacity Management**: Track team capacity, flag oversubscription
6. **Escalation Handling**: Resolve domain blockers or escalate to Tech Lead

**Domain-Specific Specializations**:

#### a. Frontend Lead

```yaml
name: frontend-lead
domain: frontend
team: [frontend-developer, ux-designer]

specializations:
  - react_component_architecture
  - ui_ux_integration
  - responsive_design
  - frontend_performance
  - accessibility_compliance

skill_matrix:
  frontend-developer:
    react: expert
    typescript: expert
    css: advanced
    accessibility: intermediate
    performance: intermediate

  ux-designer:
    figma: expert
    user_research: expert
    prototyping: expert
    react: basic
    css: intermediate

assignment_heuristics:
  - if task.type == "component_implementation":
      assign: frontend-developer
  - if task.type == "ux_design":
      assign: ux-designer
  - if task.requires("accessibility") and task.complexity == "high":
      assign: frontend-developer  # Need technical expertise
      consultation: ux-designer  # UX input
  - if task.requires("performance_optimization"):
      assign: frontend-developer
      potential_escalation: senior-developer  # If beyond FE dev capability
```

**Tactical Breakdown Example**:
```yaml
# Strategic task from Planner
strategic_task: ST4
description: "Build user dashboard with real-time data"
owner: frontend-lead

# Frontend Lead's tactical breakdown
tactical_tasks:
  TT4.1:
    description: "Design dashboard layout and component hierarchy"
    assigned_to: ux-designer
    estimated_effort: 4h
    outputs: [figma_mockup, component_spec]

  TT4.2:
    description: "Implement Dashboard container component"
    assigned_to: frontend-developer
    dependencies: [TT4.1]
    estimated_effort: 6h

  TT4.3:
    description: "Implement real-time data fetching with WebSocket"
    assigned_to: frontend-developer
    estimated_effort: 8h
    complexity: high
    requires: [react, websocket, state_management]

  TT4.4:
    description: "Implement responsive layout for mobile"
    assigned_to: frontend-developer
    dependencies: [TT4.2]
    estimated_effort: 4h

  TT4.5:
    description: "Add accessibility features (keyboard nav, ARIA labels)"
    assigned_to: frontend-developer
    consultation_with: ux-designer
    estimated_effort: 3h
```

#### b. Backend Lead

```yaml
name: backend-lead
domain: backend
team: [backend-developer, senior-developer]

specializations:
  - api_design
  - database_optimization
  - microservices_architecture
  - backend_security
  - performance_tuning

skill_matrix:
  backend-developer:
    python: advanced
    nodejs: expert
    sql: advanced
    api_design: advanced
    security: intermediate

  senior-developer:
    python: expert
    nodejs: expert
    sql: expert
    api_design: expert
    security: expert
    architecture: expert

assignment_heuristics:
  - if task.complexity == "simple" or task.complexity == "moderate":
      assign: backend-developer
  - if task.complexity == "high" or task.requires("architecture"):
      assign: senior-developer
  - if task.requires("security") and task.sensitivity == "high":
      assign: senior-developer
      consultation: security-specialist
  - if task.type == "database_migration":
      assign: senior-developer
      collaboration: dba
```

#### c. QA Lead (Enhanced from existing)

```yaml
name: qa-lead
domain: qa
team: [qa-engineer]  # Can expand to qa-engineer-1, qa-engineer-2 as needed

specializations:
  - test_strategy_design
  - test_automation
  - integration_testing
  - performance_testing
  - regression_testing

new_responsibilities_v2:
  - tactical_test_planning  # Break strategic test tasks into test cases
  - test_assignment         # Assign test execution to QA engineers
  - test_review             # Review test quality and coverage
  - qa_gate_enforcement     # Approve/reject based on test results

assignment_heuristics:
  - if task.type == "unit_tests":
      note: "Usually done by developer, QA reviews"
  - if task.type == "integration_tests":
      assign: qa-engineer
  - if task.type == "e2e_tests":
      assign: qa-engineer
  - if task.type == "performance_tests":
      assign: qa-engineer
      consultation: performance-analyzer
  - if task.type == "security_tests":
      assign: qa-engineer
      collaboration: security-specialist
```

**QA Tactical Breakdown Example**:
```yaml
strategic_task: ST10
description: "Comprehensive testing of authentication system"
owner: qa-lead

tactical_tasks:
  TT10.1:
    description: "Unit test review for auth API endpoints"
    type: review
    assigned_to: qa-lead  # QA Lead reviews, not implements
    estimated_effort: 2h

  TT10.2:
    description: "Integration tests for login/logout flow"
    type: test_implementation
    assigned_to: qa-engineer
    estimated_effort: 4h
    test_cases: 15

  TT10.3:
    description: "E2E tests for complete authentication journey"
    type: test_implementation
    assigned_to: qa-engineer
    dependencies: [TT10.2]
    estimated_effort: 6h
    test_cases: 8

  TT10.4:
    description: "Security testing (SQL injection, XSS, CSRF)"
    type: security_test
    assigned_to: qa-engineer
    collaboration: security-specialist
    estimated_effort: 5h

  TT10.5:
    description: "Load testing for auth endpoints"
    type: performance_test
    assigned_to: qa-engineer
    estimated_effort: 3h
    performance_targets:
      - "500 req/sec sustained"
      - "p95 latency < 200ms"
```

#### d. DevOps Lead (NEW)

```yaml
name: devops-lead
domain: infrastructure
team: [devops, sysadmin]

specializations:
  - cicd_pipeline_management
  - infrastructure_as_code
  - container_orchestration
  - deployment_automation
  - monitoring_alerting

skill_matrix:
  devops:
    kubernetes: expert
    terraform: expert
    cicd: expert
    monitoring: advanced
    security: intermediate

  sysadmin:
    linux: expert
    networking: expert
    monitoring: expert
    scripting: advanced
    kubernetes: intermediate

assignment_heuristics:
  - if task.type == "cicd_pipeline":
      assign: devops
  - if task.type == "infrastructure_provisioning":
      assign: devops
  - if task.type == "production_deployment":
      assign: devops
      collaboration: sysadmin  # For monitoring and validation
  - if task.type == "server_configuration":
      assign: sysadmin
  - if task.type == "incident_response":
      primary: sysadmin
      backup: devops
```

#### e. Data Lead (NEW)

```yaml
name: data-lead
domain: data
team: [dba, data-analyst]

specializations:
  - database_architecture
  - data_modeling
  - etl_pipeline_design
  - analytics_query_optimization
  - data_quality_management

skill_matrix:
  dba:
    sql: expert
    database_admin: expert
    performance_tuning: expert
    backup_recovery: expert
    migrations: expert

  data-analyst:
    sql: advanced
    python: advanced
    analytics: expert
    visualization: expert
    statistics: advanced

assignment_heuristics:
  - if task.type == "schema_design":
      assign: dba
  - if task.type == "database_migration":
      assign: dba
      collaboration: backend-developer  # For application-side changes
  - if task.type == "analytics_dashboard":
      assign: data-analyst
  - if task.type == "etl_pipeline":
      assign: dba
      collaboration: data-analyst  # For data transformation logic
  - if task.type == "query_optimization":
      assign: dba
```

#### f. Security Lead (NEW)

```yaml
name: security-lead
domain: security
team: [security-specialist]

specializations:
  - security_architecture_review
  - threat_modeling
  - penetration_testing
  - compliance_auditing
  - security_policy_enforcement

skill_matrix:
  security-specialist:
    security_review: expert
    penetration_testing: expert
    threat_modeling: advanced
    compliance: advanced
    cryptography: expert

assignment_heuristics:
  - if task.type == "security_review":
      assign: security-specialist
  - if task.type == "threat_model":
      assign: security-specialist
      collaboration: architect  # For system understanding
  - if task.type == "penetration_test":
      assign: security-specialist
  - if task.type == "compliance_audit":
      assign: security-specialist
  - if task.requires("cryptography"):
      assign: security-specialist

when_to_invoke:
  always:
    - task touches authentication
    - task touches authorization
    - task handles sensitive data
    - task exposes public API
  tier_3_4:
    - security_review during planning phase
    - threat_model before execution
    - penetration_test after completion
```

---

## Planning System

### Two-Phase Planning Architecture

**Phase 1: Strategic Planning (Planner)**
**Phase 2: Tactical Planning (Domain Leads)**

```
┌──────────────────────────────────────────────────────────┐
│                  STRATEGIC PLANNING                       │
│  Owner: Planner                                          │
│  Granularity: High-level objectives and milestones       │
│  Output: Strategic tasks (ST1, ST2, ...)                │
└─────────────────┬────────────────────────────────────────┘
                  │
      ┌───────────┼───────────────┐
      │           │               │
┌─────▼──────┐ ┌──▼───────┐ ┌────▼──────┐
│  Backend   │ │ Frontend │ │    QA     │
│   Lead     │ │   Lead   │ │   Lead    │
│            │ │          │ │           │
│ TACTICAL   │ │ TACTICAL │ │ TACTICAL  │
│ PLANNING   │ │ PLANNING │ │ PLANNING  │
│            │ │          │ │           │
│ ST1 → TT1  │ │ ST2 → TT5│ │ ST3 → TT9 │
│       TT2  │ │       TT6│ │       TT10│
│       TT3  │ │       TT7│ │       TT11│
│       TT4  │ │       TT8│ │           │
└────────────┘ └──────────┘ └───────────┘
```

### Strategic Planning (Planner)

**Tier-Based Planning Depth**:

| Tier | Strategic Tasks | Detail Level | Consultation |
|------|----------------|--------------|--------------|
| **0** | N/A (direct answer) | N/A | None |
| **1** | 1 atomic task | Single step, no breakdown | None |
| **2** | 3-8 tasks | Moderate detail, dependencies | Optional (Architect for design) |
| **3** | 5-15 strategic tasks | High-level, Domain Leads break down | Architect + Domain Leads |
| **4** | 10-30 strategic milestones | Very high-level, multi-phase | Architect + Security + All Domain Leads |

**Strategic Task Template** (Tier 3-4):

```yaml
# Agent_Memory/inst_20260110_001/tasks/strategic/ST2.yaml
id: ST2
type: strategic
tier: 3
instruction_id: inst_20260110_001

description: "Implement user authentication API with JWT tokens"

owner: backend-lead  # Which Domain Lead breaks this down

scope:
  domains: [backend]
  estimated_team_size: 2  # backend-developer, senior-developer
  estimated_duration_range: "3-5 days"

strategic_acceptance_criteria:
  - "POST /auth/login endpoint functional"
  - "POST /auth/logout endpoint functional"
  - "JWT tokens issued and validated"
  - "Token refresh mechanism implemented"
  - "Session management with Redis"
  - "95%+ test coverage"
  - "Security review approved"

dependencies:
  requires: [ST1]  # ST1: Design auth data model
  blocks: [ST5]    # ST5: Frontend login integration

skill_requirements:
  - backend_api_design
  - jwt_authentication
  - redis_session_management
  - security_best_practices

complexity: high
risk_level: medium
security_sensitive: true

tactical_breakdown_required: true
tactical_breakdown_owner: backend-lead

collaboration_needs:
  - domain: security
    reason: "Security review of JWT implementation"
    timing: "After tactical implementation, before handoff"
  - domain: frontend
    reason: "API contract definition"
    timing: "During tactical planning"
```

**Planner's Consultation Protocol** (Enhanced):

```yaml
# Tier 3 Planning Consultation
consultation_sequence:

  step_1:
    consult: architect
    question: "Validate overall approach for auth system architecture"
    blocking: true
    timeout: 30_minutes

  step_2:
    consult: security-lead
    question: "Security requirements and threat model for authentication"
    blocking: true
    timeout: 20_minutes

  step_3:
    consult: backend-lead
    question: "Effort estimation for backend auth API strategic tasks"
    blocking: false  # Can proceed with estimate if no response
    timeout: 15_minutes

  step_4:
    consult: frontend-lead
    question: "Frontend auth integration requirements and constraints"
    blocking: false
    timeout: 15_minutes

  step_5:
    consult: qa-lead
    question: "Testing strategy and effort estimation"
    blocking: false
    timeout: 15_minutes
```

**Strategic Plan Output**:

```yaml
# Agent_Memory/inst_20260110_001/workflow/strategic_plan.yaml
instruction_id: inst_20260110_001
tier: 3
created_by: planner
created_at: 2026-01-10T10:00:00Z

objective: "Implement user authentication system with OAuth2 and JWT"

strategic_tasks:

  ST1:
    description: "Design authentication data model and schema"
    owner: data-lead
    estimated_duration: "1 day"
    dependencies: []

  ST2:
    description: "Implement authentication API endpoints"
    owner: backend-lead
    estimated_duration: "3-5 days"
    dependencies: [ST1]

  ST3:
    description: "Implement JWT middleware for protected routes"
    owner: backend-lead
    estimated_duration: "2 days"
    dependencies: [ST2]

  ST4:
    description: "Build login/signup UI components"
    owner: frontend-lead
    estimated_duration: "3 days"
    dependencies: [ST2]  # Needs API contract

  ST5:
    description: "Integrate frontend with auth API"
    owner: frontend-lead
    estimated_duration: "2 days"
    dependencies: [ST3, ST4]

  ST6:
    description: "Security review and threat modeling"
    owner: security-lead
    estimated_duration: "1 day"
    dependencies: [ST3]

  ST7:
    description: "Comprehensive auth system testing"
    owner: qa-lead
    estimated_duration: "3 days"
    dependencies: [ST5, ST6]

critical_path: [ST1, ST2, ST3, ST5, ST7]
parallel_opportunities:
  - [ST4, ST3]  # Frontend UI can be built while backend middleware developed

total_estimated_duration: "10-15 days"

consultation_results:
  architect:
    recommendation: "Use Passport.js for OAuth, JWT for tokens, Redis for sessions"
    concerns: "None, standard approach"

  security-lead:
    requirements:
      - "Use HTTPS only"
      - "Token expiry 15 minutes, refresh token 7 days"
      - "Rate limiting on auth endpoints"
      - "CSRF protection"
    threat_model: "Available in /security/threat_models/auth_system.yaml"

  backend-lead:
    effort_feedback: "3-5 days realistic, 2 developers needed"
    concerns: "Redis provisioning needed from DevOps"

  frontend-lead:
    effort_feedback: "UI can be done in 3 days"
    requirements: "Need API contract early for parallel development"

  qa-lead:
    testing_strategy: "Integration + E2E + security tests, 3 days"
    concerns: "Need test environment with auth enabled"

next_phase: tactical_planning
delegates_to:
  - backend-lead: [ST2, ST3]
  - frontend-lead: [ST4, ST5]
  - data-lead: [ST1]
  - security-lead: [ST6]
  - qa-lead: [ST7]
```

### Tactical Planning (Domain Leads)

**Domain Lead Tactical Breakdown Process**:

1. **Receive Strategic Task**: Domain Lead reads strategic task assigned to them
2. **Analyze Scope**: Understand acceptance criteria, dependencies, constraints
3. **Decompose to Tactical**: Break into 3-10 tactical tasks (executable by ICs)
4. **Estimate Effort**: Provide specific hour/day estimates per tactical task
5. **Assign Skills**: Identify skill requirements for each tactical task
6. **Sequence Tasks**: Order tactical tasks by dependencies
7. **Assign to ICs**: Match tactical tasks to specific team members
8. **Document**: Write tactical tasks to `tasks/tactical/domain/`

**Tactical Task Template**:

```yaml
# Agent_Memory/inst_20260110_001/tasks/tactical/backend/TT2.1.yaml
id: TT2.1
type: tactical
parent_strategic_task: ST2
instruction_id: inst_20260110_001

domain: backend
created_by: backend-lead
created_at: 2026-01-10T14:30:00Z

description: "Implement POST /auth/login endpoint with JWT generation"

assigned_to: backend-developer
assignment_rationale: "Standard API endpoint, within backend-dev capability"

estimated_effort: 4_hours
estimated_effort_breakdown:
  implementation: 2h
  unit_tests: 1.5h
  code_review_fixes: 0.5h

skill_requirements:
  required:
    - nodejs
    - express
    - jwt
  nice_to_have:
    - passport_js
    - redis

complexity: moderate

tactical_acceptance_criteria:
  - "Endpoint accepts POST with email and password"
  - "Returns 200 with JWT token on valid credentials"
  - "Returns 401 on invalid password"
  - "Returns 404 on user not found"
  - "Returns 400 on missing fields"
  - "JWT token contains {sub, role, exp} claims"
  - "Token expires in 15 minutes"
  - "Rate limited to 5 requests/minute per IP"
  - "Unit tests cover all response codes"
  - "Test coverage > 90%"

implementation_guidance:
  files_to_modify:
    - src/routes/auth.js
    - src/middleware/jwt.js
    - src/services/auth_service.js

  files_to_create:
    - tests/unit/auth_login.test.js

  approach:
    - "Use Passport.js local strategy for credential validation"
    - "Generate JWT with jsonwebtoken library"
    - "Store session in Redis with 15-minute TTL"
    - "Use express-rate-limit for rate limiting"

  references:
    - "docs/api_patterns.md for standard endpoint structure"
    - "docs/error_handling.md for error response format"

dependencies:
  requires:
    - tactical: []
    - infrastructure: ["Redis instance provisioned"]
  blocks:
    - tactical: [TT2.3, TT2.4]  # Other auth endpoints depend on this pattern

validation_method:
  peer_review: true
  domain_lead_approval: true
  automated_tests: "npm test -- auth_login"

estimated_start: 2026-01-11T09:00:00Z
estimated_completion: 2026-01-11T13:00:00Z
deadline: 2026-01-11T17:00:00Z  # Some buffer
```

**Domain Lead Assignment Decision Tree**:

```python
def assign_tactical_task(task, team, workload, complexity_history):
    """
    Sophisticated assignment algorithm considering:
    - Skill matching
    - Workload balancing
    - Complexity appropriateness
    - Learning opportunities
    """

    candidates = []

    for ic in team:
        # 1. Skill Matching
        skill_match = calculate_skill_match(task.skill_requirements, ic.skills)
        if skill_match < 0.6:  # Minimum 60% skill match
            continue

        # 2. Workload Check
        current_workload = calculate_workload(ic, workload)
        if current_workload > 0.9:  # Over 90% capacity
            continue

        # 3. Complexity Appropriateness
        complexity_fit = assess_complexity_fit(task.complexity, ic.experience_level)

        # 4. Learning Opportunity
        learning_score = calculate_learning_value(task, ic.skill_gaps)

        # 5. Recent Performance
        recent_performance = get_recent_performance(ic, complexity_history)

        # Composite Score
        score = (
            skill_match * 0.40 +
            (1 - current_workload) * 0.25 +  # Prefer less busy ICs
            complexity_fit * 0.20 +
            learning_score * 0.10 +
            recent_performance * 0.05
        )

        candidates.append({
            "ic": ic,
            "score": score,
            "skill_match": skill_match,
            "workload": current_workload,
            "rationale": f"Skill match {skill_match:.0%}, workload {current_workload:.0%}"
        })

    if not candidates:
        return escalate_to_tech_lead("No suitable IC available for task")

    # Sort by score, pick best
    best = sorted(candidates, key=lambda x: x["score"], reverse=True)[0]

    return {
        "assigned_to": best["ic"],
        "assignment_score": best["score"],
        "rationale": best["rationale"]
    }
```

### Planning Quality Gates

**Strategic Plan Review** (Engineering Manager):

```yaml
strategic_plan_review_checklist:

  completeness:
    - "All objectives from instruction addressed"
    - "Dependencies clearly identified"
    - "Acceptance criteria measurable"
    - "Risk factors assessed"

  feasibility:
    - "Resource estimates realistic"
    - "Timeline achievable"
    - "No obvious blockers"
    - "Skill requirements available in team"

  risk:
    - "Total risk score acceptable"
    - "High-risk tasks have mitigation"
    - "Security review planned if needed"
    - "Performance impact assessed"

  consultation:
    - "Architect consulted (tier 3-4)"
    - "Security consulted if security-sensitive"
    - "Domain Leads provided estimates"

  decision_outcomes:
    - approved: "Proceed to tactical planning"
    - approved_with_conditions: "Proceed with checkpoints"
    - request_changes: "Planner revise plan"
    - escalate: "HITL decision needed"
```

**Tactical Plan Review** (Tech Lead):

```yaml
tactical_plan_review_checklist:

  granularity:
    - "Tasks are atomic (independently executable)"
    - "Task size reasonable (< 1 day per task)"
    - "Clear acceptance criteria per task"

  assignment:
    - "ICs have required skills"
    - "Workload balanced across team"
    - "No single IC overloaded"
    - "Complex tasks assigned to experienced ICs"

  sequencing:
    - "Dependencies logically ordered"
    - "Parallel opportunities identified"
    - "No circular dependencies"
    - "Critical path optimized"

  cross_domain:
    - "Handoff points identified"
    - "API contracts defined (if applicable)"
    - "Integration points coordinated"

  decision_outcomes:
    - approved: "Proceed to execution"
    - request_changes: "Domain Lead revise assignments"
    - rebalance: "Tech Lead reallocates across domains"
```

---

## Delegation and Assignment System

### Capacity Management

**Team Capacity Tracking**:

```yaml
# Agent_Memory/_system/capacity/backend_team.yaml
domain: backend
last_updated: 2026-01-10T15:00:00Z

team_members:
  backend-developer:
    availability: 8h_per_day
    current_allocation:
      inst_001_TT2.1: 4h  # Expected completion today
      inst_001_TT2.2: 8h  # Tomorrow
      inst_003_TT5.3: 4h  # Day after

    total_committed: 16h
    capacity_used: 100%  # 16h / (2 days * 8h) = 100%
    available_from: 2026-01-13

  senior-developer:
    availability: 8h_per_day
    current_allocation:
      inst_001_TT2.4: 6h  # High-complexity JWT middleware
      inst_002_TT8.2: 10h  # Performance optimization

    total_committed: 16h
    capacity_used: 100%
    available_from: 2026-01-13

domain_capacity:
  total_capacity: 16h_per_day  # 2 ICs * 8h
  current_usage: 16h_per_day
  utilization: 100%

  forecast_next_3_days:
    2026-01-11: 100%  # Fully allocated
    2026-01-12: 100%  # Fully allocated
    2026-01-13: 30%   # Tasks completing, capacity freeing up
```

**Domain Lead Capacity Decision**:

```python
def can_accept_strategic_task(strategic_task, domain_capacity):
    """
    Determine if domain can accept new strategic task.
    """

    # Estimate tactical breakdown
    estimated_tactical_tasks = estimate_tactical_count(strategic_task)
    avg_tactical_effort = strategic_task.estimated_duration / estimated_tactical_tasks

    # Total effort needed
    total_effort_hours = estimated_tactical_tasks * avg_tactical_effort

    # Check capacity
    available_capacity = calculate_available_capacity(
        domain_capacity,
        days=strategic_task.estimated_duration
    )

    if total_effort_hours <= available_capacity * 0.85:  # 85% threshold
        return "accept", "Sufficient capacity available"

    if total_effort_hours <= available_capacity * 1.0:
        return "accept_with_warning", "Capacity tight, buffer minimal"

    # Calculate when capacity would be available
    available_from = calculate_next_available_slot(domain_capacity, total_effort_hours)

    return "defer", f"Insufficient capacity, can start {available_from}"
```

**Tech Lead Capacity Rebalancing**:

```yaml
# When backend overloaded, frontend has capacity
capacity_rebalancing_scenario:

  trigger:
    backend_utilization: 120%  # Oversubscribed
    frontend_utilization: 60%   # Underutilized

  analysis:
    overloaded_domain: backend
    underutilized_domain: frontend

  rebalancing_options:

    option_1:
      action: "Defer new backend strategic tasks"
      impact: "Delays instruction, but maintains quality"

    option_2:
      action: "Assign senior-developer to assist frontend"
      impact: "Backend loses capacity but frontend accelerates"
      feasibility: "senior-developer has full-stack skills"

    option_3:
      action: "Split strategic task across domains"
      impact: "Frontend takes on backend tasks they're capable of"
      example: "Frontend builds mock API while backend builds real API"

  tech_lead_decision: option_2
  rationale: "Senior-developer can help frontend with complex React performance, freeing backend-developer for backend tasks"

  execution:
    - "Reassign senior-developer from inst_002_TT8.2 to inst_001_TT4.3"
    - "Assign backend-developer to inst_002_TT8.2 instead"
    - "Update capacity tracking"
    - "Notify both Domain Leads of reassignment"
```

### Skill-Based Assignment

**Skill Matrix Definition**:

```yaml
# Agent_Memory/_system/skills/skill_taxonomy.yaml
skill_categories:

  programming_languages:
    - python
    - javascript
    - typescript
    - go
    - rust

  frameworks:
    - react
    - vue
    - angular
    - nodejs
    - express
    - django
    - flask

  databases:
    - postgresql
    - mysql
    - mongodb
    - redis

  infrastructure:
    - docker
    - kubernetes
    - terraform
    - aws
    - gcp

  security:
    - authentication
    - authorization
    - cryptography
    - penetration_testing
    - owasp

  testing:
    - unit_testing
    - integration_testing
    - e2e_testing
    - performance_testing

  domains:
    - frontend
    - backend
    - devops
    - data
    - security
    - qa

skill_levels:
  beginner: 1
  intermediate: 2
  advanced: 3
  expert: 4
```

**IC Skill Profile**:

```yaml
# Agent_Memory/_system/skills/backend-developer.yaml
ic: backend-developer
domain: backend
experience_level: intermediate

skills:
  # Programming Languages
  python:
    level: advanced
    years: 3
    last_used: 2026-01-10

  javascript:
    level: advanced
    years: 4
    last_used: 2026-01-10

  typescript:
    level: intermediate
    years: 1
    last_used: 2025-12-15

  # Frameworks
  nodejs:
    level: expert
    years: 4
    last_used: 2026-01-10
    certifications: ["Node.js Certified Developer"]

  express:
    level: expert
    years: 4
    last_used: 2026-01-10

  django:
    level: intermediate
    years: 1
    last_used: 2025-11-20

  # Databases
  postgresql:
    level: advanced
    years: 3
    last_used: 2026-01-05

  redis:
    level: intermediate
    years: 1
    last_used: 2025-12-20

  # Security
  authentication:
    level: intermediate
    years: 2
    last_used: 2025-10-15

  jwt:
    level: advanced
    years: 2
    last_used: 2025-10-15

  # Testing
  unit_testing:
    level: advanced
    years: 3
    last_used: 2026-01-09

  integration_testing:
    level: intermediate
    years: 2
    last_used: 2025-12-10

skill_gaps:
  - graphql  # Wants to learn
  - kubernetes  # Would benefit backend work

learning_goals:
  - "Master GraphQL API design"
  - "Learn Kubernetes deployment"

performance_history:
  tasks_completed: 47
  avg_task_completion_time_vs_estimate: 0.95  # 5% faster than estimates
  quality_score: 0.92  # 92% first-time approval rate
  complexity_track_record:
    simple: 98%_success
    moderate: 94%_success
    high: 85%_success
```

**Skill Matching Algorithm**:

```python
def calculate_skill_match(task_requirements, ic_skills):
    """
    Calculate how well IC's skills match task requirements.
    Returns score 0.0-1.0.
    """

    required_skills = task_requirements.get("required", [])
    nice_to_have_skills = task_requirements.get("nice_to_have", [])

    # Check required skills
    required_match = 0
    for skill in required_skills:
        if skill not in ic_skills:
            return 0.0  # Missing required skill = no match

        skill_level = ic_skills[skill].get("level", "beginner")
        level_score = {
            "beginner": 0.5,
            "intermediate": 0.75,
            "advanced": 0.9,
            "expert": 1.0
        }.get(skill_level, 0.5)

        required_match += level_score

    required_score = required_match / len(required_skills) if required_skills else 1.0

    # Check nice-to-have skills (bonus)
    nice_to_have_match = 0
    for skill in nice_to_have_skills:
        if skill in ic_skills:
            nice_to_have_match += 1

    nice_to_have_score = nice_to_have_match / len(nice_to_have_skills) if nice_to_have_skills else 0

    # Combined score (required 80%, nice-to-have 20%)
    final_score = (required_score * 0.8) + (nice_to_have_score * 0.2)

    return final_score
```

### Complexity-Based Assignment

**Complexity Assessment Framework**:

```yaml
complexity_dimensions:

  technical_difficulty:
    simple: "Straightforward implementation, well-understood patterns"
    moderate: "Some complexity, may require research or consultation"
    high: "Novel problem, requires deep expertise or architectural design"

  scope_size:
    small: "Single file, < 100 lines of code"
    medium: "2-3 files, 100-300 lines"
    large: "> 3 files, > 300 lines"

  integration_complexity:
    low: "No external integrations"
    medium: "1-2 external systems"
    high: "> 2 external systems or complex data flow"

  risk_level:
    low: "Low-traffic feature, easy rollback"
    medium: "Moderate traffic, some risk"
    high: "Critical path, high traffic, difficult rollback"

ic_experience_levels:
  junior: "0-2 years, handles simple tasks independently"
  mid: "2-4 years, handles moderate tasks independently"
  senior: "4+ years, handles high complexity, mentors others"
  staff: "8+ years, handles expert-level, architectural work"

assignment_matrix:
  simple_technical + small_scope + low_integration + low_risk:
    suitable_for: [junior, mid, senior, staff]
    recommended: junior  # Learning opportunity

  moderate_technical + medium_scope + medium_integration + medium_risk:
    suitable_for: [mid, senior, staff]
    recommended: mid

  high_technical + large_scope + high_integration + high_risk:
    suitable_for: [senior, staff]
    recommended: senior
    requires_review: true
    requires_consultation: architect
```

**Assignment Decision Example**:

```yaml
task: TT2.4
description: "Implement JWT middleware for protected routes"

complexity_assessment:
  technical_difficulty: high  # Security-critical, performance-sensitive
  scope_size: medium  # 2 files, middleware + tests
  integration_complexity: medium  # Integrates with all protected endpoints
  risk_level: high  # Security vulnerability if done wrong

  overall_complexity: high

suitable_ics:
  - backend-developer:
      skill_match: 0.75  # Has JWT experience (intermediate)
      experience_level: mid
      current_workload: 100%
      complexity_fit: 0.6  # Mid-level handling high complexity = stretch

  - senior-developer:
      skill_match: 0.95  # Expert in JWT and security
      experience_level: senior
      current_workload: 90%
      complexity_fit: 1.0  # Perfect fit

domain_lead_decision:
  assigned_to: senior-developer
  rationale: |
    TT2.4 is high complexity and security-critical. While backend-developer
    has JWT experience, this task requires deep security expertise to avoid
    vulnerabilities. Senior-developer is the safer choice.

  alternative_considered:
    assign: backend-developer
    with_pairing: senior-developer
    outcome: "Rejected - senior-developer workload too high for pairing"
```

### Workload Balancing

**Workload Calculation**:

```python
def calculate_workload(ic, current_date, lookahead_days=3):
    """
    Calculate IC's workload as % of capacity over next N days.
    """

    total_capacity_hours = ic.availability_hours_per_day * lookahead_days

    committed_hours = 0
    for task in ic.assigned_tasks:
        if task.deadline <= current_date + timedelta(days=lookahead_days):
            remaining_effort = task.estimated_effort - task.effort_completed
            committed_hours += remaining_effort

    workload_percentage = committed_hours / total_capacity_hours

    return {
        "workload_percentage": workload_percentage,
        "committed_hours": committed_hours,
        "available_capacity_hours": total_capacity_hours - committed_hours,
        "oversubscribed": workload_percentage > 1.0
    }
```

**Workload Balancing Strategy**:

```yaml
workload_balancing_rules:

  ideal_utilization: 0.75  # 75% - allows buffer for unknowns
  max_utilization: 0.95    # 95% - hard cap

  balancing_actions:

    ic_over_95_percent:
      action: "Do not assign new tasks"
      escalation: "Notify Domain Lead of oversubscription"

    ic_75_to_95_percent:
      action: "Assign only if critical or matches skills perfectly"

    ic_under_75_percent:
      action: "Preferred assignment target"
      opportunity: "Learning tasks can be assigned"

  rebalancing_triggers:

    domain_avg_utilization_over_90_percent:
      action: "Domain Lead escalates to Tech Lead"
      request: "Additional resources or task deferral"

    single_ic_over_110_percent:
      action: "Domain Lead redistributes tasks within team"
      escalation: "If redistribution not possible, escalate to Tech Lead"
```

---

(Continuing in next message due to length...)

## Task Lifecycle and State Machine

### Enhanced Task States (10 States)

```
┌─────────────────────────────────────────────────────────────────┐
│                    TASK STATE MACHINE                            │
└─────────────────────────────────────────────────────────────────┘

                        ┌──────────────┐
                        │   PENDING    │ (Created by Planner)
                        └──────┬───────┘
                               │
                    ┌──────────▼──────────┐
          Tier 3-4  │   IN_PLANNING       │ (Domain Lead breaking down)
                    └──────────┬──────────┘
                               │
                        ┌──────▼───────┐
                        │   ASSIGNED   │ (Domain Lead assigned to IC)
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │ IN_PROGRESS  │ (IC actively working)
                        └──────┬───────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
              ┌─────▼─────┐    │     ┌────▼─────┐
              │  BLOCKED  │    │     │UNDER_REV│ (Peer review)
              └─────┬─────┘    │     └────┬─────┘
                    │          │          │
             ┌──────▼──────┐   │     ┌────▼──────┐
             │ESCALATED_TO │   │     │DOMAIN_REV │ (Domain Lead)
             │ DOMAIN_LEAD │   │     └────┬──────┘
             └──────┬──────┘   │          │
                    │          │     ┌────▼────────┐
             ┌──────▼──────┐   │     │READY_FOR_   │
             │UNBLOCKED →  │   │     │HANDOFF      │
             │IN_PROGRESS  │   │     └────┬────────┘
             └─────────────┘   │          │
                               │     ┌────▼────┐
                               │     │COMPLETED│
                               │     └─────────┘
                        ┌──────▼────────┐
                        │   CANCELLED   │
                        └───────────────┘
```

### State Definitions

```yaml
states:

  PENDING:
    description: "Task created by Planner, not yet assigned to IC"
    applicable_to: [tier_1, tier_2, tier_3, tier_4]
    owner: planner
    next_states: [IN_PLANNING, ASSIGNED, CANCELLED]
    duration_typical: "Minutes to hours"

  IN_PLANNING:
    description: "Domain Lead breaking strategic task into tactical tasks"
    applicable_to: [tier_3, tier_4]
    owner: domain_lead
    next_states: [ASSIGNED, CANCELLED]
    duration_typical: "Hours to 1 day"
    artifacts_created:
      - "Tactical task breakdown"
      - "Skill requirement analysis"
      - "Effort estimates"

  ASSIGNED:
    description: "Domain Lead assigned tactical task to specific IC, IC hasn't started"
    applicable_to: [tier_1, tier_2, tier_3, tier_4]
    owner: domain_lead
    next_states: [IN_PROGRESS, CANCELLED, BLOCKED]
    duration_typical: "Hours (until IC has capacity)"
    sla_warning: "If > 24h, may indicate capacity issue"

  IN_PROGRESS:
    description: "IC actively working on task"
    applicable_to: [tier_1, tier_2, tier_3, tier_4]
    owner: ic
    next_states: [UNDER_REVIEW, BLOCKED, COMPLETED]
    duration_typical: "Hours to days (per task complexity)"
    progress_tracking: true
    requires_heartbeat: "IC updates progress every 4 hours"

  BLOCKED:
    description: "IC cannot proceed due to blocker"
    applicable_to: [tier_1, tier_2, tier_3, tier_4]
    owner: ic
    next_states: [ESCALATED_TO_DOMAIN_LEAD, IN_PROGRESS, CANCELLED]
    duration_typical: "Minutes to hours (urgent resolution)"
    escalation_required: true
    blocker_types:
      - missing_dependency
      - technical_uncertainty
      - external_dependency
      - scope_ambiguity

  ESCALATED_TO_DOMAIN_LEAD:
    description: "Blocker escalated to Domain Lead for resolution"
    applicable_to: [tier_1, tier_2, tier_3, tier_4]
    owner: domain_lead
    next_states: [IN_PROGRESS, ESCALATED_TO_TECH_LEAD, CANCELLED]
    duration_typical: "Hours"
    resolution_actions:
      - unblock_by_providing_guidance
      - reassign_to_different_ic
      - escalate_to_tech_lead
      - escalate_to_architect

  UNDER_REVIEW:
    description: "IC completed work, awaiting peer code review"
    applicable_to: [tier_1, tier_2, tier_3, tier_4]
    owner: peer_ic
    next_states: [DOMAIN_REVIEW, IN_PROGRESS]
    duration_typical: "Hours (< 4h SLA)"
    review_criteria:
      - code_quality
      - test_coverage
      - follows_patterns
      - no_obvious_bugs

  DOMAIN_REVIEW:
    description: "Peer approved, Domain Lead final approval"
    applicable_to: [tier_1, tier_2, tier_3, tier_4]
    owner: domain_lead
    next_states: [READY_FOR_HANDOFF, COMPLETED, IN_PROGRESS]
    duration_typical: "Hours (< 8h SLA)"
    review_criteria:
      - meets_acceptance_criteria
      - quality_acceptable
      - documentation_complete
      - ready_for_integration

  READY_FOR_HANDOFF:
    description: "Domain Lead approved, waiting for cross-domain handoff"
    applicable_to: [tier_2, tier_3, tier_4]
    owner: domain_lead
    next_states: [COMPLETED]
    duration_typical: "Hours to days (depends on downstream readiness)"
    handoff_requirements:
      - documentation_complete
      - staging_deployed
      - handoff_checklist_prepared
      - downstream_domain_notified

  COMPLETED:
    description: "Task fully done, integrated, and accepted"
    applicable_to: [tier_1, tier_2, tier_3, tier_4]
    owner: domain_lead
    next_states: []  # Terminal state
    requires:
      - all_acceptance_criteria_met
      - peer_review_approved
      - domain_lead_approved
      - integrated_successfully

  CANCELLED:
    description: "Task cancelled due to scope change or instruction termination"
    applicable_to: [tier_1, tier_2, tier_3, tier_4]
    owner: tech_lead or engineering_manager
    next_states: []  # Terminal state
    requires_documentation: true
```

### State Transition Rules

```yaml
transition_rules:

  PENDING → IN_PLANNING:
    condition: "tier >= 3 AND task.type == 'strategic'"
    actor: orchestrator
    action: "Signal Domain Lead to begin tactical breakdown"

  PENDING → ASSIGNED:
    condition: "tier <= 2 OR task.type == 'tactical'"
    actor: domain_lead
    action: "Assign to IC based on skill/workload/complexity"

  ASSIGNED → IN_PROGRESS:
    condition: "IC has capacity AND all dependencies met"
    actor: ic
    action: "IC starts work, updates status"

  IN_PROGRESS → BLOCKED:
    condition: "IC encounters blocker"
    actor: ic
    action: |
      1. IC documents blocker (type, description, attempted solutions)
      2. IC moves task to BLOCKED
      3. IC signals Domain Lead
    auto_escalation: "If blocked > 4h, auto-escalate to Domain Lead"

  BLOCKED → ESCALATED_TO_DOMAIN_LEAD:
    condition: "IC escalates OR auto-escalation triggered"
    actor: ic or system
    action: "Domain Lead takes ownership of blocker resolution"

  IN_PROGRESS → UNDER_REVIEW:
    condition: "IC completes work AND work meets basic quality bar"
    actor: ic
    action: |
      1. IC runs local tests
      2. IC self-reviews for obvious issues
      3. IC moves to UNDER_REVIEW
      4. IC assigns peer reviewer

  UNDER_REVIEW → IN_PROGRESS:
    condition: "Peer reviewer requests changes"
    actor: peer_ic
    action: |
      1. Peer documents requested changes
      2. Task returns to original IC
      3. IC addresses feedback

  UNDER_REVIEW → DOMAIN_REVIEW:
    condition: "Peer reviewer approves"
    actor: peer_ic
    action: |
      1. Peer approves in review system
      2. Task auto-transitions to DOMAIN_REVIEW
      3. Domain Lead notified

  DOMAIN_REVIEW → IN_PROGRESS:
    condition: "Domain Lead requests changes"
    actor: domain_lead
    action: "Similar to peer review, but higher-level concerns"

  DOMAIN_REVIEW → READY_FOR_HANDOFF:
    condition: "Domain Lead approves AND cross-domain dependency exists"
    actor: domain_lead
    action: |
      1. Domain Lead approves
      2. Domain Lead prepares handoff package
      3. Downstream Domain Lead notified

  DOMAIN_REVIEW → COMPLETED:
    condition: "Domain Lead approves AND no cross-domain dependency"
    actor: domain_lead
    action: |
      1. Domain Lead marks complete
      2. Contribution counted toward strategic task progress
      3. Capacity freed for IC

  READY_FOR_HANDOFF → COMPLETED:
    condition: "Downstream domain acknowledges handoff"
    actor: downstream_domain_lead
    action: "Task archived as complete"
```

### State Duration SLAs

```yaml
# Service Level Agreements for state durations
state_slas:

  PENDING:
    target: "< 2 hours (tier 1-2), < 8 hours (tier 3-4)"
    warning_threshold: "2x target"
    escalation_threshold: "4x target"
    action_on_escalation: "Engineering Manager reviews capacity"

  IN_PLANNING:
    target: "< 1 day"
    warning_threshold: "1.5 days"
    escalation_threshold: "2 days"
    action_on_escalation: "Tech Lead assists Domain Lead with breakdown"

  ASSIGNED:
    target: "< 4 hours"
    warning_threshold: "8 hours"
    escalation_threshold: "24 hours"
    action_on_escalation: "Domain Lead reviews IC workload, may reassign"

  IN_PROGRESS:
    target: "Varies by task (use estimated_effort)"
    warning_threshold: "1.5x estimated_effort"
    escalation_threshold: "2x estimated_effort"
    action_on_escalation: "Domain Lead checks in with IC, offers assistance"

  BLOCKED:
    target: "< 2 hours"
    warning_threshold: "4 hours"
    escalation_threshold: "8 hours"
    action_on_escalation: "Auto-escalate to Tech Lead"

  UNDER_REVIEW:
    target: "< 4 hours"
    warning_threshold: "8 hours"
    escalation_threshold: "24 hours"
    action_on_escalation: "Domain Lead assigns different peer or reviews self"

  DOMAIN_REVIEW:
    target: "< 8 hours"
    warning_threshold: "16 hours"
    escalation_threshold: "48 hours"
    action_on_escalation: "Tech Lead reviews on behalf of Domain Lead"

  READY_FOR_HANDOFF:
    target: "< 1 day"
    warning_threshold: "2 days"
    escalation_threshold: "3 days"
    action_on_escalation: "Tech Lead coordinates handoff directly"
```

---

## Communication Protocols

### Multi-Modal Communication Framework

**Four Communication Modes**:

1. **Delegation** (Inbox) - Task/work assignment
2. **Broadcast** (Channels) - Team-wide announcements
3. **Handoff** (Structured Protocol) - Cross-domain transitions
4. **Standup** (Progress Reports) - Regular status updates

### 1. Delegation Protocol (Inbox Messages)

**Hierarchy of Delegations**:

```
Engineering Manager
   ↓ (delegates strategic oversight)
Tech Lead
   ↓ (delegates strategic tasks)
Domain Lead
   ↓ (delegates tactical tasks)
Individual Contributor
```

**Delegation Message Template**:

```yaml
# Agent_Memory/_communication/inbox/{recipient}/delegation_{timestamp}.yaml
type: delegation
from: {sender_role}
to: {recipient_role}
timestamp: {ISO8601}
instruction_id: {inst_id}
priority: critical | high | normal | low

message: |
  Human-readable delegation message explaining what needs to be done.

delegation:
  task_id: {task_id}  # If delegating specific task
  strategic_tasks: [{st_ids}]  # If delegating strategic tasks (TL → DL)
  scope: |
    Detailed scope description.

  authority:
    decision_making: autonomous | review_required | consult_required
    budget_authority: none | small_expenses | moderate_expenses
    escalation_path: {who to escalate to}

  resources:
    team_members: [{ic_ids}]  # Who can work on this
    tools_access: [{tool_names}]
    budget: ${amount} if applicable

  success_criteria:
    - Criterion 1
    - Criterion 2

  constraints:
    - Constraint 1
    - Constraint 2

  deadline: {ISO8601} if applicable
  estimated_effort: {hours or days}

context:
  why_this_matters: |
    Business context and importance.

  related_work:
    - instruction: inst_X
      relationship: depends_on | blocks | related

  risks:
    - risk: Description
      mitigation: How to mitigate

acknowledgement_required: true | false
response_deadline: {ISO8601} if applicable
```

**Example: Engineering Manager → Tech Lead**:

```yaml
# Agent_Memory/_communication/inbox/tech-lead/delegation_20260110_150000.yaml
type: delegation
from: engineering-manager
to: tech-lead
timestamp: 2026-01-10T15:00:00Z
instruction_id: inst_20260110_001
priority: high

message: |
  Execute tier 3 instruction: "Implement user authentication system with OAuth2 and JWT"

  Strategic plan has been reviewed and approved with minor conditions.
  Proceed to execution phase with the following checkpoints.

delegation:
  scope: "Full execution of authentication system per strategic plan"

  authority:
    decision_making: autonomous  # Tech Lead has full authority
    escalation_path: engineering-manager
    checkpoint_reviews:
      - after: ST2  # After backend API complete
        review_with: engineering-manager
        reason: "Validate API design before frontend integration"

      - after: ST6  # After security review
        review_with: engineering-manager
        reason: "Ensure security posture acceptable"

  resources:
    domains: [backend, frontend, qa, security, data]
    estimated_team_size: 8  # 2 backend, 2 frontend, 2 qa, 1 security, 1 data

  success_criteria:
    - "All strategic tasks (ST1-ST7) completed"
    - "95%+ test coverage"
    - "Security review passed"
    - "Performance benchmarks met (< 200ms p95 latency)"

  constraints:
    - "Must use approved OAuth providers (Google, GitHub, Microsoft)"
    - "No breaking changes to existing session-based auth"
    - "Zero downtime deployment required"

  deadline: 2026-01-20
  estimated_effort: "10-15 days"

context:
  why_this_matters: |
    Authentication is blocking 3 other high-priority features.
    Customer commitments depend on OAuth SSO by end of month.

  related_work:
    - instruction: inst_20260105_003
      relationship: depends_on
      note: "Waiting for auth system before can implement user roles"

  risks:
    - risk: "OAuth provider downtime affects availability"
      mitigation: "Fallback to session auth if OAuth unavailable"
    - risk: "Migration of existing users could lock users out"
      mitigation: "Gradual rollout with extensive testing"

acknowledgement_required: true
response_deadline: 2026-01-10T17:00:00Z
```

**Example: Tech Lead → Domain Lead**:

```yaml
# Agent_Memory/_communication/inbox/backend-lead/delegation_20260110_153000.yaml
type: delegation
from: tech-lead
to: backend-lead
timestamp: 2026-01-10T15:30:00Z
instruction_id: inst_20260110_001
priority: high

message: |
  Delegating strategic backend tasks for authentication system.

  Please break down ST2 and ST3 into tactical tasks and assign to your team.

delegation:
  strategic_tasks: [ST2, ST3]

  ST2:
    description: "Implement authentication API endpoints"
    estimated_duration: "3-5 days"
    dependencies: [ST1]  # Data model must be complete

  ST3:
    description: "Implement JWT middleware for protected routes"
    estimated_duration: "2 days"
    dependencies: [ST2]

  authority:
    decision_making: autonomous  # Backend Lead decides tactical breakdown
    escalation_path: tech-lead
    requires_coordination:
      - domain: frontend
        reason: "API contract must be agreed before frontend starts ST4"
      - domain: security
        reason: "Security review of JWT implementation (ST6)"

  resources:
    team: [backend-developer, senior-developer]
    infrastructure: "Redis instance (request from DevOps if needed)"

  success_criteria:
    - "All endpoints functional and tested"
    - "JWT middleware correctly validates tokens"
    - "95%+ test coverage"
    - "API documentation complete"

  deadline: 2026-01-15
  estimated_effort: "5-7 days"

context:
  critical_path: true  # ST2 and ST3 are on critical path
  frontend_waiting: "Frontend Lead ready to start ST4 as soon as ST2 complete"
  handoff_required: "Prepare handoff package for Frontend Lead after ST2"

acknowledgement_required: true
response_deadline: 2026-01-10T18:00:00Z
```

**Example: Domain Lead → IC**:

```yaml
# Agent_Memory/_communication/inbox/backend-developer/delegation_20260111_090000.yaml
type: delegation
from: backend-lead
to: backend-developer
timestamp: 2026-01-11T09:00:00Z
instruction_id: inst_20260110_001
priority: normal

message: |
  Assigning tactical task TT2.1: Implement POST /auth/login endpoint

  This is the first auth endpoint and will set the pattern for TT2.2 and TT2.3.
  Follow the API patterns documented in docs/api_patterns.md.

delegation:
  task_id: TT2.1

  authority:
    decision_making: autonomous  # You decide implementation details
    escalation_path: backend-lead
    consultation_available:
      - senior-developer: "For JWT best practices"
      - security-specialist: "For security questions"

  resources:
    files_to_modify: [src/routes/auth.js, src/middleware/jwt.js]
    files_to_create: [tests/unit/auth_login.test.js]
    documentation: [docs/api_patterns.md, docs/error_handling.md]

  success_criteria:
    - "Endpoint returns 200 with JWT on valid credentials"
    - "Returns 401 on invalid password"
    - "Returns 404 on user not found"
    - "Returns 400 on missing fields"
    - "JWT contains {sub, role, exp} claims"
    - "Token expires in 15 minutes"
    - "Rate limited to 5 req/min per IP"
    - "90%+ test coverage"

  estimated_effort: 4_hours
  deadline: 2026-01-11T13:00:00Z

  next_steps_after_completion:
    - "Submit for peer review"
    - "I will review and approve"
    - "Then move to TT2.2 (logout endpoint)"

acknowledgement_required: true
```

### 2. Broadcast Protocol (Team Channels)

**Broadcast Channels**:

```
_communication/broadcast/
  all/                    # Everyone in system
  domain-leads/           # All Domain Leads
  tech-leads/             # Tech Lead + Domain Leads
  backend-team/           # Backend Lead + backend ICs
  frontend-team/          # Frontend Lead + frontend ICs
  qa-team/                # QA Lead + QA ICs
  devops-team/            # DevOps Lead + DevOps/SysAdmin
  data-team/              # Data Lead + DBA + Data Analyst
  security-team/          # Security Lead + Security Specialist
```

**Broadcast Message Template**:

```yaml
# Agent_Memory/_communication/broadcast/{channel}/announcement_{timestamp}.yaml
type: broadcast
from: {sender_role}
to: {channel}
timestamp: {ISO8601}
announcement_type: priority_change | resource_shift | milestone | blocker | celebration
priority: critical | high | normal | info

subject: "Brief subject line"

message: |
  Full announcement message.

impact:
  affected_instructions: [{inst_ids}]
  affected_domains: [{domains}]
  action_required: true | false

action_items:
  - role: {role}
    action: "What they need to do"
    deadline: {ISO8601}

context:
  reason: "Why this announcement"
  background: "Additional context"
```

**Example: Critical Path Update**:

```yaml
# Agent_Memory/_communication/broadcast/domain-leads/announcement_20260111_140000.yaml
type: broadcast
from: tech-lead
to: domain-leads
timestamp: 2026-01-11T14:00:00Z
announcement_type: milestone
priority: normal

subject: "Backend ST2 completing today - Frontend can start ST4 tomorrow"

message: |
  CRITICAL PATH UPDATE

  Backend Lead reports ST2 (Auth API endpoints) will complete today EOD.
  This unblocks Frontend ST4 (Login UI integration).

  Frontend Lead: Please confirm your team is ready to start ST4 tomorrow morning.
  Backend Lead: Please prepare handoff package by 5pm today.

impact:
  affected_instructions: [inst_20260110_001]
  affected_domains: [backend, frontend]
  action_required: true

action_items:
  - role: backend-lead
    action: "Prepare handoff package (API docs, Postman collection, staging deploy)"
    deadline: 2026-01-11T17:00:00Z

  - role: frontend-lead
    action: "Confirm team ready to start ST4 on 2026-01-12"
    deadline: 2026-01-11T16:00:00Z

context:
  reason: "Keeping critical path moving, ensuring smooth handoff"
  background: "ST2 was estimated 3-5 days, completing in 3 days (ahead of schedule)"
```

**Example: Priority Change**:

```yaml
# Agent_Memory/_communication/broadcast/all/announcement_20260111_180000.yaml
type: broadcast
from: engineering-manager
to: all
timestamp: 2026-01-11T18:00:00Z
announcement_type: priority_change
priority: critical

subject: "PRIORITY SHIFT: Production incident takes precedence"

message: |
  IMMEDIATE ACTION REQUIRED

  Production incident detected: Checkout flow failing for 30% of users.

  All tier 2+ work is PAUSED until incident resolved.

  Backend team: Join incident response immediately.
  Frontend team: On standby for potential UI fixes.
  All others: Pause current work, standby for updates.

  Tech Lead will coordinate incident response.
  ETA for resolution: 2-4 hours.

impact:
  affected_instructions: [inst_20260110_001, inst_20260110_002, inst_20260109_008]
  affected_domains: [all]
  action_required: true

action_items:
  - role: backend-lead
    action: "Mobilize backend-developer and senior-developer for incident response"
    deadline: immediate

  - role: tech-lead
    action: "Coordinate incident response, provide updates every 30 minutes"
    deadline: immediate

  - role: all_domain_leads
    action: "Pause current instruction work, ensure teams on standby"
    deadline: immediate

context:
  reason: "Revenue-impacting production incident requires all hands"
  severity: critical
  customer_impact: "30% of checkout attempts failing, revenue loss ~$5000/hour"
```

### 3. Handoff Protocol (Cross-Domain Transitions)

**Handoff Package Template**:

```yaml
# Agent_Memory/_communication/handoffs/{from_domain}_to_{to_domain}_{timestamp}.yaml
type: handoff
from_domain: {domain}
from_task: {task_id}
to_domain: {domain}
to_task: {task_id}
timestamp: {ISO8601}
instruction_id: {inst_id}

handoff_summary: |
  Brief description of what's being handed off.

artifacts:
  - name: "Artifact name"
    type: documentation | code | deployment | data | api_contract
    location: "{path or URL}"
    status: complete | in_progress | incomplete
    notes: "Any relevant notes"

  - name: "API Contract Documentation"
    type: documentation
    location: "docs/api/auth.md"
    status: complete
    notes: "Includes all endpoints, request/response schemas, error codes"

  - name: "Deployed to Staging"
    type: deployment
    location: "https://staging.api.example.com"
    status: complete
    notes: "All endpoints functional, rate limiting configured"

handoff_checklist:
  - item: "API documentation complete"
    status: complete
    verified_by: backend-lead

  - item: "Postman collection provided"
    status: complete
    location: "tests/postman/auth_endpoints.json"

  - item: "Staging environment deployed"
    status: complete
    url: "https://staging.api.example.com"

  - item: "Sample requests and responses documented"
    status: complete
    location: "docs/api/auth_examples.md"

  - item: "Error scenarios documented"
    status: complete
    notes: "All error codes and messages documented"

acceptance:
  downstream_lead: {domain-lead}
  acknowledged: false  # Downstream lead sets to true
  acknowledged_at: null
  ready_to_integrate: false  # Downstream lead confirms readiness

  questions_or_concerns: |
    (Downstream lead adds any questions here)

handoff_meeting:
  scheduled: true
  datetime: 2026-01-12T09:00:00Z
  attendees: [backend-lead, frontend-lead, tech-lead]
  agenda:
    - "Review API contract"
    - "Demo endpoints in staging"
    - "Q&A on integration approach"
    - "Discuss error handling"
```

**Handoff Workflow**:

1. **Upstream Prepares**:
   - Domain Lead completes task
   - Prepares handoff package
   - Writes handoff YAML

2. **Notification**:
   - Upstream Domain Lead signals downstream Domain Lead
   - Tech Lead notified of handoff

3. **Review**:
   - Downstream Domain Lead reviews handoff package
   - Asks questions or raises concerns
   - Confirms readiness

4. **Handoff Meeting** (for complex handoffs):
   - Both Domain Leads + Tech Lead meet
   - Demo/walkthrough
   - Q&A
   - Confirm downstream ready to proceed

5. **Acceptance**:
   - Downstream Domain Lead acknowledges
   - Upstream task marked COMPLETED
   - Downstream task moves to IN_PROGRESS

### 4. Standup Protocol (Progress Reports)

**Daily Standup Reports** (hierarchical rollup):

**IC → Domain Lead**:

```yaml
# Agent_Memory/_communication/reports/daily/{ic}_to_{domain-lead}_{date}.yaml
type: progress_report
from: backend-developer
to: backend-lead
date: 2026-01-11
instruction_id: inst_20260110_001

my_tasks:
  - task_id: TT2.1
    status: completed
    progress: 100%
    time_spent: 4h
    notes: "Completed on time, peer review approved, awaiting your review"

  - task_id: TT2.2
    status: in_progress
    progress: 40%
    time_spent: 2h
    estimated_remaining: 2h
    notes: "On track for EOD completion"

blockers: []

help_needed: null

accomplishments:
  - "POST /auth/login endpoint complete with 95% test coverage"
  - "Rate limiting implemented and tested"

next_up:
  - "Complete TT2.2 (logout endpoint) by EOD"
  - "Start TT2.3 tomorrow morning"
```

**Domain Lead → Tech Lead**:

```yaml
# Agent_Memory/_communication/reports/daily/backend-lead_to_tech-lead_20260111.yaml
type: progress_report
from: backend-lead
to: tech-lead
date: 2026-01-11
instruction_id: inst_20260110_001

team_summary:
  total_tactical_tasks: 12
  completed: 3
  in_progress: 4
  under_review: 2
  blocked: 0
  not_started: 3

strategic_progress:
  ST2:
    description: "Implement authentication API endpoints"
    progress: 60%  # 3/5 tactical tasks done
    status: on_track
    estimated_completion: 2026-01-11 EOD
    notes: "Ahead of schedule, should complete today instead of tomorrow"

  ST3:
    description: "JWT middleware for protected routes"
    progress: 0%
    status: pending
    blocked_by: [ST2]
    ready_to_start: 2026-01-12

team_capacity:
  backend-developer:
    utilization: 95%
    current_tasks: [TT2.2, TT2.3_next]
    availability: minimal until TT2.2 done

  senior-developer:
    utilization: 80%
    current_tasks: [TT2.4_complex]
    availability: some capacity

blockers: []

handoffs:
  - to_domain: frontend
    task: ST2
    status: preparing_handoff
    estimated_ready: 2026-01-11 EOD
    notes: "Will have handoff package ready by 5pm"

accomplishments:
  - "TT2.1 (login endpoint) completed and approved"
  - "TT2.2 (logout endpoint) 40% complete"
  - "API documentation updated"

risks:
  - risk: "None currently"

next_steps:
  - "Complete ST2 by EOD today"
  - "Prepare handoff package for Frontend"
  - "Start ST3 tomorrow with senior-developer"
```

**Tech Lead → Engineering Manager**:

```yaml
# Agent_Memory/_communication/reports/weekly/tech-lead_to_em_week_02.yaml
type: progress_report
from: tech-lead
to: engineering-manager
week: 2026_week_02
instructions: [inst_20260110_001, inst_20260110_002]

executive_summary: |
  Week 2 (Jan 8-11) was highly productive. inst_001 (auth system) is ahead
  of schedule (65% complete, projected finish Jan 15 vs original Jan 20).

  inst_002 (performance optimization) on track, 40% complete.

  No major blockers. Team morale high.

instruction_progress:
  inst_20260110_001:
    objective: "Implement authentication system with OAuth2 and JWT"
    tier: 3
    progress: 65%
    status: on_track
    estimated_completion: 2026-01-15  # Ahead by 5 days
    domains_involved:
      backend: 70% complete
      frontend: 50% complete
      qa: 30% complete (planning done, execution starting)
      data: 100% complete (schema done)
      security: 0% (scheduled for next week)

    milestones_this_week:
      - "Data schema design complete (ST1) ✓"
      - "Backend API endpoints 60% complete (ST2)"
      - "Frontend started login UI (ST4)"

    risks: low

  inst_20260110_002:
    objective: "Optimize API performance to sub-100ms p95 latency"
    tier: 3
    progress: 40%
    status: on_track
    estimated_completion: 2026-01-18
    note: "Profiling identified key bottlenecks, optimization in progress"

capacity_overview:
  total_capacity: 40h/day  # 5 domains × ~2 ICs each
  utilized_capacity: 36h/day  # 90% utilization
  available_capacity: 4h/day

  domain_breakdown:
    backend: 100% (fully allocated to inst_001, inst_002)
    frontend: 85% (mostly inst_001)
    qa: 70% (ramping up on inst_001 testing)
    devops: 50% (inst_002 infrastructure changes)
    data: 60% (inst_001 complete, working on inst_002)
    security: 40% (scheduled for inst_001 next week)

critical_path_status:
  inst_001: [ST1✓, ST2_in_progress, ST3_pending, ST5_pending, ST7_pending]
  slack: +5_days  # Ahead of schedule
  next_critical: "ST2 must complete by EOD today to maintain lead"

blockers: none

escalations_this_week: 0

team_highlights:
  - "Backend team completed auth API ahead of schedule"
  - "Frontend team proactive on API integration planning"
  - "No production incidents this week"
  - "Team velocity improving (tasks completed 10% faster than estimates)"

next_week_focus:
  - "Complete inst_001 backend and frontend work"
  - "Security review for inst_001"
  - "QA comprehensive testing for inst_001"
  - "Continue inst_002 performance optimization"

risks_and_concerns:
  - "Security review for inst_001 scheduled for next week - need security-specialist availability"
  - "If inst_001 continues ahead of schedule, may complete Jan 15, freeing up capacity"
```

---

(Continuing in next message due to length...)
