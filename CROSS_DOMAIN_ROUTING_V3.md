# Cross-Domain Task Routing Protocol
## V3 Multi-Domain Collaboration Architecture

This document defines how cAgents domains collaborate seamlessly through cross-domain task routing.

---

## Overview

**Cross-domain routing** enables any domain to delegate tasks to specialists in other domains, creating a truly universal multi-domain agent system.

### Key Benefits

1. **Specialization**: Each domain focuses on its expertise
2. **Reusability**: Avoid duplicating agents across domains
3. **Orchestration**: Complex tasks span multiple domains naturally
4. **Scalability**: Add new domains without duplicating infrastructure

### Example Flow

```
Business Domain Request: "Automate invoice approval process"
  ↓
Business agents define requirements
  ↓
Cross-domain delegation → Software Domain
  ↓
Software agents build automation
  ↓
Results aggregated back to Business Domain
  ↓
Complete solution delivered
```

---

## Architecture

### Core Components

1. **Trigger Agent** (Core) - Universal entry point and domain router
2. **Universal-Executor** (Core) - Detects and handles cross-domain tasks
3. **Domain Configs** - Define cross-domain routing patterns
4. **Agent Memory** - Maintains parent-child workflow relationships

### Workflow Hierarchy

```
Parent Workflow (Domain A)
  ├── Local Task 1 (Domain A agent)
  ├── Local Task 2 (Domain A agent)
  ├── Cross-Domain Task → Child Workflow (Domain B)
  │   ├── Domain B Task 1
  │   └── Domain B Task 2
  └── Local Task 3 (Domain A agent)
```

---

## Cross-Domain Routing Patterns

### Pattern 1: Business → Software (Automation)

**Trigger**: Business process automation needs

**Example**:
```yaml
parent_domain: business
parent_request: "Automate employee onboarding process"

business_tasks:
  - task: "Define onboarding requirements"
    agent: business-analyst
    output: requirements_spec.yaml

  - task: "Design onboarding workflow"
    agent: operations-manager
    output: process_flow.md

  - task: "Build onboarding automation API"
    cross_domain: true
    target_domain: software
    delegation:
      request: "Build employee onboarding automation API"
      context:
        - requirements: requirements_spec.yaml
        - process: process_flow.md
        - integration: "/api/hr/employees"
      expected_deliverables:
        - REST API endpoints
        - Admin dashboard
        - Email notification service

  - task: "Deploy and validate automation"
    agent: operations-manager
    depends_on: [software_child_workflow]
```

**Implementation**:
```markdown
# In business/agents/operations-manager.md

When task requires software development:

Task(
  subagent_type: "trigger",
  prompt: |
    Parent instruction: {current_instruction_id}
    Target domain: software

    Build employee onboarding automation API

    Requirements from business domain:
    - Workflow stages: {read from requirements_spec.yaml}
    - Data integration: POST /api/hr/employees
    - Notifications: Email at each stage
    - Admin UI: Approve/reject interface

    Technical constraints:
    - Authentication: OAuth2 (existing system)
    - Database: PostgreSQL
    - Deployment: Docker containers

    Expected deliverables:
    - OpenAPI spec for endpoints
    - Admin dashboard (React)
    - Notification service
    - Integration tests
)
```

---

### Pattern 2: Sales → Marketing (Campaign Assets)

**Trigger**: Sales needs marketing campaign support

**Example**:
```yaml
parent_domain: sales
parent_request: "Create enterprise sales campaign for Q1"

sales_tasks:
  - task: "Define target personas and messaging"
    agent: sales-strategist
    output: target_personas.yaml

  - task: "Create campaign strategy and channels"
    cross_domain: true
    target_domain: marketing
    delegation:
      request: "Design demand generation campaign for enterprise buyers"
      context:
        - personas: target_personas.yaml
        - deal_size: "$100K+ ARR"
        - sales_cycle: "6-9 months"
        - decision_makers: "VP+ level"
      expected_deliverables:
        - Campaign plan
        - Channel strategy
        - Content calendar
        - Lead nurture sequences

  - task: "Create sales enablement playbook"
    agent: sales-enablement-specialist
    depends_on: [marketing_child_workflow]
```

