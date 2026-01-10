# cAgents V2.0 Implementation Roadmap
## From Current State to Recursive Universal Architecture

**Date**: 2026-01-10
**Target Version**: 6.0.0
**Implementation Time**: 3-4 weeks
**Reference**: See RECURSIVE_ARCHITECTURE_V2.md for full design

---

## Overview

This roadmap guides the transformation from the current domain-specific workflow architecture to a streamlined universal workflow system with recursive capabilities.

**Key Goals**:
1. ✅ Enable recursive workflow triggering (workflows creating sub-workflows)
2. ✅ Reduce maintenance burden (55 workflow agents → 5 universal agents)
3. ✅ Complete all 12 domains (currently only software domain works)
4. ✅ Simplify entry points (3 commands → 1 unified command)
5. ✅ Improve scalability (add new domains via config files, not code)

---

## Critical Path

### Week 1: Foundation & Universal Workflow Core

#### Day 1-2: Universal Router
- **Create**: `core/agents/universal-router.md`
- **Based on**: `software/agents/router.md`
- **Key Changes**:
  - Add domain detection from `instruction.yaml`
  - Load config from `Agent_Memory/_system/domains/{domain}/router_config.yaml`
  - Apply domain-specific tier classification
  - Support 12 domains dynamically

- **Create**: `Agent_Memory/_system/domains/software/router_config.yaml`
- **Extract**: Tier rules from software router agent
- **Test**: Software domain routing (should match current behavior)

**Deliverable**: Universal router works for software domain

#### Day 3-4: Universal Planner
- **Create**: `core/agents/universal-planner.md`
- **Based on**: `software/agents/planner.md`
- **Key Changes**:
  - Load domain config for task patterns
  - Resolve agent names with domain prefixes
  - Support cross-domain agent assignment
  - Domain-aware acceptance criteria

- **Create**: `Agent_Memory/_system/domains/software/planner_config.yaml`
- **Extract**: Task patterns from software planner
- **Test**: Software domain planning

**Deliverable**: Universal planner works for software domain

#### Day 5-7: Universal Executor + Recursion API
- **Create**: `core/agents/universal-executor.md`
- **Based on**: `software/agents/executor.md`
- **Key Changes**:
  - Cross-domain agent invocation (parse `domain:agent-name`)
  - **Recursive workflow API**: `create_child_instruction()` function
  - Parent-child instruction tracking
  - Child workflow aggregation

- **Create**: `Agent_Memory/_system/domains/software/executor_config.yaml`
- **Update**: `trigger` agent with recursive API support
- **Update**: `orchestrator` to track parent-child workflows
- **Test**:
  - Software domain execution
  - Create child workflow (manual test)
  - Parent waits for child completion

**Deliverable**: Universal executor works + basic recursion works

### Week 2: Universal Validation & Domain Expansion

#### Day 8-9: Universal Validator & Self-Correct
- **Create**: `core/agents/universal-validator.md`
- **Based on**: `software/agents/validator.md`
- **Key Changes**:
  - Load validation rules from domain config
  - Domain-aware quality gates
  - PASS/FIXABLE/BLOCKED classification

- **Create**: `core/agents/universal-self-correct.md`
- **Based on**: `software/agents/self-correct.md`
- **Key Changes**:
  - Load correction strategies from domain config
  - Can trigger child workflows for complex fixes
  - Domain-aware expert consultation

- **Create**:
  - `Agent_Memory/_system/domains/software/validator_config.yaml`
  - `Agent_Memory/_system/domains/software/self_correct_config.yaml`

**Deliverable**: Complete universal workflow (5 agents) for software domain

#### Day 10-12: Business Domain Configuration
- **Create**: `Agent_Memory/_system/domains/business/` folder
- **Create** 5 config files:
  - `router_config.yaml` - Business complexity tiers
  - `planner_config.yaml` - Business task patterns (forecast, analysis, strategy)
  - `executor_config.yaml` - Business agent capabilities
  - `validator_config.yaml` - Business quality gates
  - `self_correct_config.yaml` - Business correction strategies

- **Test**: Business domain end-to-end
  - `/trigger Create Q4 sales forecast` (should work for first time!)
  - Verify router, planner, executor, validator all work
  - Verify business agents are invoked correctly

**Deliverable**: Business domain fully functional

#### Day 13-14: Creative & Planning Domain Configurations
- **Create**:
  - `Agent_Memory/_system/domains/creative/` (5 config files)
  - `Agent_Memory/_system/domains/planning/` (5 config files)

- **Test**:
  - `/trigger Write a short story about AI` (creative)
  - `/trigger Create Q2 strategic plan` (planning)

