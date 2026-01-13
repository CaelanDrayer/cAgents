# Migration Guide: V4.0 → V5.0

**From**: V4.0 Capability-Based Architecture
**To**: V5.0 Controller-Centric Architecture
**Breaking Changes**: YES (major architectural overhaul)
**Backward Compatibility**: NO (requires full migration)
**Current Status**: DOCUMENTATION ONLY - MIGRATION NOT STARTED

## ⚠️ CRITICAL WARNING

**THIS IS A MIGRATION GUIDE, NOT A COMPLETION REPORT**

The steps below describe HOW to migrate from V4.0 to V5.0, but **MIGRATION HAS NOT BEEN PERFORMED**.

Current completion: **3%** (2 of 18 critical blockers resolved)

**Do NOT follow this guide yet** - V5.0 is not production ready.

See V5_PRODUCTION_READINESS_REPORT.md for current status.

---

## Overview

V5.0 is a complete architectural redesign, not an incremental update. The core coordination pattern changes from capability-based direct assignment to controller-centric question-based delegation.

## Key Changes Summary

| Aspect | V4.0 | V5.0 |
|--------|------|------|
| **Planning** | Detailed task lists | High-level objectives |
| **Agent Organization** | Capability tags | Tier designation (controller/execution) |
| **Coordination** | Executor manages team | Controller coordinates |
| **Task Breakdown** | Planner creates tasks | Controller creates tasks from questions |
| **Delegation** | Direct agent assignment | Question-based delegation |
| **Phases** | 5 phases | 6 phases (added "coordinating") |

## Breaking Changes

### 1. Plan Schema Changed

**V4.0 plan.yaml**:
```yaml
tasks:
  - id: task_001
    name: "Design architecture"
    agent: architect
    dependencies: []
    acceptance_criteria: [...]
```

**V5.0 plan.yaml**:
```yaml
objectives:
  - "Implement OAuth2 authentication"

success_criteria:
  - "OAuth2 endpoints functional"

controller_assignment:
  primary: engineering:engineering-manager
```

**Migration Action**: Update universal-planner to generate V5.0 plan format.

### 2. Agent Frontmatter Changed

**V4.0 agent frontmatter**:
```yaml
name: backend-developer
capabilities: [api_development, database_operations, ...]
domain: engineering
```

**V5.0 agent frontmatter**:
```yaml
name: backend-developer
tier: execution
domain: engineering
specialization: [api_development, database_operations, ...]
reports_to: [engineering-manager, backend-lead]
```

**Migration Action**: Update all 229 agent files with tier designation.

### 3. Executor Role Changed

**V4.0**: Executor spawned execution agents directly
**V5.0**: Executor spawns controllers who spawn execution agents

**Migration Action**: Update universal-executor to monitor controllers, not manage teams.

### 4. New Coordinating Phase

**V4.0 phases**: routing → planning → executing → validating
**V5.0 phases**: routing → planning → **coordinating** → executing → validating

**Migration Action**: Update orchestrator to handle coordinating phase.

### 5. New File: coordination_log.yaml

**V5.0** introduces `workflow/coordination_log.yaml` to track controller Q&A cycles.

**Migration Action**: Controllers must write coordination_log.yaml.

## Migration Steps

### Step 1: Update Core Infrastructure

**Status**: ⚠️ PARTIALLY COMPLETE (50%)

**Completed**:
- ✅ orchestrator.md - V5.0 complete (coordinating phase added)
- ✅ universal-planner.md - V5.0 complete (objective-based planning + controller selection)

**Not Completed**:
- ❌ universal-executor.md - Only 30% complete (73 lines, needs 300+)
  - Missing: Controller monitoring workflow
  - Missing: Progress tracking procedures
  - Missing: Blocker detection logic
  - Missing: Output aggregation steps
  - Missing: Error handling
  - Missing: Examples

- ❌ universal-router.md - Still V2.0
  - Needs: requires_controller field in routing_decision.yaml
  - Needs: V5.0 version update

- ❌ universal-validator.md - Still V2.0
  - Needs: Coordination log validation
  - Needs: V5.0 quality gates
  - Needs: Question-based delegation validation

- ❌ universal-self-correct.md - Still V2.0
  - Needs: Coordination failure correction strategies
  - Needs: V5.0 error recovery patterns

**Estimated Remaining Effort**: 4-6 hours

### Step 2: Create Agent Templates

**Status**: ✅ COMPLETE

- ✅ controller_agent_template.md created (550 lines)
- ✅ execution_agent_template.md created (600 lines)
- ✅ coordination_log_template.yaml created (350 lines)

### Step 3: Migrate Controller Agents

**Status**: ❌ NOT STARTED (0% complete)