---

### Pattern 3: Marketing → Creative (Content Creation)

**Trigger**: Marketing needs creative content

**Example**:
```yaml
parent_domain: marketing
parent_request: "Launch product announcement campaign"

marketing_tasks:
  - task: "Define campaign positioning and messaging"
    agent: marketing-strategist
    output: messaging_framework.yaml

  - task: "Write launch announcement and email sequence"
    cross_domain: true
    target_domain: creative
    delegation:
      request: "Write product launch announcement and 5-email nurture sequence"
      context:
        - product: "AI-powered analytics platform"
        - positioning: messaging_framework.yaml
        - tone: "Professional, innovative, data-driven"
        - audience: "Data analysts and engineering leaders"
        - word_count: "500-word announcement, 200-word emails"
      expected_deliverables:
        - Launch announcement (blog post)
        - Email sequence (5 emails)
        - Social media copy
        - Landing page copy

  - task: "Execute multi-channel campaign"
    agent: demand-generation-manager
    depends_on: [creative_child_workflow]
```

---

### Pattern 4: Any Domain → Finance (Financial Analysis)

**Trigger**: ROI, budget, or financial modeling needed

**Example**:
```yaml
parent_domain: business
parent_request: "Evaluate ROI for CRM system implementation"

business_tasks:
  - task: "Document current process and pain points"
    agent: business-analyst
    output: current_state_analysis.yaml

  - task: "Calculate financial impact and ROI"
    cross_domain: true
    target_domain: finance
    delegation:
      request: "Build ROI model for CRM implementation"
      context:
        - current_cost: "10 sales ops staff @ $60k/year = $600k"
        - crm_cost: "$150k implementation + $50k/year"
        - expected_efficiency: "30% time savings"
        - timeframe: "3-year analysis"
      expected_deliverables:
        - ROI calculation
        - NPV analysis
        - Payback period
        - Sensitivity analysis

  - task: "Present business case to leadership"
    agent: operations-manager
    depends_on: [finance_child_workflow]
```

---

### Pattern 5: Software → Planning (Roadmap Creation)

**Trigger**: Need strategic technical roadmap

**Example**:
```yaml
parent_domain: software
parent_request: "Migrate monolith to microservices"

software_tasks:
  - task: "Design microservices architecture"
    agent: architect
    output: architecture_spec.yaml

  - task: "Create multi-quarter migration roadmap"
    cross_domain: true
    target_domain: planning
    delegation:
      request: "Create 18-month microservices migration roadmap"
      context:
        - architecture: architecture_spec.yaml
        - team_size: "12 engineers"
        - services: "15 microservices identified"
        - risk_tolerance: "Low - can't disrupt production"
      expected_deliverables:
        - Phased migration roadmap
        - Resource allocation plan
        - Risk mitigation strategy
        - Success metrics

  - task: "Execute phase 1 migration"
    agent: tech-lead
    depends_on: [planning_child_workflow]
```

---

### Pattern 6: Multi-Domain Orchestration

**Complex workflows spanning 3+ domains**

**Example**: Complete product launch

```yaml
parent_domain: planning
parent_request: "Launch new AI analytics product - end-to-end"

planning_tasks:
  - task: "Create go-to-market roadmap"
    agent: strategic-planner
    output: gtm_roadmap.yaml

  # Software: Build the product
  - task: "Develop product features and infrastructure"
    cross_domain: true
    target_domain: software
    child_workflow_id: "sw_001"

  # Marketing: Create launch campaign
  - task: "Design launch campaign and positioning"
    cross_domain: true
    target_domain: marketing
    child_workflow_id: "mkt_001"

  # Sales: Prepare sales organization
  - task: "Build sales strategy and enablement"
    cross_domain: true
    target_domain: sales
    child_workflow_id: "sales_001"

  # Operations: Set up fulfillment
  - task: "Establish operations and support"
    cross_domain: true
    target_domain: operations
    child_workflow_id: "ops_001"

  # Finance: Create financial projections
  - task: "Build revenue model and projections"
    cross_domain: true
    target_domain: finance
    child_workflow_id: "fin_001"

  - task: "Coordinate launch execution across all domains"
    agent: strategic-planner
    depends_on: [sw_001, mkt_001, sales_001, ops_001, fin_001]
```

