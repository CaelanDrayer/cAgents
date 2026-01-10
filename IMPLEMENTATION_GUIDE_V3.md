# cAgents V3 Implementation Guide
## Step-by-Step Consolidation Instructions

This guide provides concrete implementation steps for the V3 consolidation plan.

---

## Phase 1: Remove Deprecated Workflow Agents

### Step 1.1: Identify Files to Remove

**Command to list deprecated agents**:
```bash
find . -path "*/agents/router.md" \
    -o -path "*/agents/planner.md" \
    -o -path "*/agents/executor.md" \
    -o -path "*/agents/validator.md" \
    -o -path "*/agents/self-correct.md" | grep -v "^./core"
```

**Expected output** (55 files):
```
./software/agents/router.md
./software/agents/planner.md
./software/agents/executor.md
./software/agents/validator.md
./software/agents/self-correct.md
./business/agents/router.md
... (same for all 11 domains)
```

### Step 1.2: Update Plugin Manifest

**Before** (`.claude-plugin/plugin.json`):
```json
{
  "agents": [
    "./core/agents/trigger.md",
    "./core/agents/universal-router.md",
    "./software/agents/router.md",        ← Remove
    "./software/agents/planner.md",       ← Remove
    ...
  ]
}
```

**After**:
```json
{
  "agents": [
    "./core/agents/trigger.md",
    "./core/agents/universal-router.md",
    "./software/agents/tech-lead.md",     ← Keep team agents only
    "./software/agents/architect.md",
    ...
  ]
}
```

### Step 1.3: Remove Files

```bash
# Backup first
git checkout -b v3-consolidation

# Remove deprecated workflow agents from all domains
for domain in software business creative planning sales marketing finance operations hr legal support; do
  rm -f ./$domain/agents/router.md
  rm -f ./$domain/agents/planner.md
  rm -f ./$domain/agents/executor.md
  rm -f ./$domain/agents/validator.md
  rm -f ./$domain/agents/self-correct.md
done

# Verify removal
find . -path "*/agents/*" -name "router.md" -o -name "planner.md" -o -name "executor.md" -o -name "validator.md" -o -name "self-correct.md" | grep -v "^./core"
# Should return empty (only core/ universal agents remain)
```

### Step 1.4: Update Documentation

Update `CLAUDE.md`:

**Before**:
```markdown
**Workflow**: Handled by universal workflow agents + software domain configs

_Note: Domain-specific workflow agents (router.md, planner.md, executor.md, validator.md, self-correct.md) are deprecated in V2._
```

**After**:
```markdown
**Workflow**: Handled by universal workflow agents + software domain configs

All workflow logic is provided by the 5 universal agents in `core/agents/`:
- universal-router, universal-planner, universal-executor, universal-validator, universal-self-correct

Domain-specific workflow agents have been removed in V3.
```

---

## Phase 2: Agent File Optimization

### Step 2.1: Create Optimized Agent Template

**File**: `core/templates/optimized-agent-template.md`

```markdown
---
name: agent-name
role: One-line role description
domain: software|business|creative|etc
tier_access: [1, 2, 3, 4]  # Which complexity tiers can use this agent
capabilities: [cap1, cap2, cap3, cap4]  # Max 8 semantic capabilities
specialties: [specialty1, specialty2, specialty3]  # Max 5 specialties
model: sonnet|opus|haiku
---

**{Agent Name}** - {Concise 1-sentence description}

## Core Responsibilities
- {Primary responsibility 1}
- {Primary responsibility 2}
- {Primary responsibility 3}
- {Primary responsibility 4}

## Collaboration
- **Consult**: {Agents to consult before major decisions}
- **Delegate**: {Agents to delegate work to}
- **Escalate**: {Agents to escalate blockers to}

## Decision Authority
- {What this agent can decide autonomously}
- {What requires consultation}
- {What requires escalation}

## Domain-Specific Notes (if applicable)
{Any unique considerations for this agent's domain}
```

### Step 2.2: Optimize High-Impact Agents

**Example - tech-lead.md optimization**