**Identified**: 50 controller agents from V5_AGENT_CATALOG.md

**Not Yet Migrated**: All 50 controller agents still have V4.0 frontmatter

**Controller Agents by Domain** (identified but not migrated):
- Engineering (13): cto, vp-engineering, engineering-manager, architect, tech-lead, backend-lead, frontend-lead, qa-lead, devops-lead, data-lead, security-lead, product-owner, scrum-master
- Revenue (8): cro, sales-strategist, marketing-strategist, campaign-manager, product-marketing-manager, sales-enablement-manager, demand-gen-manager, content-strategist
- Creative (4): cco, creative-director, story-architect, editor
- Finance (7): cfo, financial-controller, fp-and-a-manager, operations-manager, process-improvement-lead, supply-chain-manager, procurement-manager
- People (4): chro, talent-acquisition-lead, learning-and-development-lead, employee-relations-lead
- Customer (3): vp-customer-experience, customer-success-manager, support-manager
- Legal (2): general-counsel, compliance-director
- Shared (9): ceo, coo, cso, cpo, strategic-planner, program-manager, project-manager, portfolio-manager, agile-coach

**Migration Required**:
- Add `tier: controller` to frontmatter
- Add `delegates_to: [...]` field
- Add `specialization: [...]` field (replace capabilities)
- Remove `capabilities` field
- Update agent description to emphasize coordination role

**Estimated Effort**: 3-4 hours (50 agents × 4 min each)

### Step 4: Migrate Execution Agents

**Status**: ❌ NOT STARTED (0% complete)

**Identified**: 150 execution agents from V5_AGENT_CATALOG.md

**Not Yet Migrated**: All 150 execution agents still have V4.0 frontmatter

**Execution Agents by Domain** (counts):
- Engineering (25)
- Revenue - Sales (16) + Marketing (16) = 32
- Creative (14)
- Finance (12) + Operations (13) = 25
- People/HR (15)
- Customer (15)
- Legal (12)
- Shared (24)

**Migration Required**:
- Add `tier: execution` to frontmatter
- Add `reports_to: [...]` field
- Add `specialization: [...]` field (replace capabilities)
- Remove `capabilities` field
- Update agent description to emphasize specialist expertise

**Estimated Effort**: 5-6 hours (150 agents × 2.4 min each)

### Step 5: Update Domain Configs

**Status**: ❌ NOT STARTED (0% complete)

**Affected Files**: 18 domain planner_config.yaml files

**Current State**: All configs are V3.0/V4.0 format with:
- task_patterns sections (V4.0 style)
- available_agents lists (V3.0 style)
- NO controller_catalog sections
- NO specialization_mapping sections

**Required Updates**:

```yaml
# Agent_Memory/_system/domains/{domain}/planner_config.yaml

# REMOVE (V4.0):
task_patterns: [...]
available_agents: [...]

# ADD (V5.0):
controller_catalog:
  tier_2_primary: [controller-1, controller-2]
  tier_3_primary: primary-controller
  tier_3_supporting: [specialist-1, specialist-2]
  tier_4_executive: executive-controller
  tier_4_primary: primary-controller
  tier_4_supporting: [specialist-1, specialist-2, specialist-3]

specialization_mapping:
  backend: [backend-lead, backend-developer]
  frontend: [frontend-lead, frontend-developer]
  architecture: [architect]
  security: [security-specialist, security-lead]
  qa: [qa-lead, qa-analyst]
  # ... other specializations
```

**Domains to Update** (18 total):
1. engineering
2. revenue (sales + marketing)
3. creative
4. finance-operations
5. people-culture
6. customer-experience
7. legal-compliance
8. universal/shared
9. + 10 other domain configs

**Estimated Effort**: 4-6 hours (18 domains × 15-20 min each)

### Step 6: Update Documentation

**Status**: ⚠️ PARTIALLY COMPLETE (40%)

**Completed**:
- ✅ V5_ARCHITECTURE.md - Complete architecture design
- ✅ V5_MIGRATION_GUIDE.md - This file (migration instructions)
- ✅ V5_AGENT_CATALOG.md - Agent categorization
- ✅ V5_SUMMARY.md - Quick reference (corrected)
- ✅ V5_ISSUES_FOUND.md - Issue tracking
- ✅ V5_FIXES_APPLIED.md - Fix tracking
- ✅ V5_PRODUCTION_READINESS_REPORT.md - Readiness assessment

**Not Completed**:
- ❌ CLAUDE.md - **STILL DESCRIBES V4.0** (critical)
  - Line 2: Says "V4.0"
  - Architecture section: V4.0 2-tier capability-based
  - Workflow section: V4.0 flow (no coordinating phase)
  - Needs complete rewrite for V5.0

