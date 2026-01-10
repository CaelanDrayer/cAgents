# cAgents V3 Validation Framework
## Ensuring Complete Functionality Preservation

This framework validates that the V3 consolidation preserves ALL functionality from V2 while achieving size reduction goals.

---

## Validation Principles

1. **Capability Coverage**: Every V2 capability must map to V3 agent or config
2. **Workflow Integrity**: All workflow patterns must execute successfully
3. **Cross-Domain Routing**: New cross-domain capabilities must work reliably
4. **Performance**: Context usage must decrease, not increase
5. **Maintainability**: Consolidation must simplify, not complicate

---

## Part 1: Capability Mapping Matrix

### Step 1: Extract All V2 Capabilities

**Script**: `scripts/extract_capabilities.py`

```python
#!/usr/bin/env python3
import os
import yaml
import re
from collections import defaultdict

def extract_capabilities_from_agent(agent_file):
    """Extract all capabilities from agent frontmatter"""
    with open(agent_file, 'r') as f:
        content = f.read()

    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return []

    frontmatter = yaml.safe_load(match.group(1))
    capabilities = []

    if 'capabilities' in frontmatter:
        if isinstance(frontmatter['capabilities'], list):
            capabilities.extend(frontmatter['capabilities'])
        elif isinstance(frontmatter['capabilities'], dict):
            # Some agents use dict format
            capabilities.extend(frontmatter['capabilities'].keys())

    if 'specialties' in frontmatter:
        capabilities.extend(frontmatter['specialties'])

    return capabilities

def build_capability_map():
    """Build complete capability map for V2"""
    capability_map = defaultdict(list)

    # Scan all domains
    for domain in ['software', 'business', 'creative', 'planning', 'sales',
                   'marketing', 'finance', 'operations', 'hr', 'legal', 'support']:
        agent_dir = f'./{domain}/agents'
        if not os.path.exists(agent_dir):
            continue

        for agent_file in os.listdir(agent_dir):
            if not agent_file.endswith('.md'):
                continue

            path = os.path.join(agent_dir, agent_file)
            agent_name = agent_file.replace('.md', '')
            capabilities = extract_capabilities_from_agent(path)

            for cap in capabilities:
                capability_map[cap].append({
                    'agent': agent_name,
                    'domain': domain,
                    'file': path
                })

    return capability_map

def generate_capability_report():
    """Generate capability coverage report"""
    capability_map = build_capability_map()

    print("# V2 Capability Coverage Report")
    print(f"\nTotal unique capabilities: {len(capability_map)}")
    print("\n## Capabilities by Agent Count\n")

    # Sort by number of agents providing this capability
    sorted_caps = sorted(capability_map.items(), key=lambda x: len(x[1]), reverse=True)

    for cap, agents in sorted_caps:
        print(f"\n### {cap} ({len(agents)} agents)")
        for agent in agents:
            print(f"  - {agent['domain']}/{agent['agent']}")

if __name__ == '__main__':
    generate_capability_report()
```

**Expected output**:
```markdown
# V2 Capability Coverage Report

Total unique capabilities: 450

## Capabilities by Agent Count

### strategic_planning (8 agents)
  - business/cso
  - planning/cpo
  - planning/strategic-planner
  - sales/cro
  - marketing/cmo
  - finance/cfo
  - operations/coo
  - hr/chro

### project_management (6 agents)
  - business/project-manager
  - planning/project-manager
  - operations/project-manager
  - planning/program-manager
  - business/program-manager
  - software/tech-lead

### stakeholder_communication (12 agents)
  - business/stakeholder-rep
  - business/cso
  - software/product-owner
  [... etc]
```

### Step 2: Map V2 → V3 Capabilities

**File**: `CAPABILITY_MAPPING_V2_TO_V3.md`

