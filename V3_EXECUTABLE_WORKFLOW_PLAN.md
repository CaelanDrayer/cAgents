# cAgents V3 Consolidation - Executable Workflow Plan
## Agent-Driven Implementation with Parallel Task Execution

This plan breaks down the V3 consolidation into discrete, executable tasks that can be assigned to specialized agents and run in parallel where possible.

---

## Workflow Overview

**Total Tasks**: 47 tasks across 5 phases
**Estimated Duration**: 3-4 weeks with parallel execution
**Agents Involved**: 15+ specialized agents
**Parallelization**: 60% of tasks can run in parallel

---

## Phase 1: Cleanup & Analysis (Week 1)

### Wave 1.1: Baseline Analysis (Parallel - 4 tasks)

**Task 1.1.1: Extract Current Agent Metadata**
```yaml
task_id: cleanup_001
description: Extract metadata from all 283 agent files
agent: data-analyst
tier: 2
blocking: true
duration: 2 hours

inputs:
  - All agent files in */agents/*.md

outputs:
  - Agent_Memory/v3_consolidation/analysis/agent_metadata.yaml
  - Agent_Memory/v3_consolidation/analysis/capability_matrix.yaml

acceptance_criteria:
  - All 283 agents cataloged
  - Capabilities extracted and categorized
  - Duplicates identified
  - Shared agent candidates listed

script: |
  python3 scripts/extract_agent_metadata.py \
    --scan-all-domains \
    --output Agent_Memory/v3_consolidation/analysis/agent_metadata.yaml \
    --capability-matrix Agent_Memory/v3_consolidation/analysis/capability_matrix.yaml
```

**Task 1.1.2: Measure Current Size Baseline**
```yaml
task_id: cleanup_002
description: Measure and document current plugin size
agent: senior-developer
tier: 1
blocking: true
duration: 1 hour

inputs:
  - All agent files
  - Plugin manifests

outputs:
  - Agent_Memory/v3_consolidation/analysis/size_baseline.yaml

acceptance_criteria:
  - Total size in MB documented
  - Per-domain breakdown recorded
  - Per-agent size distribution calculated
  - Largest agents identified (top 20)

script: |
  bash scripts/measure_plugin_size.sh \
    --output Agent_Memory/v3_consolidation/analysis/size_baseline.yaml \
    --breakdown-by-domain \
    --identify-largest 20
```

**Task 1.1.3: Map Deprecated Agents**
```yaml
task_id: cleanup_003
description: Identify all deprecated workflow agents to remove
agent: senior-developer
tier: 1
blocking: true
duration: 1 hour

inputs:
  - CLAUDE.md (lists deprecated agents)
  - Plugin manifests

outputs:
  - Agent_Memory/v3_consolidation/phase1/deprecated_agents.yaml

acceptance_criteria:
  - All 55 deprecated workflow agents listed
  - File paths verified to exist
  - Plugin manifest references identified
  - Removal impact assessed (should be zero)

script: |
  python3 scripts/identify_deprecated_agents.py \
    --output Agent_Memory/v3_consolidation/phase1/deprecated_agents.yaml \
    --verify-paths \
    --check-manifest-references
```

**Task 1.1.4: Validate V2 Functionality Baseline**
```yaml
task_id: cleanup_004
description: Run all tier 0-2 workflows in V2 as baseline
agent: qa-lead
tier: 2
blocking: true
duration: 3 hours

inputs:
  - tests/workflows/tier_tests.yaml

outputs:
  - Agent_Memory/v3_consolidation/validation/v2_baseline_results.yaml

acceptance_criteria:
  - All 11 domains tested (tier 0-2 workflows)
  - Success rate documented
  - Execution times recorded
  - Baseline established for V3 comparison

script: |
  bash scripts/run_workflow_tests.sh \
    --tiers 0,1,2 \
    --all-domains \
    --output Agent_Memory/v3_consolidation/validation/v2_baseline_results.yaml
```

---

### Wave 1.2: Remove Deprecated Agents (Parallel - 3 tasks)

**Dependencies**: Wave 1.1 complete

**Task 1.2.1: Remove Deprecated Agent Files**
```yaml
task_id: cleanup_011
description: Delete 55 deprecated workflow agents
agent: senior-developer
tier: 1
blocking: true
duration: 30 minutes

inputs:
  - Agent_Memory/v3_consolidation/phase1/deprecated_agents.yaml

outputs:
  - Agent_Memory/v3_consolidation/phase1/removed_files.log

acceptance_criteria:
  - All 55 files deleted
  - Git status shows deletions
  - No deprecated agents remain (except core/agents/universal-*)

script: |
  python3 scripts/remove_deprecated_agents.py \
    --input Agent_Memory/v3_consolidation/phase1/deprecated_agents.yaml \
    --execute \
    --log Agent_Memory/v3_consolidation/phase1/removed_files.log
```

**Task 1.2.2: Update Plugin Manifests**
```yaml
task_id: cleanup_012
description: Remove deprecated agents from all plugin manifests
agent: senior-developer
tier: 1
blocking: true
duration: 1 hour

inputs:
  - Agent_Memory/v3_consolidation/phase1/deprecated_agents.yaml
  - .claude-plugin/plugin.json
  - */. claude-plugin/plugin.json

outputs:
  - Updated plugin manifests
  - Agent_Memory/v3_consolidation/phase1/manifest_updates.log

acceptance_criteria:
  - Root manifest updated
  - All domain manifests updated
  - No references to deprecated agents remain
  - JSON valid (passes validation)

script: |
  python3 scripts/update_plugin_manifests.py \
    --remove-deprecated \
    --validate-json \
    --log Agent_Memory/v3_consolidation/phase1/manifest_updates.log
```

**Task 1.2.3: Update Documentation**
```yaml
task_id: cleanup_013
description: Update CLAUDE.md to reflect removed agents
agent: scribe
tier: 1
blocking: true
duration: 1 hour

inputs:
  - CLAUDE.md
  - Agent_Memory/v3_consolidation/phase1/deprecated_agents.yaml

outputs:
  - Updated CLAUDE.md
  - Agent_Memory/v3_consolidation/phase1/doc_updates.log

acceptance_criteria:
  - "Note: deprecated in V2" text removed
  - Agent counts updated
  - Version updated to 3.0
  - Architecture diagram reflects changes

edits:
  - file: CLAUDE.md
    remove: "_Note: Domain-specific workflow agents are deprecated in V2._"
    replace: "Domain-specific workflow agents were removed in V3. All workflow logic handled by universal agents."
  - file: CLAUDE.md
    find: "**Total Agents**: 283"
    replace: "**Total Agents**: 228 (after V3 consolidation)"
```