- ❌ README.md - Not reviewed, likely V4.0
- ❌ workflow_agent_interactions.md - Not reviewed, likely V4.0
- ❌ V5_WORKFLOW_EXAMPLES.md - Not created (needed)

**Estimated Effort**: 2-4 hours

### Step 7: Create Schemas and Examples

**Status**: ⚠️ PARTIALLY COMPLETE (50%)

**Completed**:
- ✅ coordination_log_template.yaml - Complete schema

**Not Completed**:
- ❌ plan_v5_schema.yaml - Formal schema for V5.0 plan.yaml
- ❌ V5_WORKFLOW_EXAMPLES.md - End-to-end examples
- ❌ Sample tier 2 workflow files
- ❌ Sample tier 3 workflow files
- ❌ Sample tier 4 workflow files

**Estimated Effort**: 2-3 hours

### Step 8: Testing

**Status**: ❌ NOT STARTED (0% complete)

**Required Tests**:
- [ ] Tier 0 workflow: Direct answer (no controller)
- [ ] Tier 1 workflow: Simple task (direct execution, no controller)
- [ ] Tier 2 workflow: Single controller coordination
- [ ] Tier 3 workflow: Primary + supporting controllers
- [ ] Tier 4 workflow: Executive + multiple controllers + HITL
- [ ] Question-based delegation works
- [ ] Answers synthesized correctly
- [ ] Implementation coordinated by controller
- [ ] Executor monitors controller (not tasks)
- [ ] coordination_log.yaml created correctly
- [ ] All acceptance criteria met
- [ ] Performance benchmarks vs V4.0
- [ ] Token usage analysis

**Estimated Effort**: 2-4 hours

## Detailed Migration: Example Agents

### Migrating a Controller: engineering-manager

**Current State** (V4.0 - NOT YET CHANGED):
```yaml
name: engineering-manager
capabilities: [tactical_planning_backend, task_breakdown_backend, team_mentoring]
domain: engineering
```

**Target State** (V5.0 - NOT YET IMPLEMENTED):
```yaml
name: engineering-manager
tier: controller
domain: engineering
specialization: [coordination, technical_planning, team_management]
delegates_to: [backend-developer, frontend-developer, qa-analyst, devops, security-specialist]
reports_to: universal-executor
```

**New Responsibilities** (V5.0 - when implemented):
- Break objectives into questions
- Delegate questions to execution agents
- Synthesize answers into solution
- Coordinate implementation

**Migration Steps** (not yet performed):
1. Read agent file
2. Add tier: controller
3. Replace capabilities with specialization
4. Add delegates_to field
5. Add reports_to field
6. Update description for V5.0 pattern
7. Save file

### Migrating an Execution Agent: backend-developer

**Current State** (V4.0 - NOT YET CHANGED):
```yaml
name: backend-developer
capabilities: [api_development, database_operations, authentication_systems]
domain: engineering
```

**Target State** (V5.0 - NOT YET IMPLEMENTED):
```yaml
name: backend-developer
tier: execution
domain: engineering
specialization: [api_development, database_operations, authentication_systems]
reports_to: [engineering-manager, backend-lead, tech-lead]
```

**New Responsibilities** (V5.0 - when implemented):
- Answer specific questions from controllers
- Execute implementation tasks assigned by controllers
- Provide expert answers in YAML format

**Migration Steps** (not yet performed):
1. Read agent file
2. Add tier: execution
3. Replace capabilities with specialization
4. Add reports_to field
5. Update description for V5.0 pattern
6. Save file

## Config File Updates

### Router Config (No Major Changes)

Router config stays mostly the same - still classifies tier 0-4.

**Minor Addition Needed**:
- Add requires_controller field to routing_decision.yaml output

### Planner Config (NEW: Controller Catalog)

**Current State** (V3.0/V4.0):
```yaml
# Agent_Memory/_system/domains/engineering/planner_config.yaml
# Version: V3.0

available_agents: [...]
task_patterns: [...]
```

**Target State** (V5.0):
```yaml
# Agent_Memory/_system/domains/engineering/planner_config.yaml
# Version: V5.0

controller_catalog:
  tier_2_primary: [engineering-manager, tech-lead]
  tier_3_primary: engineering-manager
  tier_3_supporting: [architect, backend-lead, frontend-lead, qa-lead, security-specialist, devops-lead]
  tier_4_executive: cto
  tier_4_primary: engineering-manager
  tier_4_supporting: [architect, backend-lead, frontend-lead, qa-lead, security-specialist, devops-lead, data-lead]

specialization_mapping:
  backend: [backend-lead, backend-developer]
  frontend: [frontend-lead, frontend-developer]
  architecture: [architect]
  security: [security-specialist, security-lead]
  qa: [qa-lead, qa-analyst]
  devops: [devops-lead, devops]
```