**Deliverable**: 4 domains working (software, business, creative, planning)

### Week 3: Remaining Domains & Orchestrator Updates

#### Day 15-17: 8 Remaining Domain Configurations
- **Create** config folders for:
  - Sales
  - Marketing
  - Finance
  - Operations
  - HR
  - Legal
  - Support
  - (Keep software as completed)

- **Effort**: ~4-6 hours per domain × 7 domains = 28-42 hours
- **Parallel work recommended**: Split across multiple contributors

**Deliverable**: All 12 domains configured and tested

#### Day 18-19: Orchestrator & Agent_Memory Updates
- **Update**: `core/agents/orchestrator.md`
  - Remove domain-specific routing (use universal agents for ALL domains)
  - Add parent-child workflow monitoring
  - Aggregate child outputs before parent validation
  - Support recursive workflow completion

- **Update**: `core/agents/trigger.md`
  - Add `create_child_instruction()` API
  - Track recursion depth (prevent infinite loops)
  - Support domain override parameter
  - Link parent-child in instruction.yaml

- **Update**: Agent_Memory initialization
  - Create `_system/domains/` folder structure
  - Create `_system/agents/registry.yaml`
  - Initialize domain configs from templates

**Deliverable**: Core infrastructure supports universal workflows + recursion

#### Day 20-21: Testing & Validation
- **Test Scenarios**:
  1. **Single domain**: Software, business, creative requests
  2. **Cross-domain**: "Implement GDPR compliance" (software + business + legal)
  3. **Recursive**: Large task spawns child workflows
  4. **Iterative**: Self-correct triggers fix workflow
  5. **Parallel**: Multiple children execute concurrently
  6. **Deep recursion**: 3+ levels of nesting
  7. **Circular prevention**: Detect and block circular workflows

- **Regression Testing**:
  - Existing software workflows still work
  - Backward compatibility maintained
  - Performance within acceptable range

**Deliverable**: All test scenarios pass

### Week 4: Entry Point Simplification & Documentation

#### Day 22: Unified /trigger Command
- **Update**: `core/commands/trigger.md`
  - Add `--mode` parameter (execute, design, review)
  - Add `--domain` parameter (auto, software, business, etc.)
  - Add `--recursive` parameter (true/false)
  - Merge `/designer` functionality into `--mode=design`
  - Merge `/reviewer` functionality into `--mode=review`

- **Examples**:
  ```bash
  /trigger Fix login bug                           # Auto mode
  /trigger Design user dashboard --mode=design     # Interactive design
  /trigger Review auth module --mode=review        # Comprehensive review
  /trigger Create forecast --domain=business       # Force domain
  ```

**Deliverable**: Unified command interface

#### Day 23: Deprecation & Cleanup
- **Mark Deprecated**:
  - `software/agents/router.md` → Add deprecation notice
  - `software/agents/planner.md` → Add deprecation notice
  - `software/agents/executor.md` → Add deprecation notice
  - `software/agents/validator.md` → Add deprecation notice
  - `software/agents/self-correct.md` → Add deprecation notice
  - `core/commands/designer.md` → Redirect to `/trigger --mode=design`
  - `core/commands/reviewer.md` → Redirect to `/trigger --mode=review`

- **Update**: Plugin manifests to point to universal agents
- **Plan**: Remove deprecated agents in v7.0.0 (next major version)

**Deliverable**: Clean deprecation path

#### Day 24-28: Documentation
- **Update**: `README.md`
  - New architecture overview
  - Universal workflow system
  - Recursive capabilities
  - Simplified commands

- **Update**: `CLAUDE.md`
  - V2 architecture
  - Domain configuration system
  - Recursive workflow API
  - Migration from V1

- **Create**: `docs/DOMAIN_CONFIGURATION_GUIDE.md`
  - How to create new domain
  - Config file schemas
  - Testing checklist
  - Best practices

- **Create**: `docs/RECURSIVE_WORKFLOWS.md`
  - Recursion API reference
  - Parent-child patterns
  - Use cases and examples
  - Anti-patterns (infinite loops)

- **Create**: `docs/MIGRATION_GUIDE_V1_TO_V2.md`
  - Breaking changes
  - Compatibility notes
  - Upgrade path
  - Rollback procedure

**Deliverable**: Complete documentation for V2

---

## File Creation Checklist

### Core Universal Agents (5 files)
- [ ] `core/agents/universal-router.md`
- [ ] `core/agents/universal-planner.md`
- [ ] `core/agents/universal-executor.md`
- [ ] `core/agents/universal-validator.md`
- [ ] `core/agents/universal-self-correct.md`