**Before** (500+ lines):
```markdown
---
name: tech-lead
description: Engineering leader for delivery, team coordination, and strategic decisions...
model: opus
color: bright_magenta
capabilities:
  - delivery_leadership
  - sprint_planning
  - milestone_definition
  - resource_allocation
  - team_coordination
  [... 30+ more capabilities]
tools: Read, Grep, Glob, Write, Bash, TodoWrite
---

# Tech Lead Agent

You are an experienced engineering leader focused on delivery, team effectiveness...

## Purpose
[500 words of general engineering leadership advice]

## Capabilities
### Delivery Leadership & Execution
- Strategic task allocation across specialized team members
[... 2000+ words detailing every capability]

## Collaboration Protocols
[... 1500+ words of generic collaboration advice]

## Memory Ownership
[... 500+ words about Agent_Memory structure]
```

**After** (150 lines):
```markdown
---
name: tech-lead
role: Engineering leader for delivery and coordination
domain: software
tier_access: [2, 3, 4]
capabilities: [delivery, coordination, decisions, escalation]
specialties: [orchestration, delegation, priority_management, risk_assessment]
model: opus
---

**Tech Lead** - Orchestrates delivery across frontend, backend, and DevOps teams. Makes priority and scope decisions. Resolves blockers.

## Core Responsibilities
- Coordinate multi-agent workflows with clear delegation and acceptance criteria
- Make priority decisions balancing business value, risk, and technical debt
- Resolve blockers through negotiation, escalation, or creative solutions
- Ensure delivery quality through review oversight and testing strategy

## Collaboration
- **Consult**: architect (design decisions), security-lead (risk), qa-lead (quality gates)
- **Delegate**: frontend-lead, backend-lead, devops-lead, senior-developer
- **Escalate**: vp-engineering (resource constraints), cto (strategic direction)

## Decision Authority
- ✅ **Autonomous**: Task prioritization, agent assignments, tier 2-3 scope adjustments
- 🤝 **Consult**: Technical approach (architect), security exceptions (security-lead)
- ⬆️ **Escalate**: Resource additions, tier changes, external dependencies

## Workflow Integration
Read plan from `Agent_Memory/{instruction_id}/workflow/plan.yaml`, delegate tasks to specialists, monitor progress in `tasks/`, escalate blockers to `decisions/escalations.yaml`.
```

**Key reductions**:
- Frontmatter: 15 lines → 8 lines
- Total length: 500+ lines → 150 lines
- Removed: Generic advice, redundant capability descriptions, verbose protocols
- Retained: Unique responsibilities, specific collaboration patterns, decision authority

### Step 2.3: Batch Optimization Script

Create `scripts/optimize_agents.sh`:

```bash
#!/bin/bash

# Optimize all agents in a domain
DOMAIN=$1

if [ -z "$DOMAIN" ]; then
  echo "Usage: ./optimize_agents.sh <domain>"
  exit 1
fi

AGENT_DIR="./$DOMAIN/agents"

for agent in $AGENT_DIR/*.md; do
  echo "Optimizing $agent..."

  # Extract name and basic info
  name=$(grep "^name:" $agent | cut -d' ' -f2)

  # This is a template - actual optimization requires manual review
  # to preserve unique agent logic while removing boilerplate

  echo "  - Agent: $name"
  echo "  - Current size: $(wc -l < $agent) lines"

  # TODO: Implement automated optimization
  # - Extract frontmatter
  # - Compress capabilities list
  # - Remove generic sections
  # - Preserve unique logic
done
```

---

## Phase 3: Cross-Domain Agent Consolidation

### Step 3.1: Identify Duplicate Agents

**Analysis script** (`scripts/find_duplicates.sh`):

```bash
#!/bin/bash

# Find agents with same name across domains
echo "=== Duplicate Agent Names Across Domains ==="
find . -path "*/agents/*.md" -type f | xargs basename -a | sort | uniq -d

echo ""
echo "=== Agents by name ==="
for agent in $(find . -path "*/agents/*.md" | xargs basename -a | sort | uniq); do
  echo ""
  echo "Agent: $agent"
  find . -path "*/agents/$agent" -type f | sed 's|^\./||'
done
```