**Multi-domain workflow tree**:
```
Planning Domain (Product Launch)
  ├── Software Domain (Product Development)
  │   ├── Core features
  │   ├── Infrastructure
  │   └── QA testing
  ├── Marketing Domain (Launch Campaign)
  │   ├── Creative Domain (Content) ← Nested delegation
  │   ├── Demand generation
  │   └── PR strategy
  ├── Sales Domain (Sales Enablement)
  │   ├── Sales playbook
  │   ├── Pricing model
  │   └── Training materials
  ├── Operations Domain (Fulfillment)
  │   ├── Support processes
  │   ├── Onboarding workflows
  │   └── Infrastructure
  └── Finance Domain (Financial Modeling)
      ├── Revenue projections
      ├── Cost models
      └── ROI analysis
```

---

## Implementation Guide

### For Domain Team Agents

**Step 1: Detect Cross-Domain Need**

In your agent's decision logic:

```markdown
## Cross-Domain Collaboration

When task requires capabilities outside {domain} domain:

**Software development** → Target: software domain
**Marketing campaigns** → Target: marketing domain
**Creative content** → Target: creative domain
**Financial analysis** → Target: finance domain
**Strategic planning** → Target: planning domain
**Sales strategy** → Target: sales domain
**HR/talent** → Target: hr domain
**Legal review** → Target: legal domain
```

**Step 2: Prepare Context**

Gather all necessary information for the target domain:

```yaml
context_package:
  requirements:
    - Business requirements document
    - User stories or use cases
    - Success criteria

  constraints:
    - Technical constraints
    - Budget limits
    - Timeline requirements

  integration_points:
    - APIs to integrate with
    - Data formats
    - Authentication methods

  stakeholders:
    - Who to update
    - Approval requirements
```

**Step 3: Invoke Trigger**

Use the Task tool to create child workflow:

```python
Task(
  subagent_type="trigger",
  prompt=f"""
    Parent instruction: {current_instruction_id}
    Parent domain: {current_domain}
    Target domain: {target_domain}

    Request: {specific_request}

    Context from {current_domain} domain:
    {context_details}

    Expected deliverables:
    {list_of_deliverables}

    Integration requirements:
    {integration_specs}
  """
)
```

**Step 4: Monitor and Integrate**

```markdown
1. Track child workflow status in Agent_Memory/{child_instruction_id}/status.yaml
2. When child completes, read outputs from outputs/final/
3. Integrate child deliverables into parent workflow
4. Update parent status and communicate results
```

---

## Universal-Executor Cross-Domain Detection

**Enhanced universal-executor.md logic**:

```markdown
## Cross-Domain Task Detection

Before executing each task:

### Step 1: Check Agent Availability
```python
task_agent = task['assigned_agent']
current_domain = read_from_status('domain')

# Check if agent exists in current domain registry
agent_exists = check_registry(current_domain, task_agent)

if not agent_exists:
  # Check if agent exists in other domains
  agent_domain = find_agent_domain(task_agent)

  if agent_domain and agent_domain != current_domain:
    # This is a cross-domain task
    handle_cross_domain_delegation(task, agent_domain)