---

### Wave 1.3: Validation Checkpoint (Serial - 1 task)

**Dependencies**: Wave 1.2 complete

**Task 1.3.1: Validate Phase 1 - Test All Domains**
```yaml
task_id: cleanup_020
description: Verify all domains still work after removing deprecated agents
agent: qa-lead
tier: 2
blocking: true
duration: 3 hours

inputs:
  - Updated codebase (deprecated agents removed)
  - tests/workflows/tier_tests.yaml
  - Agent_Memory/v3_consolidation/validation/v2_baseline_results.yaml

outputs:
  - Agent_Memory/v3_consolidation/validation/phase1_results.yaml

acceptance_criteria:
  - All 11 domains pass tier 0-2 workflows
  - Success rate >= V2 baseline
  - No regressions detected
  - PASS/FAIL decision documented

script: |
  bash scripts/run_workflow_tests.sh \
    --tiers 0,1,2 \
    --all-domains \
    --compare-to Agent_Memory/v3_consolidation/validation/v2_baseline_results.yaml \
    --output Agent_Memory/v3_consolidation/validation/phase1_results.yaml

escalation:
  if: "success_rate < v2_baseline"
  action: "BLOCK and escalate to tech-lead"
  message: "Phase 1 validation failed - regressions detected"
```

---

## Phase 2: Agent Optimization (Week 2)

### Wave 2.1: Create Optimization Infrastructure (Parallel - 3 tasks)

**Dependencies**: Phase 1 validated

**Task 2.1.1: Create Optimized Agent Template**
```yaml
task_id: optimize_001
description: Design standardized optimized agent template
agent: architect
tier: 2
blocking: true
duration: 2 hours

inputs:
  - core/templates/ (if exists)
  - Sample of 5 well-designed agents

outputs:
  - core/templates/optimized-agent-template.md

acceptance_criteria:
  - Template < 150 lines
  - All essential sections included
  - Clear, concise prompts
  - Examples provided
  - Tech-lead approved

template_sections:
  - YAML frontmatter (8 lines max)
  - One-line description
  - Core responsibilities (4-6 bullets)
  - Collaboration (Consult/Delegate/Escalate)
  - Decision authority
  - Domain-specific notes (if applicable)
```

**Task 2.1.2: Build Agent Registry Schema**
```yaml
task_id: optimize_002
description: Design agent registry YAML schema
agent: architect
tier: 2
blocking: true
duration: 2 hours

inputs:
  - Agent_Memory/v3_consolidation/analysis/agent_metadata.yaml

outputs:
  - Agent_Memory/_system/schema/agent_registry_schema.yaml
  - Agent_Memory/_system/agent_registry.yaml (empty template)

acceptance_criteria:
  - Schema supports all metadata fields
  - Searchable by keywords
  - Domain-aware
  - Tier access tracked
  - Delegation relationships captured

schema_fields:
  - name, role, domain, tier_access
  - capabilities, specialties, keywords
  - delegates_to, consults, escalates_to
  - file_path
```

**Task 2.1.3: Create Automated Optimization Scripts**
```yaml
task_id: optimize_003
description: Build scripts to automate agent optimization
agent: senior-developer
tier: 2
blocking: true
duration: 3 hours

inputs:
  - core/templates/optimized-agent-template.md
  - Agent_Memory/_system/schema/agent_registry_schema.yaml

outputs:
  - scripts/optimize_agent.py
  - scripts/generate_registry.py
  - scripts/validate_optimized_agent.py

acceptance_criteria:
  - optimize_agent.py compresses agent files
  - generate_registry.py extracts metadata
  - validate_optimized_agent.py checks compliance
  - All scripts tested on 3 sample agents
  - Documentation included

script_features:
  optimize_agent.py:
    - Extract frontmatter
    - Compress capabilities list
    - Remove redundant sections
    - Apply template structure
    - Preserve unique logic

  generate_registry.py:
    - Scan all agent files
    - Extract metadata
    - Build searchable registry
    - Validate against schema
```

---

### Wave 2.2: Optimize High-Priority Agents (Parallel - 6 tasks)

**Dependencies**: Wave 2.1 complete

**Strategy**: Divide 50 agents into 6 batches, optimize in parallel

**Task 2.2.1: Optimize Software Leadership Agents (8 agents)**
```yaml
task_id: optimize_011
description: Optimize tech-lead, architect, senior-developer, etc.
agent: senior-developer
tier: 2
blocking: false
duration: 4 hours

inputs:
  - core/templates/optimized-agent-template.md
  - scripts/optimize_agent.py

agents_to_optimize:
  - software/agents/tech-lead.md
  - software/agents/architect.md
  - software/agents/senior-developer.md
  - software/agents/frontend-lead.md
  - software/agents/backend-lead.md
  - software/agents/devops-lead.md
  - software/agents/security-lead.md
  - software/agents/qa-lead.md

outputs:
  - Optimized agent files (in-place)
  - Agent_Memory/v3_consolidation/phase2/batch1_optimization.log

acceptance_criteria:
  - Each agent < 200 lines
  - All unique capabilities preserved
  - Collaboration patterns retained
  - Template structure followed
  - Git diff reviewable

script: |
  for agent in ${agents_to_optimize[@]}; do
    python3 scripts/optimize_agent.py \
      --input $agent \
      --template core/templates/optimized-agent-template.md \
      --output $agent \
      --log Agent_Memory/v3_consolidation/phase2/batch1_optimization.log
  done
```

**Task 2.2.2: Optimize Software Development Agents (8 agents)**
```yaml
task_id: optimize_012
description: Optimize frontend-developer, backend-developer, etc.
agent: senior-developer
tier: 2
blocking: false
duration: 4 hours

agents_to_optimize:
  - software/agents/frontend-developer.md
  - software/agents/backend-developer.md
  - software/agents/devops.md
  - software/agents/sysadmin.md
  - software/agents/dba.md
  - software/agents/data-analyst.md
  - software/agents/ux-designer.md
  - software/agents/security-specialist.md

outputs:
  - Optimized agent files
  - Agent_Memory/v3_consolidation/phase2/batch2_optimization.log

acceptance_criteria:
  - Same as Task 2.2.1
```