**Expected output**:
```
=== Duplicate Agent Names Across Domains ===
account-manager.md
business-analyst.md
customer-success-manager.md
operations-manager.md
project-manager.md
program-manager.md
risk-manager.md
sales-operations-manager.md

=== Agents by name ===

Agent: account-manager.md
business/agents/account-manager.md
sales/agents/account-manager.md
support/agents/account-manager.md

Agent: project-manager.md
business/agents/project-manager.md
planning/agents/project-manager.md
operations/agents/project-manager.md
```

### Step 3.2: Create Shared Agent Pool

**Directory structure**:
```
core/
  agents/
    shared/
      project-manager.md
      customer-success-manager.md
      account-manager.md
      operations-manager.md
      sales-operations-manager.md
      business-analyst.md
      risk-manager.md
      compliance-manager.md
```

### Step 3.3: Implement Domain-Aware Shared Agent

**Example**: `core/agents/shared/project-manager.md`

```markdown
---
name: project-manager
role: Project planning and execution specialist
domains: [business, planning, operations, software]
tier_access: [2, 3, 4]
capabilities: [planning, execution, timeline_management, stakeholder_communication]
specialties: [scope_definition, risk_management, resource_allocation]
model: sonnet
---

**Project Manager** - Plans scope, timelines, and resources. Tracks progress and manages stakeholder communication.

## Core Responsibilities
- Define project scope, deliverables, and acceptance criteria
- Create realistic timelines with risk buffers
- Allocate resources and track progress
- Communicate status to stakeholders

## Domain Adaptations

### When working in **business** domain:
**Focus**: Process improvement projects, operational efficiency initiatives
**Collaborate with**: operations-manager, process-improvement-specialist, change-manager
**Deliverables**: Project charters, process documentation, ROI analysis
**Example**: "Streamline invoice approval process - reduce cycle time by 40%"

### When working in **planning** domain:
**Focus**: Strategic initiatives, portfolio-level programs
**Collaborate with**: strategic-planner, program-manager, portfolio-manager
**Deliverables**: Strategic roadmaps, initiative charters, dependency maps
**Example**: "Launch new product line - Q3 market entry"

### When working in **operations** domain:
**Focus**: Operational projects, capacity expansion, supply chain optimization
**Collaborate with**: operations-strategist, supply-chain-manager, logistics-coordinator
**Deliverables**: Operational playbooks, capacity plans, vendor contracts
**Example**: "Expand warehouse capacity by 50% in 6 months"

### When working in **software** domain:
**Focus**: Feature delivery, sprint planning, technical initiatives
**Collaborate with**: tech-lead, product-owner, scrum-master
**Deliverables**: Sprint plans, feature specs, release notes
**Example**: "Implement OAuth2 authentication across all services"

## Collaboration
- **Consult**: Domain lead (strategy), stakeholder-rep (requirements)
- **Delegate**: Domain specialists (execution), analyst (data gathering)
- **Escalate**: Domain executive (budget, resources), change-manager (resistance)

## Decision Authority
- ✅ Timeline adjustments within 10% of original estimate
- ✅ Task reordering within sprint/phase
- 🤝 Scope changes (requires stakeholder approval)
- ⬆️ Budget overruns, resource additions

## Cross-Domain Example

**Scenario**: Business domain requests software automation

```yaml
instruction:
  domain: business
  request: "Automate employee onboarding process"

project_manager_actions:
  1. Define business requirements with business-analyst
  2. Create child workflow for software domain:
     - Use Task(trigger) with domain="software"
     - Request: "Build employee onboarding API and dashboard"
     - Context: Business process requirements, integration points
  3. Coordinate between business and software teams
  4. Aggregate deliverables from both domains
  5. Validate end-to-end solution
```

## Memory Integration
- Project plan: `workflow/project_plan.yaml`
- Status updates: `outputs/status_reports/`
- Stakeholder comms: `_communication/stakeholder/`
```

