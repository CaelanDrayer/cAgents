# cAgents Recursive Architecture V2.0
## Streamlined Design for Self-Triggering Orchestration

**Date**: 2026-01-10
**Version**: 2.0
**Status**: Design Specification
**Goal**: Enable recursive self-triggering while streamlining the architecture

---

## Executive Summary

### Current State Analysis

**Architecture Overview**:
- **278 agents** across 12 domains (software, business, creative, planning, sales, marketing, finance, operations, hr, legal, support)
- **3-layer structure**: Core (3 agents) → Domain Workflows (5 per domain) → Domain Teams (variable)
- **File-based orchestration**: Agent_Memory system with YAML state management
- **Multi-phase workflow**: Trigger → Router → Planner → Executor → Validator → Self-Correct

**Identified Issues**:

1. **❌ CRITICAL: Missing Workflow Agents** - 7 out of 12 domains are missing the 5 required workflow agents (router, planner, executor, validator, self-correct)
   - ✅ Software: Complete (5 workflow + 46 team agents)
   - ❌ Business: Missing all 5 workflow agents (has 18 team agents)
   - ❌ Creative: Missing all 5 workflow agents (has 17 team agents)
   - ❌ Planning: Missing all 5 workflow agents (has 16 team agents)
   - ❌ Sales: Missing all 5 workflow agents (has 17 team agents)
   - ❌ Marketing: Missing all 5 workflow agents (has 21 team agents)
   - ❌ Finance: Missing all 5 workflow agents (has 16 team agents)
   - ❌ Operations: Missing all 5 workflow agents (has 15 team agents)
   - ❌ HR: Missing all 5 workflow agents (has 19 team agents)
   - ❌ Legal: Missing all 5 workflow agents (has 14 team agents)
   - ❌ Support: Missing all 5 workflow agents (has 15 team agents)

2. **🔴 HIGH: Duplication & Complexity**
   - Each domain duplicates the same 5-agent workflow pattern
   - 55 workflow agents needed (5 × 11 domains) - only 5 exist
   - Massive maintenance burden when workflow logic changes
   - No clear way to invoke workflows recursively

3. **🟡 MEDIUM: Command vs. Agent vs. Skill Confusion**
   - `/trigger` exists as both a command and an agent
   - Skills duplicate command/agent functionality
   - Unclear which entry point to use when

4. **🟡 MEDIUM: Agent_Memory Structure**
   - Well-designed but domain-specific paths hardcoded
   - Inbox structure assumes domain-specific agents
   - Difficult to add new domains dynamically

### Recursive Triggering Requirement

**Goal**: Enable workflows to create sub-workflows automatically

**Use Cases**:
1. **Subtask Decomposition**: Large task creates multiple smaller workflow instructions
2. **Cross-Domain Orchestration**: Software task needs business analysis, triggers business workflow
3. **Iterative Refinement**: Validator finds issues, triggers self-correct workflow
4. **Multi-Phase Projects**: Strategic planner creates execution workflows for each phase
5. **Self-Improvement**: Learning coordinator triggers workflow to update calibration data

**Current Blockers**:
- `/trigger` command cannot be invoked programmatically by agents
- Trigger agent would create infinite loops if it invoked itself
- No clear API for "create child workflow"
- Agent_Memory doesn't support parent-child instruction relationships fully

---

## Proposed Architecture V2.0

### Core Principle: Universal Workflow Kernel

**SHIFT IN THINKING**: Instead of domain-specific workflow agents, create ONE universal workflow kernel that adapts to ANY domain.

```
BEFORE (Current):
Core (3) → Software Workflow (5) → Software Team (46)
Core (3) → Business Workflow (5) → Business Team (18)
Core (3) → Creative Workflow (5) → Creative Team (17)
... 12 domains × 5 workflow agents = 60 workflow agents

AFTER (Proposed):
Core (3) + Universal Workflow (5) → ANY Domain Team (variable)
                ↓
         Domain Configuration Files
```

### 1. Universal Workflow Kernel (5 Agents)

Replace domain-specific workflow agents with **5 universal agents** that adapt based on domain configuration:

#### **universal-router.md** (replaces 12 domain routers)
```yaml
name: universal-router
capabilities:
  - domain_aware_complexity_classification
  - template_library_management
  - tier_assignment_with_domain_context

configuration_driven:
  # Loads domain-specific config from Agent_Memory/_system/domains/{domain}/router_config.yaml

  software_config:
    tier_0_keywords: ["question", "what", "how", "explain"]
    tier_1_simple: ["typo", "comment", "config"]
    tier_2_moderate: ["bug", "test", "refactor"]
    tier_3_complex: ["feature", "api", "integration"]
    tier_4_expert: ["architecture", "migration", "security_audit"]

  business_config:
    tier_0_keywords: ["question", "what", "explain"]
    tier_1_simple: ["report", "dashboard", "query"]
    tier_2_moderate: ["forecast", "analysis", "budget"]
    tier_3_complex: ["strategy", "planning", "transformation"]
    tier_4_expert: ["merger", "restructure", "market_entry"]

  creative_config:
    tier_0_keywords: ["question", "what", "explain"]
    tier_1_simple: ["outline", "summary", "brainstorm"]
    tier_2_moderate: ["chapter", "scene", "character"]
    tier_3_complex: ["novel", "series", "worldbuild"]
    tier_4_expert: ["trilogy", "epic", "franchise"]
```

**How it works**:
1. Reads `instruction.yaml` to get domain field
2. Loads `Agent_Memory/_system/domains/{domain}/router_config.yaml`
3. Applies domain-specific tier classification logic
4. Writes universal routing decision

**Benefits**:
- Single agent handles ALL domains
- Domain logic externalized to config files
- Easy to add new domains (just add config file)
- Can route for domains that don't exist yet

#### **universal-planner.md** (replaces 12 domain planners)
```yaml
name: universal-planner
capabilities:
  - domain_aware_task_decomposition
  - agent_role_mapping_by_domain
  - acceptance_criteria_by_domain_standards

configuration_driven:
  # Loads Agent_Memory/_system/domains/{domain}/planner_config.yaml

  software_config:
    available_agents: [architect, senior-developer, frontend-developer, backend-developer, ...]
    task_patterns:
      implement_api: [design_schema, create_endpoint, write_tests, document_api]
      fix_bug: [reproduce, diagnose, fix, test, document]
    acceptance_templates:
      code_change: [tests_pass, code_review, documentation_updated]

  business_config:
    available_agents: [cso, market-analyst, business-analyst, operations-manager, ...]
    task_patterns:
      create_forecast: [gather_data, analyze_trends, build_model, validate_assumptions]
      strategic_plan: [swot_analysis, define_objectives, create_roadmap, stakeholder_review]
    acceptance_templates:
      business_report: [completeness, data_sources_cited, stakeholder_approval]
```

**How it works**:
1. Reads instruction domain and tier
2. Loads domain planner config
3. Applies domain-specific task decomposition patterns
4. Assigns tasks to domain-specific agents
5. Uses domain-appropriate acceptance criteria

**Benefits**:
- Universal planning logic
- Domain templates in configuration
- Easy to add new task patterns per domain
- Consistent planning structure across domains

#### **universal-executor.md** (replaces 12 domain executors)
```yaml
name: universal-executor
capabilities:
  - domain_aware_agent_invocation
  - cross_domain_coordination
  - universal_output_aggregation
  - recursive_workflow_triggering  # NEW!

features:
  # Can invoke ANY agent from ANY domain
  agent_invocation:
    same_domain: "tasks/in_progress/T1.yaml → assigned_agent: backend-developer"
    cross_domain: "tasks/in_progress/T2.yaml → assigned_agent: business:market-analyst"

  # Can trigger sub-workflows recursively
  recursive_triggering:
    create_child_workflow:
      api: "POST /agent_memory/instructions/create"
      parent_instruction_id: current_instruction_id
      creates: child instruction with parent reference

    example:
      parent: "Implement GDPR compliance"
      child_1: "Technical implementation (domain: software)"
      child_2: "Policy framework (domain: business)"
      child_3: "Legal review (domain: legal)"
```

**How it works**:
1. Reads task assigned_agent field
2. Resolves agent by domain prefix (e.g., `business:cso` → business domain CSO agent)
3. Invokes agent and monitors completion
4. If task requires sub-workflow, creates child instruction
5. Aggregates outputs when all complete

**Benefits**:
- One executor handles all domains
- Natural cross-domain coordination
- Enables recursive workflow creation
- Consistent execution patterns