**Task 2.2.3: Optimize Software QA Agents (9 agents)**
```yaml
task_id: optimize_013
description: Optimize QA layer agents
agent: qa-lead
tier: 2
blocking: false
duration: 4 hours

agents_to_optimize:
  - software/agents/architecture-reviewer.md
  - software/agents/code-standards-auditor.md
  - software/agents/security-analyst.md
  - software/agents/qa-compliance-officer.md
  - software/agents/performance-analyzer.md
  - software/agents/test-coverage-validator.md
  - software/agents/documentation-reviewer.md
  - software/agents/dependency-auditor.md
  - software/agents/accessibility-checker.md

outputs:
  - Optimized agent files
  - Agent_Memory/v3_consolidation/phase2/batch3_optimization.log

acceptance_criteria:
  - Same as Task 2.2.1
```

**Task 2.2.4: Optimize Business Domain Agents (10 agents)**
```yaml
task_id: optimize_014
description: Optimize business domain team agents
agent: business-analyst
tier: 2
blocking: false
duration: 4 hours

agents_to_optimize:
  - business/agents/cso.md
  - business/agents/business-development-manager.md
  - business/agents/market-analyst.md
  - business/agents/operations-manager.md
  - business/agents/process-improvement-specialist.md
  - business/agents/supply-chain-manager.md
  - business/agents/quality-manager-business.md
  - business/agents/change-manager.md
  - business/agents/risk-manager.md
  - business/agents/procurement-specialist.md

outputs:
  - Optimized agent files
  - Agent_Memory/v3_consolidation/phase2/batch4_optimization.log

acceptance_criteria:
  - Same as Task 2.2.1
```

**Task 2.2.5: Optimize Creative Domain Agents (8 agents)**
```yaml
task_id: optimize_015
description: Optimize creative domain core agents
agent: editor
tier: 2
blocking: false
duration: 4 hours

agents_to_optimize:
  - creative/agents/cco.md
  - creative/agents/story-architect.md
  - creative/agents/character-designer.md
  - creative/agents/worldbuilder.md
  - creative/agents/prose-stylist.md
  - creative/agents/editor.md
  - creative/agents/dialogue-specialist.md
  - creative/agents/narrative-designer.md

outputs:
  - Optimized agent files
  - Agent_Memory/v3_consolidation/phase2/batch5_optimization.log

acceptance_criteria:
  - Same as Task 2.2.1
```

**Task 2.2.6: Optimize Cross-Domain Agents (7 agents)**
```yaml
task_id: optimize_016
description: Optimize agents shared across multiple domains
agent: senior-developer
tier: 2
blocking: false
duration: 3 hours

agents_to_optimize:
  - planning/agents/cpo.md
  - sales/agents/cro.md
  - marketing/agents/cmo.md
  - finance/agents/cfo.md
  - hr/agents/chro.md
  - legal/agents/general-counsel.md
  - operations/agents/coo.md

outputs:
  - Optimized agent files
  - Agent_Memory/v3_consolidation/phase2/batch6_optimization.log

acceptance_criteria:
  - Same as Task 2.2.1
```

---

### Wave 2.3: Generate Agent Registry (Serial - 1 task)

**Dependencies**: Wave 2.2 complete (all optimizations done)

**Task 2.3.1: Build Complete Agent Registry**
```yaml
task_id: optimize_020
description: Generate agent registry from all optimized agents
agent: data-analyst
tier: 2
blocking: true
duration: 1 hour

inputs:
  - All optimized agent files
  - scripts/generate_registry.py

outputs:
  - Agent_Memory/_system/agent_registry.yaml

acceptance_criteria:
  - All 228 agents cataloged
  - Metadata complete for each agent
  - Searchable by keywords
  - Domain relationships captured
  - Validates against schema

script: |
  python3 scripts/generate_registry.py \
    --scan-all-domains \
    --schema Agent_Memory/_system/schema/agent_registry_schema.yaml \
    --output Agent_Memory/_system/agent_registry.yaml \
    --validate
```

---

### Wave 2.4: Update Universal Planner (Serial - 1 task)

**Dependencies**: Wave 2.3 complete

**Task 2.4.1: Integrate Registry into Universal Planner**
```yaml
task_id: optimize_021
description: Update universal-planner to use agent registry
agent: architect
tier: 2
blocking: true
duration: 2 hours

inputs:
  - core/agents/universal-planner.md
  - Agent_Memory/_system/agent_registry.yaml

outputs:
  - Updated core/agents/universal-planner.md

acceptance_criteria:
  - Planner reads registry instead of scanning files
  - Agent selection uses keyword search
  - Domain filtering works correctly
  - Tier access respected
  - Backward compatible (works without registry if not found)

edits:
  - file: core/agents/universal-planner.md
    section: "### Step 4: Assign Agents to Tasks"
    action: replace
    new_content: |
      1. Read Agent_Memory/_system/agent_registry.yaml
      2. For each task, search registry by keywords
      3. Match task requirements to agent capabilities
      4. Filter by tier_access
      5. For shared agents, verify domain compatibility
      6. Document assignment reasoning
```

---

### Wave 2.5: Validation Checkpoint (Serial - 2 tasks)

**Dependencies**: Wave 2.4 complete

**Task 2.5.1: Measure Size Reduction**
```yaml
task_id: optimize_030
description: Measure plugin size after Phase 2 optimization
agent: data-analyst
tier: 1
blocking: true
duration: 30 minutes

inputs:
  - All optimized agent files
  - Agent_Memory/v3_consolidation/analysis/size_baseline.yaml

outputs:
  - Agent_Memory/v3_consolidation/validation/phase2_size.yaml

acceptance_criteria:
  - Total size calculated
  - Reduction % vs baseline documented
  - Target: <= 3.5 MB (phase 2 target)
  - Per-domain breakdown provided

script: |
  bash scripts/measure_plugin_size.sh \
    --output Agent_Memory/v3_consolidation/validation/phase2_size.yaml \
    --compare-to Agent_Memory/v3_consolidation/analysis/size_baseline.yaml
```