### Step 3.4: Update Domain Configs

**Update planner configs to reference shared agents**:

`Agent_Memory/_system/domains/business/planner_config.yaml`:
```yaml
available_agents:
  executives:
    - name: cso
      path: ./business/agents/cso.md

  shared:  # NEW - Reference shared agents
    - name: project-manager
      path: ./core/agents/shared/project-manager.md
      domains: [business, planning, operations]
    - name: business-analyst
      path: ./core/agents/shared/business-analyst.md
      domains: [business, planning, software]

  specialists:
    - name: operations-manager
      path: ./business/agents/operations-manager.md
```

### Step 3.5: Remove Duplicates, Update Manifests

```bash
# Remove duplicate project-manager from domains
rm ./business/agents/project-manager.md
rm ./planning/agents/project-manager.md
rm ./operations/agents/project-manager.md

# Update plugin manifest to reference shared version
# .claude-plugin/plugin.json
{
  "agents": [
    "./core/agents/shared/project-manager.md",  # Single shared version
    "./business/agents/operations-manager.md",
    "./planning/agents/strategic-planner.md",
    "./operations/agents/operations-strategist.md"
  ]
}
```

---

## Phase 4: Agent Registry Implementation

### Step 4.1: Create Agent Registry Schema

**File**: `Agent_Memory/_system/agent_registry.yaml`

```yaml
# cAgents Agent Registry V3
# Lightweight metadata for fast agent discovery and assignment

schema_version: "3.0"
generated: "2026-01-10T00:00:00Z"

domains:
  software:
    executives:
      - name: ceo
        role: Strategic vision and executive decisions
        tier: [3, 4]
        keywords: [strategy, stakeholder, vision, executive, leadership]
        file: ./software/agents/ceo.md

      - name: cto
        role: Technology strategy and innovation
        tier: [3, 4]
        keywords: [technology, architecture, innovation, r&d, technical_strategy]
        file: ./software/agents/cto.md

      - name: vp-engineering
        role: Engineering organization and team building
        tier: [3, 4]
        keywords: [engineering, organization, hiring, culture, team_building]
        file: ./software/agents/vp-engineering.md

    leadership:
      - name: tech-lead
        role: Delivery orchestration and team coordination
        tier: [2, 3, 4]
        keywords: [delivery, coordination, delegation, priority, orchestration]
        delegates_to: [frontend-lead, backend-lead, devops-lead, senior-developer]
        file: ./software/agents/tech-lead.md

      - name: architect
        role: System design and architecture
        tier: [2, 3, 4]
        keywords: [design, architecture, patterns, api, system_design]
        file: ./software/agents/architect.md

    specialists:
      - name: frontend-developer
        role: UI/UX implementation
        tier: [1, 2, 3]
        keywords: [ui, components, react, vue, angular, styling, frontend]
        file: ./software/agents/frontend-developer.md

      - name: backend-developer
        role: APIs and server-side logic
        tier: [1, 2, 3]
        keywords: [api, database, backend, services, server]
        file: ./software/agents/backend-developer.md

      - name: devops
        role: CI/CD and infrastructure automation
        tier: [1, 2, 3]
        keywords: [ci_cd, deployment, docker, kubernetes, automation]
        file: ./software/agents/devops.md

    quality:
      - name: qa-lead
        role: Test strategy and quality assurance
        tier: [2, 3, 4]
        keywords: [testing, quality, qa, test_strategy, coverage]
        file: ./software/agents/qa-lead.md

      - name: security-specialist
        role: Security assessment and secure coding
        tier: [2, 3, 4]
        keywords: [security, vulnerability, authentication, encryption, secure_coding]
        file: ./software/agents/security-specialist.md

  shared:
    - name: project-manager
      role: Project planning and execution
      domains: [business, planning, operations, software]
      tier: [2, 3, 4]
      keywords: [project, planning, execution, timeline, scope, deliverables]
      file: ./core/agents/shared/project-manager.md

    - name: business-analyst
      role: Requirements gathering and analysis
      domains: [business, planning, software]
      tier: [2, 3, 4]
      keywords: [requirements, analysis, stakeholder, gap_analysis, business_case]
      file: ./core/agents/shared/business-analyst.md

    - name: customer-success-manager
      role: Customer relationship and retention
      domains: [business, sales, support]
      tier: [2, 3, 4]
      keywords: [customer, retention, adoption, churn, relationship]
      file: ./core/agents/shared/customer-success-manager.md

  business:
    executives:
      - name: cso
        role: Strategic planning and competitive positioning
        tier: [3, 4]
        keywords: [strategy, competitive, positioning, market, strategic_planning]
        file: ./business/agents/cso.md

    specialists:
      - name: operations-manager
        role: Day-to-day operations and execution
        tier: [2, 3, 4]
        keywords: [operations, execution, efficiency, process]
        file: ./business/agents/operations-manager.md

      - name: market-analyst
        role: Market research and competitive intelligence
        tier: [2, 3, 4]
        keywords: [market, research, competitive, trends, analysis]
        file: ./business/agents/market-analyst.md
```