#### **universal-validator.md** (replaces 12 domain validators)
```yaml
name: universal-validator
capabilities:
  - domain_aware_quality_gates
  - acceptance_criteria_checking
  - domain_specific_validation_rules

configuration_driven:
  # Loads Agent_Memory/_system/domains/{domain}/validator_config.yaml

  software_config:
    quality_checks:
      - tests_pass: required
      - code_coverage: min 80%
      - security_scan: no_critical
      - documentation: present

  business_config:
    quality_checks:
      - completeness: all_sections_present
      - data_sources: cited
      - assumptions: documented
      - stakeholder_approval: obtained

  creative_config:
    quality_checks:
      - word_count: meets_target
      - plot_consistency: no_holes
      - character_arcs: complete
      - continuity: validated
```

**How it works**:
1. Reads instruction domain
2. Loads domain validation config
3. Runs domain-specific quality checks
4. Classifies PASS/FIXABLE/BLOCKED based on domain standards

**Benefits**:
- Universal validation framework
- Domain quality standards in config
- Easy to add new validation rules
- Consistent across domains

#### **universal-self-correct.md** (replaces 12 domain self-correct agents)
```yaml
name: universal-self-correct
capabilities:
  - domain_aware_correction_strategies
  - adaptive_learning_from_failures
  - cross_domain_expert_consultation

configuration_driven:
  # Loads Agent_Memory/_system/domains/{domain}/self_correct_config.yaml

  software_config:
    fixable_issues:
      failing_tests: "re-run executor with test focus"
      code_style: "invoke code-standards-auditor"
      missing_docs: "invoke technical-writer"

  business_config:
    fixable_issues:
      missing_sections: "invoke business-analyst to complete"
      uncited_sources: "invoke market-analyst to add citations"
      incomplete_assumptions: "invoke business-analyst to document"
```

**How it works**:
1. Reads validation report
2. Loads domain self-correct config
3. Applies domain-specific correction strategies
4. May create recursive sub-workflows for complex fixes
5. Re-validates after correction

**Benefits**:
- Universal correction framework
- Domain strategies in config
- Can invoke domain experts
- Learns from corrections

### 2. Recursive Workflow API

Create a formal API for agents to trigger sub-workflows:

```yaml
# New capability for all agents: trigger_child_workflow

trigger_child_workflow:
  api:
    function: create_child_instruction
    parameters:
      parent_instruction_id: string  # Current instruction
      raw_input: string              # Sub-task description
      domain: string                 # Optional: inherit or specify
      priority: normal|high|critical # Optional
      metadata:
        triggered_by: agent_name
        reason: string

  creates:
    # New instruction folder in Agent_Memory/{child_instruction_id}/
    instruction.yaml:
      id: inst_20260110_003
      parent_instruction: inst_20260110_001  # Links to parent
      created_by: universal-executor
      domain: business
      raw_input: "Create Q4 sales forecast"
      ...

  monitoring:
    # Parent instruction tracks child status
    Agent_Memory/{parent_id}/children/
      - child_001.yaml  # Status: in_progress
      - child_002.yaml  # Status: completed

  completion:
    # Parent workflow waits for all children to complete
    # Children outputs aggregated into parent
```

**Integration Points**:
1. **universal-executor**: Creates children when task requires sub-workflow
2. **universal-planner**: Can plan tasks as "create_child_workflow" type
3. **orchestrator**: Monitors parent and all children
4. **any agent**: Can trigger child workflows via standard API

**Recursive Examples**:

```yaml
# Example 1: Cross-domain coordination
Parent Instruction: "Implement GDPR compliance"
  Domain: software
  Triggers Children:
    - Child 1: "Design data encryption strategy" (domain: software)
    - Child 2: "Create GDPR policy framework" (domain: business)
    - Child 3: "Legal compliance review" (domain: legal)
  Aggregates: All 3 children outputs into parent completion

# Example 2: Iterative refinement
Parent Instruction: "Write 50,000 word novel"
  Domain: creative
  Triggers Children:
    - Child 1: "Write chapters 1-5" (5,000 words each)
    - Child 2: "Write chapters 6-10"
    - ...
    - Child 10: "Write chapters 46-50"
  Aggregates: All chapters into complete novel

# Example 3: Self-improvement
Parent Instruction: "Update routing calibration"
  Domain: software
  Triggers Children:
    - Child 1: "Analyze routing accuracy from archive"
    - Child 2: "Identify misclassification patterns"
    - Child 3: "Update router config with learnings"
  Aggregates: New router config deployed
```