**Task 2.5.2: Validate Phase 2 - Test with Registry**
```yaml
task_id: optimize_031
description: Test all domains using optimized agents and registry
agent: qa-lead
tier: 2
blocking: true
duration: 3 hours

inputs:
  - Optimized agents
  - Agent registry
  - Updated universal-planner
  - tests/workflows/tier_tests.yaml

outputs:
  - Agent_Memory/v3_consolidation/validation/phase2_results.yaml

acceptance_criteria:
  - All 11 domains pass tier 0-2 workflows
  - Planner successfully uses registry
  - Context usage decreased vs Phase 1
  - Success rate >= V2 baseline
  - PASS/FAIL decision documented

script: |
  bash scripts/run_workflow_tests.sh \
    --tiers 0,1,2 \
    --all-domains \
    --measure-context \
    --compare-to Agent_Memory/v3_consolidation/validation/v2_baseline_results.yaml \
    --output Agent_Memory/v3_consolidation/validation/phase2_results.yaml

escalation:
  if: "success_rate < v2_baseline OR size > 3.5MB"
  action: "BLOCK and escalate to tech-lead"
```

---

## Phase 3: Agent Consolidation (Week 3)

### Wave 3.1: Identify and Design Shared Agents (Parallel - 4 tasks)

**Dependencies**: Phase 2 validated

**Task 3.1.1: Identify Duplicate Agents**
```yaml
task_id: consolidate_001
description: Find agents duplicated across multiple domains
agent: data-analyst
tier: 2
blocking: true
duration: 2 hours

inputs:
  - Agent_Memory/_system/agent_registry.yaml

outputs:
  - Agent_Memory/v3_consolidation/phase3/duplicate_agents.yaml

acceptance_criteria:
  - All duplicate agent names identified
  - Domain locations listed
  - Capability comparison completed
  - Consolidation candidates prioritized (45 total)

script: |
  python3 scripts/find_duplicate_agents.py \
    --registry Agent_Memory/_system/agent_registry.yaml \
    --output Agent_Memory/v3_consolidation/phase3/duplicate_agents.yaml \
    --min-duplicates 2
```

**Task 3.1.2: Design Shared Agent Architecture**
```yaml
task_id: consolidate_002
description: Design domain-aware shared agent pattern
agent: architect
tier: 3
blocking: true
duration: 3 hours

inputs:
  - Agent_Memory/v3_consolidation/phase3/duplicate_agents.yaml
  - Sample duplicates (project-manager, customer-success-manager)

outputs:
  - core/templates/shared-agent-template.md
  - Agent_Memory/v3_consolidation/phase3/shared_agent_design.md

acceptance_criteria:
  - Domain adaptation pattern defined
  - Template includes domain-specific sections
  - Collaboration changes by domain
  - Clear examples provided
  - Architect approved

template_sections:
  - Multi-domain frontmatter
  - Core responsibilities (domain-agnostic)
  - Domain adaptations (per domain)
  - Cross-domain collaboration examples
```

**Task 3.1.3: Map Agent Consolidation Plan**
```yaml
task_id: consolidate_003
description: Create detailed consolidation mapping
agent: architect
tier: 2
blocking: true
duration: 3 hours

inputs:
  - Agent_Memory/v3_consolidation/phase3/duplicate_agents.yaml
  - core/templates/shared-agent-template.md

outputs:
  - Agent_Memory/v3_consolidation/phase3/consolidation_plan.yaml

acceptance_criteria:
  - 45 duplicates → 15 shared agents mapped
  - Each shared agent lists source agents
  - Domain compatibility verified
  - Capability union calculated
  - Removal plan defined

consolidation_mapping:
  - shared_agent: project-manager
    domains: [business, planning, operations, software]
    replaces:
      - business/agents/project-manager.md
      - planning/agents/project-manager.md
      - operations/agents/project-manager.md
    capabilities: [union of all 3]
```

**Task 3.1.4: Create Shared Agent Pool Directory**
```yaml
task_id: consolidate_004
description: Set up shared agent infrastructure
agent: senior-developer
tier: 1
blocking: true
duration: 1 hour

outputs:
  - core/agents/shared/ (directory)
  - core/agents/shared/README.md

acceptance_criteria:
  - Directory created
  - README documents purpose
  - Directory structure in place
  - Git tracked

script: |
  mkdir -p core/agents/shared
  cat > core/agents/shared/README.md <<EOF
  # Shared Agent Pool

  Domain-aware agents that work across multiple domains.
  Each agent adapts behavior based on domain context.
  EOF
```

---

### Wave 3.2: Create Shared Agents (Parallel - 5 tasks)

**Dependencies**: Wave 3.1 complete

**Strategy**: Create 15 shared agents in 5 parallel batches

**Task 3.2.1: Create Project Management Shared Agents (3 agents)**
```yaml
task_id: consolidate_011
description: Create shared project-manager, program-manager, change-manager
agent: business-analyst
tier: 2
blocking: false
duration: 4 hours

inputs:
  - Agent_Memory/v3_consolidation/phase3/consolidation_plan.yaml
  - core/templates/shared-agent-template.md
  - Source agents from multiple domains

shared_agents_to_create:
  - name: project-manager
    domains: [business, planning, operations, software]
    replaces: 4 domain-specific versions

  - name: program-manager
    domains: [business, planning]
    replaces: 2 domain-specific versions

  - name: change-manager
    domains: [business, hr, operations]
    replaces: 3 domain-specific versions

outputs:
  - core/agents/shared/project-manager.md
  - core/agents/shared/program-manager.md
  - core/agents/shared/change-manager.md
  - Agent_Memory/v3_consolidation/phase3/batch1_shared.log

acceptance_criteria:
  - Each agent includes domain adaptations
  - All source capabilities preserved
  - Collaboration patterns domain-aware
  - Examples for each domain included
  - Template structure followed
```

**Task 3.2.2: Create Customer-Facing Shared Agents (3 agents)**
```yaml
task_id: consolidate_012
description: Create shared customer-success-manager, account-manager, sales-ops-manager
agent: business-analyst
tier: 2
blocking: false
duration: 4 hours

shared_agents_to_create:
  - name: customer-success-manager
    domains: [business, sales, support]
    replaces: 3 domain-specific versions

  - name: account-manager
    domains: [business, sales, support]
    replaces: 3 domain-specific versions

  - name: sales-operations-manager
    domains: [business, sales, support]
    replaces: 3 domain-specific versions

outputs:
  - core/agents/shared/customer-success-manager.md
  - core/agents/shared/account-manager.md
  - core/agents/shared/sales-operations-manager.md
  - Agent_Memory/v3_consolidation/phase3/batch2_shared.log

acceptance_criteria:
  - Same as Task 3.2.1
```