### Step 4.2: Update Universal Planner to Use Registry

**Before** (scanning agent files):
```markdown
### Step 4: Assign Agents to Tasks
- For each task, select appropriate agent from `available_agents` registry
- Match task type and required capabilities to agent capabilities
- Read agent files to understand capabilities
```

**After** (using registry):
```markdown
### Step 4: Assign Agents to Tasks
1. Read `Agent_Memory/_system/agent_registry.yaml`
2. For each task, search registry by keywords
3. Match task type to agent role
4. Consider tier_access (some agents only available for certain tiers)
5. For shared agents, verify domain compatibility
6. Document agent assignment reasoning

Example - Assigning "Create API endpoint" task:
- Keywords: [api, backend, endpoint, rest]
- Search registry: backend-developer (keywords: api, backend, services)
- Tier check: tier 2 → backend-developer (tier [1,2,3]) ✅
- Assignment: backend-developer
```

### Step 4.3: Registry Generation Script

Create `scripts/generate_registry.py`:

```python
#!/usr/bin/env python3
import os
import yaml
import re
from pathlib import Path

def extract_agent_metadata(agent_file):
    """Extract frontmatter and key metadata from agent file"""
    with open(agent_file, 'r') as f:
        content = f.read()

    # Extract YAML frontmatter
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return None

    frontmatter = yaml.safe_load(match.group(1))

    # Extract keywords from capabilities and specialties
    keywords = []
    if 'capabilities' in frontmatter:
        keywords.extend(frontmatter['capabilities'])
    if 'specialties' in frontmatter:
        keywords.extend(frontmatter['specialties'])

    return {
        'name': frontmatter.get('name'),
        'role': frontmatter.get('role', frontmatter.get('description', '')[:80]),
        'tier': frontmatter.get('tier_access', [1, 2, 3, 4]),
        'keywords': keywords,
        'file': str(agent_file)
    }

def scan_domain_agents(domain_path):
    """Scan all agents in a domain"""
    agents_path = domain_path / 'agents'
    if not agents_path.exists():
        return []

    agents = []
    for agent_file in agents_path.glob('*.md'):
        metadata = extract_agent_metadata(agent_file)
        if metadata:
            agents.append(metadata)

    return agents

def generate_registry():
    """Generate complete agent registry"""
    registry = {
        'schema_version': '3.0',
        'generated': datetime.now().isoformat(),
        'domains': {}
    }

    # Scan all domains
    for domain in ['software', 'business', 'creative', 'planning', 'sales',
                   'marketing', 'finance', 'operations', 'hr', 'legal', 'support']:
        domain_path = Path(f'./{domain}')
        if domain_path.exists():
            agents = scan_domain_agents(domain_path)
            if agents:
                registry['domains'][domain] = agents

    # Scan shared agents
    shared_path = Path('./core/agents/shared')
    if shared_path.exists():
        registry['domains']['shared'] = scan_domain_agents(shared_path)

    # Write registry
    output_path = Path('./Agent_Memory/_system/agent_registry.yaml')
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        yaml.dump(registry, f, default_flow_style=False, sort_keys=False)

    print(f"Registry generated: {output_path}")
    print(f"Total agents: {sum(len(agents) for agents in registry['domains'].values())}")

if __name__ == '__main__':
    generate_registry()
```