```markdown
# Capability Mapping: V2 → V3

This document ensures every V2 capability is preserved in V3.

## Mapping Legend
- ✅ **Preserved** - Capability exists in V3 agent
- 🔀 **Consolidated** - Multiple V2 agents → Single V3 shared agent
- 📋 **Config-Driven** - Moved to domain config YAML
- ⚠️ **At Risk** - Requires validation

---

## Executive Leadership Capabilities

| V2 Capability | V2 Agents | V3 Mapping | Status |
|---------------|-----------|------------|--------|
| strategic_vision | ceo, cso, cto, cro, cmo | Preserved in domain exec agents | ✅ |
| stakeholder_management | ceo, product-owner, stakeholder-rep | Preserved in software/ceo, software/product-owner | ✅ |
| technology_strategy | cto | Preserved in software/cto | ✅ |
| financial_strategy | cfo | Consolidated to finance/cfo (used by software/business via cross-domain) | 🔀 |

## Project Management Capabilities

| V2 Capability | V2 Agents | V3 Mapping | Status |
|---------------|-----------|------------|--------|
| project_planning | project-manager (business), project-manager (planning), project-manager (operations) | Consolidated to shared/project-manager with domain adaptation | 🔀 |
| scope_definition | project-manager (all), product-owner, tech-lead | Preserved in shared/project-manager, software/product-owner, software/tech-lead | ✅ |
| timeline_management | project-manager (all), program-manager (all) | Consolidated to shared/project-manager, shared/program-manager | 🔀 |
| resource_allocation | project-manager, tech-lead, vp-engineering | Preserved in respective agents | ✅ |

## Development Capabilities

| V2 Capability | V2 Agents | V3 Mapping | Status |
|---------------|-----------|------------|--------|
| frontend_development | frontend-developer, frontend-lead, ux-designer | Preserved in software/frontend-developer, software/frontend-lead, software/ux-designer | ✅ |
| backend_development | backend-developer, backend-lead, architect | Preserved in software/backend-developer, software/backend-lead, software/architect | ✅ |
| api_design | backend-developer, architect, backend-lead | Preserved in software agents | ✅ |
| database_design | dba, data-analyst, architect | Preserved in software/dba, software/data-analyst, software/architect | ✅ |

## Quality Assurance Capabilities

| V2 Capability | V2 Agents | V3 Mapping | Status |
|---------------|-----------|------------|--------|
| code_review | architecture-reviewer, code-standards-auditor, tech-lead | Preserved in software/architecture-reviewer, software/code-standards-auditor, software/tech-lead | ✅ |
| test_strategy | qa-lead, test-coverage-validator, tech-lead | Preserved in software/qa-lead, software/test-coverage-validator, software/tech-lead | ✅ |
| security_review | security-analyst, security-specialist, security-lead | Preserved in software agents | ✅ |
| performance_analysis | performance-analyzer, architect, senior-developer | Preserved in software agents | ✅ |

## Cross-Domain Capabilities (NEW in V3)

| Capability | Enabled By | Status |
|------------|------------|--------|
| cross_domain_delegation | Universal-executor + trigger protocol | ✅ NEW |
| domain_aware_shared_agents | Shared agent pool with domain adaptation | ✅ NEW |
| multi_domain_workflows | Recursive workflows + cross-domain routing | ✅ NEW |

---

## Validation Queries

### Query 1: Orphaned Capabilities
```bash
# Find capabilities in V2 that don't map to V3
python3 scripts/find_orphaned_capabilities.py
```

### Query 2: Duplicate Capabilities (Consolidation Targets)
```bash
# Find identical capabilities across multiple agents
python3 scripts/find_duplicate_capabilities.py
```

### Query 3: Config-Only Capabilities
```bash
# Find capabilities that moved from agents to domain configs
python3 scripts/find_config_capabilities.py
```
```

---

## Part 2: Workflow Pattern Validation

### Tier 0-4 Workflow Tests

**File**: `tests/workflows/tier_tests.yaml`