**Task 3.2.3: Create Analysis Shared Agents (3 agents)**
```yaml
task_id: consolidate_013
description: Create shared business-analyst, market-analyst, operations-analyst
agent: data-analyst
tier: 2
blocking: false
duration: 4 hours

shared_agents_to_create:
  - name: business-analyst
    domains: [business, planning, software]
    replaces: 3 domain-specific versions

  - name: market-analyst
    domains: [business, planning, marketing]
    replaces: 3 domain-specific versions

  - name: operations-analyst
    domains: [business, operations]
    replaces: 2 domain-specific versions

outputs:
  - core/agents/shared/business-analyst.md
  - core/agents/shared/market-analyst.md
  - core/agents/shared/operations-analyst.md
  - Agent_Memory/v3_consolidation/phase3/batch3_shared.log

acceptance_criteria:
  - Same as Task 3.2.1
```

**Task 3.2.4: Create Governance Shared Agents (3 agents)**
```yaml
task_id: consolidate_014
description: Create shared risk-manager, compliance-manager, quality-manager
agent: business-analyst
tier: 2
blocking: false
duration: 4 hours

shared_agents_to_create:
  - name: risk-manager
    domains: [business, operations, finance]
    replaces: 3 domain-specific versions

  - name: compliance-manager
    domains: [business, legal, hr]
    replaces: 3 domain-specific versions

  - name: quality-manager
    domains: [business, operations]
    replaces: 2 domain-specific versions

outputs:
  - core/agents/shared/risk-manager.md
  - core/agents/shared/compliance-manager.md
  - core/agents/shared/quality-manager.md
  - Agent_Memory/v3_consolidation/phase3/batch4_shared.log

acceptance_criteria:
  - Same as Task 3.2.1
```

**Task 3.2.5: Create Operations Shared Agents (3 agents)**
```yaml
task_id: consolidate_015
description: Create shared operations-manager, process-improvement, supply-chain
agent: business-analyst
tier: 2
blocking: false
duration: 4 hours

shared_agents_to_create:
  - name: operations-manager
    domains: [business, operations]
    replaces: 2 domain-specific versions

  - name: process-improvement-specialist
    domains: [business, operations]
    replaces: 2 domain-specific versions

  - name: supply-chain-manager
    domains: [business, operations]
    replaces: 2 domain-specific versions

outputs:
  - core/agents/shared/operations-manager.md
  - core/agents/shared/process-improvement-specialist.md
  - core/agents/shared/supply-chain-manager.md
  - Agent_Memory/v3_consolidation/phase3/batch5_shared.log

acceptance_criteria:
  - Same as Task 3.2.1
```

---

### Wave 3.3: Update Domain Configs (Parallel - 11 tasks)

**Dependencies**: Wave 3.2 complete

**Task 3.3.1-11: Update Each Domain Config**
```yaml
task_id: consolidate_021
description: Update software domain config to reference shared agents
agent: senior-developer
tier: 1
blocking: false
duration: 1 hour

inputs:
  - Agent_Memory/_system/domains/software/planner_config.yaml
  - Agent_Memory/v3_consolidation/phase3/consolidation_plan.yaml

outputs:
  - Updated planner_config.yaml with shared agent references

acceptance_criteria:
  - Shared agents added to available_agents
  - Local duplicates marked for removal
  - Agent paths correct
  - Domain compatibility verified

# Repeat for all 11 domains in parallel
```

---

### Wave 3.4: Remove Duplicate Agents (Serial - 1 task)

**Dependencies**: Wave 3.3 complete

**Task 3.4.1: Remove Consolidated Duplicate Agents**
```yaml
task_id: consolidate_030
description: Delete domain-specific agents replaced by shared agents
agent: senior-developer
tier: 1
blocking: true
duration: 1 hour

inputs:
  - Agent_Memory/v3_consolidation/phase3/consolidation_plan.yaml

outputs:
  - Agent_Memory/v3_consolidation/phase3/removed_duplicates.log

acceptance_criteria:
  - 45 duplicate agents removed
  - Only shared agents remain
  - Git status shows deletions
  - No broken references

script: |
  python3 scripts/remove_duplicate_agents.py \
    --plan Agent_Memory/v3_consolidation/phase3/consolidation_plan.yaml \
    --execute \
    --log Agent_Memory/v3_consolidation/phase3/removed_duplicates.log
```

---

### Wave 3.5: Update Registry and Manifests (Parallel - 2 tasks)

**Dependencies**: Wave 3.4 complete

**Task 3.5.1: Regenerate Agent Registry**
```yaml
task_id: consolidate_041
description: Rebuild registry with shared agents
agent: data-analyst
tier: 1
blocking: false
duration: 1 hour

inputs:
  - All agents (including new shared agents)
  - scripts/generate_registry.py

outputs:
  - Agent_Memory/_system/agent_registry.yaml (updated)

acceptance_criteria:
  - Shared agents cataloged
  - Multi-domain agents marked
  - 228 total agents (was 283)
  - All metadata complete

script: |
  python3 scripts/generate_registry.py \
    --scan-all-domains \
    --include-shared \
    --output Agent_Memory/_system/agent_registry.yaml \
    --validate
```

**Task 3.5.2: Update Plugin Manifests for Shared Agents**
```yaml
task_id: consolidate_042
description: Add shared agents to plugin manifests
agent: senior-developer
tier: 1
blocking: false
duration: 1 hour

inputs:
  - core/agents/shared/*.md
  - .claude-plugin/plugin.json

outputs:
  - Updated plugin manifests

acceptance_criteria:
  - All 15 shared agents added to root manifest
  - Removed duplicates not referenced
  - JSON valid
  - Paths correct

script: |
  python3 scripts/update_plugin_manifests.py \
    --add-shared-agents \
    --remove-duplicates \
    --validate-json
```

---

### Wave 3.6: Validation Checkpoint (Serial - 3 tasks)

**Dependencies**: Wave 3.5 complete

**Task 3.6.1: Measure Size After Consolidation**
```yaml
task_id: consolidate_050
description: Measure plugin size after Phase 3
agent: data-analyst
tier: 1
blocking: true
duration: 30 minutes

outputs:
  - Agent_Memory/v3_consolidation/validation/phase3_size.yaml

acceptance_criteria:
  - Total size <= 2.5 MB
  - Reduction vs Phase 2 documented
  - Per-domain breakdown

script: |
  bash scripts/measure_plugin_size.sh \
    --output Agent_Memory/v3_consolidation/validation/phase3_size.yaml \
    --compare-to Agent_Memory/v3_consolidation/validation/phase2_size.yaml
```