```

### Step 2: Detect Cross-Domain Keywords

Even if agent exists locally, check for cross-domain indicators:

```python
cross_domain_keywords = {
  'software': ['build', 'api', 'automate', 'develop', 'code'],
  'finance': ['roi', 'budget', 'revenue', 'cost', 'financial'],
  'marketing': ['campaign', 'launch', 'brand', 'awareness'],
  'creative': ['write', 'copy', 'story', 'content', 'narrative'],
  'hr': ['hire', 'recruit', 'talent', 'workforce'],
  'legal': ['contract', 'compliance', 'legal', 'regulatory']
}

for domain, keywords in cross_domain_keywords.items():
  if any(keyword in task['description'].lower() for keyword in keywords):
    if domain != current_domain:
      # Suggest cross-domain delegation
      consider_cross_domain_delegation(task, domain)
```

### Step 3: Execute Cross-Domain Delegation

```python
def handle_cross_domain_delegation(task, target_domain):
  # Create child workflow in target domain
  child_instruction_id = invoke_trigger(
    target_domain=target_domain,
    parent_id=current_instruction_id,
    request=task['description'],
    context=gather_context_for_domain(task, target_domain)
  )

  # Track relationship
  update_parent_workflow(
    child_workflow=child_instruction_id,
    task_id=task['id']
  )

  # Wait for completion or continue async
  if task.get('blocking', True):
    wait_for_child_completion(child_instruction_id)
    integrate_child_results(task, child_instruction_id)
```
```

---

## Agent Memory Structure for Cross-Domain

### Parent Workflow Memory

```
Agent_Memory/{parent_instruction_id}/
  ├── instruction.yaml
  │   domain: business
  │   request: "Automate invoice approval"
  │
  ├── workflow/
  │   ├── plan.yaml
  │   └── cross_domain/
  │       └── delegations.yaml  # Tracks child workflows
  │           - child_id: inst_20260110_002
  │             target_domain: software
  │             status: in_progress
  │             task_id: task_003
  │
  └── outputs/
      └── aggregated/  # Combined outputs from all domains
          ├── business_requirements.yaml
          └── software_deliverables/  # From child workflow
```

### Child Workflow Memory

```
Agent_Memory/{child_instruction_id}/
  ├── instruction.yaml
  │   domain: software
  │   parent_id: inst_20260110_001
  │   parent_domain: business
  │   request: "Build invoice automation API"
  │
  ├── workflow/
  │   ├── plan.yaml
  │   └── parent_context/  # Context from parent
  │       ├── requirements_spec.yaml
  │       └── business_context.md
  │
  └── outputs/
      └── final/
          ├── api_specification.yaml
          ├── implementation/
          └── tests/
```

### Cross-Domain Delegation Registry

```yaml
# Agent_Memory/_system/cross_domain_delegations.yaml

active_delegations:
  - parent_id: inst_20260110_001
    parent_domain: business
    child_id: inst_20260110_002
    child_domain: software
    created: 2026-01-10T10:00:00Z
    status: in_progress
    task: "Build invoice automation API"

  - parent_id: inst_20260110_003
    parent_domain: sales
    child_id: inst_20260110_004
    child_domain: marketing
    created: 2026-01-10T11:00:00Z
    status: completed
    task: "Design enterprise email campaign"

completed_delegations:
  - parent_id: inst_20260109_015
    child_id: inst_20260109_018
    completed: 2026-01-09T18:30:00Z
    duration: 4.5h
```

---

## Cross-Domain Routing Configuration

### Domain Routing Rules

**File**: `Agent_Memory/_system/domains/cross_domain_routing.yaml`