```yaml
# Tier 0: Trivial Questions
tier_0:
  - request: "What is the cAgents architecture?"
    expected:
      - no_instruction_folder: true
      - direct_response: true
      - domains: [any]

# Tier 1: Simple Tasks
tier_1:
  - request: "Fix typo in README.md"
    domain: software
    expected:
      - agents: [senior-developer]
      - workflow: [execute, validate]
      - cross_domain: false

# Tier 2: Moderate Complexity
tier_2:
  - request: "Fix login bug in auth.py"
    domain: software
    expected:
      - agents: [backend-developer, qa-lead]
      - workflow: [plan, execute, validate]
      - cross_domain: false

  - request: "Create Q4 sales forecast"
    domain: sales
    expected:
      - agents: [sales-analyst, financial-analyst]
      - workflow: [plan, execute, validate]
      - cross_domain: true  # May delegate to finance domain
      - cross_domain_target: finance

# Tier 3: Complex Features
tier_3:
  - request: "Implement OAuth2 authentication across all services"
    domain: software
    expected:
      - agents: [tech-lead, architect, backend-lead, backend-developer, security-specialist, qa-lead]
      - workflow: [plan, execute, validate]
      - parallel_execution: true
      - cross_domain: false

  - request: "Design and launch enterprise email campaign"
    domain: marketing
    expected:
      - agents: [marketing-strategist, demand-generation-manager, copywriter]
      - workflow: [plan, execute, validate]
      - cross_domain: true
      - cross_domain_target: creative  # For copywriting

# Tier 4: Expert/Strategic
tier_4:
  - request: "Refactor entire authentication system to use microservices"
    domain: software
    expected:
      - agents: [cto, vp-engineering, tech-lead, architect, security-lead, backend-lead, devops-lead]
      - workflow: [plan, execute, validate, hitl_checkpoints]
      - parallel_execution: true
      - cross_domain: false
      - hitl_escalation: expected  # Major architectural change

  - request: "Create 3-year strategic business plan"
    domain: planning
    expected:
      - agents: [cpo, strategic-planner, market-analyst, financial-analyst]
      - workflow: [plan, execute, validate, hitl_approval]
      - cross_domain: true
      - cross_domain_targets: [business, finance, sales, marketing]
      - hitl_escalation: expected
```

### Cross-Domain Workflow Tests

**File**: `tests/workflows/cross_domain_tests.yaml`

```yaml
cross_domain_workflows:
  business_to_software:
    - request: "Automate employee onboarding process"
      parent_domain: business
      expected:
        - child_workflows: 2
        - child_domains: [software, hr]
        - parent_agents: [operations-manager, business-analyst]
        - child_agents_software: [tech-lead, backend-developer, frontend-developer]
        - child_agents_hr: [hr-operations-manager, onboarding-specialist]
        - deliverables:
            - business: "Onboarding process documentation"
            - software: "Onboarding automation API and dashboard"
            - hr: "Employee data integration and workflows"

  sales_to_marketing_to_creative:
    - request: "Create complete enterprise sales campaign with all assets"
      parent_domain: sales
      expected:
        - child_workflows: 2
        - child_domains: [marketing, creative]
        - workflow_depth: 2  # sales → marketing → creative
        - parent_agents: [sales-strategist, sales-enablement-specialist]
        - marketing_agents: [marketing-strategist, demand-generation-manager]
        - creative_agents: [copywriter, creative-director]
        - deliverables:
            - sales: "Sales playbook and targeting strategy"
            - marketing: "Campaign plan and channel strategy"
            - creative: "Email sequences, landing pages, sales collateral"

  multi_domain_orchestration:
    - request: "Launch new product line end-to-end"
      parent_domain: planning
      expected:
        - child_workflows: 5+
        - child_domains: [software, marketing, sales, operations, finance]
        - workflow_depth: 3  # planning → multiple domains → sub-tasks
        - coordination_agent: strategic-planner
        - deliverables:
            - planning: "Go-to-market roadmap"
            - software: "Product features and infrastructure"
            - marketing: "Launch campaign and positioning"
            - sales: "Sales enablement and pricing"
            - operations: "Supply chain and fulfillment"
            - finance: "Revenue projections and budgets"
```

### Test Execution Script

**File**: `scripts/run_workflow_tests.sh`