### Executor Config (SIMPLIFIED)

Executor config simplified - no longer manages task execution directly:

```yaml
# Agent_Memory/_system/domains/engineering/executor_config.yaml

controller_monitoring:
  check_interval: 30  # seconds
  blocker_timeout: 300  # 5 minutes before escalation
  progress_timeout: 600  # 10 minutes no progress = escalate

coordination_patterns:
  question_based:
    enabled: true
    max_questions_per_controller: 40
```

## Rollback Plan

**If V5.0 causes issues, rollback is DIFFICULT** due to breaking changes.

**Recommended Approach**:
1. Keep V4.0 backup of all agents
2. Test V5.0 in isolated instruction first
3. Gradually migrate domains one at a time
4. Keep V4.0 agents accessible during transition

**Rollback Steps** (if needed):
1. Restore V4.0 orchestrator.md, universal-planner.md, universal-executor.md
2. Restore V4.0 agent files
3. Remove V5.0 coordination_log.yaml files
4. Update plan.yaml format back to V4.0 task-based

**Estimated Rollback Time**: 2-4 hours (if V4.0 backups exist)

## Migration Checklist

### Core Infrastructure
- [ ] Complete universal-executor.md (currently 30%)
- [ ] Update universal-router.md to V5.0
- [ ] Update universal-validator.md to V5.0
- [ ] Update universal-self-correct.md to V5.0

### Agent Migration
- [ ] Migrate 50 controller agents (0% complete)
- [ ] Migrate 150 execution agents (0% complete)
- [ ] Verify all agents have tier field
- [ ] Verify all agents have correct reports_to/delegates_to

### Configuration
- [ ] Update 18 domain planner configs (0% complete)
- [ ] Add controller_catalog to all configs
- [ ] Add specialization_mapping to all configs
- [ ] Remove deprecated task_patterns

### Documentation
- [ ] Update CLAUDE.md to V5.0
- [ ] Review/update README.md
- [ ] Review/update workflow_agent_interactions.md
- [ ] Create V5_WORKFLOW_EXAMPLES.md

### Schemas and Examples
- [ ] Create plan_v5_schema.yaml
- [ ] Create tier 2 workflow example
- [ ] Create tier 3 workflow example
- [ ] Create tier 4 workflow example

### Testing
- [ ] Test tier 0-4 workflows
- [ ] Validate question-based delegation
- [ ] Validate coordination_log.yaml creation
- [ ] Benchmark performance vs V4.0
- [ ] Analyze token usage

**Total Checklist Items**: 30
**Completed**: 2
**Remaining**: 28
**Completion**: 7%

## Known Issues

1. **Controllers may ask too many questions**: Set `max_questions_per_controller` limit
2. **Execution agents may give vague answers**: Require YAML format with specific fields
3. **Synthesis may be incomplete**: Require controllers to address all objectives
4. **Executor may lose visibility**: Require controllers to report frequently in coordination_log
5. **Circular delegation risk**: Need prevention mechanism (controller→controller delegation)
6. **Question limit not enforced**: Need enforcement mechanism
7. **Controller stuck handling**: Need timeout and escalation
8. **Multi-domain coordination undefined**: Need cross-domain controller protocol

See V5_ISSUES_FOUND.md for complete issue list (68 issues).

## Estimated Total Migration Effort

| Phase | Tasks | Effort |
|-------|-------|--------|
| Core Infrastructure | 4 agents | 4-6 hours |
| Agent Migration | 200 agents | 8-10 hours |
| Config Updates | 18 configs | 4-6 hours |
| Documentation | 4 files | 2-4 hours |
| Schemas/Examples | 5 items | 2-3 hours |
| Testing | 13 tests | 2-4 hours |
| **TOTAL** | | **22-33 hours** |

## Current Status Summary

**Overall Migration Progress**: 3% complete

**Completed** (3%):
- ✅ Architecture documentation
- ✅ Agent templates
- ✅ Coordination log schema

**In Progress** (0%):
- Nothing currently in progress

**Not Started** (97%):
- ❌ Agent migration (200 agents)
- ❌ Config updates (18 files)
- ❌ Core infrastructure completion
- ❌ Documentation updates
- ❌ Schema creation
- ❌ Example creation
- ❌ Testing

## Support

**Questions**: See V5_ARCHITECTURE.md for detailed design
**Issues**: See V5_ISSUES_FOUND.md for complete issue list
**Status**: See V5_PRODUCTION_READINESS_REPORT.md for assessment

---

**Migration Status**: NOT STARTED
**Completion**: 3% (documentation only)
**Estimated Time to Complete**: 22-33 hours
**Current Recommendation**: Do not migrate yet - complete remaining critical blockers first