### Domain Configuration Template (5 files)
- [ ] `Agent_Memory/_system/domains/_template/router_config.yaml.template`
- [ ] `Agent_Memory/_system/domains/_template/planner_config.yaml.template`
- [ ] `Agent_Memory/_system/domains/_template/executor_config.yaml.template`
- [ ] `Agent_Memory/_system/domains/_template/validator_config.yaml.template`
- [ ] `Agent_Memory/_system/domains/_template/self_correct_config.yaml.template`

### Software Domain Configs (5 files)
- [ ] `Agent_Memory/_system/domains/software/router_config.yaml`
- [ ] `Agent_Memory/_system/domains/software/planner_config.yaml`
- [ ] `Agent_Memory/_system/domains/software/executor_config.yaml`
- [ ] `Agent_Memory/_system/domains/software/validator_config.yaml`
- [ ] `Agent_Memory/_system/domains/software/self_correct_config.yaml`

### 11 Domain Configs (55 files total)
- [ ] Business domain (5 configs)
- [ ] Creative domain (5 configs)
- [ ] Planning domain (5 configs)
- [ ] Sales domain (5 configs)
- [ ] Marketing domain (5 configs)
- [ ] Finance domain (5 configs)
- [ ] Operations domain (5 configs)
- [ ] HR domain (5 configs)
- [ ] Legal domain (5 configs)
- [ ] Support domain (5 configs)
- [ ] Software domain (completed above)

### Infrastructure Updates
- [ ] Update `core/agents/trigger.md` (recursive API)
- [ ] Update `core/agents/orchestrator.md` (parent-child tracking)
- [ ] Update `core/commands/trigger.md` (unified interface)
- [ ] Create `Agent_Memory/_system/agents/registry.yaml`
- [ ] Update `Agent_Memory` initialization logic

### Documentation
- [ ] `README.md` (V2 overview)
- [ ] `CLAUDE.md` (V2 architecture)
- [ ] `docs/DOMAIN_CONFIGURATION_GUIDE.md`
- [ ] `docs/RECURSIVE_WORKFLOWS.md`
- [ ] `docs/MIGRATION_GUIDE_V1_TO_V2.md`
- [ ] `RECURSIVE_ARCHITECTURE_V2.md` (already created)
- [ ] `IMPLEMENTATION_ROADMAP.md` (this file)

**Total New Files**: ~82 files
**Total Updates**: ~7 files

---

## Testing Strategy

### Unit Tests (Per Universal Agent)
```yaml
universal-router:
  - test_software_domain_tier_classification
  - test_business_domain_tier_classification
  - test_creative_domain_tier_classification
  - test_domain_config_loading
  - test_fallback_on_missing_config

universal-planner:
  - test_software_task_decomposition
  - test_business_task_decomposition
  - test_cross_domain_agent_assignment
  - test_acceptance_criteria_generation

universal-executor:
  - test_same_domain_agent_invocation
  - test_cross_domain_agent_invocation
  - test_create_child_workflow
  - test_parent_waits_for_children
  - test_child_output_aggregation
  - test_recursion_depth_limit
  - test_circular_reference_prevention

universal-validator:
  - test_software_quality_gates
  - test_business_quality_gates
  - test_pass_fixable_blocked_classification

universal-self-correct:
  - test_software_correction_strategies
  - test_business_correction_strategies
  - test_recursive_fix_workflows
```

### Integration Tests (End-to-End)
```yaml
single_domain:
  - test_software_bug_fix_workflow
  - test_business_forecast_workflow
  - test_creative_story_writing_workflow

cross_domain:
  - test_gdpr_compliance (software + business + legal)
  - test_product_launch (marketing + sales + product)
  - test_hiring_process (hr + operations)

recursive:
  - test_large_novel_chapters (parent spawns 10 child workflows)
  - test_self_correct_triggers_fix_workflow
  - test_strategic_plan_spawns_execution_workflows

performance:
  - test_10_concurrent_workflows
  - test_50_concurrent_child_workflows
  - test_recursion_depth_5_levels

edge_cases:
  - test_max_recursion_depth_prevention
  - test_circular_workflow_detection
  - test_missing_domain_config_fallback
  - test_malformed_domain_config_error
```

---

## Risk Management

### High Risk
1. **Breaking existing software workflows**
   - **Mitigation**: Keep domain-specific agents for 1 version cycle
   - **Rollback**: Can revert to v5.0 if critical issues