```bash
#!/bin/bash

echo "=== cAgents V3 Workflow Validation ==="
echo ""

# Test each tier
for tier in 0 1 2 3 4; do
  echo "Testing Tier $tier workflows..."

  # Parse test YAML and execute
  python3 scripts/execute_workflow_test.py \
    --tier $tier \
    --config tests/workflows/tier_tests.yaml \
    --output results/tier_${tier}_results.yaml

  if [ $? -eq 0 ]; then
    echo "✅ Tier $tier tests passed"
  else
    echo "❌ Tier $tier tests FAILED"
    exit 1
  fi
done

echo ""
echo "Testing cross-domain workflows..."

python3 scripts/execute_workflow_test.py \
  --cross-domain \
  --config tests/workflows/cross_domain_tests.yaml \
  --output results/cross_domain_results.yaml

if [ $? -eq 0 ]; then
  echo "✅ Cross-domain tests passed"
else
  echo "❌ Cross-domain tests FAILED"
  exit 1
fi

echo ""
echo "=== All Workflow Tests Passed ==="
```

---

## Part 3: Agent Consolidation Validation

### Shared Agent Coverage Test

**Validate shared agents work in all declared domains**

```yaml
# tests/agents/shared_agent_tests.yaml

shared_agent_tests:
  project_manager:
    declared_domains: [business, planning, operations, software]

    tests:
      - domain: business
        request: "Plan office relocation project"
        expected_collaborators: [operations-manager, facilities-manager]
        expected_deliverables: [project_charter, timeline, budget]

      - domain: planning
        request: "Plan strategic initiative for market expansion"
        expected_collaborators: [strategic-planner, market-analyst]
        expected_deliverables: [initiative_charter, roadmap, dependency_map]

      - domain: operations
        request: "Plan warehouse capacity expansion"
        expected_collaborators: [operations-strategist, supply-chain-manager]
        expected_deliverables: [capacity_plan, vendor_contracts, timeline]

      - domain: software
        request: "Plan microservices migration project"
        expected_collaborators: [tech-lead, architect]
        expected_deliverables: [migration_roadmap, sprint_plan, risk_analysis]

  customer_success_manager:
    declared_domains: [business, sales, support]

    tests:
      - domain: sales
        request: "Prevent churn for enterprise account"
        expected_collaborators: [account-executive, sales-strategist]
        expected_deliverables: [retention_plan, success_metrics, engagement_strategy]

      - domain: support
        request: "Improve product adoption for new customers"
        expected_collaborators: [support-manager, customer-education-specialist]
        expected_deliverables: [adoption_roadmap, training_plan, health_metrics]

      - domain: business
        request: "Analyze customer lifetime value trends"
        expected_collaborators: [business-analyst, market-analyst]
        expected_deliverables: [ltv_analysis, churn_drivers, retention_recommendations]
```

---

## Part 4: Size Reduction Validation

### Size Targets

```yaml
size_targets:
  total:
    v2_baseline: 5.6 MB
    v3_target: 2.0 MB
    maximum_acceptable: 2.5 MB

  per_agent:
    v2_average: 450 lines
    v3_target: 150 lines
    maximum_acceptable: 200 lines

  per_domain:
    software:
      v2: 22,600 lines
      v3_target: 7,000 lines
      max: 10,000 lines

    business:
      v2: 12,000 lines
      v3_target: 4,000 lines
      max: 6,000 lines
```

### Size Validation Script

```bash
#!/bin/bash

echo "=== V3 Size Validation ==="

# Total size
total_size=$(find . -path "*/agents/*.md" -exec wc -c {} + | tail -1 | awk '{print $1}')
total_mb=$(echo "scale=2; $total_size / 1024 / 1024" | bc)

echo "Total agent size: ${total_mb} MB"

if (( $(echo "$total_mb > 2.5" | bc -l) )); then
  echo "❌ FAILED: Exceeds 2.5 MB target"
  exit 1
else
  echo "✅ PASSED: Within size target"
fi

# Average agent size
total_agents=$(find . -path "*/agents/*.md" | wc -l)
avg_lines=$(find . -path "*/agents/*.md" -exec wc -l {} + | tail -1 | awk -v agents=$total_agents '{print $1 / agents}')

echo "Average agent size: ${avg_lines} lines"

if (( $(echo "$avg_lines > 200" | bc -l) )); then
  echo "❌ FAILED: Average exceeds 200 lines"
  exit 1
else
  echo "✅ PASSED: Within line target"
fi

# Per-domain breakdown
for domain in software business creative planning sales marketing finance operations hr legal support; do
  domain_lines=$(find ./$domain/agents -name "*.md" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
  if [ ! -z "$domain_lines" ]; then
    echo "$domain: $domain_lines lines"
  fi
done
```