**Task 3.6.2: Test Shared Agents in Each Domain**
```yaml
task_id: consolidate_051
description: Validate shared agents work in all declared domains
agent: qa-lead
tier: 2
blocking: true
duration: 4 hours

inputs:
  - tests/workflows/shared_agent_tests.yaml

outputs:
  - Agent_Memory/v3_consolidation/validation/shared_agent_results.yaml

acceptance_criteria:
  - Each shared agent tested in all its domains
  - Domain adaptation works correctly
  - Collaboration patterns domain-appropriate
  - All tests pass

script: |
  bash scripts/test_shared_agents.sh \
    --test-config tests/workflows/shared_agent_tests.yaml \
    --output Agent_Memory/v3_consolidation/validation/shared_agent_results.yaml
```

**Task 3.6.3: Validate Phase 3 - All Domains**
```yaml
task_id: consolidate_052
description: Test all domains with consolidated agents
agent: qa-lead
tier: 2
blocking: true
duration: 3 hours

inputs:
  - Consolidated agent set
  - Updated registry
  - tests/workflows/tier_tests.yaml

outputs:
  - Agent_Memory/v3_consolidation/validation/phase3_results.yaml

acceptance_criteria:
  - All 11 domains pass tier 0-2 workflows
  - Shared agents correctly assigned
  - Success rate >= V2 baseline
  - PASS/FAIL decision

script: |
  bash scripts/run_workflow_tests.sh \
    --tiers 0,1,2 \
    --all-domains \
    --compare-to Agent_Memory/v3_consolidation/validation/v2_baseline_results.yaml \
    --output Agent_Memory/v3_consolidation/validation/phase3_results.yaml

escalation:
  if: "success_rate < v2_baseline OR size > 2.5MB"
  action: "BLOCK and escalate to tech-lead"
```

---

## Phase 4: Cross-Domain Routing (Week 4)

### Wave 4.1: Design Cross-Domain Infrastructure (Parallel - 3 tasks)

**Dependencies**: Phase 3 validated

**Task 4.1.1: Design Cross-Domain Routing Protocol**
```yaml
task_id: crossdomain_001
description: Design how domains delegate to each other
agent: architect
tier: 3
blocking: true
duration: 4 hours

outputs:
  - Agent_Memory/_system/domains/cross_domain_routing.yaml
  - docs/cross_domain_routing_protocol.md

acceptance_criteria:
  - Routing patterns defined (6+ patterns)
  - Delegation protocol specified
  - Context handoff format defined
  - Result integration protocol defined
  - Error handling specified
  - Architect approved

routing_patterns:
  - business → software (automation)
  - sales → marketing (campaigns)
  - marketing → creative (content)
  - any → finance (analysis)
  - software → planning (roadmaps)
  - multi-domain orchestration
```

**Task 4.1.2: Design Parent-Child Workflow Structure**
```yaml
task_id: crossdomain_002
description: Design Agent_Memory structure for cross-domain workflows
agent: architect
tier: 2
blocking: true
duration: 3 hours

outputs:
  - docs/cross_domain_memory_structure.md
  - Agent_Memory/_system/schema/cross_domain_workflow.yaml

acceptance_criteria:
  - Parent workflow memory structure defined
  - Child workflow memory structure defined
  - Context passing mechanism specified
  - Result aggregation pattern defined
  - Tracking and monitoring defined

memory_structure:
  parent_workflow:
    - workflow/cross_domain/delegations.yaml
    - outputs/aggregated/

  child_workflow:
    - instruction.yaml (includes parent_id)
    - workflow/parent_context/
```

**Task 4.1.3: Create Cross-Domain Routing Config**
```yaml
task_id: crossdomain_003
description: Build routing configuration with triggers and examples
agent: senior-developer
tier: 2
blocking: true
duration: 2 hours

inputs:
  - Agent_Memory/_system/domains/cross_domain_routing.yaml (design)

outputs:
  - Agent_Memory/_system/cross_domain_routing.yaml (implementation)

acceptance_criteria:
  - All 11 domains included
  - Routing triggers defined
  - Target agents listed
  - Examples provided
  - Validates against schema

routing_config:
  business:
    delegates_to:
      software: [triggers, agents, examples]
      finance: [triggers, agents, examples]
      hr: [triggers, agents, examples]
```

---

### Wave 4.2: Implement Cross-Domain Detection (Serial - 2 tasks)

**Dependencies**: Wave 4.1 complete

**Task 4.2.1: Enhance Universal-Executor with Cross-Domain Detection**
```yaml
task_id: crossdomain_011
description: Add cross-domain task detection to universal-executor
agent: architect
tier: 3
blocking: true
duration: 4 hours

inputs:
  - core/agents/universal-executor.md
  - Agent_Memory/_system/cross_domain_routing.yaml

outputs:
  - Updated core/agents/universal-executor.md

acceptance_criteria:
  - Detects when agent not in current domain
  - Checks for cross-domain keywords
  - Triggers child workflow creation
  - Tracks parent-child relationship
  - Handles result integration
  - Error handling included

implementation:
  - Add cross-domain detection step before task execution
  - Invoke trigger agent for child workflows
  - Track delegations in workflow memory
  - Wait for child completion (blocking) or continue (async)
  - Integrate child results into parent outputs
```

**Task 4.2.2: Enhance Trigger Agent with Parent Context Handling**
```yaml
task_id: crossdomain_012
description: Update trigger to handle parent-child workflows
agent: architect
tier: 2
blocking: true
duration: 3 hours

inputs:
  - core/agents/trigger.md
  - docs/cross_domain_routing_protocol.md

outputs:
  - Updated core/agents/trigger.md

acceptance_criteria:
  - Accepts parent_id parameter
  - Reads parent context
  - Creates child instruction with parent linkage
  - Copies relevant context to child
  - Updates parent's delegation tracking
  - Prevents circular dependencies (max depth check)

implementation:
  - Check for parent_id in request
  - If present, read parent instruction
  - Verify no circular delegation
  - Create child instruction with parent references
  - Copy context files to child's parent_context/
  - Update parent's workflow/cross_domain/delegations.yaml
```

---