2. **Infinite recursion bugs**
   - **Mitigation**: Max depth limit + circular reference detection
   - **Monitoring**: Log recursion depth, alert on depth > 3

3. **Performance degradation**
   - **Mitigation**: Cache domain configs, benchmark before/after
   - **Threshold**: Workflow startup < 5 seconds

### Medium Risk
1. **Domain config errors**
   - **Mitigation**: YAML schema validation on load
   - **Testing**: Validate all configs before release

2. **Cross-domain agent resolution failures**
   - **Mitigation**: Comprehensive agent registry
   - **Fallback**: Error message with available agents

3. **Parent-child workflow coordination bugs**
   - **Mitigation**: Extensive integration tests
   - **Logging**: Track parent-child lifecycle

### Low Risk
1. **Documentation gaps**
   - **Mitigation**: Peer review of all docs
   - **Validation**: Test tutorials with new users

2. **Migration confusion**
   - **Mitigation**: Clear migration guide
   - **Support**: Office hours for questions

---

## Success Metrics

### Functional Goals
- ✅ All 12 domains pass end-to-end tests
- ✅ Recursive workflows work 3+ levels deep
- ✅ Cross-domain coordination validated
- ✅ Zero infinite recursion incidents
- ✅ Backward compatibility maintained

### Performance Goals
- ✅ Workflow startup time < 5 seconds (target: 2 seconds)
- ✅ Domain config load time < 100ms
- ✅ Support 10+ concurrent parent workflows
- ✅ Support 50+ concurrent child workflows
- ✅ No memory leaks in long-running workflows

### Quality Goals
- ✅ 100% test coverage on universal agents
- ✅ All domain configs schema-validated
- ✅ Zero critical bugs in production
- ✅ Documentation completeness score > 90%

### Adoption Goals
- ✅ 3+ new domains added by community (first month)
- ✅ 10+ recursive workflow examples shared
- ✅ 95%+ user satisfaction with new architecture

---

## Rollback Plan

### If Critical Issues Arise

**Option 1: Partial Rollback**
- Revert to domain-specific agents for affected domain
- Keep universal agents for working domains
- Fix issues incrementally

**Option 2: Full Rollback**
- Revert entire plugin to v5.0.0
- Tag v6.0.0 as experimental
- Fix issues, re-release as v6.0.1

**Option 3: Hotfix**
- Fix critical bug in universal agent
- Release v6.0.1 patch
- Maintain upgrade path

### Rollback Triggers
- Critical: Infinite recursion in production
- Critical: Data loss or corruption
- Critical: Complete domain failure
- Major: >50% performance degradation
- Major: Widespread user complaints

---

## Team & Resources

### Required Roles
1. **Lead Developer** (1 FTE, 4 weeks)
   - Universal agent implementation
   - Core infrastructure updates
   - Code review

2. **Domain Specialist** (0.5 FTE, 2 weeks)
   - Domain configuration creation
   - Domain-specific testing
   - Documentation

3. **QA Engineer** (0.5 FTE, 1 week)
   - Test plan creation
   - Integration testing
   - Performance benchmarking

4. **Technical Writer** (0.25 FTE, 1 week)
   - Documentation updates
   - Migration guides
   - Tutorial creation

**Total Effort**: ~112-156 person-hours over 4 weeks

---

## Communication Plan

### Internal Updates
- **Weekly**: Status update to stakeholders
- **Daily**: Standup with implementation team
- **Bi-weekly**: Demo of progress
- **Release**: V6.0.0 release notes

### Community Updates
- **Announcement**: V2 architecture preview (Week 1)
- **Preview**: Beta testing invitation (Week 3)
- **Launch**: V6.0.0 official release (Week 4)
- **Tutorial**: Recursive workflow examples (Week 4)
- **Webinar**: Live demo and Q&A (Week 5)

---

## Post-Launch

### Week 5-6: Monitoring & Support
- Monitor production usage
- Collect user feedback
- Fix critical bugs
- Release v6.0.1 if needed

### Week 7-8: Iteration
- Analyze performance data
- Identify optimization opportunities
- Plan v6.1.0 enhancements

### Month 2-3: Community Growth
- Help community create new domains
- Collect recursive workflow examples
- Update documentation based on feedback
- Plan v7.0.0 (remove deprecated agents)

---

## Next Immediate Actions

1. **Review this roadmap** with stakeholders (get approval)
2. **Create implementation branch** (`feature/v2-universal-workflow`)
3. **Start Day 1 tasks**: Universal router + software config
4. **Set up CI/CD** for automated testing
5. **Create project board** to track progress

**Ready to begin implementation? ✅**

---

**End of Implementation Roadmap**