---

## Part 5: Context Efficiency Validation

### Context Usage Benchmarks

**Measure context tokens used per workflow phase**

```yaml
# tests/performance/context_benchmarks.yaml

context_benchmarks:
  planning_phase:
    v2_baseline:
      agent_files_loaded: 15
      total_tokens: 45,000
      registry_tokens: 0

    v3_target:
      agent_files_loaded: 0  # Uses registry instead
      total_tokens: 15,000
      registry_tokens: 2,000

    test:
      request: "Implement OAuth2 authentication"
      measure:
        - tokens_in_planning_phase
        - num_agent_files_read
        - registry_lookups

  execution_phase:
    v2_baseline:
      agent_files_loaded: 8
      total_tokens: 30,000

    v3_target:
      agent_files_loaded: 8  # Same - needs full agent prompts
      total_tokens: 20,000  # Smaller agent files

  validation_phase:
    v2_baseline:
      config_tokens: 5,000
      agent_tokens: 10,000

    v3_target:
      config_tokens: 5,000
      agent_tokens: 5,000  # Smaller agent files
```

---

## Part 6: Rollback Criteria

### When to Rollback V3

Rollback if ANY of these conditions occur:

1. **Functionality Loss**
   - Any V2 capability cannot be mapped to V3
   - Domain workflow fails that worked in V2
   - Cross-domain routing breaks existing workflows

2. **Size Targets Missed**
   - Total size > 3.0 MB (50% over target)
   - Average agent > 250 lines (67% over target)

3. **Performance Degradation**
   - Context usage increases (should decrease)
   - Planning phase > 45 seconds (was ~30 seconds)

4. **Maintainability Issues**
   - Shared agents too complex to maintain
   - Domain adaptation logic too fragile
   - Configuration files become too large

### Rollback Procedure

```bash
# Full rollback
git checkout main
git branch -D v3-consolidation

# Partial rollback - keep optimizations, restore removed agents
git checkout v3-consolidation
git checkout main -- ./software/agents/router.md
git checkout main -- ./business/agents/router.md
# etc...
```

---

## Validation Checklist

### Pre-Launch Validation

- [ ] All V2 capabilities mapped to V3 agents or configs
- [ ] All 11 domains execute tier 0-2 workflows
- [ ] Cross-domain delegation works for 5+ scenarios
- [ ] Shared agents adapt correctly in all declared domains
- [ ] Total size ≤ 2.5 MB
- [ ] Average agent file ≤ 200 lines
- [ ] Context usage decreased vs V2
- [ ] Planning phase ≤ 35 seconds
- [ ] All deprecated agents removed from plugin manifest
- [ ] Agent registry generated and used by universal-planner
- [ ] Documentation updated (CLAUDE.md, README.md)

### Post-Launch Monitoring

- [ ] Monitor workflow success rates (should match V2)
- [ ] Track context token usage (should decrease)
- [ ] Monitor planning phase duration (should decrease)
- [ ] Collect user feedback on cross-domain workflows
- [ ] Verify shared agent usage patterns
- [ ] Check for orphaned capabilities

---

## Success Criteria

✅ **V3 is successful if**:
1. All V2 workflows execute successfully
2. Plugin size reduced to ~2 MB (64% reduction)
3. Context efficiency improved (registry vs file scanning)
4. Cross-domain routing enables new use cases
5. Shared agents reduce maintenance burden
6. No functionality lost from V2

---

**Status**: Validation Framework Ready
**Next Step**: Execute validation tests before V3 launch