### Wave 4.3: Add Cross-Domain Examples to Agents (Parallel - 6 tasks)

**Dependencies**: Wave 4.2 complete

**Strategy**: Add cross-domain examples to 20 key agents in 6 batches

**Task 4.3.1: Add to Business Domain Agents (4 agents)**
```yaml
task_id: crossdomain_021
description: Add cross-domain delegation examples to business agents
agent: business-analyst
tier: 2
blocking: false
duration: 3 hours

agents_to_update:
  - business/agents/operations-manager.md
  - business/agents/business-development-manager.md
  - business/agents/process-improvement-specialist.md
  - core/agents/shared/project-manager.md

outputs:
  - Updated agent files with cross-domain examples

acceptance_criteria:
  - Each agent has 2-3 cross-domain examples
  - Examples show delegation to software, finance, hr
  - Context handoff shown
  - Expected deliverables specified

example_pattern: |
  ## Cross-Domain Collaboration Examples

  ### Requesting Software Automation
  ```yaml
  scenario: "Automate invoice approval workflow"
  delegation:
    Task(subagent_type="trigger", prompt=|
      Domain: software
      Parent: {instruction_id}
      Request: Build invoice automation API
      Context: [business requirements]
    )
  ```
```

**Task 4.3.2-6: Add to Other Domain Agents (16 agents total)**
```yaml
# Similar structure for:
# - Sales domain (4 agents)
# - Marketing domain (4 agents)
# - Software domain (4 agents)
# - Planning domain (2 agents)
# - Finance domain (2 agents)
```

---

### Wave 4.4: Validation Checkpoint (Serial - 2 tasks)

**Dependencies**: Wave 4.3 complete

**Task 4.4.1: Test Cross-Domain Workflows**
```yaml
task_id: crossdomain_030
description: Test all cross-domain routing patterns
agent: qa-lead
tier: 3
blocking: true
duration: 6 hours

inputs:
  - tests/workflows/cross_domain_tests.yaml

outputs:
  - Agent_Memory/v3_consolidation/validation/crossdomain_results.yaml

acceptance_criteria:
  - 10+ cross-domain scenarios tested
  - Parent-child workflows created correctly
  - Context passed successfully
  - Results integrated properly
  - No circular dependencies
  - All tests pass

test_scenarios:
  - business → software (automation)
  - sales → marketing (campaign)
  - marketing → creative (content)
  - business → finance (ROI)
  - software → planning (roadmap)
  - planning → multi-domain (product launch)

script: |
  bash scripts/test_cross_domain_workflows.sh \
    --test-config tests/workflows/cross_domain_tests.yaml \
    --output Agent_Memory/v3_consolidation/validation/crossdomain_results.yaml
```

**Task 4.4.2: Validate Phase 4 - Complete System**
```yaml
task_id: crossdomain_031
description: Final validation of complete V3 system
agent: qa-lead
tier: 3
blocking: true
duration: 4 hours

inputs:
  - Complete V3 codebase
  - All test suites

outputs:
  - Agent_Memory/v3_consolidation/validation/phase4_final_results.yaml

acceptance_criteria:
  - All 11 domains pass tier 0-3 workflows
  - Cross-domain workflows functional
  - Shared agents work correctly
  - Size <= 2.5 MB
  - Context usage improved vs V2
  - Success rate >= V2 baseline
  - PASS/FAIL for V3 launch

script: |
  bash scripts/run_complete_validation.sh \
    --tiers 0,1,2,3 \
    --all-domains \
    --include-cross-domain \
    --measure-all-metrics \
    --compare-to Agent_Memory/v3_consolidation/validation/v2_baseline_results.yaml \
    --output Agent_Memory/v3_consolidation/validation/phase4_final_results.yaml

escalation:
  if: "any_failure OR size > 2.5MB"
  action: "ESCALATE to vp-engineering for go/no-go decision"
```

---

## Phase 5: Documentation & Launch (Week 5)

### Wave 5.1: Documentation Updates (Parallel - 5 tasks)

**Dependencies**: Phase 4 validated

**Task 5.1.1: Update CLAUDE.md**
```yaml
task_id: launch_001
description: Update CLAUDE.md with V3 architecture
agent: scribe
tier: 2
blocking: false
duration: 3 hours

inputs:
  - CLAUDE.md
  - V3 consolidation docs

outputs:
  - Updated CLAUDE.md

acceptance_criteria:
  - Version updated to 3.0
  - Agent counts correct (228 total)
  - Shared agents documented
  - Cross-domain routing explained
  - Size reduction mentioned
  - Examples updated
```

**Task 5.1.2: Update README.md**
```yaml
task_id: launch_002
description: Update README with V3 features
agent: scribe
tier: 2
blocking: false
duration: 2 hours

outputs:
  - Updated README.md

acceptance_criteria:
  - V3 features highlighted
  - Cross-domain capabilities explained
  - Installation instructions updated
  - Examples include cross-domain scenarios
```

**Task 5.1.3: Create V3 Migration Guide**
```yaml
task_id: launch_003
description: Document migration from V2 to V3
agent: scribe
tier: 2
blocking: false
duration: 3 hours

outputs:
  - MIGRATION_GUIDE_V3.md

acceptance_criteria:
  - Breaking changes documented
  - Migration steps provided
  - Deprecated features listed
  - New features explained
  - Troubleshooting included
```

**Task 5.1.4: Create Cross-Domain Tutorial**
```yaml
task_id: launch_004
description: Write tutorial for cross-domain workflows
agent: scribe
tier: 2
blocking: false
duration: 3 hours

outputs:
  - docs/CROSS_DOMAIN_TUTORIAL.md

acceptance_criteria:
  - 3+ complete examples
  - Step-by-step instructions
  - Best practices included
  - Common pitfalls documented
```

**Task 5.1.5: Update Plugin Marketplace Listing**
```yaml
task_id: launch_005
description: Update marketplace description with V3 features
agent: scribe
tier: 1
blocking: false
duration: 1 hour

outputs:
  - Updated .claude-plugin/plugin.json description

acceptance_criteria:
  - V3.0 version number
  - New features highlighted
  - Size reduction mentioned
  - Cross-domain capability promoted
```

---

### Wave 5.2: Final Preparation (Serial - 3 tasks)

**Dependencies**: Wave 5.1 complete

