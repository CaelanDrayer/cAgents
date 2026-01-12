# Migration Guide: V4.0 → V5.0

**From**: V4.0 Capability-Based Architecture
**To**: V5.0 Controller-Centric Architecture
**Breaking Changes**: YES (major architectural overhaul)
**Backward Compatibility**: NO (requires full migration)

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

### Step 1: Update Core Infrastructure (COMPLETED)

- ✅ Update orchestrator.md with coordinating phase
- ✅ Update universal-planner.md for objective-based planning + controller selection
- ✅ Update universal-executor.md for controller monitoring

### Step 2: Create Controller Agents (COMPLETED)

- ✅ Create controller agent template
- ✅ Identify 50 controller agents from existing 229 agents
- ✅ Update controller agents with V5.0 pattern

**Controller Agents by Domain**:
- Engineering: engineering-manager, architect, tech-lead, backend-lead, frontend-lead, qa-lead, devops-lead, security-lead
- Revenue: cro, sales-strategist, marketing-strategist, campaign-manager
- Creative: cco, creative-director, story-architect, editor
- Finance: cfo, financial-controller, fp-and-a-manager
- Operations: coo, operations-manager
- HR: chro, talent-acquisition-lead
- Legal: general-counsel, compliance-director

### Step 3: Update Execution Agents (COMPLETED)

- ✅ Create execution agent template
- ✅ Categorize 150 execution agents
- ✅ Update execution agents for question-answering pattern

**Execution Agents**: backend-developer, frontend-developer, qa-analyst, copywriter, financial-analyst, recruiter, support-agent, etc.

### Step 4: Update Domain Configs (IN PROGRESS)

Update all domain router/planner configs with controller assignments:

```yaml
# Agent_Memory/_system/domains/engineering/planner_config.yaml

controller_catalog:
  tier_2: [engineering-manager, tech-lead]
  tier_3_primary: engineering-manager
  tier_3_supporting: [architect, backend-lead, frontend-lead, qa-lead, security-specialist]
  tier_4_executive: cto
  tier_4_primary: engineering-manager
```

### Step 5: Update Documentation (IN PROGRESS)

- ✅ Create V5_ARCHITECTURE.md
- ✅ Create V5_MIGRATION_GUIDE.md (this file)
- ✅ Create V5_AGENT_CATALOG.md
- 🔄 Update CLAUDE.md to V5.0
- 🔄 Update README.md
- 🔄 Update workflow_agent_interactions.md

### Step 6: Testing

Test all tier workflows:
- Tier 0: Direct answer (no changes)
- Tier 1: Direct execution (no controller)
- Tier 2: Single controller coordination
- Tier 3: Primary + supporting controllers
- Tier 4: Executive + multiple controllers

## Detailed Migration: Example Agents

### Migrating a Controller: engineering-manager

**V4.0** (capability-based):
```yaml
name: engineering-manager
capabilities: [tactical_planning_backend, task_breakdown_backend, team_mentoring]
domain: engineering
```

**V5.0** (controller-centric):
```yaml
name: engineering-manager
tier: controller
domain: engineering
specialization: [coordination, technical_planning, team_management]
delegates_to: [backend-developer, frontend-developer, qa-analyst, devops, security-specialist]
reports_to: universal-executor
```

**New Responsibilities** (V5.0):
- Break objectives into questions
- Delegate questions to execution agents
- Synthesize answers into solution
- Coordinate implementation

### Migrating an Execution Agent: backend-developer

**V4.0**:
```yaml
name: backend-developer
capabilities: [api_development, database_operations, authentication_systems]
domain: engineering
```

**V5.0**:
```yaml
name: backend-developer
tier: execution
domain: engineering
specialization: [api_development, database_operations, authentication_systems]
reports_to: [engineering-manager, backend-lead, tech-lead]
```

**New Responsibilities** (V5.0):
- Answer specific questions from controllers
- Execute implementation tasks assigned by controllers
- Provide expert answers in YAML format

## Config File Updates

### Router Config (No Major Changes)

Router config stays mostly the same - still classifies tier 0-4.

### Planner Config (NEW: Controller Catalog)

Add controller catalog section:

```yaml
# Agent_Memory/_system/domains/engineering/planner_config.yaml

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

## Testing Checklist

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

## Known Issues

1. **Controllers may ask too many questions**: Set `max_questions_per_controller` limit
2. **Execution agents may give vague answers**: Require YAML format with specific fields
3. **Synthesis may be incomplete**: Require controllers to address all objectives
4. **Executor may lose visibility**: Require controllers to report frequently in coordination_log

## Support

**Questions**: See V5_ARCHITECTURE.md for detailed design
**Issues**: File issue with V5.0 label
**Discussions**: Use V5.0 migration discussion thread

---

**Migration Status**: In Progress
**Completion**: 70% (core infra + templates done, docs in progress)
**Remaining**: Domain configs, final documentation updates, testing