---

## Phase 5: Cross-Domain Task Routing

### Step 5.1: Update Universal Executor

Add cross-domain detection to `core/agents/universal-executor.md`:

```markdown
## Cross-Domain Task Detection

Before executing tasks, check for cross-domain delegation:

1. Read task description and agent assignment
2. If task description contains cross-domain keywords:
   - "create API" (software)
   - "analyze revenue" (finance)
   - "design campaign" (marketing)
   - "forecast demand" (sales)
   - "hire engineer" (hr)
3. Check if assigned agent exists in current domain
4. If not, this is a cross-domain task → invoke trigger

### Cross-Domain Delegation Pattern

When task requires different domain:

```yaml
task:
  description: "Build automated reporting dashboard"
  assigned_agent: frontend-developer  # Not in business domain!

executor_action:
  1. Detect cross-domain: frontend-developer is in software domain
  2. Create child workflow:
     Task(
       subagent_type: "trigger",
       prompt: |
         Parent instruction: {current_instruction_id}
         Target domain: software

         Request: Build automated reporting dashboard

         Context from business domain:
         - Metrics: Revenue, Expenses, Profit Margin
         - Update frequency: Daily
         - Access: Manager+ role
         - Integration: Pull from /api/business/metrics
     )
  3. Wait for child workflow completion
  4. Aggregate results into parent workflow
```

### Step 5.2: Add Routing Examples to Team Agents

Update agents that commonly delegate cross-domain:

**Example - business/agents/operations-manager.md**:

```markdown
## Cross-Domain Collaboration Examples

### Requesting Software Automation
```yaml
scenario: "Automate invoice approval workflow"

delegation:
  Task(
    subagent_type: "trigger",
    prompt: |
      Domain: software
      Parent: {instruction_id}

      Build invoice approval automation:
      - Workflow: Submit → Manager Review → Finance Approve → Payment
      - Required: Email notifications, audit trail, mobile approval
      - Integration: POST /api/workflows/invoice/create

      Business context:
      - Current process: 5-7 days manual review
      - Target: < 24 hours automated
      - Volume: ~200 invoices/month
  )
```

### Requesting Financial Analysis
```yaml
scenario: "ROI analysis for process improvement"

delegation:
  Task(
    subagent_type: "trigger",
    prompt: |
      Domain: finance
      Parent: {instruction_id}

      Calculate ROI for automating invoice approval:
      - Current cost: 10 hours/week @ $50/hour = $2,000/month
      - Automation cost: $500 one-time + $100/month SaaS
      - Payback period calculation
      - 3-year NPV analysis
  )
```
```

### Step 5.3: Cross-Domain Routing Matrix

Create `Agent_Memory/_system/cross_domain_routing.yaml`:

```yaml
# Cross-Domain Routing Patterns
# Common scenarios where domains delegate to each other

routing_patterns:
  business_to_software:
    triggers:
      - "automate"
      - "build API"
      - "create dashboard"
      - "integrate system"
    example: "Automate employee onboarding process"

  business_to_finance:
    triggers:
      - "ROI analysis"
      - "budget"
      - "cost-benefit"
      - "financial forecast"
    example: "Calculate ROI for new CRM system"

  business_to_hr:
    triggers:
      - "hiring plan"
      - "workforce"
      - "headcount"
      - "talent acquisition"
    example: "Create Q2 hiring forecast"

  sales_to_marketing:
    triggers:
      - "campaign"
      - "lead nurture"
      - "content"
      - "email sequence"
    example: "Design email drip campaign for enterprise leads"

  sales_to_finance:
    triggers:
      - "revenue forecast"
      - "commission"
      - "quota planning"
    example: "Create Q4 revenue forecast by segment"

  marketing_to_creative:
    triggers:
      - "write copy"
      - "design visual"
      - "create story"
      - "brand narrative"
    example: "Write compelling product launch announcement"

  software_to_security:
    triggers:
      - "penetration test"
      - "vulnerability scan"
      - "security review"
      - "threat model"
    example: "Security audit of new authentication system"

  any_to_planning:
    triggers:
      - "strategic roadmap"
      - "long-term plan"
      - "initiative planning"
      - "portfolio prioritization"
    example: "Create 3-year product roadmap"