### 3. Domain Configuration System

Replace hardcoded domain logic with configuration files:

```
Agent_Memory/_system/domains/
  software/
    router_config.yaml       # Tier classification rules
    planner_config.yaml      # Task patterns and templates
    executor_config.yaml     # Agent capabilities and roles
    validator_config.yaml    # Quality gates and standards
    self_correct_config.yaml # Correction strategies
    agents.yaml              # List of available domain agents

  business/
    router_config.yaml
    planner_config.yaml
    executor_config.yaml
    validator_config.yaml
    self_correct_config.yaml
    agents.yaml

  creative/
    router_config.yaml
    ... (same structure)

  _template/  # Template for new domains
    router_config.yaml.template
    planner_config.yaml.template
    ...
```

**Benefits**:
1. **No code changes to add domains** - Just add config folder
2. **Domain logic is declarative** - Easy to understand and modify
3. **Consistent structure** - All domains use same config schema
4. **Version controlled** - Domain configs in Agent_Memory
5. **Runtime updates** - Change configs without redeploying agents

### 4. Streamlined Entry Points

Eliminate confusion between commands, agents, and skills:

#### **KEEP**:
- `/trigger` **command** - User-facing entry point
- `trigger` **agent** - Programmatic entry point for recursion
- `orchestrator` **agent** - Phase management
- `hitl` **agent** - Human escalation

#### **REMOVE**:
- `/designer` command - Merge into `/trigger` with design mode flag
- `/reviewer` command - Merge into `/trigger` with review mode flag
- `trigger` **skill** - Duplicate of command
- `reviewer` **skill** - Duplicate of command

#### **NEW UNIFIED INTERFACE**:

```yaml
# /trigger becomes the ONLY command
/trigger <request> [--mode=execute|design|review] [--domain=auto|software|business|...]

Examples:
  /trigger Fix the login bug                    # Auto-detect domain, execute
  /trigger Design a sales forecasting system --mode=design  # Interactive design mode
  /trigger Review the auth module --mode=review  # Comprehensive review mode
  /trigger Create Q4 forecast --domain=business  # Force domain
```

```yaml
# trigger agent becomes the programmatic API
Agent Invocation:
  From: universal-executor
  To: trigger agent
  Method: create_child_instruction(raw_input, domain, parent_id)

  This enables recursion without infinite loops:
  - /trigger command → invokes trigger AGENT
  - trigger AGENT can invoke itself for children
  - orchestrator tracks parent-child relationships
```

### 5. Agent Count Reduction

**BEFORE**: 278 agents
- Core: 3
- Workflow (11 domains × 5): 55 (but only 5 exist, 50 missing)
- Team agents: 220

**AFTER**: 228 agents
- Core: 3 (trigger, orchestrator, hitl)
- **Universal Workflow: 5** (router, planner, executor, validator, self-correct)
- Team agents: 220 (unchanged)

**Reduction**: 50 fewer agents (55 → 5 workflow agents)

**Why keep team agents?** They provide domain expertise and specialized capabilities. The universal workflow agents COORDINATE them, not replace them.

### 6. Migration Path

#### **Phase 1: Create Universal Workflow Agents** (Week 1)

1. Create 5 new universal agents in `/home/PathingIT/cAgents/core/agents/`:
   - `universal-router.md`
   - `universal-planner.md`
   - `universal-executor.md`
   - `universal-validator.md`
   - `universal-self-correct.md`

2. Base on existing software workflow agents but with:
   - Domain detection from instruction.yaml
   - Configuration loading from domain configs
   - Cross-domain agent invocation
   - Recursive workflow API

#### **Phase 2: Create Domain Configurations** (Week 1)

1. Create `Agent_Memory/_system/domains/` folder structure

2. Extract software domain configs from existing software workflow agents:
   - Tier rules → `software/router_config.yaml`
   - Task patterns → `software/planner_config.yaml`
   - Agent roles → `software/executor_config.yaml`
   - Quality gates → `software/validator_config.yaml`
   - Correction strategies → `software/self_correct_config.yaml`