```yaml
# Cross-Domain Routing Configuration
# Defines when domains should delegate to other domains

routing_rules:
  business:
    delegates_to:
      software:
        triggers: [automate, api, build, integrate, dashboard]
        agents: [tech-lead, architect, backend-developer, frontend-developer]
        examples:
          - "Automate approval workflow"
          - "Build reporting dashboard"
          - "Integrate with CRM"

      finance:
        triggers: [roi, budget, cost, revenue, forecast]
        agents: [financial-analyst, fp-and-a-manager, budget-analyst]
        examples:
          - "Calculate ROI for new system"
          - "Create budget forecast"

      hr:
        triggers: [hire, recruit, workforce, talent, onboarding]
        agents: [talent-acquisition-manager, hr-business-partner]
        examples:
          - "Create hiring plan for expansion"
          - "Design onboarding program"

  sales:
    delegates_to:
      marketing:
        triggers: [campaign, lead, nurture, content, brand]
        agents: [demand-generation-manager, content-marketing-manager]
        examples:
          - "Create lead nurture campaign"
          - "Design brand messaging"

      finance:
        triggers: [forecast, quota, commission, revenue]
        agents: [fp-and-a-manager, revenue-recognition-specialist]
        examples:
          - "Create revenue forecast"
          - "Model commission structure"

      creative:
        triggers: [write, copy, story, pitch, proposal]
        agents: [copywriter, creative-director]
        examples:
          - "Write sales pitch deck"
          - "Create proposal template"

  marketing:
    delegates_to:
      creative:
        triggers: [write, design, story, narrative, visual]
        agents: [copywriter, creative-director, prose-stylist]
        examples:
          - "Write email sequence"
          - "Create campaign narrative"

      software:
        triggers: [website, landing, analytics, tracking]
        agents: [frontend-developer, data-analyst]
        examples:
          - "Build landing page"
          - "Implement analytics tracking"

  software:
    delegates_to:
      planning:
        triggers: [roadmap, strategy, long-term, initiative]
        agents: [strategic-planner, roadmap-planner]
        examples:
          - "Create multi-year tech roadmap"
          - "Plan platform modernization initiative"

      security:
        triggers: [penetration, audit, vulnerability, threat]
        agents: [security-analyst, security-specialist]
        examples:
          - "Conduct security audit"
          - "Threat modeling for new feature"
```

---

## Error Handling & Edge Cases

### Circular Dependencies

**Problem**: Domain A delegates to Domain B, which tries to delegate back to Domain A

**Detection**:
```python
def check_circular_delegation(parent_id, target_domain):
  # Walk up parent chain
  current = parent_id
  visited_domains = set()

  while current:
    parent_info = read_instruction(current)
    parent_domain = parent_info['domain']

    if parent_domain in visited_domains:
      raise CircularDelegationError(
        f"Circular delegation detected: {visited_domains} → {target_domain}"
      )

    visited_domains.add(parent_domain)
    current = parent_info.get('parent_id')

  # Check if target_domain would create cycle
  if target_domain in visited_domains:
    raise CircularDelegationError(
      f"Target domain {target_domain} already in parent chain"
    )
```

**Mitigation**: Max workflow depth of 5 levels (enforced by trigger agent)

---

### Domain Not Available

**Problem**: Target domain not installed

**Detection**:
```python
available_domains = list_installed_domains()

if target_domain not in available_domains:
  raise DomainNotAvailableError(
    f"Domain '{target_domain}' not installed. Available: {available_domains}"
  )
```

**Fallback**:
1. Check for shared agents that cover the capability
2. Escalate to HITL with suggestion to install domain
3. Attempt with general-purpose agents if possible

---

### Context Loss

**Problem**: Critical context not passed to child workflow

**Prevention**:
```python
required_context_fields = [
  'request',  # What needs to be done
  'constraints',  # Technical/business constraints
  'integration_points',  # How to integrate results
  'success_criteria'  # How to validate success
]

for field in required_context_fields:
  if field not in delegation_context:
    raise IncompleteContextError(f"Missing required field: {field}")
```

---

### Result Integration Failure

**Problem**: Child workflow completes but parent can't use results

**Solution**: Standardized output contracts