**Task 5.2.1: Create V3 Release Notes**
```yaml
task_id: launch_011
description: Write comprehensive V3.0 release notes
agent: scribe
tier: 2
blocking: true
duration: 2 hours

outputs:
  - RELEASE_NOTES_V3.0.md

acceptance_criteria:
  - All changes documented
  - Breaking changes highlighted
  - New features explained
  - Performance improvements listed
  - Migration guide linked
```

**Task 5.2.2: Run Final Validation Suite**
```yaml
task_id: launch_012
description: Execute complete pre-launch validation
agent: qa-lead
tier: 3
blocking: true
duration: 4 hours

inputs:
  - Complete V3 codebase with documentation

outputs:
  - Agent_Memory/v3_consolidation/validation/pre_launch_results.yaml

acceptance_criteria:
  - All tests pass
  - Documentation complete
  - No broken links
  - Plugin manifest valid
  - Size target met
  - Context improvements verified
  - GO/NO-GO decision

script: |
  bash scripts/pre_launch_validation.sh \
    --full-suite \
    --check-documentation \
    --validate-manifests \
    --measure-all-metrics \
    --output Agent_Memory/v3_consolidation/validation/pre_launch_results.yaml

escalation:
  if: "any_failure"
  action: "ESCALATE to vp-engineering - HOLD LAUNCH"
```

**Task 5.2.3: Create Git Release**
```yaml
task_id: launch_013
description: Tag and create V3.0.0 release
agent: tech-lead
tier: 2
blocking: true
duration: 1 hour

inputs:
  - RELEASE_NOTES_V3.0.md
  - Agent_Memory/v3_consolidation/validation/pre_launch_results.yaml (must be PASS)

outputs:
  - Git tag v3.0.0
  - GitHub release

acceptance_criteria:
  - All changes committed
  - Git tag created: v3.0.0
  - GitHub release published
  - Release notes attached
  - All validation passed

script: |
  git add .
  git commit -m "Release V3.0.0: 64% size reduction + cross-domain routing"
  git tag -a v3.0.0 -m "V3.0.0 - Consolidated architecture with cross-domain collaboration"
  git push origin main --tags
  gh release create v3.0.0 --title "V3.0.0 - Consolidated Architecture" --notes-file RELEASE_NOTES_V3.0.md
```

---

## Execution Summary

### Task Breakdown

| Phase | Waves | Tasks | Parallel | Serial | Duration |
|-------|-------|-------|----------|--------|----------|
| Phase 1 | 3 | 9 | 7 | 2 | 1 week |
| Phase 2 | 5 | 16 | 12 | 4 | 1 week |
| Phase 3 | 6 | 22 | 18 | 4 | 1 week |
| Phase 4 | 4 | 16 | 13 | 3 | 1 week |
| Phase 5 | 2 | 8 | 5 | 3 | 3-4 days |
| **Total** | **20** | **71** | **55** | **16** | **4-5 weeks** |

### Parallelization Efficiency

- **77% of tasks can run in parallel** (55/71)
- **Expected speedup**: 3-4x vs sequential execution
- **Critical path**: Validation checkpoints (serial)

### Agent Utilization

| Agent | Tasks Assigned | Workload |
|-------|----------------|----------|
| qa-lead | 8 | Validation checkpoints |
| senior-developer | 12 | Implementation tasks |
| architect | 8 | Design and architecture |
| data-analyst | 6 | Analysis and metrics |
| business-analyst | 8 | Business domain work |
| scribe | 5 | Documentation |
| tech-lead | 2 | Orchestration and release |

### Validation Gates

**5 validation checkpoints** (MUST PASS to proceed):
1. Phase 1: Deprecated agents removed, all domains work
2. Phase 2: Optimization complete, size reduced, registry works
3. Phase 3: Consolidation complete, shared agents work
4. Phase 4: Cross-domain routing functional
5. Pre-launch: Complete system validation

### Rollback Points

Each phase can rollback independently:
```bash
# Rollback to Phase N
git checkout v3-phase-N-validated

# Or rollback specific changes
git checkout main -- <specific-files>
```

---

## How to Execute This Plan

### Option 1: Full Automated Execution

```bash
# Execute entire V3 consolidation workflow
/trigger Execute V3 consolidation plan from V3_EXECUTABLE_WORKFLOW_PLAN.md

# The trigger agent will:
# 1. Parse this plan into executable tasks
# 2. Assign tasks to appropriate agents
# 3. Execute waves in parallel where possible
# 4. Run validation checkpoints
# 5. Report progress and results
```

### Option 2: Phase-by-Phase Execution

```bash
# Execute Phase 1 only
/trigger Execute Phase 1 of V3 consolidation (Cleanup & Analysis)

# After validation, proceed to Phase 2
/trigger Execute Phase 2 of V3 consolidation (Agent Optimization)

# Continue through all phases...
```

### Option 3: Manual Task Assignment

```bash
# Execute specific task
/trigger Execute task cleanup_001 (Extract agent metadata)

# Or assign to specific agent
/trigger Assign task optimize_011 to senior-developer
```

---

## Monitoring Progress

### Progress Tracking

All tasks write to `Agent_Memory/v3_consolidation/`:
```
Agent_Memory/v3_consolidation/
├── analysis/          # Phase 1 analysis outputs
├── phase1/           # Phase 1 task outputs
├── phase2/           # Phase 2 task outputs
├── phase3/           # Phase 3 task outputs
├── phase4/           # Phase 4 task outputs
├── validation/       # All validation results
└── progress.yaml     # Overall progress tracking
```

### Progress Dashboard

```yaml
# Agent_Memory/v3_consolidation/progress.yaml

overall:
  total_tasks: 71
  completed: 0
  in_progress: 0
  pending: 71
  blocked: 0

phases:
  phase1:
    status: pending
    tasks_completed: 0/9
    validation: not_run

  phase2:
    status: pending
    tasks_completed: 0/16
    validation: not_run

  phase3:
    status: pending
    tasks_completed: 0/22
    validation: not_run

  phase4:
    status: pending
    tasks_completed: 0/16
    validation: not_run

  phase5:
    status: pending
    tasks_completed: 0/8
    validation: not_run

current_phase: phase1
current_wave: wave_1.1
```

---

**Status**: Executable Workflow Plan Complete
**Total Tasks**: 71 tasks across 5 phases
**Parallelization**: 77% of tasks can run concurrently
**Estimated Duration**: 4-5 weeks (with parallel execution)
**Ready for**: Automated agent execution via /trigger