3. Create configs for 11 domains (business, creative, planning, sales, marketing, finance, operations, hr, legal, support, software)

4. Create `_template/` folder with blank templates for new domains

#### **Phase 3: Test Universal Workflow** (Week 2)

1. Test software domain (should work identically to current)
2. Test business domain (first time it will work!)
3. Test creative domain
4. Test cross-domain requests
5. Test recursive workflow creation

#### **Phase 4: Update Core Infrastructure** (Week 2)

1. Update `orchestrator` to use universal workflow agents:
   - Remove domain-specific routing (router, planner, etc.)
   - Use universal-router, universal-planner for ALL domains

2. Update `trigger` agent to support recursive API:
   - Add `create_child_instruction()` function
   - Track parent-child relationships
   - Prevent infinite recursion (max depth limit)

3. Update Agent_Memory initialization:
   - Create domain config folders
   - Initialize with templates

#### **Phase 5: Deprecate Domain-Specific Workflow Agents** (Week 3)

1. Mark `software/agents/router.md` as deprecated
2. Mark `software/agents/planner.md` as deprecated
3. Mark `software/agents/executor.md` as deprecated
4. Mark `software/agents/validator.md` as deprecated
5. Mark `software/agents/self-correct.md` as deprecated

6. Leave in codebase for 1 version cycle (backward compatibility)
7. Remove in next major version

#### **Phase 6: Simplify Entry Points** (Week 3)

1. Remove `/designer` command (functionality in `/trigger --mode=design`)
2. Remove `/reviewer` command (functionality in `/trigger --mode=review`)
3. Remove duplicate skills
4. Update documentation

---

## Technical Implementation Details

### Recursive Workflow Prevention

**Problem**: Infinite recursion if not controlled

**Solution**: Max depth limit + cycle detection

```yaml
# In instruction.yaml
recursion_tracking:
  depth: 0          # Root instruction
  max_depth: 5      # System limit
  ancestry: []      # Path from root to current

# Child instruction
recursion_tracking:
  depth: 1
  max_depth: 5
  ancestry: [inst_20260110_001]  # Parent instruction

# Grandchild instruction
recursion_tracking:
  depth: 2
  max_depth: 5
  ancestry: [inst_20260110_001, inst_20260110_003]

# Enforcement in trigger agent
if instruction.depth >= max_depth:
  raise RecursionLimitError("Max recursion depth reached")

if instruction.id in ancestry:
  raise CircularReferenceError("Circular workflow detected")
```

### Cross-Domain Agent Resolution

**Problem**: How does software executor invoke business agent?

**Solution**: Agent registry with domain prefixes

```yaml
# Agent registry format
Agent_Memory/_system/agents/registry.yaml

agents:
  # Core agents (no prefix needed)
  trigger:
    domain: core
    path: core/agents/trigger.md
    capabilities: [workflow_creation, domain_detection]

  # Domain agents (prefix: domain:agent-name)
  "business:cso":
    domain: business
    path: business/agents/cso.md
    capabilities: [strategic_planning, market_analysis]

  "software:backend-developer":
    domain: software
    path: software/agents/backend-developer.md
    capabilities: [api_development, database_design]

# Invocation from universal-executor
assigned_agent: "business:cso"  # In task.yaml

executor.resolve_agent("business:cso"):
  1. Parse prefix → domain = business
  2. Look up in registry → business/agents/cso.md
  3. Invoke via Task tool with subagent_type = "cagents:cso"
```

### Domain Configuration Schema

```yaml
# router_config.yaml schema
domain: business
version: 1.0

tier_classification:
  tier_0:
    keywords: [question, what, how, explain, define]
    patterns: ["What is", "How does", "Explain"]

  tier_1:
    keywords: [report, query, show, display, list]
    complexity: simple_retrieval

  tier_2:
    keywords: [analyze, forecast, budget, plan]
    complexity: standard_analysis

  tier_3:
    keywords: [strategy, design, develop, transform]
    complexity: strategic_planning

  tier_4:
    keywords: [merger, acquisition, restructure, transformation]
    complexity: organizational_change

templates:
  sales_forecast:
    default_tier: 2
    required_entities: [time_period, product, region]

  market_analysis:
    default_tier: 2
    required_entities: [market, competitors]

  strategic_plan:
    default_tier: 3
    required_entities: [objective, timeframe]
```