```yaml
# Each domain defines output contracts
output_contracts:
  software_to_business:
    api_endpoint:
      format: openapi_spec
      location: outputs/final/api_spec.yaml
      documentation: outputs/final/README.md

    dashboard:
      format: url
      location: outputs/final/deployment.yaml
      credentials: outputs/final/access.yaml

  finance_to_business:
    roi_analysis:
      format: structured_yaml
      location: outputs/final/roi_analysis.yaml
      charts: outputs/final/visualizations/

  creative_to_marketing:
    copy:
      format: markdown
      location: outputs/final/content/
      word_count: metadata in frontmatter
```

---

## Best Practices

### 1. Clear Context Handoff

**Good** ✅:
```
Build employee onboarding API

Business requirements:
- 5-stage workflow (detailed in workflow.yaml)
- Email notifications at each transition
- Admin approval UI
- Integration: POST /api/hr/employees (auth: OAuth2)

Success criteria:
- OpenAPI spec validates
- All 5 stages functional
- Email sends verified
- Admin UI deployed
```

**Bad** ❌:
```
Build the onboarding thing. You know what I mean.
```

### 2. Explicit Deliverables

**Good** ✅:
```
Expected deliverables:
1. OpenAPI specification (outputs/final/api_spec.yaml)
2. Source code (outputs/final/src/)
3. Tests with 80%+ coverage (outputs/final/tests/)
4. Deployment guide (outputs/final/DEPLOY.md)
5. Admin UI URL (outputs/final/deployment.yaml)
```

**Bad** ❌:
```
Build it and deploy it.
```

### 3. Domain-Appropriate Delegation

**Good** ✅:
- Software → Planning (strategic roadmap)
- Business → Finance (ROI analysis)
- Sales → Marketing (campaign strategy)

**Bad** ❌:
- Creative → Finance (financial modeling)
- HR → Software (API development)
- Sales → Legal (contract drafting) ← Should go Sales → Business → Legal

### 4. Minimize Cross-Domain Hops

**Good** ✅:
```
Business (parent)
  ├── Software (child) - direct delegation
  └── Finance (child) - direct delegation
```

**Bad** ❌:
```
Business (parent)
  └── Planning (child)
      └── Software (grandchild)
          └── DevOps (great-grandchild)  ← Too deep!
```

**Better**: Business delegates directly to Software, Software handles internal DevOps

---

## Monitoring & Debugging

### Cross-Domain Delegation Logs

```yaml
# Agent_Memory/_system/logs/cross_domain.log

2026-01-10T10:00:00Z [INFO] Cross-domain delegation initiated
  parent: inst_20260110_001 (business)
  child: inst_20260110_002 (software)
  task: "Build invoice automation API"

2026-01-10T10:02:15Z [INFO] Child workflow started
  instruction_id: inst_20260110_002
  domain: software
  router: tier 3 (complex)

2026-01-10T12:45:30Z [INFO] Child workflow completed
  instruction_id: inst_20260110_002
  duration: 2h 43m
  status: PASS
  deliverables: 5 items

2026-01-10T12:46:00Z [INFO] Results integrated to parent
  parent: inst_20260110_001
  integration: SUCCESS
```

### Debugging Commands

```bash
# List all active cross-domain delegations
cat Agent_Memory/_system/cross_domain_delegations.yaml | grep "status: in_progress"

# Find parent-child relationships
grep -r "parent_id:" Agent_Memory/*/instruction.yaml

# Track specific delegation
tail -f Agent_Memory/_system/logs/cross_domain.log | grep "inst_20260110_002"
```

---

## Success Metrics

### Measure Cross-Domain Effectiveness

```yaml
metrics:
  delegation_success_rate:
    target: 95%
    measure: (completed / total) cross-domain delegations

  average_delegation_duration:
    target: "<= 3 hours"
    measure: time from child creation to result integration

  context_completeness:
    target: 90%
    measure: child workflows with all required context fields

  integration_failures:
    target: "< 5%"
    measure: child workflows that complete but fail integration
```

---

**Status**: Cross-Domain Routing Protocol Complete
**Version**: 3.0
**Enables**: True multi-domain collaboration
**Impact**: Eliminates need for duplicate agents, enables complex multi-domain workflows