```

---

## Validation & Testing

### Test Suite 1: Domain-Specific Workflows

**Software Domain**:
```bash
/trigger Fix the login bug in auth.py

Expected:
- Routes to software domain
- Uses universal-router → universal-planner → universal-executor
- Assigns: backend-developer, qa-lead
- No cross-domain delegation
- Validates: Tests pass, security review clean
```

**Business Domain**:
```bash
/trigger Create Q1 financial forecast

Expected:
- Routes to business domain
- Uses universal workflow agents
- Assigns: financial-analyst (shared), market-analyst
- Possible cross-domain: finance domain for detailed modeling
- Validates: Forecast includes 3 scenarios with assumptions
```

**Creative Domain**:
```bash
/trigger Write a 2000-word sci-fi short story about AI

Expected:
- Routes to creative domain
- Uses universal workflow agents
- Assigns: story-architect, prose-stylist, editor
- No cross-domain delegation (unless research needed)
- Validates: 2000-2500 words, complete narrative arc
```

### Test Suite 2: Cross-Domain Workflows

**Business → Software**:
```bash
/trigger Design and implement employee onboarding automation

Expected:
- Starts in business domain
- Business planner creates tasks:
  1. Define business process (business-analyst)
  2. Build automation API (cross-domain → software)
  3. Create admin dashboard (cross-domain → software)
  4. Integrate with HR system (operations-manager + hr domain)
- Creates child workflows in software domain
- Aggregates deliverables
```

**Sales → Marketing → Creative**:
```bash
/trigger Create complete enterprise sales campaign

Expected:
- Starts in sales domain
- Sales planner creates tasks:
  1. Define target personas (sales-strategist)
  2. Create campaign strategy (cross-domain → marketing)
  3. Write email sequence (marketing → creative)
  4. Design sales playbook (sales-enablement-specialist)
- Multi-level cross-domain delegation
- Final deliverable spans 3 domains
```

### Test Suite 3: Shared Agent Usage

**Shared: project-manager across domains**:
```bash
# Test 1: Business domain
/trigger Plan office relocation project

Expected:
- Uses shared project-manager with domain=business context
- Collaborates with: operations-manager, facilities-manager
- Deliverables: Project charter, timeline, budget

# Test 2: Software domain
/trigger Plan microservices migration project

Expected:
- Uses shared project-manager with domain=software context
- Collaborates with: tech-lead, architect
- Deliverables: Migration roadmap, sprint plan, risk analysis
```

### Validation Checklist

- [ ] All 11 domains execute tier 0-2 workflows successfully
- [ ] Cross-domain delegation works (business→software, sales→marketing)
- [ ] Shared agents adapt behavior based on domain
- [ ] Agent registry used for assignment (not file scanning)
- [ ] Plugin size reduced to ~2MB
- [ ] Average agent file < 200 lines
- [ ] No functionality lost from V2
- [ ] Documentation updated (CLAUDE.md, README.md)

---

## Rollback Plan

If consolidation causes issues:

```bash
# Rollback to V2
git checkout main
git branch -D v3-consolidation

# Partial rollback - keep optimizations, revert removals
git checkout v3-consolidation
git checkout main -- software/agents/router.md  # Restore specific files
```

---

**Status**: Implementation Ready
**Estimated Effort**: 2-3 weeks
**Risk Level**: Medium (extensive testing required)
**Reversibility**: High (git-based, staged rollout)