```yaml
# planner_config.yaml schema
domain: business
version: 1.0

available_agents:
  - cso
  - market-analyst
  - business-analyst
  - operations-manager
  - sales-operations-manager
  - project-manager
  - ...

task_patterns:
  sales_forecast:
    tasks:
      - id: gather_historical_data
        agent: sales-operations-manager
        description: "Collect historical sales data for {time_period}"

      - id: analyze_trends
        agent: market-analyst
        description: "Analyze market trends and pipeline health"
        dependencies: [gather_historical_data]

      - id: build_model
        agent: sales-operations-manager
        description: "Build forecast model with assumptions"
        dependencies: [analyze_trends]

      - id: review_assumptions
        agent: business-analyst
        description: "Document and validate assumptions"
        dependencies: [build_model]

    acceptance_criteria:
      - revenue_forecast_present
      - assumptions_documented
      - data_sources_cited
      - stakeholder_reviewed
```

### Parent-Child Workflow Coordination

```yaml
# Parent instruction tracks children
Agent_Memory/inst_20260110_001/children/

child_workflows.yaml:
  total: 3
  completed: 1
  in_progress: 2
  blocked: 0

  children:
    - id: inst_20260110_003
      domain: software
      status: completed
      created_at: 2026-01-10T08:00:00Z
      completed_at: 2026-01-10T08:45:00Z

    - id: inst_20260110_004
      domain: business
      status: in_progress
      created_at: 2026-01-10T08:05:00Z

    - id: inst_20260110_005
      domain: legal
      status: in_progress
      created_at: 2026-01-10T08:10:00Z

# Orchestrator logic
if parent_instruction.has_children:
  # Wait for all children to complete before moving parent to validation
  while not all_children_completed():
    check_children_status()

  # Aggregate children outputs into parent
  aggregate_outputs_from_children()

  # Proceed with parent validation
  transition_to_validation()
```

---

## Benefits of V2 Architecture

### 1. Scalability
- **Add new domains in minutes**: Just create config folder
- **No code changes**: Domain logic is declarative
- **11 domains → 50 domains**: Same 5 universal agents handle all

### 2. Maintainability
- **Single workflow implementation**: Fix bug once, all domains benefit
- **Centralized logic**: Workflow patterns in one place
- **Easy updates**: Change config files, not agent code

### 3. Recursion Enabled
- **Sub-workflows**: Any agent can trigger child workflows
- **Cross-domain**: Parent software workflow can spawn business children
- **Iterative**: Self-correct can create fix workflows
- **Hierarchical**: Complex projects decompose into nested workflows

### 4. Reduced Complexity
- **278 → 228 agents**: 50 fewer agents to maintain
- **55 → 5 workflow agents**: 91% reduction in workflow complexity
- **1 entry point**: `/trigger` command replaces 3 commands
- **Clear boundaries**: Core vs. Universal vs. Domain teams

### 5. Performance
- **No duplication**: Universal agents loaded once, not 11 times
- **Config caching**: Domain configs loaded on first use, cached
- **Parallel children**: Child workflows execute concurrently
- **Efficient routing**: Single router handles all domains

### 6. Flexibility
- **Mode flags**: Design, execute, review modes in one command
- **Domain override**: Force specific domain when auto-detect fails
- **Custom configs**: Per-project domain configuration overrides
- **Plugin architecture**: Domains as pluggable modules

---

## Migration Effort Estimate

### Phase 1: Universal Workflow Agents
- **Effort**: 24-32 hours
- **Complexity**: Medium (adapt existing software agents)
- **Risk**: Low (can run in parallel with existing)

### Phase 2: Domain Configurations
- **Effort**: 40-56 hours (11 domains × 5 configs each)
- **Complexity**: Medium (extract logic from docs and design)
- **Risk**: Medium (defines behavior, needs validation)

### Phase 3: Testing
- **Effort**: 16-24 hours
- **Complexity**: Medium
- **Risk**: High (ensures correctness)

### Phase 4: Core Infrastructure Updates
- **Effort**: 16-24 hours
- **Complexity**: High (orchestrator, trigger, Agent_Memory)
- **Risk**: High (affects all workflows)

### Phase 5: Deprecation
- **Effort**: 4-8 hours
- **Complexity**: Low
- **Risk**: Low

### Phase 6: Entry Point Simplification
- **Effort**: 8-12 hours
- **Complexity**: Low
- **Risk**: Low

**Total Effort**: 108-156 hours (3-4 weeks for one developer)

---

## Success Criteria

### Functional Requirements
✅ All 12 domains work end-to-end
✅ Workflows can create child workflows
✅ Cross-domain coordination works
✅ Backward compatible with existing software workflows
✅ Configuration changes take effect immediately

### Performance Requirements
✅ Workflow startup time < 5 seconds
✅ Domain config loading < 100ms
✅ Support 10+ concurrent parent workflows
✅ Support 50+ concurrent child workflows

### Quality Requirements
✅ Zero infinite recursion bugs
✅ No circular workflow dependencies
✅ 100% test coverage on universal agents
✅ Domain configs validated against schema

### Documentation Requirements
✅ Updated CLAUDE.md with V2 architecture
✅ Domain configuration guide
✅ Recursive workflow examples
✅ Migration guide for users

---

## Next Steps

1. **Review and Approve**: Get stakeholder buy-in on architecture
2. **Prototype**: Create one universal agent (router) + one domain config (software)
3. **Validate**: Test prototype with existing software workflows
4. **Implement**: Full Phase 1-6 implementation
5. **Deploy**: Release as v6.0.0 major version
6. **Monitor**: Track performance and issues
7. **Iterate**: Refine based on real-world usage

---

## Appendix: File Structure After V2

```
cAgents/
├── core/
│   ├── agents/
│   │   ├── trigger.md              # Programmatic workflow creation API
│   │   ├── orchestrator.md         # Phase management
│   │   ├── hitl.md                 # Human escalation
│   │   ├── universal-router.md     # NEW: Universal complexity classification
│   │   ├── universal-planner.md    # NEW: Universal task decomposition
│   │   ├── universal-executor.md   # NEW: Universal execution + recursion
│   │   ├── universal-validator.md  # NEW: Universal quality gates
│   │   └── universal-self-correct.md # NEW: Universal correction
│   │
│   ├── commands/
│   │   └── trigger.md              # ONLY command (design/review modes included)
│   │
│   └── .claude-plugin/plugin.json
│
├── software/
│   ├── agents/
│   │   ├── [DEPRECATED] router.md
│   │   ├── [DEPRECATED] planner.md
│   │   ├── [DEPRECATED] executor.md
│   │   ├── [DEPRECATED] validator.md
│   │   ├── [DEPRECATED] self-correct.md
│   │   ├── architect.md
│   │   ├── senior-developer.md
│   │   ├── backend-developer.md
│   │   └── ... (41 more team agents)
│   │
│   └── .claude-plugin/plugin.json
│
├── business/
│   ├── agents/
│   │   ├── cso.md
│   │   ├── market-analyst.md
│   │   └── ... (18 team agents, NO workflow agents needed)
│   │
│   └── .claude-plugin/plugin.json
│
├── [creative, planning, sales, marketing, finance, operations, hr, legal, support]/
│   └── agents/
│       └── ... (team agents only, NO workflow agents needed)
│
├── Agent_Memory/
│   ├── _system/
│   │   ├── domains/
│   │   │   ├── software/
│   │   │   │   ├── router_config.yaml
│   │   │   │   ├── planner_config.yaml
│   │   │   │   ├── executor_config.yaml
│   │   │   │   ├── validator_config.yaml
│   │   │   │   └── self_correct_config.yaml
│   │   │   │
│   │   │   ├── business/
│   │   │   │   └── ... (same 5 config files)
│   │   │   │
│   │   │   ├── [10 more domains]/
│   │   │   │   └── ... (same 5 config files each)
│   │   │   │
│   │   │   └── _template/
│   │   │       └── ... (template config files for new domains)
│   │   │
│   │   └── agents/
│   │       └── registry.yaml  # Universal agent registry
│   │
│   └── {instruction_id}/
│       ├── children/
│       │   └── child_workflows.yaml  # NEW: Track child workflows
│       └── ...
│
├── README.md
├── CLAUDE.md
└── RECURSIVE_ARCHITECTURE_V2.md  # This document
```

---

**End of Design Specification**
